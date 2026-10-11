import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import * as cache from '../../utils/memoryCache.js';
import { whereAll } from '../../utils/sql.js';
import { notFound } from '../../utils/apiError.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { membershipsService } from '../memberships/memberships.service.js';

const ticketInclude = {
  checkIn: true,
  booking: { include: { user: { include: { member: { include: { tier: true } } } } } },
};

// What the volunteer needs at the door: who this is and whether they are an active member right now.
function describe(ticket) {
  const { user } = ticket.booking;
  const member = user.member;
  return {
    ticketId: ticket.id,
    attendee: { name: user.name, email: user.email },
    membership: {
      isActive: membershipsService.isActiveMember(member),
      tier: member?.tier?.name ?? null,
      expiresAt: member?.expiresAt ?? null,
    },
  };
}

async function counter(eventId) {
  const [checkedIn, booked] = await Promise.all([
    prisma.checkIn.count({ where: { ticket: { booking: { eventId } } } }),
    prisma.booking.count({ where: { eventId, status: 'CONFIRMED' } }),
  ]);
  return { checkedIn, booked };
}

async function recordCheckIn(ticket, staffId, membershipActive) {
  return prisma.$transaction(async (tx) => {
    // The guarded update lets exactly one concurrent scan flip VALID to USED.
    const { count } = await tx.ticket.updateMany({ where: { id: ticket.id, status: 'VALID' }, data: { status: 'USED' } });
    if (count === 0) return null;
    return tx.checkIn.create({
      data: { ticketId: ticket.id, checkedInById: staffId, checkedInAt: new Date(), membershipVerifiedActive: membershipActive },
    });
  });
}

export const checkinsService = {
  // Always resolves to a result code (never throws for scan outcomes) so the scanner has one code path.
  async verify({ eventId, token }, staff) {
    const ticket = await prisma.ticket.findUnique({ where: { token }, include: ticketInclude });
    if (!ticket) return { result: 'INVALID' };

    const details = describe(ticket);
    if (ticket.booking.eventId !== eventId) return { result: 'WRONG_EVENT', ...details };

    const withCounter = async (outcome) => ({ ...outcome, counter: await counter(eventId) });
    if (ticket.status === 'CANCELLED' || ticket.booking.status !== 'CONFIRMED') {
      return withCounter({ result: 'CANCELLED', ...details });
    }
    if (ticket.status === 'USED') {
      return withCounter({ result: 'ALREADY_USED', ...details, checkedInAt: ticket.checkIn?.checkedInAt ?? null });
    }

    try {
      const checkIn = await recordCheckIn(ticket, staff.id, details.membership.isActive);
      if (checkIn) cache.delByPrefix('finance:'); // attendance feeds the cached per-event report
      if (checkIn) return withCounter({ result: 'VALID', ...details, checkedInAt: checkIn.checkedInAt });
    } catch (error) {
      // The unique index on check_ins.ticket_id is the last line of defence. It aborts the failed
      // transaction, so the original check-in is read afterwards, outside it.
      if (error.code !== 'P2002') throw error;
    }
    const original = await prisma.checkIn.findUnique({ where: { ticketId: ticket.id } });
    return withCounter({ result: 'ALREADY_USED', ...details, checkedInAt: original?.checkedInAt ?? null });
  },

  async listForEvent(eventId, query) {
    const page = parsePagination(query, 20);
    // The existence check and the page share one round trip; the page is one statement with its total.
    const [exists, rows] = await Promise.all([
      prisma.$queryRaw`SELECT 1 AS found FROM events WHERE id = ${eventId}`,
      prisma.$queryRaw`
        SELECT ci.id, ci.ticket_id AS "ticketId", ci.checked_in_by_id AS "checkedInById", ci.checked_in_at AS "checkedInAt",
               ci.membership_verified_active AS "membershipVerifiedActive", ci.created_at AS "createdAt", ci.updated_at AS "updatedAt",
               cu.name AS "checkerName",
               t.booking_id AS "bookingId", t.token, t.status::text AS "ticketStatus",
               b.event_id AS "eventId", b.user_id AS "userId", b.status::text AS "bookingStatus", b.price_at_booking AS "priceAtBooking",
               u.name AS "userName", u.email AS "userEmail",
               COUNT(*) OVER()::int AS "totalRows"
        FROM check_ins ci
        JOIN users cu ON cu.id = ci.checked_in_by_id
        JOIN tickets t ON t.id = ci.ticket_id
        JOIN bookings b ON b.id = t.booking_id
        JOIN users u ON u.id = b.user_id
        WHERE b.event_id = ${eventId}
        ORDER BY ci.checked_in_at DESC, ci.id DESC
        LIMIT ${page.take} OFFSET ${page.skip}`,
    ]);
    if (exists.length === 0) throw notFound('Event not found');
    let total = rows[0]?.totalRows ?? 0;
    if (rows.length === 0 && page.skip > 0) {
      const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM check_ins ci JOIN tickets t ON t.id = ci.ticket_id JOIN bookings b ON b.id = t.booking_id WHERE b.event_id = ${eventId}`;
      total = count;
    }
    const data = rows.map((r) => ({
      id: r.id, ticketId: r.ticketId, checkedInById: r.checkedInById, checkedInAt: r.checkedInAt,
      membershipVerifiedActive: r.membershipVerifiedActive, createdAt: r.createdAt, updatedAt: r.updatedAt,
      checkedInBy: { id: r.checkedInById, name: r.checkerName },
      ticket: {
        id: r.ticketId, bookingId: r.bookingId, token: r.token, status: r.ticketStatus,
        booking: {
          id: r.bookingId, eventId: r.eventId, userId: r.userId, status: r.bookingStatus, priceAtBooking: r.priceAtBooking,
          user: { id: r.userId, name: r.userName, email: r.userEmail },
        },
      },
    }));
    return paginated(data, total, page);
  },
};
