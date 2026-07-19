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

**Decided: `getkitevo.com`** (bought July 2026). Use it from the first deploy so
steps 3, 5, 6 and 7 are only done once. Matches the `@getkitevo` handle across X,
Instagram and LinkedIn.

`kitevo.com` was taken (investor, $997 on Afternic, renewed to 2027). If it is
ever bought, `getkitevo.com` must stay renewed **permanently** as a redirect:
Kitevo's product is a link that lives in brands' inboxes, so a shared kit URL can
never 404.

## 1. Vercel project

- Import `github.com/micro-builds/kitevo` (branch `main`).
- **Build Command: `npm run build:vercel`** — not the default `npm run build`.
  The default skips `prisma generate` and `prisma db push`, so the build ships
  a stale Prisma client against an empty database.
- Framework preset: Next.js. Install/output settings: defaults.

## 2. Production Postgres (Supabase)

Supabase offers three connection strings and Prisma needs **two of them**, neither
being the one called "direct connection". Get this wrong and it fails at runtime
or mid-migration with errors that don't name the cause. From Supabase → Connect:

| Env var | Which string | Why |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler**, port **6543**, plus `?pgbouncer=true&connection_limit=1` | Runtime. Serverless opens a connection per invocation and exhausts a direct one. Transaction mode has no prepared statements, and Prisma uses them unless `pgbouncer=true` says otherwise. |
| `DIRECT_URL` | **Session pooler**, port **5432** (the `...pooler.supabase.com` host) | Schema changes. `prisma db push` runs in a transaction, which the transaction pooler cannot do. |

**Do not use Supabase's "direct connection" (`db.<ref>.supabase.co`) for
`DIRECT_URL`.** It is IPv6-only unless you buy the IPv4 add-on, and Vercel's
builder will not reach it. The shared pooler is IPv4 on every tier, which is why
the session pooler is the right answer here.

`prisma/schema.prisma` declares both via `url` and `directUrl`.
`scripts/vercel-build.cjs` fails the build if `DATABASE_URL` is set without
`DIRECT_URL`, and warns if either port looks wrong.

- Schema sync is `prisma db push`, not migrations — there is no
  `prisma/migrations` directory. The build runs the push automatically once
  `DATABASE_URL` is set, so the first deploy creates the schema.
- `db push` runs with `--accept-data-loss`. On an empty database that's
  harmless. Once real users exist, review any destructive schema change before
  merging to `main`.

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set all of these for **Production**. Values come from `.env.local`, except the
ones marked "new for prod".

| Var | Notes |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** (:6543) + `?pgbouncer=true&connection_limit=1`. See step 2. |
| `DIRECT_URL` | Supabase **session pooler** (:5432). Needed for `db push`. See step 2. |
| `NEXT_PUBLIC_APP_URL` | `https://getkitevo.com` — no trailing slash (the build guard rejects one). |
| `NEXTAUTH_URL` | `https://getkitevo.com` — same as `NEXT_PUBLIC_APP_URL`. |
| `NEXTAUTH_SECRET` | **New for prod.** `openssl rand -base64 32`. Do not reuse the dev value. |
| `SUBSCRIPTION_COOKIE_SECRET` | **New for prod.** `openssl rand -base64 32`. Signs the Stripe customer id cookie. |
| `STRIPE_SECRET_KEY` | **Test** key (`sk_test_…`) for now — see step 4. Live key only at launch. |
| `STRIPE_WEBHOOK_SECRET` | From step 6 — comes back to fill this in. |
| `STRIPE_PRICE_ID_STARTER` | Test price id for now; swap at launch (step 4). |
| `STRIPE_PRICE_ID_PRO` | Test price id for now; swap at launch (step 4). |
| `STRIPE_PRICE_ID_BRAND` | Test price id for now; swap at launch (step 4). |
| `STRIPE_PRICE_ID_BRAND_YEARLY` | Test price id for now; swap at launch (step 4). |
| `META_APP_ID` | Instagram Graph API. |
| `META_APP_SECRET` | Instagram Graph API. |
| `GOOGLE_CLIENT_ID` | Google SSO + YouTube. |
| `GOOGLE_CLIENT_SECRET` | Google SSO + YouTube. |
| `RESEND_API_KEY` | Transactional email. |
| `RESEND_FROM_EMAIL` | `Kitevo <hello@mail.getkitevo.com>` — see the note below. Guarded. |

The price ids are read dynamically as
`STRIPE_PRICE_ID_${tierId.toUpperCase()}${suffix}` (`config/subscriptions.ts`),
so a missing one fails at checkout, not at build. Only four exist: `brand` is the
only tier with a yearly price, so there is no `STARTER_YEARLY` or `PRO_YEARLY`.

**The verified sending domain is `mail.getkitevo.com`, not the root.** Sending
from a subdomain is deliberate: transactional bounces and spam complaints hit the
subdomain's reputation instead of `getkitevo.com`, so a bad send week can't
poison mail from the root later. Resend only sends from a *verified* domain, so
`hello@getkitevo.com` would be rejected on every send. Use
`Kitevo <hello@mail.getkitevo.com>`. The display-name form is what makes the From
line read "Kitevo" rather than a raw address.

Verified records (checked live, July 2026): DKIM at
`resend._domainkey.mail.getkitevo.com`, SPF `v=spf1 include:amazonses.com ~all`
on `send.mail.getkitevo.com`, MX to `feedback-smtp.eu-west-1.amazonses.com`,
DMARC `p=none` on the subdomain.

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

## 4. Stripe live mode — AT LAUNCH, NOT NOW

Deploy with **test** keys. The pre-launch deploy exists so Meta and Google
reviewers can see a live app; nobody is paying, so live Stripe is not needed and
its absence blocks nothing. This also decouples the deploy from Stripe India's
invitation queue and the registered-business requirement, which are measured in
weeks.

When you actually launch:

- Flip the dashboard to live mode and recreate the four prices (test prices do not
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
- Add DMARC on the **root**: `_dmarc.getkitevo.com` → `v=DMARC1; p=reject;`.
  Nothing legitimate sends from the root (all mail goes via
  `mail.getkitevo.com`), so `p=reject` costs nothing and stops anyone spoofing
  `@getkitevo.com` at brands — which matters more than usual for a product whose
  pitch is that its numbers can be trusted. Leave the subdomain's `p=none` until
  you've watched real delivery for a few weeks.

## 9. Meta App Review and Google OAuth verification

Both require a **live** app: a reachable privacy policy and a screencast of the
real OAuth flow. Neither can be filed before deploying.

**You may not need Meta App Review to start.** Business Verification is required
only if the app is used by people *without a Role on the app*. Creators added as
Instagram **testers** in the Meta dashboard can connect fully with no review, no
Business Verification, and no registered business. That is the zero-cost path to
a private beta.

Prepared in advance:

- **Data Deletion Request Callback**: `{APP_URL}/api/meta/data-deletion`. Meta
  requires this URL and its absence is a standard rejection. It verifies Meta's
  HMAC-signed `signed_request`, then clears the Instagram connection and every
  cached stat derived from it. It deliberately does *not* delete the account, as
  the user may have signed up by email. Paste this URL into the Meta app
  dashboard under Data Deletion.
- **Deauthorize Callback URL**: the same endpoint works.
- The privacy policy carries the sections Google checks during OAuth
  verification: YouTube API Services disclosure, a link to the YouTube Terms of
  Service, a link to Google's Privacy Policy, and how to revoke access via
  Google's security settings page. A `#data-deletion` anchor documents all three
  deletion routes.

`youtube.readonly` is a **sensitive** scope, not restricted, so it needs no paid
third-party security assessment. Unverified, users see an "unverified app" screen
and you are capped at 100 of them, which is enough for a beta.

**Known gap:** platform access tokens are stored in plain text. The database
provider encrypts at rest, and the privacy policy now says exactly that rather
than claiming application-level encryption. Worth adding real encryption before
public launch.
