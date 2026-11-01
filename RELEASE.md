# Next release: what to do after merging to `main`

A running checklist for the work currently on feature branches. Updated as each branch
lands. Tick items off as you go; delete the section once it's live.

**Last updated:** 2026-11-01 (dashboard polish + admin ops added)

---

## 1. Merge order

The branches are stacked; each contains the one before it.

| Order | Branch | What it ships |
|---|---|---|
| 1 | `feat/token-encryption` | Encrypt Instagram/YouTube tokens at rest; plan docs |
| 2 | `feat/analytics-events` | Funnel analytics events; privacy policy fixes |
| 3 | `feat/referrals` | Referral program, payout details, admin payouts page, referral marketing (hero badge, `/referral-program`, dashboard card, sidebars) |
| 4 | `feat/onboarding` | 3-step onboarding with live kit preview, auto-created kit, no plan step; admin payouts page without CSV; username rules |
| 5 | `feat/workspace-sidebar` | One sidebar for the whole app: dashboard top links removed; Campaigns/Messages grouped under Social; Plan & billing, Settings, View my kit in the sidebar footer |
| 6 | `feat/workspace-ui` | One route per tab (`/campaigns`, `/messages`, `/discover`, `/settings`; old URLs 301), shared page shell/headers on every tab, dashboard redesigned as a creator workspace |
| 7 | `feat/dashboard-polish` | Design-critique pass across the workspace: dashboard (main kit shown once via spotlight + "…" menu, verified tick, honest audience-numbers prompt, banners in one place, ARIA tabs), shimmer skeletons matching every layout, redesigned profile + brand settings forms with unsaved-changes save bar, two-column wide layout for Settings, Invite & earn and Campaigns (feed, manager, detail), shared `Button`/`Modal`/`AccountPanels`, dark-mode fixes. No deploy steps. *(Committed on `feat/workspace-ui`; `feat/dashboard-polish` points at the same commit.)* |
| 8 | `feat/admin-ops` | `/admin` user lookup, comp + plan resync controls, payment webhook log with replay, admin audit log. Adds migration `20261101130000_admin_ops` (new tables only). *(Merged into `feat/workspace-ui`.)* |
| 9 | `feat/color-palettes` | Warmer default light theme ("Paper" cream instead of near-white) plus five more light palettes (Sage, Mist, Blush, Lavender, Classic) picked from the account menus or Settings → Appearance; full-page backgrounds use a tinted `canvas` token. Public kits are unaffected. No deploy steps. |
| 10 | `feat/persistent-shell` | Workspace routes moved into the `app/(workspace)` route group (URLs unchanged) with one persistent layout: top bar + sidebar render once, tab clicks swap only the page, plus an instant loading state. No deploy steps. *(Branched from `feat/workspace-ui`; `feat/color-palettes` merged in.)* |

Merge `feat/persistent-shell`: it contains `feat/color-palettes`, `feat/workspace-ui` and everything above them, including dashboard polish and admin ops.

---

## 2. Before you merge: Vercel environment variables (Production)

Vercel → Project → Settings → Environment Variables → **Production**. Set these
**before** merging so the first deploy already has them.

- [ ] **`TOKEN_ENCRYPTION_KEYS`** — a 32-byte base64 key. Generate one:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  Paste the bare key (it becomes key id `k1`). **Save a copy in your password manager**:
  if it's lost, creators just have to reconnect Instagram/YouTube, but payout details
  saved by referrers become unreadable.
  Use a different key from your local `.env`.
- [ ] **`ADMIN_EMAILS`** — `shubham3431kumar@gmail.com` (comma-separate more). Unlocks
  `/admin/payouts` and the monthly "payouts due" email. Everyone else gets a 404.
- [ ] **`CRON_SECRET`** — `openssl rand -base64 32`. Vercel sends it to the monthly
  payouts cron (`/api/cron/payouts-digest`, 1st of the month, 09:00 UTC).

Nothing else changes. `DATABASE_URL` / `DIRECT_URL` (Vercel + GitHub secrets) are already set.

---

## 3. Merge

- [ ] Merge to `main` (PR or fast-forward).
- [ ] Watch **GitHub Actions → db-migrate**: tests run, then `prisma migrate deploy` applies
  three new migrations: `20261101073730_analytics_events`, `20261101120000_referrals` and
  `20261101130000_admin_ops`. All only **add** tables/columns; nothing is dropped or rewritten.
- [ ] Watch the **Vercel production build**. It also runs `migrate deploy` (no-ops if the
  Action got there first). It **fails on purpose** if `TOKEN_ENCRYPTION_KEYS` is malformed.

---

## 4. Right after the deploy

- [ ] **Encrypt existing tokens** (one-time). Same key as Vercel, Supabase **session pooler** URL:
  ```bash
  TOKEN_ENCRYPTION_KEYS="<prod key>" DATABASE_URL="<session pooler url>" DIRECT_URL="<session pooler url>" \
    npx tsx scripts/encrypt-platform-tokens.ts --dry-run
  # check the counts, then run without --dry-run
  ```
  It also deletes the unused Google sign-in tokens. Safe to re-run.
- [ ] **Dodo webhook events**: Dodo dashboard → Webhooks → your endpoint
  (`https://getkitevo.com/api/webhook`). Make sure **`payment.succeeded`** and
  **`refund.succeeded`** are subscribed (or "all events"). Referral commissions come
  only from these two.
- [ ] **Vercel cron**: Vercel → Project → Cron Jobs should list `/api/cron/payouts-digest`.

---

## 5. Smoke test on production (10 minutes)

- [ ] Homepage shows the **"NEW · Earn 20%"** badge; `/referral-program` loads.
- [ ] Log in → dashboard shows the **Invite creators** card with your link; Copy works.
- [ ] `/referrals` → add a PayPal payout method → it shows as **Active**.
- [ ] **Routes**: `/social/campaigns`, `/social/inbox`, `/brand`, `/brand/*` and `/profile` redirect to `/campaigns`, `/messages`, `/discover`, `/settings`. Dodo/Stripe checkout and billing-portal returns for brands now land on `/settings`.
- [ ] **Dashboard**: greeting, your kit card (Edit / View / Copy link), Finish-your-kit checklist, Opportunities, Connections, Plan.
- [ ] **Navigation**: dashboard has no links in the top bar; the left sidebar shows Home · Social (Campaigns, Messages) · Grow · Plan & billing · Settings; on a phone it's a bottom tab bar. Brand accounts see Discover · Campaigns · Inbox.
- [ ] **Onboarding**: sign up a fresh test account → role picker → creator → username is pre-filled → Continue → Skip → "Your media kit is live" with a working link. Delete the test account after.
- [ ] `/admin/payouts` loads for you; in a private window (logged out or another
  account) it's a 404.
- [ ] `/admin` loads: search your own email → user page shows the live Dodo subscription
  (not "Lookup failed"). Comp a test account to Pro and back to None; both changes appear
  in the audit log. Within a day of real traffic the webhook table (filter **All**) shows
  `processed` Dodo deliveries; any `rejected` row means the webhook secret is wrong.
- [ ] Reconnect Instagram on a test account → kit still shows live stats (tokens now encrypted).
- [ ] Open your kit in a private window → `npx tsx scripts/funnel-report.ts 1` (prod
  `DATABASE_URL`) shows a `kit_first_view`.
- [ ] Optional end-to-end referral test: open `https://getkitevo.com/?ref=<your code>` in a
  private window, sign up a test account, buy a plan in Dodo **test** mode only if
  you're on staging. On production, wait for the first real referred payment and check
  it appears under **Commissions** on `/admin/payouts`.

---

## 6. Not code, but needed before the first payout

- [ ] Ask your accountant how to handle **cross-border referral payouts** from an Indian
  business (TDS / equalisation levy, records per payee). Every payout is logged with
  date, amount, method and reference on `/admin/payouts`.
- [ ] Decide when to move payouts to a vendor (PLAN.md §13: Rekomi / Dub / Affonso once
  payouts pass ~$300–500/month).

---

## Notes for local development

- Your local `.env` already has `TOKEN_ENCRYPTION_KEYS` and `ADMIN_EMAILS`. A bare key is
  now accepted (it used to need a `k1:` prefix, and without it token and payout saves threw an error).
- `npm run db:migrate` / `db:studio` / `db:push` in `package.json` point at a database
  named `media_kit_pro`, which doesn't exist locally (yours is `kitevo`).
