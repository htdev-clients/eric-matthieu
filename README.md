# Holiday Rental Starter Template

Jekyll static site + Cloudflare Pages Functions. Duplicate this repo for each new client.
See `CLAUDE.md` for the setup checklist and coding conventions.

## Tech Stack

| Layer | Choice |
|---|---|
| SSG | Jekyll ~4.3 |
| Styling | Tailwind CSS (CLI build) |
| Hosting | Cloudflare Pages |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite, multi-tenant) |
| Calendar sync | Airbnb iCal feed |

## Running Locally

### First-time setup

```bash
bundle install
npm install --ignore-scripts   # --ignore-scripts avoids sharp/node-gyp errors on newer Node
```

> Never use `npm ci` locally — it may fail on `sharp` (a transitive Wrangler dependency).

### Daily workflow

```bash
# Build Tailwind CSS (required before serving, and after any template change)
npm run build:css

# Frontend only (no backend)
bundle exec jekyll serve --livereload
# → http://localhost:4000

# Full stack (backend functions + D1)
bundle exec jekyll build
npx wrangler pages dev _site
# → http://localhost:8788 — requires .dev.vars (copy from .dev.vars.example)
```

### Watching CSS

```bash
# Tab 1
npm run watch:css
# Tab 2
bundle exec jekyll serve --livereload
```

## Deployment (Cloudflare Pages)

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build:css && bundle exec jekyll build` |
| Build output directory | `_site` |
| Environment variable | `RUBY_VERSION=3.4.4` |

`Gemfile.lock` is committed intentionally — do not add it to `.gitignore`.

## Environment Variables

| Variable | Where | Notes |
|---|---|---|
| `PROPERTY_ID` | `wrangler.toml` | Unique key per client (e.g. `client-name-001`) |
| `PROPERTY_NAME` | `wrangler.toml` | Display name used in transactional emails |
| `OWNER_EMAIL` | `wrangler.toml` | Property owner's inbox for booking notifications |
| `FROM_EMAIL` | `wrangler.toml` | Sender address — `onboarding@resend.dev` until domain verified |
| `ICAL_URL` | `wrangler.toml` | Airbnb iCal export URL (Listing › Availability › Export Calendar) |
| `PRICE_PER_NIGHT` | `wrangler.toml` | Nightly rate — used server-side; must match `property.yml` |
| `RESPONSE_HOURS` | `wrangler.toml` | Hours owner has to respond; must match `property.yml` |
| `MAX_GUESTS` | `wrangler.toml` | Max guests allowed; must match `property.yml` |
| `SITE_URL` | `wrangler.toml` | Base URL for approve links |
| `RESEND_API_KEY` | `secrets.json` | Resend transactional email API key |
| `APPROVE_SECRET` | `secrets.json` | Long random string — signs owner approval links (HMAC-SHA256) |

Secrets are deployed via `npm run deploy:secrets` (reads `secrets.json`, gitignored).

## Admin Dashboard

The owner booking dashboard URL is generated with:

```bash
npm run admin-url
```

Token = HMAC(`"admin-bookings"`, `APPROVE_SECRET`).
