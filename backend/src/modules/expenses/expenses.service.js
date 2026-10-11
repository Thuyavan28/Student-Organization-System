import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/apiError.js';
import * as cache from '../../utils/memoryCache.js';
import { paginated, parsePagination } from '../../utils/pagination.js';
import { likePattern, whereAll } from '../../utils/sql.js';


const expenseInclude = {
  submittedBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
  event: { select: { id: true, title: true } },
};

async function expensePage(conditions, page) {
  const rows = await prisma.$queryRaw`
    SELECT x.id, x.submitted_by_id AS "submittedById", x.event_id AS "eventId",
           x.category::text AS category, x.amount, x.description, x.receipt_url AS "receiptUrl", x.status::text AS status,
           x.reviewed_by_id AS "reviewedById", x.review_note AS "reviewNote", x.reimbursed_at AS "reimbursedAt",
           x.created_at AS "createdAt", x.updated_at AS "updatedAt",
           s.name AS "submitterName", s.email AS "submitterEmail", r.name AS "reviewerName",
           e.title AS "eventTitle",
           COUNT(*) OVER()::int AS "totalRows"
    FROM expenses x
    JOIN users s ON s.id = x.submitted_by_id
    LEFT JOIN users r ON r.id = x.reviewed_by_id
    LEFT JOIN events e ON e.id = x.event_id
    ${whereAll(conditions)}
    ORDER BY x.created_at DESC, x.id DESC
    LIMIT ${page.take} OFFSET ${page.skip}`;
  let total = rows[0]?.totalRows ?? 0;
  if (rows.length === 0 && page.skip > 0) {
    const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM expenses x JOIN users s ON s.id = x.submitted_by_id ${whereAll(conditions)}`;
    total = count;
  }
  const data = rows.map(({ submitterName, submitterEmail, reviewerName, eventTitle, totalRows: _t, ...row }) => ({
    ...row,
    submittedBy: { id: row.submittedById, name: submitterName, email: submitterEmail },
    reviewedBy: row.reviewedById ? { id: row.reviewedById, name: reviewerName } : null,
    event: row.eventId ? { id: row.eventId, title: eventTitle } : null,
  }));
  return paginated(data, total, page);
}

async function assertLinksExist({ eventId }) {
  if (eventId && !(await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }))) {
    throw badRequest('INVALID_EVENT', 'The selected event does not exist');
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

  // Both lists are one SQL statement: claims, submitter, reviewer, event and the total in a single round trip.
  listMine(userId, query) {
    return expensePage([Prisma.sql`x.submitted_by_id = ${userId}`], parsePagination(query, 10));
  },

  list(query) {
    const c = [];
    if (query.status) c.push(Prisma.sql`x.status = ${query.status}::expense_status`);
    if (query.category) c.push(Prisma.sql`x.category = ${query.category}::txn_category`);
    if (query.q) c.push(Prisma.sql`(x.description ILIKE ${likePattern(query.q)} OR s.name ILIKE ${likePattern(query.q)})`);
    return expensePage(c, parsePagination(query, 12));
  },

  async review(id, { decision, note }, reviewer) {
    const expense = await requireExpense(id);
    if (expense.submittedById === reviewer.id) {
      throw forbidden('You cannot review your own expense claim', 'CANNOT_REVIEW_OWN');
    }
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.expense.updateMany({
        where: { id, status: 'SUBMITTED' },
        data: { status: decision, reviewedById: reviewer.id, reviewNote: note ?? null },
      });
      if (count === 0) throw conflict('ALREADY_REVIEWED', 'This claim has already been reviewed');

      // If approved, immediately record the expense in the ledger so the balance is deducted
      if (decision === 'APPROVED') {
        const existingTx = await tx.transaction.findFirst({
          where: { sourceType: 'EXPENSE', sourceId: String(id) },
        });
        if (!existingTx) {
          await tx.transaction.create({
            data: {
              type: 'EXPENSE', category: 'REIMBURSEMENT', amount: expense.amount,
              description: `Approved claim: ${expense.description}`,
              eventId: expense.eventId,
              sourceType: 'EXPENSE', sourceId: String(expense.id), occurredAt: now, recordedById: reviewer.id,
            },
          });
        }
      }
      return tx.expense.findUnique({ where: { id }, include: expenseInclude });
    });
    cache.delByPrefix('finance:');
    cache.delByPrefix('dashboard:');
    return updated;
  },

  // Reimbursement is idempotent: updates status and ensures ledger transaction exists
  async reimburse(id, actor) {
    await requireExpense(id);
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.expense.updateMany({
        where: { id, status: 'APPROVED' },
        data: { status: 'REIMBURSED', reimbursedAt: now },
      });
      if (count === 0) throw conflict('NOT_REIMBURSABLE', 'Only an approved claim that has not been reimbursed can be reimbursed');

      const expense = await tx.expense.findUnique({ where: { id }, include: expenseInclude });
      const existingTx = await tx.transaction.findFirst({
        where: { sourceType: 'EXPENSE', sourceId: String(id) },
      });
      if (!existingTx) {
        await tx.transaction.create({
          data: {
            type: 'EXPENSE', category: 'REIMBURSEMENT', amount: expense.amount,
            description: `Reimbursement: ${expense.description}`,
            eventId: expense.eventId,
            sourceType: 'EXPENSE', sourceId: String(expense.id), occurredAt: now, recordedById: actor.id,
          },
        });
      }
      return expense;
    });
    cache.delByPrefix('finance:');
    cache.delByPrefix('dashboard:');
    return updated;
  },
};
