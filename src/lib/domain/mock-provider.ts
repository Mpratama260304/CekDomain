import { splitDomain } from "./split-domain";
import type {
  DomainAvailabilityProvider,
  DomainAvailabilityResult,
} from "./types";

/**
 * Deterministic mock availability provider.
 *
 * FOR LOCAL DEVELOPMENT / TESTING ONLY. It never touches the network, so the
 * whole UX flow (available, registered, suggestions, checkout) can be exercised
 * offline and in unit tests. Results are stable for a given domain so the UI
 * behaves consistently across reloads.
 *
 * Production deployments should use the RDAP provider (or a paid API provider).
 */

/** Well-known names that should always read as registered in the demo. */
const FORCE_TAKEN = new Set([
  "google",
  "facebook",
  "youtube",
  "amazon",
  "apple",
  "microsoft",
  "cekdomain",
  "tokoonline",
  "branddigital",
  "bisnisku",
  "github",
  "netflix",
]);

/** Small, fast FNV-1a hash for stable pseudo-random availability. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class MockAvailabilityProvider implements DomainAvailabilityProvider {
  readonly name = "mock";

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const { name } = splitDomain(domain);

    const forcedTaken = FORCE_TAKEN.has(name);
    // ~55% of names read as available in the mock baseline.
    const available = !forcedTaken && hashStr(domain) % 100 < 55;

    return {
      domain,
      available,
      status: available ? "available" : "registered",
      reason: "mock provider (development only)",
    };
  }
}
