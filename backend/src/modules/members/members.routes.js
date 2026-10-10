import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { membersController } from './members.controller.js';
import {
  createMemberSchema, expiringQuery, listMembersQuery, markPaidSchema, memberIdParam, updateMemberSchema,
} from './members.schema.js';

export const membersRouter = Router();

const staff = requireRole('ADMIN', 'TREASURER');

membersRouter.use(auth);

// Fixed paths are registered before /:id so they are not captured as ids.
membersRouter.get('/me', membersController.me);
membersRouter.get('/stats', staff, membersController.stats);
membersRouter.get('/expiring', staff, validate({ query: expiringQuery }), membersController.expiring);
membersRouter.post('/reminders/run', requireRole('ADMIN'), membersController.runReminders);
membersRouter.get('/', staff, validate({ query: listMembersQuery }), membersController.list);
membersRouter.post('/', requireRole('ADMIN'), validate({ body: createMemberSchema }), membersController.create);
membersRouter.get('/:id/verify', requireRole('ADMIN', 'VOLUNTEER'), validate({ params: memberIdParam }), membersController.verify);
membersRouter.post('/:id/mark-paid', staff, validate({ params: memberIdParam, body: markPaidSchema }), membersController.markPaid);
membersRouter.get('/:id', staff, validate({ params: memberIdParam }), membersController.get);
membersRouter.patch('/:id', requireRole('ADMIN'), validate({ params: memberIdParam, body: updateMemberSchema }), membersController.update);
