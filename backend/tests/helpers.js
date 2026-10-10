process.env.NODE_ENV = 'test';

import { unlink } from 'node:fs/promises';
import path from 'node:path';

const { default: request } = await import('supertest');
const { default: bcrypt } = await import('bcryptjs');
const { default: jwt } = await import('jsonwebtoken');
const { app } = await import('../src/app.js');
const { env } = await import('../src/config/env.js');
const { prisma } = await import('../src/config/prisma.js');
const { UPLOAD_DIR } = await import('../src/middleware/upload.js');

export { app, prisma, request };

export const PASSWORD = 'Password@123';
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const createdUserIds = [];
const createdEventIds = [];
let passwordHash;

export const authed = (token) => ({ Authorization: `Bearer ${token}` });

export async function login(email, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  return res.body.data.token;
}

// Tokens are signed directly so fixtures do not pay for a login round trip each.
export function tokenFor(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.JWT_SECRET, { expiresIn: '1h' });
}

let counter = 0;
const unique = () => `${Date.now()}-${process.pid}-${counter++}`;

// member: { status, expiresInDays, tierId } creates a membership profile for the new user.
export async function makeUser({ role = 'MEMBER', member } = {}) {
  passwordHash ??= await bcrypt.hash(PASSWORD, 4);
  const suffix = unique();
  const user = await prisma.user.create({
    data: {
      name: `Test User ${suffix}`,
      email: `test+${suffix}@example.com`,
      passwordHash,
      role,
      ...(member && {
        member: {
          create: {
            studentId: `T${suffix}`.slice(0, 30),
            tierId: member.tierId ?? 1,
            membershipStatus: member.status ?? 'ACTIVE',
            expiresAt: new Date(Date.now() + (member.expiresInDays ?? 200) * DAY_MS),
            department: 'Test Department',
            year: 1,
            phone: '9000000000',
            duesPaid: true,
          },
        },
      }),
    },
  });
  createdUserIds.push(user.id);
  return { user, token: tokenFor(user) };
}

export async function makeEvent(overrides = {}) {
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      title: `Test event ${unique()}`,
      description: 'Created by the automated tests',
      venue: 'Test hall',
      startAt: new Date(now + 7 * DAY_MS),
      endAt: new Date(now + 7 * DAY_MS + 3 * HOUR_MS),
      bookingOpensAt: new Date(now - DAY_MS),
      bookingClosesAt: new Date(now + 7 * DAY_MS - HOUR_MS),
      capacity: 50,
      memberPrice: 25000,
      nonMemberPrice: 40000,
      status: 'PUBLISHED',
      ...overrides,
    },
  });
  createdEventIds.push(event.id);
  return event;
}

export const book = (token, eventId, body = {}) =>
  request(app).post(`/api/events/${eventId}/bookings`).set(authed(token)).send(body);

// Removes everything the tests created, children before parents.
export async function cleanup() {
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ userId: { in: createdUserIds } }, { eventId: { in: createdEventIds } }] },
    select: { id: true },
  });
  const bookingIds = bookings.map((booking) => booking.id);
  const expenses = await prisma.expense.findMany({ where: { submittedById: { in: createdUserIds } }, select: { id: true, receiptUrl: true } });
  const expenseIds = expenses.map((expense) => expense.id);
  for (const { receiptUrl } of expenses) {
    if (receiptUrl) await unlink(path.join(UPLOAD_DIR, path.basename(receiptUrl))).catch(() => {});
  }

  await prisma.transaction.deleteMany({
    where: {
      OR: [
        { eventId: { in: createdEventIds } },
        { recordedById: { in: createdUserIds } },
        { sourceType: 'BOOKING', sourceId: { in: [...bookingIds.map(String), ...bookingIds.map((id) => `${id}:refund`)] } },
        { sourceType: 'EXPENSE', sourceId: { in: expenseIds.map(String) } },
      ],
    },
  });
  await prisma.checkIn.deleteMany({ where: { ticket: { bookingId: { in: bookingIds } } } });
  await prisma.ticket.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
  await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
  await prisma.member.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
}
