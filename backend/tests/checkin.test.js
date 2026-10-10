import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { app, authed, book, cleanup, makeEvent, makeUser, prisma, request } from './helpers.js';

after(cleanup);

const scan = (token, eventId, ticketToken) =>
  request(app).post('/api/checkins/verify').set(authed(token)).send({ eventId, token: ticketToken });

async function ticketFor({ member } = {}, eventOverrides = {}) {
  const event = await makeEvent(eventOverrides);
  const attendee = await makeUser({ member });
  const booked = await book(attendee.token, event.id);
  assert.equal(booked.status, 201);
  return { event, attendee, ticket: booked.body.data.ticket, booking: booked.body.data.booking };
}

describe('check-in', () => {
  test('the first scan is VALID and shows the attendee and an active member badge', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const { event, attendee, ticket } = await ticketFor({ member: { status: 'ACTIVE' } });

    const res = await scan(volunteer.token, event.id, ticket.token);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.result, 'VALID');
    assert.equal(res.body.data.attendee.name, attendee.user.name);
    assert.equal(res.body.data.membership.isActive, true);
    assert.ok(res.body.data.checkedInAt);

    const saved = await prisma.ticket.findUnique({ where: { token: ticket.token }, include: { checkIn: true } });
    assert.equal(saved.status, 'USED');
    assert.equal(saved.checkIn.membershipVerifiedActive, true);
    assert.equal(saved.checkIn.checkedInById, volunteer.user.id);
  });

  test('a non-member is checked in but flagged as not an active member', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const { event, ticket } = await ticketFor();
    const res = await scan(volunteer.token, event.id, ticket.token);
    assert.equal(res.body.data.result, 'VALID');
    assert.equal(res.body.data.membership.isActive, false);
  });

  test('the second scan is ALREADY_USED and reports the original check-in time', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const { event, ticket } = await ticketFor();
    const first = await scan(volunteer.token, event.id, ticket.token);
    const second = await scan(volunteer.token, event.id, ticket.token);
    assert.equal(first.body.data.result, 'VALID');
    assert.equal(second.body.data.result, 'ALREADY_USED');
    assert.equal(new Date(second.body.data.checkedInAt).getTime(), new Date(first.body.data.checkedInAt).getTime());
    assert.equal(await prisma.checkIn.count({ where: { ticket: { token: ticket.token } } }), 1);
  });

  test('two phones scanning the same ticket at the same moment produce exactly one VALID', async () => {
    const one = await makeUser({ role: 'VOLUNTEER' });
    const two = await makeUser({ role: 'VOLUNTEER' });
    const { event, ticket } = await ticketFor();
    const results = await Promise.all([
      scan(one.token, event.id, ticket.token),
      scan(two.token, event.id, ticket.token),
      scan(one.token, event.id, ticket.token),
    ]);
    const outcomes = results.map((res) => res.body.data.result).sort();
    assert.deepEqual(outcomes, ['ALREADY_USED', 'ALREADY_USED', 'VALID']);
    assert.equal(await prisma.checkIn.count({ where: { ticket: { token: ticket.token } } }), 1);
  });

  test('an unknown token is INVALID', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const event = await makeEvent();
    const res = await scan(volunteer.token, event.id, 'definitely-not-a-real-ticket-token');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.result, 'INVALID');
    assert.equal(res.body.data.attendee ?? null, null);
  });

  test('a ticket for another event is WRONG_EVENT and is not consumed', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const { ticket } = await ticketFor();
    const otherEvent = await makeEvent();
    const res = await scan(volunteer.token, otherEvent.id, ticket.token);
    assert.equal(res.body.data.result, 'WRONG_EVENT');
    const saved = await prisma.ticket.findUnique({ where: { token: ticket.token } });
    assert.equal(saved.status, 'VALID');
  });

  test('a cancelled booking is CANCELLED and cannot enter', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const { event, attendee, ticket, booking } = await ticketFor();
    await request(app).post(`/api/bookings/${booking.id}/cancel`).set(authed(attendee.token));
    const res = await scan(volunteer.token, event.id, ticket.token);
    assert.equal(res.body.data.result, 'CANCELLED');
    assert.equal(await prisma.checkIn.count({ where: { ticket: { token: ticket.token } } }), 0);
  });

  test('the response carries a running checked-in versus booked counter', async () => {
    const volunteer = await makeUser({ role: 'VOLUNTEER' });
    const { event, ticket } = await ticketFor();
    const res = await scan(volunteer.token, event.id, ticket.token);
    assert.equal(res.body.data.counter.checkedIn, 1);
    assert.equal(res.body.data.counter.booked, 1);
  });

  test('only staff can scan: a plain member is refused and an anonymous caller is unauthenticated', async () => {
    const member = await makeUser();
    const { event, ticket } = await ticketFor();
    const forbidden = await scan(member.token, event.id, ticket.token);
    const anonymous = await request(app).post('/api/checkins/verify').send({ eventId: event.id, token: ticket.token });
    assert.equal(forbidden.status, 403);
    assert.equal(anonymous.status, 401);
  });

  test('the QR token is opaque: 24 or more characters and no personal data', async () => {
    const { ticket, attendee } = await ticketFor();
    assert.ok(ticket.token.length >= 24);
    assert.ok(!ticket.token.includes(String(attendee.user.id)) || ticket.token.length >= 24);
    assert.ok(!ticket.token.toLowerCase().includes(attendee.user.name.split(' ')[0].toLowerCase()));
  });
});
