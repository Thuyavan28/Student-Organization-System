import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { tasksController } from './tasks.controller.js';
import { createTaskSchema, listTasksQuery, taskIdParam, updateTaskSchema } from './tasks.schema.js';

export const tasksRouter = Router();

const staff = requireRole('ADMIN', 'TREASURER', 'VOLUNTEER');

tasksRouter.use(auth);

tasksRouter.get('/', staff, validate({ query: listTasksQuery }), tasksController.list);
tasksRouter.post('/', requireRole('ADMIN'), validate({ body: createTaskSchema }), tasksController.create);
tasksRouter.patch('/:id', staff, validate({ params: taskIdParam, body: updateTaskSchema }), tasksController.update);
