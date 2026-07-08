/**
 * Validate a (preferably already-normalized) domain string.
 *
 * Returns a small result object rather than throwing so both the API route and
 * the client can render friendly messages without try/catch noise.
 *
 * Accepts: `example.com`, `nama-domain.com`, `tokoku.id`, `branddigital.net`,
 * `sub.example.com`.
 * Rejects: `abc`, `hello world.com`, `https://`, `.com`, `domain..com`,
 * `-domain.com`, `domain-.com`, `domain.c`, and anything with invalid symbols.
 */

export interface ValidateDomainResult {
  ok: boolean;
  error?: string;
}

const GENERIC_ERROR =
  "Please enter a valid domain, for example mantapnyoo.com";

/**
 * Full-domain matcher:
 * - total length 1–253 chars
 * - one or more labels of 1–63 chars, each starting/ending alphanumeric,
 *   hyphens allowed only in the middle
 * - a final alphabetic TLD of 2–24 chars
 */
const DOMAIN_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function validateDomain(domain: string): ValidateDomainResult {
  const value = String(domain ?? "").trim();

  if (!value) {
    return { ok: false, error: "Please enter a domain name." };
  }

  if (/\s/.test(value)) {
    return { ok: false, error: "Domain must not contain spaces." };
  }

  if (!value.includes(".")) {
    return {
      ok: false,
      error: "Please include an extension, for example .com or .id",
    };
  }

  if (!DOMAIN_RE.test(value.toLowerCase())) {
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true };
}
