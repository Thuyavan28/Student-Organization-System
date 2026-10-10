import { Router } from 'express';
import { auth, optionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { productsController } from './products.controller.js';
import {
  createProductSchema, listProductsQuery, productIdParam, updateProductSchema, updateStockSchema, variantParams,
} from './products.schema.js';

export const productsRouter = Router();

const admin = requireRole('ADMIN');

productsRouter.get('/', optionalAuth, validate({ query: listProductsQuery }), productsController.list);
productsRouter.post('/', auth, admin, validate({ body: createProductSchema }), productsController.create);
productsRouter.patch('/:id', auth, admin, validate({ params: productIdParam, body: updateProductSchema }), productsController.update);
productsRouter.patch('/:id/variants/:variantId', auth, admin, validate({ params: variantParams, body: updateStockSchema }), productsController.updateStock);
