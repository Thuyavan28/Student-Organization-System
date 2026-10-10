import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.email('Enter a valid email address').trim().toLowerCase().max(190),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const googleSchema = z.object({
  accessToken: z.string().min(20, 'Missing Google access token').max(4096),
  // signup never signs an existing account in, and login never creates a new one.
  mode: z.enum(['login', 'signup']).default('login'),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
