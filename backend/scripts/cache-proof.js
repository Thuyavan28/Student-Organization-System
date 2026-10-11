// Proves the cache behaves as designed, using a fake "database" that counts how often it is hit.
//   node scripts/cache-proof.js                       (uses REDIS_URL from .env)
//   REDIS_URL="" node scripts/cache-proof.js          (in-memory backend)
//   REDIS_URL=redis://127.0.0.1:6390 node scripts/cache-proof.js   (Redis unreachable)
import { performance } from 'node:perf_hooks';
import Redis from 'ioredis';
import * as cache from '../src/utils/memoryCache.js';
import { env } from '../src/config/env.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const pct = (arr, p) => [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];

// A pretend database call: counts calls and takes 100 ms like a slow query.
function fakeDb(latencyMs = 100) {
  const db = { calls: 0, version: 1, load: async () => { db.calls += 1; const v = db.version; await sleep(latencyMs); return { v }; } };
  return db;
}

await sleep(800); // let Redis connect
const mode = cache.info().backend;
console.log(`\nBackend under test: ${mode} (REDIS_URL ${env.REDIS_URL ? 'set' : 'empty'})\n`);

let probe = null;
if (mode === 'redis') probe = new Redis(env.REDIS_URL);

// 1. Cache-aside
console.log('1. Cache-aside (check cache, miss -> database -> store with TTL -> hit)');
{
  const db = fakeDb();
  const a = await cache.wrap('products:proof:aside', 30, db.load);
  const b = await cache.wrap('products:proof:aside', 30, db.load);
  const c = await cache.wrap('products:proof:aside', 30, db.load);
  check('first call loads from the database once', db.calls === 1 && a.v === 1);
  check('next calls are served from the cache', db.calls === 1 && b.v === 1 && c.v === 1, `db calls = ${db.calls}`);
  if (probe) {
    const keys = await probe.keys('clubflow:products:*:products:proof:aside');
    const ttl = keys.length ? await probe.ttl(keys[0]) : -2;
    check('entry exists in Redis with a TTL (30s +-10% jitter)', keys.length === 1 && ttl > 0 && ttl <= 33, `key=${keys[0]} ttl=${ttl}s`);
  }
}

// 2. TTL expiry
console.log('2. TTL expiry (no stale window)');
{
  const db = fakeDb(10);
  await cache.wrap('products:proof:ttl', 2, db.load);
  await sleep(2400); // jitter is +-10%, so the longest TTL is 2.2 s
  await cache.wrap('products:proof:ttl', 2, db.load);
  check('after the TTL the value is reloaded from the database', db.calls === 2, `db calls = ${db.calls}`);
}

// 3. TTL jitter
console.log('3. TTL jitter (keys written together must not expire together)');
if (probe) {
  const db = fakeDb(0);
  await Promise.all(Array.from({ length: 300 }, (_, i) => cache.wrap(`products:proof:jit${i}`, 60, db.load)));
  const keys = await probe.keys('clubflow:products:*:products:proof:jit*');
  const ttls = await Promise.all(keys.map((k) => probe.pttl(k)));
  const spread = (Math.max(...ttls) - Math.min(...ttls)) / 1000;
  check('300 keys written at once get different expiry times', spread >= 5, `TTLs span ${spread.toFixed(1)}s (min ${(Math.min(...ttls) / 1000).toFixed(1)}s, max ${(Math.max(...ttls) / 1000).toFixed(1)}s, nominal 60s +-10%)`);
} else {
  console.log('  (skipped: needs Redis to read key TTLs)');
}

// 4. Stampede on a missing key
console.log('4. Stampede: 2,000 simultaneous requests for a key that is not cached');
{
  const db = fakeDb(150);
  const lat = [];
  const t0 = performance.now();
  await Promise.all(Array.from({ length: 2000 }, async () => { const s = performance.now(); await cache.wrap('products:proof:stampede', 30, db.load); lat.push(performance.now() - s); }));
  check('only ONE database query for 2,000 requests', db.calls === 1, `db calls = ${db.calls}, total ${(performance.now() - t0).toFixed(0)}ms, p99 ${pct(lat, 99).toFixed(0)}ms`);
}

// 5. Stampede at expiry with stale-while-revalidate
console.log('5. Expiry under load with stale-while-revalidate (ttl 1s + 5s stale)');
{
  const db = fakeDb(300);
  await cache.wrap('products:proof:swr', 1, db.load, { staleSeconds: 5 });
  await sleep(1300); // now past the fresh time, inside the stale window
  const lat = [];
  await Promise.all(Array.from({ length: 500 }, async () => { const s = performance.now(); await cache.wrap('products:proof:swr', 1, db.load, { staleSeconds: 5 }); lat.push(performance.now() - s); }));
  await sleep(500);
  check('500 simultaneous requests at expiry caused only one refresh', db.calls === 2, `db calls = ${db.calls} (1 warm-up + 1 background refresh)`);
  check('nobody waited for the 300 ms database', pct(lat, 99) < 100, `p50 ${pct(lat, 50).toFixed(1)}ms p99 ${pct(lat, 99).toFixed(1)}ms`);
}

// 6. Invalidation after a write
console.log('6. Invalidation (database write, then cache dropped)');
{
  const db = fakeDb(10);
  const first = await cache.wrap('products:proof:inv', 30, db.load);
  db.version = 2; // the "database" row changed (price/stock/phone ...)
  const stale = await cache.wrap('products:proof:inv', 30, db.load);
  cache.delByPrefix('products:'); // what the service does after the write commits
  const fresh = await cache.wrap('products:proof:inv', 30, db.load);
  check('before invalidation the old copy is served (bounded by TTL)', first.v === 1 && stale.v === 1);
  check('after invalidation the new value is read from the database', fresh.v === 2, `v = ${fresh.v}`);

  // Race: a read starts BEFORE the write and finishes AFTER the invalidation. It must not re-cache the old value.
  const db2 = fakeDb(300);
  const slowRead = cache.wrap('products:proof:race', 30, db2.load); // reads version 1, takes 300 ms
  await sleep(50);
  db2.version = 2;
  cache.delByPrefix('products:');
  await slowRead;
  const after = await cache.wrap('products:proof:race', 30, db2.load);
  check('a slow read that straddles a write does not leave stale data cached', after.v === 2, `v = ${after.v}`);
}

// 7. Loader errors
console.log('7. Database error is not cached');
{
  let n = 0;
  const failing = async () => { n += 1; if (n === 1) throw new Error('db down'); return { ok: true }; };
  let threw = false;
  try { await cache.wrap('products:proof:err', 30, failing); } catch { threw = true; }
  const ok = await cache.wrap('products:proof:err', 30, failing);
  check('error is thrown to the caller and not stored; next call retries', threw && ok.ok === true && n === 2);
}

// 8. Redis unavailable
if (mode === 'memory' && env.REDIS_URL) {
  console.log('8. Redis unreachable (connection refused)');
  const db = fakeDb(100);
  const lat = [];
  for (let i = 0; i < 200; i += 1) { const s = performance.now(); await cache.wrap('products:proof:down', 30, db.load); lat.push(performance.now() - s); }
  check('requests still succeed, served from the memory fallback', db.calls === 1, `db calls = ${db.calls}, p99 ${pct(lat, 99).toFixed(1)}ms (no waiting on Redis timeouts)`);
  cache.delByPrefix('products:');
  const info = cache.info();
  check('failed invalidation is remembered and Redis is bypassed for that group', info.pendingInvalidations.includes('products'), `pending = ${JSON.stringify(info.pendingInvalidations)}`);
}

console.log('\nCache stats:', JSON.stringify(cache.info()));
if (probe) {
  const keys = await probe.keys('clubflow:*proof*');
  if (keys.length) await probe.del(...keys);
  probe.disconnect();
}
const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);
