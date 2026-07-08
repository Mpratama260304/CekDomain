import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
  DomainStatus,
} from "../types";

/**
 * Name.com API v4 availability adapter.
 *
 *   REGISTRAR_API_PROVIDER=namecom
 *   NAMECOM_USERNAME=...
 *   NAMECOM_API_TOKEN=...
 *   NAMECOM_ENV=production|test   (test -> api.dev.name.com)
 *
 * Endpoint: POST /v4/domains:checkAvailability  { "domainNames": ["x.com"] }
 * Auth: HTTP Basic (username:token).
 *
 * Mapping is strict — anything ambiguous becomes `unknown`, never `registered`.
 */

interface NamecomConfig {
  username: string;
  token: string;
  baseUrl: string;
  timeoutMs: number;
}

interface Interpreted {
  status: DomainStatus;
  price?: number | null;
}

/**
 * Map a Name.com checkAvailability payload to a status for `domain`.
 * Exported for unit testing.
 */
export function interpretNamecomResults(
  data: unknown,
  domain: string,
): Interpreted {
  if (!data || typeof data !== "object") return { status: "unknown" };
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return { status: "unknown" };

  const target = domain.trim().toLowerCase();
  const match = results.find(
    (r) =>
      r &&
      typeof r === "object" &&
      typeof (r as { domainName?: unknown }).domainName === "string" &&
      (r as { domainName: string }).domainName.trim().toLowerCase() === target,
  ) as
    | {
        domainName: string;
        purchasable?: boolean;
        premium?: boolean;
        purchasePrice?: number;
      }
    | undefined;

  if (!match) return { status: "unknown" };

  const price =
    typeof match.purchasePrice === "number" ? match.purchasePrice : null;

  if (match.premium === true) return { status: "premium", price };
  if (match.purchasable === true) return { status: "available", price };
  if (match.purchasable === false) return { status: "registered" };
  return { status: "unknown" };
}

export class NamecomProvider implements DomainAvailabilityProvider {
  readonly name = "namecom";
  constructor(private readonly cfg: NamecomConfig) {}

  static isConfigured(): boolean {
    return Boolean(
      process.env.NAMECOM_USERNAME?.trim() && process.env.NAMECOM_API_TOKEN?.trim(),
    );
  }

  static fromEnv(): NamecomProvider {
    const isTest = (process.env.NAMECOM_ENV ?? "production").trim().toLowerCase() === "test";
    const rawTimeout = Number(process.env.REGISTRAR_API_TIMEOUT_MS);
    return new NamecomProvider({
      username: process.env.NAMECOM_USERNAME as string,
      token: process.env.NAMECOM_API_TOKEN as string,
      baseUrl: isTest ? "https://api.dev.name.com" : "https://api.name.com",
      timeoutMs: Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 8000,
    });
  }

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);

    try {
      const auth = Buffer.from(`${this.cfg.username}:${this.cfg.token}`).toString(
        "base64",
      );
      const res = await fetch(`${this.cfg.baseUrl}/v4/domains:checkAvailability`, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
          "User-Agent": "CekDomain.ink/1.0 (+https://cekdomain.ink)",
        },
        body: JSON.stringify({ domainNames: [domain] }),
      });

      if (!res.ok) return this.unknown(domain, `namecom: HTTP ${res.status}`);

      const data: unknown = await res.json().catch(() => null);
      const { status, price } = interpretNamecomResults(data, domain);
      if (status === "unknown") {
        return this.unknown(domain, "namecom: inconclusive response", data);
      }

      return {
        domain,
        available: status === "available",
        status,
        source: this.name,
        confidence: "authoritative",
        price: price ?? null,
        currency: price != null ? "USD" : null,
        reason: `namecom: reported ${status}`,
        raw: data,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return this.unknown(
        domain,
        aborted ? "namecom: request timed out" : "namecom: lookup failed",
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
