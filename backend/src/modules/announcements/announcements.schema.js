import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

const audience = z.enum(['ALL_MEMBERS', 'ALL_USERS']);

export const announcementIdParam = z.object({ id: z.coerce.number().int().positive() });

export const listAnnouncementsQuery = z.object({ ...paginationShape });

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(5).max(5000),
  audience: audience.default('ALL_MEMBERS'),
  isPinned: z.boolean().default(false),
});

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    body: z.string().trim().min(5).max(5000).optional(),
    isPinned: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });
