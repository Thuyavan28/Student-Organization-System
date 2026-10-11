import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

const category = z.enum([
  'DUES', 'TICKETS', 'MERCHANDISE', 'FUNDRAISER', 'DONATION', 'VENUE', 'FOOD', 'SUPPLIES', 'MARKETING', 'REIMBURSEMENT', 'OTHER',
]);
const type = z.enum(['INCOME', 'EXPENSE']);
const id = z.coerce.number().int().positive();

const filters = {
  type: type.optional(),
  category: category.optional(),
  eventId: id.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
};

export const listTransactionsQuery = z.object({
  ...paginationShape,
  ...filters,
  sort: z.enum(['occurredAt', 'amount']).default('occurredAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const exportQuery = z.object(filters);

export const summaryQuery = z.object({ from: filters.from, to: filters.to });

export const createTransactionSchema = z.object({
  type,
  category,
  amount: z.coerce.number().int().min(1).max(1_000_000_000),
  description: z.string().trim().min(3).max(300),
  occurredAt: z.coerce.date().optional(),
  eventId: id.optional(),
});
