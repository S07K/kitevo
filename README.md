# Kitevo — Creator Media Kit Builder

A professional media kit platform for creators. Turn your social stats into a high-end, shareable page with live Instagram and YouTube data, audience demographics, and growth charts, built to send to brands.

Live at [getkitevo.com](https://getkitevo.com).

## What's built

### Auth & accounts
- Email/password signup with email verification, Google SSO, forgot/reset password
- Rate limiting on all three unauthenticated email routes (signup, forgot-password, resend-verification)
- Onboarding flow: profile → connect platforms → choose plan → create kit

### Creator dashboard
- Multi-kit management (create, rename slug, delete, password-protect)
- Connect/disconnect Instagram and YouTube
- Kit editor: brand kit vibes, rates, brand partners, section visibility
- Analytics: kit views over time, referrer breakdown
- Inquiry inbox (Pro): brand inquiries with a status pipeline

### Kit page (public, brand-facing)
- Hero with avatar, name, bio, niches, location
- **Instagram**: live followers, engagement, audience demographics (age / gender / country), and a 9:16 Reels-style post grid (Starter+; free kits use creator-reported stats instead)
- **YouTube**: live subscribers, total views, video count, and a recent-video grid (Starter+)
- Manual headline stats for unconnected platforms, always labelled "self-reported" on the public kit
- Follower-growth chart, brand partners, rates, contact
- Five Brand Kit Vibes (Editorial, Studio, Bloom, Electric, Noir) plus starter styles
- Honesty rules: never renders fabricated stats; hides anything unavailable

### Subscriptions & payments
- **Provider-agnostic** (`lib/payments`): Stripe and Dodo Payments, selected by `PAYMENT_PROVIDER`. Dodo is a Merchant of Record, which lets an Indian founder sell worldwide without a US entity or per-jurisdiction tax registration.
- Checkout, webhook-driven subscription lifecycle, hosted billing portal, plan upgrades
- Free (1 kit + manual stats), Starter (1 kit, $9/mo), Pro (3 kits + inquiry inbox + verified tick, $15/mo), Brand Pro ($29/mo)

## Tech stack

- **Framework**: Next.js 16 App Router + React + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL via Prisma, on Supabase
- **Auth**: NextAuth (credentials + Google)
- **Payments**: Stripe or Dodo Payments (`PAYMENT_PROVIDER`)
- **Email**: Resend
- **Hosting**: Vercel

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values; .env.example documents each one
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The schema is synced with
`prisma db push` (there are no migration files); `npm run build:vercel` runs it
automatically on deploy.

**`.env.example` is the source of truth for environment variables** — it explains
each one and the non-obvious gotchas (Supabase's two connection strings, why the
email sender must be on a verified domain, the `PAYMENT_PROVIDER` prefix). This
README deliberately does not duplicate that list, because the duplicate is what
goes stale.

## Testing

```bash
npm test          # vitest, ~150 tests
npm run build     # production build (also typechecks)
```

## Provider setup pointers

- **Instagram** (Meta Graph API): a Meta app with the Instagram product, a Facebook Page linked to an Instagram Business/Creator account, and redirect URI `{APP_URL}/api/instagram/callback`. The scopes need App Review before non-tester accounts can connect; testers work immediately.
- **YouTube / Google**: one OAuth client covers SSO and YouTube. Enable YouTube Data API v3, add redirect URIs `{APP_URL}/api/auth/callback/google` and `{APP_URL}/api/youtube/callback`. Publish the consent screen or refresh tokens expire after 7 days.
- **Payments**: set `PAYMENT_PROVIDER` and the matching provider's keys and product/price ids. Point a webhook at `{APP_URL}/api/webhook`.

## Production deployment

See **[DEPLOY.md](./DEPLOY.md)** — the full, ordered checklist, including the
build guards in `scripts/vercel-build.cjs` that fail the build on the
silent-failure env mistakes (wrong app URL, sandbox email sender, missing DB
pooler, Dodo in test mode on production).

## Architecture notes

Deeper conventions and the reasoning behind non-obvious decisions live in
[CLAUDE.md](./CLAUDE.md): the payments provider interface, kit-page honesty
rules, the brand mark, chart rendering constraints, and more.

## Project structure

```
app/
  api/            — API routes (auth, kits, instagram, youtube, webhook, ...)
  dashboard/      — Creator dashboard + kit editor
  kit/[username]/ — Public kit page (server + client)
  onboarding/     — New-user setup flow
  components/     — Shared UI
lib/
  payments/       — Provider-agnostic payments (types, stripe, dodo, selection)
  platforms/      — Social platform abstraction
  instagram-api.ts, youtube-api.ts, email.ts, rate-limit.ts, logo.ts
config/
  subscriptions.ts — Tiers, price/product-id resolution per provider
prisma/
  schema.prisma
scripts/
  vercel-build.cjs         — Build entry with env guards + db push
  generate-social-graphics.ts — Brand mark → OG image, avatar, favicon
```
