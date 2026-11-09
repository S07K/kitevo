# Next release: what to do after merging to `main`

A running checklist for the work currently on feature branches. Updated as each branch
lands. Tick items off as you go; delete the section once it's live.

**Last updated:** 2026-11-03 (PRs #9, #10, #11 merged; everything in §1 is live)

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
| 9 | `feat/color-palettes` | App brand palette: navy `#1B365D` / blue `#005A9C` / sky `#60C1E5` / aqua `#A0E0EF` as one app theme (blue buttons, active nav, tags, toggles, highlights; navy dark mode; navy login panel). Four new free kit styles (Sage, Mist, Blush, Lavender) across the kit page, profile, PDF/PPTX export and dashboard card, with colour swatches in the editor. No deploy steps. |
| 10 | `feat/persistent-shell` | Workspace routes moved into the `app/(workspace)` route group (URLs unchanged) with one persistent layout: top bar + sidebar render once, tab clicks swap only the page, plus an instant loading state. Also: payment-provider status lookups cached 60s (invalidated on every plan change), dashboard no longer waits on them, sidebar footer links moved into the profile menu, and the deal pipeline moved to its own `/pipeline` tab (new reserved usernames `pipeline`, `inquiries`). No deploy steps. *(Branched from `feat/workspace-ui`; `feat/color-palettes` merged in.)* |

| 11 | `feat/trials-coupons` | 14-day Pro free trial (one per account, verified email, card up front, `PRO_TRIAL_DAYS`) on pricing, landing and the dashboard Plan panel; discount codes at checkout (`/pricing?code=XYZ` pre-applies; unknown codes never block checkout) on both Dodo and Stripe. No migration. Steps: §5 |

| 12 | `feat/custom-domains` | Custom domains on Starter/Pro: "Custom domain" in each kit's "…" menu (connect → DNS record to copy → auto-checked until live over HTTPS), routing in `middleware.ts`, served by `/custom-domain/[host]`; paused (redirect to the Kitevo URL) if the plan lapses. Migration `20261102085600_custom_domains` (new table only). Steps: §6 |

| 13 | `feat/calculators` | Free tools: `/tools` hub, rate calculator, engagement-rate calculator (no login; formulas shown; FAQ + JSON-LD; in sitemap, blog header, landing footer). Rate calculator results can be imported in the kit editor's Rates section after sign-up. No migration, no env vars, no deploy steps |

| 14 | `feat/kit-redesign` | Public kit page redesign: audience sentence headline (real data only), stat strip, cardless sections, sticky rate-card rail (desktop) and sticky "Work with me" bar (phones); demo kit gets an example contact link. No migration, no env vars, no deploy steps |

| 15 | `feat/editor-editability` | Kit editor mirrors the new kit: profile (photo, name, location, niches, bio) and contact links editable in the editor, per-section show/hide, click any part of the preview to jump to its settings. **Security fix:** contact links are restricted to web/email URLs on save and on display (a `javascript:` link could previously run on a public kit). No migration, no env vars, no deploy steps |

| 16 | `feat/settings-account-only` | Creator Settings becomes account-only (profile summary → "Edit in kit editor", username, connections, plan); profile is edited only in the kit editor (now also "Use Instagram photo" / remove photo). Desktop preview in a 1280px browser frame; kit fills the preview; no stray divider above the first section. No migration, no env vars, no deploy steps |

| 17 | `feat/compare-pages` | Comparison pages for search: `/compare` hub + Kitevo vs Stan Store, Linktree, Beacons, Canva media kit. Sourced, dated facts (`lib/comparisons.ts`). **Before merging, open linktr.ee/s/pricing in your browser and check the Linktree prices/fees** (they're from independent reviews). No migration, no env vars |
| 18 | `feat/commerce-free-downloads` | Commerce Release A: Products page (`/products`, new "Sell" group in the sidebar), free downloads in exchange for an email, kit Shop section, product page `/p/[id]`, private delivery page `/o/[token]`, download email, privacy-policy section. Migration `20261103071939_commerce_products_orders` (new tables only). No env vars (uses existing Resend) |

Everything in this table is merged to `main`.

Since row 10, these branches were fast-forwarded into `feat/persistent-shell` (each is contained in it; none needs a deploy step, migration or new env var): `feat/kit-create-modal` (kit creation modal), `feat/landing-earn` + `feat/landing-theme` + `feat/hero-dots` + `feat/kit-avatars` (landing revamp), `feat/kit-editor` (itemised rates, editor rebuild, autosave), `feat/editor-mobile-preview` + `feat/editor-live-kit` (live kit preview, container-query kit), `feat/campaign-emails` (campaign emails, application ownership fix, email escaping), `docs/plan-status-rollback` (PLAN status, migration rollback plan). Summary: PLAN.md §15. Rollback for any deploy: DEPLOY.md §8a.

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

## 5. Trials and coupons (`feat/trials-coupons`)

- [ ] **Nothing is required to deploy.** Trials default to 14 days. To change or turn them
  off, set `PRO_TRIAL_DAYS` in Vercel (`0` = off, max 30).
- [ ] **Beta note:** while `BETA_AUTO_COMP_TIER=pro` is set, every new signup is already
  comped Pro, so nobody sees the trial. It starts working the day you unset that at launch.
- [ ] **Dodo test mode, once, before relying on it:** start a trial checkout as a fresh
  verified test user. Check that (a) Dodo asks for a card, (b) the subscription webhook
  arrives and the account gets Pro right away with no payment, (c) Dodo shows the first
  charge dated 14 days out, and (d) `/admin` → webhook log shows `subscription.changed`
  and no `payment.succeeded` yet (so no referral commission is created for a trial).
- [ ] **Discount codes:** create them in Dodo → Discounts (percentage, expiry, usage limit,
  which products). Share as `https://getkitevo.com/pricing?code=CODE`, or customers type it
  at checkout. A bad or expired code silently falls back to a normal checkout.
- [ ] **Leave product-level trials off in Dodo.** The app always sends the trial length
  (0 when not eligible), so a trial set on the product is overridden anyway.


---

## 6. Custom domains (`feat/custom-domains`)

Do the env vars **before** merging: the pricing pages list "Your own domain" on Starter as
soon as this ships, and without them the dialog says "not switched on yet".

- [ ] **Vercel token**: Vercel → Account Settings → Tokens → create one scoped to the
  account that owns the `kitevo` project (no expiry, or set a reminder). Add it in Vercel →
  Project → Settings → Environment Variables (Production) as **`VERCEL_API_TOKEN`**.
- [ ] **`VERCEL_PROJECT_ID`**: Vercel → Project → Settings → General → Project ID (`prj_…`).
  Personal (Hobby) account: leave `VERCEL_TEAM_ID` unset.
- [ ] **Domain limit**: check Vercel's current per-project domain limit for your plan
  (Vercel → Docs → Limits). Each connected creator domain uses one.
- [ ] Merge; the migration adds one table (`CustomDomain`), nothing else changes.
- [ ] **Test with a real subdomain you own** (e.g. `kit.<a domain you have>`): on a Starter+
  account, kit "…" → Custom domain → connect → add the CNAME shown → within minutes the
  dialog shows Live. Open it: the kit renders, the address bar keeps your domain, and
  `/signup` on that domain redirects to getkitevo.com/signup.
- [ ] Optional cleanup later: domains whose kit/account was deleted are detached from the
  Vercel project automatically; anything left behind can be removed in Vercel → Project →
  Domains.

---

## 7. Smoke test on production (10 minutes)

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

## 8. Not code, but needed before the first payout

- [ ] Ask your accountant how to handle **cross-border referral payouts** from an Indian
  business (TDS / equalisation levy, records per payee). Every payout is logged with
  date, amount, method and reference on `/admin/payouts`.
- [ ] Decide when to move payouts to a vendor (PLAN.md §13: Rekomi / Dub / Affonso once
  payouts pass ~$300–500/month).

---

## 9. After the 2026-11-03 release (#9 compare + blog, #10 commerce A, #11 Dodo fix)

No new env vars. One migration (`20261103071939_commerce_products_orders`, new tables only) applies on deploy.

- [ ] GitHub Actions → **DB migrations** run for the merge commit is green.
- [ ] `/compare` and the four comparison pages load; logos show (Stan, Beacons, Canva come from `/brands/*.png`).
- [ ] `/blog` shows the cover cards; a post shows its cover.
- [ ] **Products**: create a free download on your account, publish it, see it in your kit's Shop, claim it from a private window with a test email → the delivery page opens and the email arrives (Resend).
- [ ] **Dodo**: a checkout now updates the plan straight away on return (no waiting for the webhook). The webhook still has to be subscribed to `payment.succeeded` / `refund.succeeded` for referral commissions (§4).
- [ ] Check the Linktree prices on linktr.ee against `/compare/linktree`.

**Local note:** Dodo webhooks can't reach localhost, so referral commissions only appear locally through a tunnel (`cloudflared tunnel --url http://localhost:3000`, then add `<tunnel>/api/webhook` in Dodo test mode).

---

## 10. Paid products with Razorpay (`feat/commerce-paid-razorpay`)

No new env vars (secrets reuse `TOKEN_ENCRYPTION_KEYS`). One migration (`20261103113633_commerce_payment_connections`, additive) applies on deploy.

- [ ] GitHub Actions → **DB migrations** run for the merge commit is green.
- [ ] On your comped-Pro account: **Products → Payments → Connect Razorpay** with **test** keys (Razorpay Dashboard → Account & Settings → API Keys, test mode). Wrong keys must be refused.
- [ ] Set a product's price (e.g. 499 INR), publish, open it from a private window → **Buy** → pay with a Razorpay test card/UPI (`success@razorpay`) → the download page opens and the "Your purchase" email arrives. The product shows **1 sale**.
- [ ] Close the Razorpay window mid-payment → the form resets with no order counted.
- [ ] Disconnect Razorpay → the paid product disappears from the kit and its page says "not on sale right now". Reconnect.
- [ ] When you're happy, swap to **live** keys (the panel shows "Test mode" until you do).

---

## 11. Stripe for paid products (`feat/commerce-stripe`)

No migration, no new env vars (the Stripe key is stored like the Razorpay secret, with `TOKEN_ENCRYPTION_KEYS`).

- [ ] In Stripe (test mode): Developers → API keys → **Create restricted key** "Kitevo", **Checkout Sessions: Write**, everything else None. Copy the `rk_test_…` key.
- [ ] Kitevo **Connectors → Connect Stripe**, paste it. A full `sk_` key must be refused with a message.
- [ ] Price a product in **USD**, publish, open it from a private window. With Razorpay also connected you'll see a "Pay with" choice; pick **Stripe** → Stripe's page → card `4242 4242 4242 4242`, any future date and CVC → you land on the download page, the "Your purchase" email says "through Stripe", the product shows the sale.
- [ ] On Stripe's page press back/cancel → the product page says "Payment cancelled. You weren't charged."
- [ ] When happy, replace it with a **live** restricted key (same permission).

---

## 12. Booked calls via Calendly / Cal.com / Google Calendar (`feat/scheduling-connectors`)

No new env vars. One additive migration (`20261104095857_scheduling_connectors`) applies on deploy.

- [ ] GitHub Actions > **DB migrations** run for the merge commit is green.
- [ ] **Connectors > Scheduling**: connect your Calendly (or Cal.com / Google appointment schedule) by pasting its link. A link from the wrong service must be refused.
- [ ] **Products > New product > Booking**: pick the scheduler, keep or paste a specific event link, Publish. Your kit's Shop shows "1:1 call" with **Book**.
- [ ] Open the product page from a private window: your scheduler is embedded and you can pick a time (cancel it in your scheduler afterwards).
- [ ] Google Calendar: paste your appointment schedule's share link (calendar.app.google/...) and check the embed shows your open times.
- [ ] Disconnect the scheduler: the booking disappears from the kit and its page says booking isn't open. Reconnect.

---

## 13. PayPal for paid products (`feat/commerce-paypal`)

No migration, no new env vars (the PayPal Secret is stored like the other keys, with `TOKEN_ENCRYPTION_KEYS`).

- [ ] developer.paypal.com > Apps & Credentials > **Sandbox** > create an app "Kitevo"; copy Client ID + Secret.
- [ ] Kitevo **Connectors > Connect PayPal**, paste both. Card shows Connected + **Sandbox**. Wrong credentials must be refused.
- [ ] Price a product in **USD**, publish, open it from a private window: "Pay with" lists PayPal. Pick it, log in with a **sandbox personal account** (Sandbox > Accounts), pay. You land on the download page; the email says "through PayPal"; the product shows the sale.
- [ ] Cancel on PayPal's page: the product page says "Payment cancelled. You weren't charged."
- [ ] An **INR** product never offers PayPal.
- [ ] Switch to your **Live** app's credentials (the card stops saying Sandbox).

---

## 14. Book a call on the kit (`feat/kit-book-a-call`)

No new env vars. One migration (`20261104161344_kit_book_a_call`) adds `Kit.booking` and copies each creator's published booking product onto their kits.

- [ ] GitHub Actions > **DB migrations** run for the merge commit is green.
- [ ] Your kit: your booking button now sits under your profile (it was "Connect with me" in the Shop), and stays in view in the left column on desktop. Click it: your scheduler opens in a dialog; Esc closes it.
- [ ] The old product link (`/p/...` of the booking) redirects to your kit with the dialog open.
- [ ] Products no longer offers "Booking"; the Shop shows downloads only.
- [ ] Kit editor > Contact > **Book a call**: change the event link or button text, or switch it off.

---

## 15. Brand deals with payments (`feat/brand-deals`)

No new env vars. One additive migration (`20261105072400_brand_deals`) applies on deploy.

- [ ] GitHub Actions > **DB migrations** run for the merge commit is green.
- [ ] As a creator: **Deals > New deal** (or "Send your quote" on an accepted campaign / "Send quote" in a message thread or a Pipeline inquiry). Add deliverables, amount, a 50% advance, send.
- [ ] The brand gets an email with a private link (or sees it under Deals if they have an account): accept, counter or decline. A counter shows as a new version; history shows every step for both sides.
- [ ] After acceptance the advance is **Due**: pay it from the brand side with your test Razorpay/Stripe/PayPal. It shows Paid with the provider, and the creator gets a "Payment received" email.
- [ ] Creator: **Mark as delivered** → the balance becomes due → pay it → the deal shows **Completed**.
- [ ] Try to change terms after a payment: not offered. Try the brand link with a wrong token: 404.

---

## 16. Preview builds no longer migrate the database (`fix/preview-skip-migrations`)

No env vars, no migration. Preview deployments used to run `prisma migrate deploy` against the production database (they share its `DATABASE_URL`), so an unmerged branch's migration reached production on push. Now only production builds (and the GitHub Action on `main`) migrate.

- [ ] The next preview build log says "preview build — skipping prisma migrate deploy".
- [ ] The production build after merging still shows "No pending migrations" (or applies any pending one).
- [ ] Expect: a preview of a branch that adds tables errors on its new pages until merged. Test schema changes locally.

---

## 17. Copilot (`feat/copilot`)

One additive migration (`20261108085646_copilot`) applies on deploy. Copilot is off until an AI key exists, either yours (env) or a creator's own (Connectors → AI).

**To run it on Kitevo's key (optional; free options):**
- [ ] Get a free key from Groq (console.groq.com/keys).
- [ ] Vercel → Settings → Environment Variables (Production): `AI_PROVIDER=groq`, `AI_API_KEY=<Groq key>`. The model defaults to `openai/gpt-oss-120b` (free on Groq's free tier); set `AI_MODEL` only to change it. On OpenRouter (`AI_PROVIDER=openrouter`) the same default costs a fraction of a cent per draft. Optional: `COPILOT_MONTHLY_LIMIT` (default 50 per Pro creator per month). Redeploy.
- [ ] Later, to move to Claude: `AI_PROVIDER=anthropic`, `AI_API_KEY=<Anthropic key>`, `AI_MODEL=claude-haiku-5-5`. No code change.

**Check after deploy:**
- [ ] GitHub Actions > **DB migrations** run for the merge commit is green.
- [ ] Connectors → **AI for Copilot**: connect a Groq/OpenRouter key; a wrong key is refused; the card shows the model.
- [ ] Kit editor → Profile → **Write my bio with Copilot**: a draft appears, "Use this" fills the bio. Rates → **Suggest rates from my stats** lists prices with what they're based on.
- [ ] A campaign → Apply → **Draft my pitch with Copilot**. Pipeline → an inquiry → **Draft a reply with Copilot** → "Open in email" opens your mail app with the text.
- [ ] Disconnect your key: on Pro with `AI_API_KEY` set, the Connectors line shows "N of 50 drafts left"; without it, Copilot asks for a key.

---

## 18. Report & block (`feat/report-block`)

No env vars. One additive migration (`20261109060909_report_block`) applies on deploy. Report alerts go to `ADMIN_EMAILS` (already set).

- [ ] GitHub Actions > **DB migrations** run for the merge commit is green.
- [ ] Messages → open a thread → **⋯ → Block**: the composer is replaced by "You blocked …"; the other account sees "You can't reply". Unblock from the notice or **Settings → Blocked**.
- [ ] **⋯ → Report** (reason + note, "Also block" ticked): an admin email "New report" arrives; **/admin/reports** lists it.
- [ ] On /admin/reports: **Dismiss** closes it; **Suspend account** (on a test account) → that account can't sign in ("suspended"), its kit/profile/campaigns 404, and an open session shows the suspended screen. Lift it from the user's admin page (**Safety → Lift suspension**). Both show in the audit log.
- [ ] Pipeline → an inquiry → **Block sender**: a new inquiry from that email "succeeds" for the sender but never shows up.

---

## 19. Dashboard refresh (`feat/dashboard-refresh`)

No env vars, no migration.

- [ ] Dashboard shows **What to do next** under your kit when something is pending (a brand waiting on a deal, new inquiries, no rates, no Book a call, no product…), at most three, each linking to the right place. It disappears when there's nothing to do.
- [ ] Right rail: **Deals** (active deals, "Your turn" / "Brand's turn", amounts due) and **Products** (live, downloads, sales and earnings in the last 30 days).

---

## Notes for local development

- `npm run dev` applies pending migrations first (`scripts/dev-migrate.cjs`, the `predev` script), but **only to a database on this machine**. If `.env` points at Supabase it skips with a warning, so it can never push an unmerged migration to production.

- Your local `.env` already has `TOKEN_ENCRYPTION_KEYS` and `ADMIN_EMAILS`. A bare key is
  now accepted (it used to need a `k1:` prefix, and without it token and payout saves threw an error).
- `npm run db:migrate` / `db:studio` / `db:push` in `package.json` point at a database
  named `media_kit_pro`, which doesn't exist locally (yours is `kitevo`).
