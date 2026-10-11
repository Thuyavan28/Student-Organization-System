import { prisma } from '../../config/prisma.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { generateTicketToken } from '../../utils/ticketToken.js';

export const ticketsService = {
  // Called inside the booking transaction. The token is random and opaque: it is the only thing the QR code carries.
  issue(tx, bookingId) {
    return tx.ticket.create({ data: { bookingId, token: generateTicketToken(), status: 'VALID' } });
  },

  // One SQL statement: my confirmed tickets with booking, event and the total count.
  async listMine(userId, query) {
    const page = parsePagination(query, 10);
    const rows = await prisma.$queryRaw`
      SELECT t.id, t.booking_id AS "bookingId", t.token, t.status::text AS status, t.created_at AS "createdAt", t.updated_at AS "updatedAt",
             b.event_id AS "eventId", b.user_id AS "userId", b.price_at_booking AS "priceAtBooking", b.discount_applied AS "discountApplied",
             b.is_member_price AS "isMemberPrice", b.status::text AS "bookingStatus", b.payment_status::text AS "paymentStatus",
             b.payment_mode::text AS "paymentMode", b.created_at AS "bookingCreatedAt", b.updated_at AS "bookingUpdatedAt",
             e.title AS "eventTitle", e.start_at AS "eventStartAt", e.venue AS "eventVenue",
             COUNT(*) OVER()::int AS "totalRows"
      FROM tickets t
      JOIN bookings b ON b.id = t.booking_id
      JOIN events e ON e.id = b.event_id
      WHERE b.user_id = ${userId} AND b.status = 'CONFIRMED'
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${page.take} OFFSET ${page.skip}`;
    let total = rows[0]?.totalRows ?? 0;
    if (rows.length === 0 && page.skip > 0) {
      const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM tickets t JOIN bookings b ON b.id = t.booking_id WHERE b.user_id = ${userId} AND b.status = 'CONFIRMED'`;
      total = count;
    }
    const data = rows.map((r) => ({
      id: r.id, bookingId: r.bookingId, token: r.token, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
      booking: {
        id: r.bookingId, eventId: r.eventId, userId: r.userId, priceAtBooking: r.priceAtBooking, discountApplied: r.discountApplied,
        isMemberPrice: r.isMemberPrice, status: r.bookingStatus, paymentStatus: r.paymentStatus, paymentMode: r.paymentMode,
        createdAt: r.bookingCreatedAt, updatedAt: r.bookingUpdatedAt,
        event: { id: r.eventId, title: r.eventTitle, startAt: r.eventStartAt, venue: r.eventVenue },
      },
    }));
    return paginated(data, total, page);
  },
};
