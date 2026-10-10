import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ticketsController } from './tickets.controller.js';
import { myTicketsQuery } from './tickets.schema.js';

export const ticketsRouter = Router();

ticketsRouter.get('/my', auth, validate({ query: myTicketsQuery }), ticketsController.listMine);
