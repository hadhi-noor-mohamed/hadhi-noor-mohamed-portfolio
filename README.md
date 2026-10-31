# Hadhi Noor Mohamed H — Portfolio & CMS

A full-stack, data-driven personal portfolio website with a private content
management dashboard. Every public section (hero, about, skills, projects,
timeline, learning journey, blog, contact, resume, social links) is rendered
from PostgreSQL through an admin CRUD API — nothing is hard-coded into the
frontend.

- **Public site:** React + Vite + TypeScript + Tailwind CSS + React Router +
  Framer Motion + Lucide + Recharts.
- **API:** Node.js + Express + TypeScript + Prisma + PostgreSQL.
- **Media:** pluggable storage driver — local filesystem (default) or any
  S3-compatible provider (AWS S3, Cloudflare R2, Backblaze B2, MinIO,
  DigitalOcean Spaces…).
- **Auth:** database-backed sessions in an `HttpOnly` cookie, CSRF
  double-submit protection, login rate limiting, optional TOTP two-factor
  authentication, and server-side authorization on every admin endpoint.

---

## Table of contents

- [Feature overview](#feature-overview)
- [Architecture](#architecture)
- [Quick start — Docker Compose](#quick-start--docker-compose)
- [Quick start — local development](#quick-start--local-development)
- [Environment variables](#environment-variables)
- [NPM scripts](#npm-scripts)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Security notes](#security-notes)
- [Content & honesty policy](#content--honesty-policy)
- [Integrations you must configure](#integrations-you-must-configure)
- [Project structure](#project-structure)

---

## Feature overview

### Public website

| Area | What it does |
| --- | --- |
| **Home** | Hero with availability/status flags, featured projects, latest writing, skills highlights — all driven by the API. |
| **About** | Rich-text biography plus quick facts and tech badges. |
| **Skills** | Filterable skill explorer grouped by category, with optional proficiency indicators only when the owner sets them. |
| **Projects** | Filterable grid + detail pages (problem, approach, solution, outcome, feature list, challenges, learnings, gallery, documents). Only **published** projects are ever exposed. |
| **Experience & Education** | Combined chronological timeline with type/category filtering. |
| **Achievements & Certifications** | Credential showcase with optional verification links (never invented). |
| **Learning Journey** | A "vlog"-style feed of entries with detail pages. |
| **Blog** | Markdown posts with categories, tags, reading time and related posts. |
| **Contact** | Rate-limited message form that stores plain text, strips HTML, and feeds the admin inbox. |
| **Résumé** | Online résumé view with active downloadable file + version history. |
| **Command palette** | `Ctrl`/`Cmd` + `K` quick navigation and content search. |
| **SEO** | Per-route metadata, canonical URLs, Open Graph/Twitter tags, JSON-LD structured data, server-generated `sitemap.xml` and `robots.txt`, and a real 404 route. |
| **Theme** | Light / dark / system modes with a live, publishable theme (5 presets + custom tokens). |
| **Accessibility** | Semantic landmarks, keyboard-operable controls, focus styles and `sr-only` labels throughout. |

### Admin dashboard

Everything below lives behind authentication (`/admin`) and is code-split per
page for fast loading.

| Module | Capability |
| --- | --- |
| **Overview** | Counts, recent activity, content health and quick actions. |
| **Profile** | Identity, headline, intro, about HTML, availability flags, tech badges, images, SEO. |
| **Résumé** | Upload/manage résumé files, set the active version, toggle visibility. |
| **Projects** | Full CRUD, publish/unpublish, duplicate, soft-delete (trash) + restore, permanent delete with media-usage protection, reorder, bulk actions, galleries and documents, skill links. |
| **Skills** | Buckets + skills CRUD, logos, ordering, publishing. |
| **Education & Experience** | Unified timeline editor with types/categories, ordering, publishing. |
| **Achievements & Certifications** | Credential CRUD with optional verify URLs and issuing details. |
| **Media library** | Uploads with MIME + magic-byte validation, tags, alt text, public/private visibility, usage tracking, replace-in-place, safe delete (blocked while in use), and signed URLs for private assets. |
| **Learning Journey** | Entry CRUD with markdown body, cover image, publish workflow. |
| **Blog** | Post CRUD, categories, tags, scheduling, draft/published states, markdown editor with sanitised preview. |
| **Page builder** | Section list with draft/publish, ordering and visibility, plus settings and theme tokens. |
| **Theme Studio** | Presets and custom design tokens, live preview, draft + publish. |
| **Contact inbox** | Read/archive messages, mark handled, unread counts. |
| **Analytics** | Privacy-respecting event counts derived from first-party records only (no third-party trackers). |
| **SEO** | Site-level defaults, per-content overrides, OG image, sitemap/robots links. |
| **Backup & restore** | Export a full JSON snapshot; restore with explicit confirmation. |
| **Account & Security** | Identity, active session list/revoke, password change (revokes all sessions), TOTP setup/enable/disable with QR code. |

---

## Architecture

```
┌────────────────────┐        ┌───────────────────────────┐        ┌──────────────┐
│  React SPA (Vite)  │  /api  │  Express API (TypeScript) │ Prisma │  PostgreSQL  │
│  public + /admin   │ ─────► │  sessions · CSRF · RBAC    │ ─────► │              │
└────────────────────┘        └───────────┬───────────────┘        └──────────────┘
                                          │
                                   ┌──────▼───────┐
                                   │ Media storage │  local filesystem  or  S3-compatible
                                   └──────────────┘
```

- In **development** the Vite dev server (port `5173`) proxies `/api` and
  `/uploads` to the API (port `4000`).
- In **production** the Express server also serves the built SPA from
  `client/dist`, so a single process (and a single container) serves both the
  site and the API.
- All API responses use a consistent envelope:
  - success → `{ "ok": true, "data": … , "meta"?: … }`
  - failure → `{ "ok": false, "error": { "code", "message", "details"? } }`

---

## Quick start — Docker Compose

The fastest way to run the whole stack (database + API + built site).

1. Copy the example environment file and fill in a session secret:

   ```bash
   cp .env.example .env
   # Generate a strong SESSION_SECRET:
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   At minimum set in `.env`:

   ```env
   SESSION_SECRET=<the generated value>
   POSTGRES_PASSWORD=<a database password>
   OWNER_EMAIL=you@example.com
   OWNER_PASSWORD=<a strong password you choose>
   ```

2. Build and start:

   ```bash
   docker compose up --build -d
   ```

   On first start the container applies migrations and (when `OWNER_EMAIL` and
   `OWNER_PASSWORD` are set) creates the owner account.

3. Open <http://localhost:4000> and sign in at
   <http://localhost:4000/admin/login>.

If you did **not** set owner credentials, create the account once:

```bash
docker compose exec app node server/dist/scripts/setup-owner.js
# A strong password is generated and printed once if OWNER_PASSWORD is blank.
```

---

## Quick start — local development

Requirements: Node.js ≥ 20 and a PostgreSQL 14+ database.

1. **Install dependencies** (from the repository root — it is an npm
   workspace):

   ```bash
   npm install
   ```

2. **Configure the environment:**

   ```bash
   cp .env.example .env
   # Set DATABASE_URL, SESSION_SECRET, and (optionally) OWNER_* in .env
   ```

   For a local Postgres the typical value is:

   ```env
   DATABASE_URL=postgresql://<user>:<password>@localhost:5432/portfolio?schema=public
   SESSION_SECRET=<32+ random characters>
   STORAGE_DRIVER=local
   LOCAL_STORAGE_DIR=storage
   ```

3. **Create the schema and seed initial content:**

   ```bash
   npm run db:generate     # generate the Prisma client
   npm run db:migrate      # apply migrations (creates the DB schema)
   npm run db:seed         # seed truthful starter content
   ```

4. **Create the owner account:**

   ```bash
   npm run setup:owner
   ```

   If `OWNER_PASSWORD` is not set, a strong password is generated and printed
   exactly once.

5. **Run the app** (API + web together):

   ```bash
   npm run dev
   ```

   - Web: <http://localhost:5173>
   - API: <http://localhost:4000/api/health>

---

## Environment variables

All variables are documented inline in [`.env.example`](.env.example). The
essentials:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | – | `development` \| `production` \| `test`. |
| `PORT` | – | API port (default `4000`). |
| `DATABASE_URL` | **yes** | PostgreSQL connection string used by Prisma. |
| `SESSION_SECRET` | **yes** | 32+ random chars; signs session tokens. |
| `APP_ORIGIN` | – | Public origin of the frontend (CORS + CSRF origin checks). |
| `SITE_URL` | – | Canonical site URL for SEO, sitemap and OG tags. |
| `SESSION_TTL_HOURS` | – | Session lifetime (default `12`). |
| `COOKIE_SECURE` | – | Force `Secure` cookies. Defaults to `true` in production. |
| `TRUST_PROXY` | – | Set `true` behind a reverse proxy / load balancer. |
| `STORAGE_DRIVER` | – | `local` (default) or `s3`. |
| `LOCAL_STORAGE_DIR` | – | Upload directory when using the local driver. |
| `S3_*` | when `s3` | S3-compatible bucket/credentials/endpoint/public URL. |
| `OWNER_EMAIL` / `OWNER_NAME` / `OWNER_PASSWORD` | – | Used once by `setup:owner`. |
| `CONTACT_RATE_LIMIT_PER_HOUR` | – | Contact submissions allowed per IP per hour (default `5`). |
| `GITHUB_TOKEN` / `GITHUB_USERNAME` | – | Optional server-side GitHub adapter. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | docker only | Consumed by the compose `db` service. |

---

## NPM scripts

Run from the repository root unless noted.

| Script | Description |
| --- | --- |
| `npm run dev` | Run API and web dev servers together. |
| `npm run dev:server` | API only (`tsx watch`). |
| `npm run dev:client` | Web only (Vite). |
| `npm run build` | Build the API (`tsc`) and the SPA (`vite build`). |
| `npm start` | Start the compiled API (serves the built SPA). |
| `npm run typecheck` | Type-check both workspaces. |
| `npm run lint` | Lint both workspaces. |
| `npm test` | Run the API test suite (Vitest + Supertest). |
| `npm run verify` | typecheck → lint → test → build. |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:migrate` | Create/apply a dev migration. |
| `npm run db:deploy` | Apply committed migrations (production). |
| `npm run db:seed` | Seed starter content (idempotent). |
| `npm run db:reset` | Reset the database and re-run migrations. |
| `npm run setup:owner` | Create/rotate the owner admin account. |

---

## Testing

The API is covered by an integration test suite that runs against a **separate
test database** — it is reset before every run, so it never touches your
development data.

```bash
# From the repository root
npm test
```

- `server/vitest.config.ts` points the suite at `portfolio_test` and a scratch
  upload directory, and `server/tests/globalSetup.ts` runs
  `prisma db push --force-reset` against that database.
- Suites: `auth`, `content`, `media`, `public`, `account` — covering login
  throttling, CSRF enforcement, publish/visibility rules, media privacy and
  usage protection, public endpoints, and account security (password change +
  TOTP).

> **Note:** the suite requires a reachable PostgreSQL instance. Create the test
> database once with `createdb portfolio_test` (or let Prisma create it) and
> ensure `DATABASE_URL` for tests points at it (see `vitest.config.ts`).

---

## Production deployment

### With Docker (recommended)

```bash
docker compose up --build -d
```

The image is multi-stage: it installs the workspace, generates the Prisma
client, builds the API and SPA, then runs a slim runtime that applies
migrations on start via `docker/entrypoint.sh`. Locally stored uploads live on
the `uploads` volume; PostgreSQL data lives on `db-data`.

Set `COOKIE_SECURE=true` and `TRUST_PROXY=true` when serving over HTTPS behind
a reverse proxy.

### Without Docker

```bash
npm ci
npm run db:generate
npm run db:deploy      # apply migrations
npm run build          # build API + SPA
NODE_ENV=production npm start
```

The compiled server serves `client/dist` and listens on `PORT`. Terminate TLS
at your reverse proxy (nginx, Caddy, a PaaS load balancer) and forward
`X-Forwarded-*` headers with `TRUST_PROXY=true`.

### Vercel

The repository ships a Vercel-native deployment: the SPA is served as static
files from `client/dist`, while the existing Express API runs as one Node.js
Function (`api/index.mjs`). Express is never started with `app.listen()` on
Vercel; `/api/*` is routed to the function and the rewrite in `vercel.json`
preserves the original path.

1. **Create a hosted PostgreSQL database** (Neon, Supabase, Prisma Postgres,
   Railway, ...). A local database cannot be reached from Vercel.
2. **Import the repository** at [vercel.com/new](https://vercel.com/new).
   Keep the project root at the repository root. `vercel.json` supplies the
   build command, output directory and routing, so no framework preset or
   output directory needs to be set in the dashboard.
3. **Add environment variables** (Project -> Settings -> Environment
   Variables) for Production and Preview:
   - `DATABASE_URL` - hosted PostgreSQL URL (use the pooled connection string).
   - `SESSION_SECRET` - 64+ random hex characters.
   - `APP_ORIGIN` and `SITE_URL` - the deployment URL, e.g. `https://name.vercel.app`.
   - `TRUST_PROXY=true`, `COOKIE_SECURE=true`.
   - `STORAGE_DRIVER=s3` plus `S3_*` - required for media uploads, because
     Vercel's filesystem is ephemeral.
   - Optional: `CONTACT_RATE_LIMIT_PER_HOUR`, `ANALYTICS_ENABLED`,
     `CORS_EXTRA_ORIGINS`, `GITHUB_TOKEN`, `GITHUB_USERNAME`.
4. **Apply migrations and seed once** from your machine, pointing at the
   hosted database:

   ```powershell
   $env:DATABASE_URL="postgresql://..."
   npm run db:deploy
   npm run db:seed
   npm run setup:owner   # set OWNER_* first; prints a password if blank
   ```

5. **Deploy.** Vercel runs `npm run db:generate && npm run build`
   (`server` -> `server/dist`, `client` -> `client/dist`) and bundles
   `api/index.mjs`.
6. Open the deployment URL. `GET /api/health` should return
   `{"ok":true,...}` and `/` should render the portfolio from the hosted
   database. `GET /api/health?deep=1` additionally checks PostgreSQL and
   returns `503` with a safe JSON error when the database is unreachable.

**Notes**

- Do not run `npm start` (`node dist/index.js`) on Vercel. That is the
  Docker/long-running server entry; Vercel uses `api/index.mjs` instead.
- The Prisma generator includes the `rhel-openssl-3.0.x` engine required by
  Vercel's Amazon Linux runtime.
- If a required variable is missing or the database is unreachable, the API
  returns a JSON `503` with a safe message instead of terminating the process.
  The public site shows a "content unavailable" notice with a retry button
  rather than fabricated content.
- `server/tsconfig.build.json` compiles to `server/dist/index.js` (not
  `server/dist/src/index.js`), which keeps `npm start`, the Docker entrypoint
  and the SPA static path in sync.

---

## Security notes

- Passwords are hashed with `bcrypt`; password strength is enforced on change.
- Sessions are server-side records delivered in an `HttpOnly`, `SameSite`
  cookie; only a token hash is stored.
- State-changing requests require a CSRF token (double-submit cookie) in
  addition to a valid session.
- Login attempts are rate-limited with temporary lockout after repeated
  failures; the contact form is rate-limited per IP.
- Every admin route is guarded by an authorization middleware mounted once at
  the router level, so no endpoint is accidentally left open.
- Rich text is sanitised on the server before storage; the client also
  sanitises markdown previews with DOMPurify.
- Uploads are validated by extension, declared MIME type **and** magic bytes;
  uploaded SVG is served sandboxed, and responses set `X-Content-Type-Options`,
  a strict Content-Security-Policy and immutable caching.
- Security headers (Helmet), request size limits, compression and CORS origin
  allow-listing are applied globally.
- **No default credentials are shipped.** The owner account is created
  explicitly, and the first password should be changed from *Account &
  Security*.

---

## Content & honesty policy

This project deliberately **does not invent** information. The seed data only
marks résumé-supported facts as published; anything the owner has not supplied
is created as a clearly labelled **draft** so it never appears on the public
site. In particular, no GitHub/LinkedIn URLs, live-demo links, certificate
verification URLs, screenshots, testimonials or traffic figures are fabricated.

Placeholders waiting for real values:

- Social profile URLs (GitHub, LinkedIn, etc.).
- Project repository / live-demo / demo-video links.
- Certificate verification URLs and credential IDs.
- Résumé file(s) and profile/hero images.

Add these through the admin dashboard once you have the real values.

---

## Integrations you must configure

The application runs fully without any third-party service, but the following
integrations are optional and require credentials to light up:

| Integration | Env vars | Behaviour when unset |
| --- | --- | --- |
| **PostgreSQL** | `DATABASE_URL` | **Required** — the app will not start without a database. |
| **S3-compatible media storage** | `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`, `S3_FORCE_PATH_STYLE` | Falls back to the local filesystem driver. Recommended for multi-instance / ephemeral hosts. |
| **GitHub adapter** | `GITHUB_TOKEN`, `GITHUB_USERNAME` | GitHub-backed features are disabled. |
| **Analytics** | `ANALYTICS_ENABLED` | First-party event counting only; no external tracker is ever required. |
| **Transactional email** | _(none wired)_ | The contact form stores messages in the admin inbox instead of emailing them. Wire an SMTP provider if you want notifications. |
| **Domain / TLS / proxy** | `APP_ORIGIN`, `SITE_URL`, `TRUST_PROXY`, `COOKIE_*` | Defaults suit local development only. |

---

## Project structure

```
.
├── client/                     # React + Vite SPA
│   ├── src/
│   │   ├── components/         # UI kit, public sections, layout, admin toolkit
│   │   ├── context/            # auth, site, theme, toast providers
│   │   ├── hooks/              # data fetching, analytics, media lookup
│   │   ├── lib/                # api client, seo, utils
│   │   ├── pages/public/       # 14 public pages
│   │   └── pages/admin/        # 20 admin pages (code-split)
│   └── index.html
├── server/                     # Express + Prisma API
│   ├── prisma/                 # schema, migrations, seed
│   ├── src/
│   │   ├── lib/                # api envelope, errors, validation, sanitising, slugs
│   │   ├── middleware/         # sessions, CSRF, rate limiting, uploads, errors, security
│   │   ├── routes/public/      # public read + contact endpoints
│   │   ├── routes/admin/       # authenticated CRUD + account/security
│   │   ├── services/           # auth, media, serializers, theme, site, audit, bootstrap
│   │   └── storage/            # local + S3 storage drivers
│   └── tests/                  # Vitest + Supertest integration suites
├── docker/entrypoint.sh        # migrate → bootstrap owner → start
├── Dockerfile                  # multi-stage build
├── docker-compose.yml          # postgres + app
└── .env.example                # documented environment template
```
