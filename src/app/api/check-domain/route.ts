import { NextResponse } from "next/server";
import { z } from "zod";

import {
  checkMany,
  getAvailabilityProvider,
} from "@/lib/domain/availability-provider";
import { createCheckoutUrl } from "@/lib/domain/checkout-url";
import { normalizeDomain } from "@/lib/domain/normalize-domain";
import { generateDomainSuggestions } from "@/lib/domain/suggestion-engine";
import { validateDomain } from "@/lib/domain/validate-domain";
import type {
  CheckDomainResponse,
  DomainAvailabilityProvider,
  DomainStatus,
  DomainSuggestion,
} from "@/lib/domain/types";

// RDAP fetch + AbortController run best on the Node.js runtime.
export const runtime = "nodejs";
// Availability is always live — never cache these responses.
export const dynamic = "force-dynamic";

const INVALID_MESSAGE =
  "Please enter a valid domain, for example mantapnyoo.com";

const RequestSchema = z.object({
  domain: z.string({ required_error: "Domain is required" }).min(1).max(255),
});

/** How many suggestion candidates we actually verify upstream per request. */
const SUGGESTION_CHECK_LIMIT = 12;
/** How many suggestions we return to the client. */
const SUGGESTION_RETURN_LIMIT = 8;

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
 * and return the best 6–10 (available first). Same TLD is guaranteed by the
 * suggestion engine.
 */
async function buildSuggestions(
  provider: DomainAvailabilityProvider,
  domain: string,
): Promise<DomainSuggestion[]> {
  const candidates = generateDomainSuggestions(domain);
  if (candidates.length === 0) return [];

  const toCheck = candidates.slice(0, SUGGESTION_CHECK_LIMIT);
  const results = await checkMany(provider, toCheck, 4);

  return results
    .map<DomainSuggestion>((r) => ({
      domain: r.domain,
      available: r.available,
      status: r.status,
      checkoutUrl: r.available ? createCheckoutUrl(r.domain) : null,
    }))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status))
    .slice(0, SUGGESTION_RETURN_LIMIT);
}

export async function POST(request: Request): Promise<Response> {
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

  const normalized = normalizeDomain(parsed.data.domain);
  const validation = validateDomain(normalized);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error ?? INVALID_MESSAGE },
      { status: 400 },
    );
  }

  // --- run the availability check ---------------------------------------
  try {
    const provider = getAvailabilityProvider();
    const main = await provider.check(normalized);

    if (main.status === "available") {
      const response: CheckDomainResponse = {
        domain: normalized,
        available: true,
        status: "available",
        message: "Domain is available for registration",
        checkoutUrl: createCheckoutUrl(normalized),
        suggestions: [],
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Registered or unknown: always offer same-TLD alternatives.
    const suggestions = await buildSuggestions(provider, normalized);

    const response: CheckDomainResponse =
      main.status === "registered"
        ? {
            domain: normalized,
            available: false,
            status: "registered",
            message: "Domain is already registered",
            checkoutUrl: null,
            suggestions,
          }
        : {
            domain: normalized,
            available: false,
            status: "unknown",
            message:
              "We couldn't confirm this domain's availability right now. Try an alternative below or check again.",
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
