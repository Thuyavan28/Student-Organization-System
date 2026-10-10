import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { fundraisersController } from './fundraisers.controller.js';
import {
  addIncomeSchema, createFundraiserSchema, fundraiserIdParam, listFundraisersQuery, updateFundraiserSchema,
} from './fundraisers.schema.js';

export const fundraisersRouter = Router();

const staff = requireRole('ADMIN', 'TREASURER', 'VOLUNTEER');
const admin = requireRole('ADMIN');

fundraisersRouter.use(auth);

fundraisersRouter.get('/', staff, validate({ query: listFundraisersQuery }), fundraisersController.list);
fundraisersRouter.post('/', admin, validate({ body: createFundraiserSchema }), fundraisersController.create);
fundraisersRouter.get('/:id', staff, validate({ params: fundraiserIdParam }), fundraisersController.get);
fundraisersRouter.patch('/:id', admin, validate({ params: fundraiserIdParam, body: updateFundraiserSchema }), fundraisersController.update);
fundraisersRouter.delete('/:id', admin, validate({ params: fundraiserIdParam }), fundraisersController.remove);
fundraisersRouter.get('/:id/summary', staff, validate({ params: fundraiserIdParam }), fundraisersController.summary);
fundraisersRouter.post('/:id/income', requireRole('ADMIN', 'TREASURER'), validate({ params: fundraiserIdParam, body: addIncomeSchema }), fundraisersController.addIncome);
