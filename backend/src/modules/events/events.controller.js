import { asyncHandler } from '../../utils/asyncHandler.js';
import { checkinsService } from '../checkins/checkins.service.js';
import { eventsService } from './events.service.js';

export const eventsController = {
  list: asyncHandler(async (req, res) => res.json(await eventsService.list(req.query, req.user))),
  get: asyncHandler(async (req, res) => res.json({ data: await eventsService.get(req.params.id, req.user) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await eventsService.create(req.body, req.user) })),
  update: asyncHandler(async (req, res) => res.json({ data: await eventsService.update(req.params.id, req.body) })),
  publish: asyncHandler(async (req, res) => res.json({ data: await eventsService.publish(req.params.id) })),
  setStatus: asyncHandler(async (req, res) =>
    res.json({ data: await eventsService.setStatus(req.params.id, req.body.status, req.user) })),
  stats: asyncHandler(async (req, res) => res.json({ data: await eventsService.stats(req.params.id) })),
  bookings: asyncHandler(async (req, res) => res.json(await eventsService.listBookings(req.params.id, req.query))),
  checkins: asyncHandler(async (req, res) => res.json(await checkinsService.listForEvent(req.params.id, req.query))),
};
