import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Strict in production (brute-force protection); relaxed while developing, where demo logins are clicked constantly.
  limit: env.NODE_ENV === 'test' ? 10000 : env.NODE_ENV === 'production' ? 20 : 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, please try again later', details: null } },
});
