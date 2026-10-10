import onHeaders from 'on-headers';
import { requestContext } from '../config/prisma.js';

const SLOW_REQUEST_MS = 300;

// Adds a Server-Timing header (database time versus total time) so slow responses can be
// attributed to the database or to the network, and logs any request slower than 300 ms.
export function timing(req, res, next) {
  const startedAt = performance.now();
  const store = { dbMs: 0, dbQueries: 0 };

  onHeaders(res, () => {
    const total = performance.now() - startedAt;
    res.setHeader('Server-Timing', `db;dur=${store.dbMs.toFixed(1)}, app;dur=${(total - store.dbMs).toFixed(1)}, total;dur=${total.toFixed(1)}`);
  });

  res.on('finish', () => {
    const total = performance.now() - startedAt;
    if (total >= SLOW_REQUEST_MS) {
      console.warn(`[slow request] ${req.method} ${req.originalUrl} ${res.statusCode} ${total.toFixed(0)} ms (db ${store.dbMs.toFixed(0)} ms in ${store.dbQueries} queries)`);
    }
  });

  requestContext.run(store, next);
}
