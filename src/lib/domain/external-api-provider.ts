import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "./types";

/**
 * Placeholder provider for a paid / third-party domain availability API.
 *
 * Enabled with `DOMAIN_CHECK_PROVIDER=external` and configured via server-only
 * env vars (NEVER expose these to the client):
 *
 *   DOMAIN_API_URL=<https endpoint>
 *   DOMAIN_API_KEY=<secret key>
 *
 * The request/response shape below is a SENSIBLE DEFAULT — adapt `buildUrl` and
 * the response mapping to match your chosen provider's contract. As with RDAP,
 * we never claim availability unless the API says so clearly; anything
 * ambiguous or failing maps to `unknown`. Final ownership is only confirmed at
 * checkout.
 */
export class ExternalApiAvailabilityProvider
  implements DomainAvailabilityProvider
{
  readonly name = "external";
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(apiUrl: string, apiKey: string, timeoutMs = 5000) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  /** True only when both required env vars are present. */
  static isConfigured(): boolean {
    return Boolean(
      process.env.DOMAIN_API_URL?.trim() && process.env.DOMAIN_API_KEY?.trim(),
    );
  }

  private buildUrl(domain: string): string {
    try {
      const url = new URL(this.apiUrl);
      url.searchParams.set("domain", domain);
      return url.toString();
    } catch {
      const sep = this.apiUrl.includes("?") ? "&" : "?";
      return `${this.apiUrl}${sep}domain=${encodeURIComponent(domain)}`;
    }
  }

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.buildUrl(domain), {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "X-API-Key": this.apiKey,
          "User-Agent": "CekDomain.ink/1.0 (+https://cekdomain.ink)",
        },
      });

      if (!res.ok) {
        return {
          domain,
          available: false,
          status: "unknown",
          reason: `external: HTTP ${res.status}`,
        };
      }

      const data: unknown = await res.json().catch(() => null);
      const parsed = interpret(data);
      if (parsed === "available") {
        return {
          domain,
          available: true,
          status: "available",
          reason: "external: reported available",
        };
      }
      if (parsed === "registered") {
        return {
          domain,
          available: false,
          status: "registered",
          reason: "external: reported registered",
        };
      }
      return {
        domain,
        available: false,
        status: "unknown",
        reason: "external: inconclusive response",
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        domain,
        available: false,
        status: "unknown",
        reason: aborted ? "external: request timed out" : "external: lookup failed",
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Map a variety of common response shapes to our status. Adjust for your API.
 * Recognizes: { available: boolean } and { status: "available"|"registered"|... }.
 */
function interpret(data: unknown): "available" | "registered" | "unknown" {
  if (!data || typeof data !== "object") return "unknown";
  const obj = data as Record<string, unknown>;

  if (typeof obj.available === "boolean") {
    return obj.available ? "available" : "registered";
  }

  const status = typeof obj.status === "string" ? obj.status.toLowerCase() : "";
  if (["available", "free", "unregistered"].includes(status)) return "available";
  if (["registered", "taken", "unavailable", "active"].includes(status)) {
    return "registered";
  }
  return "unknown";
}
