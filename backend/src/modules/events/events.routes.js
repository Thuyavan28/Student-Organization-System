import { Router } from 'express';
import { auth, optionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { bookingsController } from '../bookings/bookings.controller.js';
import { createBookingSchema, eventIdParam as bookingEventParam } from '../bookings/bookings.schema.js';
import { eventsController } from './events.controller.js';
import {
  createEventSchema, eventIdParam, listBookingsQuery, listCheckinsQuery, listEventsQuery, setStatusSchema, updateEventSchema,
} from './events.schema.js';

export const eventsRouter = Router();

const admin = requireRole('ADMIN');
const managers = requireRole('ADMIN', 'TREASURER');

eventsRouter.get('/', optionalAuth, validate({ query: listEventsQuery }), eventsController.list);
eventsRouter.post('/', auth, admin, validate({ body: createEventSchema }), eventsController.create);
eventsRouter.get('/:id', optionalAuth, validate({ params: eventIdParam }), eventsController.get);
eventsRouter.patch('/:id', auth, admin, validate({ params: eventIdParam, body: updateEventSchema }), eventsController.update);
eventsRouter.post('/:id/publish', auth, admin, validate({ params: eventIdParam }), eventsController.publish);
eventsRouter.post('/:id/status', auth, admin, validate({ params: eventIdParam, body: setStatusSchema }), eventsController.setStatus);
eventsRouter.get('/:id/stats', auth, managers, validate({ params: eventIdParam }), eventsController.stats);
eventsRouter.get('/:id/bookings', auth, managers, validate({ params: eventIdParam, query: listBookingsQuery }), eventsController.bookings);
eventsRouter.get('/:id/checkins', auth, requireRole('ADMIN', 'TREASURER', 'VOLUNTEER'), validate({ params: eventIdParam, query: listCheckinsQuery }), eventsController.checkins);
eventsRouter.post('/:id/bookings', auth, validate({ params: bookingEventParam, body: createBookingSchema }), bookingsController.create);
