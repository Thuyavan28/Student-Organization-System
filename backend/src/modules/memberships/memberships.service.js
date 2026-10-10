import { prisma } from '../../config/prisma.js';
import { conflict, notFound } from '../../utils/apiError.js';

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
  const periodEnd = addMonths(periodStart, tier.durationMonths);
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

function withActiveFlag(member) {
  return { ...member, isActive: isActiveMember(member) };
}

export const membershipsService = {
  isActiveMember,
  getActiveTierForUser,
  recordDuesPayment,

  listTiers() {
    return prisma.membershipTier.findMany({ orderBy: { duesAmount: 'asc' } });
  },

  createTier(body) {
    return prisma.membershipTier.create({ data: { ...body, durationMonths: 12 } });
  },

  updateTier(id, body) {
    return prisma.membershipTier.update({ where: { id }, data: body });
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
    return withActiveFlag(member);
  },

  async renewMember(memberId, { tierId } = {}, actorId) {
    const member = await prisma.$transaction(async (tx) => {
      const current = await tx.member.findUnique({ where: { id: memberId } });
      if (!current) throw notFound('Member not found');
      const tier = await findTier(tx, tierId ?? current.tierId);
      return recordDuesPayment(tx, current, tier, actorId);
    });
    return withActiveFlag(member);
  },

  async renew(userId, body) {
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) throw notFound('You do not have a membership yet. Join first.', 'NOT_A_MEMBER');
    return this.renewMember(member.id, body, userId);
  },
};
