// A small in-process TTL map. It is not a separate service: it lives and dies with the Express process.
// wrap() is single-flight, so a burst of identical requests shares one database call.
const entries = new Map();
const inFlight = new Map();

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
export function delByPrefix(prefix) {
  for (const key of entries.keys()) if (key.startsWith(prefix)) entries.delete(key);
  for (const key of inFlight.keys()) if (key.startsWith(prefix)) inFlight.delete(key);
}

export async function wrap(key, ttlSeconds, load) {
  const hit = get(key);
  if (hit !== undefined) return hit;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const value = await load();
      // Skip the write if the key was invalidated while the load was running.
      if (inFlight.get(key) === promise) set(key, value, ttlSeconds);
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
}
