import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import * as cache from '../../utils/memoryCache.js';
import { conflict, notFound } from '../../utils/apiError.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { REMINDER_WINDOW_DAYS, runMembershipExpiry } from '../../jobs/membershipExpiry.job.js';
import { hashPassword } from '../auth/auth.service.js';
import { membershipsService } from '../memberships/memberships.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const memberInclude = { user: { select: { id: true, name: true, email: true, role: true } }, tier: true };
// List rows carry only what the table and the edit form need, not whole related records.
const listSelect = {
  id: true, userId: true, studentId: true, department: true, year: true, phone: true, tierId: true,
  membershipStatus: true, joinedAt: true, expiresAt: true, duesPaid: true,
  user: { select: { id: true, name: true, email: true } },
  tier: { select: { id: true, name: true } },
};
const STATS_TTL_SECONDS = 30;
const LIST_TTL_SECONDS = 15;

// Anything that changes membership figures also changes the dashboard and the ledger totals.
function invalidateMembers() {
  cache.delByPrefix('members:');
  cache.delByPrefix('dashboard:');
  cache.delByPrefix('finance:');
}

function present(member) {
  return { ...member, isActive: membershipsService.isActiveMember(member) };
}

function sortOrder(sort, order) {
  if (sort === 'name') return { user: { name: order } };
  return { [sort]: order };
}

export const membersService = {
  async list(query) {
    const page = parsePagination(query, 10);
    // One SQL statement returns the 10 rows, their user and tier, and the overall total (window count), so a page
    // costs a single database round trip instead of separate member, user, tier and count queries.
    const conditions = [Prisma.sql`TRUE`];
    if (query.status) conditions.push(Prisma.sql`m.membership_status = ${query.status}::membership_status`);
    if (query.tierId) conditions.push(Prisma.sql`m.tier_id = ${query.tierId}`);
    if (query.q) {
      const like = `%${query.q.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(Prisma.sql`(u.name ILIKE ${like} OR u.email ILIKE ${like} OR m.student_id ILIKE ${like})`);
    }
    // Column and direction come from fixed whitelists, never from user text.
    const column = { name: 'u.name', joinedAt: 'm.joined_at', expiresAt: 'm.expires_at', studentId: 'm.student_id' }[query.sort] ?? 'u.name';
    const direction = query.order === 'desc' ? 'DESC' : 'ASC';
    const orderBy = Prisma.raw(`${column} ${direction}, m.id ASC`);

    // Short cache: repeat visits and paging back and forth skip the slow database round trip.
    // Every member write calls invalidateMembers(), which drops these entries.
    return cache.wrap(`members:list:${JSON.stringify([query.status, query.tierId, query.q, query.sort, query.order, page.skip, page.take])}`, LIST_TTL_SECONDS, async () => {
      const rows = await prisma.$queryRaw`
        SELECT m.id, m.user_id AS "userId", m.student_id AS "studentId", m.department, m.year, m.phone,
               m.tier_id AS "tierId", m.membership_status::text AS "membershipStatus",
               m.joined_at AS "joinedAt", m.expires_at AS "expiresAt", m.dues_paid AS "duesPaid",
               u.name AS "userName", u.email AS "userEmail", t.name AS "tierName",
               COUNT(*) OVER()::int AS "total"
        FROM members m
        JOIN users u ON u.id = m.user_id
        JOIN membership_tiers t ON t.id = m.tier_id
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY ${orderBy}
        LIMIT ${page.take} OFFSET ${page.skip}`;
      let total = rows[0]?.total ?? 0;
      // A page past the end returns no rows, so the window count is missing; fall back to a plain count.
      if (rows.length === 0 && page.skip > 0) {
        const [{ count }] = await prisma.$queryRaw`
          SELECT COUNT(*)::int AS count FROM members m JOIN users u ON u.id = m.user_id
          WHERE ${Prisma.join(conditions, ' AND ')}`;
        total = count;
      }
      const data = rows.map(({ userName, userEmail, tierName, total: _total, ...row }) => present({
        ...row,
        user: { id: row.userId, name: userName, email: userEmail },
        tier: { id: row.tierId, name: tierName },
      }));
      return paginated(data, total, page);
    });
  },

  async expiring(query) {
    const page = parsePagination(query);
    const now = new Date();
    const where = { membershipStatus: 'ACTIVE', expiresAt: { gt: now, lte: new Date(now.getTime() + query.days * DAY_MS) } };
    const [rows, total] = await Promise.all([
      prisma.member.findMany({ where, select: listSelect, orderBy: { expiresAt: 'asc' }, skip: page.skip, take: page.take }),
      prisma.member.count({ where }),
    ]);
    return paginated(rows.map(present), total, page);
  },

  // Headline counts for the Members page, computed by the database and cached briefly.
  stats() {
    return cache.wrap('members:stats', STATS_TTL_SECONDS, async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS);
      // One statement and one connection instead of five queries at once (each extra connection can cost seconds when cold).
      const [row] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE membership_status = 'ACTIVE' AND expires_at > ${now})::int AS active,
               COUNT(*) FILTER (WHERE membership_status = 'ACTIVE' AND expires_at > ${now} AND expires_at <= ${soon})::int AS "expiringSoon",
               COUNT(*) FILTER (WHERE membership_status = 'EXPIRED')::int AS expired,
               COUNT(*) FILTER (WHERE membership_status = 'PENDING')::int AS pending
        FROM members`;
      return row;
    });
  },

  async get(id) {
    const member = await prisma.member.findUnique({
      where: { id },
      include: { ...memberInclude, payments: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, amount: true, status: true, paidAt: true, periodStart: true, periodEnd: true, tier: { select: { name: true } } } } },
    });
    if (!member) throw notFound('Member not found');
    return present(member);
  },

  async me(userId) {
    const member = await prisma.member.findUnique({
      where: { userId },
      include: { tier: true, payments: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, amount: true, status: true, paidAt: true, periodStart: true, periodEnd: true, tier: { select: { name: true } } } } },
    });
    return member ? present(member) : null;
  },

  async create(body, actor) {
    const { name, email, password, markPaid, ...profile } = body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    const passwordHash = await hashPassword(password);
    const member = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, passwordHash, role: 'MEMBER' } });
      const created = await tx.member.create({ data: { ...profile, userId: user.id, membershipStatus: 'PENDING' } });
      if (!markPaid) return created;
      const tier = await tx.membershipTier.findUnique({ where: { id: profile.tierId } });
      if (!tier) throw notFound('Membership tier not found');
      return membershipsService.recordDuesPayment(tx, created, tier, actor.id);
    });
    invalidateMembers();
    return this.get(member.id);
  },

  async update(id, body) {
    const { name, ...profile } = body;
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) throw notFound('Member not found');
    await prisma.$transaction(async (tx) => {
      if (name) await tx.user.update({ where: { id: member.userId }, data: { name } });
      if (Object.keys(profile).length > 0) await tx.member.update({ where: { id }, data: profile });
    });
    invalidateMembers();
    return this.get(id);
  },

  markPaid(id, body, actor) {
    return membershipsService.renewMember(id, body, actor.id);
  },

  async verify(id) {
    const member = await prisma.member.findUnique({ where: { id }, include: memberInclude });
    if (!member) throw notFound('Member not found');
    return {
      memberId: member.id,
      name: member.user.name,
      studentId: member.studentId,
      tier: member.tier.name,
      status: member.membershipStatus,
      expiresAt: member.expiresAt,
      isActive: membershipsService.isActiveMember(member),
    };
  },

  async runReminders() {
    const result = await runMembershipExpiry();
    invalidateMembers();
    return result;
  },

  reminderWindowDays: REMINDER_WINDOW_DAYS,
};
