import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { unauthorized } from '../utils/apiError.js';

const userSelect = { id: true, name: true, email: true, role: true, isActive: true };

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// The user is re-read on every request so role changes and deactivation apply immediately.
async function resolveUser(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) }, select: userSelect });
  return user && user.isActive ? user : null;
}

export async function auth(req, res, next) {
  const token = readToken(req);
  if (!token) return next(unauthorized());
  let user;
  try {
    user = await resolveUser(token);
  } catch {
    return next(unauthorized('Your session has expired, please log in again', 'INVALID_TOKEN'));
  }
  if (!user) return next(unauthorized('Your session is no longer valid', 'INVALID_SESSION'));
  req.user = user;
  return next();
}

export async function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const user = await resolveUser(token);
    if (user) req.user = user;
  } catch {
    // An invalid token on a public route is treated as an anonymous visitor.
  }
  return next();
}
