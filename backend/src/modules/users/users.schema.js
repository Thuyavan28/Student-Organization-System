import { z } from 'zod';

export const searchUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['ADMIN', 'TREASURER', 'VOLUNTEER', 'MEMBER']).optional(),
});
