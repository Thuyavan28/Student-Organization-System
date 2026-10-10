import { asyncHandler } from '../../utils/asyncHandler.js';
import { productsService } from './products.service.js';

export const productsController = {
  list: asyncHandler(async (req, res) => res.json(await productsService.list(req.query, req.user))),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await productsService.create(req.body) })),
  update: asyncHandler(async (req, res) => res.json({ data: await productsService.update(req.params.id, req.body) })),
  updateStock: asyncHandler(async (req, res) =>
    res.json({ data: await productsService.updateStock(req.params.id, req.params.variantId, req.body.stock) })),
};
