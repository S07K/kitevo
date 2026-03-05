# Test coverage: what’s covered and what’s not

This doc lists **pages**, **API routes**, and **user flows** and whether they have **Vitest** (unit/API) and/or **Playwright** (E2E) tests.

---

## Pages

| Page | E2E | Notes |
|------|-----|--------|
| `/` (landing) | ✅ | home.spec.ts: headline, Start Building, View Demo, nav |
| `/login` | ✅ | auth-flow: form, sign up link, redirect from protected |
| `/signup` | ✅ | signup.spec.ts + happy-path |
| `/pricing` | ✅ | pricing.spec.ts: plans (Starter/Pro) |
| `/dashboard` | ✅ | happy-path reaches it; no dedicated “dashboard content” spec |
| `/onboarding` | ✅ | happy-path: welcome, Go to Dashboard |
| `/kit/edit` | ❌ | Protected; no E2E (would need logged-in + kit id) |
| `/kit/[slug]` (public kit) | ✅ | public-kit.spec.ts: demo loads, unknown slug 404 |
| `/help/instagram` | ✅ | help.spec.ts: page loads |

---

## API routes (Vitest)

| Route | Covered | Notes |
|-------|---------|--------|
| `GET/PUT /api/me/profile` | ✅ | 401, 404, 409, 200 |
| `POST /api/me/onboarding-complete` | ✅ | 401, 200 |
| `GET/POST /api/kits` | ✅ | 401, 400, 403, 409, 200 |
| `GET/PUT/DELETE /api/kits/[id]` | ✅ | 401, 404, 200 |
| `GET /api/kits/by-slug/[slug]` | ✅ | 404, 200 |
| `POST /api/auth/signup` | ✅ | 400 (missing/short password), 409 (email exists), 200 |
| `POST /api/subscription-status` | ❌ | Uses Stripe + session; mock Stripe + prisma to add |
| `POST /api/create-checkout-session` | ❌ | Stripe; needs Stripe mock |
| `POST /api/create-portal-session` | ❌ | Stripe; needs Stripe mock |
| `POST /api/upgrade-subscription` | ❌ | Stripe; needs Stripe mock |
| `POST /api/webhook` | ❌ | Stripe webhook (signature + events); mock Stripe |
| `GET /api/instagram/connect` | ❌ | Redirect to Meta; can test 302 + redirect URL |
| `GET /api/instagram/callback` | ❌ | OAuth callback; state/token exchange; complex to unit test |
| `GET /api/instagram/status` | ✅ | 401, 200 { connected: true/false } |
| `GET /api/instagram/stats` | ❌ | Uses token + Meta API; mock fetch |
| `GET /api/instagram/recent-posts` | ❌ | Same as stats |

---

## User flows

| Flow | E2E | Notes |
|------|-----|--------|
| Landing → Pricing / Demo | ✅ | home.spec.ts |
| Sign up → Log in → Onboarding → Dashboard | ✅ | happy-path.spec.ts |
| Log in → Dashboard (returning user) | ❌ | Would need pre-seeded user or API login |
| Dashboard → Create kit (with subscription) | ❌ | Needs subscribed user; can add with test user later |
| Dashboard → Edit kit → Save | ❌ | Needs kit id; E2E possible with test data |
| Dashboard → Delete kit (with modal) | ❌ | E2E possible |
| Pricing → Subscribe (Stripe Checkout) | ❌ | **Stripe flow**: real checkout in E2E needs Stripe test mode + test card; or mock checkout URL |
| Dashboard → Manage subscription (Portal) | ❌ | Same as above |
| Dashboard → Connect Instagram | ❌ | **Instagram flow**: OAuth redirect to Meta; E2E would need test app or mock redirect |
| Public: open /kit/[slug] | ✅ | /kit/demo loads; unknown slug → 404 |
| Help: open /help/instagram | ✅ | Page loads with heading |

---

## Why some flows aren’t fully automated

- **Stripe (payment, portal, webhook)**  
  Real E2E needs Stripe test mode, test cards, and (for webhook) a public URL or tunnel. **Option:** Vitest with mocked `stripe` (e.g. `subscription-status`, `create-checkout-session`) to assert request handling and response shape; E2E with Stripe test keys in CI is possible but heavier.

- **Instagram (connect, callback, stats)**  
  Connect redirects to Meta; callback exchanges code for token. E2E would need a Meta test app and test user, or a mock OAuth server. **Option:** Vitest for `instagram/status` and for callback logic with mocked fetch/token exchange; full OAuth E2E is usually manual or mocked.

---

## Summary

- **Fully covered:** Landing, login, signup, pricing, onboarding → dashboard, profile/kits/onboarding-complete/by-slug APIs, subscription cookie.
- **Added:** Public kit page E2E, help/instagram E2E, signup API Vitest, Instagram status API Vitest.
- **Not covered (candidates for later):** Subscription-status + Stripe routes (with Stripe mock), Instagram connect/callback/stats (mocked Meta), E2E “create kit” / “delete kit” with logged-in user, E2E Stripe checkout with test keys.
