import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { authController } from './auth.controller.js';
import { googleSchema, loginSchema, registerSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post('/google', authLimiter, validate({ body: googleSchema }), authController.google);
authRouter.get('/me', auth, authController.me);
