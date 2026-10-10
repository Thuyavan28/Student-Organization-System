import { z } from 'zod';
import { paginationShape } from '../../utils/pagination.js';

const status = z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED']);

export const fundraiserIdParam = z.object({ id: z.coerce.number().int().positive() });

export const listFundraisersQuery = z.object({
  ...paginationShape,
  status: status.optional(),
});

const fields = {
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).default(''),
  goalAmount: z.coerce.number().int().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status,
};

export const createFundraiserSchema = z
  .object({ ...fields, status: status.default('PLANNING') })
  .refine((value) => value.endDate >= value.startDate, { message: 'End date must not be before the start date', path: ['endDate'] });

export const updateFundraiserSchema = z
  .object({
    title: fields.title.optional(),
    description: z.string().trim().max(2000).optional(),
    goalAmount: fields.goalAmount.optional(),
    startDate: fields.startDate.optional(),
    endDate: fields.endDate.optional(),
    status: status.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: 'End date must not be before the start date',
    path: ['endDate'],
  });

export const addIncomeSchema = z.object({
  amount: z.coerce.number().int().min(1),
  description: z.string().trim().min(3).max(300),
  occurredAt: z.coerce.date().optional(),
});
