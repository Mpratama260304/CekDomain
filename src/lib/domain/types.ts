/**
 * Shared domain-layer types for CekDomain.ink.
 *
 * Used across availability providers, the suggestion engine, the API route, and
 * the React components so the whole flow stays strongly typed end to end.
 */

/**
 * Availability outcome for a domain.
 *
 * - `available`   — confirmed registrable.
 * - `registered`  — confirmed already registered.
 * - `premium`     — available but sold as a premium (special pricing).
 * - `reserved`    — reserved by the registry; usually not normally registrable.
 * - `invalid`     — not a valid domain (should be caught before the provider).
 * - `unsupported` — the extension/TLD isn't supported by the active checker.
 * - `unknown`     — inconclusive (timeout, rate-limit, ambiguous response).
 *
 * We NEVER claim `available` unless the source clearly says so, and NEVER claim
 * `registered` on ambiguity — ambiguity always becomes `unknown`.
 */
export type DomainStatus =
  | "available"
  | "registered"
  | "premium"
  | "reserved"
  | "invalid"
  | "unsupported"
  | "unknown";

/** How much we trust a given result. */
export type DomainConfidence = "authoritative" | "strong" | "weak" | "unknown";

/**
 * Result of checking a single domain against an availability provider.
 */
export interface DomainAvailabilityResult {
  /** The normalized domain that was checked. */
  domain: string;
  /** True only when the domain can be registered right now (`available`). */
  available: boolean;
  /** The resolved availability status. */
  status: DomainStatus;
  /** Which provider produced this result (e.g. `namecom`, `rdap`, `mock`). */
  source: string;
  /** How authoritative the result is. */
  confidence: DomainConfidence;
  /** Optional price (in the smallest sensible unit the source returns). */
  price?: number | null;
  /** ISO currency code for `price`, when known. */
  currency?: string | null;
  /** Human/debug-friendly note about how the status was resolved. */
  reason?: string;
  /** Raw upstream payload, for debugging (never sent to the client). */
  raw?: unknown;
}

/**
 * A single alternative domain suggestion returned to the client.
 */
export interface DomainSuggestion {
  domain: string;
  available: boolean;
  status: DomainStatus;
  source: string;
  confidence: DomainConfidence;
  /** Populated only for available (non-premium) suggestions; otherwise `null`. */
  checkoutUrl: string | null;
}

/**
 * The full payload returned by `POST /api/check-domain` on success.
 */
export interface CheckDomainResponse {
  domain: string;
  available: boolean;
  status: DomainStatus;
  source: string;
  confidence: DomainConfidence;
  message: string;
  /** Populated only when the searched domain is registrable (available/premium). */
  checkoutUrl: string | null;
  suggestions: DomainSuggestion[];
}

/**
 * Error payload returned by the API for invalid input or server failures.
 */
export interface CheckDomainErrorResponse {
  error: string;
}

/**
 * Provider contract. Every availability backend (registrar adapters, RDAP, or
 * the unsafe mock) implements this so they are interchangeable.
 */
export interface DomainAvailabilityProvider {
  /** Machine-readable provider/source name, used for logging + the `source` field. */
  readonly name: string;
  /** Check a single, already-normalized-and-validated domain. */
  check(domain: string): Promise<DomainAvailabilityResult>;
  /** Optional batch check; the factory provides a fallback when absent. */
  checkMany?(domains: string[]): Promise<DomainAvailabilityResult[]>;
}
