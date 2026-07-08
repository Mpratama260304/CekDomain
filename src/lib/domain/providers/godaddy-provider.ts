import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
  DomainConfidence,
  DomainStatus,
} from "../types";

/**
 * GoDaddy availability adapter.
 *
 *   REGISTRAR_API_PROVIDER=godaddy
 *   GODADDY_API_KEY=...
 *   GODADDY_API_SECRET=...
 *   GODADDY_ENV=production|ote     (ote -> api.ote-godaddy.com)
 *
 * Endpoint: GET /v1/domains/available?domain=x.com&checkType=FULL
 * Auth: header  Authorization: sso-key KEY:SECRET
 *
 * Mapping is strict and exact-match only. Ambiguity -> `unknown`.
 * GoDaddy `definitive:false` answers are downgraded to "weak" confidence.
 */

interface GodaddyConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  timeoutMs: number;
}

interface Interpreted {
  status: DomainStatus;
  confidence: DomainConfidence;
  price?: number | null;
  currency?: string | null;
}

/**
 * Map a GoDaddy /v1/domains/available payload to a status.
 * Exported for unit testing.
 */
export function interpretGodaddyResponse(
  data: unknown,
  domain: string,
): Interpreted {
  if (!data || typeof data !== "object") {
    return { status: "unknown", confidence: "unknown" };
  }
  const o = data as {
    available?: unknown;
    domain?: unknown;
    definitive?: unknown;
    price?: unknown;
    currency?: unknown;
  };

  // Exact-match guard: if a domain is echoed back, it must match.
  if (
    typeof o.domain === "string" &&
    o.domain.trim().toLowerCase() !== domain.trim().toLowerCase()
  ) {
    return { status: "unknown", confidence: "unknown" };
  }

  if (typeof o.available !== "boolean") {
    return { status: "unknown", confidence: "unknown" };
  }

  const confidence: DomainConfidence =
    o.definitive === false ? "weak" : "authoritative";
  const currency = typeof o.currency === "string" ? o.currency : null;
  // GoDaddy prices are in micro-units (1,000,000 == 1.00).
  const price =
    typeof o.price === "number" ? Math.round(o.price) / 1_000_000 : null;

  return {
    status: o.available ? "available" : "registered",
    confidence,
    price,
    currency,
  };
}

export class GodaddyProvider implements DomainAvailabilityProvider {
  readonly name = "godaddy";
  constructor(private readonly cfg: GodaddyConfig) {}

  static isConfigured(): boolean {
    return Boolean(
      process.env.GODADDY_API_KEY?.trim() && process.env.GODADDY_API_SECRET?.trim(),
    );
  }

  static fromEnv(): GodaddyProvider {
    const isOte = (process.env.GODADDY_ENV ?? "production").trim().toLowerCase() === "ote";
    const rawTimeout = Number(process.env.REGISTRAR_API_TIMEOUT_MS);
    return new GodaddyProvider({
      apiKey: process.env.GODADDY_API_KEY as string,
      apiSecret: process.env.GODADDY_API_SECRET as string,
      baseUrl: isOte ? "https://api.ote-godaddy.com" : "https://api.godaddy.com",
      timeoutMs: Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 8000,
    });
  }

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);

    try {
      const url = new URL(`${this.cfg.baseUrl}/v1/domains/available`);
      url.searchParams.set("domain", domain);
      url.searchParams.set("checkType", "FULL");

      const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `sso-key ${this.cfg.apiKey}:${this.cfg.apiSecret}`,
          "User-Agent": "CekDomain.ink/1.0 (+https://cekdomain.ink)",
        },
      });

      if (!res.ok) return this.unknown(domain, `godaddy: HTTP ${res.status}`);

      const data: unknown = await res.json().catch(() => null);
      const { status, confidence, price, currency } = interpretGodaddyResponse(
        data,
        domain,
      );
      if (status === "unknown") {
        return this.unknown(domain, "godaddy: inconclusive response", data);
      }

      return {
        domain,
        available: status === "available",
        status,
        source: this.name,
        confidence,
        price: price ?? null,
        currency: currency ?? null,
        reason: `godaddy: reported ${status}`,
        raw: data,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return this.unknown(
        domain,
        aborted ? "godaddy: request timed out" : "godaddy: lookup failed",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private unknown(
    domain: string,
    reason: string,
    raw?: unknown,
  ): DomainAvailabilityResult {
    return {
      domain,
      available: false,
      status: "unknown",
      source: this.name,
      confidence: "unknown",
      reason,
      raw,
    };
  }
}
