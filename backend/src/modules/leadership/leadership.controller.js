import { asyncHandler } from '../../utils/asyncHandler.js';
import { leadershipService } from './leadership.service.js';

export const leadershipController = {
  list: asyncHandler(async (req, res) => res.json(await leadershipService.list(req.query, req.user))),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await leadershipService.create(req.body) })),
  update: asyncHandler(async (req, res) => res.json({ data: await leadershipService.update(req.params.id, req.body) })),
};
