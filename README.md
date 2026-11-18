<div align="center">

<a href="https://getkitevo.com">
  <img src="app/icon.svg" alt="Kitevo logo" width="96" height="96" />
</a>

<h1>Kitevo</h1>

<p><strong>Live media kits for creators. Real Instagram and YouTube stats, on one link.</strong></p>

<p>
  An open-source creator–brand platform: shareable media kits with live platform data,
  brand campaigns, deals, and creator-owned payments.
</p>

<p>
  <a href="https://getkitevo.com"><strong>Website</strong></a> ·
  <a href="#getting-started"><strong>Getting started</strong></a> ·
  <a href="./CONTRIBUTING.md"><strong>Contributing</strong></a> ·
  <a href="https://github.com/S07K/kitevo/discussions"><strong>Discussions</strong></a> ·
  <a href="https://github.com/S07K/kitevo/issues/new/choose"><strong>Report a bug</strong></a>
</p>

<!-- Project status -->
<p>
  <a href="./LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/github/license/S07K/kitevo?color=blue" /></a>
  <a href="https://github.com/S07K/kitevo/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/S07K/kitevo/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/S07K/kitevo/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/S07K/kitevo?style=flat" /></a>
  <a href="https://github.com/S07K/kitevo/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/S07K/kitevo?style=flat" /></a>
  <a href="https://github.com/S07K/kitevo/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/S07K/kitevo" /></a>
  <a href="https://github.com/S07K/kitevo/pulls"><img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/S07K/kitevo" /></a>
  <a href="https://github.com/S07K/kitevo/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/S07K/kitevo/main" /></a>
  <a href="https://github.com/S07K/kitevo/graphs/contributors"><img alt="Contributors" src="https://img.shields.io/github/contributors/S07K/kitevo" /></a>
  <img alt="Top language" src="https://img.shields.io/github/languages/top/S07K/kitevo" />
  <img alt="Repo size" src="https://img.shields.io/github/repo-size/S07K/kitevo" />
  <a href="./CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
  <a href="./CODE_OF_CONDUCT.md"><img alt="Contributor Covenant 2.1" src="https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg" /></a>
</p>

<!-- Tech stack -->
<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="shadcn/ui" src="https://img.shields.io/badge/shadcn%2Fui-registry-000000?logo=shadcnui&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="NextAuth.js" src="https://img.shields.io/badge/NextAuth.js-4-8A2BE2" />
  <img alt="Capacitor" src="https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white" />
  <img alt="iOS" src="https://img.shields.io/badge/iOS-000000?logo=apple&logoColor=white" />
  <img alt="Android" src="https://img.shields.io/badge/Android-34A853?logo=android&logoColor=white" />
  <img alt="Stripe" src="https://img.shields.io/badge/Stripe-635BFF?logo=stripe&logoColor=white" />
  <img alt="Razorpay" src="https://img.shields.io/badge/Razorpay-0C2451?logo=razorpay&logoColor=white" />
  <img alt="PayPal" src="https://img.shields.io/badge/PayPal-003087?logo=paypal&logoColor=white" />
  <img alt="Dodo Payments" src="https://img.shields.io/badge/Dodo_Payments-111111" />
  <img alt="Resend" src="https://img.shields.io/badge/Resend-000000?logo=resend&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white" />
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white" />
</p>

</div>

---

## Table of contents

- [About](#about)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Mobile apps (Capacitor)](#mobile-apps-capacitor)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## About

Kitevo (say "kit-evo": *the kit, evolved*) is a creator–brand collaboration platform with two sides:

- **Creators** build media kits: shareable pages with live Instagram and YouTube stats,
  audience demographics, rates and a contact form. They apply to brand campaigns, receive
  inquiries, agree deals, sell digital products and take bookings, with payments going
  straight into their own Razorpay, Stripe or PayPal account.
- **Brands** post campaigns, discover and shortlist creators, message them and run deals
  with transparent, versioned terms.

A core principle runs through the code: **the kit never shows fabricated numbers.** Live
data is labelled as live, self-reported numbers are labelled as self-reported, and
unavailable stats are hidden rather than invented.

The hosted version runs at [getkitevo.com](https://getkitevo.com). This repository is the
full application source.

## Features

**Media kits**

- Public kit pages at `/kit/<slug>` with live **Instagram** (followers, engagement, audience
  age/gender/country, recent posts, follower growth) and **YouTube** (subscribers, views,
  recent videos) data via the official Meta Graph and YouTube Data APIs
- Self-reported headline stats for unconnected platforms, always labelled as such
- An audience summary sentence generated only from data the kit actually has
- Kit styles and "vibes", itemised rate cards, brand partners, contact links
- Multiple kits per account (by plan), password protection, custom slugs
- **Custom domains** per kit, provisioned through the Vercel API with automatic TLS
- PDF and PPTX export of a kit
- Kit view analytics (views over time, referrers)

**Kit editor**

- Live preview rendering the real kit component, in an iPhone frame or a 1280px desktop window
- Autosave with status and retry; click any part of the preview to edit it

**Creator tools**

- Dashboard with "what to do next", deals, products and inquiry summaries
- Inquiry pipeline (list or drag-and-drop board)
- **Digital products**: free downloads with email capture and paid products checked out on the
  creator's own **Razorpay**, **Stripe** (restricted key) or **PayPal** account
- **Book a call** button backed by the creator's own Calendly, Cal.com or Google Calendar schedule
- **Copilot**: AI drafts for bios, pitches, inquiry replies and messages, grounded in the
  creator's real kit data. Provider-agnostic (Groq, OpenRouter, OpenAI, Gemini, Anthropic or
  any OpenAI-compatible endpoint), on the platform key or the creator's own key
- Free tools: rate calculator and engagement-rate calculator
- Referral program with a commission ledger and manual payouts

**Brand tools**

- Campaigns with applications, an applicant timeline and CSV export
- Creator discover with niche, follower-range and engagement filters, plus shortlists
- Real-time messaging between brands and creators (server-sent events)
- **Brand deals**: versioned terms, upfront / split / on-delivery payment plans, a shared
  event timeline, and payments to the creator's own payment account (Kitevo takes 0%)

**Platform**

- Email/password auth with verification, Google sign-in, password reset (NextAuth)
- Subscriptions through a provider-agnostic layer: **Stripe** or **Dodo Payments**
  (Merchant of Record), trials and discount codes
- OAuth tokens and connected payment secrets encrypted at rest (AES-256-GCM, rotatable key ring)
- Report and block between accounts, account suspension, admin review queue
- Admin tools: user lookup, comps, plan resync, webhook log with replay, audit log, Copilot usage
- First-party funnel analytics, transactional email via Resend, rate-limited auth email routes
- Blog, comparison pages, help center, sitemap and structured data

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev), [TypeScript 5](https://www.typescriptlang.org) |
| Styling / UI | [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) registry components, [lucide-react](https://lucide.dev), [Motion](https://motion.dev), [Recharts](https://recharts.org) |
| Database | PostgreSQL via [Prisma 5](https://www.prisma.io) (hosted on [Supabase](https://supabase.com) in production) |
| Auth | [NextAuth.js 4](https://next-auth.js.org) (credentials + Google) |
| Subscriptions | [Stripe](https://stripe.com) or [Dodo Payments](https://dodopayments.com), selected by `PAYMENT_PROVIDER` |
| Creator payments | Razorpay, Stripe and PayPal REST APIs (creator-owned accounts, no SDKs) |
| Social data | Meta Graph API (Instagram), YouTube Data API v3 |
| Email | [Resend](https://resend.com) |
| Storage | Supabase Storage (avatars, logos, product covers) |
| Exports | [@react-pdf/renderer](https://react-pdf.org), [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) |
| Mobile | [Capacitor 8](https://capacitorjs.com) (iOS and Android projects) |
| Hosting | [Vercel](https://vercel.com) (with Vercel Cron and Analytics) |
| Testing | [Vitest 4](https://vitest.dev), [Playwright](https://playwright.dev) |

## Architecture

```text
kitevo/
├── app/                      # Next.js App Router
│   ├── (workspace)/          # Signed-in workspace: dashboard, discover, campaigns, messages,
│   │                         #   pipeline, deals, products, connectors, referrals, settings,
│   │                         #   pricing, admin (shared layout + sidebar)
│   ├── api/                  # Route handlers: auth, kits, instagram, youtube, payments, orders,
│   │                         #   deals, copilot, social, safety, webhook, cron, ...
│   ├── kit/[username]/       # Public media kit page
│   ├── kit/edit/             # Kit editor with live preview
│   ├── [username]/, u/       # Public creator / brand profiles
│   ├── p/, o/, d/            # Product pages, buyer order pages, brand deal links
│   ├── custom-domain/        # Kit rendering for creators' own domains
│   ├── blog/, compare/, tools/, help/, integrations/   # Marketing and SEO pages
│   └── components/           # Shared UI (workspace kit, landing, kit components)
├── components/ui/            # shadcn registry components
├── config/subscriptions.ts   # Plans, prices and provider product ids
├── lib/                      # Domain logic (server and client-safe modules)
│   ├── payments/             # PaymentProvider interface + Stripe and Dodo implementations
│   ├── platforms/            # Social platform abstraction
│   ├── ai/                   # Provider-agnostic LLM client for Copilot
│   └── *.ts                  # commerce, deals, referrals, safety, token-crypto, email, ...
├── prisma/                   # schema.prisma + versioned migrations
├── proxy.ts                  # Custom-domain routing + signed-in route protection
├── scripts/                  # Build guards, dev migrations, maintenance scripts
├── e2e/                      # Playwright specs
├── android/, ios/            # Capacitor native projects
├── content/blog/             # Markdown blog posts
└── docs/                     # Deployment notes, product plan, release runbook, test docs
```

Key design decisions:

- **Payments are provider-agnostic.** Kitevo's own subscriptions go through the
  `PaymentProvider` interface in `lib/payments`; webhooks are translated into domain events so
  the webhook route has no provider vocabulary. Unknown subscription statuses fail closed.
- **Creator money is creator-owned.** Product and deal payments are created on the creator's
  own Razorpay / Stripe / PayPal account and verified server-side; Kitevo never holds funds.
- **Secrets at rest are encrypted** with `lib/token-crypto.ts` (AES-256-GCM, key ids for rotation).
- **Migrations are versioned** and applied automatically on deploy, following an
  expand-then-contract rule so each migration works with the previous deployment.

[CLAUDE.md](./CLAUDE.md) is the detailed architecture guide, covering conventions, invariants and the
reasoning behind non-obvious decisions.

## Getting started

### Prerequisites

- **Node.js 20.9+** and npm
- **PostgreSQL** (local install, Docker or a hosted database)
- Git

### 1. Clone and install

```bash
git clone https://github.com/S07K/kitevo.git
cd kitevo
npm install          # also runs `prisma generate`
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

`.env.example` is the source of truth: every variable is documented there, with placeholder
values only. The minimum for local development:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Postgres connection strings (both can point at the same local DB) |
| `NEXTAUTH_SECRET` | Session signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `SUBSCRIPTION_COOKIE_SECRET` | Signs the subscription cookie (`openssl rand -base64 32`) |

Everything else is optional and unlocks a feature: `META_APP_*` (Instagram), `GOOGLE_CLIENT_*`
(Google sign-in + YouTube), `STRIPE_*` / `DODO_*` (subscriptions), `RESEND_*` (email),
`SUPABASE_*` (image storage), `AI_*` (Copilot), `VERCEL_*` (custom domains),
`TOKEN_ENCRYPTION_KEYS` (token encryption) and more.

> Never commit `.env` files. They are gitignored; only `.env.example` is tracked.

### 3. Set up the database

```bash
createdb kitevo                       # or create a database another way
# .env: DATABASE_URL="postgresql://localhost:5432/kitevo"
#       DIRECT_URL="postgresql://localhost:5432/kitevo"
npx prisma migrate deploy             # apply all migrations
```

To change the schema, edit `prisma/schema.prisma` and run
`npx prisma migrate dev --name <change>` against your local database. `npm run db:studio`
opens Prisma Studio.

### 4. Run the development server

```bash
npm run dev
```

Open <http://localhost:3000>. The `predev` hook applies pending migrations first, but only
when the database is on `localhost`.

## Mobile apps (Capacitor)

The repository contains Capacitor 8 native projects in `ios/` and `android/`, configured in
`capacitor.config.ts`. They are an early scaffold: the config still carries a placeholder app
id and name, and `webDir` points at `out/`, while Kitevo's web app relies on server-side routes
and does not produce a static export. Expect to set `appId`, `appName` and either a static
`webDir` or a `server.url` pointing at a deployed Kitevo instance before shipping a store build.

```bash
# Sync web assets and native plugins, then open the IDE
npm run ios:build && npm run ios          # Xcode (macOS, Xcode + CocoaPods required)
npm run android:build && npm run android  # Android Studio (JDK + Android SDK required)
```

Signing keys, keystores, provisioning profiles, `google-services.json` and
`GoogleService-Info.plist` are gitignored and must never be committed.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Apply local migrations (`predev`), then start Next.js in development mode |
| `npm run build` | Production build |
| `npm run build:vercel` | Vercel build: env guards, `prisma migrate deploy` (production only), `next build` |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm test` / `npm run test:watch` | Vitest unit and API tests |
| `npm run test:e2e` | Playwright end-to-end tests (`:headed`, `:ui` variants) |
| `npm run db:migrate:deploy` | Apply pending migrations to the database in `.env` |
| `npm run db:studio` | Prisma Studio |
| `npm run ios:build` / `npm run ios` | Build and sync the iOS project / open it in Xcode |
| `npm run android:build` / `npm run android` | Build and sync the Android project / open it in Android Studio |

Maintenance scripts in `scripts/` (run with `npx tsx`): `comp-user.ts` (grant/revoke comped
plans), `encrypt-platform-tokens.ts` (token encryption backfill), `funnel-report.ts` (cohort
report), `refresh-creator-stats.ts` (discover stats cache), `generate-social-graphics.ts`
(brand mark, OG image and favicon).

## Testing

```bash
npm test                    # Vitest: unit + API route tests (no database needed; Prisma is mocked)
npx playwright install      # once, to download browsers
npm run test:e2e            # Playwright: starts `npm run dev` and runs e2e/*.spec.ts
```

Unit tests live next to the code as `*.test.ts`. CI (`.github/workflows/ci.yml`) runs the
typecheck, the Vitest suite and a production build on every pull request.
See [docs/TEST_CASES.md](./docs/TEST_CASES.md) for the test index.

## Deployment

Kitevo is built for **Vercel + Supabase Postgres**:

- `vercel.json` runs `npm run build:vercel`, whose guards fail production builds on known
  silent misconfigurations (wrong app URL, sandbox email sender, missing database pooler,
  test-mode payments in production), and schedules the monthly payouts-digest cron.
- Migrations apply automatically on deploy, from both the Vercel build and the
  `DB migrations` GitHub Action (`.github/workflows/db-migrate.yml`, gated on the tests).
- Supabase needs two connection strings: the transaction pooler for runtime
  (`DATABASE_URL`) and the session pooler for migrations (`DIRECT_URL`).

The full, ordered checklist (env vars, OAuth redirect URIs, webhooks, token encryption,
rollback playbooks, Meta and Google app review) is in **[DEPLOY.md](./DEPLOY.md)**.

## Roadmap

From the product plan in [docs/PLAN.md](./docs/PLAN.md):

- [x] **Phase 0: trust and foundations**: free tier, manual stats, versioned migrations,
      token encryption, admin and ops, trials and coupons, funnel analytics, custom domains
- [ ] **Phase 1: commerce core (in progress)**: free downloads, paid products on creator-owned
      Razorpay / Stripe / PayPal, book-a-call via the creator's own scheduler, brand deal payments
- [ ] **Phase 2: audience and growth**: courses and memberships, community spaces, funnels and
      upsells, email broadcasts (referrals and AI Copilot have shipped)
- [ ] **Phase 3: brand-deal moat**: contracts and e-signature, brand CRM and team seats,
      agency plan, public API and webhooks, mobile apps

Have an idea? Open a [feature request](https://github.com/S07K/kitevo/issues/new/choose) or start a
[discussion](https://github.com/S07K/kitevo/discussions).

## Contributing

Contributions are welcome. Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the
development setup, branch naming (`feat/`, `fix/`, `chore/`, `docs/`, ...), Conventional
Commits and the review process. All changes go through a pull request reviewed by the code
owner. By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
For help, see [SUPPORT.md](./SUPPORT.md).

## Security

Please **do not** report vulnerabilities in public issues. Use
[GitHub private vulnerability reporting](https://github.com/S07K/kitevo/security/advisories/new);
see **[SECURITY.md](./SECURITY.md)** for details.

## License

Kitevo is licensed under the **[GNU Affero General Public License v3.0 only](./LICENSE)**
(`AGPL-3.0-only`).

Copyright (C) 2026 S07K and Kitevo contributors.

In short: you can use, study, modify and share Kitevo, but if you run a modified version as
a network service, you must make your modified source code available to its users under the
same license.

## Acknowledgements

Kitevo is built on excellent open-source software and services, including
[Next.js](https://nextjs.org), [React](https://react.dev), [Prisma](https://www.prisma.io),
[Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) and
[Magic UI](https://magicui.design) (iPhone frame), [NextAuth.js](https://next-auth.js.org),
[Capacitor](https://capacitorjs.com), [Recharts](https://recharts.org),
[Motion](https://motion.dev), [lucide](https://lucide.dev), [thesvg](https://www.npmjs.com/package/thesvg)
(brand icons), [react-pdf](https://react-pdf.org), [PptxGenJS](https://gitbrent.github.io/PptxGenJS/),
[Vitest](https://vitest.dev) and [Playwright](https://playwright.dev).
