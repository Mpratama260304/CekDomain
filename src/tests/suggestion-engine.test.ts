import { describe, expect, it } from "vitest";

import { splitDomain } from "@/lib/domain/split-domain";
import { generateDomainSuggestions } from "@/lib/domain/suggestion-engine";

const labelOf = (fullDomain: string, tld: string) =>
  fullDomain.slice(0, fullDomain.length - (tld.length + 1));

describe("generateDomainSuggestions", () => {
  it("generates a healthy pool of candidates (>= 20)", () => {
    const suggestions = generateDomainSuggestions("branddigital.com");
    expect(suggestions.length).toBeGreaterThanOrEqual(20);
  });

  it("keeps the same TLD as the searched domain", () => {
    for (const domain of ["branddigital.com", "tokoonline.id", "usaha.net"]) {
      const { tld } = splitDomain(domain);
      const suggestions = generateDomainSuggestions(domain);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const suggestion of suggestions) {
        expect(suggestion.endsWith(`.${tld}`)).toBe(true);
      }
    }
  });

  it("never returns duplicate suggestions", () => {
    const suggestions = generateDomainSuggestions("branddigital.com");
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });

  it("never suggests the original domain", () => {
    const suggestions = generateDomainSuggestions("branddigital.com");
    expect(suggestions).not.toContain("branddigital.com");
  });

  it("respects the 24-character label limit before the TLD", () => {
    const domain = "abcdefghijklmnopqrst.com"; // 20-char base
    const { tld } = splitDomain(domain);
    const suggestions = generateDomainSuggestions(domain);
    for (const suggestion of suggestions) {
      const label = labelOf(suggestion, tld);
      expect(label.length).toBeLessThanOrEqual(24);
      expect(label.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("prefers readable names over numeric fallbacks", () => {
    const suggestions = generateDomainSuggestions("branddigital.com");
    // The first suggestion should be a readable, brandable name — not a
    // number-suffixed fallback.
    expect(/[a-z]\.com$/.test(suggestions[0])).toBe(true);
  });

  it("produces brandable, readable names", () => {
    const suggestions = generateDomainSuggestions("branddigital.com");
    expect(suggestions).toContain("branddigitalhub.com");
  });

  it("returns an empty array for invalid input", () => {
    expect(generateDomainSuggestions("")).toEqual([]);
    expect(generateDomainSuggestions("nodot")).toEqual([]);
  });
});
