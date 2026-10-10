import { asyncHandler } from '../../utils/asyncHandler.js';
import { announcementsService } from './announcements.service.js';

export const announcementsController = {
  list: asyncHandler(async (req, res) => res.json(await announcementsService.list(req.query, req.user))),
  history: asyncHandler(async (req, res) => res.json(await announcementsService.history(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ data: await announcementsService.create(req.body, req.user) })),
  update: asyncHandler(async (req, res) => res.json({ data: await announcementsService.update(req.params.id, req.body) })),
  archive: asyncHandler(async (req, res) => res.json({ data: await announcementsService.archive(req.params.id) })),
};
