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
