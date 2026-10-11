import { asyncHandler } from '../../utils/asyncHandler.js';
import { paymentsService } from './payments.service.js';

export const paymentsController = {
  createSession: asyncHandler(async (req, res) => {
    res.status(201).json({ data: paymentsService.createSession(req.body, req.user.id) });
  }),

  getSession: asyncHandler(async (req, res) => {
    res.json({ data: paymentsService.getSession(req.params.id) });
  }),

  approve: asyncHandler(async (req, res) => {
    res.json({ data: paymentsService.approve(req.params.id) });
  }),

  reject: asyncHandler(async (req, res) => {
    res.json({ data: paymentsService.reject(req.params.id) });
  }),

  getLanIp: asyncHandler(async (req, res) => {
    res.json({ data: paymentsService.getLanIp() });
  }),
};
