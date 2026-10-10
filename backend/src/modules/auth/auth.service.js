import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { conflict, notFound, unauthorized } from '../../utils/apiError.js';
import { membershipsService } from '../memberships/memberships.service.js';

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const authService = {
  async register({ name, email, password }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: 'MEMBER' } });
    return { token: signToken(user), user: publicUser(user) };
  },

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Same error for unknown email and wrong password so accounts cannot be enumerated.
    const valid = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    return { token: signToken(user), user: publicUser(user) };
  },

  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: { include: { tier: true } },
        leadership: { where: { isActive: true }, select: { id: true, position: true, termEnd: true } },
      },
    });
    if (!user) throw notFound('User not found');
    return {
      ...publicUser(user),
      member: user.member ? { ...user.member, isActive: membershipsService.isActiveMember(user.member) } : null,
      leadership: user.leadership,
    };
  },
};
