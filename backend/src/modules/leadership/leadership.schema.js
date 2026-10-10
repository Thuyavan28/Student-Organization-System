import { z } from 'zod';

const position = z.enum(['PRESIDENT', 'VICE_PRESIDENT', 'TREASURER', 'SECRETARY', 'EVENT_LEAD', 'OTHER']);

export const leadershipIdParam = z.object({ id: z.coerce.number().int().positive() });

export const listLeadershipQuery = z.object({
  all: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

export const createLeadershipSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
    position,
    termStart: z.coerce.date(),
    termEnd: z.coerce.date(),
  })
  .refine((value) => value.termEnd > value.termStart, { message: 'The term must end after it starts', path: ['termEnd'] });

export const updateLeadershipSchema = z
  .object({
    position: position.optional(),
    termStart: z.coerce.date().optional(),
    termEnd: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });
