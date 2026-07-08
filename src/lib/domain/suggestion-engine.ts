import { splitDomain } from "./split-domain";

/**
 * Suggestion engine.
 *
 * Produces a large, ordered pool of *candidate* alternative domains that all
 * share the searched domain's TLD. Availability is intentionally NOT decided
 * here — that happens server-side in the API route via a real provider. This
 * module only decides which names are worth checking and in what priority.
 *
 * Ordering (best first):
 *   1. base + natural/readable suffix
 *   2. base + Indonesian-friendly suffix
 *   3. base + short brandable tail
 *   4. prefix + base
 *   5. base + number  (fallback only — never the primary ideas)
 */

/** Readable, brandable English suffixes. */
const SUFFIXES = [
  "hub",
  "lab",
  "pro",
  "app",
  "web",
  "site",
  "store",
  "digital",
  "online",
  "studio",
  "works",
  "media",
  "space",
  "cloud",
  "tech",
  "tools",
  "group",
  "center",
  "market",
  "ku",
  "id",
];

/** Indonesian-friendly suffixes for local branding. */
const ID_SUFFIXES = [
  "kita",
  "kamu",
  "aja",
  "murah",
  "cepat",
  "lokal",
  "usaha",
  "toko",
  "bisnis",
];

/** Short, punchy brandable tails. */
const BRANDABLE = ["hq", "now", "spot", "zone", "kit", "base", "point", "link", "up", "fy"];

/** Common, memorable prefixes. */
const PREFIXES = ["get", "try", "use", "go", "hey", "join", "the", "my", "hello", "super"];

/** Numeric fallbacks — only used when nothing better fits. */
const NUMBERS = ["24", "88", "7", "99", "21"];

const MIN_LABEL_LENGTH = 3;
const MAX_LABEL_LENGTH = 24; // characters before the TLD
const MAX_CANDIDATES = 24; // always >= 20 candidates for the provider to check

/**
 * Generate an ordered list of candidate alternative domains for a taken domain.
 *
 * All candidates keep the same TLD as `domain`, are de-duplicated, skip the
 * original name, and respect the label length limits.
 *
 * @returns full candidate domains, e.g. `["branddigitalhub.com", ...]`
 */
export function generateDomainSuggestions(domain: string): string[] {
  const { name, tld } = splitDomain(domain);
  if (!name || !tld) return [];

  // Clean base label: drop hyphens/non-alphanumerics for readable brand names.
  const base = name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!base) return [];

  const seen = new Set<string>([base]); // never suggest the exact same label
  const readable: string[] = [];
  const numeric: string[] = [];

  const push = (label: string, isNumeric = false) => {
    if (label.length < MIN_LABEL_LENGTH || label.length > MAX_LABEL_LENGTH) return;
    if (seen.has(label)) return;
    seen.add(label);
    (isNumeric ? numeric : readable).push(label);
  };

  // 1. Natural/readable suffixes.
  for (const s of SUFFIXES) push(base + s);
  // 2. Indonesian-friendly suffixes.
  for (const s of ID_SUFFIXES) push(base + s);
  // 3. Short brandable tails.
  for (const b of BRANDABLE) push(base + b);
  // 4. Prefixes.
  for (const p of PREFIXES) push(p + base);
  // 5. Number fallbacks (kept separate so they always sort last).
  for (const n of NUMBERS) push(base + n, true);

  const ordered = [...readable, ...numeric].slice(0, MAX_CANDIDATES);
  return ordered.map((label) => `${label}.${tld}`);
}
