import { NextResponse } from "next/server";
import { z } from "zod";

import {
  checkMany,
  getAvailabilityProvider,
  ProviderConfigError,
} from "@/lib/domain/availability-provider";
import { createCheckoutUrl } from "@/lib/domain/checkout-url";
import { normalizeDomain } from "@/lib/domain/normalize-domain";
import { toRegistrableDomain } from "@/lib/domain/split-domain";
import { generateDomainSuggestions } from "@/lib/domain/suggestion-engine";
import { validateDomain } from "@/lib/domain/validate-domain";
import type {
  CheckDomainResponse,
  DomainAvailabilityProvider,
  DomainStatus,
  DomainSuggestion,
} from "@/lib/domain/types";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// RDAP fetch + AbortController run best on the Node.js runtime.
export const runtime = "nodejs";
// Availability is always live — never cache these responses.
export const dynamic = "force-dynamic";

const INVALID_MESSAGE =
  "Please enter a valid domain, for example mantapnyoo.com";
const RATE_LIMIT_MESSAGE =
  "Too many requests. Please wait a moment and try again.";

const MESSAGES: Record<DomainStatus, string> = {
  available: "Great news! This domain is available.",
  registered: "This domain is already registered.",
  premium: "This domain may be available as a premium domain.",
  reserved:
    "This domain is reserved and may not be available for normal registration.",
  unsupported: "This extension is not supported by our checker yet.",
  invalid: INVALID_MESSAGE,
  unknown: "We couldn't confirm this domain's availability right now.",
};

const RequestSchema = z.object({
  domain: z.string({ required_error: "Domain is required" }).min(1).max(255),
});

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

const suggestionCheckLimit = () => envInt("SUGGESTION_CHECK_LIMIT", 8);
const suggestionReturnLimit = () => envInt("SUGGESTION_RETURN_LIMIT", 6);
const suggestionConcurrency = () => envInt("SUGGESTION_CHECK_CONCURRENCY", 3);

function invalidResponse() {
  return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
}

/** Whether a status means the domain can proceed to checkout. */
function isRegistrable(status: DomainStatus): boolean {
  return status === "available" || status === "premium";
}

function statusRank(status: DomainStatus): number {
  if (status === "available") return 0;
  if (status === "premium") return 1;
  if (status === "unknown") return 2;
  return 3; // registered / reserved / unsupported / invalid
}

/**
 * Generate candidate alternatives, verify a bounded subset with the SAME
 * provider (never mock/RDAP-only in production), and return the best few —
 * available first, same TLD. Only called for REGISTERED domains.
 */
async function buildSuggestions(
  provider: DomainAvailabilityProvider,
  domain: string,
): Promise<DomainSuggestion[]> {
  const candidates = generateDomainSuggestions(domain);
  if (candidates.length === 0) return [];

  const toCheck = candidates.slice(0, suggestionCheckLimit());
  const results = await checkMany(provider, toCheck, suggestionConcurrency());

  return results
    .map<DomainSuggestion>((r) => ({
      domain: r.domain,
      available: r.status === "available",
      status: r.status,
      source: r.source,
      confidence: r.confidence,
      // Checkout only for confirmed-available suggestions — never for unknown.
      checkoutUrl: r.status === "available" ? createCheckoutUrl(r.domain) : null,
    }))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status))
    .slice(0, suggestionReturnLimit());
}

export async function POST(request: Request): Promise<Response> {
  // --- rate limiting (per client IP) ------------------------------------
  const limit = rateLimit(`check-domain:${getClientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  // --- parse + validate input -------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidResponse();
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidResponse();
  }

  // Clean, then reduce to the registrable domain (drops subdomains like
  // "sub.example.com" -> "example.com"; keeps multi-part TLDs intact).
  const cleaned = normalizeDomain(parsed.data.domain);
  const validation = validateDomain(cleaned);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error ?? INVALID_MESSAGE },
      { status: 400 },
    );
  }
  const domain = toRegistrableDomain(cleaned);
  if (!validateDomain(domain).ok) {
    return invalidResponse();
  }

  // --- resolve provider (fail closed on misconfiguration) ---------------
  let provider: DomainAvailabilityProvider;
  try {
    provider = getAvailabilityProvider();
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      // e.g. mock-in-production, missing registrar credentials, rdap-only-in-prod.
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[check-domain] provider init error:", error);
    return NextResponse.json(
      { error: "Domain checker is misconfigured. Please try again later." },
      { status: 500 },
    );
  }

  // --- run the availability check ---------------------------------------
  try {
    const main = await provider.check(domain);
    const status = main.status;

    const suggestions =
      status === "registered" ? await buildSuggestions(provider, domain) : [];

    const response: CheckDomainResponse = {
      domain,
      available: status === "available",
      status,
      source: main.source,
      confidence: main.confidence,
      message: MESSAGES[status] ?? MESSAGES.unknown,
      checkoutUrl: isRegistrable(status) ? createCheckoutUrl(domain) : null,
      suggestions,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[check-domain] unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong while checking this domain. Please try again." },
      { status: 500 },
    );
  }
}

/** Friendly guard so accidental GETs return a clear message instead of 500. */
export async function GET() {
  return NextResponse.json(
    { error: "Use POST with a JSON body: { \"domain\": \"example.com\" }" },
    { status: 405 },
  );
}
