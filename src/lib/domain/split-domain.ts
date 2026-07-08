/**
 * Split a domain into its registrable label (`name`), its top-level domain
 * (`tld`), and any leading `subdomain`.
 *
 * A small allow-list of well-known multi-part suffixes (e.g. `co.id`, `co.uk`)
 * is handled so that suggestions keep the correct extension. This is a
 * pragmatic subset — not a full public-suffix list — which is enough for the
 * TLDs this product targets.
 *
 * @example
 * splitDomain("branddigital.com")  // { name: "branddigital", tld: "com", subdomain: "" }
 * splitDomain("sub.example.com")   // { name: "example", tld: "com", subdomain: "sub" }
 * splitDomain("tokoku.co.id")      // { name: "tokoku", tld: "co.id", subdomain: "" }
 */
export interface SplitDomain {
  /** The registrable second-level label, e.g. `branddigital`. */
  name: string;
  /** The effective top-level domain, e.g. `com` or `co.id`. */
  tld: string;
  /** Any labels before the registrable label, joined by dots. `""` if none. */
  subdomain: string;
}

const MULTI_PART_TLDS = new Set([
  // Indonesia
  "co.id",
  "or.id",
  "ac.id",
  "go.id",
  "my.id",
  "web.id",
  "sch.id",
  "biz.id",
  "net.id",
  "desa.id",
  // United Kingdom
  "co.uk",
  "org.uk",
  "me.uk",
  "ltd.uk",
  "plc.uk",
  // Australia
  "com.au",
  "net.au",
  "org.au",
  // Other common
  "com.sg",
  "com.my",
  "com.br",
]);

export function splitDomain(domain: string): SplitDomain {
  const clean = String(domain || "")
    .toLowerCase()
    .replace(/\.+$/, "");
  const labels = clean.split(".").filter(Boolean);

  if (labels.length < 2) {
    return { name: clean, tld: "", subdomain: "" };
  }

  const lastTwo = labels.slice(-2).join(".");
  const tldParts = labels.length >= 3 && MULTI_PART_TLDS.has(lastTwo) ? 2 : 1;

  const tld = labels.slice(labels.length - tldParts).join(".");
  const rest = labels.slice(0, labels.length - tldParts);
  const name = rest[rest.length - 1] ?? "";
  const subdomain = rest.slice(0, rest.length - 1).join(".");

  return { name, tld, subdomain };
}

/**
 * Reduce any input to its registrable domain (drops subdomains).
 *
 * A registration checker should look up the domain a user can actually buy —
 * `example.com`, not `sub.example.com`. Multi-part TLDs are preserved.
 *
 * @example
 * toRegistrableDomain("sub.example.com")     // "example.com"
 * toRegistrableDomain("blog.tokoku.co.id")   // "tokoku.co.id"
 * toRegistrableDomain("tokoku.co.id")        // "tokoku.co.id"
 * toRegistrableDomain("example.com")         // "example.com"
 */
export function toRegistrableDomain(domain: string): string {
  const { name, tld } = splitDomain(domain);
  // If we can't confidently split (e.g. invalid input), leave it untouched so
  // validation can reject it downstream.
  if (!name || !tld) return String(domain || "");
  return `${name}.${tld}`;
}
