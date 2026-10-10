import { z } from 'zod';

export const joinSchema = z.object({
  tierId: z.coerce.number().int().positive(),
  studentId: z.string().trim().min(3, 'Student ID is required').max(40),
  department: z.string().trim().min(2, 'Department is required').max(120),
  year: z.coerce.number().int().min(1).max(6),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(30),
});

export const renewSchema = z.object({
  tierId: z.coerce.number().int().positive().optional(),
});

export const tierSchema = z.object({
  name: z.string().trim().min(2).max(60),
  duesAmount: z.coerce.number().int().min(0),
  eventDiscountPercent: z.coerce.number().int().min(0).max(100),
  merchDiscountPercent: z.coerce.number().int().min(0).max(100),
  perksText: z.string().trim().max(500).default(''),
});

export const tierIdParam = z.object({ id: z.coerce.number().int().positive() });
