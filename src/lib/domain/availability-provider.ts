import { MockAvailabilityProvider } from "./mock-provider";
import { RdapAvailabilityProvider } from "./rdap-provider";
import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "./types";

/**
 * Provider selection + shared server-side helpers.
 *
 * The active provider is chosen from `DOMAIN_CHECK_PROVIDER`:
 *   - `mock` -> deterministic offline provider (development/testing)
 *   - `rdap` -> real key-less RDAP lookups (production default)
 *
 * A paid/third-party provider can be added later by implementing
 * `DomainAvailabilityProvider` and wiring a new case here (reading
 * `DOMAIN_API_URL` / `DOMAIN_API_KEY` server-side only).
 */

export function getCheckTimeoutMs(): number {
  const raw = Number(process.env.DOMAIN_CHECK_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 5000;
}

export function getAvailabilityProvider(): DomainAvailabilityProvider {
  const provider = (process.env.DOMAIN_CHECK_PROVIDER ?? "rdap")
    .trim()
    .toLowerCase();

  switch (provider) {
    case "mock":
      return new MockAvailabilityProvider();
    case "rdap":
    default:
      return new RdapAvailabilityProvider(getCheckTimeoutMs());
  }
}

/**
 * Check many domains with a bounded concurrency so we never fan out an
 * unbounded number of upstream requests (which would risk rate limiting).
 * Results preserve input order; individual failures degrade to `unknown`.
 */
export async function checkMany(
  provider: DomainAvailabilityProvider,
  domains: string[],
  concurrency = 6,
): Promise<DomainAvailabilityResult[]> {
  const results: DomainAvailabilityResult[] = new Array(domains.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < domains.length) {
      const index = cursor++;
      const domain = domains[index];
      try {
        results[index] = await provider.check(domain);
      } catch {
        results[index] = {
          domain,
          available: false,
          status: "unknown",
          reason: "check failed",
        };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, domains.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
