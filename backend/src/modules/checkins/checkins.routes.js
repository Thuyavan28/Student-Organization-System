import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { checkinsController } from './checkins.controller.js';
import { verifyCheckinSchema } from './checkins.schema.js';

export const checkinsRouter = Router();

checkinsRouter.post('/verify', auth, requireRole('ADMIN', 'VOLUNTEER'), validate({ body: verifyCheckinSchema }), checkinsController.verify);
