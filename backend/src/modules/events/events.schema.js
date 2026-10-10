import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

const status = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']);
const booleanText = z.enum(['true', 'false']).transform((value) => value === 'true');

export const eventIdParam = z.object({ id: z.coerce.number().int().positive() });

export const listEventsQuery = z.object({
  ...paginationShape,
  status: status.optional(),
  q: z.string().trim().max(100).optional(),
  upcoming: booleanText.optional(),
});

export const listBookingsQuery = z.object({
  ...paginationShape,
  q: z.string().trim().max(100).optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  checkedIn: booleanText.optional(),
});

export const listCheckinsQuery = z.object({ ...paginationShape });

const fields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000),
  venue: z.string().trim().min(2).max(160),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  bookingOpensAt: z.coerce.date(),
  bookingClosesAt: z.coerce.date(),
  capacity: z.coerce.number().int().min(1).max(5000),
  memberPrice: z.coerce.number().int().min(0),
  nonMemberPrice: z.coerce.number().int().min(0),
  bannerUrl: z.string().trim().max(500).nullable(),
};

// Shared by create and update; the service runs it on the merged values for partial updates.
export function scheduleProblems({ startAt, endAt, bookingOpensAt, bookingClosesAt }) {
  const problems = {};
  if (endAt <= startAt) problems.endAt = ['The event must end after it starts'];
  if (bookingOpensAt >= bookingClosesAt) problems.bookingOpensAt = ['Booking must open before it closes'];
  if (bookingClosesAt > endAt) problems.bookingClosesAt = ['Booking must close before the event ends'];
  return problems;
}

export const createEventSchema = z
  .object({ ...fields, description: fields.description.default(''), bannerUrl: fields.bannerUrl.optional() })
  .superRefine((value, ctx) => {
    for (const [path, messages] of Object.entries(scheduleProblems(value))) ctx.addIssue({ code: 'custom', path: [path], message: messages[0] });
  });

export const updateEventSchema = z
  .object(Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])))
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export const setStatusSchema = z.object({ status: z.enum(['COMPLETED', 'CANCELLED']) });
