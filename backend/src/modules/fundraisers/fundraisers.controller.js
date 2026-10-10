import { asyncHandler } from '../../utils/asyncHandler.js';
import { fundraisersService } from './fundraisers.service.js';

export const fundraisersController = {
  list: asyncHandler(async (req, res) => res.json(await fundraisersService.list(req.query))),
  get: asyncHandler(async (req, res) => res.json({ data: await fundraisersService.get(req.params.id) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await fundraisersService.create(req.body, req.user) })),
  update: asyncHandler(async (req, res) => res.json({ data: await fundraisersService.update(req.params.id, req.body) })),
  remove: asyncHandler(async (req, res) => res.json({ data: await fundraisersService.remove(req.params.id) })),
  summary: asyncHandler(async (req, res) => res.json({ data: await fundraisersService.summary(req.params.id) })),
  addIncome: asyncHandler(async (req, res) =>
    res.status(201).json({ data: await fundraisersService.addIncome(req.params.id, req.body, req.user) })),
};
