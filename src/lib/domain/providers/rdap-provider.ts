import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "../types";

/**
 * RDAP availability provider — SECONDARY/FALLBACK signal only.
 *
 * RDAP (RFC 7482+) is the standardized successor to WHOIS. We query the public
 * `rdap.org` bootstrap redirector, which forwards to the authoritative RDAP
 * server for the TLD. It needs no API keys, so nothing secret ships to the
 * browser.
 *
 * IMPORTANT — RDAP is NOT sufficient as a production source of truth for domain
 * sales. It is used only as a fallback/secondary signal:
 *   - HTTP 200 (after redirect) + this is the authoritative registry
 *       -> REGISTERED (confidence: strong)
 *   - HTTP 404 (after redirect)   -> AVAILABLE (confidence: strong)
 *   - HTTP 404 (NOT redirected)   -> the TLD has no RDAP service -> UNKNOWN
 *   - timeout / network / 429 / 5xx / anything ambiguous -> UNKNOWN
 *
 * We NEVER turn an unsupported TLD, a timeout, a rate-limit, or an unexpected
 * response into "registered". Final ownership is only confirmed at checkout.
 */

const RDAP_ENDPOINT = "https://rdap.org/domain/";
const MAX_ATTEMPTS = 2; // one retry on transient rate limiting
const DEFAULT_RETRY_DELAY_MS = 700;
const MAX_RETRY_DELAY_MS = 1500;

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export class RdapAvailabilityProvider implements DomainAvailabilityProvider {
  readonly name = "rdap";
  private readonly timeoutMs: number;

  constructor(timeoutMs = 5000) {
    this.timeoutMs = timeoutMs;
  }

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await fetch(
          `${RDAP_ENDPOINT}${encodeURIComponent(domain)}`,
          {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            cache: "no-store",
            headers: {
              Accept: "application/rdap+json, application/json",
              "User-Agent": "CekDomain.ink/1.0 (+https://cekdomain.ink)",
            },
          },
        );

        // Registered: authoritative registry returned a record. Only trust a
        // 200 that actually came from a registry (i.e. we were redirected).
        if (res.status === 200) {
          if (!res.redirected) {
            return this.unknown(domain, "rdap: 200 without registry redirect");
          }
          return {
            domain,
            available: false,
            status: "registered",
            source: this.name,
            confidence: "strong",
            reason: "rdap: registry record found",
          };
        }

        if (res.status === 404) {
          if (res.redirected) {
            return {
              domain,
              available: true,
              status: "available",
              source: this.name,
              confidence: "strong",
              reason: "rdap: no registry record (404)",
            };
          }
          // Direct 404 = rdap.org has no RDAP service for this TLD -> ambiguous.
          return this.unknown(domain, "rdap: no RDAP service for this TLD");
        }

        const transient = res.status === 429 || res.status === 503;
        if (transient && attempt < MAX_ATTEMPTS && !controller.signal.aborted) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const wait = Math.min(
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : DEFAULT_RETRY_DELAY_MS,
            MAX_RETRY_DELAY_MS,
          );
          await delay(wait, controller.signal);
          continue;
        }

        return this.unknown(domain, `rdap: unexpected status ${res.status}`);
      }

      return this.unknown(domain, "rdap: rate limited");
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return this.unknown(
        domain,
        aborted ? "rdap: request timed out" : "rdap: lookup failed",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private unknown(domain: string, reason: string): DomainAvailabilityResult {
    return {
      domain,
      available: false,
      status: "unknown",
      source: this.name,
      confidence: "unknown",
      reason,
    };
  }
}
