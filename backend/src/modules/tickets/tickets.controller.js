import { asyncHandler } from '../../utils/asyncHandler.js';
import { ticketsService } from './tickets.service.js';

export const ticketsController = {
  listMine: asyncHandler(async (req, res) => res.json(await ticketsService.listMine(req.user.id, req.query))),
};
