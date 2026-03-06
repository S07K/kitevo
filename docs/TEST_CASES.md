# Media Kit Pro — Unit, API & E2E test cases

- **Unit/API:** Vitest (fast, no browser).
- **E2E (browser):** Playwright — you can run tests **live in the browser**.

## How to run

### Unit & API tests (Vitest)

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

### E2E tests (Playwright) — see automation in the browser

```bash
# With browser window visible (watch the tests run)
npm run test:e2e:headed

# Interactive UI: pick tests, run, watch in browser, time travel
npm run test:e2e:ui

# Headless (CI-style, no window)
npm run test:e2e
```

**First time:** Ensure the app is running or let Playwright start it (`npm run test:e2e` starts the dev server automatically). For **headed** or **UI** mode, you can start the app yourself in another terminal (`npm run dev`) then run `npm run test:e2e:headed` or `npm run test:e2e:ui` — the config will reuse the existing server.

**Tip:** Use `npm run test:e2e:ui` to open the Playwright UI: run one test or all, see the browser, and step through failures.

---

## Test file index

| File | Suite | Tests |
|------|--------|-------|
| `lib/subscription-cookie.test.ts` | subscription-cookie | 6 |
| `app/api/me/profile/route.test.ts` | GET/PUT profile | 6 |
| `app/api/me/onboarding-complete/route.test.ts` | POST onboarding-complete | 2 |
| `app/api/kits/route.test.ts` | GET/POST kits | 8 |
| `app/api/kits/[id]/route.test.ts` | GET/PUT/DELETE kit by id | 9 |
| `app/api/kits/by-slug/[slug]/route.test.ts` | GET public kit by slug | 2 |
| `app/api/auth/signup/route.test.ts` | POST signup | 4 |
| `app/api/instagram/status/route.test.ts` | GET Instagram status | 3 |
| `app/api/instagram/disconnect/route.test.ts` | POST Instagram disconnect | 2 |
| `app/api/create-checkout-session/route.test.ts` | POST create-checkout (already subscribed guard) | 3 |

**Total: 45 tests** across 10 files.

---

## 1. `lib/subscription-cookie` (unit)

| # | Test | Description |
|---|------|--------------|
| 1 | `setSubscriptionCookie` returns Set-Cookie header containing customer id and signature | Cookie string includes name, Path, HttpOnly, SameSite, Max-Age |
| 2 | `getSubscriptionCustomerId` returns null when cookie header is null | No header → null |
| 3 | `getSubscriptionCustomerId` returns null when header does not contain subscription cookie | Other cookies only → null |
| 4 | `getSubscriptionCustomerId` returns customer id when cookie is valid (round-trip) | setSubscriptionCookie → getSubscriptionCustomerId returns same id |
| 5 | `getSubscriptionCustomerId` returns null when cookie value is tampered | Tampered signature → null |
| 6 | `clearSubscriptionCookie` returns Set-Cookie with Max-Age=0 | Clearing cookie string |

---

## 2. `GET /api/me/profile` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 404 when user is not found | Session exists but user missing in DB |
| 3 | Returns 200 with profile and onboardingCompletedAt when user exists | Full profile + links + onboardingCompletedAt |

---

## 3. `PUT /api/me/profile` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 409 when username is already taken | Another user has that username |
| 3 | Returns 200 and updated profile when update succeeds | Name, username, bio, links updated |

---

## 4. `POST /api/me/onboarding-complete` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 200 and sets onboarding completed when session exists | user.update called with onboardingCompletedAt |

---

## 5. `GET /api/kits` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 200 with empty list when user has no kits | [] |
| 3 | Returns 200 with kit list when user has kits | Array of kits with id, slug, name, etc. |

---

## 6. `POST /api/kits` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 400 when slug is missing | Body without slug → Slug is required |
| 3 | Returns 403 when user is at kit limit | allowedKits reached → Kit limit reached |
| 4 | Returns 409 when slug is already taken | Slug exists → This URL slug is already taken |
| 5 | Returns 200 and kit when create succeeds | New kit created, response has id, slug, name |

---

## 7. `GET /api/kits/[id]` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 404 when kit not found or not owner | findFirst returns null |
| 3 | Returns 200 with kit when owner | Kit JSON with id, slug, name |

---

## 8. `PUT /api/kits/[id]` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 404 when kit not found or not owner | findFirst returns null |
| 3 | Returns 200 with updated kit when update succeeds | name (or other fields) updated |

---

## 9. `DELETE /api/kits/[id]` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthenticated → Unauthorized |
| 2 | Returns 404 when kit not found or not owner | findFirst returns null |
| 3 | Returns 200 and deletes when owner | prisma.kit.delete called |

---

## 10. `GET /api/kits/by-slug/[slug]` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 404 when slug not found | Kit not found |
| 2 | Returns 200 with kit and creator when slug exists | kit + creator (name, username, links) |

---

## 11. `POST /api/auth/signup` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 400 when email or password missing | Email and password are required |
| 2 | Returns 400 when password &lt; 8 characters | Password must be at least 8 characters |
| 3 | Returns 409 when email already exists | An account with this email already exists |
| 4 | Returns 200 and user when signup succeeds | id, email, name; prisma.user.create called |

---

## 12. `GET /api/instagram/status` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthorized |
| 2 | Returns 200 with connected: false when no Instagram | user.instagramUserId null |
| 3 | Returns 200 with connected: true when user has Instagram | instagramUserId set |

---

## 13. `POST /api/instagram/disconnect` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 401 when there is no session | Unauthorized; update not called |
| 2 | Returns 200 and clears Instagram fields for current user when session exists | Sets instagramUserId and instagramAccessToken to null |

---

## 14. `POST /api/create-checkout-session` (API)

| # | Test | Description |
|---|------|--------------|
| 1 | Returns 409 when logged-in user already has active subscription | Error: manage from dashboard |
| 2 | Returns 200 when logged in but not subscribed (allowedKits 0) | Returns checkout url |
| 3 | Returns 200 when not logged in (guest checkout) | Returns checkout url |

---

## Coverage scope

- **Unit:** Subscription cookie signing/verification (no DB).
- **API (mocked):** Profile, onboarding-complete, kits list/create/read/update/delete, by-slug. Auth and Prisma are mocked so tests run without a real DB or Stripe.

---

## E2E tests (Playwright) — run in browser

| File | Suite | Tests |
|------|--------|-------|
| `e2e/home.spec.ts` | Home / Landing | 4 |
| `e2e/auth-flow.spec.ts` | Auth flow | 4 |
| `e2e/pricing.spec.ts` | Pricing | 1 |
| `e2e/signup.spec.ts` | Signup | 2 |
| `e2e/happy-path.spec.ts` | Happy path | 1 |
| `e2e/public-kit.spec.ts` | Public kit page | 2 |
| `e2e/help.spec.ts` | Help (Instagram) | 1 |
| `e2e/dashboard-instagram.spec.ts` | Dashboard Instagram connect/disconnect | 2 |

**Total: 17 E2E tests.** Run with **browser visible**: `npm run test:e2e:headed` or `npm run test:e2e:ui`.

### E2E test list

- **Home:** Landing loads and headline visible; Start Building → dashboard/login; View Demo → /kit/demo; nav has Pricing, Get Started.
- **Auth:** Login page loads with form; Sign up link → signup; /dashboard and /onboarding redirect to login when not logged in.
- **Pricing:** Page loads and shows plans (Starter/Pro); when subscription-status returns already subscribed, shows “You’re already subscribed” and “Manage subscription” (E2E with mocked API).
- **Signup:** Signup page loads with form; Log in link → login.
- **Happy path:** New user signs up (unique email) → logs in → sees onboarding → clicks “Go to Dashboard” → lands on dashboard.
- **Dashboard Instagram:** When not connected, dashboard shows “Connect Instagram”; when status is mocked as connected, shows “Connected” and “Disconnect”, and clicking Disconnect (with disconnect API mocked) shows “Connect Instagram” again.

---

Not yet covered: see **docs/TEST_COVERAGE_GAPS.md** (Stripe flows, Instagram OAuth, E2E create kit / checkout).
