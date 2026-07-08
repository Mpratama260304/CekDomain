import type { DomainAvailabilityResult } from "./types";

/**
 * Tiny server-side in-memory cache for availability results.
 *
 * Why: a single registered-domain search may trigger many upstream RDAP
 * lookups (one per suggestion). Caching normalized results for a short window
 * reduces upstream abuse and makes repeated searches feel instant.
 *
 * IMPORTANT:
 * - Server-side only (module state never reaches the browser).
 * - Best-effort: in serverless/multi-instance deployments this is per-instance
 *   and short-lived. That is fine — it's an optimization, not a source of truth.
 * - We deliberately do NOT cache `unknown` results (they are transient failures
 *   like timeouts/rate-limits and should be retryable).
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 5000; // bound memory usage

interface CacheEntry {
  result: DomainAvailabilityResult;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

function ttlMs(): number {
  const raw = Number(process.env.AVAILABILITY_CACHE_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS;
}

/** Return a cached result for `domain`, or null if missing/expired. */
export function getCachedAvailability(
  domain: string,
): DomainAvailabilityResult | null {
  const key = domain.trim().toLowerCase();
  if (!key) return null;

  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.result;
}

/**
 * Cache a definitive availability result. `unknown` results are ignored so a
 * transient failure never sticks for the whole TTL.
 */
export function setCachedAvailability(
  domain: string,
  result: DomainAvailabilityResult,
): void {
  const key = domain.trim().toLowerCase();
  if (!key) return;
  if (result.status === "unknown") return;

  // Opportunistic pruning to keep memory bounded.
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expiresAt <= now) store.delete(k);
    }
    // If still too big, drop the oldest insertion.
    if (store.size >= MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) store.delete(oldestKey);
    }
  }

  store.set(key, { result, expiresAt: Date.now() + ttlMs() });
}

/** Testing/maintenance helper. */
export function clearAvailabilityCache(): void {
  store.clear();
}
