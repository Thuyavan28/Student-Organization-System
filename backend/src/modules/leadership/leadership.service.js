import { prisma } from '../../config/prisma.js';
import { conflict, notFound } from '../../utils/apiError.js';

const ROLE_BY_POSITION = { PRESIDENT: 'ADMIN', TREASURER: 'TREASURER' };
const SINGLE_HOLDER_POSITIONS = Object.keys(ROLE_BY_POSITION);
const userSelect = { select: { id: true, name: true, email: true, role: true } };

// The president holds the ADMIN role and the treasurer the TREASURER role while their term is active.
// Only those two positions touch roles. The role held before the promotion is remembered in
// previous_role, and an officer who loses the last elevating position returns to it (MEMBER by default).
async function syncRole(tx, userId) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  const active = await tx.leadership.findMany({ where: { userId, isActive: true, position: { in: SINGLE_HOLDER_POSITIONS } } });
  const granted = active.some((row) => row.position === 'PRESIDENT') ? 'ADMIN' : active.some((row) => row.position === 'TREASURER') ? 'TREASURER' : null;

  if (granted && user.role !== granted && !(user.role === 'ADMIN' && granted === 'TREASURER')) {
    const previousRole = ['ADMIN', 'TREASURER'].includes(user.role) ? user.previousRole : user.role;
    await tx.user.update({ where: { id: userId }, data: { role: granted, previousRole } });
    return;
  }
  if (!granted && (user.role === 'ADMIN' || user.role === 'TREASURER')) {
    if (user.role === 'ADMIN') {
      const otherAdmins = await tx.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: userId } } });
      if (otherAdmins === 0) throw conflict('LAST_ADMIN', 'This would leave the club without an administrator. Appoint a new president first.');
    }
    await tx.user.update({ where: { id: userId }, data: { role: user.previousRole ?? 'MEMBER', previousRole: null } });
  }
}

async function assertSingleHolder(tx, position, excludeId) {
  if (!SINGLE_HOLDER_POSITIONS.includes(position)) return;
  const holder = await tx.leadership.findFirst({ where: { position, isActive: true, id: excludeId ? { not: excludeId } : undefined } });
  if (holder) throw conflict('POSITION_TAKEN', `There is already a current ${position.toLowerCase()}. End that term first.`);
}

export const leadershipService = {
  async list({ all }, user) {
    const showAll = Boolean(all && user.role === 'ADMIN');
    const rows = await prisma.leadership.findMany({
      where: showAll ? {} : { isActive: true },
      include: { user: userSelect },
      orderBy: [{ isActive: 'desc' }, { termEnd: 'desc' }, { id: 'asc' }],
    });
    return { data: rows };
  },

  create(body) {
    return prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: body.userId } });
      if (!target) throw notFound('User not found');
      await assertSingleHolder(tx, body.position);
      const row = await tx.leadership.create({ data: { ...body, isActive: true }, include: { user: userSelect } });
      await syncRole(tx, body.userId);
      return tx.leadership.findUnique({ where: { id: row.id }, include: { user: userSelect } });
    });
  },

  update(id, body) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.leadership.findUnique({ where: { id } });
      if (!existing) throw notFound('Leadership record not found');
      const next = { ...existing, ...body };
      if (next.termEnd <= next.termStart) throw conflict('INVALID_TERM', 'The term must end after it starts');
      if (next.isActive) await assertSingleHolder(tx, next.position, id);
      await tx.leadership.update({ where: { id }, data: body });
      await syncRole(tx, existing.userId);
      return tx.leadership.findUnique({ where: { id }, include: { user: userSelect } });
    });
  },
};
