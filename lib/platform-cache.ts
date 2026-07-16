/**
 * Short-lived server cache for outbound platform API calls (Instagram / YouTube).
 *
 * Every public kit view used to hit the provider APIs directly, which is what exhausted the
 * YouTube search quota. These numbers change slowly, so a few minutes of caching removes
 * almost all the traffic while the kit still reads as live.
 *
 * Notes:
 * - Caches the in-flight promise, so simultaneous views of the same kit make one request.
 * - Rejections are evicted immediately — a transient failure must never be cached.
 * - Process-local. On serverless this is per warm instance, which is fine: it's a traffic
 *   damper, not a source of truth. Anything needing durability lives in the DB
 *   (see lib/creator-stats-cache.ts).
 */

type Entry = { promise: Promise<unknown>; expiresAt: number };

const store = new Map<string, Entry>();

/** Guard against unbounded growth if a lot of creators are viewed on one instance. */
const MAX_ENTRIES = 500;

export const PLATFORM_CACHE_TTL_MS = 5 * 60 * 1000;

function evictExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  if (store.size > MAX_ENTRIES) {
    // Oldest-inserted first; Map preserves insertion order.
    const overflow = store.size - MAX_ENTRIES;
    let i = 0;
    for (const key of store.keys()) {
      if (i++ >= overflow) break;
      store.delete(key);
    }
  }
}

/** Run `fn`, reusing a recent result for the same `key` when one is still fresh. */
export function cachedPlatformCall<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = PLATFORM_CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.promise as Promise<T>;

  evictExpired(now);

  const promise = fn();
  store.set(key, { promise, expiresAt: now + ttlMs });
  // Never cache a failure — otherwise one blip poisons the kit for the whole TTL.
  promise.catch(() => {
    if (store.get(key)?.promise === promise) store.delete(key);
  });
  return promise;
}

/** Drop a user's cached platform data — call after connect/disconnect so the kit updates now. */
export function invalidatePlatformCache(userId: string): void {
  for (const key of store.keys()) {
    if (key.endsWith(`:${userId}`)) store.delete(key);
  }
}
