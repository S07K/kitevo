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
- **Avatar/logo uploads**: Stored as base64 data URLs in DB (resized client-side before upload). Max ~200k chars. Pattern: resize in browser → POST data URL → store in DB
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
- No brand monetization tier yet — planned (see Pending section)

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

### Brand Revenue Model (discussed, not built)
Phase 1 — gate + monetize:
- Cap free brands at 1 active campaign (check in campaign creation API)
- Wire `brand_verified` Stripe plan → sets `User.verifiedTier = "brand_verified"` (purple tick)
- Show purple tick on brand cards in creator discover + campaign cards

Phase 2 — Pro unlock features:
- Direct cold-message any creator (currently only applicants can be messaged)
- Shortlist/save creators (`SavedCreator` table)
- Advanced discover filters (follower range, engagement rate)
- Campaign analytics (views, application rate, acceptance rate)
- Featured campaign placement (pinned above free campaigns)
- Export applicants CSV

Phase 3 — Business tier:
- Team seats (`BrandMember` table, invite by email)
- Priority placement in creator discover

### Other Pending
- Supabase Storage migration (avatars/logos currently stored as base64 in DB — works but not ideal for scale)
- Vercel deployment setup / env vars for production
- Email notifications for campaign events (apply/accept/reject)
- DB indexes for scale
- Report/block between users
- Stripe tier enforcement: free plan caps (kit count, campaign count)
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
| `app/brand/settings/page.tsx` | Brand settings with logo upload |
| `app/brand/page.tsx` | Creator discover (brand side) |
| `app/campaigns/[id]/page.tsx` | Campaign detail + ApplySection timeline |
| `app/campaigns/[id]/ApplySection.tsx` | Application timeline UI |
| `app/api/me/profile/route.ts` | GET/PUT creator profile — returns companyName/logoUrl for brands |
| `app/api/me/avatar/route.ts` | Base64 avatar upload |
| `app/api/brand/logo/route.ts` | Base64 logo upload (upsert) |
| `app/api/brand/profile/route.ts` | Brand profile GET/PUT |
| `app/api/webhook/route.ts` | Stripe webhooks → verifiedTier sync |
| `app/api/subscription-status/route.ts` | Auto-syncs verifiedTier on load |
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

---

## Git / Deploy

- Repo: `https://github.com/micro-builds/kitevo.git`
- Branch: `main`
- All work committed and pushed to main
