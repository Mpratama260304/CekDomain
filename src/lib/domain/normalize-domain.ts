/**
 * Normalize arbitrary user input into a clean, comparable domain string.
 *
 * Handles common paste patterns: full URLs, protocols, `www.`, paths, query
 * strings, hashes, and stray whitespace / trailing punctuation.
 *
 * @example
 * normalizeDomain("HTTPS://WWW.Mantapnyoo.COM/path?x=1") // "mantapnyoo.com"
 * normalizeDomain("www.branddigital.com/abc")            // "branddigital.com"
 * normalizeDomain("tokoku.id")                            // "tokoku.id"
 */
export function normalizeDomain(input: string): string {
  if (!input) return "";

  let domain = String(input).trim().toLowerCase();

  // Strip protocol (http, https, ftp, and protocol-relative "//").
  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  domain = domain.replace(/^\/\//, "");

  // Strip a leading "www." host label.
  domain = domain.replace(/^www\./, "");

  // Drop anything after the host: path, query, or hash.
  domain = domain.split(/[/?#]/)[0];

  // Remove credentials or port if present (user:pass@host or host:port).
  domain = domain.split("@").pop() ?? domain;
  domain = domain.split(":")[0];

  // Collapse trailing dots and stray whitespace.
  domain = domain.replace(/\.+$/, "").trim();

  return domain;
}
