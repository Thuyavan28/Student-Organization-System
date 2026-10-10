import { prisma } from '../../config/prisma.js';
import { badRequest, conflict, notFound } from '../../utils/apiError.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { priceFor } from '../bookings/bookings.service.js';
import { membershipsService } from '../memberships/memberships.service.js';
import { scheduleProblems } from './events.schema.js';

const EVENTS_LIST_TTL_SECONDS = 30;

function invalidateEvents() {
  cache.delByPrefix('events:');
  cache.delByPrefix('dashboard:');
  cache.delByPrefix('finance:');
}

const MANAGERS = ['ADMIN', 'TREASURER'];
const PUBLIC_STATUSES = ['PUBLISHED', 'COMPLETED'];

const isManager = (user) => Boolean(user && MANAGERS.includes(user.role));

async function bookedCounts(eventIds) {
  const rows = await prisma.booking.groupBy({
    by: ['eventId'],
    where: { eventId: { in: eventIds }, status: 'CONFIRMED' },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.eventId, row._count._all]));
}

function withSeats(event, counts) {
  const bookedCount = counts.get(event.id) ?? 0;
  return { ...event, bookedCount, seatsRemaining: Math.max(0, event.capacity - bookedCount) };
}

async function requireEvent(id) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw notFound('Event not found');
  return event;
}

async function confirmedCount(tx, eventId) {
  return tx.booking.count({ where: { eventId, status: 'CONFIRMED' } });
}

function assertSchedule(values) {
  const problems = scheduleProblems(values);
  if (Object.keys(problems).length > 0) throw badRequest('VALIDATION_ERROR', 'Please check the highlighted fields', { formErrors: [], fieldErrors: problems });
}

// Per-event numbers for the report. Money comes from the ledger only, never from bookings,
// so the figures always agree with the finance page.
async function report(where = {}) {
  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: 'desc' },
    select: { id: true, title: true, startAt: true, endAt: true, status: true, capacity: true },
  });
  const ids = events.map((event) => event.id);
  const [booked, attended, money] = await Promise.all([
    prisma.booking.groupBy({ by: ['eventId'], where: { eventId: { in: ids }, status: 'CONFIRMED' }, _count: { _all: true } }),
    prisma.booking.groupBy({
      by: ['eventId'],
      where: { eventId: { in: ids }, status: 'CONFIRMED', ticket: { is: { checkIn: { isNot: null } } } },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({ by: ['eventId', 'type'], where: { eventId: { in: ids } }, _sum: { amount: true } }),
  ]);
  const registered = new Map(booked.map((row) => [row.eventId, row._count._all]));
  const checkedIn = new Map(attended.map((row) => [row.eventId, row._count._all]));
  const sumFor = (eventId, type) => money.find((row) => row.eventId === eventId && row.type === type)?._sum.amount ?? 0;
  const now = new Date();

  return events.map((event) => {
    const registrations = registered.get(event.id) ?? 0;
    const checkIns = checkedIn.get(event.id) ?? 0;
    const finished = event.endAt < now;
    const revenue = sumFor(event.id, 'INCOME');
    const expenses = sumFor(event.id, 'EXPENSE');
    return {
      eventId: event.id,
      title: event.title,
      startAt: event.startAt,
      status: event.status,
      capacity: event.capacity,
      registrations,
      checkIns,
      noShows: finished ? registrations - checkIns : null,
      attendanceRate: finished && registrations > 0 ? checkIns / registrations : null,
      revenue,
      expenses,
      net: revenue - expenses,
    };
  });
}

// Cancelling an event cancels every confirmed booking and refunds the paid ones in the ledger.
async function cancelEvent(event, actor) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.event.updateMany({ where: { id: event.id, status: { in: ['DRAFT', 'PUBLISHED'] } }, data: { status: 'CANCELLED' } });
    if (count === 0) throw conflict('INVALID_TRANSITION', 'This event can no longer be cancelled');

    const bookings = await tx.booking.findMany({
      where: { eventId: event.id, status: 'CONFIRMED' },
      select: { id: true, priceAtBooking: true },
    });
    if (bookings.length === 0) return;
    const ids = bookings.map((booking) => booking.id);
    await tx.booking.updateMany({ where: { id: { in: ids } }, data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' } });
    await tx.ticket.updateMany({ where: { bookingId: { in: ids }, status: 'VALID' }, data: { status: 'CANCELLED' } });
    await tx.transaction.createMany({
      data: bookings
        .filter((booking) => booking.priceAtBooking > 0)
        .map((booking) => ({
          type: 'EXPENSE', category: 'TICKETS', amount: booking.priceAtBooking, description: `Ticket refund #${booking.id}: event cancelled`,
          eventId: event.id, sourceType: 'BOOKING', sourceId: `${booking.id}:refund`, occurredAt: now, recordedById: actor.id,
        })),
      skipDuplicates: true,
    });
  });
}

export const eventsService = {
  report,

  async list(query, user) {
    const page = parsePagination(query, 12);
    const now = new Date();
    const where = {};
    const isPublicRequest = !isManager(user) && !query.q && !query.status && !query.upcoming;
    if (isManager(user)) {
      if (query.status) where.status = query.status;
    } else {
      where.status = query.status && PUBLIC_STATUSES.includes(query.status) ? query.status : { in: PUBLIC_STATUSES };
    }
    // "Upcoming" is what a visitor can still book, so it is always published events that have not started.
    if (query.upcoming) {
      where.startAt = { gt: now };
      where.status = 'PUBLISHED';
    }
    if (query.q) where.OR = [{ title: { contains: query.q, mode: 'insensitive' } }, { venue: { contains: query.q, mode: 'insensitive' } }];

    const cacheKey = `events:list:${JSON.stringify({ where, skip: page.skip, take: page.take })}`;
    const load = async () => {
      const [rows, total] = await Promise.all([
        prisma.event.findMany({ where, orderBy: { startAt: query.upcoming ? 'asc' : 'desc' }, skip: page.skip, take: page.take }),
        prisma.event.count({ where }),
      ]);
      const counts = await bookedCounts(rows.map((event) => event.id));
      return paginated(rows.map((event) => withSeats(event, counts)), total, page);
    };
    // Cache public unfiltered lists only — authenticated requests with filters skip the cache.
    return isPublicRequest ? cache.wrap(cacheKey, EVENTS_LIST_TTL_SECONDS, load) : load();
  },

  async get(id, user) {
    const event = await requireEvent(id);
    if (!isManager(user) && !PUBLIC_STATUSES.includes(event.status)) throw notFound('Event not found');
    const counts = await bookedCounts([id]);
    const result = withSeats(event, counts);
    if (!user) return result;

    const [member, booking] = await Promise.all([
      prisma.member.findUnique({ where: { userId: user.id } }),
      prisma.booking.findFirst({
        where: { eventId: id, userId: user.id },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, status: true, priceAtBooking: true, ticket: { select: { token: true, status: true } } },
      }),
    ]);
    const { price, isMemberPrice } = priceFor(event, membershipsService.isActiveMember(member));
    return { ...result, yourPrice: price, isMemberPrice, yourBooking: booking };
  },

  async create(body, user) {
    const event = await prisma.event.create({ data: { ...body, status: 'DRAFT', createdById: user.id } });
    invalidateEvents();
    return event;
  },

  async update(id, body) {
    const event = await requireEvent(id);
    if (event.status === 'COMPLETED' || event.status === 'CANCELLED') {
      throw conflict('EVENT_LOCKED', 'A completed or cancelled event can no longer be edited');
    }
    assertSchedule({ ...event, ...body });
    if (body.capacity !== undefined) {
      const booked = await confirmedCount(prisma, id);
      if (body.capacity < booked) {
        throw conflict('CAPACITY_BELOW_BOOKED', `${booked} seats are already booked, so capacity cannot be lower than that`);
      }
    }
    const updated = await prisma.event.update({ where: { id }, data: body });
    invalidateEvents();
    return updated;
  },

  async publish(id) {
    const { count } = await prisma.event.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'PUBLISHED' } });
    if (count === 0) {
      await requireEvent(id);
      throw conflict('INVALID_TRANSITION', 'Only a draft event can be published');
    }
    return prisma.event.findUnique({ where: { id } });
  },

  async setStatus(id, status, actor) {
    const event = await requireEvent(id);
    if (status === 'CANCELLED') {
      await cancelEvent(event, actor);
    } else {
      const { count } = await prisma.event.updateMany({ where: { id, status: 'PUBLISHED' }, data: { status: 'COMPLETED' } });
      if (count === 0) throw conflict('INVALID_TRANSITION', 'Only a published event can be marked completed');
    }
    return prisma.event.findUnique({ where: { id } });
  },

  async stats(id) {
    // All sub-queries run in parallel — no sequential awaits.
    const [event, rows] = await Promise.all([requireEvent(id), report({ id })]);
    const row = rows[0] ?? {};
    return { ...row, capacity: event.capacity, seatsRemaining: Math.max(0, event.capacity - (row.registrations ?? 0)) };
  },

  async listBookings(id, query) {
    await requireEvent(id);
    const page = parsePagination(query, 15);
    const where = { eventId: id };
    if (query.status) where.status = query.status;
    if (query.checkedIn !== undefined) where.ticket = { is: { checkIn: query.checkedIn ? { isNot: null } : { is: null } } };
    if (query.q) {
      where.user = {
        OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }],
      };
    }
    const [rows, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          ticket: { select: { id: true, token: true, status: true, checkIn: { select: { checkedInAt: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.booking.count({ where }),
    ]);
    const data = rows.map(({ ticket, ...booking }) => ({
      ...booking,
      ticketToken: ticket?.token ?? null,
      ticketStatus: ticket?.status ?? null,
      checkedInAt: ticket?.checkIn?.checkedInAt ?? null,
    }));
    return paginated(data, total, page);
  },
};
