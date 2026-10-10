import { prisma } from '../../config/prisma.js';

export const usersService = {
  // Lightweight lookup for assignee and officer pickers.
  async search({ q, role }) {
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
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 20,
    });
    return { data: users };
  },
};
