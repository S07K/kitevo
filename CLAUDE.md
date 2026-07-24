# Kitevo — CLAUDE.md (Agent Context)

## What is Kitevo

Kitevo is a creator-brand collaboration platform. Two sides:
- **Creators** build professional media kits (shareable pages with live Instagram/YouTube stats), apply to brand campaigns, and get discovered
- **Brands** post campaigns, browse/message creators via a discover page, and manage applicants

Stack: Next.js 16 App Router, Prisma + Supabase (Postgres), NextAuth, payments via `lib/payments` (Stripe or Dodo, per `PAYMENT_PROVIDER`), Tailwind v4, Resend (email), Vercel deployment.

---

## Key Technical Rules

- **Tailwind v4**: Use `@import "tailwindcss"` — `neutral` color unreliable, use `bg-muted`/CSS vars instead. Dark mode requires `@variant dark (&:where(.dark, .dark *));` in globals.css (class-based, not OS media query)
- **Prisma**: Run `prisma generate` after schema changes. For NOT NULL columns on existing rows, use raw SQL `ALTER TABLE` via `prisma db execute --stdin` before `db push`
- **Avatar/logo uploads**: Stored as base64 data URLs in DB (resized client-side before upload). Max ~200k chars. Pattern: resize in browser → POST data URL → store in DB. **Instagram photo import** downloads the image server-side to base64 (`lib/image-to-data-url.ts`) — never stores the expiring `fbcdn` CDN URL. Render avatars via `AvatarImg` (falls back to initials on load error). Backfill: `scripts/backfill-instagram-avatars.ts`
- **Dark mode**: Managed via `next-themes`, class applied to `<html>`. ThemeToggle lives in NavAvatar popup only.
- **Payments go through `lib/payments`, never a provider SDK directly.** Two implementations: `stripe-provider.ts` and `dodo-provider.ts`, selected by `PAYMENT_PROVIDER` (default stripe; an unknown value throws rather than falling back). `config/subscriptions.ts` reads the same var to pick `STRIPE_PRICE_ID_*` vs `DODO_PRODUCT_ID_*`. **Dodo differences that bit us:** it spells cancellation `cancelled` (Stripe: `canceled`), has no `trialing`, uses `on_hold` for past-due, calls a price a `product`, and its checkout-session retrieve returns payment status only — no customer or subscription id — so Dodo cannot exchange a session for a customer and `isCheckoutSessionId` returns false, leaving linking to the webhook (`subscription.active` carries customer + metadata + product). Dodo webhooks use the Standard Webhooks spec (`webhook-id`/`webhook-signature`/`webhook-timestamp`), not a Stripe-style single header. `PaymentProvider` (`lib/payments/types.ts`) is the contract; `stripe-provider.ts` is the only file that may import `stripe` or know what a `cs_` prefix means. Adding a provider (Dodo, Paddle) = one new file implementing the interface + selecting it in `lib/payments/index.ts`. Webhooks are translated into domain events (`checkout.completed`, `subscription.changed`, `subscription.canceled`, `ignored`) so the webhook route has no provider vocabulary. Unknown subscription statuses normalise to `inactive`, i.e. fail closed — never grant access on a status we don't recognise. Note `User.stripeCustomerId` and the `STRIPE_PRICE_ID_*` env names are unchanged: renaming costs a migration and is worth doing only when a second provider actually ships.
- **Brand mark**: a bold K overprinted 3x, riso-style (indigo → terracotta → cream), from `lib/logo.ts`. The offset layers read as earlier impressions with the current one on top — that's the "evo" in Kit+evo (name = *the kit, evolved*; it is **not** "kite"). Never hand-edit the mark in a graphic; change `lib/logo.ts` and re-run the generate script. Below ~20px use the `mono` variant.
- **Kit page honesty rules**: never render fabricated stats. No placeholder/synthetic growth curves on live kits (empty state instead; `buildSyntheticGrowthFromFollowers` is demo-only), hide stats that are 0/unavailable (e.g. engagement), growth chart = cumulative followers over last 30 days rebuilt from Meta's daily `follower_count` deltas (needs ≥7 days). "Live — synced from Instagram" indicator only shows for real connected kits.
- **Kit page layout**: hero → combined stats block (total audience headline when IG+YT both connected; platform-tagged tiles — IG: followers/engagement/30d growth, YT: subscribers/total views/avg views-per-video) → typical post performance (avg likes/comments/reach) → growth chart + audience-age donut (2-col, equal height) → Instagram posts (one row of 3 + "See more" → profile via `stats.extra.username`) → YouTube videos → brands → rates → contact. Hero shows niches + location.
- **Kit charts**: audience age uses a fixed-size `PieChart` (donut), NOT ResponsiveContainer (measures 0 inside flex/centered parents). Audience gender = CSS segmented split bar; top countries = CSS flag + progress-bar list (ISO code → name via `Intl.DisplayNames`, flag emoji from code). IG demographics fetch age/gender/country breakdowns in parallel (`fetchBreakdownPayload`). YouTube analytics from Data API: subscribers, total views, video count, per-video views/likes (demographics need the heavier YouTube Analytics API).
- **Creator dashboard** (`app/dashboard/page.tsx`): Activity tab is the default active tab (`#inbox` hash opens Inbox); kit views load on mount.

---

## Account Types

### Creator (`accountType: "creator"`)
- Has media kits, connects Instagram/YouTube, applies to campaigns
- Plans: `starter` (1 kit) / `pro` (3 kits, verified tick, inquiry form)
- Verified tier: `creator_pro` (blue tick) stored in `User.verifiedTier`
- Public profile: `/{username}` and `/u/{username}` — shows kits, niches, bio

### Brand (`accountType: "brand"`)
- Has `BrandProfile` (companyName, logoUrl, industry, budgetRange, website, description)
- Posts campaigns, browses creator discover, messages creators
- Public profile: `/{username}` — shows open campaigns (NOT kits)
- Display name = `brandProfile.companyName` (NOT `user.name`) everywhere
- Avatar = `brandProfile.logoUrl` (NOT `user.avatarUrl`) everywhere
- **Brand Pro** tier (`brand_verified`, purple tick): unlimited open campaigns, cold-message any creator, featured placement (see Brand Monetization below)

---

## What's Been Built (Completed)

### Auth & Onboarding
- Email/password signup with email verification (Resend)
- Google SSO
- Forgot password / reset password
- Onboarding flow: profile → connect platforms → choose plan → create kit

### Creator Features
- Multi-kit management (create, rename slug, delete, password-protect)
- Kit editor: vibes (Editorial/Studio/Bloom/Electric/Noir), rates, brand partners, section visibility
- Live Instagram stats (followers, engagement, post grid with Reels-style 9:16 cards)
- Live YouTube stats (subscribers, views, video grid with inline playback)
- Kit analytics: views over time, referrer breakdown
- `VerifiedBadge` component: `creator_pro` (blue), `top_creator` (gold), `brand_verified` (purple) — shown on discover, dashboard, media kits
- Verified tick auto-synced from Stripe via webhook + `/api/subscription-status`
- **Content niches picker**: 20 options, max 5, pill toggle UI in ProfileForm — saved to `User.niches` (JSON string[])
- Niches shown as blue accent tags on discover cards, public profiles

### Brand Features
- Campaign creation and management (`/brand/campaigns`)
- Creator discover page (`/brand`) — filter by niche, search, view creator cards with niches
- Inbox / DM system between brands and creators (realtime via SSE)
- Brand settings: companyName, industry, budgetRange, website, description, **logo upload** (click-to-upload, no URL paste)
- Brand public profile (`/{username}`): shows company name, logo, description, open campaigns as clickable cards → `/campaigns/[id]`

### Brand Monetization — Brand Pro (`brand_verified`)
- **Brand Pro plan**: $29/mo (`STRIPE_PRICE_ID_BRAND`) / $290/yr (`STRIPE_PRICE_ID_BRAND_YEARLY`) — `brand` tier in `config/subscriptions.ts` (`audience: "brand"`, `verifiedTier: "brand_verified"`)
- **Purchasable**: `BrandPlanCard` on `/brand/settings` — monthly/yearly toggle (yearly shown as small monthly figure + savings), Upgrade → checkout (`tierId: "brand"`); shows verified state + "Manage billing" (portal) when active
- **Tier derived from price**: `getVerifiedTierForPriceId()` — creator plans → `creator_pro`, brand plan → `brand_verified` (webhook + subscription-status; no more hardcoded `creator_pro`)
- **Free brands capped at 1 open campaign** (POST + reopen PATCH); Brand Pro = unlimited. Cap error links to upgrade
- **Purple tick** shown across creator discover cards, campaign cards, campaign detail, and both inboxes (creator + brand)
- **Cold-message gate**: free brands can only message their own applicants; messaging any creator directly requires Brand Pro (`403 cold_message_locked` → upgrade prompt on discover)
- **Priority placement**: `brand_verified` campaigns pinned above others in creator feed (`/social/campaigns`), with purple "Featured" tag
- `getPublicTiers(audience)` filters by audience (defaults to creator) so Brand Pro stays off creator pricing/onboarding pages
- **Shortlist/save creators**: `SavedCreator` table; bookmark toggle + "Saved" filter on brand discover (`/api/social/saved`). Available to all brands

### UI / UX
- `AppNav`: logo + NavAvatar only (no tabs). Tabs moved to `AppSidebar`
- `NavAvatar` popup: name, role, Dashboard, Settings (role-aware), theme toggle, logout
- Brand accounts show `companyName` + `logoUrl` in NavAvatar (not personal name/avatar)
- Logo upload fires `kitevo:avatar-updated` custom event → NavAvatar updates instantly
- `Badge` component: `default/accent/success/warning/danger/open/closed` variants with dot option
- Semantic tag colors throughout (blue accent for niches, green for open status)
- `cursor-pointer` applied globally to all buttons/selects
- Application timeline UI: Applied → Under Review → Brand reached out → Decision (dot + vertical connector)
- Chat avatars are clickable → open other user's public profile in new tab
- `ProfileForm`: avatar upload (resize to 320px JPEG), username availability check, bio, links, **niches picker**

### Profile Pages
- `/profile` (creator): avatar upload, name, username, bio, links, niches picker, Connections section (Instagram + YouTube as list rows), Plan card
- `/brand/settings`: company name, industry, budget range, website, logo upload, description
- `/{username}`: works for both creators (shows kits) and brands (shows open campaigns) — resolves correct name/avatar/bio from brandProfile for brands
- `/u/{username}`: same brand-aware resolution

### Infrastructure
- Stripe: checkout, webhooks for `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted` → sets `User.verifiedTier`
- `/api/me/avatar`: base64 data URL upload for creator avatars
- `/api/brand/logo`: base64 data URL upload for brand logos (upsert pattern — safe if BrandProfile row doesn't exist yet)
- `/api/youtube/status` + `/api/instagram/status`: connection status checks
- Email notifications: kit views, new inquiry alerts via Resend

---

## Pending / Next Up

### Brand Revenue Model
**Phase 1 — gate + monetize: ✅ DONE** (cap free brands at 1 open campaign, `brand_verified` Stripe plan wired, purple tick on creator-facing surfaces — see Brand Monetization above)

Phase 2 — Pro unlock features:
- ✅ Direct cold-message any creator (gated behind Brand Pro)
- ✅ Featured campaign placement (Brand Pro campaigns pinned above free)
- ✅ Shortlist/save creators (`SavedCreator` table) — available to all brands
- ✅ Advanced discover filters (follower range, engagement rate) — **Brand Pro only**. Cached on `User.followerCount/engagementRate` via `lib/creator-stats-cache.ts` (opportunistic write from `getStatsForUser` + `scripts/refresh-creator-stats.ts` for cron). Free brands see a locked upgrade chip
- ✅ Campaign analytics — `CampaignView` tracking (`lib/campaign-views.ts`, recorded on campaign detail, owner excluded); brand campaigns show views, applied, apply rate, acceptance rate
- ✅ Export applicants CSV (`/api/social/campaigns/[id]/applications/export`) — button on brand campaigns applicants panel

**Phase 2 complete.** Remaining brand roadmap: Phase 3 (team seats).

Phase 3 — Business tier:
- Team seats (`BrandMember` table, invite by email)

### Other Pending
- Supabase Storage migration (avatars/logos currently stored as base64 in DB — works but not ideal for scale)
- Vercel deployment setup / env vars for production
- Email notifications for campaign events (apply/accept/reject)
- DB indexes for scale
- Report/block between users
- Stripe tier enforcement: creator kit-count cap (campaign-count cap for brands ✅ done)
- Wire `CampaignApplication.updatedAt` back into timeline once confirmed regenerated

---

## File Map (Key Files)

| File | Purpose |
|------|---------|
| `app/components/NavAvatar.tsx` | Avatar popup — Dashboard, Settings, theme, logout. Listens for `kitevo:avatar-updated` event |
| `app/components/AppNav.tsx` | Top nav — logo + NavAvatar only |
| `app/components/AppSidebar.tsx` | Side nav with exact-match active tab |
| `app/components/Badge.tsx` | Semantic badge/tag component |
| `app/components/ProfileForm.tsx` | Creator profile form — avatar upload, username check, bio, links, niches picker |
| `app/components/VerifiedBadge.tsx` | Verified tick: blue (creator_pro), gold (top_creator), purple (brand_verified) |
| `app/[username]/page.tsx` | Public profile — brand-aware (campaigns for brands, kits for creators) |
| `app/u/[username]/page.tsx` | Same, alternate route |
| `app/profile/page.tsx` | Creator settings: profile form + Connections section + Plan card |
| `app/brand/settings/page.tsx` | Brand settings with logo upload + `BrandPlanCard` |
| `app/brand/BrandPlanCard.tsx` | Brand Pro plan status + upgrade CTA (monthly/yearly checkout, manage billing) |
| `app/brand/page.tsx` | Creator discover (brand side) — Message gated by Brand Pro |
| `app/components/AvatarImg.tsx` | Avatar `<img>` with initials fallback on load error |
| `app/campaigns/[id]/page.tsx` | Campaign detail + ApplySection timeline (brand verified tick) |
| `app/campaigns/[id]/ApplySection.tsx` | Application timeline UI |
| `app/social/campaigns/page.tsx` | Creator campaign feed — brand tick + "Featured" tag |
| `config/subscriptions.ts` | Tier definitions (incl. `brand`), price/tier/verifiedTier resolvers |
| `app/api/social/campaigns/route.ts` | Campaigns GET/POST — free-brand cap, priority placement sort |
| `app/api/social/conversations/route.ts` | Conversations — cold-message Brand Pro gate |
| `app/api/social/saved/route.ts` | Shortlist — GET/POST/DELETE saved creators (brands) |
| `app/api/create-checkout-session/route.ts` | Checkout (creator + brand); `returnTo` routing |
| `app/api/create-portal-session/route.ts` | Stripe billing portal; `returnTo` routing |
| `app/api/me/profile/route.ts` | GET/PUT creator profile — returns companyName/logoUrl for brands |
| `app/api/me/avatar/route.ts` | Base64 avatar upload |
| `app/api/me/profile/use-instagram-photo/route.ts` | Import IG photo → durable base64 |
| `lib/image-to-data-url.ts` | Fetch remote image → base64 data URL (durable avatar/logo storage) |
| `app/api/brand/logo/route.ts` | Base64 logo upload (upsert) |
| `app/api/brand/profile/route.ts` | Brand profile GET/PUT |
| `app/api/webhook/route.ts` | Stripe webhooks → verifiedTier sync (price-derived tier) |
| `app/api/subscription-status/route.ts` | Auto-syncs verifiedTier on load (price-derived) |
| `lib/get-kit-by-slug.ts` | Kit loader with verifiedTier |
| `prisma/schema.prisma` | Full DB schema |
| `app/globals.css` | Tailwind v4 dark mode fix + cursor-pointer globals |
| `lib/logo.ts` | **Single source of truth for the mark** — K path, overprint offsets, colours. Framework-free so the app and the node render script share it |
| `app/components/Logo.tsx` | `<LogoMark>` — the mark in React (`on="ink"/"cream"`, `mono` for tiny sizes) |
| `scripts/generate-social-graphics.ts` | `npx tsx scripts/generate-social-graphics.ts` → regenerates `public/og-default.png`, `brand/social/*`, and `app/icon.svg` from `lib/logo.ts` |

---

## Prisma Schema Notes

- `User.niches` — `String?` JSON string[] of creator content niches
- `User.verifiedTier` — `String?` values: `creator_pro`, `top_creator`, `brand_verified`, null
- `User.accountType` — `"creator"` | `"brand"`
- `BrandProfile.companyName/logoUrl/industry/budgetRange/website/description`
- `Campaign.status` — `"open"` | `"closed"` | `"draft"`
- `CampaignApplication.status` — `"pending"` | `"accepted"` | `"rejected"`
- `CampaignApplication.updatedAt` — added but may need `prisma generate` confirmation
- `SavedCreator` — brand↔creator shortlist join (`@@unique([brandId, creatorId])`, named relations `BrandSaved`/`SavedByBrand`)
- `CampaignView` — campaign view events (`campaignId`, nullable `viewerId`, `referrer`); owner views not recorded
- `User.followerCount/engagementRate/statsUpdatedAt` — cached creator stats for discover filtering (refreshed from IG/YT via `lib/creator-stats-cache.ts`)
- **Schema sync is `db push`, not migrations** (`scripts/vercel-build.cjs` runs `prisma db push --accept-data-loss`); no `prisma/migrations` dir
- **Supabase needs two connection strings**: `DATABASE_URL` = transaction pooler (:6543, `?pgbouncer=true`) for runtime, `DIRECT_URL` = session pooler (:5432) for `db push`. Never Supabase's "direct connection" — it is IPv6-only without the paid add-on. See DEPLOY.md step 2

---

## Deployment status (July 2026)

**Live at https://getkitevo.com.** Vercel Hobby, personal repo `S07K/kitevo`
(Hobby refuses private *org* repos — do not move it back). Supabase Postgres via
two connection strings, Resend email from `mail.getkitevo.com`, Stripe in **test**
mode. Instagram insights and YouTube data both verified working in production.

Full setup and the reasoning behind each choice is in `DEPLOY.md`. Open items:

- **Publish the Google OAuth consent screen** if still in "Testing": Google
  expires refresh tokens after 7 days in that state, so every creator's YouTube
  connection dies weekly. Separate from verification.
- `GOOGLE_SITE_VERIFICATION` unset in Vercel, so Search Console cannot verify
  domain ownership and Google's OAuth branding check keeps rejecting the homepage.
- Meta App Review not filed. Not required for a beta: creators added as Instagram
  **testers** can connect without review or Business Verification.
- Platform access tokens are stored in plain text (the DB provider encrypts at
  rest). Worth real encryption before public launch.
- Rate limiting (`lib/rate-limit.ts`) covers all three unauthenticated email routes:
  signup, forgot-password, resend-verification. Per-IP is in memory, so it is
  process-local on serverless and only slows a single source; the durable protection
  is the per-email cooldown on the two resend paths, derived from the stored token
  expiry. `vitest.setup.ts` clears windows between tests. Upgrade path if abuse ever
  justifies it: a Redis-backed counter with the same shape.
- Supabase free projects pause after ~7 days of inactivity; a paused DB means kit
  links error for visitors.

## Git / Deploy

- Repo: `https://github.com/S07K/kitevo.git` (personal, private — Vercel Hobby refuses private *org* repos)
- Branch: `main`
- All work committed and pushed to main
