import { prisma } from '../../config/prisma.js';
import * as cache from '../../utils/memoryCache.js';
import { transactionsService } from '../transactions/transactions.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;
const MONTHS_SHOWN = 6;
const LIST_SIZE = 8;
const SUMMARY_TTL_SECONDS = 30;
const CHARTS_TTL_SECONDS = 60;
const STALE_SECONDS = 60; // an expired dashboard is shown instantly while one request rebuilds it

// Stat cards and small lists — fetched first so the page renders meaningful content quickly.
async function computeSummary() {
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * DAY_MS);

  // Every stat card, small list and the ledger totals in ONE statement: a single database round trip (and a single
  // connection) instead of ~15 queries in several waves. Fewer trips also means fewer chances to hit a network spike.
  const [row] = await (
    prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*)::int FROM members) AS "totalMembers",
        (SELECT COUNT(*)::int FROM members WHERE membership_status = 'ACTIVE' AND expires_at > ${now}) AS "activeMembers",
        (SELECT COUNT(*)::int FROM members WHERE membership_status = 'ACTIVE' AND expires_at > ${now} AND expires_at <= ${soon}) AS "expiringSoon",
        (SELECT COUNT(*)::int FROM bookings WHERE status = 'CONFIRMED') AS "ticketsSold",
        (SELECT COUNT(*)::int FROM tasks WHERE status = 'PENDING') AS "tasksPending",
        (SELECT COUNT(*)::int FROM tasks WHERE status = 'IN_PROGRESS') AS "tasksInProgress",
        (SELECT COALESCE(SUM(amount), 0)::float8 FROM transactions WHERE type = 'INCOME') AS "income",
        (SELECT COALESCE(SUM(amount), 0)::float8 FROM transactions WHERE type = 'EXPENSE') AS "expense",
        (SELECT COALESCE(json_agg(json_build_object('id', u.id, 'title', u.title, 'startAt', u.start_at, 'capacity', u.capacity, 'bookedCount', u.booked) ORDER BY u.start_at), '[]'::json)
           FROM (SELECT e.id, e.title, e.start_at, e.capacity,
                        (SELECT COUNT(*)::int FROM bookings b WHERE b.event_id = e.id AND b.status = 'CONFIRMED') AS booked
                   FROM events e WHERE e.status = 'PUBLISHED' AND e.start_at > ${now} ORDER BY e.start_at ASC LIMIT 5) u) AS "upcoming",
        (SELECT COALESCE(json_agg(json_build_object('id', r.id, 'createdAt', r.created_at, 'user', json_build_object('id', r.user_id, 'name', r.user_name),
                                                    'event', json_build_object('id', r.event_id, 'title', r.event_title)) ORDER BY r.created_at DESC), '[]'::json)
           FROM (SELECT b.id, b.created_at, b.user_id, usr.name AS user_name, b.event_id, ev.title AS event_title
                   FROM bookings b JOIN users usr ON usr.id = b.user_id JOIN events ev ON ev.id = b.event_id
                  WHERE b.status = 'CONFIRMED' ORDER BY b.created_at DESC LIMIT ${LIST_SIZE}) r) AS "recent",
        (SELECT COALESCE(json_agg(json_build_object('id', x.id, 'expiresAt', x.expires_at, 'user', json_build_object('id', x.user_id, 'name', x.name)) ORDER BY x.expires_at ASC), '[]'::json)
           FROM (SELECT m.id, m.expires_at, m.user_id, usr.name
                   FROM members m JOIN users usr ON usr.id = m.user_id
                  WHERE m.membership_status = 'ACTIVE' AND m.expires_at > ${now} AND m.expires_at <= ${soon}
                  ORDER BY m.expires_at ASC LIMIT ${LIST_SIZE}) x) AS "expiring",
        (SELECT COALESCE(json_agg(json_build_object('id', l.id, 'size', l.size, 'stock', l.stock, 'product', json_build_object('id', l.product_id, 'name', l.product_name)) ORDER BY l.stock ASC, l.id ASC), '[]'::json)
           FROM (SELECT v.id, v.size::text AS size, v.stock, v.product_id, p.name AS product_name
                   FROM product_variants v JOIN products p ON p.id = v.product_id
                  WHERE v.stock <= ${LOW_STOCK_THRESHOLD} AND p.is_active = TRUE
                  ORDER BY v.stock ASC, v.id ASC LIMIT ${LIST_SIZE}) l) AS "lowStock"`
  );

  return {
    members: { total: row.totalMembers, active: row.activeMembers, expiringSoon: row.expiringSoon },
    ticketsSold: row.ticketsSold,
    finance: { income: row.income, expense: row.expense, balance: row.income - row.expense },
    upcomingEvents: row.upcoming.map((event) => ({ ...event, seatsRemaining: Math.max(0, event.capacity - event.bookedCount) })),
    recentRegistrations: row.recent,
    expiringMembers: row.expiring,
    lowStock: row.lowStock,
    openTasks: { PENDING: row.tasksPending, IN_PROGRESS: row.tasksInProgress },
  };
}

// Heavy chart data — fetched after stat cards so the UI is never blocked.
async function computeCharts() {
  const finance = await transactionsService.summary();
  return {
    monthly: finance.byMonth.slice(-MONTHS_SHOWN),
    byCategory: finance.byCategory,
    byEvent: finance.byEvent,
  };
}

export const dashboardService = {
  summary() {
    return cache.wrap('dashboard:summary', SUMMARY_TTL_SECONDS, computeSummary, { staleSeconds: STALE_SECONDS });
  },
  charts() {
    return cache.wrap('dashboard:charts', CHARTS_TTL_SECONDS, computeCharts, { staleSeconds: STALE_SECONDS });
  },
};
