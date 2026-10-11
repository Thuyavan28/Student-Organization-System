import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

const status = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
const id = z.coerce.number().int().positive();

export const taskIdParam = z.object({ id });

export const listTasksQuery = z.object({
  ...paginationShape,
  eventId: id.optional(),
  status: status.optional(),
  assigneeId: id.optional(),
  mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

// A task belongs to an event (a bake sale, a gala...) or, with no event, is a general club task.
export const createTaskSchema = z.object({
  eventId: id.nullable().optional(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).default(''),
  assigneeId: id.nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

// Only keys that were sent appear in the parsed body, which lets the service tell
// "assignee may change status only" apart from a full admin edit.
export const updateTaskSchema = z
  .object({
    eventId: id.nullable().optional(),
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    assigneeId: id.nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    status: status.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });
