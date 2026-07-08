/**
 * Minimal in-memory, per-key fixed-window rate limiter.
 *
 * Suitable for protecting a public endpoint from casual abuse. It is:
 * - Server-side only.
 * - Best-effort in serverless/multi-instance setups (per-instance state). For
 *   strong guarantees across instances, back this with Redis/Upstash later.
 *
 * Defaults: 20 requests / 60s per key, overridable via env.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10000;

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
  /** Seconds until reset (handy for Retry-After). */
  retryAfterSeconds: number;
}

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function rateLimit(key: string): RateLimitResult {
  const limit = envInt("RATE_LIMIT_MAX", 20);
  const windowMs = envInt("RATE_LIMIT_WINDOW_MS", 60_000);
  const now = Date.now();

  // Opportunistic cleanup of expired buckets.
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      ok: true,
      limit,
      remaining: limit - 1,
      resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const ok = existing.count <= limit;

  return {
    ok,
    limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Best-effort client IP from proxy headers. Falls back to a shared "local"
 * bucket in dev so local development is never blocked per-request.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local";
}
