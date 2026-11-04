# Kitevo — Production Deploy Checklist

> **Shipping the current feature branches?** Follow [RELEASE.md](./RELEASE.md), the step-by-step post-merge checklist.

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

- Import `github.com/S07K/kitevo` (branch `main`). It must stay on a personal
  account: Vercel Hobby refuses private **organization** repos, though private
  personal ones are fine. Moving it back to an org means paying for Pro.
- **Leave Build and Output Settings alone.** `vercel.json` already sets
  `buildCommand: npm run build:vercel`, so Vercel reads it and shows the field
  greyed out with that value. That is correct, not broken. The default
  `npm run build` would skip `prisma generate` and `prisma migrate deploy` and
  ship a stale client against an unmigrated database, which is exactly why the
  command lives in version control rather than in a dashboard field.
- Framework preset: Next.js. Install/output settings: defaults.

## 2. Production Postgres (Supabase)

Supabase offers three connection strings and Prisma needs **two of them**, neither
being the one called "direct connection". Get this wrong and it fails at runtime
or mid-migration with errors that don't name the cause. From Supabase → Connect:

| Env var | Which string | Why |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler**, port **6543**, plus `?pgbouncer=true&connection_limit=1` | Runtime. Serverless opens a connection per invocation and exhausts a direct one. Transaction mode has no prepared statements, and Prisma uses them unless `pgbouncer=true` says otherwise. |
| `DIRECT_URL` | **Session pooler**, port **5432** (the `...pooler.supabase.com` host) | Migrations. Schema-mutating commands run in a transaction, which the transaction pooler cannot do. |

**Do not use Supabase's "direct connection" (`db.<ref>.supabase.co`) for
`DIRECT_URL`.** It is IPv6-only unless you buy the IPv4 add-on, and Vercel's
builder will not reach it. The shared pooler is IPv4 on every tier, which is why
the session pooler is the right answer here.

`prisma/schema.prisma` declares both via `url` and `directUrl`.
`scripts/vercel-build.cjs` fails the build if `DATABASE_URL` is set without
`DIRECT_URL`, and warns if either port looks wrong.

- Schema changes are **versioned migrations**, applied automatically at
  deploy time — twice over, redundantly and safely:
  1. `scripts/vercel-build.cjs` runs `prisma migrate deploy` **before**
     `next build`, so a deploy either lands with the new schema or does not
     land at all (a failed migration fails the build; the old version keeps
     serving).
  2. A GitHub Action (`.github/workflows/db-migrate.yml`) runs the same
     `prisma migrate deploy` on every push to `main` after the test suite
     passes. Whichever runs first applies a pending migration; the other
     reports "No pending migrations" and exits 0. `migrate deploy` only
     ever applies pending migrations — it never resets and never drops data.
- New migrations are authored locally against your dev database
  (`npx prisma migrate dev --name my_change`, with both `DATABASE_URL` and
  `DIRECT_URL` pointing at the local DB), committed with the schema change,
  and applied to prod by the deploy flow above — never by hand.
- **One-time baseline (do this before the first deploy that includes
  migrations).** The production DB already has its tables — created via the
  old `db push` flow — but no migration history, so `migrate deploy` fails
  fast with error `P3005`. Repair it by telling Prisma the existing schema is
  the baseline, i.e. two local commands against the production URLs from
  step 3:
  ```bash
  DATABASE_URL="<prod 6543 url>" DIRECT_URL="<prod 5432 url>" npx prisma db push
  # then:
  DATABASE_URL="<prod 6543 url>" DIRECT_URL="<prod 5432 url>" npx prisma migrate resolve --applied 20261031000000_init
  ```
  The `db push` is a no-op sync (it only adds anything the schema gained
  since the last deploy, e.g. `Kit.manualStats` — additive, no data loss);
  `migrate resolve` marks the baseline migration as already applied and
  creates `_prisma_migrations`. Verified locally: after that pair,
  `migrate deploy` reports "No pending migrations" and
  `prisma migrate diff --from-url <prod> --to-schema-datamodel` reports "No
  difference detected". Until these two commands run, every deploy with
  migrations will fail closed on `P3005` — the old deployment keeps serving.

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set all of these for **Production**. Values come from `.env.local`, except the
ones marked "new for prod".

| Var | Notes |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** (:6543) + `?pgbouncer=true&connection_limit=1`. See step 2. |
| `DIRECT_URL` | Supabase **session pooler** (:5432). Needed for `prisma migrate deploy` (GitHub Action + Vercel build). See step 2. |

**Also set the same two values as GitHub repository secrets** (repo →
Settings → Secrets and variables → Actions → `DATABASE_URL`, `DIRECT_URL`).
`.github/workflows/db-migrate.yml` needs them to apply migrations on push to
`main`; without them that workflow fails loudly with a message pointing here.
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
| `TOKEN_ENCRYPTION_KEYS` | **New for prod.** `k1:<base64 32 bytes>` — encrypts IG/YT tokens at rest. See "Token encryption" below. |
| `ADMIN_EMAILS` | Your email(s), comma-separated. Unlocks `/admin/payouts` and the monthly payouts email. |
| `CRON_SECRET` | `openssl rand -base64 32`. Authenticates the monthly `/api/cron/payouts-digest` cron (vercel.json). |

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
DMARC `v=DMARC1; p=none;` on the **root** (`_dmarc.getkitevo.com`), which covers
`mail.getkitevo.com` too: a root DMARC policy applies to subdomains unless an `sp=`
tag overrides it.

### Referral payouts (Dodo webhook events)

Referral commissions are created from **`payment.succeeded`** and reversed by
**`refund.succeeded`**. In the Dodo dashboard → Webhooks, make sure the endpoint
`https://getkitevo.com/api/webhook` is subscribed to both (in addition to the
`subscription.*` events). If the endpoint is set to "all events", nothing to do.
Payouts are manual for now: `/admin/payouts` shows who is owed what and where → pay in PayPal/Wise/bank →
record the batch reference. Stripe refunds aren't mapped to commissions yet; reverse
those from the admin page.

### Token encryption (`TOKEN_ENCRYPTION_KEYS`)

Instagram/YouTube access + refresh tokens are sealed with AES-256-GCM in
`lib/token-crypto.ts` (`enc:v1:<keyId>:…`). Rollout, once:

1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Set `TOKEN_ENCRYPTION_KEYS` on Vercel **Production** to that key (a bare key is fine; it becomes key id `k1`; `k1:<key>` is equivalent) and redeploy.
   New connects and token refreshes are now encrypted; existing plaintext rows keep
   working (plaintext passes through on read).
3. Encrypt existing rows with the **same** value (dry run first):
   `TOKEN_ENCRYPTION_KEYS=k1:… DATABASE_URL=<session pooler> npx tsx scripts/encrypt-platform-tokens.ts --dry-run`,
   then without `--dry-run`. It also clears the unused Google sign-in tokens on `Account`.

**Back the key up somewhere other than Vercel** (password manager). Lose it and every
encrypted token decrypts to null — creators show as disconnected and must reconnect;
nothing else breaks. Rotation: set `k2:<new>,k1:<old>`, redeploy, re-run the script,
then remove `k1`. A malformed value fails the build; a missing one only warns.

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
- Tighten DMARC once delivery looks healthy: `_dmarc.getkitevo.com` is currently
  `p=none`, which only monitors. Moving it to `p=reject` stops anyone spoofing
  `@getkitevo.com` at brands, which matters more than usual for a product whose
  pitch is that its numbers can be trusted. Watch real delivery for a few weeks
  first, since `p=reject` on a misconfigured domain silently bounces your own mail.

## 8a. Migration rollback plan

**Principle: roll code back, roll the schema forward.** Never hand-edit or "down-migrate" the
production database under pressure. Prisma has no down migrations, and every rollback below
works without one.

### Why the order of events matters here

- Migrations apply **automatically on every push to `main`**, from two places: the GitHub
  Action (`.github/workflows/db-migrate.yml`, after `npm test`) and the Vercel build
  (`scripts/vercel-build.cjs`), whichever runs first.
- The Vercel build applies migrations **before** `next build`. A migration can land even if
  that build then fails, so the **previous** deployment keeps serving traffic on the **new**
  schema.
- Vercel **Instant Rollback** reverts code only. It never touches the database.

So the one rule that makes everything else easy:

### The rule: every migration must work with the previous deployment (expand → contract)

- **Expand (safe in one release):** new tables, new nullable columns, new columns with a
  `DEFAULT`, new indexes (`CREATE INDEX CONCURRENTLY` for big tables, in its own migration).
  The previous app version simply ignores them.
- **Contract (needs two releases):** dropping or renaming a column/table, changing a type,
  making an existing column `NOT NULL`, moving data. Release 1 stops reading/writing the old
  shape (and backfills the new one); only after release 1 is live and healthy does release 2
  ship the `DROP`/`RENAME`/`SET NOT NULL`.
- A migration that would break the currently deployed code is a bug, even if the new code is
  fine. Review migration SQL with that question in mind.

### Before any risky migration: back up

"Risky" = anything in the contract list above, or a data backfill. Before merging it:

```bash
# Uses the session pooler (DIRECT_URL), same as migrate deploy. Keep the file somewhere safe.
pg_dump "$DIRECT_URL" --format=custom --no-owner --file=kitevo-$(date +%Y%m%d-%H%M)-pre-<migration>.dump
# To dump only the tables the migration touches (faster, smaller restore):
pg_dump "$DIRECT_URL" --format=custom --no-owner --table='"User"' --file=...
```

Also note whether your Supabase plan includes dashboard backups / point-in-time recovery
(Project → Database → Backups); if it does, record the time just before the deploy. Don't rely
on it without checking.

### Playbooks

**A. Bad deploy, migration was additive** (the normal case, and every migration so far):

1. Vercel → Deployments → the last good deployment → **Instant Rollback**.
2. Leave the schema alone. The old code ignores the new tables/columns.
3. Fix forward on a branch; the next deploy reuses the already-applied migration.

**B. A migration failed part-way** (`migrate deploy` errors; later deploys report `P3009`):

1. `DATABASE_URL=… DIRECT_URL=… npx prisma migrate status` to see which migration is marked failed.
2. Inspect the database to see what that migration actually created; don't assume all-or-nothing.
3. Either undo its partial changes by hand and run
   `npx prisma migrate resolve --rolled-back <migration_name>`, then ship a corrected migration;
   or finish the remaining statements by hand and run
   `npx prisma migrate resolve --applied <migration_name>`.
4. If users are affected meanwhile, do playbook A for the code.

**C. A destructive migration went wrong** (data dropped or corrupted):

1. Instant Rollback the code (playbook A) so nothing writes to the damaged shape.
2. Restore the affected tables from the pre-migration dump into a scratch schema/database
   (`pg_restore --dbname=… --table=… kitevo-…-pre-<migration>.dump`) and copy the rows back.
   Restoring over production wholesale also discards everything written since the dump.
3. Ship a forward migration that reflects the real, restored state; never edit an applied
   migration file (its checksum is recorded in `_prisma_migrations`).

### Current migrations and how they roll back

| Migration | Contents | Rollback |
|---|---|---|
| `20261031000000_init` | Baseline (13 tables) | Baseline; production was synced and marked applied (step 2) |
| `20261101073730_analytics_events` | New `AnalyticsEvent` table | Additive: playbook A |
| `20261101120000_referrals` | 3 new tables, 3 nullable `User` columns | Additive: playbook A |
| `20261101130000_admin_ops` | 2 new tables | Additive: playbook A |
| `20261102085600_custom_domains` | New `CustomDomain` table | Additive: playbook A. Rolling back code leaves connected domains on the Vercel project; they serve the old app's 404 for "/" until the code returns |
| `20261103071939_commerce_products_orders` | New `Product` and `Order` tables | Additive: playbook A |
| `20261103113633_commerce_payment_connections` | New `PaymentConnection` table, nullable `Order.providerOrderId` | Additive: playbook A. Rolling back code leaves stored (encrypted) keys unused; paid products stop selling until the code returns |

Keep this table current: add a row with every new migration, and flag any contract-type
migration in RELEASE.md together with its backup step.

## 9. Meta App Review and Google OAuth verification

Both require a **live** app: a reachable privacy policy and a screencast of the
real OAuth flow. Neither can be filed before deploying.

**Current status (Aug 2026):**
- Google `youtube.readonly` verification: **DONE** — consent screen In Production,
  branding + domain verified, sensitive scope verified. Record:
  `docs/google-oauth-verification.md`.
- Meta Business Verification: **DONE (Aug 5 2026)** — via the founder's Udyam (MSME)
  registration as "Kitevo"; Meta matched the public record automatically.
- Meta App Review for `instagram_basic`, `instagram_manage_insights`,
  `pages_show_list`, `business_management`: **APPROVED (all four), app is LIVE.** Any
  creator can now connect Instagram. `pages_show_list` was rejected once for an unclear
  screencast (not policy) and approved on re-submit with a captioned demo. Record +
  per-permission writeups: `docs/meta-app-review.md`.
- `pages_show_list` and `business_management` are **both required** — dropping either
  makes `/me/accounts` fail with `no_pages` (see `app/api/instagram/connect/route.ts`).

**The tester path (used for the private beta, now superseded by full review).**
Business Verification is required only if the app is used by people *without a Role
on the app*. Creators added as Instagram **testers** in the Meta dashboard can
connect fully with no review, no Business Verification, and no registered business.
That was the zero-cost path to a private beta; full App Review is what opens Instagram
to any creator.

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

**Publish the OAuth consent screen immediately, even before verification.** While
its publishing status is "Testing", Google expires refresh tokens after 7 days.
`lib/youtube-api.ts` refreshes the access token from the stored refresh token, so
in Testing mode every creator's YouTube data goes dark weekly and they must
reconnect. Moving to "In production" removes that expiry at once; the unverified
warning and the 100-user cap remain until verification clears, and neither blocks
a beta. Publishing and being verified are separate things.

**Known gap:** platform access tokens are stored in plain text. The database
provider encrypts at rest, and the privacy policy now says exactly that rather
than claiming application-level encryption. Worth adding real encryption before
public launch.
