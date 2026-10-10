import { prisma } from '../../config/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/apiError.js';
import { paginated, parsePagination } from '../../utils/pagination.js';


const expenseInclude = {
  submittedBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
  event: { select: { id: true, title: true } },
  fundraiser: { select: { id: true, title: true } },
};

async function assertLinksExist({ eventId, fundraiserId }) {
  if (eventId && !(await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }))) {
    throw badRequest('INVALID_EVENT', 'The selected event does not exist');
  }
  if (fundraiserId && !(await prisma.fundraiser.findUnique({ where: { id: fundraiserId }, select: { id: true } }))) {
    throw badRequest('INVALID_FUNDRAISER', 'The selected fundraiser does not exist');
  }
}

async function requireExpense(id) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw notFound('Expense claim not found');
  return expense;
}

export const expensesService = {
  async create(body, file, user) {
    await assertLinksExist(body);
    return prisma.expense.create({
      data: { ...body, submittedById: user.id, receiptUrl: file ? `/uploads/${file.filename}` : null, status: 'SUBMITTED' },
      include: expenseInclude,
    });
  },

  async listMine(userId, query) {
    const page = parsePagination(query, 10);
    const where = { submittedById: userId };
    const [rows, total] = await Promise.all([
      prisma.expense.findMany({ where, include: expenseInclude, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      prisma.expense.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  async list(query) {
    const page = parsePagination(query, 12);
    const where = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { description: { contains: query.q, mode: 'insensitive' } },
        { submittedBy: { name: { contains: query.q, mode: 'insensitive' } } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.expense.findMany({ where, include: expenseInclude, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      prisma.expense.count({ where }),
    ]);
    return paginated(rows, total, page);
  },

  async review(id, { decision, note }, reviewer) {
    const expense = await requireExpense(id);
    if (expense.submittedById === reviewer.id) {
      throw forbidden('You cannot review your own expense claim', 'CANNOT_REVIEW_OWN');
    }
    // Only a SUBMITTED claim can be decided, once.
    const { count } = await prisma.expense.updateMany({
      where: { id, status: 'SUBMITTED' },
      data: { status: decision, reviewedById: reviewer.id, reviewNote: note ?? null },
    });
    if (count === 0) throw conflict('ALREADY_REVIEWED', 'This claim has already been reviewed');
    return prisma.expense.findUnique({ where: { id }, include: expenseInclude });
  },

  // Reimbursement is idempotent twice over: the guarded status change lets one request through,
  // and the unique (source_type, source_id) ledger constraint would reject a duplicate row anyway.
  async reimburse(id, actor) {
    await requireExpense(id);
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.expense.updateMany({
        where: { id, status: 'APPROVED' },
        data: { status: 'REIMBURSED', reimbursedAt: now },
      });
      if (count === 0) throw conflict('NOT_REIMBURSABLE', 'Only an approved claim that has not been reimbursed can be reimbursed');

      const expense = await tx.expense.findUnique({ where: { id }, include: expenseInclude });
      await tx.transaction.create({
        data: {
          type: 'EXPENSE', category: 'REIMBURSEMENT', amount: expense.amount,
          description: `Reimbursement: ${expense.description}`,
          eventId: expense.eventId, fundraiserId: expense.fundraiserId,
          sourceType: 'EXPENSE', sourceId: String(expense.id), occurredAt: now, recordedById: actor.id,
        },
      });
      return expense;
    });
  },
};
