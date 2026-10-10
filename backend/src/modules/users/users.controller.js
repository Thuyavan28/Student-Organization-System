import { asyncHandler } from '../../utils/asyncHandler.js';
import { usersService } from './users.service.js';

export const usersController = {
  search: asyncHandler(async (req, res) => res.json(await usersService.search(req.query))),
  listStaff: asyncHandler(async (req, res) => res.json(await usersService.listStaff(req.query))),
  createStaff: asyncHandler(async (req, res) => res.status(201).json(await usersService.createStaff(req.body))),
  updateStaff: asyncHandler(async (req, res) => res.json(await usersService.updateStaff(req.params.id, req.body))),
};
