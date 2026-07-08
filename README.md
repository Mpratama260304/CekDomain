# CekDomain.ink

A production-ready, full-stack **domain availability checker**. Type a domain
like `mantapnyoo.com`, `branddigital.com`, `bisnisku.id`, or `tokoonline.net` —
CekDomain.ink tells you instantly whether it's available, suggests brandable
alternatives on the **same TLD** when it's taken, and sends you to checkout with
the domain pre-filled.

## Tech stack

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** for styling
- **Zod** for request validation
- **Lucide React** for icons
- **Vitest** for unit tests
- Server-side availability via **RDAP** (no API keys required), with a
  deterministic **mock** provider for local development

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Local development (offline mock provider):
cp .env.local.example .env.local
#    Production-like (real RDAP lookups):
#    cp .env.example .env.local   # then edit as needed

# 3. Run the dev server
npm run dev
# open http://localhost:3000

# Other scripts
npm run build      # production build (no Google Fonts fetch required)
npm run start      # run the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # vitest unit tests
```

## Provider modes (important)

`DOMAIN_CHECK_PROVIDER` selects how availability is checked — **server-side only**:

| Value      | Meaning                                                                 | Use in production?          |
| ---------- | ----------------------------------------------------------------------- | --------------------------- |
| `rdap`     | **Real** availability via the public RDAP protocol (no API keys needed) | ✅ Yes (default)            |
| `mock`     | **Fake** deterministic results for local demo/testing only              | ❌ **Never** in production  |
| `external` | Paid/third-party API (needs `DOMAIN_API_URL` + `DOMAIN_API_KEY`)        | ✅ Optional                 |

- Production must use `rdap` (or `external`). **Do not deploy with `mock`.**
- `.env.example` is the production-like template and uses `rdap`.
- `.env.local.example` is the local template and uses `mock`.
- If `external` is selected but its env vars are missing, the app logs a warning
  and safely falls back to `rdap`.

## Environment variables

| Variable                        | Description                                                      | Default                 |
| ------------------------------- | --------------------------------------------------------------- | ----------------------- |
| `DOMAIN_CHECK_PROVIDER`         | `rdap` (real) · `mock` (dev only) · `external` (paid API)       | `rdap`                  |
| `DOMAIN_CHECK_TIMEOUT_MS`       | Upstream lookup timeout in milliseconds                         | `5000`                  |
| `NEXT_PUBLIC_CHECKOUT_BASE_URL` | Checkout base URL; the domain is appended as `?domain=`         | marketku.id link        |
| `NEXT_PUBLIC_SITE_URL`          | Canonical site URL for SEO metadata                             | `https://cekdomain.ink` |
| `SUGGESTION_CHECK_LIMIT`        | Suggestion candidates verified upstream per registered search   | `8`                     |
| `SUGGESTION_RETURN_LIMIT`       | Suggestions returned to the client (available first)           | `6`                     |
| `SUGGESTION_CHECK_CONCURRENCY`  | Parallel upstream suggestion checks                            | `3`                     |
| `RATE_LIMIT_MAX`                | Max `/api/check-domain` requests per IP per window             | `20`                    |
| `RATE_LIMIT_WINDOW_MS`          | Rate-limit window in milliseconds                              | `60000`                 |
| `DOMAIN_API_URL` / `DOMAIN_API_KEY` | Paid provider config (server-only; used when `external`)   | —                       |

Availability results are cached in-memory server-side for ~5 minutes to reduce
upstream load (main check + suggestion checks). Secrets are never exposed to the
client (only `NEXT_PUBLIC_*` values reach the browser).

## API

`POST /api/check-domain`

```jsonc
// request
{ "domain": "branddigital.com" }

// 200 — registered, with same-TLD alternatives
{
  "domain": "branddigital.com",
  "available": false,
  "status": "registered",
  "message": "Domain is already registered",
  "checkoutUrl": null,
  "suggestions": [
    { "domain": "branddigitalhub.com", "available": true, "status": "available", "checkoutUrl": "https://…?domain=branddigitalhub.com" }
  ]
}

// 400 — invalid input
{ "error": "Please enter a valid domain, for example mantapnyoo.com" }
```

Status codes: `200` for a valid check, `400` for invalid input, `500` for a
real server failure.

## Project structure

```txt
src/
  app/
    layout.tsx            # system-font stacks, SEO metadata, header/footer, chrome
    page.tsx              # landing page composition
    not-found.tsx         # custom 404 page
    globals.css           # Tailwind layers + decorative background
    icon.svg  favicon.ico # brand icons
    api/check-domain/route.ts   # rate limit -> validate -> registrable -> check
  components/
    Header.tsx  HeroSearch.tsx  DomainSearchForm.tsx
    DomainResultCard.tsx  DomainSuggestionCard.tsx
    FeaturesSection.tsx  HowItWorksSection.tsx  FAQSection.tsx  Footer.tsx
    ui/  Button.tsx  Card.tsx  Badge.tsx
  lib/
    domain/  normalize-domain.ts  validate-domain.ts  split-domain.ts
             checkout-url.ts  suggestion-engine.ts  types.ts
             availability-provider.ts  availability-cache.ts
             rdap-provider.ts  mock-provider.ts  external-api-provider.ts
    rate-limit.ts  utils.ts
  tests/  domain-utils.test.ts  suggestion-engine.test.ts

reference/cekdomain.html   # original single-file prototype (design reference only)
```

## Notes on correctness

- **No stale state:** the search input is the single source of truth; every
  search atomically replaces the result, and in-flight requests are cancelled
  with `AbortController` + a request-id guard, so an older search can never
  overwrite a newer one.
- **Server-side checks only:** availability logic and any secrets stay on the
  server. The browser never runs the availability engine.
- **Honest results:** when a lookup is inconclusive we report `unknown` (no
  checkout button, retry offered) rather than falsely claiming availability.
- **Registrable domains:** subdomains are reduced before checking
  (`sub.example.com` → `example.com`), preserving multi-part TLDs
  (`blog.tokoku.co.id` → `tokoku.co.id`).
- **Fonts:** the build never fetches Google Fonts — the UI uses system-font
  stacks (Inter/Manrope sans, Georgia display, JetBrains Mono/monospace).
- **Abuse protection:** per-IP rate limiting (429) plus a short in-memory cache
  keep upstream RDAP usage low. Final ownership is only confirmed by the
  registrar at checkout.