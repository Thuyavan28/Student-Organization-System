import { Router } from 'express';
import { auth, optionalAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { announcementsController } from './announcements.controller.js';
import {
  announcementIdParam, createAnnouncementSchema, listAnnouncementsQuery, updateAnnouncementSchema,
} from './announcements.schema.js';

export const announcementsRouter = Router();

const admin = requireRole('ADMIN');

announcementsRouter.get('/', optionalAuth, validate({ query: listAnnouncementsQuery }), announcementsController.list);
// /history is registered before /:id routes so it is not read as an id.
announcementsRouter.get('/history', auth, admin, validate({ query: listAnnouncementsQuery }), announcementsController.history);
announcementsRouter.post('/', auth, admin, validate({ body: createAnnouncementSchema }), announcementsController.create);
announcementsRouter.patch('/:id', auth, admin, validate({ params: announcementIdParam, body: updateAnnouncementSchema }), announcementsController.update);
announcementsRouter.post('/:id/archive', auth, admin, validate({ params: announcementIdParam }), announcementsController.archive);
