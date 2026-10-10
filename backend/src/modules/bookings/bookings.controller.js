import { asyncHandler } from '../../utils/asyncHandler.js';
import { bookingsService } from './bookings.service.js';

export const bookingsController = {
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await bookingsService.create(req.params.id, req.user.id) })),
  listMine: asyncHandler(async (req, res) => res.json(await bookingsService.listMine(req.user.id, req.query))),
  cancel: asyncHandler(async (req, res) => res.json({ data: await bookingsService.cancel(req.params.id, req.user) })),
};
