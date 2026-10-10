import { asyncHandler } from '../../utils/asyncHandler.js';
import { ordersService } from './orders.service.js';

export const ordersController = {
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await ordersService.create(req.user.id, req.body.items) })),
  listMine: asyncHandler(async (req, res) => res.json(await ordersService.listMine(req.user.id, req.query))),
  list: asyncHandler(async (req, res) => res.json(await ordersService.list(req.query))),
  updateStatus: asyncHandler(async (req, res) =>
    res.json({ data: await ordersService.updateStatus(req.params.id, req.body.status, req.user) })),
};
