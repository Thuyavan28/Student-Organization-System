import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { badRequest } from '../../utils/apiError.js';
import { toCsv } from '../../utils/csv.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { eventsService } from '../events/events.service.js';

const EXPORT_LIMIT = 10000;

const ledgerInclude = {
  event: { select: { id: true, title: true } },
  fundraiser: { select: { id: true, title: true } },
  recordedBy: { select: { id: true, name: true } },
};

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

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

// Every month between the first and last ledger month appears, so charts have no gaps.
function monthlyBuckets(rows) {
  if (rows.length === 0) return [];
  const buckets = new Map();
  let first = rows[0].occurredAt;
  let last = rows[0].occurredAt;
  for (const row of rows) {
    if (row.occurredAt < first) first = row.occurredAt;
    if (row.occurredAt > last) last = row.occurredAt;
    const key = monthKey(row.occurredAt);
    const bucket = buckets.get(key) ?? { month: key, income: 0, expense: 0 };
    bucket[row.type === 'INCOME' ? 'income' : 'expense'] += row.amount;
    buckets.set(key, bucket);
  }
  const result = [];
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const end = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));
  while (cursor <= end) {
    const key = monthKey(cursor);
    result.push(buckets.get(key) ?? { month: key, income: 0, expense: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

async function labelled(groups, key, model) {
  const ids = [...new Set(groups.map((group) => group[key]))];
  const records = await prisma[model].findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
  const titles = new Map(records.map((record) => [record.id, record.title]));
  return ids.map((id) => {
    const income = groups.find((group) => group[key] === id && group.type === 'INCOME')?._sum.amount ?? 0;
    const expense = groups.find((group) => group[key] === id && group.type === 'EXPENSE')?._sum.amount ?? 0;
    return { [key]: id, title: titles.get(id) ?? `#${id}`, income, expense, net: income - expense };
  });
}

// Manual entries have no natural source row, so each gets a random UUID as its source id.
function recordManual(client, data) {
  return client.transaction.create({
    data: { ...data, sourceType: 'MANUAL', sourceId: randomUUID(), occurredAt: data.occurredAt ?? new Date() },
    include: ledgerInclude,
  });
}

export const transactionsService = {
  recordManual,

  async list(query) {
    const page = parsePagination(query, 15);
    const where = buildWhere(query);
    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: ledgerInclude,
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
    return recordManual(prisma, { ...body, recordedById: user.id });
  },

  // All finance numbers are computed from the ledger only, so they can never double count.
  async summary({ from, to } = {}) {
    const where = buildWhere({ from, to });
    const [byTypeCategory, rows, byEvent, byFundraiser] = await Promise.all([
      prisma.transaction.groupBy({ by: ['type', 'category'], where, _sum: { amount: true } }),
      prisma.transaction.findMany({ where, select: { type: true, amount: true, occurredAt: true } }),
      prisma.transaction.groupBy({ by: ['eventId', 'type'], where: { ...where, eventId: { not: null } }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ['fundraiserId', 'type'], where: { ...where, fundraiserId: { not: null } }, _sum: { amount: true } }),
    ]);
    const byCategory = byTypeCategory.map((row) => ({ type: row.type, category: row.category, amount: row._sum.amount ?? 0 }));
    const income = byCategory.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0);
    const expense = byCategory.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0);
    const [events, fundraisers] = await Promise.all([labelled(byEvent, 'eventId', 'event'), labelled(byFundraiser, 'fundraiserId', 'fundraiser')]);
    return { income, expense, net: income - expense, byCategory, byMonth: monthlyBuckets(rows), byEvent: events, byFundraiser: fundraisers };
  },

  eventReport() {
    return eventsService.report();
  },

  async exportCsv(query) {
    const rows = await prisma.transaction.findMany({
      where: buildWhere(query),
      include: ledgerInclude,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: EXPORT_LIMIT,
    });
    return toCsv(rows, [
      { header: 'Date', value: (row) => row.occurredAt },
      { header: 'Type', value: (row) => row.type },
      { header: 'Category', value: (row) => row.category },
      { header: 'Amount (Rs)', value: (row) => (row.amount / 100).toFixed(2) },
      { header: 'Description', value: (row) => row.description },
      { header: 'Event', value: (row) => row.event?.title },
      { header: 'Fundraiser', value: (row) => row.fundraiser?.title },
      { header: 'Source', value: (row) => row.sourceType },
      { header: 'Recorded by', value: (row) => row.recordedBy?.name },
    ]);
  },
};
