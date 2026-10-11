// HTTP load test for the cache. Run with the API already started:
//   node scripts/cache-loadtest.mjs [baseUrl] [quick|full]
// Reports throughput, p50/p95/p99, errors, database queries (from /api/health/cache) and server CPU/memory.
import { execSync } from 'node:child_process';

const BASE = process.argv[2] || 'http://localhost:4000';
const MODE = process.argv[3] || 'quick';
const API = `${BASE}/api`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

const json = async (path, init) => (await fetch(`${API}${path}`, init)).json();
const health = async () => (await json('/health/cache')).data;
const login = async (email) => (await json('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Password@123' }) })).data.token;

// CPU seconds and working set of the process that owns the API port (Windows).
function serverProc() {
  try {
    const port = new URL(BASE).port || '80';
    const pid = execSync(`powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object -First 1).OwningProcess"`).toString().trim();
    const out = execSync(`powershell -NoProfile -Command "$p=Get-Process -Id ${pid}; '{0} {1}' -f $p.CPU, [math]::Round($p.WorkingSet64/1MB)"`).toString().trim().split(' ');
    return { pid, cpuSec: parseFloat(out[0]), memMb: parseInt(out[1], 10) };
  } catch { return null; }
}

async function run({ name, makeUrl, concurrency, seconds, headers = {} }) {
  const before = await health();
  const procBefore = serverProc();
  const lat = [];
  const perSecondMax = [];
  let errors = 0;
  let non2xx = 0;
  const started = performance.now();
  const stopAt = started + seconds * 1000;
  let bucketMax = 0;
  const ticker = setInterval(() => { perSecondMax.push(bucketMax); bucketMax = 0; }, 1000);

  const worker = async () => {
    while (performance.now() < stopAt) {
      const t = performance.now();
      try {
        const res = await fetch(makeUrl(), { headers });
        await res.arrayBuffer();
        if (!res.ok) non2xx += 1;
      } catch { errors += 1; }
      const ms = performance.now() - t;
      lat.push(ms);
      if (ms > bucketMax) bucketMax = ms;
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  clearInterval(ticker);
  const elapsed = (performance.now() - started) / 1000;
  const after = await health();
  const procAfter = serverProc();
  lat.sort((a, b) => a - b);
  const total = lat.length;
  const hits = after.hits - before.hits;
  const misses = after.misses - before.misses;
  const row = {
    name, concurrency, seconds: Math.round(elapsed), requests: total, rps: Math.round(total / elapsed),
    p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), max: lat[lat.length - 1],
    errors: errors + non2xx,
    dbQueries: after.dbQueries - before.dbQueries,
    hitRate: hits + misses ? `${((hits / (hits + misses)) * 100).toFixed(1)}%` : 'n/a',
    cpu: procBefore && procAfter ? `${(((procAfter.cpuSec - procBefore.cpuSec) / elapsed) * 100).toFixed(0)}% of 1 core` : 'n/a',
    mem: procAfter ? `${procAfter.memMb} MB` : 'n/a',
    worstSecondMax: Math.max(...perSecondMax, 0),
  };
  console.log(`\n--- ${name}`);
  console.log(`  ${row.requests} requests in ${row.seconds}s  =>  ${row.rps} req/s   (concurrency ${concurrency})`);
  console.log(`  latency  p50 ${row.p50.toFixed(1)}ms  p95 ${row.p95.toFixed(1)}ms  p99 ${row.p99.toFixed(1)}ms  max ${row.max.toFixed(0)}ms`);
  console.log(`  errors ${row.errors}   cache hit rate ${row.hitRate}   DB queries ${row.dbQueries}   server CPU ${row.cpu}   memory ${row.mem}`);
  return row;
}

const info = await health();
console.log(`API ${BASE}  cache backend: ${info.backend}  (redis status: ${info.redisStatus})`);
const admin = await login('admin@skyline.example.com');
const quick = MODE === 'quick';

// 1. Warm hit path
await fetch(`${API}/products`);
await run({ name: 'A. CACHE HIT  GET /products', makeUrl: () => `${API}/products`, concurrency: 50, seconds: quick ? 8 : 15 });

// 2. Forced miss: every request has a unique search term, so it always goes to the database
let n = 0;
await run({ name: 'B. CACHE MISS GET /events?q=<unique> (every request hits the DB)', makeUrl: () => `${API}/events?q=zz${Date.now()}${n++}`, concurrency: 10, seconds: quick ? 8 : 15 });

// 3. Same endpoint, cacheable
await run({ name: 'C. CACHE HIT  GET /events (same query, cached)', makeUrl: () => `${API}/events`, concurrency: 10, seconds: quick ? 8 : 15 });

// 4. Invalidation: change stock through the real API while reading, confirm readers see it at once
console.log('\n--- D. Database update -> cache invalidation');
{
  const products = (await json('/products')).data;
  const product = products[0];
  const variant = product.variants[0];
  const original = variant.stock;
  const target = original + 7;
  const t0 = performance.now();
  const res = await fetch(`${API}/products/${product.id}/variants/${variant.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: target }) });
  const writeMs = performance.now() - t0;
  const seen = (await json('/products')).data.find((p) => p.id === product.id).variants.find((v) => v.id === variant.id).stock;
  console.log(`  stock ${original} -> ${target} via API (HTTP ${res.status}, ${writeMs.toFixed(0)}ms); next read shows ${seen}  =>  ${seen === target ? 'PASS (fresh immediately)' : 'FAIL (stale)'}`);
  await fetch(`${API}/products/${product.id}/variants/${variant.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: original }) });
}

// 5. Expiry under load (TTL 60s +-10%, plus 30s stale window): look for latency spikes and extra DB queries
if (!quick) {
  const row = await run({ name: 'E. TTL EXPIRY UNDER LOAD GET /products for 80s (crosses one expiry)', makeUrl: () => `${API}/products`, concurrency: 20, seconds: 80 });
  console.log(`  worst latency in any single second: ${row.worstSecondMax.toFixed(0)}ms (a DB reload would be ~300-500ms)`);
}

const end = await health();
console.log('\nFinal cache stats:', JSON.stringify({ hits: end.hits, staleHits: end.staleHits, misses: end.misses, refreshes: end.refreshes, lockSkips: end.lockSkips, redisErrors: end.redisErrors, hitRate: end.hitRate }));
