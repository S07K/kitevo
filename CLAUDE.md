# Kitevo — CLAUDE.md (Agent Context)

## What is Kitevo

Kitevo is a creator-brand collaboration platform. Two sides:
- **Creators** build professional media kits (shareable pages with live Instagram/YouTube stats), apply to brand campaigns, and get discovered
- **Brands** post campaigns, browse/message creators via a discover page, and manage applicants

Stack: Next.js 15 App Router, Prisma + Neon (Postgres), NextAuth, Stripe, Tailwind v4, Resend (email), Vercel deployment.

---

## Key Technical Rules

- **Tailwind v4**: Use `@import "tailwindcss"` — `neutral` color unreliable, use `bg-muted`/CSS vars instead. Dark mode requires `@variant dark (&:where(.dark, .dark *));` in globals.css (class-based, not OS media query)
- **Prisma**: Run `prisma generate` after schema changes. For NOT NULL columns on existing rows, use raw SQL `ALTER TABLE` via `prisma db execute --stdin` before `db push`
- **Avatar/logo uploads**: Stored as base64 data URLs in DB (resized client-side before upload). Max ~200k chars. Pattern: resize in browser → POST data URL → store in DB. **Instagram photo import** downloads the image server-side to base64 (`lib/image-to-data-url.ts`) — never stores the expiring `fbcdn` CDN URL. Render avatars via `AvatarImg` (falls back to initials on load error). Backfill: `scripts/backfill-instagram-avatars.ts`
- **Dark mode**: Managed via `next-themes`, class applied to `<html>`. ThemeToggle lives in NavAvatar popup only.

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
- Advanced discover filters (follower range, engagement rate) — **blocked**: follower/engagement not stored; needs a stats-cache layer on `User` (refresh from IG/YT periodically) before filtering is possible
- ✅ Campaign analytics — `CampaignView` tracking (`lib/campaign-views.ts`, recorded on campaign detail, owner excluded); brand campaigns show views, applied, apply rate, acceptance rate
- ✅ Export applicants CSV (`/api/social/campaigns/[id]/applications/export`) — button on brand campaigns applicants panel

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
- **Schema sync is `db push`, not migrations** (`scripts/vercel-build.cjs` runs `prisma db push --accept-data-loss`); no `prisma/migrations` dir

---

## Git / Deploy

- Repo: `https://github.com/micro-builds/kitevo.git`
- Branch: `main`
- All work committed and pushed to main
