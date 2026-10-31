# Kitevo Product & Growth Plan

**Status:** Phase 0 in progress
**Last updated:** 2026-10-30
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
| Custom domain | Not supported |
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
| Gaps | No commerce, no courses/memberships/bookings, no customer portal, no payouts, no email marketing, no custom domains, no mobile apps |

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
| Free plan | No | **Partial** (dashboard gate bug) | **Live** |
| Media kit / link-in-bio page | Live | **Live** | **Live** |
| Live IG/YT stats | No (manual/analytics) | **Live** | **Live** |
| Manual stats | Partial | **No** (advertised) | **Live** |
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
| Custom domain | No | No | **Planned** (Phase 1) |

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
- [ ] **Migrations.** Replace `prisma db push --accept-data-loss` with versioned migrations before commerce tables land.
- [ ] **Token encryption.** Encrypt Instagram/YouTube access and refresh tokens at rest.
- [ ] **Admin/ops.** Minimal admin view for users, comps, subscriptions, and failed webhooks.
- [ ] **Trials and coupons.** Provider-backed trial and coupon support, with abuse limits.
- [ ] **Analytics baseline.** Track signup → kit created → kit shared → upgrade.
- [ ] **Custom domains.** Design and ship the domain model and verification flow for paid plans.

**Exit criteria:**

- A new free user can publish a kit without hitting a paywall.
- Every feature listed on the pricing page is either shipped or removed.
- No fabricated social proof or "live" label on self-reported data.
- `npm test` and `npm run build` pass.
- A rollback plan exists for the first migration.

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

**Acceptance verified:** unit + route tests (`lib/manual-stats.test.ts`, `app/api/kits/**`); schema change is additive with a default, safe for `db push` on next deploy.

### P0-3. Honest marketing ✅ (2026-10-31)

**Problem:** `Testimonials.tsx` contained named creators, follower counts, and quotes that cannot be verified.

**Shipped:**

- Testimonial carousel replaced with six "Why Kitevo" product-outcome cards — no invented people, page anchor renamed `#why-kitevo`.
- Claims synced to shipped features: Free/Pro feature lists on the plan config, landing pricing, FAQ, and dashboard upgrade prompts no longer mention unshipped rates, custom colors/typography, logo upload, or work samples.

**Acceptance verified:** grep audit for removed claim keywords comes back clean in marketing surfaces.

### P0-4. Migrations

- Create `prisma/migrations/` and baseline the current schema.
- Move deploy flow from `db push` to `migrate deploy`.
- Add a pre-deploy backup/rollback note.
- Never run destructive schema changes against production without a reviewed migration.

### P0-5. Token encryption

- Encrypt `instagramAccessToken`, `youtubeAccessToken`, and `youtubeRefreshToken` with an app-level key.
- Keep key rotation possible with a key id prefix.
- Never log tokens or include them in client payloads.

### P0-6. Admin and ops

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
