import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, book, cleanup, makeEvent, makeUser, prisma, request } from './helpers.js';

after(cleanup);

describe('ticket pricing', () => {
  test('an active member pays the member price and a non-member pays the full price', async () => {
    const event = await makeEvent({ memberPrice: 25000, nonMemberPrice: 40000 });
    const member = await makeUser({ member: { status: 'ACTIVE' } });
    const guest = await makeUser();

    const memberBooking = await book(member.token, event.id);
    const guestBooking = await book(guest.token, event.id);

    assert.equal(memberBooking.status, 201);
    assert.equal(memberBooking.body.data.booking.priceAtBooking, 25000);
    assert.equal(memberBooking.body.data.booking.isMemberPrice, true);
    assert.equal(memberBooking.body.data.booking.discountApplied, 15000);
    assert.equal(guestBooking.status, 201);
    assert.equal(guestBooking.body.data.booking.priceAtBooking, 40000);
    assert.equal(guestBooking.body.data.booking.isMemberPrice, false);
  });

  test('a member whose expiry has passed pays the full price even if the status still says ACTIVE', async () => {
    const event = await makeEvent();
    const lapsed = await makeUser({ member: { status: 'ACTIVE', expiresInDays: -2 } });
    const res = await book(lapsed.token, event.id);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.booking.priceAtBooking, event.nonMemberPrice);
    assert.equal(res.body.data.booking.isMemberPrice, false);
  });

  test('an EXPIRED or CANCELLED member pays the full price', async () => {
    const event = await makeEvent();
    const expired = await makeUser({ member: { status: 'EXPIRED', expiresInDays: -30 } });
    const cancelled = await makeUser({ member: { status: 'CANCELLED', expiresInDays: 100 } });
    const a = await book(expired.token, event.id);
    const b = await book(cancelled.token, event.id);
    assert.equal(a.body.data.booking.priceAtBooking, event.nonMemberPrice);
    assert.equal(b.body.data.booking.priceAtBooking, event.nonMemberPrice);
  });

  test('the server ignores or rejects a price sent by the client', async () => {
    const event = await makeEvent();
    const guest = await makeUser();
    const res = await book(guest.token, event.id, { priceAtBooking: 1, price: 1 });
    assert.equal(res.status, 400);
    assert.equal(await prisma.booking.count({ where: { eventId: event.id } }), 0);
  });

  test('the price is saved at booking time and later price changes do not alter it', async () => {
    const event = await makeEvent();
    const guest = await makeUser();
    const res = await book(guest.token, event.id);
    await prisma.event.update({ where: { id: event.id }, data: { nonMemberPrice: 99900 } });
    const saved = await prisma.booking.findUnique({ where: { id: res.body.data.booking.id } });
    assert.equal(saved.priceAtBooking, event.nonMemberPrice);
  });

  test('booking writes exactly one TICKETS income row for the price paid', async () => {
    const event = await makeEvent();
    const guest = await makeUser();
    const res = await book(guest.token, event.id);
    const rows = await prisma.transaction.findMany({ where: { sourceType: 'BOOKING', sourceId: String(res.body.data.booking.id) } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'INCOME');
    assert.equal(rows[0].category, 'TICKETS');
    assert.equal(rows[0].amount, event.nonMemberPrice);
    assert.equal(rows[0].eventId, event.id);
  });

  test('a user cannot book the same event twice', async () => {
    const event = await makeEvent();
    const guest = await makeUser();
    assert.equal((await book(guest.token, event.id)).status, 201);
    const again = await book(guest.token, event.id);
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'ALREADY_BOOKED');
  });

  test('booking is refused for a draft event, a closed window and a past event', async () => {
    const guest = await makeUser();
    const draft = await makeEvent({ status: 'DRAFT' });
    const notYetOpen = await makeEvent({ bookingOpensAt: new Date(Date.now() + 3600 * 1000) });
    const closed = await makeEvent({ bookingClosesAt: new Date(Date.now() - 3600 * 1000) });
    assert.equal((await book(guest.token, draft.id)).body.error.code, 'EVENT_NOT_OPEN');
    assert.equal((await book(guest.token, notYetOpen.id)).body.error.code, 'BOOKING_WINDOW_CLOSED');
    assert.equal((await book(guest.token, closed.id)).body.error.code, 'BOOKING_WINDOW_CLOSED');
  });

  test('booking an event that does not exist is a 404', async () => {
    const guest = await makeUser();
    const res = await book(guest.token, 999999999);
    assert.equal(res.status, 404);
  });

  test('anonymous visitors cannot book', async () => {
    const event = await makeEvent();
    const res = await request(app).post(`/api/events/${event.id}/bookings`).send({});
    assert.equal(res.status, 401);
  });
});
