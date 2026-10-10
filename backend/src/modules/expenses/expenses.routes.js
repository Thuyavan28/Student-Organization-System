import fs from 'node:fs';
import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { receiptUpload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { expensesController } from './expenses.controller.js';
import {
  createExpenseSchema, expenseIdParam, listExpensesQuery, myExpensesQuery, reviewExpenseSchema,
} from './expenses.schema.js';

export const expensesRouter = Router();

const reviewers = requireRole('ADMIN', 'TREASURER');

// A rejected form must not leave its uploaded receipt behind on disk.
const validateCreate = (req, res, next) =>
  validate({ body: createExpenseSchema })(req, res, (error) => {
    if (error && req.file) fs.unlink(req.file.path, () => {});
    next(error);
  });

expensesRouter.use(auth);

expensesRouter.post('/', requireRole('ADMIN', 'TREASURER', 'VOLUNTEER'), receiptUpload, validateCreate, expensesController.create);
expensesRouter.get('/my', validate({ query: myExpensesQuery }), expensesController.listMine);
expensesRouter.get('/', reviewers, validate({ query: listExpensesQuery }), expensesController.list);
expensesRouter.patch('/:id/review', reviewers, validate({ params: expenseIdParam, body: reviewExpenseSchema }), expensesController.review);
expensesRouter.patch('/:id/reimburse', reviewers, validate({ params: expenseIdParam }), expensesController.reimburse);
