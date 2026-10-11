import { app } from './app.js';
import { env } from './config/env.js';
import { connectAndWarm, POOL_SIZE, warmPool } from './config/prisma.js';
import { scheduleMembershipExpiry } from './jobs/membershipExpiry.job.js';

const KEEP_WARM_INTERVAL_MS = 30 * 1000;

// Connect and prime the pool before accepting traffic so the first request does not pay for connection setup.
const warmStart = performance.now();
await connectAndWarm();
console.log(`Database pool ready in ${Math.round(performance.now() - warmStart)} ms`);

app.listen(env.PORT, () => {
  console.log(`ClubFlow API listening on http://localhost:${env.PORT}`);
  scheduleMembershipExpiry();

  // Neon suspends idle databases and every new connection costs seconds, so a periodic ping touches ALL pooled
  // connections (not just one). It keeps the database awake, which also uses its compute hours around the clock.
  if (env.KEEP_DB_WARM) {
    setInterval(() => {
      warmPool().catch((error) => console.warn('[keep-warm] ping failed:', error.message));
    }, KEEP_WARM_INTERVAL_MS).unref();
    console.log(`Keep-warm enabled: all ${POOL_SIZE} database connections are refreshed every ${KEEP_WARM_INTERVAL_MS / 1000} s`);
  }
});
