import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "./types";

/**
 * RDAP-based availability provider (production default).
 *
 * RDAP (Registration Data Access Protocol, RFC 7482+) is the modern,
 * standardized successor to WHOIS. We query the public `rdap.org` bootstrap
 * redirector, which forwards the request to the authoritative RDAP server for
 * the domain's TLD. This works WITHOUT any API keys, so nothing secret is ever
 * shipped to the browser.
 *
 * Interpretation of responses:
 *   - HTTP 200 (after redirect) -> a registration record exists -> REGISTERED
 *   - HTTP 404 (after redirect)  -> registry has no record       -> AVAILABLE
 *   - HTTP 404 (NOT redirected)  -> rdap.org has no RDAP service for this TLD
 *                                   -> UNKNOWN (we must not claim availability)
 *   - timeout / network / 429 / 5xx / other -> UNKNOWN (graceful fallback)
 *
 * NOTE: RDAP reflects registry state at query time. It is a strong signal but
 * not a reservation — final registration is only confirmed by the registrar at
 * checkout. The UI communicates this to users.
 */

const RDAP_ENDPOINT = "https://rdap.org/domain/";
const MAX_ATTEMPTS = 2; // one retry on transient rate limiting
const DEFAULT_RETRY_DELAY_MS = 700;
const MAX_RETRY_DELAY_MS = 1500;

/** Resolve after `ms`, or immediately if the shared deadline is aborted. */
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
    // A single controller enforces the total time budget across all attempts.
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

        // Registered: the authoritative registry returned a record.
        if (res.status === 200) {
          return {
            domain,
            available: false,
            status: "registered",
            reason: "rdap: registry record found",
          };
        }

        if (res.status === 404) {
          // A 404 is only trustworthy as "available" if rdap.org actually
          // routed us to a registry (redirected). A direct 404 means the TLD
          // has no known RDAP service — we cannot be sure, so report unknown.
          if (res.redirected) {
            return {
              domain,
              available: true,
              status: "available",
              reason: "rdap: no registry record (404)",
            };
          }
          return {
            domain,
            available: false,
            status: "unknown",
            reason: "rdap: no RDAP service for this TLD",
          };
        }

        // Transient rate limiting / unavailability — retry once within budget.
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

        // Any other status (or exhausted retries) — do not guess.
        return {
          domain,
          available: false,
          status: "unknown",
          reason: `rdap: unexpected status ${res.status}`,
        };
      }

      // Retries exhausted without a definitive answer.
      return {
        domain,
        available: false,
        status: "unknown",
        reason: "rdap: rate limited",
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        domain,
        available: false,
        status: "unknown",
        reason: aborted ? "rdap: request timed out" : "rdap: lookup failed",
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
