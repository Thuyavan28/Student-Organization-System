import { z } from 'zod';

const size = z.enum(['S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE']);

export const productIdParam = z.object({ id: z.coerce.number().int().positive() });

export const variantParams = z.object({
  id: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive(),
});

export const listProductsQuery = z.object({
  includeInactive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(''),
  basePrice: z.coerce.number().int().min(0),
  imageUrl: z.string().trim().max(500).optional(),
  variants: z
    .array(z.object({ size, stock: z.coerce.number().int().min(0) }))
    .min(1)
    .refine((variants) => new Set(variants.map((variant) => variant.size)).size === variants.length, {
      message: 'Each size can only appear once',
    }),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    basePrice: z.coerce.number().int().min(0).optional(),
    imageUrl: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export const updateStockSchema = z.object({ stock: z.coerce.number().int().min(0) });
