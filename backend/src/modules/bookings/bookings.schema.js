import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

export const bookingIdParam = z.object({ id: z.coerce.number().int().positive() });
export const eventIdParam = z.object({ id: z.coerce.number().int().positive() });

// The only thing the client may send is the id of its approved payment session: the price is always computed on the
// server and a client-sent price is an error.
export const createBookingSchema = z.object({ paymentSessionId: z.string().min(1).max(64).optional() }).strict();

export const myBookingsQuery = z.object({ ...paginationShape });
