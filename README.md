# Media Kit Pro — Influencer Media Kit Builder

A professional pitch deck for creators. Turn your link-in-bio into a high-end agency portfolio with live engagement data, audience demographics, and growth charts.

## Features

- **Landing page** — Marketing site with high-end agency design
- **Pricing** — $15/month subscription via Stripe
- **Dashboard** — Creator control panel to manage media kit
- **Public media kit** — Link-in-bio style page with live stats, growth charts, demographics

## Stripe Setup

1. Create a [Stripe account](https://dashboard.stripe.com) and get your API keys.

2. Create a Product and Price in Stripe Dashboard:
   - Products → Add product
   - Name: "Media Kit Pro"
   - Price: $15/month, recurring
   - Copy the **Price ID** (starts with `price_`)

3. Copy `.env.example` to `.env.local` and fill in:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. For webhooks (subscription events), use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Copy the webhook signing secret to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build (Web)

```bash
npm run build
npm start
```

## Build (iOS / Android)

```bash
npm run build
npm run ios:build    # then: npm run ios
npm run android:build # then: npm run android
```

## Project Structure

- `app/` — Next.js App Router pages
- `app/api/` — Stripe API routes (checkout, webhook, subscription-status, portal)
- `app/components/` — Shared UI (AppNav, SubscribeButton)
- `app/kit/[username]/` — Public media kit (brand-facing)
- `lib/platforms/` — Social platform abstraction (Instagram only for now; add TikTok/YouTube here)
- `lib/` — Stripe client, subscription cookie, mock data
- `docs/` — [SETUP.md](docs/SETUP.md) (developer onboarding), [MEDIAKIT_PLAN.md](docs/MEDIAKIT_PLAN.md) (product plan; product name inside is Media Kit Pro)

**New developers:** See **[docs/SETUP.md](docs/SETUP.md)** for env setup, project layout, and how to add a new social platform.
