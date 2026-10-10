import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { conflict, unauthorized } from '../../utils/apiError.js';

const BCRYPT_ROUNDS = 10;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// The claims are everything the API needs to authorise a request, so no request has to look the user up again.
function signToken(user) {
  const { id, ...claims } = publicUser(user);
  return jwt.sign({ sub: String(id), ...claims }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

export const authService = {
  async register({ name, email, password }) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: 'MEMBER' } });
    return { token: signToken(user), user: publicUser(user) };
  },

  async login({ email, password }) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, isActive: true, passwordHash: true },
    });
    // Same error for unknown email and wrong password so accounts cannot be enumerated.
    const valid = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    return { token: signToken(user), user: publicUser(user) };
  },

  // Answered from the verified token alone: no database call.
  me(claims) {
    return publicUser(claims);
  },
};
