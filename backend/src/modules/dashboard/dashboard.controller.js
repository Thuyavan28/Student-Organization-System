import { asyncHandler } from '../../utils/asyncHandler.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  summary: asyncHandler(async (req, res) => res.json({ data: await dashboardService.summary() })),
};
