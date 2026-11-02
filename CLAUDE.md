# Kitevo — CLAUDE.md (Agent Context)

## What is Kitevo

Kitevo is a creator-brand collaboration platform. Two sides:
- **Creators** build professional media kits (shareable pages with live Instagram/YouTube stats), apply to brand campaigns, and get discovered
- **Brands** post campaigns, browse/message creators via a discover page, and manage applicants

Stack: Next.js 16 App Router, Prisma + Supabase (Postgres), NextAuth, payments via `lib/payments` (Stripe or Dodo, per `PAYMENT_PROVIDER`), Tailwind v4, Resend (email), Vercel deployment.

---

## Key Technical Rules

- **Tailwind v4**: Use `@import "tailwindcss"` — `neutral` color unreliable, use `bg-muted`/CSS vars instead. Dark mode requires `@variant dark (&:where(.dark, .dark *));` in globals.css (class-based, not OS media query)
- **Prisma / migrations**: Schema changes ship as versioned migrations in `prisma/migrations`. Workflow: change `schema.prisma` → `npx prisma migrate dev --name <change>` against the LOCAL DB (env vars need both `DATABASE_URL` and `DIRECT_URL` inline: `DATABASE_URL=<local url> DIRECT_URL=<local url> npx prisma migrate dev …`) → commit schema + migration together. Deploys apply pending migrations automatically — GitHub Action `.github/workflows/db-migrate.yml` (tests first, then `migrate deploy`) and `scripts/vercel-build.cjs` before `next build`. NEVER use `prisma db push` on a migrations-managed (prod/staging) database: it drifts from history and accepts data loss. For NOT NULL columns on existing rows, author the migration SQL with a `DEFAULT` (or backfill-then-constrain). **Every migration must keep working with the previous deployment** (migrations apply before the new build goes live, and Vercel rollback reverts code only): additive changes ship in one release; drops/renames/type changes/`SET NOT NULL` ship as expand → contract over two releases, with a `pg_dump` first. Add a row to the migration table in DEPLOY.md §8a for each new migration. Rollback playbooks: DEPLOY.md §8a.
- **Avatar/logo uploads**: Stored as base64 data URLs in DB (resized client-side before upload). Max ~200k chars. Pattern: resize in browser → POST data URL → store in DB. **Instagram photo import** downloads the image server-side to base64 (`lib/image-to-data-url.ts`) — never stores the expiring `fbcdn` CDN URL. Render avatars via `AvatarImg` (falls back to initials on load error). Backfill: `scripts/backfill-instagram-avatars.ts`
- **Icons**: brand logos from `@icons-pack/react-simple-icons` (`<SiPaypal />` + `SiPaypalHex`), generic icons from `lucide-react`. Never paste brand SVG paths by hand. Payout-method marks live in `app/components/PayoutLogos.tsx`.
- **Dark mode**: Managed via `next-themes`, class applied to `<html>`. The theme toggle lives in the account menus only: the sidebar account row (desktop workspace) and the NavAvatar popup (phones, non-workspace pages).
- **Brand colour / app theme**: ONE app theme (no palette switcher), from the owner-chosen palette: navy `#1B365D` (text/ink, primary hover), blue `#005A9C` (`--primary`), sky `#60C1E5` (`--accent`), aqua `#A0E0EF` (soft tints). Tokens in `globals.css`: `bg-primary text-primary-foreground` (+ `hover:bg-primary-hover`) for main actions, selected chips/toggles, progress and unread badges; `bg-primary-soft text-primary-soft-foreground` for niche tags, accent badges and the active sidebar item; `bg-accent text-accent-foreground` for "New"-style highlight pills; `--background` = white cards/inputs/menus, `bg-canvas` = cool light page and workspace backdrop (one step deeper so cards lift). Dark mode = navy surfaces with sky primary and dark text — so on `bg-primary`/`bg-accent` always use the matching `*-foreground`, never `text-white`/`text-background`. Never hardcode `bg-white`/greys/blues for surfaces or accents. The logo mark (`lib/logo.ts`) still uses its own indigo/terracotta/cream inks. Public kits ignore all of this — they use their kit style colours.
- **Kit styles**: free presets `warm/cool/paper/sage/mist/blush/lavender/noir` + Pro vibes, defined in `lib/kit-appearance.ts`. A new preset must be added to `KIT_THEME_CSS_VARS`, labels, `ALL_VALID_PRESETS`, `kitChartColors` (cover, charts, donut), `lib/pdf-theme.ts`, the PPTX `THEME` map and `VIBE_COLORS` in `KitActions.tsx`.
- **Comped access** (`User.compedTier`): grants a tier's entitlements (kits, verified badge, inquiry inbox) with NO subscription, for beta/press/grandfathering. A tier id or null, set with `scripts/comp-user.ts <email> <pro|brand|none>` per-user, or auto-applied to **every new signup** while `BETA_AUTO_COMP_TIER` names a tier (`lib/beta-comp.ts`, spread into both the email and Google signup creates; unset at launch, vercel-build warns if left on in production). Never a fake subscription (no customer id, survives provider swaps). `config/resolveVerifiedTier(subscriptionTier, compedTier)` is the one rule — subscription wins, comp is the floor — used at every verifiedTier write site (webhook, subscription-status) so a comp is never cleared by subscription syncing. `getAllowedKitsForUser` takes the max of comp and subscription. During beta, `BETA_AUTO_COMP_TIER=pro` auto-comps every new signup (both email and Google paths, via `lib/beta-comp.ts`); unset it at launch.  **Beta testers should be comped, never sent through test checkout** — test-mode checkout writes a real verifiedTier + a dead test customer id that has to be reconciled at go-live.
- **Platform tokens are encrypted at rest** (`lib/token-crypto.ts`, AES-256-GCM, key ring in `TOKEN_ENCRYPTION_KEYS`, first key active). Every write of `instagramAccessToken`/`youtubeAccessToken`/`youtubeRefreshToken` goes through `encryptToken`; every read that sends a token to Meta/Google wraps the row in `decryptPlatformTokens(...)`. Truthiness checks ("is connected") don't need decrypting. Undecryptable → null → treated as disconnected (fail closed). Legacy plaintext passes through until `scripts/encrypt-platform-tokens.ts` runs. Google sign-in tokens are not stored at all.
- **Funnel analytics** (`lib/analytics.ts`, `AnalyticsEvent` table): `trackEvent(name, { userId, props, dedupeKey })` with a closed name set (`ANALYTICS_EVENTS`) — add a name there before using it. Never throws; props carry no PII/tokens. "First time" events pass a `dedupeKey` (unique; inserted with `skipDuplicates`). Wired: signup (email + Google), onboarding_complete, kit_created, kit_first_view (non-owner, public kit page), checkout_started, upgrade + subscription_canceled (webhook). Report: `npx tsx scripts/funnel-report.ts [days]`. GA4 stays for page traffic only.
- **Referral program** (`lib/referrals.ts`, see PLAN.md §13): terms live in `REFERRAL_TERMS` in `lib/referral-terms.ts` (client-safe; marketing copy, estimator and ledger all read it — never hardcode "20%"). Attribution = `kitevo_ref` cookie (set client-side by `ReferralCapture` in the root layout, first touch wins) read at both signup paths. Commissions come ONLY from the `payment.succeeded` domain event and are idempotent on `paymentId`; refunds go through `applyRefundToCommission` (reverse unpaid, negative clawback row if already paid). Money = integer minor units of the settlement currency. "Available" is derived (`pending` && `availableAt <= now`), never stored. Payouts are manual: `/admin/payouts` (gated by `ADMIN_EMAILS` via `lib/admin.ts`, 404 for others; no CSV, everything on-page) → pay → `recordPayout` marks exactly the commissions it summed, in a transaction. Payout destination + tax ID are encrypted with `lib/token-crypto`.
- **Admin ops** (`/admin`, gated by `ADMIN_EMAILS`, 404 otherwise): every payment webhook is logged to `WebhookEvent` as its *domain event* (never the raw provider body) by `lib/webhook-log.ts`; what an event does lives in `lib/payment-events.ts` (`applyPaymentEvent`), shared by the route and admin Replay. Providers expose `webhookDeliveryId` so retries of an applied delivery are acknowledged, not re-applied. Comp/plan changes go through `lib/admin-actions.ts` (`setComp`, `resyncPlan`: live provider subscription → `resolveVerifiedTier`, keeps hand-granted `top_creator`, writes nothing if the provider lookup fails) and are written to `AdminAuditLog`. Prefer Resync over Replay for plan state — replaying an old `subscription.changed` can regress it.
- **Transactional email** (`lib/email.ts`, Resend): every user-supplied string goes through `escapeHtml` / `quote()` before it lands in HTML (visitors and creators control names, pitches, messages). Emails triggered by a user action are sent with `inBackground(label, task)` (`lib/background.ts`, Next `after()`), so a slow or failing send never blocks or fails the action. Campaign emails: brand on a new application; creator when a brand accepts/declines — only on an actual status change, never on re-clicks or a move back to pending.
- **Usernames** = public URLs, so rules live in `lib/username.ts` (`usernameProblem`, `RESERVED_USERNAMES`). Add any new top-level route to the reserved list. Profile PUT only validates a *changed* username. Niches list: `lib/niches.ts`.
- **`/api/subscription-status` reads the provider through `lib/subscription-cache.ts`** (60s `unstable_cache`, tag per customer) because dashboard/settings/pricing hit it on every load. Any code that changes a plan must call `invalidateSubscription(customerId)` — `applyPaymentEvent`, the in-app upgrade and admin resync already do. Webhooks/upgrades/admin read the provider directly, never via the cache. The dashboard renders once the profile loads; plan-dependent sections (metrics, plan panel, kit limits) wait for the status on their own.
- **Payments go through `lib/payments`, never a provider SDK directly.** Two implementations: `stripe-provider.ts` and `dodo-provider.ts`, selected by `PAYMENT_PROVIDER` (default stripe; an unknown value throws rather than falling back). `config/subscriptions.ts` reads the same var to pick `STRIPE_PRICE_ID_*` vs `DODO_PRODUCT_ID_*`. **Dodo differences that bit us:** it spells cancellation `cancelled` (Stripe: `canceled`), has no `trialing`, uses `on_hold` for past-due, calls a price a `product`, and its checkout-session retrieve returns payment status only — no customer or subscription id — so Dodo cannot exchange a session for a customer and `isCheckoutSessionId` returns false, leaving linking to the webhook (`subscription.active` carries customer + metadata + product). Dodo webhooks use the Standard Webhooks spec (`webhook-id`/`webhook-signature`/`webhook-timestamp`), not a Stripe-style single header. `PaymentProvider` (`lib/payments/types.ts`) is the contract; `stripe-provider.ts` is the only file that may import `stripe` or know what a `cs_` prefix means. Adding a provider (Dodo, Paddle) = one new file implementing the interface + selecting it in `lib/payments/index.ts`. Webhooks are translated into domain events (`checkout.completed`, `subscription.changed`, `subscription.canceled`, `ignored`) so the webhook route has no provider vocabulary. Unknown subscription statuses normalise to `inactive`, i.e. fail closed — never grant access on a status we don't recognise. Note `User.stripeCustomerId` and the `STRIPE_PRICE_ID_*` env names are unchanged: renaming costs a migration and is worth doing only when a second provider actually ships.
- **Brand mark**: a bold K overprinted 3x, riso-style (indigo → terracotta → cream), from `lib/logo.ts`. The offset layers read as earlier impressions with the current one on top — that's the "evo" in Kit+evo (name = *the kit, evolved*; it is **not** "kite"). Never hand-edit the mark in a graphic; change `lib/logo.ts` and re-run the generate script. Below ~20px use the `mono` variant.
- **Landing page = "earn with Kitevo"** (`app/page.tsx`, `app/components/landing/`): navy hero (names Kitevo + purpose above the fold — Google OAuth branding review) → 0% of your deals → three ways to earn (Campaigns, kit inquiry form → Pipeline [Pro], rates + live stats) → example kits by niche → one link vs five tabs → example inbox wall → How it works (keeps the "only reads, never posts" data-use disclosure) → referral → pricing → FAQ → final CTA. Illustrations are cutouts of real Kitevo surfaces built from `landing/cutouts.tsx` (KitCard, Cutout, Scribble). **No per-item "Example" tags (owner decision, 2026-11-02); the disclosure lives in section copy** — Example kits says "These are examples", the inbox wall says "Illustrative notifications, not real accounts", the referral card is worded as a hypothetical ("if 3 creators you invite upgrade"). Keep it that way when adding sections: no testimonials or revenue claims. Example creators use Unsplash portraits via `unsplashPortrait(photoId)` in `landing/cutouts.tsx` (hotlinked, face-cropped 160px; `AvatarImg` falls back to initials) — they illustrate example kits only and must never be presented as real users or quotes. The hero has a distinct dark-mode scene (midnight band, dot grid, dark kit card) switched with `dark:` classes, not JS. Prices/referral figures come from `config/subscriptions.ts` and `lib/referral-terms.ts`. `MarketingNav overDark` renders the header with the `dark` token set until scroll so it reads on the navy hero.
- **Kit page honesty rules**: never render fabricated stats. No placeholder/synthetic growth curves on live kits (empty state instead; `buildSyntheticGrowthFromFollowers` is demo-only), hide stats that are 0/unavailable (e.g. engagement), growth chart = cumulative followers over last 30 days rebuilt from Meta's daily `follower_count` deltas (needs ≥7 days). "Live — synced from Instagram" indicator only shows for real connected kits. Manual stats (`Kit.manualStats`, `lib/manual-stats.ts`) are headline-only and always labelled "Self-reported by creator" — they never feed growth/audience charts and never say "live". Live data replaces manual values per connected platform, and only for Starter+ owners (see `app/kit/[username]/page.tsx`).
- **Rates** (`lib/kit-rates.ts`): itemised rate card in `Kit.rates` JSON (`items: [{id,label,price}]`, optional `fromAmount`, `ctaLabel`, `show`); older `{show, fromAmount}` rows still parse. Every read and the kit PUT go through `normalizeRates`; `hasPublicRates`/`publicRateItems` decide what the kit shows (complete items only). The card's button targets `#work-together` (Pro inquiry form) else `#contact` (links) and is **hidden when neither exists — never a dead link**. Visibility is controlled only by `rates.show` in the editor (it writes `sectionVisibility.rates` to match). Real kits start from `EMPTY_RATES`/no brands; `MOCK_RATES` is for `/kit/demo` only.
- **shadcn registry components** live in `components/ui/` (aliases in `components.json`, written by hand). **Never run `shadcn init`** — it rewrites `globals.css` and would clobber the palette/dark-mode tokens. Add items with `npx shadcn@latest add <registry-url> --dry-run` first; registry items are copied source we own (record local edits in a header comment). Current: `components/ui/iphone.tsx` (Magic UI iPhone, + `children` in the screen area, black dynamic island).
- **Kit editor** (`/kit/edit?id=…`, `app/kit/edit/`): own `layout.tsx` renders the WorkspaceFrame (it can't live in the route group beside `/kit/[username]`). Autosaves 800ms after the last change (one save in flight, newest draft queued), header shows Saving/Saved/Couldn't save + Retry; preview (`KitPreviewPane`) has a Mobile / Desktop switch (remembered per browser via useSyncExternalStore, hydration-safe). The preview is the **real `MediaKitClient`** rendered from `/api/kits/[id]/preview` + the unsaved draft (`LiveKit`), so it updates as you type — no iframe. Mobile = 390×844 inside the Magic UI iPhone, scaled to fit. Both modes are a `TouchScroller`: drag-to-scroll with momentum, fingertip cursor, content `inert` (taps never navigate).
- **The kit is container-query responsive** (`MediaKitClient` + `MediaKitRecharts`): `<main>` sits in an `@container` and breakpoints are `@min-[640px]:` / `@min-[768px]:` / `@min-[1024px]:` (same thresholds as sm/md/lg), so the kit lays out for the width it's given — the window on the public page, 390px in the editor's phone. **Never add viewport `sm:/md:/lg:` inside the kit** (the preview would silently show the wrong layout); only the page headers and modals outside the container stay viewport-based (`container-type` applies layout containment, which would re-anchor their `position: fixed`). `embedded` prop = rendered inside the editor preview. Data assembly is shared: `lib/kit-view-data.ts` (server: plan, live stats, posts, inquiry, referral code) + `lib/kit-stats-compose.ts` (client-safe manual/live merge + statsSource), used by the page and `GET /api/kits/[id]/preview` (owner-only).
- **Kit page layout**: hero → combined stats block (total audience headline when IG+YT both connected; platform-tagged tiles — IG: followers/engagement/30d growth, YT: subscribers/total views/avg views-per-video) → typical post performance (avg likes/comments/reach) → growth chart + audience-age donut (2-col, equal height) → Instagram posts (one row of 3 + "See more" → profile via `stats.extra.username`) → YouTube videos → brands → rates → contact. Hero shows niches + location.
- **Kit charts**: audience age uses a fixed-size `PieChart` (donut), NOT ResponsiveContainer (measures 0 inside flex/centered parents). Audience gender = CSS segmented split bar; top countries = CSS flag + progress-bar list (ISO code → name via `Intl.DisplayNames`, flag emoji from code). IG demographics fetch age/gender/country breakdowns in parallel (`fetchBreakdownPayload`). YouTube analytics from Data API: subscribers, total views, video count, per-video views/likes (demographics need the heavier YouTube Analytics API).
- **Creator dashboard** (`app/(workspace)/dashboard/page.tsx`): a workspace — greeting header whose description is a live status line (views this week · unread inquiries), KitSpotlight (main kit in its vibe colours, verified tick, edit/view/copy + "…" menu from `KitActions.tsx` for share/download, change URL, password, delete), audience tiles (only tiles with real data; none → one honest connect/Starter/add-numbers prompt), Activity, "Other kits" (the main kit is never listed twice); right rail: Finish-your-kit checklist (also shown under the kit on mobile), Inquiries summary (Pro, or anyone with inquiries) → `/pipeline`, Opportunities (campaigns matching niches), Connections, Plan, referral card. The deal pipeline (brand inquiries from the Pro-only kit contact form) is its own tab, `/pipeline` (`app/(workspace)/pipeline`, list with stage filters or drag-and-drop board, `DealPipeline`); old `/dashboard#inbox` links redirect there and the inquiry email CTA opens it. Kit views and inquiries load on mount, in parallel. Every authenticated creator gets the dashboard — the Free plan includes one kit; live platform stats are only fetched for paid tiers (`isPaidTier`), and metric tiles fall back to the creator's self-reported manual stats (labelled) when a platform isn't connected. All connect/payment results render as top `Notice` banners.

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
- Onboarding flow (`app/onboarding/page.tsx`): role picker → **creators**: You (name, username suggested via `/api/me/username-suggest` + live check, niches) → Connect (optional, IG requirements inline) → "Your kit is live" (kit auto-created at `/kit/<username>`, copy link, editor, invite link). Live phone preview (`KitPreview`) beside it; never shows sample numbers. **No plan step**: everyone starts Free/comped. **Brands**: one screen (company, industry, budget) → `/brand`

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
- **Workspace routes (one per tab):** `/dashboard` (creator home) · `/discover` (brand home) · `/campaigns` · `/messages` · `/referrals` · `/settings` · `/pricing`. `/campaigns`, `/messages`, `/settings` are server pages that render the creator or brand view (`lib/workspace-user.ts`). Old URLs (`/social/*`, `/brand/*`, `/profile`) 301 in `next.config.ts`. New top-level routes must also go in `RESERVED_USERNAMES`.
- **Workspace routes live in the `app/(workspace)/` route group** (URLs unchanged: /dashboard, /discover, /campaigns, /messages, /referrals, /settings, /pricing, /admin). Its `layout.tsx` reads the viewer once on the server (`getWorkspaceViewer`, React `cache`d so pages calling `requireWorkspaceUser` share the lookup) and renders `WorkspaceFrame` = AppNav + WorkspaceSidebar. **Layouts stay mounted across client navigation, so a tab click re-renders only the page** — never render AppNav/WorkspaceSidebar from a page. Signed-out visitors (public /pricing, shared /campaigns/[id]) get no frame; `WorkspaceShell` adds the top bar itself then. `app/(workspace)/loading.tsx` shows inside the frame while a server page loads. Pages talk to the frame through context, not props: `useInboxBadge(n)` (Messages) and the `kitevo:avatar-updated` / `kitevo:profile-updated` window events (settings saves).
- **Every workspace page renders inside `WorkspaceShell`** (`app/components/workspace/WorkspaceShell.tsx` → `WorkspaceMain.tsx`: just the `<main>` content area with the width scale narrow/default/wide/full; `variant` is ignored) and starts with `PageHeader` (eyebrow · serif title · description · actions); cards use `Panel`. Don't hand-roll page wrappers.
- **Workspace layout = `width="wide"` + `grid gap-6 lg:grid-cols-3`**: main content `lg:col-span-2`, a right rail of `Panel`s (`aside.space-y-6`). Dashboard, Settings (creator + brand), Invite & earn, Campaigns (feed, manager, detail with a sticky rail) all follow it; Discover is a wide card grid, Messages is `full`. Rails reuse dashboard widgets (`ConnectionsPanel`, `PlanPanel`) and `app/(workspace)/settings/AccountPanels.tsx` (sign out + delete account).
- **Workspace UI kit** (`app/components/workspace/`): `Button`/`ButtonLink`/`IconButton` (`buttonClass` for raw `<a>`; variants primary/secondary/ghost/danger/danger-outline, sizes sm/md/lg — solid `primary` once per area), `Modal` (role=dialog, Esc, focus trap, focus return — use it for every dialog), `SectionTitle` (14px sentence-case section heading; `Panel` titles use it) and `Eyebrow` (11px uppercase — page eyebrow and metric labels only). Status colours via `Badge`; banners/alerts need `dark:` variants. Numbers and kit names use `font-display`.
- **Loading states** use the shimmer `Skeleton` from `app/components/Skeleton.tsx`, never `animate-pulse` grey slabs. Each skeleton mirrors its component's box model (`DashboardSkeleton`, `KitSpotlightSkeleton`, `MetricsSkeleton`, `PanelSkeleton`, `ListCardSkeleton`, `CreatorCardSkeleton`, `ConversationRowSkeleton`, `FieldSkeleton`) — when you change a component's layout, update its skeleton too.
- **Forms** (`ProfileForm`, brand settings): sections with a heading + one-line hint, labelled inputs, a footer save bar that tracks unsaved changes and disables Save when clean. Photo/logo uploads save immediately and are excluded from the dirty check.
- `AppNav`: logo + NavAvatar only — never page links. The workspace frame passes `avatarOnMobileOnly` (plus the known viewer, so NavAvatar skips its profile fetch): on desktop the account lives at the foot of the sidebar instead. **All in-app navigation is `WorkspaceSidebar`** (grouped left sidebar on desktop, 5-tab bottom bar on mobile). Creator: Home · Social (Campaigns, Messages, Pipeline) · Grow (Invite & earn) · account row. Brand: Discover · Campaigns · Inbox · Grow · account row. The sidebar body holds only daily tabs; account-level pages live in the **account row's menu** (avatar/logo, name, role → View my kit, Plan & billing, Settings, Admin*, dark mode toggle, log out), and the row highlights while you're on one of them. *Admin only for ADMIN_EMAILS (server viewer; `/api/me/admin` for legacy callers). Sidebar links show a `useLinkStatus` spinner from click until the page renders. Phones: bottom bar + top-right NavAvatar menu (Plan & billing included for creators). `/admin/*` and signed-in `/pricing` render inside `WorkspaceShell` too; brands hitting `/pricing` go to `/settings`. Pages pass `variant`; shared pages omit it and it reads `/api/me/profile`. Content wraps in `md:pl-56`
- `NavAvatar` popup: name, role, Dashboard, Settings (role-aware), theme toggle, logout
- Brand accounts show `companyName` + `logoUrl` in NavAvatar (not personal name/avatar)
- Avatar/logo upload fires `kitevo:avatar-updated` custom event → NavAvatar and the sidebar account row update instantly
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

### Product Plan (Phase 0) — see [PLAN.md](./PLAN.md)
The competitive/product strategy (Stan Store teardown, pricing, roadmap) now lives in `PLAN.md`. Phase 0 progress:
- ✅ Free-plan dashboard access (no more upgrade wall for free users; live stats stay Starter+)
- ✅ Manual stats end-to-end (`Kit.manualStats` → editor → API → public kit, "self-reported" label)
- ✅ Honest landing social proof (fictional testimonials replaced with product-outcome cards); claims synced to shipped features
- ✅ Prisma migrations — versioned baseline (`prisma/migrations/20261031000000_init`) + auto-apply on deploy (GitHub Action gated on tests + Vercel build). Prod baselined and verified live 2026-10-31: first Action run reported "No pending migrations"; Vercel build+migrate deploy passed. Required before commerce tables land.
- ✅ Token encryption at rest (IG/YT access + refresh tokens) — `lib/token-crypto.ts`; prod rollout = set `TOKEN_ENCRYPTION_KEYS` + run backfill (DEPLOY.md)
- ✅ Funnel analytics events (`lib/analytics.ts`, `scripts/funnel-report.ts`)
- ✅ Referral program with manual payouts (`lib/referrals.ts`, `/referrals`, `/admin/payouts`)
- ✅ Admin/ops (`/admin`, `/admin/users/[id]`, `/admin/payouts`) — see Key Technical Rules › Admin ops
- ⬜ Trials/coupons, custom domains

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
| `app/components/WorkspaceSidebar.tsx` | The only in-app navigation (creator + brand variants, mobile bottom bar) |
| `app/components/Badge.tsx` | Semantic badge/tag component |
| `app/components/ProfileForm.tsx` | Creator profile form — avatar upload, username check, bio, links, niches picker |
| `app/components/VerifiedBadge.tsx` | Verified tick: blue (creator_pro), gold (top_creator), purple (brand_verified) |
| `app/(workspace)/dashboard/WorkspaceWidgets.tsx` | Dashboard building blocks: KitSpotlight, SetupChecklist, OpportunitiesPanel, ConnectionsPanel, PlanPanel |
| `app/[username]/page.tsx` | Public profile — brand-aware (campaigns for brands, kits for creators) |
| `app/u/[username]/page.tsx` | Same, alternate route |
| `app/(workspace)/settings/CreatorSettings.tsx` / `BrandSettings.tsx` | `/settings` views per role |
| `app/(workspace)/settings/BrandPlanCard.tsx` | Brand Pro plan status + upgrade CTA (monthly/yearly checkout, manage billing) |
| `app/(workspace)/discover/page.tsx` | Creator discover (brand home) — Message gated by Brand Pro |
| `app/components/AvatarImg.tsx` | Avatar `<img>` with initials fallback on load error |
| `app/(workspace)/campaigns/[id]/page.tsx` | Campaign detail + ApplySection timeline (brand verified tick) |
| `app/(workspace)/campaigns/[id]/ApplySection.tsx` | Application timeline UI |
| `app/(workspace)/campaigns/CreatorCampaigns.tsx` / `BrandCampaigns.tsx` | `/campaigns` views: creator feed (brand tick + "Featured") / brand campaign manager |
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
- **Schema changes are versioned migrations** (`prisma/migrations`, baseline `20261031000000_init`), applied automatically on deploy: GitHub Action `.github/workflows/db-migrate.yml` (after `npm test`) and `scripts/vercel-build.cjs` before `next build`, both via `prisma migrate deploy`. Author new migrations locally with `prisma migrate dev`; never reach for `db push` against prod/staging
- **Supabase needs two connection strings**: `DATABASE_URL` = transaction pooler (:6543, `?pgbouncer=true`) for runtime, `DIRECT_URL` = session pooler (:5432) for `prisma migrate deploy` (and the same two values must exist as GitHub repo secrets for the Action). Never Supabase's "direct connection" — it is IPv6-only without the paid add-on. See DEPLOY.md step 2
- **New/foreign databases still need baselining before `migrate deploy`**: db built via the old `db push` flow (e.g. a staging DB cloned this way) has no `_prisma_migrations` history and fails closed with `P3005` until `db push` + `migrate resolve --applied <migration>` sync it. Prod was baselined 2026-10-31 (first Action run: "No pending migrations"). See DEPLOY.md step 2

---

## Deployment status (August 2026)

**Live at https://getkitevo.com.** Vercel Hobby, personal repo `S07K/kitevo`
(Hobby refuses private *org* repos — do not move it back). Supabase Postgres via
two connection strings, Resend email from `mail.getkitevo.com`, payments via Dodo
(Merchant of Record). Instagram insights and YouTube data both verified working in
production.

### Platform API verification
- **Google / YouTube (`youtube.readonly`): VERIFIED (done).** Consent screen is
  published and **In Production**, branding + domain verified, and the sensitive
  scope passed Google verification. No "unverified app" warning, no 100-user cap,
  refresh tokens are durable (the old 7-day Testing-mode expiry is gone). Submission
  record: `docs/google-oauth-verification.md`.
- **Meta Business Verification: VERIFIED (Aug 5 2026).** Done via the founder's
  **Udyam (MSME) registration** as "Kitevo" — Meta matched the public record
  automatically. Business name + address must stay consistent across Udyam, Meta
  Business Info, and the site.
- **Meta App Review: APPROVED (all four).** `instagram_basic`,
  `instagram_manage_insights`, `pages_show_list`, and `business_management` are all
  approved and the **app is in Live mode**, so any creator can connect Instagram with
  no tester allowlist. `pages_show_list` was rejected once (unclear screencast, not a
  policy issue) and approved on re-submit with a captioned demo showing the Page →
  Instagram flow. Submission record + per-permission writeups: `docs/meta-app-review.md`.
- **`business_management` and `pages_show_list` are both required — do not drop either.**
  `/me/accounts` needs `pages_show_list` to list the creator's Pages; `business_management`
  is what includes Business-Portfolio-owned Pages in that list. Dropping either makes the
  connect flow fail with `no_pages` ("No Facebook Page found"). Both verified empirically;
  see the comment in `app/api/instagram/connect/route.ts`.
- **Both integrations are fully public: YouTube and Instagram are verified and Live.**

Full setup and the reasoning behind each choice is in `DEPLOY.md`. Other open items:

- Platform access tokens are encrypted app-side (`lib/token-crypto.ts`) once
  `TOKEN_ENCRYPTION_KEYS` is set in production and the backfill has run (DEPLOY.md step 3).
- Rate limiting (`lib/rate-limit.ts`) covers all three unauthenticated email routes:
  signup, forgot-password, resend-verification. Per-IP is in memory, so it is
  process-local on serverless and only slows a single source; the durable protection
  is the per-email cooldown on the two resend paths, derived from the stored token
  expiry. `vitest.setup.ts` clears windows between tests. Upgrade path if abuse ever
  justifies it: a Redis-backed counter with the same shape.
- Supabase free projects pause after ~7 days of inactivity; a paused DB means kit
  links error for visitors.

## Git / Deploy

- **`RELEASE.md` is the owner's post-merge checklist.** Whenever a change needs an env var, migration, webhook setting, backfill script or manual step at deploy time, add it to RELEASE.md in the same branch.

- Repo: `https://github.com/S07K/kitevo.git` (personal, private — Vercel Hobby refuses private *org* repos)
- Branch: `main`
- All work committed and pushed to main
