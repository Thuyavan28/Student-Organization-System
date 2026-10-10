import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { membershipsController } from './memberships.controller.js';
import { joinSchema, renewSchema, tierIdParam, tierSchema } from './memberships.schema.js';

export const membershipsRouter = Router();

membershipsRouter.get('/tiers', membershipsController.listTiers);
membershipsRouter.post('/tiers', auth, requireRole('ADMIN'), validate({ body: tierSchema }), membershipsController.createTier);
membershipsRouter.patch('/tiers/:id', auth, requireRole('ADMIN'), validate({ params: tierIdParam, body: tierSchema.partial() }), membershipsController.updateTier);
membershipsRouter.post('/join', auth, requireRole('MEMBER'), validate({ body: joinSchema }), membershipsController.join);
membershipsRouter.post('/renew', auth, requireRole('MEMBER'), validate({ body: renewSchema }), membershipsController.renew);
