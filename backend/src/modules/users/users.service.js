import { prisma } from '../../config/prisma.js';

const DROPDOWN_LIMIT = 50;
const DEFAULT_FIELDS = ['id', 'name', 'email', 'role'];

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
};
