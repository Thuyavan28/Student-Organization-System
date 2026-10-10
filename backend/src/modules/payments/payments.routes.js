import { Router } from 'express';
import { paymentsController } from './payments.controller.js';

export const paymentsRouter = Router();

// Endpoints used for the mobile scan-and-pay flow
paymentsRouter.get('/lan-ip', paymentsController.getLanIp);
paymentsRouter.post('/session', paymentsController.createSession);
paymentsRouter.get('/session/:id', paymentsController.getSession);
paymentsRouter.post('/session/:id/approve', paymentsController.approve);
paymentsRouter.post('/session/:id/reject', paymentsController.reject);
