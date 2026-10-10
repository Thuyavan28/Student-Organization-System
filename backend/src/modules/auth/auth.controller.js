import { asyncHandler } from '../../utils/asyncHandler.js';
import { authService } from './auth.service.js';

export const authController = {
  register: asyncHandler(async (req, res) => res.status(201).json({ data: await authService.register(req.body) })),
  login: asyncHandler(async (req, res) => res.json({ data: await authService.login(req.body) })),
  google: asyncHandler(async (req, res) => res.json({ data: await authService.google(req.body) })),
  me: (req, res) => res.json({ data: authService.me(req.user) }),
};
