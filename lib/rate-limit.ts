/**
 * Fixed-window rate limiter, process-local.
 *
 * Deliberately a speed bump rather than a wall: on serverless this counts per warm
 * instance, so a determined attacker spread across instances gets a higher effective
 * limit. It stops the cases that actually happen (a script hammering one endpoint, a
 * runaway retry loop) at zero infrastructure cost.
 *
 * Anything that must be durable belongs in the database. `/api/auth/resend-verification`
 * pairs this with a per-email cooldown derived from the stored token expiry, which is
 * shared across every instance and is what genuinely prevents mailbombing one address.
 *
 * If abuse ever justifies it, the upgrade is a Redis-backed counter with the same shape.
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

/** Bound memory if a lot of distinct keys arrive on one instance. */
const MAX_KEYS = 5_000;

function evictExpired(now: number): void {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, w] of buckets) {
    if (w.resetAt <= now) buckets.delete(key);
  }
  // Still full of live windows: drop the oldest rather than grow without bound.
  if (buckets.size >= MAX_KEYS) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of oldest.slice(0, Math.ceil(MAX_KEYS / 10))) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Suitable for a Retry-After header. */
  retryAfterSec: number;
}

/**
 * Record a hit against `key`. Returns `ok: false` once `limit` hits occur inside
 * `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    evictExpired(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; the first entry is the client and
 * the rest are proxies. Falls back to a constant so a missing header degrades to one
 * shared bucket (over-restrictive) rather than to no limit at all.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test hook: windows are process-local, so tests must be able to clear them. */
export function __resetRateLimits(): void {
  buckets.clear();
}
