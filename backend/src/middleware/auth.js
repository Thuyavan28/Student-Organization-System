import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { unauthorized } from '../utils/apiError.js';

const PRIVILEGED = new Set(['ADMIN', 'TREASURER', 'VOLUNTEER']);

// Plain members are trusted from the signed token alone, so most requests make no database call.
// Staff roles are confirmed once per process against the database and remembered here, because a
// demotion or deactivation must not wait for the token to expire. Writes that change a staff user
// call invalidateAuthUser() so the next request re-checks.
const staffState = new Map();

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export function invalidateAuthUser(userId) {
  staffState.delete(Number(userId));
}

async function confirmStaff(claims) {
  const id = Number(claims.sub);
  let state = staffState.get(id);
  if (!state) {
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
    state = user ?? { role: null, isActive: false };
    staffState.set(id, state);
  }
  return state.isActive && state.role === claims.role;
}

async function resolveUser(token) {
  const claims = jwt.verify(token, env.JWT_SECRET);
  if (PRIVILEGED.has(claims.role) && !(await confirmStaff(claims))) return null;
  return { id: Number(claims.sub), name: claims.name, email: claims.email, role: claims.role };
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
