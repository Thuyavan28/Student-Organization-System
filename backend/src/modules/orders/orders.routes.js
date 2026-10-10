import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { ordersController } from './orders.controller.js';
import { createOrderSchema, listOrdersQuery, myOrdersQuery, orderIdParam, updateOrderStatusSchema } from './orders.schema.js';

export const ordersRouter = Router();

ordersRouter.use(auth);

ordersRouter.post('/', validate({ body: createOrderSchema }), ordersController.create);
ordersRouter.get('/my', validate({ query: myOrdersQuery }), ordersController.listMine);
ordersRouter.get('/', requireRole('ADMIN', 'TREASURER'), validate({ query: listOrdersQuery }), ordersController.list);
ordersRouter.patch('/:id/status', requireRole('ADMIN'), validate({ params: orderIdParam, body: updateOrderStatusSchema }), ordersController.updateStatus);
