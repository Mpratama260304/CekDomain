import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAvailabilityProvider,
  ProviderConfigError,
} from "@/lib/domain/availability-provider";
import { interpretGenericResponse } from "@/lib/domain/providers/generic-provider";
import { interpretGodaddyResponse } from "@/lib/domain/providers/godaddy-provider";
import { interpretNamecomResults } from "@/lib/domain/providers/namecom-provider";
import { UnsafeMockAvailabilityProvider } from "@/lib/domain/providers/unsafe-mock-provider";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generic provider mapping", () => {
  it("{ available: true } -> available", () => {
    expect(interpretGenericResponse({ available: true }).status).toBe("available");
  });
  it("{ available: false } -> registered", () => {
    expect(interpretGenericResponse({ available: false }).status).toBe("registered");
  });
  it('{ status: "available" } -> available', () => {
    expect(interpretGenericResponse({ status: "available" }).status).toBe("available");
  });
  it('{ status: "taken" } -> registered', () => {
    expect(interpretGenericResponse({ status: "taken" }).status).toBe("registered");
  });
  it('{ status: "premium" } -> premium', () => {
    expect(interpretGenericResponse({ status: "premium" }).status).toBe("premium");
  });
  it("ambiguous response -> unknown (never registered)", () => {
    expect(interpretGenericResponse({ foo: "bar" }).status).toBe("unknown");
    expect(interpretGenericResponse(null).status).toBe("unknown");
    expect(interpretGenericResponse("nope").status).toBe("unknown");
  });
  it("unwraps { data: {...} } and { result: {...} }", () => {
    expect(interpretGenericResponse({ data: { available: true } }).status).toBe(
      "available",
    );
    expect(
      interpretGenericResponse({ result: { status: "registered" } }).status,
    ).toBe("registered");
  });
});

describe("name.com provider mapping", () => {
  it("purchasable true -> available", () => {
    const data = {
      results: [{ domainName: "bisnisku.co", purchasable: true, premium: false }],
    };
    expect(interpretNamecomResults(data, "bisnisku.co").status).toBe("available");
  });
  it("purchasable false -> registered", () => {
    const data = { results: [{ domainName: "google.com", purchasable: false }] };
    expect(interpretNamecomResults(data, "google.com").status).toBe("registered");
  });
  it("premium -> premium", () => {
    const data = {
      results: [{ domainName: "x.com", purchasable: true, premium: true }],
    };
    expect(interpretNamecomResults(data, "x.com").status).toBe("premium");
  });
  it("not found -> unknown", () => {
    expect(interpretNamecomResults({ results: [] }, "x.com").status).toBe("unknown");
    expect(interpretNamecomResults({}, "x.com").status).toBe("unknown");
  });
});

describe("godaddy provider mapping", () => {
  it("available true -> available", () => {
    expect(
      interpretGodaddyResponse(
        { available: true, domain: "bisnisku.co", definitive: true },
        "bisnisku.co",
      ).status,
    ).toBe("available");
  });
  it("available false -> registered", () => {
    expect(
      interpretGodaddyResponse({ available: false, domain: "google.com" }, "google.com")
        .status,
    ).toBe("registered");
  });
  it("missing available -> unknown", () => {
    expect(interpretGodaddyResponse({ domain: "x.com" }, "x.com").status).toBe(
      "unknown",
    );
  });
  it("domain mismatch -> unknown", () => {
    expect(
      interpretGodaddyResponse({ available: true, domain: "other.com" }, "x.com")
        .status,
    ).toBe("unknown");
  });
  it("definitive:false -> weak confidence", () => {
    expect(
      interpretGodaddyResponse(
        { available: true, domain: "x.com", definitive: false },
        "x.com",
      ).confidence,
    ).toBe("weak");
  });
});

describe("unsafe mock provider", () => {
  it("labels every result as fake (source=mock, weak confidence)", async () => {
    const provider = new UnsafeMockAvailabilityProvider();
    const result = await provider.check("bisnisku.co");
    expect(result.source).toBe("mock");
    expect(result.confidence).toBe("weak");
    expect(result.reason).toMatch(/fake/i);
  });

  it("does not hardcode real business names as registered", async () => {
    const provider = new UnsafeMockAvailabilityProvider();
    // No forced-taken list exists anymore; results are purely hash-based and
    // always flagged as fake, so a name like bisnisku can never be an
    // authoritative "registered".
    for (const name of ["bisnisku.co", "branddigital.com", "tokoonline.net"]) {
      const r = await provider.check(name);
      expect(r.confidence).not.toBe("authoritative");
    }
  });
});

describe("provider selection safety", () => {
  it("forbids mock in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOMAIN_CHECK_PROVIDER", "mock");
    vi.stubEnv("ALLOW_MOCK_PROVIDER", "true"); // even if someone tries to force it
    expect(() => getAvailabilityProvider()).toThrow(ProviderConfigError);
    expect(() => getAvailabilityProvider()).toThrow(
      "Mock domain provider is disabled in production.",
    );
  });

  it("does not falsely mark bisnisku.co as registered via mock in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOMAIN_CHECK_PROVIDER", "mock");
    // Mock cannot even be instantiated in production, so it can never produce a
    // fake "registered" result for a real, available domain.
    expect(() => getAvailabilityProvider()).toThrow(ProviderConfigError);
  });

  it("fails closed when the registrar API is not configured", () => {
    vi.stubEnv("DOMAIN_CHECK_PROVIDER", "registrar");
    vi.stubEnv("REGISTRAR_API_PROVIDER", "generic");
    vi.stubEnv("REGISTRAR_API_URL", "");
    vi.stubEnv("NAMECOM_USERNAME", "");
    vi.stubEnv("NAMECOM_API_TOKEN", "");
    expect(() => getAvailabilityProvider()).toThrow(
      "Registrar availability API is not configured.",
    );
  });

  it("requires an explicit flag for mock even in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DOMAIN_CHECK_PROVIDER", "mock");
    vi.stubEnv("ALLOW_MOCK_PROVIDER", "false");
    expect(() => getAvailabilityProvider()).toThrow(ProviderConfigError);
  });
});
