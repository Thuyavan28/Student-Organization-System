import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, book, cleanup, makeEvent, makeUser, prisma, request } from './helpers.js';

after(cleanup);

describe('seat capacity', () => {
  test('20 parallel booking requests on an event with 5 seats confirm exactly 5', async () => {
    const event = await makeEvent({ capacity: 5 });
    const users = await Promise.all(Array.from({ length: 20 }, () => makeUser()));

    const results = await Promise.all(users.map((entry) => book(entry.token, event.id)));

    const created = results.filter((res) => res.status === 201);
    const refused = results.filter((res) => res.status === 409);
    assert.equal(created.length, 5);
    assert.equal(refused.length, 15);
    assert.ok(refused.every((res) => res.body.error.code === 'SOLD_OUT'));
    assert.equal(await prisma.booking.count({ where: { eventId: event.id, status: 'CONFIRMED' } }), 5);
    assert.equal(await prisma.ticket.count({ where: { booking: { eventId: event.id } } }), 5);
    assert.equal(await prisma.transaction.count({ where: { eventId: event.id, sourceType: 'BOOKING' } }), 5);
  });

  test('booking a sold-out event returns 409 with a clear message', async () => {
    const event = await makeEvent({ capacity: 1 });
    const first = await makeUser();
    const second = await makeUser();
    assert.equal((await book(first.token, event.id)).status, 201);

    const res = await book(second.token, event.id);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'SOLD_OUT');
    assert.match(res.body.error.message, /sold out/i);
  });

  test('a cancelled booking frees its seat for someone else', async () => {
    const event = await makeEvent({ capacity: 1 });
    const first = await makeUser();
    const second = await makeUser();
    const booked = await book(first.token, event.id);
    assert.equal(booked.status, 201);

    const cancelled = await request(app).post(`/api/bookings/${booked.body.data.booking.id}/cancel`).set(authed(first.token));
    assert.equal(cancelled.status, 200);

    const next = await book(second.token, event.id);
    assert.equal(next.status, 201);
  });

  test('cancelling a booking refunds it once in the ledger and cannot be repeated', async () => {
    const event = await makeEvent();
    const guest = await makeUser();
    const booked = await book(guest.token, event.id);
    const id = booked.body.data.booking.id;

    const first = await request(app).post(`/api/bookings/${id}/cancel`).set(authed(guest.token));
    const second = await request(app).post(`/api/bookings/${id}/cancel`).set(authed(guest.token));
    assert.equal(first.status, 200);
    assert.equal(second.status, 409);

    const refunds = await prisma.transaction.findMany({ where: { sourceType: 'BOOKING', sourceId: `${id}:refund` } });
    assert.equal(refunds.length, 1);
    assert.equal(refunds[0].type, 'EXPENSE');
    assert.equal(refunds[0].amount, event.nonMemberPrice);
    const ticket = await prisma.ticket.findUnique({ where: { bookingId: id } });
    assert.equal(ticket.status, 'CANCELLED');
  });

  test("a user cannot cancel someone else's booking", async () => {
    const event = await makeEvent();
    const owner = await makeUser();
    const other = await makeUser();
    const booked = await book(owner.token, event.id);

    const res = await request(app).post(`/api/bookings/${booked.body.data.booking.id}/cancel`).set(authed(other.token));
    assert.equal(res.status, 403);
  });
});
