import { app } from './app.js';
import { env } from './config/env.js';
import { connectAndWarm, prisma } from './config/prisma.js';
import { scheduleMembershipExpiry } from './jobs/membershipExpiry.job.js';

const KEEP_WARM_INTERVAL_MS = 4 * 60 * 1000;

// Connect and prime the pool before accepting traffic so the first request does not pay for connection setup.
const warmStart = performance.now();
await connectAndWarm();
console.log(`Database pool ready in ${Math.round(performance.now() - warmStart)} ms`);

app.listen(env.PORT, () => {
  console.log(`ClubFlow API listening on http://localhost:${env.PORT}`);
  scheduleMembershipExpiry();

  // Neon suspends idle databases, which adds seconds to the next query. A periodic ping keeps one awake for demos.
  if (env.KEEP_DB_WARM) {
    setInterval(() => {
      prisma.$queryRaw`SELECT 1`.catch((error) => console.warn('[keep-warm] ping failed:', error.message));
    }, KEEP_WARM_INTERVAL_MS).unref();
    console.log('Keep-warm ping enabled (every 4 minutes)');
  }
});
