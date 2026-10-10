import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { ApiError, badRequest, conflict, unauthorized } from '../../utils/apiError.js';

const BCRYPT_ROUNDS = 10;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// The claims are everything the API needs to authorise a request, so no request has to look the user up again.
function signToken(user) {
  const { id, ...claims } = publicUser(user);
  return jwt.sign({ sub: String(id), ...claims }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

const googleClient = new OAuth2Client();

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

export const authService = {
  async register({ name, email, password }) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw conflict('EMAIL_TAKEN', 'You already have an account with this email. Please log in with your email and password.', { email });
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

  // Sign in or sign up with a Google access token. The token is verified with Google (audience, expiry),
  // and only a verified email is trusted. New accounts are always plain MEMBERs.
  async google({ accessToken, mode = 'login' }) {
    if (!env.GOOGLE_CLIENT_ID) throw badRequest('GOOGLE_DISABLED', 'Google sign-in is not configured');
    let payload;
    try {
      // Google confirms the token is live and tells us which app it was issued to; reject tokens meant for other apps.
      const info = await googleClient.getTokenInfo(accessToken);
      if (info.aud !== env.GOOGLE_CLIENT_ID) throw new Error('wrong audience');
      const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error('userinfo failed');
      payload = await res.json();
      if (payload.email !== info.email) throw new Error('email mismatch');
    } catch {
      throw unauthorized('Google sign-in failed. Please try again.', 'INVALID_GOOGLE_TOKEN');
    }
    if (!payload?.email || !payload.email_verified) {
      throw unauthorized('Your Google email address is not verified', 'GOOGLE_EMAIL_UNVERIFIED');
    }
    const email = payload.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.isActive) throw unauthorized('This account has been deactivated', 'ACCOUNT_DEACTIVATED');
    // Signing up with an email that already has an account must not look like a fresh start: send them to log in.
    if (user && mode === 'signup') {
      throw conflict('ACCOUNT_EXISTS', 'You already have an account with this email. Please log in with your email and password.', { email });
    }
    if (!user && mode === 'login') {
      throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'No account found for this Google email. Please sign up first.', { email });
    }
    if (!user) {
      // Google-only accounts get an unguessable password hash so password login stays impossible until they set one.
      const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
      user = await prisma.user.create({ data: { name: (payload.name || email.split('@')[0]).slice(0, 120), email, passwordHash, role: 'MEMBER' } });
    }
    return { token: signToken(user), user: publicUser(user) };
  },

  // Answered from the verified token alone: no database call.
  me(claims) {
    return publicUser(claims);
  },
};
