import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

export const EXPENSE_CATEGORIES = ['VENUE', 'FOOD', 'SUPPLIES', 'MARKETING', 'OTHER'];
const optionalId = z.preprocess((value) => (value === '' ? undefined : value), z.coerce.number().int().positive().optional());

export const expenseIdParam = z.object({ id: z.coerce.number().int().positive() });

// Sent as multipart form fields, so every value arrives as text and is coerced here.
export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  description: z.string().trim().min(3).max(300),
  eventId: optionalId,
});

export const myExpensesQuery = z.object({ ...paginationShape });

export const listExpensesQuery = z.object({
  ...paginationShape,
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  q: z.string().trim().max(100).optional(),
});

export const reviewExpenseSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(300).optional(),
});
