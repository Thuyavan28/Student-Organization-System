import { prisma } from '../../config/prisma.js';
import { conflict, forbidden, notFound } from '../../utils/apiError.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { membershipsService } from '../memberships/memberships.service.js';
import { ticketsService } from '../tickets/tickets.service.js';


const bookingInclude = {
  event: { select: { id: true, title: true, venue: true, startAt: true, endAt: true, status: true } },
  ticket: { select: { id: true, token: true, status: true } },
};

// Active members pay the member price; everyone else pays the full price. The saving is stored with the booking.
export function priceFor(event, isMember) {
  if (isMember) {
    return { price: event.memberPrice, discount: Math.max(0, event.nonMemberPrice - event.memberPrice), isMemberPrice: true };
  }
  return { price: event.nonMemberPrice, discount: 0, isMemberPrice: false };
}

function assertBookable(event, now) {
  if (!event) throw notFound('Event not found');
  if (event.status !== 'PUBLISHED') throw conflict('EVENT_NOT_OPEN', 'This event is not open for booking');
  if (now < event.bookingOpensAt || now > event.bookingClosesAt || now > event.endAt) {
    throw conflict('BOOKING_WINDOW_CLOSED', 'Booking is not open right now');
  }
}

// Contenders for the same event row queue behind its lock, and each holds a pooled connection while waiting.
// A long maxWait lets a burst of simultaneous bookings (a ticket release) wait its turn instead of failing.
const BOOKING_TX_OPTIONS = { maxWait: 120000, timeout: 120000 };

async function createBooking(eventId, userId) {
  const now = new Date();
  // Read before the lock so the time spent holding it covers only what must be serialised.
  const member = await prisma.member.findUnique({ where: { userId } });
  const isMember = membershipsService.isActiveMember(member, now);

  return prisma.$transaction(async (tx) => {
    // Prisma cannot express SELECT ... FOR UPDATE. Locking the event row makes concurrent bookings for
    // this event queue up, so the seat count below cannot go stale and the last seat cannot be sold twice.
    const [event] = await tx.$queryRaw`
      SELECT id, status::text AS status, capacity,
             end_at AS "endAt", booking_opens_at AS "bookingOpensAt", booking_closes_at AS "bookingClosesAt",
             member_price AS "memberPrice", non_member_price AS "nonMemberPrice"
      FROM events WHERE id = ${eventId} FOR UPDATE`;
    assertBookable(event, now);

    // Sold-out requests are the common case in a rush, so they are rejected with the fewest queries.
    const booked = await tx.booking.count({ where: { eventId, status: 'CONFIRMED' } });
    if (booked >= event.capacity) throw conflict('SOLD_OUT', 'This event is sold out');

    // The event row lock also serialises this check, and a partial unique index in the database
    // (one CONFIRMED booking per user per event) backs it up. A cancelled booking does not block rebooking.
    const existing = await tx.booking.findFirst({ where: { eventId, userId, status: 'CONFIRMED' } });
    if (existing) throw conflict('ALREADY_BOOKED', 'You already have a ticket for this event');

    const { price, discount, isMemberPrice } = priceFor(event, isMember);

    const booking = await tx.booking.create({
      data: {
        eventId, userId, priceAtBooking: price, discountApplied: discount, isMemberPrice,
        status: 'CONFIRMED', paymentStatus: 'PAID', paymentMode: 'SIMULATED',
      },
    });
    const ticket = await ticketsService.issue(tx, booking.id);
    if (price > 0) {
      await tx.transaction.create({
        data: {
          type: 'INCOME', category: 'TICKETS', amount: price, description: `Ticket sale #${booking.id}`,
          eventId, sourceType: 'BOOKING', sourceId: String(booking.id), occurredAt: now, recordedById: userId,
        },
      });
    }
    return { booking, ticket };
  }, BOOKING_TX_OPTIONS);
}

async function cancelBooking(bookingId, actor) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { event: true } });
  if (!booking) throw notFound('Booking not found');
  if (booking.userId !== actor.id && actor.role !== 'ADMIN') throw forbidden('You can only cancel your own booking');
  const now = new Date();
  if (booking.event.startAt <= now) throw conflict('EVENT_STARTED', 'This event has already started');

  return prisma.$transaction(async (tx) => {
    // Only a CONFIRMED booking can move to CANCELLED, once; a repeat call matches no row.
    const { count } = await tx.booking.updateMany({
      where: { id: bookingId, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
    });
    if (count === 0) throw conflict('ALREADY_CANCELLED', 'This booking is already cancelled');

    const voided = await tx.ticket.updateMany({ where: { bookingId, status: 'VALID' }, data: { status: 'CANCELLED' } });
    if (voided.count === 0) throw conflict('TICKET_USED', 'This ticket was already used and cannot be cancelled');

    if (booking.priceAtBooking > 0) {
      // Refunds use a negative source id so they never collide with the original sale row.
      await tx.transaction.create({
        data: {
          type: 'EXPENSE', category: 'TICKETS', amount: booking.priceAtBooking, description: `Ticket refund #${bookingId}`,
          eventId: booking.eventId, sourceType: 'BOOKING', sourceId: `${bookingId}:refund`, occurredAt: now, recordedById: actor.id,
        },
      });
    }
    return tx.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
  });
}

export const bookingsService = {
  create: createBooking,
  cancel: cancelBooking,

  async listMine(userId, query) {
    const page = parsePagination(query, 10);
    const where = { userId };
    const [rows, total] = await Promise.all([
      prisma.booking.findMany({ where, include: bookingInclude, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      prisma.booking.count({ where }),
    ]);
    return paginated(rows, total, page);
  },
};
