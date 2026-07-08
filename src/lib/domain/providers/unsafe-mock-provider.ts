import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "../types";

/**
 * ⚠️ UNSAFE MOCK PROVIDER — PRODUCES FAKE RESULTS.
 *
 * FOR AUTOMATED TESTS AND EXPLICIT OFFLINE DEV ONLY. It never touches the
 * network and its results are NOT real. It must never be used in production and
 * must never be the default. There is deliberately NO hardcoded "taken" list of
 * real business names (that caused false "registered" results for names like
 * bisnisku/branddigital/tokoonline).
 *
 * Every result is flagged `source: "mock"`, `confidence: "weak"`, with a reason
 * that says the value is fake so it can never be mistaken for authoritative.
 */

let warned = false;
function warnOnce(): void {
  if (warned) return;
  warned = true;
  // Loud, unmistakable warning.
  console.warn(
    "WARNING: MOCK DOMAIN CHECKER ACTIVE — RESULTS ARE FAKE. DO NOT USE IN PRODUCTION.",
  );
}

/** Small, fast FNV-1a hash for stable pseudo-random (fake) availability. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class UnsafeMockAvailabilityProvider
  implements DomainAvailabilityProvider
{
  readonly name = "mock";

  constructor() {
    warnOnce();
  }

  async check(domain: string): Promise<DomainAvailabilityResult> {
    // Purely deterministic pseudo-random — NO real business names are forced.
    const available = hashStr(domain) % 100 < 55;
    return {
      domain,
      available,
      status: available ? "available" : "registered",
      source: this.name,
      confidence: "weak",
      reason: "FAKE mock result — not a real availability check",
    };
  }
}
