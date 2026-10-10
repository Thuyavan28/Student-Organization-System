import { prisma } from '../../config/prisma.js';
import * as cache from '../../utils/memoryCache.js';
import { transactionsService } from '../transactions/transactions.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;
const MONTHS_SHOWN = 6;
const LIST_SIZE = 8;
const SUMMARY_TTL_SECONDS = 30;
const CHARTS_TTL_SECONDS = 60;

// Stat cards and small lists — fetched first so the page renders meaningful content quickly.
async function computeSummary() {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * DAY_MS);

  const [
    totalMembers, activeMembers, expiringSoon, ticketsSold,
    upcoming, recent, expiringMembers, lowStock, taskGroups,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { membershipStatus: 'ACTIVE', expiresAt: { gt: now } } }),
    prisma.member.count({ where: { membershipStatus: 'ACTIVE', expiresAt: { gt: now, lte: soon } } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.event.findMany({
      where: { status: 'PUBLISHED', startAt: { gt: now } },
      orderBy: { startAt: 'asc' },
      take: 5,
      select: { id: true, title: true, startAt: true, capacity: true },
    }),
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
    // One groupBy call replaces two separate counts and avoids loading rows.
    prisma.task.groupBy({ by: ['status'], where: { status: { not: 'COMPLETED' } }, _count: { _all: true } }),
  ]);

  // One grouped query for upcoming event seat counts, instead of N queries per event.
  const bookedByEvent = upcoming.length
    ? await prisma.booking.groupBy({
        by: ['eventId'],
        where: { eventId: { in: upcoming.map((e) => e.id) }, status: 'CONFIRMED' },
        _count: { _all: true },
      })
    : [];
  const booked = new Map(bookedByEvent.map((row) => [row.eventId, row._count._all]));

  // Ledger totals come from the cached finance summary — no second aggregate pass needed.
  const finance = await transactionsService.summary();

  const openTasks = { PENDING: 0, IN_PROGRESS: 0 };
  for (const group of taskGroups) openTasks[group.status] = group._count._all;

  return {
    members: { total: totalMembers, active: activeMembers, expiringSoon },
    ticketsSold,
    finance: { income: finance.income, expense: finance.expense, balance: finance.net },
    upcomingEvents: upcoming.map((event) => {
      const bookedCount = booked.get(event.id) ?? 0;
      return { id: event.id, title: event.title, startAt: event.startAt, capacity: event.capacity, bookedCount, seatsRemaining: Math.max(0, event.capacity - bookedCount) };
    }),
    recentRegistrations: recent,
    expiringMembers,
    lowStock,
    openTasks,
  };
}

// Heavy chart data — fetched after stat cards so the UI is never blocked.
async function computeCharts() {
  const finance = await transactionsService.summary();
  return {
    monthly: finance.byMonth.slice(-MONTHS_SHOWN),
    byCategory: finance.byCategory,
    byEvent: finance.byEvent,
    byFundraiser: finance.byFundraiser,
  };
}

export const dashboardService = {
  summary() {
    return cache.wrap('dashboard:summary', SUMMARY_TTL_SECONDS, computeSummary);
  },
  charts() {
    return cache.wrap('dashboard:charts', CHARTS_TTL_SECONDS, computeCharts);
  },
};
