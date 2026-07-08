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

# 2. Configure environment (defaults to the offline mock provider)
cp .env.example .env.local

# 3. Run the dev server
npm run dev
# open http://localhost:3000

# Other scripts
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # vitest unit tests
```

## Environment variables

| Variable                        | Description                                              | Default                 |
| ------------------------------- | -------------------------------------------------------- | ----------------------- |
| `DOMAIN_CHECK_PROVIDER`         | `rdap` (real, key-less) or `mock` (development only)     | `rdap`                  |
| `DOMAIN_CHECK_TIMEOUT_MS`       | Upstream lookup timeout in milliseconds                  | `5000`                  |
| `NEXT_PUBLIC_CHECKOUT_BASE_URL` | Checkout base URL; the domain is appended as `?domain=`  | marketku.id link        |
| `NEXT_PUBLIC_SITE_URL`          | Canonical site URL for SEO metadata                      | `https://cekdomain.ink` |

`.env.local` ships with `DOMAIN_CHECK_PROVIDER=mock` so the whole flow works
offline. Set it to `rdap` for real lookups. A paid API can be added later by
implementing `DomainAvailabilityProvider` and reading `DOMAIN_API_URL` /
`DOMAIN_API_KEY` **server-side only**.

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
    layout.tsx            # fonts, SEO metadata, header/footer, page chrome
    page.tsx              # landing page composition
    globals.css           # Tailwind layers + decorative background
    api/check-domain/route.ts
  components/
    Header.tsx  HeroSearch.tsx  DomainSearchForm.tsx
    DomainResultCard.tsx  DomainSuggestionCard.tsx
    FeaturesSection.tsx  HowItWorksSection.tsx  FAQSection.tsx  Footer.tsx
    ui/  Button.tsx  Card.tsx  Badge.tsx
  lib/
    domain/  normalize-domain.ts  validate-domain.ts  split-domain.ts
             checkout-url.ts  suggestion-engine.ts
             availability-provider.ts  rdap-provider.ts  mock-provider.ts  types.ts
    utils.ts
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
- **Honest results:** when a lookup is inconclusive we report `unknown` rather
  than falsely claiming availability. Final ownership is only confirmed by the
  registrar at checkout.