import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
  DomainStatus,
} from "../types";

/**
 * Generic, configurable registrar/reseller adapter.
 *
 * Point it at any HTTP availability endpoint (e.g. a future Marketku API) via
 * env. Mapping is STRICT: we only report `available`/`registered` when the
 * response clearly says so, otherwise `unknown`. We never turn ambiguity into
 * `registered`.
 *
 *   REGISTRAR_API_URL=...            (required)
 *   REGISTRAR_API_METHOD=GET|POST    (default GET)
 *   REGISTRAR_API_KEY=...            (optional)
 *   REGISTRAR_API_AUTH_HEADER=...    (default X-API-Key)
 *   REGISTRAR_API_DOMAIN_PARAM=...   (default "domain")
 *   REGISTRAR_API_TIMEOUT_MS=8000
 */

export interface GenericProviderConfig {
  url: string;
  method: "GET" | "POST";
  apiKey?: string;
  authHeader: string;
  domainParam: string;
  timeoutMs: number;
}

interface Interpreted {
  status: DomainStatus;
  price?: number | null;
  currency?: string | null;
}

/** Unwrap common envelopes like { data: {...} } / { result: {...} }. */
function unwrap(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  for (const key of ["data", "result", "response"]) {
    const inner = o[key];
    if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  }
  return o;
}

/**
 * Strictly map a variety of registrar response shapes to a status.
 * Exported for unit testing.
 */
export function interpretGenericResponse(data: unknown): Interpreted {
  const o = unwrap(data);
  if (!o) return { status: "unknown" };

  const statusStr =
    typeof o.status === "string" ? o.status.trim().toLowerCase() : "";
  const price =
    typeof o.price === "number"
      ? o.price
      : typeof o.purchasePrice === "number"
        ? o.purchasePrice
        : null;
  const currency = typeof o.currency === "string" ? o.currency : null;

  // Explicit special states take priority.
  if (o.premium === true || statusStr === "premium") {
    return { status: "premium", price, currency };
  }
  if (o.reserved === true || statusStr === "reserved") {
    return { status: "reserved" };
  }
  if (["unsupported", "not_supported", "unsupported_tld"].includes(statusStr)) {
    return { status: "unsupported" };
  }

  // Boolean availability is the clearest signal.
  if (typeof o.available === "boolean") {
    return { status: o.available ? "available" : "registered", price, currency };
  }

  if (["available", "free", "unregistered"].includes(statusStr)) {
    return { status: "available", price, currency };
  }
  if (
    ["registered", "taken", "unavailable", "not_available", "active"].includes(
      statusStr,
    )
  ) {
    return { status: "registered" };
  }

  return { status: "unknown" };
}

export class GenericRegistrarProvider implements DomainAvailabilityProvider {
  readonly name = "generic";
  constructor(private readonly cfg: GenericProviderConfig) {}

  static isConfigured(): boolean {
    return Boolean(process.env.REGISTRAR_API_URL?.trim());
  }

  static fromEnv(): GenericRegistrarProvider {
    const method =
      (process.env.REGISTRAR_API_METHOD ?? "GET").trim().toUpperCase() === "POST"
        ? "POST"
        : "GET";
    const rawTimeout = Number(process.env.REGISTRAR_API_TIMEOUT_MS);
    return new GenericRegistrarProvider({
      url: process.env.REGISTRAR_API_URL as string,
      method,
      apiKey: process.env.REGISTRAR_API_KEY,
      authHeader: process.env.REGISTRAR_API_AUTH_HEADER?.trim() || "X-API-Key",
      domainParam: process.env.REGISTRAR_API_DOMAIN_PARAM?.trim() || "domain",
      timeoutMs:
        Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 8000,
    });
  }

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "CekDomain.ink/1.0 (+https://cekdomain.ink)",
      };
      if (this.cfg.apiKey) headers[this.cfg.authHeader] = this.cfg.apiKey;

      let url = this.cfg.url;
      const init: RequestInit = {
        method: this.cfg.method,
        headers,
        cache: "no-store",
        signal: controller.signal,
      };

      if (this.cfg.method === "POST") {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify({ [this.cfg.domainParam]: domain });
      } else {
        try {
          const u = new URL(this.cfg.url);
          u.searchParams.set(this.cfg.domainParam, domain);
          url = u.toString();
        } catch {
          const sep = this.cfg.url.includes("?") ? "&" : "?";
          url = `${this.cfg.url}${sep}${encodeURIComponent(this.cfg.domainParam)}=${encodeURIComponent(domain)}`;
        }
      }

      const res = await fetch(url, init);
      if (!res.ok) {
        return this.unknown(domain, `generic: HTTP ${res.status}`);
      }

      const data: unknown = await res.json().catch(() => null);
      const { status, price, currency } = interpretGenericResponse(data);
      if (status === "unknown") {
        return this.unknown(domain, "generic: inconclusive response", data);
      }

      return {
        domain,
        available: status === "available",
        status,
        source: this.name,
        confidence: "authoritative",
        price: price ?? null,
        currency: currency ?? null,
        reason: `generic: reported ${status}`,
        raw: data,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return this.unknown(
        domain,
        aborted ? "generic: request timed out" : "generic: lookup failed",
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
