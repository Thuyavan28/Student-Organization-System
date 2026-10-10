import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { dashboardController } from './dashboard.controller.js';
import { dashboardQuery } from './dashboard.schema.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', auth, requireRole('ADMIN', 'TREASURER'), validate({ query: dashboardQuery }), dashboardController.summary);
