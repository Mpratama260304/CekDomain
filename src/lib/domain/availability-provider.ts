import {
  getCachedAvailability,
  setCachedAvailability,
} from "./availability-cache";
import { RdapAvailabilityProvider } from "./providers/rdap-provider";
import {
  createRegistrarProvider,
  getRegistrarKind,
} from "./providers/registrar-provider";
import { UnsafeMockAvailabilityProvider } from "./providers/unsafe-mock-provider";
import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "./types";

/**
 * Provider selection + shared server-side helpers.
 *
 * `DOMAIN_CHECK_PROVIDER` chooses the backend:
 *   - `registrar` -> REAL registrar/reseller API (PRODUCTION default, source of truth)
 *   - `rdap`      -> best-effort RDAP; fallback/secondary only
 *   - `mock`      -> FAKE deterministic results (DEV/TEST ONLY, must be opted in)
 *
 * Strict production rules (fail closed — never return fake/misleading results):
 *   - `mock` is FORBIDDEN in production, and requires ALLOW_MOCK_PROVIDER=true anywhere.
 *   - `rdap`-only in production requires ALLOW_RDAP_ONLY_PRODUCTION=true.
 *   - `registrar` with missing credentials throws a config error (no silent fallback).
 */

/** Thrown when the provider is misconfigured. The route maps it to an HTTP error. */
export class ProviderConfigError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ProviderConfigError";
    this.status = status;
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function flagEnabled(name: string): boolean {
  return (process.env[name] ?? "").trim().toLowerCase() === "true";
}

export function getConfiguredProviderName(): string {
  return (process.env.DOMAIN_CHECK_PROVIDER ?? "registrar").trim().toLowerCase();
}

export function getCheckTimeoutMs(): number {
  const raw = Number(process.env.DOMAIN_CHECK_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 5000;
}

/** True when the FAKE mock provider is actually active (used for the dev badge). */
export function isMockModeActive(): boolean {
  return (
    getConfiguredProviderName() === "mock" &&
    !isProduction() &&
    flagEnabled("ALLOW_MOCK_PROVIDER")
  );
}

/**
 * Registrar (primary) with RDAP as a SECONDARY signal.
 *
 * RDAP is consulted ONLY when the registrar itself returns `unknown` for a
 * specific domain — it never overrides a definitive registrar answer, and its
 * contribution is labelled with low confidence. (This is different from a silent
 * fallback due to misconfiguration, which we forbid — see createSelectedProvider.)
 */
class RegistrarWithRdapFallback implements DomainAvailabilityProvider {
  readonly name = "registrar";
  constructor(
    private readonly primary: DomainAvailabilityProvider,
    private readonly secondary: DomainAvailabilityProvider,
  ) {}

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const result = await this.primary.check(domain);
    if (result.status !== "unknown") return result;

    const fallback = await this.secondary.check(domain);
    if (fallback.status === "available" || fallback.status === "registered") {
      return {
        ...fallback,
        source: `${this.primary.name}+rdap`,
        confidence: "weak",
        reason: `${this.primary.name} unknown; rdap fallback: ${fallback.reason ?? ""}`,
      };
    }
    return result; // stay unknown
  }
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

function createSelectedProvider(): DomainAvailabilityProvider {
  const provider = getConfiguredProviderName();
  const timeout = getCheckTimeoutMs();

  switch (provider) {
    case "mock": {
      if (isProduction()) {
        throw new ProviderConfigError(
          "Mock domain provider is disabled in production.",
        );
      }
      if (!flagEnabled("ALLOW_MOCK_PROVIDER")) {
        throw new ProviderConfigError(
          "Mock provider is disabled. Set ALLOW_MOCK_PROVIDER=true to enable FAKE results (development only).",
        );
      }
      return new UnsafeMockAvailabilityProvider();
    }

    case "rdap": {
      if (isProduction() && !flagEnabled("ALLOW_RDAP_ONLY_PRODUCTION")) {
        throw new ProviderConfigError(
          "RDAP-only mode is disabled in production. Set ALLOW_RDAP_ONLY_PRODUCTION=true for best-effort RDAP, or use DOMAIN_CHECK_PROVIDER=registrar.",
        );
      }
      return new RdapAvailabilityProvider(timeout);
    }

    case "registrar":
    default: {
      const registrar = createRegistrarProvider();
      if (!registrar) {
        throw new ProviderConfigError(
          "Registrar availability API is not configured.",
        );
      }
      // RDAP is a secondary signal only (never overrides the registrar).
      return new RegistrarWithRdapFallback(
        registrar,
        new RdapAvailabilityProvider(timeout),
      );
    }
  }
}

export function getAvailabilityProvider(): DomainAvailabilityProvider {
  const base = createSelectedProvider();
  // Never cache FAKE mock results.
  if (base.name === "mock") return base;
  return new CachedAvailabilityProvider(base);
}

/** Diagnostic string for logs / the QA script. */
export function describeActiveProvider(): string {
  const provider = getConfiguredProviderName();
  if (provider === "registrar" || provider === "") {
    return `registrar:${getRegistrarKind()}`;
  }
  return provider;
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
          source: "error",
          confidence: "unknown",
          reason: "check failed",
        };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, domains.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
