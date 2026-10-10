import { asyncHandler } from '../../utils/asyncHandler.js';
import { expensesService } from './expenses.service.js';

export const expensesController = {
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await expensesService.create(req.body, req.file, req.user) })),
  listMine: asyncHandler(async (req, res) => res.json(await expensesService.listMine(req.user.id, req.query))),
  list: asyncHandler(async (req, res) => res.json(await expensesService.list(req.query))),
  review: asyncHandler(async (req, res) => res.json({ data: await expensesService.review(req.params.id, req.body, req.user) })),
  reimburse: asyncHandler(async (req, res) => res.json({ data: await expensesService.reimburse(req.params.id, req.user) })),
};
