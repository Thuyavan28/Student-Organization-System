import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';

const SLOW_QUERY_MS = 200;
const WARM_CONNECTIONS = 4; // opened before the server accepts traffic (keeps startup quick)
// Prisma's pool size comes from the connection string (connection_limit=N); 10 is its default for this setup.
export const POOL_SIZE = Number((process.env.DATABASE_URL || '').match(/connection_limit=(\d+)/)?.[1]) || 10;

// Per-request database time, filled by the extension below and read by the timing middleware.
export const requestContext = new AsyncLocalStorage();

// Total statements sent to the database since the process started.
export const dbStats = { queries: 0 };

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
  dbStats.queries += 1;
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
  // Opening a connection to the remote database costs about 2.4 s (TLS and login over a 260 ms link), and a request that
  // needs a connection nobody has opened yet pays all of it. So the rest of the pool is opened right away in the
  // background instead of on the first busy page load.
  warmPool().catch(() => {});
}

// Sends one trivial query per pooled connection at the same time, so every connection is opened (first call) or
// refreshed (later calls). A connection used after sitting idle is also slower on its first query (~250 ms extra).
export function warmPool() {
  return Promise.all(Array.from({ length: POOL_SIZE }, () => base.$queryRaw`SELECT 1`));
}

export async function disconnect() {
  await base.$disconnect();
}
