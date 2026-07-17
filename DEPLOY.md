# Kitevo — Production Deploy Checklist

Work top to bottom. The order matters: the app URL is baked into the build and is
registered with three external services, so picking it late means redoing steps.

---

## 0. Decide the URL first

Everything below depends on it. `NEXT_PUBLIC_APP_URL` is a build-time constant
(that's what the `NEXT_PUBLIC_` prefix means), and it is what builds the OAuth
redirect URIs at `app/api/youtube/connect/route.ts` and
`app/api/instagram/connect/route.ts`. It is also registered with Meta, Google, and
Stripe. Changing it later means: update the env var, update three dashboards, and
**redeploy** (an env change alone will not take effect).

If the domain isn't bought yet, ship on the Vercel URL
(`https://kitevo.vercel.app`) and treat the domain switch as a deliberate later
task that repeats steps 3, 5, 6, and 7.

## 1. Vercel project

- Import `github.com/micro-builds/kitevo` (branch `main`).
- **Build Command: `npm run build:vercel`** — not the default `npm run build`.
  The default skips `prisma generate` and `prisma db push`, so the build ships
  a stale Prisma client against an empty database.
- Framework preset: Next.js. Install/output settings: defaults.

## 2. Production Postgres

- Create a Neon (or Vercel Postgres) database. Copy the **pooled** connection
  string.
- Schema sync is `prisma db push`, not migrations — there is no
  `prisma/migrations` directory. `scripts/vercel-build.cjs` runs the push
  automatically once `DATABASE_URL` is set, so the first deploy creates the
  schema.
- `db push` runs with `--accept-data-loss`. On an empty database that's
  harmless. Once real users exist, review any destructive schema change before
  merging to `main`.

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set all of these for **Production**. Values come from `.env.local`, except the
ones marked "new for prod".

| Var | Notes |
|---|---|
| `DATABASE_URL` | Pooled Neon string from step 2. |
| `NEXT_PUBLIC_APP_URL` | The step 0 URL. No trailing slash. |
| `NEXTAUTH_URL` | Same value as `NEXT_PUBLIC_APP_URL`. |
| `NEXTAUTH_SECRET` | **New for prod.** `openssl rand -base64 32`. Do not reuse the dev value. |
| `SUBSCRIPTION_COOKIE_SECRET` | **New for prod.** `openssl rand -base64 32`. Signs the Stripe customer id cookie. |
| `STRIPE_SECRET_KEY` | **Live** key (`sk_live_…`), not test. |
| `STRIPE_WEBHOOK_SECRET` | From step 6 — comes back to fill this in. |
| `STRIPE_PRICE_ID_STARTER` | Live price id. |
| `STRIPE_PRICE_ID_STARTER_YEARLY` | Live price id. |
| `STRIPE_PRICE_ID_PRO` | Live price id. |
| `STRIPE_PRICE_ID_PRO_YEARLY` | Live price id. |
| `STRIPE_PRICE_ID_BRAND` | Live price id. |
| `STRIPE_PRICE_ID_BRAND_YEARLY` | Live price id. |
| `META_APP_ID` | Instagram Graph API. |
| `META_APP_SECRET` | Instagram Graph API. |
| `GOOGLE_CLIENT_ID` | Google SSO + YouTube. |
| `GOOGLE_CLIENT_SECRET` | Google SSO + YouTube. |
| `RESEND_API_KEY` | Transactional email. |
| `RESEND_FROM_EMAIL` | Must be on a Resend-verified domain. Guarded (see below). |

The price ids are read dynamically as
`STRIPE_PRICE_ID_${tierId.toUpperCase()}${suffix}` (`config/subscriptions.ts`),
so a missing one fails at checkout, not at build. Set all six.

Two vars are guarded — `scripts/vercel-build.cjs` fails a **production** build
(preview and local only warn) because both fall back to something that looks fine
and is silently broken:

- **`NEXT_PUBLIC_APP_URL`** — rejected if unset, not https, pointing at
  localhost, or carrying a trailing slash. `lib/app-url.ts` falls back to
  `http://localhost:3000`, which would publish "our website is located at
  localhost:3000" on the privacy page and point every OAuth redirect there.
- **`RESEND_FROM_EMAIL`** — rejected if unset, malformed, or still an
  `@resend.dev` address. `lib/email.ts` falls back to Resend's sandbox sender,
  which only delivers to your own verified address. Every verification email,
  password reset, and inquiry notification to a real user would be dropped with
  no error.

## 4. Stripe live mode

- Flip the dashboard to live mode and recreate the six prices (test prices do not
  carry over). Copy each id into step 3.
- Enable the **Customer Portal** in live mode (Settings → Billing → Customer
  portal). `app/api/create-portal-session/route.ts` depends on it; "Manage
  billing" 500s without it.

## 5. OAuth redirect URIs

Both must exactly match `NEXT_PUBLIC_APP_URL` — scheme, host, no trailing slash.

- **Google Cloud Console** → OAuth client → Authorized redirect URIs:
  - `{APP_URL}/api/auth/callback/google` (NextAuth SSO)
  - `{APP_URL}/api/youtube/callback` (YouTube connect)
- **Meta App Dashboard** → Instagram → Valid OAuth Redirect URIs:
  - `{APP_URL}/api/instagram/callback`
- Meta apps also need to leave Development mode before non-test users can
  connect Instagram.

## 6. Stripe webhook

- Stripe → Developers → Webhooks → Add endpoint: `{APP_URL}/api/webhook`.
- Events: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (step 3), then
  **redeploy**.
- Without this the payment succeeds but `User.verifiedTier` is never set, so the
  user pays and gets nothing. Verify it explicitly in step 7.

## 7. Smoke test on production

Run against the live URL, in order. Each step exercises something a previous
step can't prove.

1. Sign up with email. The verification email arrives (proves Resend + the
   from-domain).
2. Sign in with Google (proves the NextAuth redirect URI).
3. Connect Instagram; confirm followers and the post grid render (proves Meta
   app is live + its redirect URI).
4. Connect YouTube; confirm subscribers and videos render (proves the Google
   YouTube redirect URI + quota).
5. Create a kit, open its public `/kit/{slug}` in a logged-out window.
6. Check the link preview — paste the kit URL into a Slack/X compose box and
   confirm `og-default.png` renders.
7. Subscribe to Pro with a **real card**. Then confirm the blue tick appears —
   that is the webhook working. Refund yourself afterwards.
8. Open Manage billing (proves the portal from step 4).

## 8. After the first deploy

- Set up the creator-stats refresh (`scripts/refresh-creator-stats.ts`) as a
  Vercel Cron so discover's follower/engagement filters don't go stale.
- Watch the YouTube quota for the first week. Kit views cost 2 units each
  (`channels` + `playlistItems`) against a 10k/day default.
- Avatars and logos are base64 in Postgres. Fine at current scale; revisit
  before the row count makes the table unpleasant.
