import { prisma } from '../../config/prisma.js';
import { conflict, notFound } from '../../utils/apiError.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { transactionsService } from '../transactions/transactions.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// A fundraiser counts as on track while goal and task progress are within this many points of time elapsed.
const ON_TRACK_TOLERANCE = 10;

const clamp = (value) => Math.max(0, Math.min(100, value));
const startOfToday = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

async function requireOne(id) {
  const fundraiser = await prisma.fundraiser.findUnique({ where: { id }, include: { createdBy: { select: { id: true, name: true } } } });
  if (!fundraiser) throw notFound('Fundraiser not found');
  return fundraiser;
}

export function computeProgress({ fundraiser, raised, counts, overdue, now = new Date() }) {
  const total = counts.PENDING + counts.IN_PROGRESS + counts.COMPLETED;
  const start = fundraiser.startDate.getTime();
  const end = fundraiser.endDate.getTime() + DAY_MS;
  const goalPct = clamp((raised / fundraiser.goalAmount) * 100);
  const timePct = clamp(((now.getTime() - start) / (end - start)) * 100);
  const taskPct = total === 0 ? 0 : clamp((counts.COMPLETED / total) * 100);
  const floor = timePct - ON_TRACK_TOLERANCE;
  const onTrack = now.getTime() < start || (goalPct >= floor && (total === 0 || taskPct >= floor));
  return { raised, goal: fundraiser.goalAmount, goalPct, timePct, taskPct, tasks: counts, overdue, onTrack };
}

export const fundraisersService = {
  async list(query) {
    const page = parsePagination(query, 20);
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      prisma.fundraiser.findMany({
        where,
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      prisma.fundraiser.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  get: requireOne,

  create(body, user) {
    return prisma.fundraiser.create({ data: { ...body, createdById: user.id } });
  },

  async update(id, body) {
    const existing = await requireOne(id);
    const startDate = body.startDate ?? existing.startDate;
    const endDate = body.endDate ?? existing.endDate;
    if (endDate < startDate) throw conflict('INVALID_DATES', 'End date must not be before the start date');
    return prisma.fundraiser.update({ where: { id }, data: body });
  },

  // A fundraiser with ledger rows or expense claims is part of the financial record and is kept.
  async remove(id) {
    await requireOne(id);
    const [ledgerRows, claims] = await Promise.all([
      prisma.transaction.count({ where: { fundraiserId: id } }),
      prisma.expense.count({ where: { fundraiserId: id } }),
    ]);
    if (ledgerRows > 0 || claims > 0) {
      throw conflict('HAS_FINANCIAL_RECORDS', 'This fundraiser has money recorded against it. Mark it cancelled instead of deleting it.');
    }
    await prisma.fundraiser.delete({ where: { id } });
    return { id };
  },

  // Raised comes from ledger income only, so it always agrees with the finance page.
  async summary(id) {
    const fundraiser = await requireOne(id);
    const [income, grouped, overdue] = await Promise.all([
      prisma.transaction.aggregate({ where: { fundraiserId: id, type: 'INCOME' }, _sum: { amount: true } }),
      prisma.task.groupBy({ by: ['status'], where: { fundraiserId: id }, _count: { _all: true } }),
      prisma.task.count({ where: { fundraiserId: id, status: { not: 'COMPLETED' }, dueDate: { lt: startOfToday() } } }),
    ]);
    const counts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    for (const row of grouped) counts[row.status] = row._count._all;
    return computeProgress({ fundraiser, raised: income._sum.amount ?? 0, counts, overdue });
  },

  async addIncome(id, { amount, description, occurredAt }, user) {
    await requireOne(id);
    return transactionsService.recordManual(prisma, {
      type: 'INCOME', category: 'FUNDRAISER', amount, description, fundraiserId: id, occurredAt, recordedById: user.id,
    });
  },
};
