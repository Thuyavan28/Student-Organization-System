import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { transactionsController } from './transactions.controller.js';
import { createTransactionSchema, exportQuery, listTransactionsQuery, summaryQuery } from './transactions.schema.js';

// Anyone on the team can READ the ledger and the finance dashboard; only the treasury roles can record entries or export.
const team = requireRole('ADMIN', 'TREASURER', 'VOLUNTEER');
const treasury = requireRole('ADMIN', 'TREASURER');

export const transactionsRouter = Router();

transactionsRouter.use(auth);
transactionsRouter.get('/', team, validate({ query: listTransactionsQuery }), transactionsController.list);
transactionsRouter.post('/', treasury, validate({ body: createTransactionSchema }), transactionsController.create);

export const financeRouter = Router();

financeRouter.use(auth);
financeRouter.get('/summary', team, validate({ query: summaryQuery }), transactionsController.summary);
financeRouter.get('/events', team, transactionsController.eventReport);
financeRouter.get('/export.csv', treasury, validate({ query: exportQuery }), transactionsController.exportCsv);
