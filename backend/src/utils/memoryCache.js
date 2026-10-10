// Response cache with two interchangeable backends behind one API:
//   - Redis (when REDIS_URL is set and reachable): entries survive backend restarts and can be shared by several servers.
//   - In-process memory (the default, and the automatic fallback if Redis is down or unset).
// To switch Redis off, leave REDIS_URL empty. Nothing else in the code changes.
//
// wrap() is single-flight, so a burst of identical requests shares one database call.
import Redis from 'ioredis';
import { env } from '../config/env.js';

const entries = new Map();
const inFlight = new Map();
const stats = { hits: 0, misses: 0, redisErrors: 0 };

const NAMESPACE = 'clubflow';
const redisEnabled = Boolean(env.REDIS_URL) && env.NODE_ENV !== 'test';
let redis = null;

if (redisEnabled) {
  redis = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    // Fail fast instead of queueing: while Redis is unreachable, requests use the memory cache and stay quick.
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
  redis.on('ready', () => report('connected'));
  redis.on('end', () => report('disconnected, using memory cache'));
  redis.on('error', () => {
    stats.redisErrors += 1;
    report('unavailable, using memory cache');
  });
}

const redisReady = () => redis !== null && redis.status === 'ready';

// Keys are grouped by their first segment ("events", "finance", ...). Each group has a version number that is part
// of every key, so dropping a whole group is one INCR instead of scanning for keys.
const groupOf = (key) => key.split(':')[0];
const versionKey = (group) => `${NAMESPACE}:v:${group}`;

async function redisKey(key) {
  const group = groupOf(key);
  const version = (await redis.get(versionKey(group))) ?? '0';
  return `${NAMESPACE}:${group}:${version}:${key}`;
}

// ---- memory backend -------------------------------------------------------------------------------------------

export function get(key) {
  const entry = entries.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return undefined;
  }
  return entry.value;
}

export function set(key, value, ttlSeconds) {
  entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function del(key) {
  entries.delete(key);
  inFlight.delete(key);
}

// Removing in-flight loads as well stops a read that started before a write from re-caching stale data.
// Commands on one Redis connection run in order, so the INCR below is applied before any read issued afterwards.
export function delByPrefix(prefix) {
  for (const key of entries.keys()) if (key.startsWith(prefix)) entries.delete(key);
  for (const key of inFlight.keys()) if (key.startsWith(prefix)) inFlight.delete(key);
  if (redisReady()) {
    redis.incr(versionKey(groupOf(prefix))).catch(() => {
      stats.redisErrors += 1;
    });
  }
}

export async function wrap(key, ttlSeconds, load) {
  // Memory hits are answered straight away, before any promise is created.
  if (!redisReady()) {
    const hit = get(key);
    if (hit !== undefined) {
      stats.hits += 1;
      return hit;
    }
  }
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    // Always yield once, so `promise` is assigned before the finally block below can run.
    await null;
    try {
      // Only the Redis calls are guarded. If Redis misbehaves, `rk` stays null and this request uses memory instead.
      let rk = null;
      if (redisReady()) {
        try {
          rk = await redisKey(key);
          const raw = await redis.get(rk);
          if (raw !== null) {
            stats.hits += 1;
            return JSON.parse(raw);
          }
        } catch {
          stats.redisErrors += 1;
          rk = null;
        }
      }
      if (rk === null) {
        const hit = get(key);
        if (hit !== undefined) {
          stats.hits += 1;
          return hit;
        }
      }
      stats.misses += 1;

      const value = await load();

      // Skip the write if the key was invalidated while the load was running.
      if (inFlight.get(key) === promise) {
        if (rk !== null) {
          try {
            const json = JSON.stringify(value);
            if (json !== undefined) await redis.set(rk, json, 'EX', ttlSeconds);
          } catch {
            stats.redisErrors += 1;
          }
        } else {
          set(key, value, ttlSeconds);
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

export function clear() {
  entries.clear();
  inFlight.clear();
  if (redisReady()) {
    // Bump every known group: cheap and avoids KEYS/SCAN.
    ['events', 'finance', 'dashboard', 'members', 'products', 'announcements', 'fundraisers', 'tiers'].forEach((group) => {
      redis.incr(versionKey(group)).catch(() => {});
    });
  }
}

// For the health endpoint: which backend is active and how well it is doing.
export function info() {
  const total = stats.hits + stats.misses;
  return {
    backend: redisReady() ? 'redis' : 'memory',
    redisConfigured: redisEnabled,
    redisStatus: redis ? redis.status : 'off',
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total ? Math.round((stats.hits / total) * 100) : null,
    redisErrors: stats.redisErrors,
  };
}
