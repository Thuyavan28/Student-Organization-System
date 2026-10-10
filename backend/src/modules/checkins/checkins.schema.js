import { z } from 'zod';

export const verifyCheckinSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  token: z.string().trim().min(1).max(200),
});
