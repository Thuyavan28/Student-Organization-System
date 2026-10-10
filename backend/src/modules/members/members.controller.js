import { asyncHandler } from '../../utils/asyncHandler.js';
import { membersService } from './members.service.js';

export const membersController = {
  list: asyncHandler(async (req, res) => res.json(await membersService.list(req.query))),
  expiring: asyncHandler(async (req, res) => res.json(await membersService.expiring(req.query))),
  me: asyncHandler(async (req, res) => res.json({ data: await membersService.me(req.user.id) })),
  get: asyncHandler(async (req, res) => res.json({ data: await membersService.get(req.params.id) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await membersService.create(req.body, req.user) })),
  update: asyncHandler(async (req, res) => res.json({ data: await membersService.update(req.params.id, req.body) })),
  markPaid: asyncHandler(async (req, res) => res.json({ data: await membersService.markPaid(req.params.id, req.body, req.user) })),
  verify: asyncHandler(async (req, res) => res.json({ data: await membersService.verify(req.params.id) })),
  runReminders: asyncHandler(async (req, res) => res.json({ data: await membersService.runReminders() })),
};
