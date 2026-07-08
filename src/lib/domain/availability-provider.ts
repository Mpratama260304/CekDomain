import {
  getCachedAvailability,
  setCachedAvailability,
} from "./availability-cache";
import { ExternalApiAvailabilityProvider } from "./external-api-provider";
import { MockAvailabilityProvider } from "./mock-provider";
import { RdapAvailabilityProvider } from "./rdap-provider";
import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "./types";

/**
 * Provider selection + shared server-side helpers.
 *
 * `DOMAIN_CHECK_PROVIDER` chooses the backend:
 *   - `rdap`     -> real, key-less RDAP lookups (PRODUCTION default)
 *   - `mock`     -> deterministic offline provider (DEV/TEST ONLY)
 *   - `external` -> paid/third-party API (needs DOMAIN_API_URL + DOMAIN_API_KEY)
 *
 * Real providers are wrapped in a short-lived in-memory cache so one search
 * (which may verify several suggestions) doesn't hammer upstream.
 */

export function getCheckTimeoutMs(): number {
  const raw = Number(process.env.DOMAIN_CHECK_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 5000;
}

/** Wraps any provider with the short-lived availability cache. */
class CachedAvailabilityProvider implements DomainAvailabilityProvider {
  readonly name: string;
  constructor(private readonly inner: DomainAvailabilityProvider) {
    this.name = `cached:${inner.name}`;
  }

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const cached = getCachedAvailability(domain);
    if (cached) return cached;

    const result = await this.inner.check(domain);
    // setCachedAvailability ignores `unknown` results internally.
    setCachedAvailability(domain, result);
    return result;
  }
}

function createBaseProvider(): DomainAvailabilityProvider {
  const provider = (process.env.DOMAIN_CHECK_PROVIDER ?? "rdap")
    .trim()
    .toLowerCase();
  const timeout = getCheckTimeoutMs();

  switch (provider) {
    case "mock":
      return new MockAvailabilityProvider();

    case "external":
      if (ExternalApiAvailabilityProvider.isConfigured()) {
        return new ExternalApiAvailabilityProvider(
          process.env.DOMAIN_API_URL as string,
          process.env.DOMAIN_API_KEY as string,
          timeout,
        );
      }
      // Misconfigured: fall back to RDAP rather than failing every request.
      console.warn(
        "[availability] DOMAIN_CHECK_PROVIDER=external but DOMAIN_API_URL/DOMAIN_API_KEY are missing — falling back to RDAP.",
      );
      return new RdapAvailabilityProvider(timeout);

    case "rdap":
    default:
      return new RdapAvailabilityProvider(timeout);
  }
}

export function getAvailabilityProvider(): DomainAvailabilityProvider {
  const base = createBaseProvider();
  // The mock provider is deterministic and offline — caching adds nothing.
  if (base.name === "mock") return base;
  return new CachedAvailabilityProvider(base);
}

/**
 * Check many domains with a bounded concurrency so we never fan out an
 * unbounded number of upstream requests (which would risk rate limiting).
 * Results preserve input order; individual failures degrade to `unknown`.
 */
export async function checkMany(
  provider: DomainAvailabilityProvider,
  domains: string[],
  concurrency = 3,
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
