import { describe, expect, it } from "vitest";

import {
  createCheckoutUrl,
  DEFAULT_CHECKOUT_BASE_URL,
} from "@/lib/domain/checkout-url";
import { normalizeDomain } from "@/lib/domain/normalize-domain";
import { splitDomain } from "@/lib/domain/split-domain";
import { validateDomain } from "@/lib/domain/validate-domain";

describe("normalizeDomain", () => {
  it("strips protocol, www, path, query and hash, and lowercases", () => {
    expect(normalizeDomain("HTTPS://WWW.Mantapnyoo.COM/path?x=1")).toBe(
      "mantapnyoo.com",
    );
    expect(normalizeDomain("www.branddigital.com/abc")).toBe(
      "branddigital.com",
    );
    expect(normalizeDomain("http://sub.example.com#section")).toBe(
      "sub.example.com",
    );
  });

  it("keeps already-clean domains intact", () => {
    expect(normalizeDomain("tokoku.id")).toBe("tokoku.id");
    expect(normalizeDomain("branddigital.net")).toBe("branddigital.net");
  });

  it("trims whitespace, trailing dots, and ports/credentials", () => {
    expect(normalizeDomain("   Example.COM   ")).toBe("example.com");
    expect(normalizeDomain("example.com.")).toBe("example.com");
    expect(normalizeDomain("example.com:8080")).toBe("example.com");
    expect(normalizeDomain("user:pass@example.com/path")).toBe("example.com");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeDomain("")).toBe("");
    expect(normalizeDomain("   ")).toBe("");
  });
});

describe("validateDomain", () => {
  it.each([
    "example.com",
    "nama-domain.com",
    "tokoku.id",
    "branddigital.net",
    "sub.example.com",
    "a1-b2.co.id",
  ])("accepts valid domain %s", (domain) => {
    expect(validateDomain(domain).ok).toBe(true);
  });

  it.each([
    "abc",
    "hello world.com",
    "https://",
    ".com",
    "domain..com",
    "-domain.com",
    "domain-.com",
    "domain.c",
    "domain!.com",
    "",
  ])("rejects invalid domain %s", (domain) => {
    expect(validateDomain(domain).ok).toBe(false);
  });

  it("returns a helpful error message on failure", () => {
    const result = validateDomain("nope");
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

describe("splitDomain", () => {
  it("splits a simple domain", () => {
    expect(splitDomain("branddigital.com")).toEqual({
      name: "branddigital",
      tld: "com",
      subdomain: "",
    });
  });

  it("extracts the registrable label from a subdomain", () => {
    expect(splitDomain("sub.example.com")).toEqual({
      name: "example",
      tld: "com",
      subdomain: "sub",
    });
  });

  it("handles multi-part TLDs", () => {
    expect(splitDomain("tokoku.co.id")).toEqual({
      name: "tokoku",
      tld: "co.id",
      subdomain: "",
    });
  });
});

describe("createCheckoutUrl", () => {
  it("appends the domain as a query parameter to the default base", () => {
    expect(createCheckoutUrl("mantapnyoo.com")).toBe(
      `${DEFAULT_CHECKOUT_BASE_URL}?domain=mantapnyoo.com`,
    );
  });

  it("always includes the selected domain", () => {
    const url = createCheckoutUrl("branddigitalhub.com");
    expect(url).toContain("domain=branddigitalhub.com");
    expect(url.startsWith(DEFAULT_CHECKOUT_BASE_URL)).toBe(true);
  });
});
