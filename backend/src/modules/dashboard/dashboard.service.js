import { prisma } from '../../config/prisma.js';
import { transactionsService } from '../transactions/transactions.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;
const MONTHS_SHOWN = 6;
const LIST_SIZE = 8;

export const dashboardService = {
  async summary() {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * DAY_MS);
    const [
      totalMembers, activeMembers, expiringSoon, ticketsSold, finance, upcoming, recent, expiringMembers, lowStock, taskGroups,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { membershipStatus: 'ACTIVE', expiresAt: { gt: now } } }),
      prisma.member.count({ where: { membershipStatus: 'ACTIVE', expiresAt: { gt: now, lte: soon } } }),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      transactionsService.summary(),
      prisma.event.findMany({ where: { status: 'PUBLISHED', startAt: { gt: now } }, orderBy: { startAt: 'asc' }, take: 5 }),
      prisma.booking.findMany({
        where: { status: 'CONFIRMED' },
        orderBy: { createdAt: 'desc' },
        take: LIST_SIZE,
        select: { id: true, createdAt: true, user: { select: { id: true, name: true } }, event: { select: { id: true, title: true } } },
      }),
      prisma.member.findMany({
        where: { membershipStatus: 'ACTIVE', expiresAt: { gt: now, lte: soon } },
        orderBy: { expiresAt: 'asc' },
        take: LIST_SIZE,
        select: { id: true, expiresAt: true, user: { select: { id: true, name: true } } },
      }),
      prisma.productVariant.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD }, product: { isActive: true } },
        orderBy: [{ stock: 'asc' }, { id: 'asc' }],
        take: LIST_SIZE,
        select: { id: true, size: true, stock: true, product: { select: { id: true, name: true } } },
      }),
      prisma.task.groupBy({ by: ['status'], where: { status: { not: 'COMPLETED' } }, _count: { _all: true } }),
    ]);

    const bookedByEvent = await prisma.booking.groupBy({
      by: ['eventId'],
      where: { eventId: { in: upcoming.map((event) => event.id) }, status: 'CONFIRMED' },
      _count: { _all: true },
    });
    const booked = new Map(bookedByEvent.map((row) => [row.eventId, row._count._all]));
    const openTasks = { PENDING: 0, IN_PROGRESS: 0 };
    for (const group of taskGroups) openTasks[group.status] = group._count._all;

    return {
      members: { total: totalMembers, active: activeMembers, expiringSoon },
      ticketsSold,
      finance: { income: finance.income, expense: finance.expense, balance: finance.net },
      monthly: finance.byMonth.slice(-MONTHS_SHOWN),
      upcomingEvents: upcoming.map((event) => {
        const bookedCount = booked.get(event.id) ?? 0;
        return { id: event.id, title: event.title, startAt: event.startAt, capacity: event.capacity, bookedCount, seatsRemaining: Math.max(0, event.capacity - bookedCount) };
      }),
      recentRegistrations: recent,
      expiringMembers,
      lowStock,
      openTasks,
    };
  },
};
