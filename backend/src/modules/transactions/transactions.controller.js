import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { transactionsService } from './transactions.service.js';

export const transactionsController = {
  list: asyncHandler(async (req, res) => res.json(await transactionsService.list(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await transactionsService.create(req.body, req.user) })),
  summary: asyncHandler(async (req, res) => res.json({ data: await transactionsService.summary(req.query) })),
  eventReport: asyncHandler(async (req, res) => res.json({ data: await transactionsService.eventReport() })),
  exportCsv: asyncHandler(async (req, res) => {
    res.type('text/csv').attachment('clubflow-ledger.csv');
    await pipeline(Readable.from(transactionsService.exportCsv(req.query)), res);
  }),
};
