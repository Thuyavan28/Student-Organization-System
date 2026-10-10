import { asyncHandler } from '../../utils/asyncHandler.js';
import { membershipsService } from './memberships.service.js';

export const membershipsController = {
  listTiers: asyncHandler(async (req, res) => res.json({ data: await membershipsService.listTiers() })),
  createTier: asyncHandler(async (req, res) => res.status(201).json({ data: await membershipsService.createTier(req.body) })),
  updateTier: asyncHandler(async (req, res) => res.json({ data: await membershipsService.updateTier(req.params.id, req.body) })),
  join: asyncHandler(async (req, res) => res.status(201).json({ data: await membershipsService.join(req.user.id, req.body) })),
  renew: asyncHandler(async (req, res) => res.json({ data: await membershipsService.renew(req.user.id, req.body) })),
};
