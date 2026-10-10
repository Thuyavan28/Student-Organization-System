import { prisma } from '../../config/prisma.js';
import { conflict, notFound } from '../../utils/apiError.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { REMINDER_WINDOW_DAYS, runMembershipExpiry } from '../../jobs/membershipExpiry.job.js';
import { hashPassword } from '../auth/auth.service.js';
import { membershipsService } from '../memberships/memberships.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const memberInclude = { user: { select: { id: true, name: true, email: true, role: true } }, tier: true };

function present(member) {
  return { ...member, isActive: membershipsService.isActiveMember(member) };
}

function sortOrder(sort, order) {
  if (sort === 'name') return { user: { name: order } };
  return { [sort]: order };
}

export const membersService = {
  async list(query) {
    const page = parsePagination(query);
    const where = {};
    if (query.status) where.membershipStatus = query.status;
    if (query.tierId) where.tierId = query.tierId;
    if (query.q) {
      where.OR = [
        { user: { name: { contains: query.q, mode: 'insensitive' } } },
        { user: { email: { contains: query.q, mode: 'insensitive' } } },
        { studentId: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.member.findMany({ where, include: memberInclude, orderBy: sortOrder(query.sort, query.order), skip: page.skip, take: page.take }),
      prisma.member.count({ where }),
    ]);
    return paginated(rows.map(present), total, page);
  },

  async expiring(query) {
    const page = parsePagination(query);
    const now = new Date();
    const where = { membershipStatus: 'ACTIVE', expiresAt: { gt: now, lte: new Date(now.getTime() + query.days * DAY_MS) } };
    const [rows, total] = await Promise.all([
      prisma.member.findMany({ where, include: memberInclude, orderBy: { expiresAt: 'asc' }, skip: page.skip, take: page.take }),
      prisma.member.count({ where }),
    ]);
    return paginated(rows.map(present), total, page);
  },

  async get(id) {
    const member = await prisma.member.findUnique({
      where: { id },
      include: { ...memberInclude, payments: { orderBy: { createdAt: 'desc' }, take: 20, include: { tier: true } } },
    });
    if (!member) throw notFound('Member not found');
    return present(member);
  },

  async me(userId) {
    const member = await prisma.member.findUnique({
      where: { userId },
      include: { ...memberInclude, payments: { orderBy: { createdAt: 'desc' }, take: 10, include: { tier: true } } },
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

  runReminders() {
    return runMembershipExpiry();
  },

  reminderWindowDays: REMINDER_WINDOW_DAYS,
};
