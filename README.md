# Kitevo — Creator Media Kit Builder

A professional media kit platform for creators. Turn your social stats into a high-end, shareable page with live Instagram and YouTube data, audience demographics, and growth charts — built to send to brands.

## What's built

### Auth & accounts
- Email/password signup with email verification
- Google SSO (OAuth)
- Forgot password / reset password flow
- Onboarding flow: profile → connect platforms → choose plan → create kit

### Creator dashboard
- Multi-kit management (create, rename slug, delete, password-protect)
- Integrations panel: connect/disconnect Instagram and YouTube
- Kit editor: brand kit styles, rates, brand partners, section visibility toggles
- Analytics: kit views over time, referrer breakdown
- Inquiry inbox (Pro): manage brand inquiries with status pipeline

### Kit page (public, brand-facing)
- Hero card with avatar, name, bio
- **Instagram section**: live followers, engagement rate, post count + 9:16 Reels-style post grid (clickable, opens stats modal)
- **YouTube section**: live subscribers, total views, video count + 16:9 video grid (clickable, plays inline)
- Brands I've worked with chips
- Rates card with optional CTA
- Audience demographics and follower growth chart
- Password protection option
- Theme system: 2 starter styles + 5 Pro Brand Kit Vibes (Editorial, Studio, Bloom, Electric, Noir)

### Integrations
- **Instagram** (Meta Graph API) — Business/Creator accounts; fetches followers, engagement, demographics, recent posts with full engagement metrics
- **YouTube** (Data API v3) — OAuth via Google; fetches channel stats + 6 recent videos with view/like counts; token auto-refresh

### Subscriptions & payments
- Stripe Checkout + webhook for subscription lifecycle
- Starter plan (1 kit) and Pro plan (multiple kits, brand kit vibes, inquiry management)
- Stripe Customer Portal for plan management

## Tech stack

- **Framework**: Next.js 15 App Router + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (credentials + Google provider)
- **Payments**: Stripe
- **Email**: Resend

## Local development

```bash
npm install
cp .env.example .env.local  # fill in all values (see below)
DATABASE_URL="postgresql://..." npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user@localhost:5432/kitevo

# Auth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Google (OAuth + YouTube)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Instagram (Meta Graph API)
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@yourdomain.com

# Stripe price IDs (from Stripe dashboard)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

## Stripe setup

1. Create products in [Stripe dashboard](https://dashboard.stripe.com): Starter ($9/mo) and Pro ($29/mo)
2. Copy price IDs to `.env.local`
3. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

## Google / YouTube setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **YouTube Data API v3**
3. Create OAuth 2.0 credentials, add authorized redirect URI:
   `http://localhost:3000/api/youtube/callback`
4. Same client ID/secret is used for Google SSO — no separate credentials needed

## Instagram setup

1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com)
2. Add Instagram Graph API product
3. Add redirect URI: `http://localhost:3000/api/instagram/callback`
4. Requires a Facebook Page linked to an Instagram Business or Creator account

## Project structure

```
app/
  api/           — All API routes (auth, kits, instagram, youtube, stripe, inquiries)
  dashboard/     — Creator dashboard + kit editor
  kit/[username] — Public kit page (server + client components)
  onboarding/    — 4-step new user setup flow
  components/    — Shared UI components
lib/
  platforms/     — Social platform abstraction layer
  instagram-api.ts
  youtube-api.ts
  kit-storage.ts
  kit-appearance.ts
  mock-data.ts
prisma/
  schema.prisma  — DB schema (User, Kit, KitView, Inquiry, Account)
```

## Roadmap (pre-launch)

**Phase 2 — Reliability**
- [ ] Instagram token auto-refresh (60-day expiry)
- [ ] Graceful API error handling on kit page
- [ ] Rate limit handling for IG/YouTube quota

**Phase 3 — Growth / Monetization**
- [ ] Pricing page → Stripe checkout wired
- [ ] Inquiry inbox UI in dashboard
- [ ] Free vs Pro limits enforced
- [ ] Kit analytics visible to owner

**Phase 4 — Launch**
- [ ] OG/SEO metadata per kit (generateMetadata)
- [ ] Supabase migration
- [ ] Vercel deploy
- [ ] Landing page polish
