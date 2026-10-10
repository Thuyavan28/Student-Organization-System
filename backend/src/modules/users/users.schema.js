import { z } from 'zod';

const FIELDS = ['id', 'name', 'email', 'role'];

export const searchUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['ADMIN', 'TREASURER', 'VOLUNTEER', 'MEMBER']).optional(),
  // Comma separated column list, for example fields=id,name. Unknown names are rejected.
  fields: z
    .string()
    .trim()
    .transform((value) => value.split(',').map((field) => field.trim()).filter(Boolean))
    .refine((list) => list.length > 0 && list.every((field) => FIELDS.includes(field)), { message: `fields must be a list of: ${FIELDS.join(', ')}` })
    .optional(),
});

// Staff accounts are created by an admin only. Members sign up themselves, and admins are not created here.
export const STAFF_ROLES = ['TREASURER', 'VOLUNTEER'];

const passwordField = z.string().min(8, 'Password must be at least 8 characters').max(72);

export const listStaffQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['ADMIN', ...STAFF_ROLES]).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createStaffBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.email('Enter a valid email address').trim().toLowerCase().max(190),
  password: passwordField,
  role: z.enum(STAFF_ROLES),
});

export const staffIdParams = z.object({ id: z.coerce.number().int().positive() });

export const updateStaffBody = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    role: z.enum(STAFF_ROLES).optional(),
    isActive: z.boolean().optional(),
    password: passwordField.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });
