import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { likePattern, whereAll } from '../../utils/sql.js';
import { badRequest, conflict, notFound } from '../../utils/apiError.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { priceFor } from '../bookings/bookings.service.js';
import { membershipsService } from '../memberships/memberships.service.js';
import { scheduleProblems } from './events.schema.js';

const EVENTS_LIST_TTL_SECONDS = 30;
const EVENTS_LIST_STALE_SECONDS = 30;

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

// Event columns plus the confirmed-booking count, so seat numbers come back in the same statement as the event.
const EVENT_COLUMNS = Prisma.sql`
  e.id, e.title, e.description, e.venue, e.start_at AS "startAt", e.end_at AS "endAt",
  e.booking_opens_at AS "bookingOpensAt", e.booking_closes_at AS "bookingClosesAt", e.capacity,
  e.member_price AS "memberPrice", e.non_member_price AS "nonMemberPrice", e.status::text AS status,
  e.banner_url AS "bannerUrl", e.created_at AS "createdAt", e.updated_at AS "updatedAt",
  (SELECT COUNT(*)::int FROM bookings bk WHERE bk.event_id = e.id AND bk.status = 'CONFIRMED') AS "bookedCount"`;

const withSeatsRow = (event) => ({ ...event, seatsRemaining: Math.max(0, event.capacity - event.bookedCount) });

async function eventWithSeats(id) {
  const [row] = await prisma.$queryRaw`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = ${id}`;
  return row ? withSeatsRow(row) : null;
}

export const eventsService = {
  report,

  async list(query, user) {
    const page = parsePagination(query, 12);
    const now = new Date();
    const c = [];
    if (isManager(user)) {
      if (query.status) c.push(Prisma.sql`e.status = ${query.status}::event_status`);
    } else if (query.status && PUBLIC_STATUSES.includes(query.status)) {
      c.push(Prisma.sql`e.status = ${query.status}::event_status`);
    } else {
      c.push(Prisma.sql`e.status IN ('PUBLISHED', 'COMPLETED')`);
    }
    // "Upcoming" is what a visitor can still book, so it is always published events that have not started.
    if (query.upcoming) {
      c.length = 0;
      c.push(Prisma.sql`e.start_at > ${now}`, Prisma.sql`e.status = 'PUBLISHED'`);
    }
    if (query.q) c.push(Prisma.sql`(e.title ILIKE ${likePattern(query.q)} OR e.venue ILIKE ${likePattern(query.q)})`);
    const direction = query.upcoming ? Prisma.raw('ASC') : Prisma.raw('DESC');

    // The key is built from the request, not from the conditions, because they hold the current time and would never repeat.
    // The list contains nothing user specific, so managers and visitors can share cached pages. Bookings and
    // event changes drop the cache (invalidateEvents), and the short TTL covers anything else, such as an event starting.
    const cacheKey = `events:list:${JSON.stringify({ manager: isManager(user), q: query.q, status: query.status, upcoming: Boolean(query.upcoming), skip: page.skip, take: page.take })}`;
    return cache.wrap(cacheKey, EVENTS_LIST_TTL_SECONDS, async () => {
      // One statement: the page of events, each with its seat count, and the overall total.
      const rows = await prisma.$queryRaw`
        SELECT ${EVENT_COLUMNS}, COUNT(*) OVER()::int AS "totalRows"
        FROM events e
        ${whereAll(c)}
        ORDER BY e.start_at ${direction}, e.id ${direction}
        LIMIT ${page.take} OFFSET ${page.skip}`;
      let total = rows[0]?.totalRows ?? 0;
      if (rows.length === 0 && page.skip > 0) {
        const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM events e ${whereAll(c)}`;
        total = count;
      }
      return paginated(rows.map(({ totalRows: _t, ...event }) => withSeatsRow(event)), total, page);
    }, { staleSeconds: EVENTS_LIST_STALE_SECONDS });
  },

  async get(id, user) {
    // The event (with seats), the viewer's membership and the viewer's booking are independent, so they share one round trip.
    const [event, member, booking] = await Promise.all([
      eventWithSeats(id),
      user
        ? prisma.$queryRaw`SELECT membership_status::text AS "membershipStatus", expires_at AS "expiresAt" FROM members WHERE user_id = ${user.id}`.then((r) => r[0] ?? null)
        : null,
      user
        ? prisma.$queryRaw`
            SELECT b.id, b.status::text AS status, b.price_at_booking AS "priceAtBooking",
                   t.token AS "ticketToken", t.status::text AS "ticketStatus"
            FROM bookings b LEFT JOIN tickets t ON t.booking_id = b.id
            WHERE b.event_id = ${id} AND b.user_id = ${user.id}
            ORDER BY b.status ASC, b.created_at DESC
            LIMIT 1`.then((r) => r[0] ?? null)
        : null,
    ]);
    if (!event) throw notFound('Event not found');
    if (!isManager(user) && !PUBLIC_STATUSES.includes(event.status)) throw notFound('Event not found');
    if (!user) return event;

    const { price, isMemberPrice } = priceFor(event, membershipsService.isActiveMember(member));
    const yourBooking = booking
      ? { id: booking.id, status: booking.status, priceAtBooking: booking.priceAtBooking, ticket: booking.ticketToken ? { token: booking.ticketToken, status: booking.ticketStatus } : null }
      : null;
    return { ...event, yourPrice: price, isMemberPrice, yourBooking };
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
    invalidateEvents();
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
    invalidateEvents();
    return prisma.event.findUnique({ where: { id } });
  },

  async stats(id) {
    // All sub-queries run in parallel — no sequential awaits.
    const [event, rows] = await Promise.all([requireEvent(id), report({ id })]);
    const row = rows[0] ?? {};
    return { ...row, capacity: event.capacity, seatsRemaining: Math.max(0, event.capacity - (row.registrations ?? 0)) };
  },

  async listBookings(id, query) {
    const page = parsePagination(query, 15);
    const c = [Prisma.sql`b.event_id = ${id}`];
    if (query.status) c.push(Prisma.sql`b.status = ${query.status}::booking_status`);
    if (query.checkedIn === true) c.push(Prisma.sql`ci.id IS NOT NULL`);
    if (query.checkedIn === false) c.push(Prisma.sql`t.id IS NOT NULL AND ci.id IS NULL`);
    if (query.q) c.push(Prisma.sql`(u.name ILIKE ${likePattern(query.q)} OR u.email ILIKE ${likePattern(query.q)})`);

    // The existence check and the page share one round trip; the page is one statement with its total.
    const [exists, rows] = await Promise.all([
      prisma.$queryRaw`SELECT 1 AS found FROM events WHERE id = ${id}`,
      prisma.$queryRaw`
        SELECT b.id, b.event_id AS "eventId", b.user_id AS "userId", b.price_at_booking AS "priceAtBooking",
               b.discount_applied AS "discountApplied", b.is_member_price AS "isMemberPrice",
               b.status::text AS status, b.payment_status::text AS "paymentStatus", b.payment_mode::text AS "paymentMode",
               b.created_at AS "createdAt", b.updated_at AS "updatedAt",
               u.name AS "userName", u.email AS "userEmail",
               t.token AS "ticketToken", t.status::text AS "ticketStatus", ci.checked_in_at AS "checkedInAt",
               COUNT(*) OVER()::int AS "totalRows"
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        LEFT JOIN tickets t ON t.booking_id = b.id
        LEFT JOIN check_ins ci ON ci.ticket_id = t.id
        ${whereAll(c)}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT ${page.take} OFFSET ${page.skip}`,
    ]);
    if (exists.length === 0) throw notFound('Event not found');
    let total = rows[0]?.totalRows ?? 0;
    if (rows.length === 0 && page.skip > 0) {
      const [{ count }] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS count FROM bookings b JOIN users u ON u.id = b.user_id
        LEFT JOIN tickets t ON t.booking_id = b.id LEFT JOIN check_ins ci ON ci.ticket_id = t.id ${whereAll(c)}`;
      total = count;
    }
    const data = rows.map(({ userName, userEmail, totalRows: _t, ...row }) => ({ ...row, user: { id: row.userId, name: userName, email: userEmail } }));
    return paginated(data, total, page);
  },
};
