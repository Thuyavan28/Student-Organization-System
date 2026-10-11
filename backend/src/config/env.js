import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  KEEP_DB_WARM: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  // Optional. When set (for example redis://127.0.0.1:6379) responses are cached in Redis; empty means in-memory only.
  // YEAR_END: every membership runs to 31 December. ROLLING: it lasts the tier's duration from the payment date.
  MEMBERSHIP_EXPIRY: z.enum(['YEAR_END', 'ROLLING']).default('YEAR_END'),
  // Joining within this many days of 31 December covers the following year too (so a November joiner is not charged for a few weeks).
  MEMBERSHIP_GRACE_DAYS: z.coerce.number().int().min(0).max(365).default(60),
  // When true, tickets and merchandise can only be bought with an approved payment session (see payments.service.js).
  // Off in tests so the existing suites can place orders directly.
  REQUIRE_PAYMENT_PROOF: z.enum(['true', 'false']).default(process.env.NODE_ENV === 'test' ? 'false' : 'true').transform((value) => value === 'true'),
  REDIS_URL: z.string().optional().default(''),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  MAIL_FROM: z.string().default('ClubFlow <no-reply@skyline.example.com>'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
