import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

export const bookingIdParam = z.object({ id: z.coerce.number().int().positive() });
export const eventIdParam = z.object({ id: z.coerce.number().int().positive() });

// The body must be empty: the price is always computed on the server and a client-sent price is an error.
export const createBookingSchema = z.object({}).strict();

export const myBookingsQuery = z.object({ ...paginationShape });
