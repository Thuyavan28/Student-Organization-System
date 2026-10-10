import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { badRequest } from '../../utils/apiError.js';
import { toCsv } from '../../utils/csv.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { eventsService } from '../events/events.service.js';

// Prisma.sql is used ONLY for monthlyTotals below. date_trunc('month') has no ORM equivalent in
// Prisma 5.x, so that one query must remain raw. Everything else uses the ORM.

const SUMMARY_TTL_SECONDS = 30;
const EXPORT_BATCH_SIZE = 500;

const ledgerSelect = {
  id: true, type: true, category: true, amount: true, description: true, sourceType: true, occurredAt: true,
  eventId: true, fundraiserId: true,
  event: { select: { id: true, title: true } },
  fundraiser: { select: { id: true, title: true } },
  recordedBy: { select: { id: true, name: true } },
};

const CSV_COLUMNS = [
  { header: 'Date', value: (row) => row.occurredAt },
  { header: 'Type', value: (row) => row.type },
  { header: 'Category', value: (row) => row.category },
  { header: 'Amount (Rs)', value: (row) => (row.amount / 100).toFixed(2) },
  { header: 'Description', value: (row) => row.description },
  { header: 'Event', value: (row) => row.event?.title },
  { header: 'Fundraiser', value: (row) => row.fundraiser?.title },
  { header: 'Source', value: (row) => row.sourceType },
  { header: 'Recorded by', value: (row) => row.recordedBy?.name },
];

function buildWhere({ type, category, eventId, fundraiserId, from, to, q }) {
  const where = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (eventId) where.eventId = eventId;
  if (fundraiserId) where.fundraiserId = fundraiserId;
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

  async list(query) {
    const page = parsePagination(query);
    const where = buildWhere(query);
    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: ledgerSelect,
        orderBy: [{ [query.sort]: query.order }, { id: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      prisma.transaction.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  async create(body, user) {
    const [event, fundraiser] = await Promise.all([
      body.eventId ? prisma.event.findUnique({ where: { id: body.eventId }, select: { id: true } }) : true,
      body.fundraiserId ? prisma.fundraiser.findUnique({ where: { id: body.fundraiserId }, select: { id: true } }) : true,
    ]);
    if (!event) throw badRequest('INVALID_EVENT', 'The selected event does not exist');
    if (!fundraiser) throw badRequest('INVALID_FUNDRAISER', 'The selected fundraiser does not exist');
    const row = await recordManual(prisma, { ...body, recordedById: user.id });
    invalidateLedger();
    cache.delByPrefix('fundraisers:');
    return row;
  },

  // All finance numbers are computed by the database from the ledger only, so they can never double count.
  summary({ from, to } = {}) {
    const key = `finance:summary:${from?.toISOString() ?? ''}:${to?.toISOString() ?? ''}`;
    return cache.wrap(key, SUMMARY_TTL_SECONDS, async () => {
      const [byCategory, byMonth, byEvent, byFundraiser] = await Promise.all([
        categoryTotals(from, to),
        monthlyTotals(from, to),
        totalsBy('event', 'eventId', 'title', buildWhere({ from, to })),
        totalsBy('fundraiser', 'fundraiserId', 'title', buildWhere({ from, to })),
      ]);
      const income = byCategory.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0);
      const expense = byCategory.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0);
      return {
        income, expense, net: income - expense, byCategory, byMonth,
        byEvent: byEvent.map(({ id, ...rest }) => ({ eventId: id, ...rest })),
        byFundraiser: byFundraiser.map(({ id, ...rest }) => ({ fundraiserId: id, ...rest })),
      };
    });
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
