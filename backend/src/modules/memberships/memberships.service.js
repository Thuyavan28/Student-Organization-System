import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import * as cache from '../../utils/memoryCache.js';
import { conflict, notFound } from '../../utils/apiError.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// When a membership paid at `periodStart` ends. In YEAR_END mode that is the last moment of 31 December (UTC); if
// `periodStart` is already within `graceDays` of the year end (a late joiner, or a renewal that starts exactly at the
// current expiry on 31 December) it runs to the end of the following year instead.
export function membershipEnd(periodStart, durationMonths, { mode = env.MEMBERSHIP_EXPIRY, graceDays = env.MEMBERSHIP_GRACE_DAYS } = {}) {
  if (mode !== 'YEAR_END') return addMonths(periodStart, durationMonths);
  const year = periodStart.getUTCFullYear();
  const endOfYear = Date.UTC(year, 11, 31, 23, 59, 59, 999);
  return new Date(endOfYear - periodStart.getTime() < graceDays * DAY_MS ? Date.UTC(year + 1, 11, 31, 23, 59, 59, 999) : endOfYear);
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Status alone is not enough: an ACTIVE row whose expiry has passed (before the daily job runs)
// must still be treated as inactive.
function isActiveMember(member, now = new Date()) {
  return Boolean(member && member.membershipStatus === 'ACTIVE' && member.expiresAt && member.expiresAt > now);
}

async function getActiveTierForUser(userId, tx = prisma) {
  const member = await tx.member.findUnique({ where: { userId }, include: { tier: true } });
  return isActiveMember(member) ? member.tier : null;
}

async function findTier(tx, tierId) {
  const tier = await tx.membershipTier.findUnique({ where: { id: tierId } });
  if (!tier) throw notFound('Membership tier not found');
  return tier;
}

// Records a simulated dues payment and extends the membership. Renewal extends from the
// later of now and the current expiry so early renewals never lose paid time.
async function recordDuesPayment(tx, member, tier, actorId) {
  const now = new Date();
  const periodStart = member.expiresAt && member.expiresAt > now ? member.expiresAt : now;
  const periodEnd = membershipEnd(periodStart, tier.durationMonths);
  const payment = await tx.membershipPayment.create({
    data: {
      memberId: member.id, tierId: tier.id, amount: tier.duesAmount, paymentMode: 'SIMULATED',
      status: 'PAID', paidAt: now, periodStart, periodEnd,
    },
  });
  if (tier.duesAmount > 0) {
    await tx.transaction.create({
      data: {
        type: 'INCOME', category: 'DUES', amount: tier.duesAmount, description: `Membership dues: ${tier.name}`,
        sourceType: 'MEMBERSHIP_PAYMENT', sourceId: String(payment.id), occurredAt: now, recordedById: actorId,
      },
    });
  }
  return tx.member.update({
    where: { id: member.id },
    data: { membershipStatus: 'ACTIVE', duesPaid: true, expiresAt: periodEnd, tierId: tier.id },
    include: { tier: true },
  });
}

const TIERS_TTL_SECONDS = 300;

function invalidateMembership() {
  cache.delByPrefix('members:');
  cache.delByPrefix('dashboard:');
  cache.delByPrefix('finance:');
}

function withActiveFlag(member) {
  return { ...member, isActive: isActiveMember(member) };
}

export const membershipsService = {
  isActiveMember,
  getActiveTierForUser,
  recordDuesPayment,

  // Tiers change rarely and are read on many screens, so they are cached for five minutes.
  listTiers() {
    return cache.wrap('tiers:all', TIERS_TTL_SECONDS, () => prisma.membershipTier.findMany({ orderBy: { duesAmount: 'asc' } }), { staleSeconds: 120 });
  },

  async createTier(body) {
    const tier = await prisma.membershipTier.create({ data: { ...body, durationMonths: 12 } });
    cache.delByPrefix('tiers:');
    return tier;
  },

  async updateTier(id, body) {
    const tier = await prisma.membershipTier.update({ where: { id }, data: body });
    cache.delByPrefix('tiers:');
    return tier;
  },

  async join(userId, { tierId, studentId, department, year, phone }) {
    const member = await prisma.$transaction(async (tx) => {
      const existing = await tx.member.findUnique({ where: { userId } });
      if (existing) throw conflict('ALREADY_MEMBER', 'You already have a membership. Use renew instead.');
      const tier = await findTier(tx, tierId);
      const created = await tx.member.create({
        data: { userId, studentId, department, year, phone, tierId, membershipStatus: 'PENDING', joinedAt: new Date() },
      });
      return recordDuesPayment(tx, created, tier, userId);
    });
    invalidateMembership();
    return withActiveFlag(member);
  },

  async renewMember(memberId, { tierId } = {}, actorId) {
    const member = await prisma.$transaction(async (tx) => {
      const current = await tx.member.findUnique({ where: { id: memberId } });
      if (!current) throw notFound('Member not found');
      const tier = await findTier(tx, tierId ?? current.tierId);
      return recordDuesPayment(tx, current, tier, actorId);
    });
    invalidateMembership();
    return withActiveFlag(member);
  },

  async renew(userId, body) {
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) throw notFound('You do not have a membership yet. Join first.', 'NOT_A_MEMBER');
    return this.renewMember(member.id, body, userId);
  },
};
