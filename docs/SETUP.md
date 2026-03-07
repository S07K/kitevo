# Media Kit Pro — Developer setup & onboarding

Quick setup for running the app locally and understanding the codebase. For product plan and roadmap, see [MEDIAKIT_PLAN.md](./MEDIAKIT_PLAN.md).

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Stripe account** (for payments) — [dashboard.stripe.com](https://dashboard.stripe.com)
- (Optional) **Xcode** / **Android Studio** for iOS/Android builds via Capacitor

---

## 1. Clone and install

```bash
git clone <repo-url>
cd me-talk
npm install
```

---

## 2. Environment variables

Copy the example env and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Description | Required for |
|----------|-------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (e.g. `sk_test_...`) | Checkout, portal, webhooks |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) | Webhook handler |
| `STRIPE_PRICE_ID_STARTER` | Stripe Price ID for Starter ($9/mo, 1 kit) | Checkout — Starter |
| `STRIPE_PRICE_ID_PRO` | Stripe Price ID for Pro ($15/mo, 3 kits) | Checkout — Pro, upgrade |
| `SUBSCRIPTION_COOKIE_SECRET` | Random 32+ char string to sign cookies | Subscription session |
| `NEXT_PUBLIC_APP_URL` | App origin (e.g. `http://localhost:3000`) | Redirect URLs |
| `DATABASE_URL` | PostgreSQL URL (e.g. Neon, Vercel Postgres; `postgresql://...`) | Auth, Phase 7–8 |
| `NEXTAUTH_SECRET` | Random 32+ char string for JWT signing | Auth |
| `NEXTAUTH_URL` | Same as `NEXT_PUBLIC_APP_URL` | Auth callbacks |
| `META_APP_ID` | Facebook App ID (for Connect Instagram) | Instagram OAuth |
| `META_APP_SECRET` | Facebook App secret | Instagram OAuth |

**Instagram (Meta):** To enable “Connect Instagram” you need a [Facebook App](https://developers.facebook.com/apps/) with Instagram Graph API. Add the product “Instagram” and use Facebook Login. In Facebook Login settings, add **Valid OAuth Redirect URIs**: `https://your-domain.com/api/instagram/callback` (and for local: `http://localhost:3000/api/instagram/callback`). The app uses scopes `business_management`, `instagram_basic`, `pages_show_list`, `instagram_manage_insights` (business_management is required for /me/accounts to return Pages). The user’s Instagram must be a Business or Creator account linked to a Facebook Page.

**Subscription tiers:** The number of kits a creator can create is determined by their Stripe subscription price. If `SUBSCRIPTION_TIER_KITS` is set, that map is used; otherwise the default price (`STRIPE_PRICE_ID`) gets `SUBSCRIPTION_KITS_DEFAULT` (default 1). Example for a “Pro” plan with 3 kits: add a second Price in Stripe and set `SUBSCRIPTION_TIER_KITS={"price_abc":1,"price_pro123":3}`.

**Stripe:** Create a Product with two recurring Prices ($9/mo and $15/mo) in the Dashboard and set the IDs in env. For local webhooks, run:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.

**Stripe webhook (optional for now):** You can set up the webhook later. Without it, subscription still works: when the user returns to the dashboard after checkout, we exchange `session_id` in `POST /api/subscription-status` and link the Stripe customer to the user in the DB. The webhook does the same link on Stripe’s side (e.g. if the user closes the tab before the redirect). When you’re ready:

1. **Stripe Dashboard** → Developers → Webhooks → Add endpoint.
2. **Endpoint URL:** production `https://yourdomain.com/api/webhook` (for local use `stripe listen` above or ngrok + that URL).
3. **Events:** at least `checkout.session.completed` (optionally `customer.subscription.updated`, `customer.subscription.deleted`).
4. Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in `.env.local` (or your host’s env).

---

## 3. Database migrations

After cloning or before first run (and after any schema change):

```bash
npx prisma generate
npx prisma migrate deploy
```

For a **new** Postgres DB, the first migration creates tables. Use the same `DATABASE_URL` format locally (e.g. Neon branch or local Postgres) and in production (Vercel env).

---

## 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Key routes:

- `/` — Landing
- `/dashboard` — Creator dashboard (subscription, kit link)
- `/pricing` — Pricing and subscribe
- `/kit/demo` or `/kit/alexchen` — Public media kit (brand view)

---

## 5. Deploy to Vercel (production)

1. **Connect repo** — [vercel.com](https://vercel.com) → New Project → Import your Git repo (e.g. GitHub). Framework: Next.js (auto-detected).

2. **Database** — The app uses PostgreSQL. For production:
   - **Vercel Postgres** or **Neon** (or any Postgres). Create a database and copy the connection string.
   - In Vercel → Project → Settings → Environment Variables, add `DATABASE_URL` with the Postgres URL (e.g. `postgresql://...`).

3. **Run migrations** — After first deploy, run migrations against the production DB:
   - Either in Vercel Build Command add `prisma generate && prisma migrate deploy` before `next build`, or
   - Run locally once: `DATABASE_URL="your-production-postgres-url" npx prisma migrate deploy`

4. **Environment variables** — In Vercel → Settings → Environment Variables, set all required vars (see table in §2):
   - `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` (use your production URL, e.g. `https://yourapp.vercel.app`)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`
   - `SUBSCRIPTION_COOKIE_SECRET`, `META_APP_ID`, `META_APP_SECRET` (if using Instagram)

5. **Stripe webhook** — In Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://yourapp.vercel.app/api/webhook`
   - Events: `checkout.session.completed` (and optionally `customer.subscription.updated`, `customer.subscription.deleted`)
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel env.

6. **Redeploy** — Trigger a new deployment so env vars and DB are used. Your app will be live at `yourapp.vercel.app`. Add a custom domain later in Vercel → Settings → Domains if needed.

---

## 6. Production build (local or other hosts)

The app is configured for **web deployment only** (no `output: "export"`), so API routes (Stripe, subscription status, etc.) run in production. Deploy to Vercel, Railway, or any Node host:

```bash
npm run build
npm start
```

Set env vars on your host (see table above). For Stripe webhooks, use your production URL: `https://your-domain.com/api/webhook`.

**Deploy where? (Vercel vs AWS, etc.)**

- **Vercel** — Easiest for Next.js: connect the repo, set env vars, deploy. You get a URL like `your-app.vercel.app`. No server to manage; good free tier. Recommended to start.
- **AWS** (e.g. **Lightsail**, Amplify, or EC2 + Node) — Works too; more setup (build, process manager, env, optional load balancer). Use if you prefer AWS or have other infra there.

**Domain for monetization**

You do **not** need a custom domain to launch. Deploy first → you get a default URL (e.g. `yourapp.vercel.app` or an Amplify URL). When you’re ready to monetize or brand, add your own domain:

- **Vercel:** Project → Settings → Domains → Add (e.g. `mediakitpro.com`). Point your registrar’s DNS to Vercel (they show the records). No code change.
- **AWS:** Point your domain to the load balancer or Amplify app via Route 53 or your DNS provider.

So: **deploy now with the default URL, add a custom domain later** when you want a “real” brand and to monetize.

**Traffic (page views)**

The app includes **Vercel Analytics** (`@vercel/analytics`). When deployed on **Vercel**, page views are recorded automatically; you’ll see traffic (visits, top pages) in the Vercel dashboard under your project → Analytics. No env vars or config needed. If you deploy elsewhere (e.g. AWS), that script does nothing; you can add Google Analytics or Plausible in `app/layout.tsx` instead.

---

**iOS / Android (Capacitor):** Not configured for current release. To add mobile later, you’d need a separate backend or serverless APIs for the app to call, plus a static or hybrid build for the native wrapper.

---

## 7. Project structure (where to look)

```
me-talk/
├── app/
│   ├── api/                    # API routes
│   │   ├── create-checkout-session/   # Stripe Checkout
│   │   ├── create-portal-session/     # Stripe Customer Portal
│   │   ├── subscription-status/       # Cookie + Stripe subscription check
│   │   └── webhook/                    # Stripe webhooks
│   ├── components/            # Shared UI (AppNav, SubscribeButton)
│   ├── dashboard/             # Creator dashboard
│   ├── kit/[username]/        # Public media kit (brand-facing)
│   ├── pricing/
│   ├── layout.tsx
│   └── page.tsx               # Landing
├── lib/
│   ├── platforms/              # Social platform abstraction (Instagram first)
│   │   ├── types.ts            # PlatformId, PlatformStats, etc.
│   │   ├── instagram.ts        # Instagram adapter (mock for now)
│   │   ├── registry.ts         # Enabled platforms; add TikTok/YT here
│   │   └── index.ts            # Public API
│   ├── mock-data.ts            # Demo creator profile + links
│   ├── stripe.ts               # Stripe SDK instance
│   └── subscription-cookie.ts # Signed cookie for customer id
├── docs/
│   ├── SETUP.md                # This file
│   └── MEDIAKIT_PLAN.md        # Product plan vs CreatorsJet
├── .env.example
└── README.md
```

---

## 8. Social platforms (Instagram only; add TikTok/YouTube later)

Stats and charts are driven by **`lib/platforms`**. Only **Instagram** is enabled right now; the code is structured so TikTok and YouTube can be added without changing the rest of the app.

**Concepts:**

- **PlatformId** — `"instagram" | "tiktok" | "youtube"` (see `lib/platforms/types.ts`).
- **Platform adapter** — Each platform has a file (e.g. `instagram.ts`) that exports `getMeta()` and `getStats(handle?)`. Stats can include optional `growthDataPoints` and `audienceDemographics` for charts.
- **Registry** — `lib/platforms/registry.ts` lists `ENABLED_PLATFORMS` and wires each id to an adapter. The dashboard and media kit page loop over enabled platforms and render one card per platform.

**To add TikTok (or YouTube):**

1. Add `lib/platforms/tiktok.ts` with:
   - `getTikTokMeta()` returning `{ id: "tiktok", displayName: "TikTok" }`.
   - `getTikTokStats(handle?)` returning `Promise<PlatformStats>` (and optionally `PlatformStatsWithCharts` if you have growth/demographics).
2. In `lib/platforms/registry.ts`:
   - Add `"tiktok"` to `ENABLED_PLATFORMS`.
   - In `PLATFORM_ADAPTERS`, add `tiktok: { getMeta: getTikTokMeta, getStats: getTikTokStats }`.
3. Ensure `PlatformId` in `types.ts` includes `"tiktok"` (it already does).

No changes are needed in the dashboard or media kit page; they already iterate over `getEnabledPlatformIds()` and `platformStats[id]`.

**Instagram today:** Uses mock data in `lib/platforms/instagram.ts`. Replace with Meta Graph API / Instagram Basic Display when the app is approved (see TODO in that file).

---

## 9. Stripe flow (reference)

- **Subscribe:** User hits Pricing or Dashboard → `POST /api/create-checkout-session` → redirect to Stripe Checkout → success redirect to `/dashboard?success=true&session_id=cs_xxx`.
- **Session → cookie:** Dashboard calls `POST /api/subscription-status` with `session_id` → backend sets signed httpOnly cookie (customer id) and returns `hasSubscription: true`.
- **Return visits:** Same endpoint with cookie only → backend checks Stripe subscription → returns status; if canceled, cookie is cleared.
- **Manage subscription:** `POST /api/create-portal-session` (with cookie) → returns Stripe Billing Portal URL → user is redirected back to `/dashboard` after leaving the portal.

---

## 10. Comments in code

- **`lib/platforms/`** — File-level comments explain types, adapters, and how to add a new platform.
- **`app/api/`** — Routes are short; Stripe usage is standard (checkout, portal, webhook).
- **`lib/subscription-cookie.ts`** — Signs and verifies the customer id cookie used for subscription and portal.

If something is unclear, add a short comment and/or update this doc.
