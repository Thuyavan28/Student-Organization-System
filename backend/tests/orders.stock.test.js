import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { prisma } = await import('../src/config/prisma.js');
const { authRouter } = await import('../src/modules/auth/auth.routes.js');
const { productsRouter } = await import('../src/modules/products/products.routes.js');
const { ordersRouter } = await import('../src/modules/orders/orders.routes.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { makeUser, cleanup } = await import('./helpers.js');

// A small app that mounts only the routers under test, so this suite does not depend on other modules.
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use(errorHandler);

const PASSWORD = 'Password@123';
const UNIT_PRICE = 100000;
const NON_MEMBER_EMAIL = 'student110@example.com';
const ADMIN_EMAIL = 'admin@skyline.example.com';

let product;
let roomy;
let scarce;
const tokens = {};
let memberToken;
let tierPercent;

async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  assert.equal(res.status, 200, `login failed for ${email}`);
  return res.body.data.token;
}

const orderWith = (token, items) => request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ items });
const order = (email, items) => orderWith(tokens[email], items);

const stockOf = async (variantId) => (await prisma.productVariant.findUnique({ where: { id: variantId } })).stock;

async function resetStock(roomyStock, scarceStock) {
  await prisma.productVariant.update({ where: { id: roomy.id }, data: { stock: roomyStock } });
  await prisma.productVariant.update({ where: { id: scarce.id }, data: { stock: scarceStock } });
}

before(async () => {
  product = await prisma.product.create({
    data: {
      name: `Test hoodie ${Date.now()}`,
      description: 'Created by orders.stock.test.js',
      basePrice: UNIT_PRICE,
      variants: { create: [{ size: 'M', stock: 10, sku: `T-${Date.now()}-M` }, { size: 'L', stock: 1, sku: `T-${Date.now()}-L` }] },
    },
    include: { variants: true },
  });
  roomy = product.variants.find((variant) => variant.size === 'M');
  scarce = product.variants.find((variant) => variant.size === 'L');
  for (const email of [NON_MEMBER_EMAIL, ADMIN_EMAIL]) tokens[email] = await login(email);

  // The discount depends on the member's tier, so the test creates its own member on a discounted tier.
  const tier = await prisma.membershipTier.findFirst({ where: { merchDiscountPercent: { gt: 0 } }, orderBy: { merchDiscountPercent: 'desc' } });
  tierPercent = tier.merchDiscountPercent;
  memberToken = (await makeUser({ member: { status: 'ACTIVE', tierId: tier.id } })).token;
});

after(async () => {
  const items = await prisma.orderItem.findMany({ where: { variantId: { in: [roomy.id, scarce.id] } }, select: { orderId: true } });
  const orderIds = [...new Set(items.map((item) => item.orderId))];
  await prisma.transaction.deleteMany({
    where: { sourceType: 'ORDER', sourceId: { in: [...orderIds.map(String), ...orderIds.map((id) => `${id}:refund`)] } },
  });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await cleanup();
});

describe('merchandise orders', () => {
  test('an order for more than the stock is rejected and the stock is unchanged', async () => {
    await resetStock(10, 1);
    const res = await order(NON_MEMBER_EMAIL, [{ variantId: scarce.id, quantity: 2 }]);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'OUT_OF_STOCK');
    assert.equal(await stockOf(scarce.id), 1);
  });

  test('one short line fails the whole order and leaves every variant unchanged', async () => {
    await resetStock(10, 1);
    const res = await order(NON_MEMBER_EMAIL, [
      { variantId: roomy.id, quantity: 3 },
      { variantId: scarce.id, quantity: 2 },
    ]);
    assert.equal(res.status, 409);
    assert.equal(await stockOf(roomy.id), 10);
    assert.equal(await stockOf(scarce.id), 1);
  });

  test('an active member gets the tier discount and a non-member pays the full price', async () => {
    await resetStock(10, 1);
    const member = await orderWith(memberToken, [{ variantId: roomy.id, quantity: 1 }]);
    const guest = await order(NON_MEMBER_EMAIL, [{ variantId: roomy.id, quantity: 1 }]);
    assert.equal(member.status, 201);
    assert.equal(guest.status, 201);
    const discount = Math.round((UNIT_PRICE * tierPercent) / 100);
    assert.equal(member.body.data.discountTotal, discount);
    assert.equal(member.body.data.total, UNIT_PRICE - discount);
    assert.equal(guest.body.data.total, UNIT_PRICE);
    assert.equal(guest.body.data.discountTotal, 0);
  });

  test('a successful order drops the stock and books exactly one merchandise ledger row for the total', async () => {
    await resetStock(10, 1);
    const res = await order(NON_MEMBER_EMAIL, [{ variantId: roomy.id, quantity: 4 }]);
    assert.equal(res.status, 201);
    assert.equal(await stockOf(roomy.id), 6);

    const rows = await prisma.transaction.findMany({ where: { sourceType: 'ORDER', sourceId: String(res.body.data.id) } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'INCOME');
    assert.equal(rows[0].category, 'MERCHANDISE');
    assert.equal(rows[0].amount, UNIT_PRICE * 4);
  });

  test('two simultaneous orders for the last unit produce exactly one order', async () => {
    await resetStock(10, 1);
    const results = await Promise.all([
      order(NON_MEMBER_EMAIL, [{ variantId: scarce.id, quantity: 1 }]),
      orderWith(memberToken, [{ variantId: scarce.id, quantity: 1 }]),
      order(NON_MEMBER_EMAIL, [{ variantId: scarce.id, quantity: 1 }]),
    ]);
    const statuses = results.map((res) => res.status).sort();
    assert.deepEqual(statuses, [201, 409, 409]);
    assert.equal(await stockOf(scarce.id), 0);
  });

  test('cancelling an order returns the stock, books one refund and cannot be repeated', async () => {
    await resetStock(10, 1);
    const placed = await order(NON_MEMBER_EMAIL, [{ variantId: roomy.id, quantity: 2 }]);
    const id = placed.body.data.id;
    assert.equal(await stockOf(roomy.id), 8);

    const cancel = () =>
      request(app).patch(`/api/orders/${id}/status`).set('Authorization', `Bearer ${tokens[ADMIN_EMAIL]}`).send({ status: 'CANCELLED' });
    const first = await cancel();
    assert.equal(first.status, 200);
    assert.equal(first.body.data.paymentStatus, 'REFUNDED');
    assert.equal(await stockOf(roomy.id), 10);

    const second = await cancel();
    assert.equal(second.status, 409);
    assert.equal(await stockOf(roomy.id), 10);

    const refunds = await prisma.transaction.findMany({ where: { sourceType: 'ORDER', sourceId: `${id}:refund` } });
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0].type, 'EXPENSE');
    assert.equal(refunds[0].amount, UNIT_PRICE * 2);
  });

  test('a plain user cannot change an order status', async () => {
    const placed = await order(NON_MEMBER_EMAIL, [{ variantId: roomy.id, quantity: 1 }]);
    const res = await request(app)
      .patch(`/api/orders/${placed.body.data.id}/status`)
      .set('Authorization', `Bearer ${tokens[NON_MEMBER_EMAIL]}`)
      .send({ status: 'FULFILLED' });
    assert.equal(res.status, 403);
  });
});
