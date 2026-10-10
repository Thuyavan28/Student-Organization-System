import { asyncHandler } from '../../utils/asyncHandler.js';
import { usersService } from './users.service.js';

export const usersController = {
  search: asyncHandler(async (req, res) => res.json(await usersService.search(req.query))),
};
