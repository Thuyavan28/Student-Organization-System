// Cache-aside response cache with two interchangeable backends behind one API:
//   - Redis (when REDIS_URL is set and reachable): entries survive restarts and can be shared by several servers.
//   - In-process memory (the default, and the automatic fallback if Redis is down or unset).
// To switch Redis off, leave REDIS_URL empty. Nothing else in the code changes.
//
// Read path of wrap(key, ttl, load, { staleSeconds }):
//   fresh hit  -> return it                                   (no database work)
//   stale hit  -> return it now, refresh in the background    (only when staleSeconds > 0; one refresher per key)
//   miss       -> load from the database, store with a TTL, return   (single-flight: concurrent misses share one load)
// The database stays the source of truth. A cached value is only ever a copy that expires or is invalidated.
import Redis from 'ioredis';
import { env } from '../config/env.js';

const entries = new Map(); // key -> { value, freshUntil, staleUntil }
const inFlight = new Map(); // key -> promise of the load that is running
const refreshing = new Set(); // keys with a background refresh being set up or running in this process
const stats = { hits: 0, staleHits: 0, misses: 0, refreshes: 0, lockSkips: 0, redisErrors: 0, invalidations: 0, invalidationRetries: 0 };

const NAMESPACE = 'clubflow';
const JITTER = 0.1; // each TTL is randomised by +-10% so keys written together do not all expire together
const LOCK_MS = 10_000;
const GROUPS = ['events', 'finance', 'dashboard', 'members', 'products', 'announcements', 'tiers'];

const redisEnabled = Boolean(env.REDIS_URL) && (env.NODE_ENV !== 'test' || process.env.CACHE_TEST_REDIS === '1');
let redis = null;
// Groups whose Redis version bump has not succeeded yet. Reads of these groups skip Redis, so a failed
// invalidation can never cause stale data to be served from Redis.
const unbumped = new Set();
let retryTimer = null;

const redisReady = () => redis !== null && redis.status === 'ready';
const groupOf = (key) => key.split(':')[0];
const versionKey = (group) => `${NAMESPACE}:v:${group}`;
const jittered = (seconds) => Math.max(1, Math.round(seconds * (1 + (Math.random() * 2 - 1) * JITTER)));

function bumpGroup(group) {
  return redis.incr(versionKey(group));
}

function retryBumps() {
  retryTimer = null;
  if (unbumped.size === 0) return;
  for (const group of [...unbumped]) {
    stats.invalidationRetries += 1;
    if (!redisReady()) continue;
    bumpGroup(group).then(() => unbumped.delete(group)).catch(() => {});
  }
  if (unbumped.size > 0) retryTimer = setTimeout(retryBumps, 1000).unref();
}

if (redisEnabled) {
  redis = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    // Fail fast instead of queueing: while Redis is unreachable, requests use memory / the database and stay quick.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 1000,
    retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
  });
  let lastStatus = '';
  const report = (status) => {
    if (status === lastStatus) return;
    lastStatus = status;
    console.log(`[cache] Redis ${status}`);
  };
  redis.on('ready', () => {
    report('connected');
    // Writes made while Redis was unreachable could not invalidate it, so anything cached before the outage may be
    // stale. Bumping every version makes all of it unreachable (it then expires on its own).
    GROUPS.forEach((group) => bumpGroup(group).catch(() => unbumped.add(group)));
    redis.config('GET', 'maxmemory-policy').then(([, policy]) => {
      if (policy === 'noeviction') {
        console.warn('[cache] Redis maxmemory-policy is "noeviction": when Redis is full, cache writes fail instead of evicting old entries. Use "allkeys-lru" and set maxmemory.');
      }
    }).catch(() => {});
  });
  redis.on('end', () => report('disconnected, using memory cache'));
  redis.on('error', () => {
    stats.redisErrors += 1;
    report('unavailable, using memory cache');
  });
}

// ---- memory backend -------------------------------------------------------------------------------------------

function memoryRead(key) {
  const entry = entries.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now < entry.freshUntil) return { state: 'fresh', value: entry.value };
  if (now < entry.staleUntil) return { state: 'stale', value: entry.value };
  entries.delete(key);
  return null;
}

function memoryWrite(key, value, ttlSeconds, staleSeconds) {
  const now = Date.now();
  const ttl = jittered(ttlSeconds);
  entries.set(key, { value, freshUntil: now + ttl * 1000, staleUntil: now + (ttl + staleSeconds) * 1000 });
}

export function get(key) {
  const hit = memoryRead(key);
  return hit?.state === 'fresh' ? hit.value : undefined;
}

export function set(key, value, ttlSeconds) {
  memoryWrite(key, value, ttlSeconds, 0);
}

export function del(key) {
  entries.delete(key);
  inFlight.delete(key);
}

// Call this AFTER the database write has committed. Dropping in-flight loads stops a read that started before the
// write from re-caching old data. Redis entries are dropped by bumping the group version (one INCR, no key scan).
// Commands on one Redis connection run in order, so the INCR is applied before any read issued afterwards.
export function delByPrefix(prefix) {
  stats.invalidations += 1;
  for (const key of entries.keys()) if (key.startsWith(prefix)) entries.delete(key);
  for (const key of inFlight.keys()) if (key.startsWith(prefix)) inFlight.delete(key);
  if (!redisEnabled) return;
  const group = groupOf(prefix);
  // If Redis cannot confirm the bump, remember it: reads of this group bypass Redis until a retry succeeds.
  unbumped.add(group);
  if (redisReady()) {
    bumpGroup(group).then(() => unbumped.delete(group)).catch(() => {
      stats.redisErrors += 1;
      console.warn(`[cache] could not invalidate "${group}" in Redis; reading it from the database until Redis confirms`);
    });
  }
  if (!retryTimer && unbumped.size > 0) retryTimer = setTimeout(retryBumps, 1000).unref();
}

// ---- redis helpers --------------------------------------------------------------------------------------------

async function redisKey(key) {
  const group = groupOf(key);
  const version = (await redis.get(versionKey(group))) ?? '0';
  return `${NAMESPACE}:${group}:${version}:${key}`;
}

async function redisRead(rk) {
  const raw = await redis.get(rk);
  if (raw === null) return null;
  const { v, f } = JSON.parse(raw);
  return { state: Date.now() < f ? 'fresh' : 'stale', value: v };
}

async function redisWrite(rk, value, ttlSeconds, staleSeconds) {
  const ttl = jittered(ttlSeconds);
  const json = JSON.stringify({ v: value, f: Date.now() + ttl * 1000 });
  if (json !== undefined) await redis.set(rk, json, 'EX', ttl + staleSeconds);
}

// Only one server refreshes a stale key; the others keep serving the stale copy.
async function tryLock(rk) {
  try {
    return (await redis.set(`${NAMESPACE}:lock:${rk}`, '1', 'PX', LOCK_MS, 'NX')) === 'OK';
  } catch {
    return true; // cannot tell: refreshing is safe, it only costs one extra database call
  }
}

// ---- the cache-aside entry point ------------------------------------------------------------------------------

// Runs `load`, stores the result with a TTL and registers the load in inFlight so identical requests share it.
function startLoad(key, rk, ttlSeconds, staleSeconds, load) {
  const promise = (async () => {
    await null; // makes sure `promise` is assigned before the finally block can run
    try {
      const value = await load();
      // Skip the write if the key was invalidated while the load was running.
      if (inFlight.get(key) === promise) {
        if (rk !== null) {
          try {
            await redisWrite(rk, value, ttlSeconds, staleSeconds);
          } catch {
            stats.redisErrors += 1;
          }
        } else {
          memoryWrite(key, value, ttlSeconds, staleSeconds);
        }
      }
      return value;
    } finally {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

export async function wrap(key, ttlSeconds, load, { staleSeconds = 0 } = {}) {
  // 1. Look in the cache. Redis is only used when it is ready and the group has no unconfirmed invalidation.
  let rk = null;
  let hit = null;
  if (redisReady() && !unbumped.has(groupOf(key))) {
    try {
      rk = await redisKey(key);
      hit = await redisRead(rk);
    } catch {
      stats.redisErrors += 1;
      rk = null;
      hit = null;
    }
  }
  if (rk === null) hit = memoryRead(key);

  if (hit?.state === 'fresh') {
    stats.hits += 1;
    return hit.value;
  }

  // 2. Stale but usable: answer immediately and refresh in the background (one refresher per key, one server per key).
  if (hit?.state === 'stale') {
    stats.hits += 1;
    stats.staleHits += 1;
    // `refreshing` is set synchronously, so of N simultaneous requests only the first goes on to the Redis lock.
    if (inFlight.has(key) || refreshing.has(key)) {
      stats.lockSkips += 1;
      return hit.value;
    }
    refreshing.add(key);
    (async () => {
      try {
        if (rk !== null && !(await tryLock(rk))) {
          stats.lockSkips += 1; // another server is refreshing this key
          return;
        }
        stats.refreshes += 1;
        await startLoad(key, rk, ttlSeconds, staleSeconds, load);
      } catch (error) {
        console.warn(`[cache] background refresh of "${key}" failed: ${error.message}`);
      } finally {
        refreshing.delete(key);
      }
    })();
    return hit.value;
  }

  // 3. Miss: concurrent misses for the same key share one database load.
  const pending = inFlight.get(key);
  if (pending) return pending;
  stats.misses += 1;
  return startLoad(key, rk, ttlSeconds, staleSeconds, load);
}

export function clear() {
  entries.clear();
  inFlight.clear();
  if (redisReady()) GROUPS.forEach((group) => bumpGroup(group).catch(() => unbumped.add(group)));
}

// For the health endpoint: which backend is active and how well it is doing.
export function info() {
  const total = stats.hits + stats.misses;
  return {
    backend: redisReady() ? 'redis' : 'memory',
    redisConfigured: redisEnabled,
    redisStatus: redis ? redis.status : 'off',
    ...stats,
    hitRate: total ? Math.round((stats.hits / total) * 1000) / 10 : null,
    pendingInvalidations: [...unbumped],
  };
}
