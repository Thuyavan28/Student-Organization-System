import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { usersController } from './users.controller.js';
import { createStaffBody, listStaffQuery, searchUsersQuery, staffIdParams, updateStaffBody } from './users.schema.js';

export const usersRouter = Router();

usersRouter.get('/', auth, requireRole('ADMIN', 'TREASURER'), validate({ query: searchUsersQuery }), usersController.search);

// Staff account management is admin-only.
usersRouter.get('/staff', auth, requireRole('ADMIN'), validate({ query: listStaffQuery }), usersController.listStaff);
usersRouter.post('/staff', auth, requireRole('ADMIN'), validate({ body: createStaffBody }), usersController.createStaff);
usersRouter.patch('/staff/:id', auth, requireRole('ADMIN'), validate({ params: staffIdParams, body: updateStaffBody }), usersController.updateStaff);
