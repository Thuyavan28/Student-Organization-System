import { prisma } from '../../config/prisma.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { generateTicketToken } from '../../utils/ticketToken.js';

export const ticketsService = {
  // Called inside the booking transaction. The token is random and opaque: it is the only thing the QR code carries.
  issue(tx, bookingId) {
    return tx.ticket.create({ data: { bookingId, token: generateTicketToken(), status: 'VALID' } });
  },

  async listMine(userId, query) {
    const page = parsePagination(query, 10);
    const where = { booking: { userId, status: 'CONFIRMED' } };
    const [rows, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: { booking: { include: { event: { select: { id: true, title: true, startAt: true, venue: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.ticket.count({ where }),
    ]);
    return paginated(rows, total, page);
  },
};
