import { prisma } from '../../config/prisma.js';
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
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw notFound('Event not found');
    const page = parsePagination(query, 20);
    const where = { ticket: { booking: { eventId } } };
    const [rows, total] = await Promise.all([
      prisma.checkIn.findMany({
        where,
        include: {
          checkedInBy: { select: { id: true, name: true } },
          ticket: { include: { booking: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        },
        orderBy: { checkedInAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      prisma.checkIn.count({ where }),
    ]);
    return paginated(rows, total, page);
  },
};
