import { prisma } from '../../config/prisma.js';
import { notFound } from '../../utils/apiError.js';
import * as cache from '../../utils/memoryCache.js';
import { applyPercentDiscount } from '../../utils/money.js';
import { membershipsService } from '../memberships/memberships.service.js';

const PRODUCTS_TTL_SECONDS = 60;

function invalidateProducts() {
  cache.delByPrefix('products:');
  cache.delByPrefix('dashboard:');
}


const STAFF_ROLES = ['ADMIN', 'TREASURER'];
const variantSelect = { select: { id: true, size: true, stock: true, sku: true }, orderBy: { id: 'asc' } };

async function requireOne(id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw notFound('Product not found');
  return product;
}

export const productsService = {
  async list({ includeInactive }, user) {
    const showAll = Boolean(includeInactive && user && STAFF_ROLES.includes(user.role));
    // Cache the base product list for public requests. Member discount is applied after, so the
    // cache does not contain any user-specific pricing.
    const baseProducts = await cache.wrap(`products:list:${showAll}`, PRODUCTS_TTL_SECONDS, () =>
      prisma.product.findMany({
        where: showAll ? {} : { isActive: true },
        include: { variants: variantSelect },
        orderBy: { id: 'asc' },
      }),
    );

    // The member discount comes from the viewer's active tier, so prices shown match checkout.
    const tier = user ? await membershipsService.getActiveTierForUser(user.id) : null;
    const percent = tier?.merchDiscountPercent ?? 0;
    const data = baseProducts.map((product) => ({
      ...product,
      merchDiscountPercent: percent,
      yourPrice: applyPercentDiscount(product.basePrice, percent).final,
    }));
    return { data };
  },

  async create({ variants, ...body }) {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: body });
      await tx.productVariant.createMany({
        data: variants.map((variant) => ({
          productId: product.id, size: variant.size, stock: variant.stock, sku: `P${product.id}-${variant.size}`,
        })),
      });
      return tx.product.findUnique({ where: { id: product.id }, include: { variants: variantSelect } });
    });
    invalidateProducts();
    return result;
  },

  async update(id, body) {
    await requireOne(id);
    const result = await prisma.product.update({ where: { id }, data: body, include: { variants: variantSelect } });
    invalidateProducts();
    return result;
  },

  // Stock is set to an absolute value by an admin (for example after a delivery or a recount).
  async updateStock(productId, variantId, stock) {
    const { count } = await prisma.productVariant.updateMany({ where: { id: variantId, productId }, data: { stock } });
    if (count === 0) throw notFound('Variant not found for this product');
    invalidateProducts();
    return prisma.productVariant.findUnique({ where: { id: variantId } });
  },
};
