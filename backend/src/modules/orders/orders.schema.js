import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

export const orderIdParam = z.object({ id: z.coerce.number().int().positive() });

export const MAX_LINES = 10;
export const MAX_QUANTITY = 10;

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(MAX_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_LINES),
});

export const listOrdersQuery = z.object({
  ...paginationShape,
  q: z.string().trim().max(100).optional(),
  status: z.enum(['PLACED', 'PAID', 'FULFILLED', 'CANCELLED']).optional(),
});

export const myOrdersQuery = z.object({ ...paginationShape });

export const updateOrderStatusSchema = z.object({ status: z.enum(['FULFILLED', 'CANCELLED']) });
