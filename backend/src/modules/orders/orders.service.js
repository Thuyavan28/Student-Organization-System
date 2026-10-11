import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { badRequest, conflict, notFound } from '../../utils/apiError.js';
import { applyPercentDiscount } from '../../utils/money.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { likePattern, whereAll } from '../../utils/sql.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { membershipsService } from '../memberships/memberships.service.js';
import { paymentsService } from '../payments/payments.service.js';
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

async function orderPage(conditions, page) {
  const rows = await prisma.$queryRaw`
    SELECT o.id, o.user_id AS "userId", o.subtotal, o.discount_total AS "discountTotal", o.total,
           o.status::text AS status, o.payment_status::text AS "paymentStatus", o.payment_mode::text AS "paymentMode",
           o.created_at AS "createdAt", o.updated_at AS "updatedAt",
           u.name AS "userName", u.email AS "userEmail",
           COALESCE((
             SELECT json_agg(json_build_object(
                      'id', oi.id, 'orderId', oi.order_id, 'variantId', oi.variant_id, 'quantity', oi.quantity,
                      'unitPrice', oi.unit_price, 'discountApplied', oi.discount_applied,
                      'variant', json_build_object('id', v.id, 'productId', v.product_id, 'size', v.size::text, 'stock', v.stock, 'sku', v.sku,
                                                   'product', json_build_object('id', p.id, 'name', p.name))
                    ) ORDER BY oi.id)
             FROM order_items oi
             JOIN product_variants v ON v.id = oi.variant_id
             JOIN products p ON p.id = v.product_id
             WHERE oi.order_id = o.id
           ), '[]'::json) AS items,
           COUNT(*) OVER()::int AS "totalRows"
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ${whereAll(conditions)}
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT ${page.take} OFFSET ${page.skip}`;
  let total = rows[0]?.totalRows ?? 0;
  if (rows.length === 0 && page.skip > 0) {
    const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM orders o JOIN users u ON u.id = o.user_id ${whereAll(conditions)}`;
    total = count;
  }
  const data = rows.map(({ userName, userEmail, totalRows: _t, ...row }) => ({ ...row, user: { id: row.userId, name: userName, email: userEmail } }));
  return paginated(data, total, page);
}

// Places an order in ONE database statement (two round trips in total: a parallel read, then this write), instead of
// about fifteen sequential queries. The statement is atomic: either the order, its items, the stock decrement and the
// ledger entry all happen, or none of them do.
//
// How overselling is prevented:
//   1. `locked` takes a row lock (FOR UPDATE) on every variant being bought, always in id order, so two orders that
//      share variants queue up instead of deadlocking, and each sees the stock left by the order before it.
//   2. `chk` is true only if EVERY line has enough stock after the lock. If one line is short, nothing is written.
//   3. The stock UPDATE and every INSERT run only when `chk` is true.
// The database is the only authority on stock; Redis and the product cache are never consulted here.
async function placeOrder(userId, lines, proof) {
  const ids = lines.map((line) => line.variantId);
  // Independent reads share one round trip.
  const [variantRows, [buyer]] = await Promise.all([
    prisma.$queryRaw`
      SELECT v.id, v.product_id AS "productId", v.size::text AS size, v.sku, p.name, p.base_price AS "basePrice", p.is_active AS "isActive"
      FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE v.id = ANY(${ids}::int[])`,
    prisma.$queryRaw`
      SELECT u.id, u.name, u.email, m.membership_status::text AS "membershipStatus", m.expires_at AS "expiresAt",
             COALESCE(t.merch_discount_percent, 0) AS "merchDiscountPercent"
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      LEFT JOIN membership_tiers t ON t.id = m.tier_id
      WHERE u.id = ${userId}`,
  ]);
  const byId = new Map(variantRows.map((variant) => [variant.id, variant]));
  for (const line of lines) {
    const variant = byId.get(line.variantId);
    if (!variant || !variant.isActive) throw badRequest('INVALID_ITEM', 'One or more items are no longer available');
    if (line.quantity > MAX_QUANTITY) throw badRequest('QUANTITY_TOO_LARGE', `You can order at most ${MAX_QUANTITY} of one item`);
  }

  const percent = membershipsService.isActiveMember(buyer) ? buyer.merchDiscountPercent : 0;
  const items = lines.map((line) => {
    const unitPrice = byId.get(line.variantId).basePrice;
    const gross = unitPrice * line.quantity;
    return { variantId: line.variantId, quantity: line.quantity, unitPrice, discountApplied: applyPercentDiscount(gross, percent).discount };
  });
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountTotal = items.reduce((sum, item) => sum + item.discountApplied, 0);
  const total = subtotal - discountTotal;
  // The payment must cover exactly this total. Checked before anything is written; released again if the order fails.
  proof.claim(total);

  const [result] = await prisma.$queryRaw`
    WITH lines AS (
      SELECT * FROM unnest(${ids}::int[], ${items.map((i) => i.quantity)}::int[], ${items.map((i) => i.unitPrice)}::int[], ${items.map((i) => i.discountApplied)}::int[])
             AS l(variant_id, qty, unit_price, discount)
    ),
    locked AS (
      SELECT v.id, v.stock, l.qty FROM product_variants v JOIN lines l ON l.variant_id = v.id ORDER BY v.id FOR UPDATE OF v
    ),
    chk AS (SELECT (COUNT(*) = ${ids.length}::int AND COALESCE(BOOL_AND(stock >= qty), FALSE)) AS ok FROM locked),
    upd AS (
      UPDATE product_variants v SET stock = v.stock - l.qty, updated_at = now()
      FROM lines l WHERE v.id = l.variant_id AND (SELECT ok FROM chk) RETURNING v.id
    ),
    ord AS (
      INSERT INTO orders (user_id, subtotal, discount_total, total, status, payment_status, payment_mode)
      SELECT ${userId}::int, ${subtotal}::int, ${discountTotal}::int, ${total}::int, 'PAID', 'PAID', 'SIMULATED'
      WHERE (SELECT ok FROM chk) RETURNING id, created_at, updated_at
    ),
    itm AS (
      INSERT INTO order_items (order_id, variant_id, quantity, unit_price, discount_applied)
      SELECT ord.id, l.variant_id, l.qty, l.unit_price, l.discount FROM ord CROSS JOIN lines l RETURNING id, variant_id
    ),
    led AS (
      INSERT INTO transactions (type, category, amount, description, source_type, source_id, occurred_at, recorded_by_id)
      SELECT 'INCOME', 'MERCHANDISE', ${total}::int, 'Merchandise order #' || ord.id, 'ORDER', ord.id::text, ord.created_at, ${userId}::int
      FROM ord WHERE ${total}::int > 0 RETURNING id
    )
    SELECT (SELECT ok FROM chk) AS ok,
           (SELECT id FROM ord) AS "orderId", (SELECT created_at FROM ord) AS "createdAt", (SELECT updated_at FROM ord) AS "updatedAt",
           (SELECT json_agg(json_build_object('id', id, 'variantId', variant_id)) FROM itm) AS "createdItems",
           (SELECT json_agg(json_build_object('id', id, 'stock', stock, 'qty', qty)) FROM locked) AS "lockedRows"`;

  if (!result.ok) {
    // Nothing was written. Name the first line that is short (the values come from the rows the statement locked).
    const short = (result.lockedRows ?? []).find((row) => row.stock < row.qty);
    if (!short) throw badRequest('INVALID_ITEM', 'One or more items are no longer available');
    const variant = byId.get(short.id);
    throw conflict('OUT_OF_STOCK', `Not enough stock for ${label({ size: variant.size, product: { name: variant.name } })}`, { variantId: short.id });
  }

  const itemIds = new Map(result.createdItems.map((row) => [row.variantId, row.id]));
  const stockBefore = new Map(result.lockedRows.map((row) => [row.id, row.stock]));
  return {
    id: result.orderId, userId, subtotal, discountTotal, total,
    status: 'PAID', paymentStatus: 'PAID', paymentMode: 'SIMULATED',
    createdAt: result.createdAt, updatedAt: result.updatedAt,
    items: items.map((item) => {
      const variant = byId.get(item.variantId);
      return {
        id: itemIds.get(item.variantId), orderId: result.orderId, variantId: item.variantId, quantity: item.quantity,
        unitPrice: item.unitPrice, discountApplied: item.discountApplied,
        variant: {
          id: variant.id, productId: variant.productId, size: variant.size, stock: stockBefore.get(variant.id) - item.quantity, sku: variant.sku,
          product: { id: variant.productId, name: variant.name },
        },
      };
    }),
    user: { id: userId, name: buyer.name, email: buyer.email },
  };
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
  async create(userId, items, paymentSessionId) {
    const proof = paymentsService.proofFor(paymentSessionId, userId);
    let order;
    try {
      order = await placeOrder(userId, mergeLines(items), proof);
      proof.done();
    } catch (error) {
      proof.fail();
      throw error;
    }
    invalidateOrderCaches();
    // Sent after the order is saved and not awaited, so a slow mail server never delays or fails the purchase.
    if (env.NODE_ENV !== 'test') notificationsService.orderPlaced(order);
    return order;
  },

  // Both lists are one SQL statement: orders, buyer, line items (as JSON) and the total count in a single round trip.
  listMine(userId, query) {
    return orderPage([Prisma.sql`o.user_id = ${userId}`], parsePagination(query, 10));
  },

  list(query) {
    const c = [];
    if (query.status) c.push(Prisma.sql`o.status = ${query.status}::order_status`);
    if (query.q) c.push(Prisma.sql`(u.name ILIKE ${likePattern(query.q)} OR u.email ILIKE ${likePattern(query.q)})`);
    return orderPage(c, parsePagination(query, 15));
  },

  async updateStatus(id, status, actor) {
    const order = await (status === 'FULFILLED' ? fulfil(id) : cancel(id, actor.id));
    invalidateOrderCaches();
    return order;
  },
};
