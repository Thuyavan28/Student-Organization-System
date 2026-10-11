import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';

// Proof of payment is switched ON for this file only (it is off by default in tests so other suites can buy directly).
process.env.REQUIRE_PAYMENT_PROOF = 'true';
const { app, authed, cleanup, makeEvent, makeUser, prisma, request } = await import('./helpers.js');

const variant = await prisma.productVariant.findFirst({ where: { stock: { gte: 5 }, product: { isActive: true } }, include: { product: true } });
const stockBefore = variant.stock;
after(async () => {
  await cleanup();
  await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: stockBefore } });
});

const startPayment = (token, amount) => request(app).post('/api/payments/session').set(authed(token)).send({ amount, title: 'Test payment' });
const approve = (id) => request(app).post(`/api/payments/session/${id}/approve`);
const book = (token, eventId, paymentSessionId) => request(app).post(`/api/events/${eventId}/bookings`).set(authed(token)).send(paymentSessionId ? { paymentSessionId } : {});
const buy = (token, quantity, paymentSessionId) => request(app).post('/api/orders').set(authed(token)).send({ items: [{ variantId: variant.id, quantity }], paymentSessionId });
const paid = async (token, amount) => {
  const session = (await startPayment(token, amount)).body.data;
  assert.equal((await approve(session.id)).status, 200);
  return session.id;
};

describe('proof of payment', () => {
  test('a ticket cannot be booked without paying, with an unapproved payment, or for the wrong amount', async () => {
    const buyer = await makeUser();
    const event = await makeEvent(); // non-member price is 40000
    const none = await book(buyer.token, event.id);
    assert.equal(none.status, 402);
    assert.equal(none.body.error.code, 'PAYMENT_REQUIRED');

    const pending = (await startPayment(buyer.token, 40000)).body.data;
    const unapproved = await book(buyer.token, event.id, pending.id);
    assert.equal(unapproved.body.error.code, 'PAYMENT_NOT_APPROVED');

    const cheap = await paid(buyer.token, 100); // approved, but not the price the server calculates
    const wrong = await book(buyer.token, event.id, cheap);
    assert.equal(wrong.status, 402);
    assert.equal(wrong.body.error.code, 'PAYMENT_AMOUNT_MISMATCH');
    assert.equal(await prisma.booking.count({ where: { eventId: event.id } }), 0);
  });

  test('a correct payment books the ticket exactly once and cannot be reused', async () => {
    const buyer = await makeUser();
    const event = await makeEvent();
    const other = await makeEvent();
    const session = await paid(buyer.token, 40000);
    assert.equal((await book(buyer.token, event.id, session)).status, 201);
    const again = await book(buyer.token, other.id, session);
    assert.equal(again.status, 402);
    assert.equal(again.body.error.code, 'PAYMENT_ALREADY_USED');
  });

  test("someone else's approved payment cannot be used", async () => {
    const owner = await makeUser();
    const thief = await makeUser();
    const event = await makeEvent();
    const session = await paid(owner.token, 40000);
    const res = await book(thief.token, event.id, session);
    assert.equal(res.status, 402);
    assert.equal(res.body.error.code, 'PAYMENT_NOT_YOURS');
  });

  test('a refused purchase (sold out) gives the payment back so it can be used again', async () => {
    const first = await makeUser();
    const second = await makeUser();
    const soldOut = await makeEvent({ capacity: 1 });
    const open = await makeEvent();
    assert.equal((await book(first.token, soldOut.id, await paid(first.token, 40000))).status, 201);
    const session = await paid(second.token, 40000);
    assert.equal((await book(second.token, soldOut.id, session)).status, 409); // sold out
    assert.equal((await book(second.token, open.id, session)).status, 201); // same payment still valid elsewhere
  });

  test('a free ticket needs no payment', async () => {
    const buyer = await makeUser();
    const free = await makeEvent({ memberPrice: 0, nonMemberPrice: 0 });
    assert.equal((await book(buyer.token, free.id)).status, 201);
  });

  test('merchandise needs a payment for exactly the order total, and one payment buys only one order', async () => {
    const buyer = await makeUser();
    assert.equal((await buy(buyer.token, 1)).body.error.code, 'PAYMENT_REQUIRED');
    const price = variant.product.basePrice; // a plain (non-member) user pays the full price
    const wrong = await paid(buyer.token, price - 1);
    assert.equal((await buy(buyer.token, 1, wrong)).body.error.code, 'PAYMENT_AMOUNT_MISMATCH');
    const right = await paid(buyer.token, price);
    assert.equal((await buy(buyer.token, 1, right)).status, 201);
    assert.equal((await buy(buyer.token, 1, right)).body.error.code, 'PAYMENT_ALREADY_USED');
  });

  test('five simultaneous orders spending the same payment produce exactly one order', async () => {
    const buyer = await makeUser();
    const session = await paid(buyer.token, variant.product.basePrice);
    const results = await Promise.all(Array.from({ length: 5 }, () => buy(buyer.token, 1, session)));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(results.filter((r) => r.status === 402).length, 4);
    assert.equal(await prisma.order.count({ where: { userId: buyer.user.id } }), 1);
  });

  test('starting a payment needs a signed-in user', async () => {
    const res = await request(app).post('/api/payments/session').send({ amount: 100 });
    assert.equal(res.status, 401);
  });
});
