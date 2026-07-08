/**
 * Shared domain-layer types for CekDomain.ink.
 *
 * These types are used across the availability providers, the suggestion
 * engine, the API route, and the React components so the whole flow stays
 * strongly typed end to end.
 */

/**
 * The three possible outcomes of an availability lookup.
 *
 * - `available`  — the registry has no record for the domain.
 * - `registered` — the registry returned an existing record.
 * - `unknown`    — the lookup failed, timed out, or was inconclusive. We never
 *                  claim a domain is available when we are not sure.
 */
export type DomainStatus = "available" | "registered" | "unknown";

/**
 * Result of checking a single domain against an availability provider.
 */
export interface DomainAvailabilityResult {
  /** The normalized domain that was checked. */
  domain: string;
  /** True only when `status === "available"`. Convenience flag for the UI. */
  available: boolean;
  /** The resolved availability status. */
  status: DomainStatus;
  /** Optional human/debug-friendly note about how the status was resolved. */
  reason?: string;
}

/**
 * A single alternative domain suggestion returned to the client.
 */
export interface DomainSuggestion {
  domain: string;
  available: boolean;
  status: DomainStatus;
  /** Populated only for available suggestions; otherwise `null`. */
  checkoutUrl: string | null;
}

/**
 * The full payload returned by `POST /api/check-domain` on success.
 */
export interface CheckDomainResponse {
  domain: string;
  available: boolean;
  status: DomainStatus;
  message: string;
  /** Populated only when the searched domain itself is available. */
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
 * Provider contract. Every availability backend (RDAP, mock, or a future paid
 * API) implements this single method so they are interchangeable.
 */
export interface DomainAvailabilityProvider {
  /** Human-readable provider name, useful for logging/diagnostics. */
  readonly name: string;
  /** Check a single, already-normalized-and-validated domain. */
  check(domain: string): Promise<DomainAvailabilityResult>;
}
