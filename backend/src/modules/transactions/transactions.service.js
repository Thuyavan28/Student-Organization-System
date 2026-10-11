import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { badRequest } from '../../utils/apiError.js';
import { toCsv } from '../../utils/csv.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { likePattern, orderBy, whereAll } from '../../utils/sql.js';
import { eventsService } from '../events/events.service.js';

// Prisma.sql is used ONLY for monthlyTotals below. date_trunc('month') has no ORM equivalent in
// Prisma 5.x, so that one query must remain raw. Everything else uses the ORM.

const SUMMARY_TTL_SECONDS = 30;
const SUMMARY_STALE_SECONDS = 60; // after expiry the old numbers are served instantly while one request recomputes them
const EXPORT_BATCH_SIZE = 500;

const ledgerSelect = {
  id: true, type: true, category: true, amount: true, description: true, sourceType: true, occurredAt: true,
  eventId: true,
  event: { select: { id: true, title: true } },
  recordedBy: { select: { id: true, name: true } },
};

const CSV_COLUMNS = [
  { header: 'Date', value: (row) => row.occurredAt },
  { header: 'Type', value: (row) => row.type },
  { header: 'Category', value: (row) => row.category },
  { header: 'Amount (Rs)', value: (row) => (row.amount / 100).toFixed(2) },
  { header: 'Description', value: (row) => row.description },
  { header: 'Event', value: (row) => row.event?.title },
  { header: 'Source', value: (row) => row.sourceType },
  { header: 'Recorded by', value: (row) => row.recordedBy?.name },
];

function buildWhere({ type, category, eventId, from, to, q }) {
  const where = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (eventId) where.eventId = eventId;
  if (from || to) where.occurredAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
  if (q) where.description = { contains: q, mode: 'insensitive' };
  return where;
}


// Every month between the first and last month appears, so charts have no gaps.
function fillMonths(rows) {
  if (rows.length === 0) return [];
  const byKey = new Map(rows.map((row) => [row.month, row]));
  const [firstYear, firstMonth] = rows[0].month.split('-').map(Number);
  const [lastYear, lastMonth] = rows[rows.length - 1].month.split('-').map(Number);
  const result = [];
  for (let year = firstYear, month = firstMonth; year < lastYear || (year === lastYear && month <= lastMonth); ) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    result.push(byKey.get(key) ?? { month: key, income: 0, expense: 0 });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

// Builds a safe Prisma.sql fragment for an optional date range on occurred_at.
function rangeSql(from, to) {
  if (from && to) return Prisma.sql`occurred_at >= ${from} AND occurred_at <= ${to}`;
  if (from) return Prisma.sql`occurred_at >= ${from}`;
  if (to) return Prisma.sql`occurred_at <= ${to}`;
  return Prisma.sql`TRUE`;
}

// Prisma cannot group by a truncated date, so the monthly buckets are computed by one grouped SQL query.
// The database returns at most one row per month instead of every ledger row being loaded.
async function monthlyTotals(from, to) {
  const rows = await prisma.$queryRaw`
    SELECT to_char(date_trunc('month', occurred_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
           COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::float8 AS income,
           COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::float8 AS expense
    FROM transactions
    WHERE ${rangeSql(from, to)}
    GROUP BY 1
    ORDER BY 1`;
  return fillMonths(rows.map((row) => ({ month: row.month, income: Number(row.income), expense: Number(row.expense) })));
}


// Prisma groupBy cannot join a related table directly, so titles are fetched in a second parallel
// query and merged in memory. Two indexed ORM queries are faster than one dynamic raw SQL JOIN
// because the query planner can use prepared statements and the ORM avoids a full SQL parse.
async function totalsBy(model, groupField, labelField, where) {
  const rows = await prisma.transaction.groupBy({
    by: [groupField, 'type'],
    where: { ...where, [groupField]: { not: null } },
    _sum: { amount: true },
  });
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((r) => r[groupField]))];
  const labels = await prisma[model].findMany({
    where: { id: { in: ids } },
    select: { id: true, [labelField]: true },
  });
  const titleMap = new Map(labels.map((l) => [l.id, l[labelField]]));
  const byId = new Map();
  for (const row of rows) {
    const id = row[groupField];
    const entry = byId.get(id) ?? { id, title: titleMap.get(id) ?? String(id), income: 0, expense: 0 };
    if (row.type === 'INCOME') entry.income += row._sum.amount ?? 0;
    else entry.expense += row._sum.amount ?? 0;
    byId.set(id, entry);
  }
  return [...byId.values()].map((e) => ({ ...e, net: e.income - e.expense })).sort((a, b) => a.title.localeCompare(b.title));
}

async function categoryTotals(from, to) {
  const rows = await prisma.transaction.groupBy({ by: ['type', 'category'], where: buildWhere({ from, to }), _sum: { amount: true } });
  return rows.map((row) => ({ type: row.type, category: row.category, amount: row._sum.amount ?? 0 }));
}

// Manual entries have no natural source row, so each gets a random UUID as its source id.
function recordManual(client, data) {
  return client.transaction.create({
    data: { ...data, sourceType: 'MANUAL', sourceId: randomUUID(), occurredAt: data.occurredAt ?? new Date() },
    select: ledgerSelect,
  });
}

function invalidateLedger() {
  cache.delByPrefix('finance:');
  cache.delByPrefix('dashboard:');
}

export const transactionsService = {
  recordManual,
  categoryTotals,
  monthlyTotals,

  // One SQL statement returns the page of ledger rows (with event and recorder names) and the total.
  async list(query) {
    const page = parsePagination(query);
    const c = [];
    if (query.type) c.push(Prisma.sql`t.type = ${query.type}::txn_type`);
    if (query.category) c.push(Prisma.sql`t.category = ${query.category}::txn_category`);
    if (query.eventId) c.push(Prisma.sql`t.event_id = ${query.eventId}`);
    if (query.from) c.push(Prisma.sql`t.occurred_at >= ${query.from}`);
    if (query.to) c.push(Prisma.sql`t.occurred_at <= ${query.to}`);
    if (query.q) c.push(Prisma.sql`t.description ILIKE ${likePattern(query.q)}`);
    const order = orderBy({ occurredAt: 't.occurred_at', amount: 't.amount' }, query.sort, query.order, 't.id');

    const rows = await prisma.$queryRaw`
      SELECT t.id, t.type::text AS type, t.category::text AS category, t.amount, t.description,
             t.source_type::text AS "sourceType", t.occurred_at AS "occurredAt",
             t.event_id AS "eventId",
             e.title AS "eventTitle",
             u.id AS "recorderId", u.name AS "recorderName",
             COUNT(*) OVER()::int AS total
      FROM transactions t
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN users u ON u.id = t.recorded_by_id
      ${whereAll(c)}
      ${order}
      LIMIT ${page.take} OFFSET ${page.skip}`;
    let total = rows[0]?.total ?? 0;
    if (rows.length === 0 && page.skip > 0) {
      const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM transactions t ${whereAll(c)}`;
      total = count;
    }
    const data = rows.map(({ eventTitle, recorderId, recorderName, total: _total, ...row }) => ({
      ...row,
      event: row.eventId ? { id: row.eventId, title: eventTitle } : null,
      recordedBy: recorderId ? { id: recorderId, name: recorderName } : null,
    }));
    return paginated(data, total, page);
  },

  async create(body, user) {
    const event = body.eventId ? await prisma.event.findUnique({ where: { id: body.eventId }, select: { id: true } }) : true;
    if (!event) throw badRequest('INVALID_EVENT', 'The selected event does not exist');
    const row = await recordManual(prisma, { ...body, recordedById: user.id });
    invalidateLedger();
    return row;
  },

  // All finance numbers are computed by the database from the ledger only, so they can never double count.
  summary({ from, to } = {}) {
    const key = `finance:summary:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    return cache.wrap(key, SUMMARY_TTL_SECONDS, async () => {
      // One statement computes every breakdown from the same slice of the ledger (one database round trip instead of
      // four queries plus two label look-ups), so the numbers also always agree with each other.
      const [row] = await prisma.$queryRaw`
        WITH t AS (SELECT type, category, amount, occurred_at, event_id FROM transactions WHERE ${rangeSql(from, to)})
        SELECT
          (SELECT COALESCE(json_agg(json_build_object('type', c.type::text, 'category', c.category::text, 'amount', c.s)), '[]'::json)
             FROM (SELECT type, category, SUM(amount)::float8 AS s FROM t GROUP BY type, category) c) AS "byCategory",
          (SELECT COALESCE(json_agg(json_build_object('month', m.month, 'income', m.income, 'expense', m.expense) ORDER BY m.month), '[]'::json)
             FROM (SELECT to_char(date_trunc('month', occurred_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                          COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::float8 AS income,
                          COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::float8 AS expense
                     FROM t GROUP BY 1) m) AS "byMonth",
          (SELECT COALESCE(json_agg(json_build_object('eventId', e.id, 'title', e.title, 'income', x.income, 'expense', x.expense, 'net', x.income - x.expense) ORDER BY e.title), '[]'::json)
             FROM (SELECT event_id, COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::float8 AS income,
                          COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::float8 AS expense
                     FROM t WHERE event_id IS NOT NULL GROUP BY event_id) x JOIN events e ON e.id = x.event_id) AS "byEvent"`;
      const byCategory = row.byCategory;
      const income = byCategory.filter((r) => r.type === 'INCOME').reduce((sum, r) => sum + r.amount, 0);
      const expense = byCategory.filter((r) => r.type === 'EXPENSE').reduce((sum, r) => sum + r.amount, 0);
      return {
        income, expense, net: income - expense, byCategory, byMonth: fillMonths(row.byMonth),
        byEvent: row.byEvent,
      };
    }, { staleSeconds: SUMMARY_STALE_SECONDS });
  },

  eventReport() {
    return cache.wrap('finance:events', SUMMARY_TTL_SECONDS, () => eventsService.report());
  },

  // Streams the ledger in batches with a cursor, so memory stays flat however large the ledger grows.
  async *exportCsv(query) {
    const where = buildWhere(query);
    yield `${toCsv([], CSV_COLUMNS)}\r\n`;
    let cursor;
    for (;;) {
      const rows = await prisma.transaction.findMany({
        where,
        select: ledgerSelect,
        orderBy: { id: 'desc' },
        take: EXPORT_BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });
      if (rows.length === 0) return;
      yield `${toCsv(rows, CSV_COLUMNS).split('\r\n').slice(1).join('\r\n')}\r\n`;
      cursor = rows[rows.length - 1].id;
      if (rows.length < EXPORT_BATCH_SIZE) return;
    }
  },
};
