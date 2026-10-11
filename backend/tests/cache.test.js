import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as cache from '../src/utils/memoryCache.js';

// Tests run with NODE_ENV=test, so this exercises the in-memory backend. scripts/cache-proof.js runs the same
// scenarios against Redis.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function fakeDb(latencyMs = 20) {
  const db = { calls: 0, version: 1 };
  db.load = async () => { db.calls += 1; const v = db.version; await sleep(latencyMs); return { v }; };
  return db;
}

describe('response cache', () => {
  test('cache-aside: first call loads, later calls are served from the cache', async () => {
    const db = fakeDb();
    await cache.wrap('products:t:aside', 30, db.load);
    await cache.wrap('products:t:aside', 30, db.load);
    assert.equal(db.calls, 1);
  });

  test('a value is reloaded from the database after its TTL', async () => {
    const db = fakeDb(1);
    await cache.wrap('products:t:ttl', 1, db.load);
    await sleep(1250); // longest jittered TTL is 1.1 s
    await cache.wrap('products:t:ttl', 1, db.load);
    assert.equal(db.calls, 2);
  });

  test('1,000 simultaneous requests for an uncached key cause one database call', async () => {
    const db = fakeDb(80);
    await Promise.all(Array.from({ length: 1000 }, () => cache.wrap('products:t:stampede', 30, db.load)));
    assert.equal(db.calls, 1);
  });

  test('stale-while-revalidate: requests after expiry get the old copy at once and trigger one refresh', async () => {
    const db = fakeDb(200);
    await cache.wrap('products:t:swr', 1, db.load, { staleSeconds: 5 });
    await sleep(1250);
    const started = performance.now();
    const results = await Promise.all(Array.from({ length: 200 }, () => cache.wrap('products:t:swr', 1, db.load, { staleSeconds: 5 })));
    assert.ok(performance.now() - started < 150, 'callers must not wait for the database');
    assert.ok(results.every((r) => r.v === 1));
    await sleep(350);
    assert.equal(db.calls, 2); // warm-up + exactly one background refresh
  });

  test('invalidation: after a write the next read comes from the database', async () => {
    const db = fakeDb(1);
    await cache.wrap('products:t:inv', 30, db.load);
    db.version = 2;
    cache.delByPrefix('products:');
    assert.equal((await cache.wrap('products:t:inv', 30, db.load)).v, 2);
  });

  test('a read that started before a write cannot re-cache the old value', async () => {
    const db = fakeDb(150);
    const slow = cache.wrap('products:t:race', 30, db.load);
    await sleep(30);
    db.version = 2;
    cache.delByPrefix('products:');
    await slow;
    assert.equal((await cache.wrap('products:t:race', 30, db.load)).v, 2);
  });

  test('a failed load is not cached', async () => {
    let n = 0;
    const flaky = async () => { n += 1; if (n === 1) throw new Error('db down'); return { ok: true }; };
    await assert.rejects(cache.wrap('products:t:err', 30, flaky));
    assert.deepEqual(await cache.wrap('products:t:err', 30, flaky), { ok: true });
  });
});
