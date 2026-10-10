import { PrismaClient } from '@prisma/client';

// Neon connections from a laptop can take several seconds to open, so interactive
// transactions get generous wait and run limits instead of Prisma's 2 s / 5 s defaults.
export const prisma = new PrismaClient({
  transactionOptions: { maxWait: 20000, timeout: 60000 },
});
