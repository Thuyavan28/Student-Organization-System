import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';

const SLOW_QUERY_MS = 200;
const WARM_CONNECTIONS = 4;

// Per-request database time, filled by the extension below and read by the timing middleware.
export const requestContext = new AsyncLocalStorage();

// One client for the whole process. Interactive transactions get a generous budget because a
// transaction holds its connection across several round trips to the database.
const base = new PrismaClient({
  transactionOptions: { maxWait: 20000, timeout: 60000 },
  log: [{ emit: 'event', level: 'query' }, 'warn', 'error'],
});

base.$on('query', (event) => {
  if (event.duration >= SLOW_QUERY_MS) {
    console.warn(`[slow query] ${event.duration} ms: ${event.query.replace(/\s+/g, ' ').slice(0, 160)}`);
  }
});

function recordDbTime(startedAt) {
  const store = requestContext.getStore();
  if (store) {
    store.dbMs += performance.now() - startedAt;
    store.dbQueries += 1;
  }
}

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const startedAt = performance.now();
        try {
          return await query(args);
        } finally {
          recordDbTime(startedAt);
        }
      },
    },
    async $queryRaw({ args, query }) {
      const startedAt = performance.now();
      try {
        return await query(args);
      } finally {
        recordDbTime(startedAt);
      }
    },
  },
});

// Opens the first connection, then primes a few more in parallel so the first real requests do not
// each pay for a TLS handshake and authentication round trips.
export async function connectAndWarm() {
  await base.$connect();
  await Promise.all(Array.from({ length: WARM_CONNECTIONS }, () => base.$queryRaw`SELECT 1`));
}

export async function disconnect() {
  await base.$disconnect();
}
