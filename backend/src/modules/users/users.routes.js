import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { usersController } from './users.controller.js';
import { searchUsersQuery } from './users.schema.js';

export const usersRouter = Router();

usersRouter.get('/', auth, requireRole('ADMIN', 'TREASURER'), validate({ query: searchUsersQuery }), usersController.search);
