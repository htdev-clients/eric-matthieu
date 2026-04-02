# Le Gîte de Lierneux — Holiday Rental Website

> **Work in progress.** The site is functional but not yet live. Final client content (pricing, contact details, listing registration number) is pending before launch.

A custom holiday rental website built for a 4-person gîte in the Belgian Ardennes. The property features a heated pool, outdoor jacuzzi, barrel sauna, and hammam — the site is designed to reflect that premium-but-unpretentious character.

**Live preview:** [eric-matthieu.pages.dev](https://eric-matthieu.pages.dev)

---

## Tech stack

| Layer | Choice |
|---|---|
| SSG | Jekyll ~4.3 |
| Styling | Tailwind CSS (CLI build, no CDN) |
| Fonts | Cormorant Garamond + DM Sans (self-hosted) |
| Hosting | Cloudflare Pages |
| Backend | Cloudflare Pages Functions (Node.js) |
| Database | Cloudflare D1 (SQLite) |
| Emails | Resend |
| Payments | Stripe Checkout |
| Calendar sync | Airbnb iCal feed |
| i18n | jekyll-polyglot (FR default, EN at `/en/`) |
| Responsive images | jekyll-picture-tag (WebP + fallback) |

---

## Features

### Frontend
- Bilingual (French / English) with `jekyll-polyglot` — all content driven from a single `_data/property.yml` file
- Custom design system with per-client color tokens (`earth`, `clay`, `leaf`, `paper`, `stone`, `cream`) and self-hosted fonts
- CSS grid photo gallery (mosaic layout) with 11 property images
- Fully responsive — mobile-first

### Booking flow
1. Guest selects dates and submits a request form
2. Request is validated server-side (guest count, rate limiting, availability check against Airbnb iCal)
3. Owner receives a notification email with a one-click **approve / decline** link (HMAC-signed, no login required)
4. On approval: guest receives a payment email with a Stripe Checkout link (card) and bank transfer option (Bancontact-friendly)
5. On payment: Stripe webhook confirms the booking in D1; guest and owner both receive a confirmation email
6. Owner has a private dashboard to view all bookings (token-authenticated, no password)

### Backend
- Multi-tenant Cloudflare D1 database — a single database shared across client projects, scoped by `property_id`
- Real-time availability from Airbnb iCal feed (no double-booking with existing Airbnb reservations)
- Rate limiting per email address (configurable, server-side)
- All non-secret config in `wrangler.toml`; API keys in Cloudflare secrets (never committed)

### Legal
- GDPR-compliant cookie banner (opt-in, no third-party scripts by default)
- Full legal pages: CGV, privacy policy, cookie policy — bilingual

---

## Running locally

```bash
# Install dependencies
bundle install
npm install --ignore-scripts   # --ignore-scripts avoids sharp/node-gyp issues

# Build Tailwind CSS (required before serving)
npm run build:css

# Frontend only
bundle exec jekyll serve --livereload
# → http://localhost:4000

# Full stack (backend + D1)
bundle exec jekyll build
npx wrangler pages dev _site
# → http://localhost:8788 — requires .dev.vars (copy from .dev.vars.example)
```

### Watching CSS changes

```bash
# Terminal 1
npm run watch:css
# Terminal 2
bundle exec jekyll serve --livereload
```

---

## Deployment (Cloudflare Pages)

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build:css && bundle exec jekyll build` |
| Output directory | `_site` |
| Environment variable | `RUBY_VERSION=3.2.10` |

Non-secret config lives in `wrangler.toml`. Secrets (Stripe key, Resend key, approval HMAC secret) are deployed separately:

```bash
npm run deploy:secrets   # reads secrets.json (gitignored)
```

---

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `PROPERTY_ID` | `wrangler.toml` | Unique key per property |
| `PROPERTY_NAME` | `wrangler.toml` | Used in transactional emails |
| `OWNER_EMAIL` | `wrangler.toml` | Booking notifications inbox |
| `PRICE_PER_NIGHT` | `wrangler.toml` | Validated server-side |
| `MAX_GUESTS` | `wrangler.toml` | Server-side cap |
| `SITE_URL` | `wrangler.toml` | Base URL for approval links |
| `ICAL_URL` | `wrangler.toml` | Airbnb calendar export URL |
| `OWNER_IBAN` | `wrangler.toml` | Shown in payment emails (not a secret) |
| `RESEND_API_KEY` | `secrets.json` | Transactional email API key |
| `APPROVE_SECRET` | `secrets.json` | Signs owner approval links (HMAC-SHA256) |
| `STRIPE_SECRET_KEY` | `secrets.json` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | `secrets.json` | Stripe webhook signature |
