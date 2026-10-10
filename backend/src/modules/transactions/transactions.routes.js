import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { transactionsController } from './transactions.controller.js';
import { createTransactionSchema, exportQuery, listTransactionsQuery, summaryQuery } from './transactions.schema.js';

const treasury = requireRole('ADMIN', 'TREASURER');

export const transactionsRouter = Router();

transactionsRouter.use(auth, treasury);
transactionsRouter.get('/', validate({ query: listTransactionsQuery }), transactionsController.list);
transactionsRouter.post('/', validate({ body: createTransactionSchema }), transactionsController.create);

export const financeRouter = Router();

financeRouter.use(auth, treasury);
financeRouter.get('/summary', validate({ query: summaryQuery }), transactionsController.summary);
financeRouter.get('/events', transactionsController.eventReport);
financeRouter.get('/export.csv', validate({ query: exportQuery }), transactionsController.exportCsv);
