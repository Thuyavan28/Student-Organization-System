import { asyncHandler } from '../../utils/asyncHandler.js';
import { checkinsService } from './checkins.service.js';

export const checkinsController = {
  verify: asyncHandler(async (req, res) => res.json({ data: await checkinsService.verify(req.body, req.user) })),
};
