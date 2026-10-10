import { asyncHandler } from '../../utils/asyncHandler.js';
import { tasksService } from './tasks.service.js';

export const tasksController = {
  list: asyncHandler(async (req, res) => res.json(await tasksService.list(req.query, req.user))),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await tasksService.create(req.body, req.user) })),
  update: asyncHandler(async (req, res) => res.json({ data: await tasksService.update(req.params.id, req.body, req.user) })),
};
