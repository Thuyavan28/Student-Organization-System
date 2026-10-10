import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

const statusEnum = z.enum(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED']);

export const memberIdParam = z.object({ id: z.coerce.number().int().positive() });

export const listMembersQuery = z.object({
  ...paginationShape,
  q: z.string().trim().max(100).optional(),
  status: statusEnum.optional(),
  tierId: z.coerce.number().int().positive().optional(),
  sort: z.enum(['name', 'joinedAt', 'expiresAt', 'studentId']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const expiringQuery = z.object({
  ...paginationShape,
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(72),
  studentId: z.string().trim().min(3).max(40),
  department: z.string().trim().min(2).max(120),
  year: z.coerce.number().int().min(1).max(6),
  phone: z.string().trim().min(7).max(30),
  tierId: z.coerce.number().int().positive(),
  markPaid: z.boolean().default(false),
});

export const updateMemberSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  studentId: z.string().trim().min(3).max(40).optional(),
  department: z.string().trim().min(2).max(120).optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
  tierId: z.coerce.number().int().positive().optional(),
  membershipStatus: statusEnum.optional(),
});

export const markPaidSchema = z.object({
  tierId: z.coerce.number().int().positive().optional(),
});
