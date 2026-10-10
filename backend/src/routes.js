import { Router } from 'express';
import { prisma } from './config/prisma.js';
import { asyncHandler } from './utils/asyncHandler.js';
import * as cache from './utils/memoryCache.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { membersRouter } from './modules/members/members.routes.js';
import { membershipsRouter } from './modules/memberships/memberships.routes.js';
import { eventsRouter } from './modules/events/events.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { ticketsRouter } from './modules/tickets/tickets.routes.js';
import { checkinsRouter } from './modules/checkins/checkins.routes.js';
import { announcementsRouter } from './modules/announcements/announcements.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { fundraisersRouter } from './modules/fundraisers/fundraisers.routes.js';
import { tasksRouter } from './modules/tasks/tasks.routes.js';
import { expensesRouter } from './modules/expenses/expenses.routes.js';
import { transactionsRouter, financeRouter } from './modules/transactions/transactions.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { leadershipRouter } from './modules/leadership/leadership.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';

export const apiRouter = Router();

// Liveness check: no database work, so it answers instantly even when the database is slow or asleep.
apiRouter.get('/health', (req, res) => res.json({ data: { status: 'ok', time: new Date().toISOString() } }));

apiRouter.get('/health/db', asyncHandler(async (req, res) => {
  const startedAt = performance.now();
  // Constant connectivity probe; there is no model to query for this.
  await prisma.$queryRaw`SELECT 1`;
  res.json({ data: { status: 'ok', db: 'up', dbMs: Math.round(performance.now() - startedAt), time: new Date().toISOString() } });
}));

// Which cache backend is active (redis or memory) and its hit rate; no database work.
apiRouter.get('/health/cache', (req, res) => res.json({ data: cache.info() }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/members', membersRouter);
apiRouter.use('/membership', membershipsRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use('/checkins', checkinsRouter);
apiRouter.use('/announcements', announcementsRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/fundraisers', fundraisersRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/expenses', expensesRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/finance', financeRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/leadership', leadershipRouter);
apiRouter.use('/payments', paymentsRouter);
