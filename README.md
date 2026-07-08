# CekDomain.ink

A production-ready, full-stack **domain availability checker**. Type a domain
like `mantapnyoo.com`, `branddigital.com`, `bisnisku.id`, or `tokoonline.net` —
CekDomain.ink tells you instantly whether it's available, suggests brandable
alternatives on the **same TLD** when it's taken, and sends you to checkout with
the domain pre-filled.

## Tech stack

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** for styling (system-font stacks — no Google Fonts at build)
- **Zod** for request validation
- **Lucide React** for icons
- **Vitest** for unit tests
- Real availability via a **registrar/reseller API** (Name.com, GoDaddy, or a
  configurable generic adapter). **RDAP** is a best-effort fallback; a clearly
  labelled **unsafe mock** exists for offline dev/tests only.

## ⚠️ Production accuracy requirement

Domain availability must come from a **real registrar/reseller API** — never from
mock or RDAP-only guessing:

- Use `DOMAIN_CHECK_PROVIDER=registrar` and configure **Name.com**, **GoDaddy**,
  **Marketku**, or another real registrar/reseller API.
- **Do not publish CekDomain.ink with the mock provider enabled. Mock results are
  fake and will produce wrong availability results.**
- RDAP-only is best-effort and can return `unknown`/inconclusive — it never
  overrides the registrar and is only a secondary signal.
- Final ownership is only confirmed after a successful checkout.

The app **fails closed**: if the registrar isn't configured it returns a clear
error instead of a fake result. Mock is forbidden in production.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Local development (REAL, key-less RDAP results — great default):
cp .env.local.example .env.local
#    Production (real registrar API):
#    cp .env.example .env.local   # then fill in registrar credentials

# 3. Run the dev server
npm run dev            # open http://localhost:3000

# Other scripts
npm run build          # production build (no Google Fonts fetch)
npm run start          # run the production build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run test           # vitest unit tests
npm run qa:domains     # check a sample list with the ACTIVE provider (prints source/confidence)
```

## Provider modes (important)

`DOMAIN_CHECK_PROVIDER` selects how availability is checked — **server-side only**:

| Value       | Meaning                                                                       | Use in production?                    |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| `registrar` | **Real** registrar/reseller API — the authoritative source of truth           | ✅ **Yes (required default)**         |
| `rdap`      | **Best-effort** RDAP (no keys); fallback/secondary only, can be `unknown`      | ⚠️ Only with `ALLOW_RDAP_ONLY_PRODUCTION=true` |
| `mock`      | **FAKE** deterministic results for offline dev/tests                          | ❌ **Forbidden** in production         |

- `registrar` picks a concrete adapter via `REGISTRAR_API_PROVIDER`
  (`namecom` \| `godaddy` \| `generic`). If credentials are missing the API
  returns `500 { "error": "Registrar availability API is not configured." }`.
- `mock` requires `ALLOW_MOCK_PROVIDER=true` and is **blocked entirely** when
  `NODE_ENV=production` (`500 { "error": "Mock domain provider is disabled in production." }`).
  When active in dev it prints a loud console warning and shows a
  “Mock mode: fake results” badge in the UI.
- There is **no silent fallback**: a misconfigured provider fails closed rather
  than returning misleading results.
- `.env.example` = production (`registrar`); `.env.local.example` = dev (`rdap`).

## Environment variables

| Variable                        | Description                                                        | Default        |
| ------------------------------- | ----------------------------------------------------------------- | -------------- |
| `DOMAIN_CHECK_PROVIDER`         | `registrar` (real) · `rdap` (fallback) · `mock` (dev-only, fake)  | `registrar`    |
| `REGISTRAR_API_PROVIDER`        | Adapter: `namecom` · `godaddy` · `generic`                        | `generic`      |
| `REGISTRAR_API_URL` …           | Generic adapter URL/method/key/auth-header/domain-param           | —              |
| `NAMECOM_USERNAME` / `NAMECOM_API_TOKEN` / `NAMECOM_ENV` | Name.com adapter (`production`\|`test`)    | —              |
| `GODADDY_API_KEY` / `GODADDY_API_SECRET` / `GODADDY_ENV` | GoDaddy adapter (`production`\|`ote`)      | —              |
| `ALLOW_RDAP_ONLY_PRODUCTION`    | Permit `rdap` as the sole provider in production                  | `false`        |
| `ALLOW_MOCK_PROVIDER`           | Permit the fake mock provider (dev only)                          | `false`        |
| `DOMAIN_CHECK_TIMEOUT_MS`       | RDAP fallback timeout (ms)                                        | `5000`         |
| `NEXT_PUBLIC_CHECKOUT_BASE_URL` | Checkout base URL; the domain is appended as `?domain=`           | marketku link  |
| `NEXT_PUBLIC_SITE_URL`          | Canonical site URL for SEO metadata                               | cekdomain.ink  |
| `SUGGESTION_CHECK_LIMIT`        | Suggestion candidates verified upstream per registered search     | `8`            |
| `SUGGESTION_RETURN_LIMIT`       | Suggestions returned to the client (available first)              | `6`            |
| `SUGGESTION_CHECK_CONCURRENCY`  | Parallel upstream suggestion checks                               | `3`            |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Per-IP rate limit for `/api/check-domain`               | `20` / `60000` |

Availability results are cached in-memory server-side for ~5 minutes (definitive
results only — never `unknown`). Secrets are never exposed to the client (only
`NEXT_PUBLIC_*` values reach the browser).

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
             providers/  registrar-provider.ts  namecom-provider.ts
                         godaddy-provider.ts  generic-provider.ts
                         rdap-provider.ts  unsafe-mock-provider.ts
    rate-limit.ts  utils.ts
  tests/  domain-utils.test.ts  suggestion-engine.test.ts  providers.test.ts
scripts/  qa-domains.ts          # `npm run qa:domains`

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