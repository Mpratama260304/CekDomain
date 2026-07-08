import { NextResponse } from "next/server";
import { z } from "zod";

import {
  checkMany,
  getAvailabilityProvider,
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
const UNKNOWN_MESSAGE =
  "We couldn't confirm this domain's availability right now. Please try again or continue checking alternatives.";

const RequestSchema = z.object({
  domain: z.string({ required_error: "Domain is required" }).min(1).max(255),
});

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

/** How many suggestion candidates we actually verify upstream per request. */
function suggestionCheckLimit(): number {
  return envInt("SUGGESTION_CHECK_LIMIT", 8);
}
/** How many suggestions we return to the client. */
function suggestionReturnLimit(): number {
  return envInt("SUGGESTION_RETURN_LIMIT", 6);
}
/** Parallelism for upstream suggestion checks. */
function suggestionConcurrency(): number {
  return envInt("SUGGESTION_CHECK_CONCURRENCY", 3);
}

function invalidResponse() {
  return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
}

function statusRank(status: DomainStatus): number {
  // Available first, then unknown, then registered.
  if (status === "available") return 0;
  if (status === "unknown") return 1;
  return 2;
}

/**
 * Generate candidate alternatives, verify a bounded subset with the provider,
 * and return the best few (available first). Same TLD is guaranteed by the
 * suggestion engine. Only called for REGISTERED domains.
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
      available: r.available,
      status: r.status,
      checkoutUrl: r.available ? createCheckoutUrl(r.domain) : null,
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
  // Re-validate the reduced domain defensively.
  if (!validateDomain(domain).ok) {
    return invalidResponse();
  }

  // --- run the availability check ---------------------------------------
  try {
    const provider = getAvailabilityProvider();
    const main = await provider.check(domain);

    if (main.status === "available") {
      const response: CheckDomainResponse = {
        domain,
        available: true,
        status: "available",
        message: "Domain is available for registration",
        checkoutUrl: createCheckoutUrl(domain),
        suggestions: [],
      };
      return NextResponse.json(response, { status: 200 });
    }

    if (main.status === "unknown") {
      // Inconclusive: never claim availability, never show checkout, and don't
      // fan out more (possibly failing) upstream calls for suggestions.
      const response: CheckDomainResponse = {
        domain,
        available: false,
        status: "unknown",
        message: UNKNOWN_MESSAGE,
        checkoutUrl: null,
        suggestions: [],
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Registered: offer same-TLD alternatives.
    const suggestions = await buildSuggestions(provider, domain);
    const response: CheckDomainResponse = {
      domain,
      available: false,
      status: "registered",
      message: "Domain is already registered",
      checkoutUrl: null,
      suggestions,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Real server failure only — never leak internals to the client.
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
