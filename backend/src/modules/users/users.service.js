import { prisma } from '../../config/prisma.js';
import { invalidateAuthUser } from '../../middleware/auth.js';
import { conflict, forbidden, notFound } from '../../utils/apiError.js';
import { hashPassword } from '../auth/auth.service.js';

const DROPDOWN_LIMIT = 50;
const DEFAULT_FIELDS = ['id', 'name', 'email', 'role'];
const STAFF_SELECT = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

export const usersService = {
  // Slim lookup for assignee and officer pickers: only the requested columns, bounded, never the full table.
  async search({ q, role, fields = DEFAULT_FIELDS }) {
    const where = { isActive: true };
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      select: Object.fromEntries(fields.map((field) => [field, true])),
      orderBy: { name: 'asc' },
      take: DROPDOWN_LIMIT,
    });
    return { data: users };
  },

  // Everyone who works for the club (not plain members), for the admin's staff screen.
  async listStaff({ q, role, status }) {
    const where = { role: role ?? { in: ['ADMIN', 'TREASURER', 'VOLUNTEER'] } };
    if (status) where.isActive = status === 'active';
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    const users = await prisma.user.findMany({ where, select: STAFF_SELECT, orderBy: [{ role: 'asc' }, { name: 'asc' }], take: 200 });
    return { data: users };
  },

  async createStaff({ name, email, password, role }) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    const user = await prisma.user.create({
      data: { name, email, role, passwordHash: await hashPassword(password) },
      select: STAFF_SELECT,
    });
    return { data: user };
  },

  async updateStaff(id, { password, ...changes }) {
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) throw notFound('User not found');
    // Admins and plain members are never edited from here, so an admin cannot lock themselves or another admin out.
    if (!['TREASURER', 'VOLUNTEER'].includes(target.role)) {
      throw forbidden('Only treasurer and volunteer accounts can be changed here', 'NOT_STAFF_ACCOUNT');
    }
    const data = { ...changes };
    if (password) data.passwordHash = await hashPassword(password);
    const user = await prisma.user.update({ where: { id }, data, select: STAFF_SELECT });
    // A role change, deactivation or password reset must take effect on the very next request.
    invalidateAuthUser(id);
    return { data: user };
  },
};
