import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { bookingsController } from './bookings.controller.js';
import { bookingIdParam, myBookingsQuery } from './bookings.schema.js';

export const bookingsRouter = Router();

bookingsRouter.use(auth);

bookingsRouter.get('/my', validate({ query: myBookingsQuery }), bookingsController.listMine);
bookingsRouter.post('/:id/cancel', validate({ params: bookingIdParam }), bookingsController.cancel);
