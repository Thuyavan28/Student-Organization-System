import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { leadershipController } from './leadership.controller.js';
import { createLeadershipSchema, leadershipIdParam, listLeadershipQuery, updateLeadershipSchema } from './leadership.schema.js';

export const leadershipRouter = Router();

leadershipRouter.use(auth);

leadershipRouter.get('/', validate({ query: listLeadershipQuery }), leadershipController.list);
leadershipRouter.post('/', requireRole('ADMIN'), validate({ body: createLeadershipSchema }), leadershipController.create);
leadershipRouter.patch('/:id', requireRole('ADMIN'), validate({ params: leadershipIdParam, body: updateLeadershipSchema }), leadershipController.update);
