import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { badRequest, conflict, notFound } from '../../utils/apiError.js';
import { applyPercentDiscount } from '../../utils/money.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { membershipsService } from '../memberships/memberships.service.js';
import { MAX_QUANTITY } from './orders.schema.js';


const orderInclude = {
  items: { include: { variant: { include: { product: { select: { id: true, name: true } } } } }, orderBy: { id: 'asc' } },
  user: { select: { id: true, name: true, email: true } },
};

// Two lines for the same variant are merged so the stock check sees the real total.
function mergeLines(items) {
  const merged = new Map();
  for (const item of items) merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  return [...merged.entries()]
    .map(([variantId, quantity]) => ({ variantId, quantity }))
    .sort((a, b) => a.variantId - b.variantId);
}

function label(variant) {
  return `${variant.product.name} (${variant.size === 'ONE_SIZE' ? 'one size' : variant.size})`;
}

async function placeOrder(tx, userId, lines) {
  const variants = await tx.productVariant.findMany({
    where: { id: { in: lines.map((line) => line.variantId) } },
    include: { product: true },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  for (const line of lines) {
    const variant = byId.get(line.variantId);
    if (!variant || !variant.product.isActive) throw badRequest('INVALID_ITEM', 'One or more items are no longer available');
    if (line.quantity > MAX_QUANTITY) throw badRequest('QUANTITY_TOO_LARGE', `You can order at most ${MAX_QUANTITY} of one item`);
  }

  // Lines are processed in variant id order so concurrent orders lock rows in the same order.
  for (const line of lines) {
    // The where clause makes the decrement conditional, so stock can never go below zero even
    // when two orders race for the last units: the loser matches no row and the order fails.
    const { count } = await tx.productVariant.updateMany({
      where: { id: line.variantId, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (count === 0) {
      throw conflict('OUT_OF_STOCK', `Not enough stock for ${label(byId.get(line.variantId))}`, { variantId: line.variantId });
    }
  }

  const tier = await membershipsService.getActiveTierForUser(userId, tx);
  const percent = tier?.merchDiscountPercent ?? 0;
  const items = lines.map((line) => {
    const unitPrice = byId.get(line.variantId).product.basePrice;
    const gross = unitPrice * line.quantity;
    return { variantId: line.variantId, quantity: line.quantity, unitPrice, discountApplied: applyPercentDiscount(gross, percent).discount };
  });
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountTotal = items.reduce((sum, item) => sum + item.discountApplied, 0);
  const total = subtotal - discountTotal;

  const order = await tx.order.create({
    data: {
      userId, subtotal, discountTotal, total,
      status: 'PAID', paymentStatus: 'PAID', paymentMode: 'SIMULATED',
      items: { create: items },
    },
    include: orderInclude,
  });

  if (total > 0) {
    await tx.transaction.create({
      data: {
        type: 'INCOME', category: 'MERCHANDISE', amount: total, description: `Merchandise order #${order.id}`,
        sourceType: 'ORDER', sourceId: String(order.id), occurredAt: order.createdAt, recordedById: userId,
      },
    });
  }
  return order;
}

async function fulfil(id) {
  const { count } = await prisma.order.updateMany({ where: { id, status: 'PAID' }, data: { status: 'FULFILLED' } });
  if (count === 0) throw conflict('NOT_FULFILLABLE', 'Only a paid order can be marked fulfilled');
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

// Cancelling returns the stock and, if the order was paid, books a refund against the ledger.
// Refunds use a negative source id so they never collide with the original income row.
async function cancel(id, actorId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw notFound('Order not found');
    const { count } = await tx.order.updateMany({
      where: { id, status: { in: ['PLACED', 'PAID'] } },
      data: { status: 'CANCELLED', paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus },
    });
    if (count === 0) throw conflict('NOT_CANCELLABLE', 'This order can no longer be cancelled');

    for (const item of order.items) {
      await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    }
    if (order.paymentStatus === 'PAID' && order.total > 0) {
      await tx.transaction.create({
        data: {
          type: 'EXPENSE', category: 'MERCHANDISE', amount: order.total, description: `Merchandise refund #${order.id}`,
          sourceType: 'ORDER', sourceId: `${order.id}:refund`, occurredAt: new Date(), recordedById: actorId,
        },
      });
    }
    return tx.order.findUnique({ where: { id }, include: orderInclude });
  });
}

// An order changes product stock and the ledger, so the cached product list and totals must be dropped.
function invalidateOrderCaches() {
  cache.delByPrefix('products:');
  cache.delByPrefix('dashboard:');
  cache.delByPrefix('finance:');
}

export const ordersService = {
  async create(userId, items) {
    const order = await prisma.$transaction((tx) => placeOrder(tx, userId, mergeLines(items)));
    invalidateOrderCaches();
    // Sent after the order is saved and not awaited, so a slow mail server never delays or fails the purchase.
    if (env.NODE_ENV !== 'test') notificationsService.orderPlaced(order);
    return order;
  },

  async listMine(userId, query) {
    const page = parsePagination(query, 10);
    const where = { userId };
    const [rows, total] = await Promise.all([
      prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      prisma.order.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  async list(query) {
    const page = parsePagination(query, 15);
    const where = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.user = {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      };
    }
    const [rows, total] = await Promise.all([
      prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      prisma.order.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  async updateStatus(id, status, actor) {
    const order = await (status === 'FULFILLED' ? fulfil(id) : cancel(id, actor.id));
    invalidateOrderCaches();
    return order;
  },
};
