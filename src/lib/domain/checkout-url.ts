/**
 * Build checkout URLs that carry the selected domain to the registrar.
 *
 * The base URL is configurable via `NEXT_PUBLIC_CHECKOUT_BASE_URL` so it can be
 * changed per environment without code edits. A hard-coded default keeps the
 * app working out of the box (and keeps unit tests deterministic).
 */

export const DEFAULT_CHECKOUT_BASE_URL =
  "https://marketku.id/domain/product/domain-murah-a82b6c2e-af2d-4c60-bfd7-1d33d2f71e04";

export function getCheckoutBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CHECKOUT_BASE_URL;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : DEFAULT_CHECKOUT_BASE_URL;
}

/**
 * Create a checkout URL for `domain`, appending it as a `domain` query param.
 *
 * @example
 * createCheckoutUrl("mantapnyoo.com")
 * // ".../domain-murah-a82b6c2e-af2d-4c60-bfd7-1d33d2f71e04?domain=mantapnyoo.com"
 */
export function createCheckoutUrl(domain: string): string {
  const base = getCheckoutBaseUrl();
  try {
    const url = new URL(base);
    url.searchParams.set("domain", domain);
    return url.toString();
  } catch {
    // Fallback for a malformed base URL — still produce a usable link.
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}domain=${encodeURIComponent(domain)}`;
  }
}
