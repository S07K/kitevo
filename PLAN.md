# Kitevo Product & Growth Plan

**Status (2026-11-03):** Phase 0 **complete**. Sprint 2 done (free calculators, public kit redesign) and Sprint 3 done (comparison pages, payout-rail decision: **creator-owned payments**). **Phase 1 (commerce) started:** Release A (free downloads with email capture) is live; Release B (paid products on the creator's own Razorpay or Stripe) is live; Release C (booked calls via the creator's own Calendly / Cal.com / Google Calendar) is built; PayPal and booking sync are next. See §15–§16.
**Last updated:** 2026-11-03
**Scope:** Competitive strategy, pricing architecture, feature roadmap, and the Phase 0 execution checklist.

---

## 1. Executive summary

Kitevo should not try to be a 1:1 Stan Store clone. Stan already owns the "creator commerce in a link" category, bundles courses, memberships, community, bookings, email, and funnels into a $29/month plan, and charges 0% platform fees. A feature-for-feature clone would be more expensive to build, harder to explain, and weaker at the thing Kitevo already does well.

Kitevo's opening is different:

> **Kitevo is the creator business OS for proving your value, selling your work, and growing brand partnerships.**

The wedge is the media kit: live, verified Instagram/YouTube proof that a brand can inspect in one link. Commerce and brand-deal infrastructure extend that wedge instead of replacing it.

Three strategic bets:

1. **Proof first.** A creator's live media kit is the acquisition hook, the trust layer, and the artifact brands forward internally.
2. **Own the brand-deal workflow.** Inquiries, deal rooms, deliverables, usage rights, milestones, and payments are underserved by link-in-bio tools.
3. **Price below Stan at every step.** Start free with a real, useful product. Charge less than Stan for the creator plan, and keep paid plans at 0% platform fees once transactions ship.

### What success looks like

- A new creator can publish a credible kit in under 10 minutes without paying.
- A creator on a paid plan can sell a digital product or booking without leaving Kitevo.
- A brand can discover, evaluate, negotiate, and pay a creator in one place.
- Kitevo is cheaper than Stan for the same or better core outcome.

---

## 2. Competitive snapshot: Stan Store vs Kitevo

### Stan Store (observed 2026)

| Area | Stan Store |
|---|---|
| Entry price | **$29/mo** or **$300/yr** (14-day trial, no free plan) |
| Pro price | **$99/mo** or **$948/yr** |
| Platform fees | **0%** on transactions; Stripe/PayPal processing passes through |
| Storefront | Link-in-bio storefront, digital downloads, courses, memberships, community, bookings, webinars |
| Lead capture | Lead magnets, email marketing (Pro), funnels and order bumps (Pro) |
| Growth | Affiliates (Pro), discounts, payment plans, BNPL (Pro), analytics/pixels |
| AI | "Stanley" AI assistant |
| Mobile | iOS apps |
| Custom domain | **Creator Max plan only** (Creator/Creator Pro stay on stan.store/username) — Stan help centre, checked 2026-11-03 |
| Limits | 1 community per store, 1 order bump per product, multi-store requires separate subscriptions |
| Gaps | No variants/pricing tiers, no centralized customer portal, no physical inventory/shipping, no public team/agency plan |

**Stan's strengths:** complete commerce stack, 0% platform fees, strong education/help center, mobile apps, and a mature all-in-one story.

**Stan's weaknesses:** expensive entry, no free plan, no custom domain, limited multi-store/community/order-bump flexibility, and weak brand-deal workflow.

### Kitevo today

| Area | Kitevo today |
|---|---|
| Entry price | **Free** (1 kit), Starter **$9/mo** or **$84/yr** |
| Pro price | **$15/mo** or **$144/yr** (3 kits) |
| Brand plan | Brand Pro **$29/mo** or **$290/yr** |
| Core product | Media kits with live Instagram/YouTube stats, growth charts, audience demographics, brand partners, rates, inquiry inbox |
| Brand side | Campaigns, creator discovery, messaging, applications |
| Payments | Stripe or Dodo Payments (Merchant of Record), subscription billing |
| Advantages | Live verified stats, design quality, multi-kit, brand inquiry pipeline, cheaper entry, Dodo MoR |
| Gaps | No commerce, no courses/memberships/bookings, no customer portal, no payouts, no email marketing, no mobile apps (custom domains ✅ 2026-11-02) |

### Positioning statement

> **Stan helps creators sell. Kitevo helps creators prove their value, close brand deals, and then sell without giving up the relationship.**

The media kit is not a "nice PDF replacement." It is the top of the creator-business funnel:

**Prove (kit) → Sell (commerce) → Grow (brand deals + audience)**

---

## 3. Product strategy

### 3.1 The wedge: a media kit brands actually trust

Keep investing in the kit as the acquisition product:

- Live Instagram/YouTube stats with clear source labels and honest empty states.
- Manual stats for creators who cannot connect an account yet.
- Brand-ready sections: work samples, rates, audience, past partners, contact.
- Fast, mobile-first public pages with shareable links and PDF export.
- Multiple kits for different niches, with one dashboard.

### 3.2 The expansion: commerce that starts from proof

Do not build a generic storefront first. Build commerce that a brand-facing creator needs:

- Digital products (presets, guides, templates, photo packs).
- Paid bookings and consultations.
- Email capture and a lightweight customer list.
- Customer portal for downloads and bookings.
- Payouts through the existing payment provider where possible.

### 3.3 The moat: brand-deal infrastructure

This is the part Stan does not own:

- Brand inquiry pipeline with statuses, notes, and follow-ups.
- Deal rooms with deliverables, deadlines, usage rights, and revision limits.
- Contracts/e-signature and milestone-based payments.
- Brand CRM, shortlists, and team seats.
- Escrow or protected payments for both sides.

### 3.4 What not to build yet

- A full email marketing suite (Resend + simple broadcasts first).
- A full course platform (validate demand with digital products and bookings).
- Physical inventory/shipping.
- A mobile app before the web workflow is proven.
- A public API before the data model and permissions are stable.

---

## 4. Pricing architecture

### 4.1 Target pricing (after commerce ships)

| Plan | Monthly | Annual | Who it is for | Platform fee |
|---|---:|---:|---|---:|
| **Free** | $0 | — | Creators validating their pitch | 5% on sales |
| **Creator** | $9 | $84 | Creators who need live proof and a professional kit | 0% |
| **Pro** | $19 | $180 | Creators selling products/bookings and running brand deals | 0% |
| **Business** | $39 | $348 | Small teams, multiple kits, higher limits | 0% |
| **Brand Pro** | $39 | $348 | Brands running campaigns and deal rooms | 0% |

Rules:

- **Free must be genuinely useful.** One kit, manual stats, shareable link, rates, brand partners. No trial timer.
- **Paid plans are 0% platform fee.** The subscription is the monetization, not a tax on success.
- **Annual = two months free.** Simple, legible, no fake urgency.
- **14-day Pro trial** once commerce is live. Do not trial features that do not exist.
- **Grandfather early users.** Existing Starter/Pro subscribers keep their price for at least 12 months after a pricing change.

### 4.2 Current pricing until Phase 1

Keep the live plans unchanged while the product catches up:

- Free: 1 kit.
- Starter: $9/mo or $84/yr.
- Pro: $15/mo or $144/yr.
- Brand Pro: $29/mo or $290/yr.

Do not advertise a platform fee until checkout and payouts exist.

### 4.3 Unit economics guardrails

- Payment processing is pass-through; never absorb it silently.
- Target gross margin ≥ 80% on subscriptions after infra and support.
- Keep free-tier COGS below ~$0.50/user/month: cache stats, rate-limit refreshes, and avoid per-view API calls.
- Dodo MoR remains the default for global tax handling; Stripe remains available for creators who want it.

---

## 5. Feature matrix

Legend: **Live** = shipped, **Partial** = shipped with gaps, **Planned** = roadmap, **No** = not planned near-term.

| Capability | Stan | Kitevo today | Kitevo target |
|---|---|---|---|
| Free plan | No | **Live** | **Live** |
| Media kit / link-in-bio page | Live | **Live** | **Live** |
| Live IG/YT stats | No (manual/analytics) | **Live** | **Live** |
| Manual stats | Partial | **Live** | **Live** |
| Custom domain | No | No | **Planned** (Creator+) |
| Digital products | Live | No | **Planned** (Phase 1) |
| Courses | Live | No | **Planned** (Phase 2) |
| Memberships | Live | No | **Planned** (Phase 2) |
| Community | Live (1/store) | No | **Planned** (Phase 2) |
| Bookings | Live | No | **Planned** (Phase 1) |
| Email capture / broadcasts | Live (Pro) | No | **Planned** (Phase 1/2) |
| Funnels / order bumps | Live (Pro) | No | **Planned** (Phase 2) |
| Affiliates | Live (Pro) | No | **Planned** (Phase 2) |
| Brand inquiry pipeline | No | **Live** (Pro) | **Live** |
| Brand campaigns / discovery | No | **Live** | **Live** |
| Deal rooms / contracts | No | No | **Planned** (Phase 3) |
| Escrow / milestones | No | No | **Planned** (Phase 3) |
| Team / agency seats | No public plan | No | **Planned** (Business) |
| Analytics / pixels | Live | **Partial** (kit views) | **Live** |
| Mobile apps | Live (iOS) | No | **Planned** (Phase 3) |
| AI assistant | Live | No | **Planned** (Phase 2) |

---

## 6. Roadmap

### Phase 0 — Trust, foundations, and the free plan (now)

**Goal:** Make the current product honest, usable on the free tier, and safe to build commerce on.

Workstreams:

- [x] Write this plan and align pricing/positioning. (2026-10-31)
- [x] **Free tier works.** Free users enter the dashboard, create one kit, edit it, and share it. Paid features stay gated. (2026-10-31)
- [x] **Advertised features exist.** Manual stats entry ships end-to-end (schema, API, editor, public kit). (2026-10-31)
- [x] **Honest marketing.** Unverified testimonials removed for product-outcome cards; claims synced to shipped features. (2026-10-31)
- [x] **Live-stat gating.** Public kits only show live IG/YT data when the owner has a paid plan; free kits use manual stats. (2026-10-31)
- [x] **Migrations.** Versioned baseline in `prisma/migrations`; `migrate deploy` runs automatically on every deploy (GitHub Action gated on tests + Vercel build before `next build`). Prod baselined + first deploys verified 2026-10-31.
- [x] **Token encryption.** AES-256-GCM with key-id prefix for rotation (`lib/token-crypto.ts`), backfill script, build guard. Google sign-in tokens no longer stored. (2026-11-01; prod key + backfill per DEPLOY.md)
- [x] **Admin/ops.** `/admin`: user lookup, comp + plan resync (live provider subscription), payment webhook log with replay, admin audit log; `/admin/payouts` for referrals. (2026-11-01)
- [x] **Trials and coupons.** Provider-backed trial and coupon support, with abuse limits. ✅ (2026-11-02) 14-day Pro trial (`lib/trials.ts`, `PRO_TRIAL_DAYS`): one per account (any past checkout disqualifies), verified email, creators only, card up front, eligibility checked server-side at checkout. Discount codes live in the provider dashboard; `/pricing?code=` pre-applies, unknown codes fall back to a normal checkout. Known gap: deleting an account and signing up again with the same email gets a new trial.
- [x] **Analytics baseline.** First-party `AnalyticsEvent` table + `lib/analytics.ts`: signup → onboarding → kit created → first outside kit view (≈ shared) → checkout started → upgrade, plus cancel. Cohort report: `scripts/funnel-report.ts [days]`. (2026-11-01)
- [x] **Custom domains.** Design and ship the domain model and verification flow for paid plans. ✅ (2026-11-02) `CustomDomain` (one per kit; hostname, Vercel verification records, DNS/TLS state, status), Vercel project-domain API (it issues TLS), routing in `middleware.ts` → `/custom-domain/[host]`. DNS instructions with copy buttons, auto re-check while open, auto-activation on first HTTPS visit. Starter+ (comp or active sub), checked on connect and on every visit (lapsed plan → redirect to the Kitevo URL). Anti-squatting: unverified claims older than 7 days can be taken over. Listed on Starter in both pricing surfaces.

**Exit criteria:**

- A new free user can publish a kit without hitting a paywall.
- Every feature listed on the pricing page is either shipped or removed.
- No fabricated social proof or "live" label on self-reported data.
- `npm test` and `npm run build` pass.
- A rollback plan exists for the first migration. ✅ DEPLOY.md §8a (expand → contract rule, backup step, playbooks; every migration so far is additive). (2026-11-02)

### Phase 1 — Commerce core (next)

- Digital products with files, variants, and checkout.
- Stripe Connect / provider payouts.
- Paid bookings and consultations.
- Email capture and customer portal.
- Order receipts, refunds, and basic tax handling.
- Custom domains for Creator+.
- 14-day Pro trial and coupons.

**Exit criteria:** A creator can sell a digital product and a booking, see the order, and get paid without leaving Kitevo.

### Phase 2 — Audience and growth

- Courses and memberships.
- Community spaces.
- Funnels, order bumps, and upsells.
- Affiliates and referral tracking.
- Email broadcasts and simple automations.
- AI Copilot for kit copy, pitch emails, and deal summaries.

### Phase 3 — Brand-deal moat

- Deal rooms with deliverables, deadlines, and usage rights.
- Contracts/e-signature and milestone payments.
- Brand CRM, shortlists, and team seats.
- Agency/Business plan.
- API, webhooks, and mobile apps.

---

## 7. Phase 0 execution detail

### P0-1. Free-tier access ✅ (2026-10-31)

**Problem:** `app/dashboard/page.tsx` set `hasKitAccess` only when `tierId !== "free"`. The Free plan advertises one kit and the API allows one, but the dashboard showed an upgrade wall.

**Shipped:**

- Authenticated users always reach the dashboard (gate + dead upgrade card removed).
- Free users create, edit, and share one kit; the free upgrade nudge still shows.
- Live IG stats no longer fetched for free accounts; the Followers tile marks it a "Starter feature"; Integrations section notes live stats need Starter. YouTube mirrors the same gate (status stays visible for disconnect; numbers don't render for free).

**Enforcement boundary decision:** `/api/instagram/stats` and `/api/youtube/stats` stay open to the owner — onboarding consumes YouTube stats before a plan is chosen, and they only return the caller's own account data. The monetized surface (what brands see) is the public kit, which is gated server-side in `app/kit/[username]/page.tsx`.

**Acceptance verified:** free path code-reviewed and exercised through the dashboard flow; E2E pass on staging still recommended.

### P0-2. Manual stats ✅ (2026-10-31)

**Problem:** The pricing page and FAQ advertised manual stats on Free, but there was no field, API, or rendering path.

**Shipped:**

- `Kit.manualStats` JSON column (default `"{}"`), validated/serialized in `lib/manual-stats.ts` (numbers only, negatives/NaN dropped, percentages clamped).
- Editor section "Manual stats" (all plans): IG followers, IG engagement %, YT subscribers, YT total views, 30-day growth %.
- `/api/kits`, `/api/kits/[id]`, `/api/kits/by-slug/[slug]` round-trip it.
- Public kit renders manual stats with a "Self-reported by creator" indicator (no live pulse); paid connected platforms override per platform ("Live where connected…").
- Dashboard metrics tiles fall back to self-reported numbers when a platform isn't connected (live always wins; the "self-reported" subtitle carries the honesty).
- Growth charts and demographics still render only from real platform data.
- Bonus fix: the combined stats block now respects `sectionVisibility.stats` (the "Reach & engagement" toggle previously did nothing for it).

**Acceptance verified:** unit + route tests (`lib/manual-stats.test.ts`, `app/api/kits/**`); schema change is additive with a default (now captured in the baseline migration; `db push` is retired).

### P0-3. Honest marketing ✅ (2026-10-31)

**Problem:** `Testimonials.tsx` contained named creators, follower counts, and quotes that cannot be verified.

**Shipped:**

- Testimonial carousel replaced with six "Why Kitevo" product-outcome cards — no invented people, page anchor renamed `#why-kitevo`.
- Claims synced to shipped features: Free/Pro feature lists on the plan config, landing pricing, FAQ, and dashboard upgrade prompts no longer mention unshipped rates, custom colors/typography, logo upload, or work samples.

**Acceptance verified:** grep audit for removed claim keywords comes back clean in marketing surfaces.

### P0-4. Migrations ✅ (2026-10-31)

**Shipped:**
- `prisma/migrations/20261031000000_init/migration.sql` — full current schema as baseline (verified byte-equivalent via `migrate diff` both directions).
- `.github/workflows/db-migrate.yml` — on every push to `main`: test suite first, then `prisma migrate deploy` against prod (`DATABASE_URL` + `DIRECT_URL` repo secrets). Serialized with a concurrency group; fails loudly if secrets are missing.
- `scripts/vercel-build.cjs` now runs `migrate deploy` before `next build` (replacing `db push --accept-data-loss`), so a deploy either lands with the new schema or not at all.
- Both runners are idempotent — whichever applies a pending migration first, the other no-ops.

**Acceptance verified locally:** fresh DB applies the baseline cleanly; a `db push`-built DB fails fast with `P3005` (no destructive attempts); `migrate resolve --applied` fixes it; `migrate deploy` then reports "No pending migrations"; `migrate diff` reports no drift.

**Still to do:** none — prod baselined 2026-10-31 and verified end to end: GitHub Action run 41191818333 (tests → "No pending migrations to apply"), Vercel production build Ready in 53s (its migrate deploy no-oped), and the live site serves the new code. New databases (e.g. staging) built outside migrations still need the `P3005` baseline pair from DEPLOY.md step 2.

**Policy:** author migrations locally with `prisma migrate dev`; never `db push` a managed database; destructive schema changes require a reviewed migration first.

### P0-5. Token encryption ✅ (2026-11-01)

**Shipped:** `lib/token-crypto.ts` (`enc:v1:<keyId>:<iv>:<ct+tag>`, AES-256-GCM, legacy plaintext passes through, undecryptable → null = disconnected); writes encrypted at the 4 token write sites, reads decrypted via `decryptPlatformTokens` at the 5 sites that call Meta/Google; `scripts/encrypt-platform-tokens.ts` (idempotent backfill + re-encrypt on rotation + clears unused Google `Account` tokens); `vercel-build` fails on a malformed key, warns if missing in prod. Tests: `lib/token-crypto.test.ts`.

**Rollout:** set `TOKEN_ENCRYPTION_KEYS` on Vercel → redeploy → run backfill (DEPLOY.md step 3).

Original spec:

- Encrypt `instagramAccessToken`, `youtubeAccessToken`, and `youtubeRefreshToken` with an app-level key.
- Keep key rotation possible with a key id prefix.
- Never log tokens or include them in client payloads.

### P0-6. Admin and ops ✅ (2026-11-01)

Shipped: `WebhookEvent` (every delivery logged as its domain event, not the raw PII-bearing body; retries of applied deliveries acknowledged without re-applying; signature failures bucketed one row per provider per hour), `AdminAuditLog`, `lib/admin-actions.ts` (setComp/resyncPlan shared with `scripts/comp-user.ts`), `/admin` + `/admin/users/[id]`. Original scope:


- Admin-only route for user lookup, plan/comp changes, and subscription status.
- Webhook failure visibility and replay instructions.
- Basic audit log for comp and plan changes.

### P0-7. Trials, coupons, and analytics

- Provider-backed trial for Pro.
- Coupon codes with expiry, redemption caps, and plan restrictions.
- Funnel events: signup, onboarding complete, kit created, kit published, first share, upgrade, churn.

### P0-8. Custom domains

- Store domain, verification token, status, and TLS state.
- Verification flow with clear DNS instructions.
- Gate to Creator+ and show the plan requirement before purchase.

---

## 8. Go-to-market

### 8.1 Wedge message

> "Your media kit is the first thing a brand checks. Make it live, make it credible, and make it yours."

### 8.2 Acquisition loops

1. **Public kit footer.** Every shared kit links to Kitevo ("Create yours"). This is the primary loop.
2. **Brand-side invites.** When a brand inquiries, invite them to discover more creators.
3. **Templates and teardowns.** Publish "what a great media kit looks like" examples with real, permissioned creators.
4. **Creator communities.** Partner with niche communities instead of broad influencer marketing.
5. **Comparison content.** "Kitevo vs Stan Store," "Kitevo vs Canva media kit," honest and specific.

### 8.3 Launch sequence

- **Phase 0:** free plan works, claims are honest, manual stats ship.
- **Phase 1:** commerce beta with 25–50 creators; hand-hold onboarding.
- **Phase 2:** public launch of commerce + growth features.
- **Phase 3:** brand-side sales for deal rooms and Business plan.

### 8.4 Metrics

- Activation: signup → kit created within 24 hours.
- Time to first share.
- Free → paid conversion (target 3–5%).
- Paid retention at 90 days (target ≥ 70%).
- Brand inquiry response rate.
- Kit view → inquiry rate.
- Commerce GMV per paid creator.
- Support tickets per 100 active creators.

---

## 9. Risks and guardrails

| Risk | Mitigation |
|---|---|
| Building too much at once | Phase gates and exit criteria; no commerce before free tier is honest |
| Stan copies brand-deal features | Move fast on deal rooms and brand relationships; keep kit quality high |
| Payment/compliance complexity | Use Dodo MoR by default; Stripe Connect only where needed |
| Free-tier abuse | Rate limits, one kit, 5% fee on sales, no live API calls for free |
| Stat accuracy complaints | Label self-reported vs live; never fabricate charts or demographics |
| Migration outage | Baseline migrations, test on a branch, backup before deploy |
| Token breach | Encrypt at rest, rotate keys, least-privilege scopes |
| Pricing race to the bottom | Compete on outcome and brand-deal workflow, not just price |

---

## 10. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-10-30 | Do not clone Stan 1:1 | Stan's commerce bundle is expensive to match and weakens Kitevo's differentiation |
| 2026-10-30 | Lead with media kit + brand deals | Kitevo already has live stats and a brand-side product |
| 2026-10-30 | Keep Free plan, fix access | The plan is advertised and the API already supports it |
| 2026-10-30 | Ship manual stats before commerce | It closes an advertised gap and makes Free genuinely useful |
| 2026-10-30 | Replace unverified testimonials | Trust is the product; fabricated proof undermines it |
| 2026-10-30 | 0% platform fees on paid plans | Simple promise; undercuts Stan's paid tiers without a usage tax |
| 2026-10-30 | 5% fee on Free sales (Phase 1) | Monetizes free commerce without a subscription barrier |
| 2026-10-31 | Stats API routes stay owner-open | Onboarding needs YT stats pre-plan; routes return only the caller's own data; the monetized surface is the server-gated public kit |
| 2026-10-31 | Dashboard tiles fall back to self-reported numbers | Makes Free feel real without breaking the live-stat paywall; "self-reported" subtitle carries the honesty |
| 2026-10-31 | P0 first slice committed | Free plan access + manual stats + honest marketing + public-kit gating (see git history, 2026-10-31) |
| 2026-10-31 | Migrations auto-apply on deploy | GitHub Action (tests → `migrate deploy`) + Vercel build both apply pending migrations; `db push` retired. Prod baselined and first runs verified (Action 41191818333, Vercel build 53s) |
| 2026-11-01 | Add expansion levers (brand-deal fee, AI add-on, seats) | Stan's growth slowed to ~24% with one tier and no take rate; Kitevo's brand side is the lever |
| 2026-11-01 | Referral program first | Stan's main growth engine; cheapest channel to build |
| 2026-11-01 | Revamp UI for clarity, keep Kitevo identity | Adopt Stan's mobile-first simplicity, not its look |

---

## 11. Profit plan (2026-11-01 revision)

### 11.1 Is Stan actually profitable? What to copy, what to avoid

Third-party estimates (Sacra, Apr 2026) — not audited, treat as directional:

| Metric | Stan |
|---|---|
| ARR | ~$40M (Apr 2026), from ~$35M end-2025 |
| Growth | 765% (2023) → 93% (2024) → ~24% (2025) — decelerating |
| Active creators | 80,000+ |
| ARPU | ~$437/yr, *falling* (was ~$491 in early 2024) |
| Margin | ~40% EBITDA — yes, profitable |
| Funding | One $5M seed — growth was organic, not bought |
| GMV | $100M+; >50% from digital downloads priced $4–30 |
| Growth engine | **20% lifetime affiliate commission** to creators who refer creators; TikTok/IG word of mouth |
| New bet | Stanley (AI content agent) — reportedly $200K ARR on launch day, >$2M revenue by Mar 2026 |

**Why it works:** a cheap-to-run SaaS (no inventory, no take rate to defend), sold by its own customers via a lifetime affiliate program, to creators whose followers watch them "make money with Stan."

**Why it's slowing (the lesson for Kitevo):**
1. **One price, no expansion lever.** A creator who 10×'s their sales still pays $29. Net revenue retention is capped, and churn now matches new signups.
2. **No demand side.** Stan only works if the creator brings buyers. Whop (marketplace, aggregates buyers) grew ~255% to ~$142M annualized and passed Stan in 2025.
3. **Platform dependency.** ~45% of GMV originates on TikTok/IG.

**Kitevo's structural advantage:** we already have a demand side — *brands with budgets*. Stan has to convince a creator's fans to buy a $15 guide; Kitevo can route a brand's $500–$5,000 deal through the platform. That is where the margin and the expansion lever live.

### 11.2 Revenue streams, ranked by impact ÷ effort

| # | Stream | Model | Why it's impactful | Effort | Phase |
|---|---|---|---|---|---|
| R1 | **Referral program** | 20% of referred subscription, 12 mo (Stan does lifetime; start capped, extend if it works) | Stan's #1 growth engine; near-zero COGS; every kit already has a footer loop | S | Now |
| R2 | **Brand-deal payments** | Brand pays through Kitevo; **5% brand-side fee** (creator keeps 100%) + milestone release | Highest ticket on the platform; the expansion lever Stan lacks; ties to the moat | L | 1→3 |
| R3 | **Digital products + paid bookings** | 0% on paid plans, 5% on Free | Table stakes vs Stan; >50% of Stan's GMV is cheap downloads | L | 1 |
| R4 | **AI add-on** ("Kitevo Copilot") | Pro feature or +$9/mo add-on: pitch emails to brands, rate suggestions from real stats, kit copy, deal summaries | Stanley proves creators pay for AI fast; our AI has *real stats* to ground on | M | 1–2 |
| R5 | **Brand Pro + Business seats** | Existing $29 → $39 when deal rooms ship; seats $15/seat | Brands have budgets; seats expand with team size | M | 2–3 |
| R6 | **Custom domains** | Creator+ | Stan doesn't offer it; cheap upgrade reason | M | 0/1 |
| R7 | **Featured creator placement** | Creator-side paid boost in brand discover | Monetizes the marketplace both ways | S | 2 |

**Payout-rail decision: MADE (2026-11-03) — creator-owned payments.** Dodo is single-merchant (no marketplace splits found) and Stripe Connect is invite-only for Indian companies (Express is deprecated), so Kitevo follows the Kajabi model: each creator connects their **own** payment account (Razorpay keys for Indian creators, a restricted Stripe key, PayPal app keys), Kitevo creates the checkout on that account, the buyer pays the creator directly, and a webhook tells Kitevo to deliver. Kitevo never holds funds or pays anyone out, takes 0% on sales and earns from subscriptions; creators are the seller (their own tax). Keys are stored encrypted (lib/token-crypto). One-click Stripe can be added later if a US entity exists. Releases: **A** products + free downloads/email capture ✅ (2026-11-03, `lib/commerce.ts`), **B** payment connections + paid digital products, **C** bookings.

*(Original note, kept for context:)* **Payout-rail decision needed before R2/R3:** Dodo is a Merchant of Record for *Kitevo's* subscriptions; selling a creator's product through Dodo makes Kitevo the seller of record for that creator's goods. Before building checkout, confirm whether Dodo supports marketplace/split payouts. If not, creator sales and brand-deal payments use Stripe Connect (Express) while subscriptions stay on Dodo — the `lib/payments` interface gets a second capability (`payouts`) rather than a provider swap.

### 11.3 Revised target pricing

| Plan | Monthly | Annual | Adds |
|---|---:|---:|---|
| Free | $0 | — | 1 kit, manual stats, apply to campaigns, sell with 5% fee |
| Creator (today "Starter") | $9 | $84 | Live stats, 0% fees, custom domain |
| Pro | $19 | $180 | 3 kits, inquiry inbox, Copilot, bookings, deal pipeline, verified tick |
| Brand Pro | $39 | $348 | Unlimited campaigns, cold DM, filters, deal rooms (+5% on paid deals) |
| Business (brand/agency) | $99 | $948 | 5 seats, shared shortlists, roster management |

Existing Pro subscribers stay at $15 for 12 months (grandfathering, §4.1). Raise prices only when the feature that justifies it is live.

### 11.4 UI revamp — "Stan-clean", Kitevo-distinct

What Stan gets right and we adopt: one-column, mobile-first public pages; big tap targets; one clear action per card (Buy / Book / Contact); generous whitespace; a dashboard that reads as a checklist ("Add your first product → Share your link").

What we do **not** copy: Stan's layout, purple palette, or components. Cloning a competitor's look makes us forgettable and invites IP trouble. We keep the riso K mark (indigo / terracotta / cream) and editorial type — that identity is the "proof, not hype" story.

Order (each is one PR, behind no flag — small and reversible):
1. **Public kit page** — the thing brands see; tighten hierarchy, mobile-first, sticky "Work with me" CTA. ✅ (2026-11-02) Audience sentence headline from real data, stat strip, cardless sections, sticky rate-card rail on desktop, sticky "From $X · Work with …" bar on phones; all 13 kit styles verified.
2. **Landing page** — one promise above the fold ("A media kit brands believe"), live demo kit embedded, pricing vs Stan.
3. **Creator dashboard** — onboarding checklist + "what to do next" card; reduce tab sprawl.
4. **Storefront blocks** — when R3 ships, products/bookings render as kit sections, not a separate store.

Tooling: the `frontend-design` skill is installed for design passes; screenshot-diff each page at 390px and 1280px before/after.

### 11.5 Marketing — reaching Stan-type creators

**Who:** micro-creators (5k–150k followers) who want brand deals and haven't had one yet, or have had a few and price them by guessing. They're on IG/TikTok/YouTube, watch "how I got my first brand deal" content, and already pay for Canva/Linktree/Stan.

**Positioning line:** *"Stan helps you sell to fans. Kitevo gets you paid by brands."*

**Channels, in priority order:**

| Channel | Play | Metric |
|---|---|---|
| **Referral loop (R1)** | 20% commission; dashboard "Invite creators" card; referral link in kit footer for Pro | % signups referred (target 25%) |
| **Free tools (SEO + social)** | No-login **rate calculator** ("what should I charge?"), **engagement-rate calculator**, **media kit template** gallery — each ends with "turn this into a live kit" | Organic signups/week |
| **Comparison SEO** | Honest pages: Kitevo vs Stan Store, vs Linktree, vs Canva media kits, vs Beacons; "best media kit for UGC creators" | Rankings + signup conversion |
| **Creator ambassadors** | 20–30 micro-creators get comped Pro + higher commission to post "my media kit got me this deal" reels | Signups per ambassador |
| **Brand-side pull** | Brands posting campaigns require a Kitevo kit to apply → every campaign recruits creators | Creators acquired via campaigns |
| **Communities** | UGC-creator Discords/Facebook groups, niche communities; free kit reviews | Activation from community traffic |
| **Proof content** | Monthly "state of creator rates" report from anonymized platform data (real data only — §honesty rules) | Backlinks, press |

**Don't:** paid ads before activation > 40%; fabricated testimonials (rule since P0-3); claims about features that aren't shipped.

### 11.6 Execution order (next ~8 weeks)

| Sprint | Ship | Unlocks |
|---|---|---|
| 1 | P0-5 token encryption · P0-7 analytics funnel events · **R1 referral program** | Safe to scale; measure every channel; growth loop live |
| 2 | **Free rate + engagement calculators** · public kit UI revamp | SEO/social top of funnel; better first impression for brands — *calculators ✅ (2026-11-02: `/tools`, `/tools/rate-calculator`, `/tools/engagement-rate-calculator`; formulas shown on the page, rates carry into the kit editor after sign-up); public kit revamp ✅ (2026-11-02, §11.4 step 1)* |
| 3 | Landing revamp + comparison pages · P0-6 admin view · payout-rail decision | Conversion; ops for commerce — *landing revamp ✅, admin ✅, comparison pages ✅ (2026-11-03: `/compare` + Stan Store, Linktree, Beacons, Canva; sourced and dated in `lib/comparisons.ts`); payout-rail decision ✅ (2026-11-03: creator-owned payments, see §11.6 note)* |
| 4–6 | **R3 digital products + bookings** (checkout, delivery, orders, receipts) · R6 custom domains | Commerce parity on the things that matter |
| 7–8 | **R2 brand-deal payments** (milestones, 5% brand fee) · R4 Copilot beta | The expansion lever + the moat |

Sources: [Sacra — Stan](https://sacra.com/research/stan), [Sacra — Stan's Shopify vs Whop's Amazon](https://sacra.com/research/stans-shopify-vs-whops-amazon/), [Schoolmaker — Stan pricing 2026](https://schoolmaker.com/blog/stan-store-pricing).

---

## 12. Stan teardown — public flows (2026-11-01)

Built from Stan's public help center and a live creator store page. No code or traffic inspection. stan.store itself is a JS app that doesn't render for crawlers, so for the dashboard UI a trial-account screenshot pass is still needed.

### 12.1 Feature surface (help-center categories ≈ where their effort goes)

Products: Coaching Calls, Digital Downloads, e-Courses, Memberships, Webinars, Lead Magnets, Community (18 articles — biggest product area), Custom Products, External Links · Upsells: Funnels, Order Bumps · Features: **Affiliate Share** (11), **Email Marketing** (13), **AutoDM** (5) · Income: payments, cash out, Stripe/PayPal (35 articles combined — money is the #1 support topic) · Customers (17) · Analytics · Referral Program · Stanley (AI).

### 12.2 The product-creation pattern (same for every product type)

Every product is **one editor with 3–4 tabs**, a live phone preview on the right, and Publish / Save as Draft:

1. **Thumbnail** — how it looks *in the store*: style (Button / Callout / Preview), 400×400 image, title, subtitle, button text.
2. **Checkout Page** — banner (1920×1080), description, price, CTA text; *Pro-only:* discount codes, quantity limits, payment plans; **Collect Info** custom fields (text, phone, multiple choice, dropdown, checkbox); delivery = file upload (≤5GB) or redirect URL.
3. **Availability** (bookings only) — Google Calendar/Zoom/custom location, time zone, duration, buffer, min notice, advance window, max attendees, weekly slots, blocked dates.
4. **Options** — reviews, email flows, order bumps, affiliate share (Pro), community, confirmation email, reminders (bookings).

**Kitevo takeaway:** copy the *pattern* (one consistent tabbed editor with live preview for every product), not the screens. Our "Thumbnail" equivalent is a **kit section block**, so products render inside the media kit rather than a separate store.

### 12.3 Money flow

- **Stripe:** Stan creates a **Stan-managed Custom Stripe Connect account** per creator (existing Stripe accounts can't be linked). Funds sit in an in-app Income balance; creators cash out from it.
- **PayPal:** creator's own Business account; money goes straight there (bypasses the Income balance).
- Payments only unlock after the first product is published (keeps the funnel moving).
- Affiliate earnings have a 7-business-day hold before cash-out (refund protection).

**Implication for Kitevo's payout-rail decision (§11.2):** Stan's model is Stripe Connect, not Merchant of Record. Kitevo's entity is Indian (Udyam). **Stripe Connect platform availability for an India-registered platform is restricted — verify before designing R2/R3.** Options to evaluate: (a) Dodo marketplace/split-payout support, (b) a non-India entity (e.g. US LLC) for Stripe Connect, (c) PayPal-direct-style "creator's own processor" first, which needs no payout rail at all and is the fastest MVP.

### 12.4 Features worth noting for Kitevo

| Stan feature | Relevance to Kitevo |
|---|---|
| **AutoDM** (comment keyword → DM a link) | High. Creators love it, and we already have an approved Meta app. Needs **new permissions** (`instagram_manage_comments`, `instagram_manage_messages`) → another App Review. Could DM the *media kit* link to brands commenting "collab". |
| **Affiliate Share** (customers/creators resell products for a cut) | Medium; Phase 2. |
| **Collect Info** custom fields at checkout | Direct fit for our **brand inquiry form** — brands fill budget, deliverables, timeline. |
| Email flows + confirmation emails | We have Resend; per-product confirmation email is cheap. |
| Payment plans / discount codes as Pro-only | Good **upgrade levers** — gate the same way. |
| Community (largest help area) | Not now (§3.4). |

### 12.5 Public storefront page anatomy (from a live store)

Top → bottom: avatar + handle + one-line tagline → icon-only social links → product card (image, title, price) → headline + subtitle → description + "What's included" bullets → "Perfect for you if…" → "How it works" (3 steps) → booking/checkout form inline (date picker, marketing opt-in, subtotal/tax/total, embedded payment) → privacy link + language picker. **Checkout lives on the product page — no cart, no redirect.** This is the single most important UX pattern to adopt.

### 12.6 Still to learn (needs a trial account)

Onboarding steps after signup, dashboard home layout, analytics screens, the Income/cash-out screen, email-marketing UI, and how the referral program is presented in-app.

Sources: [Stan Help Center](https://help.stan.store), [Sell a Digital Download](https://help.stan.store/article/14-sell-a-digital-download-product), [Coaching Call product](https://help.stan.store/article/15-book-time-on-your-calendar-product), [Connect Stripe](https://help.stan.store/article/7-how-to-connect-stan-with-stripe), [Connect PayPal](https://help.stan.store/article/53-how-to-connect-stan-with-paypal), [Affiliate payouts](https://help.stan.store/article/402-how-do-affiliates-get-paid), [AutoDM setup](https://help.stan.store/article/377-stan-auto-dm), [Example store page](https://stan.store/DIAS_global/p/book-a-11-call-with-me-crj68y91).

---

## 13. Referral program (R1) — shipped 2026-11-01

**Terms** (`REFERRAL_TERMS` in `lib/referrals.ts`): 20% of the pre-tax amount a referred user pays, for 12 months from their first payment; 30-day hold; $25 minimum payout; self-referrals blocked (same email alias, or same payment customer). Open to every account (creators and brands).

**How it works:** `?ref=CODE` → first-touch 60-day cookie → credited at signup (email + Google) → each `payment.succeeded` webhook writes a `ReferralCommission` → available after the hold → paid. Refunds reverse unpaid commissions or claw back paid ones against the next payout. Every kit's "Create yours" link carries its owner's code, so every shared kit is a referral link.

**Visibility (2026-11-01):** landing hero "New · Earn 20%" badge, nav "Earn 20%", a full landing section (`#earn`), FAQ entry, footer link, public `/referral-program` page with an earnings estimator (in sitemap); in-app: dashboard card (copy link + earnings) and nav link, "Earn" tab in every creator/brand sidebar, avatar menu. All numbers come from `lib/referral-terms.ts`.

**Surfaces:** `/referrals` (link, earnings, payout details: PayPal / Wise / bank, legal name, country, tax ID, encrypted) · `/admin/payouts` (`ADMIN_EMAILS` only: everything on-page — who is owed what, payout details with copy buttons, record a whole batch with one reference, reverse a commission, history) · monthly "payouts due" email (Vercel cron, 1st of the month) · receipt email to each referrer when a payout is recorded.

**Payouts are manual by decision (2026-11-01):** Kitevo pays referrers worldwide, so no India-only rail (RazorpayX/Cashfree) — and PayPal Payouts / Wise Business APIs don't appear available to an India-registered business. For now: read details on /admin/payouts → pay in PayPal/Wise/bank → mark paid.

**Later — automate with ONE global payout vendor** once volume justifies the fee (rough trigger: >$300–500/month in payouts or >20 referrers per batch). Candidates that work with Dodo and pay internationally: **Rekomi** (150+ countries, tax forms, refund clawback), **Dub Partners** (Stripe Express payouts, embedded referral dashboard, ~$90/mo + ~5% reported), **Affonso** (PayPal/Wise). Integration plan: keep our ledger as the source of truth; add `lib/payouts` behind an interface (same pattern as `lib/payments`); the vendor's payout webhooks mark `ReferralPayout`s paid automatically, replacing the manual "record" step. The same vendor decision should cover creator payouts for Phase 1 commerce (R2/R3) — evaluate both needs together.

**Open:** accountant review of cross-border commission payments (TDS / equalisation levy, records per payee); Stripe refunds aren't mapped automatically yet (reverse from admin).

---

## 14. Onboarding redesign — 2026-11-01

**Why:** every referral and SEO visitor lands here; the old flow asked for a full profile (photo, bio, 20 niches, links), showed a plan picker before the user had built anything, and made them type a URL slug.

**Now:** role picker → creators: **You** (name, username suggested from their name and checked live, up to 5 niches) → **Connect** (Instagram/YouTube optional; the Business/Creator + Facebook Page requirement is explained before they click) → **Your kit is live** (kit auto-created at `/kit/<username>`, copy link, open editor, view as a brand, invite link for the referral program). A live phone preview fills in beside the form and never shows sample numbers. No plan step; upgrades happen after they've seen their kit. Brands: one screen (company, industry, budget) → Discover.

**Measure:** `scripts/funnel-report.ts` — compare signup → onboarding_complete → kit_created → kit_first_view before and after the deploy.

---

## 15. Shipped 2026-11-01 → 11-02 (outside the Phase 0 checklist)

Workspace and product work that landed on the feature-branch stack (merge order in RELEASE.md):

- **Workspace shell.** One route per tab (`/dashboard`, `/discover`, `/campaigns`, `/messages`, `/pipeline`, `/referrals`, `/settings`, `/pricing`, `/admin`) in the `app/(workspace)` route group with one **persistent layout**: the sidebar and top bar render once and tab clicks swap only the page, with an instant loading state. Account pages (my kit, plan & billing, settings, admin) live in the profile menu.
- **Speed.** Payment-provider status lookups cached 60s and invalidated on every plan change; the dashboard no longer waits on them; requests run in parallel; tab clicks show pending state.
- **Dashboard.** Kit spotlight (main kit shown once), honest audience-numbers prompt, inquiries summary; skeletons that match every layout.
- **Pipeline tab.** Brand inquiries get their own page (list with stage filters, or a drag-and-drop board).
- **Kit creation in a modal**, from every entry point.
- **Settings (creator + brand) and Invite & earn** rebuilt in a two-column layout; profile and company forms with an unsaved-changes save bar.
- **Campaigns** (creator feed, brand manager, detail) in the same layout.
- **Landing page = "earn with Kitevo"** (§11.4): navy hero with product cutouts and a distinct dark-mode scene, 0% of deals, three ways to earn, example kits (Unsplash portraits), one link vs five tabs, example inbox; honesty disclosures kept in section copy.
- **Brand theme** (navy / blue / sky / aqua) as one app theme; palettes became kit styles.
- **Rates are back on the kit**, itemised (deliverable + price), with a button that can never be a dead link; in exports too.
- **Kit editor rebuilt.** Workspace frame, autosave with status + retry, and a live preview that renders the real kit component from the unsaved draft — Mobile (inside an iPhone mockup, true 390px layout) or Desktop, as a drag-to-scroll touch area. The public kit moved to container queries to make this possible (verified pixel-identical).
- **Campaign emails.** Brands hear about new applications; creators hear when they're accepted or declined.
- **Fixes found along the way.** A brand could change applications on other brands' campaigns (now scoped to the campaign); the kit inquiry email inserted visitor input unescaped (all email templates now escape user text).

**Still open from this plan:** Phase 1 commerce Releases B (paid products via creator-owned payments) and C (bookings); Phases 2–3. Smaller gaps tracked in CLAUDE.md "Other Pending": report/block, downgrade handling for the kit cap, DB indexes, Supabase Storage for images, brand team seats.

---

## 16. Shipped 2026-11-03

- **Kit page redesign** (Sprint 2): audience-sentence headline from real data, stat strip, cardless sections, sticky rate-card rail on desktop and a sticky "Work with me" bar on phones.
- **Kit editor**: mirrors the kit, profile and contact links editable in place, click any part of the preview to edit it, Mobile (iPhone) and Desktop (1280px browser window) previews. **Creator Settings became account-only.**
- **Security**: contact links restricted to web/email URLs on save and on display (a `javascript:` link could previously run on a public kit).
- **Comparison pages** (Sprint 3): `/compare` + Kitevo vs Stan Store, Linktree, Beacons, Canva. Every competitor fact sourced and dated; Kitevo's gaps stated. Official competitor icons, simple flat SVG illustrations. Correction found: Stan now offers custom domains on Creator Max.
- **Blog**: cover illustrations per post, card-grid index, code blocks no longer widen the page on phones.
- **Payout-rail decision**: creator-owned payments (Kajabi model). Dodo can't split payments and Stripe Connect is invite-only for Indian companies, so buyers pay the creator's own Razorpay/Stripe/PayPal and Kitevo never holds funds.
- **Commerce Release A**: Products page ("Sell" in the sidebar), free downloads in exchange for an email, kit Shop section, product page in the creator's kit style, private delivery page + email, downloads list. Privacy policy updated.
- **Dodo checkout fix**: the plan now links on return from checkout (via the `subscription_id` Dodo appends), checked against the signed-in user, instead of only via the webhook.

## 17. Commerce Release B: paid products (Razorpay), 2026-11-03

- Creators connect **their own Razorpay** (Key ID + Secret, verified, secret encrypted). Buyers pay through Razorpay Checkout straight into the creator's account; Kitevo takes 0% and never holds money.
- Paid products are a **Starter/Pro** feature (the subscription is how Kitevo earns, since there's no cut). Free downloads stay on every plan.
- Signature + payment checks server-side before delivery; no webhooks needed, and a paid-but-unconfirmed order is recovered when the buyer retries.
- Next: Stripe (restricted key) and PayPal connections, then Release C (bookings).

## 18. Stripe for paid products, 2026-11-04

- Creators connect their own Stripe with a **restricted key** limited to Checkout (full secret keys are refused). Buyers pay on Stripe's hosted page; the session is verified with Stripe before delivery. 0% to Kitevo.
- With Razorpay and Stripe both connected, buyers choose (Razorpay for UPI in India, Stripe for international cards).
- Compare pages updated: Kitevo now sells digital downloads (free or paid); courses, memberships and bookings are still gaps.
- Next: PayPal, then Release C (bookings).

## 19. Release C: booked calls, integrations-first, 2026-11-04

- Decision: no native slot picker (built, then closed as PR #20). Creators connect the scheduler they already use (Calendly, Cal.com, Google Calendar appointment schedules); it owns availability, conflicts with their real calendar, reminders and payment.
- A booking product embeds that scheduler on the creator's product page and shows on the kit as a "1:1 call".
- Next: read bookings back (Calendly/Cal.com APIs + webhooks) so they appear in Kitevo.

## 20. PayPal for paid products, 2026-11-04

- Creators connect their own PayPal REST app (Client ID + Secret; live/sandbox detected). Buyers approve on PayPal; Kitevo captures and verifies before delivery. 0% to Kitevo.
- PayPal is offered for USD products only (PayPal no longer processes domestic INR); the buy box, checkout and publish rules enforce it.
- Payment test coverage filled in: connect API for all three providers, PayPal return/capture, checkout per provider, publish/currency rules, recovery for all providers.

