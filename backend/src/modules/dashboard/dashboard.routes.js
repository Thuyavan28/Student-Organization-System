import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { dashboardController } from './dashboard.controller.js';

export const dashboardRouter = Router();

const managers = requireRole('ADMIN', 'TREASURER');

dashboardRouter.get('/summary', auth, managers, dashboardController.summary);
dashboardRouter.get('/charts', auth, managers, dashboardController.charts);
