# Media Kit Pro — Remaining phases (end-to-end completion)

This doc lists what’s left so the app is **fully developed** and deployable: auth, persistence, real APIs, and onboarding. Phases 1–5 (and multi-kit + subscription tiers) are done. **Phase 6 (Auth), Phase 7 (Profile), Phase 8 (Kits in DB), and Phase 9 (Subscription tied to user) are done;** Phases 10–12 remain.

---

## Current state (what’s done)

- **UI:** Landing, pricing (Starter / Pro), dashboard, kit editor, public kit page, section visibility, multi-kit list.
- **Stripe:** Checkout (tier-based), subscription-status (with `allowedKits`, `tierId`), customer portal, webhook, upgrade-subscription API.
- **Auth (Phase 6 done):** NextAuth (Credentials), Prisma + SQLite, User model, sign up / login / logout, protected `/dashboard` and `/kit/edit`, checkout passes `client_reference_id` and `metadata.userId` for Phase 9.
- **Data:** Creator profile and kits are in DB; dashboard and public kit use APIs. Phase 7 and Phase 8 done.
- **Instagram:** Stats and “recent posts” are **mock** in `lib/platforms/instagram.ts`.

---

## Phase 6 — Auth & users ✅

**Goal:** Every visitor has an identity; subscription and data are tied to a user.

| Step | What to do |
|------|------------|
| 6.1 | Choose auth: **email + password** (e.g. NextAuth with Credentials) or **OAuth** (Google/GitHub via NextAuth). |
| 6.2 | Add **session**: cookie or JWT, read on API routes and in layout so you know “current user”. |
| 6.3 | **DB:** `users` table (e.g. `id`, `email`, `name`, `password_hash` or `oauth_id`, `created_at`). Use Prisma + SQLite/Postgres or your preferred stack. |
| 6.4 | **Routes:** Sign up, Login, Logout. Protect `/dashboard`, `/kit/edit`, `/pricing` (redirect to login if no session). |
| 6.5 | **Checkout:** Pass `user.id` or `user.email` into checkout session (e.g. `client_reference_id` or metadata) so you can link Stripe customer to user in Phase 9. |

**Outcome:** Logged-in user; dashboard and edit are behind auth; Stripe can be linked to user later.

---

## Phase 7 — Creator profile & persistence ✅

**Goal:** Creator’s name, username, bio, avatar, and links are stored per user and editable.

| Step | What to do |
|------|------------|
| 7.1 | **DB:** Creator profile per user (e.g. `user_id`, `name`, `username` unique, `bio`, `avatar_url`, `links` JSON). Or extend `users` with these columns. |
| 7.2 | **API:** `GET/PUT /api/me/profile` (or `/api/profile`) to read/update current user’s profile and links. |
| 7.3 | **Dashboard / Settings:** Form to edit name, username, bio, avatar, links. Save via API. |
| 7.4 | **Public kit page:** Resolve kit by slug → get kit’s `user_id` → load that user’s creator profile and links from DB (no more `MOCK_CREATOR` / `MOCK_LINKS` for real kits). |

**Outcome:** Each creator has a real profile; public kit can show it once kits are in DB (Phase 8).

---

## Phase 8 — Kits in DB (replace localStorage) ✅

**Goal:** Kits are stored server-side so they work across devices and for anyone viewing the public link.

| Step | What to do |
|------|------------|
| 8.1 | **DB:** `kits` table: `id`, `user_id`, `slug` (unique per user or global), `name`, `work_samples` JSON, `rates` JSON, `brands` JSON, `section_visibility` JSON, `created_at`, `updated_at`. |
| 8.2 | **API:** `GET /api/kits` (list current user’s kits), `GET /api/kits/[id]`, `POST /api/kits`, `PUT /api/kits/[id]`, `DELETE /api/kits/[id]`. Plus **public:** `GET /api/kits/by-slug/[slug]` (returns kit + creator profile for that user). |
| 8.3 | **Dashboard:** Load kits from `GET /api/kits` instead of `getAllKits()` from localStorage. Create/delete/update via API. |
| 8.4 | **Kit editor:** Load kit by id from API; save via `PUT /api/kits/[id]`. Remove dependency on `lib/kit-storage` for persisted data. |
| 8.5 | **Public kit page:** For `/kit/[slug]`, call `GET /api/kits/by-slug/[slug]` (or server component fetch). If found, render with kit content + creator profile from DB. If not found, 404. Remove client-side `getKitBySlug(slug)` from localStorage for “brand view”. |
| 8.6 | **Subscription limit:** Enforce `allowedKits` (from subscription-status) when creating a new kit (e.g. `POST /api/kits` checks user’s plan and current kit count). |

**Outcome:** Kits are per-user and persistent; public URL works for anyone; no localStorage for kit data.

---

## Phase 9 — Subscription tied to user ✅

**Goal:** Stripe customer and subscription state are linked to the logged-in user in your DB.

| Step | What to do |
|------|------------|
| 9.1 | **DB:** On `users`: `stripe_customer_id`, optionally `stripe_subscription_id` or last known price/status. |
| 9.2 | **Checkout:** Create checkout session with `client_reference_id: user.id` (or metadata). On success (webhook or redirect), set `stripe_customer_id` on user from session. |
| 9.3 | **Webhook:** On `customer.subscription.created/updated/deleted`, find user by `stripe_customer_id` and update subscription state (or just rely on Stripe as source of truth and query Stripe in subscription-status). |
| 9.4 | **subscription-status API:** Resolve user from session (not only from cookie). If no user, return `hasSubscription: false`. If user, use `stripe_customer_id` to list subscriptions and return `allowedKits`, `tierId`, etc. |
| 9.5 | **Cookie (optional):** Keep subscription cookie for “remember device” or migrate to session-only; ensure upgrade and portal still work with the same customer id. |

**Outcome:** Subscription is per user; multi-device and secure; portal/upgrade still work.

---

## Phase 10 — Instagram API integration

**Goal:** Real follower stats and “recent posts” from Instagram instead of mocks.

| Step | What to do |
|------|------------|
| 10.1 | **Meta Developer:** Create app, add Instagram Basic Display or Instagram Graph API (depending on use case). Get client id/secret; configure OAuth redirect. |
| 10.2 | **DB:** **Done.** `User` has `instagramUserId`, `instagramAccessToken`. |
| 10.3 | **OAuth flow:** “Connect Instagram” in dashboard → redirect to Meta → callback saves token for current user. |
| 10.4 | **API route:** **Done.** `GET /api/instagram/stats` and `GET /api/instagram/recent-posts` that use the current user’s token and call Meta’s API. |
| 10.5 | **Replace mocks:** **Done.** Dashboard, KitEditor, public kit use API; mock until token stored., fetch stats from your API (or server-side) instead of `getInstagramStats()`. In KitEditor, “Load Instagram posts” calls your API instead of `getInstagramRecentPosts()`. |
| 10.6 | **Token refresh:** Implement refresh when token expires (Basic Display or Graph API docs). |

**Outcome:** Live Instagram stats and real posts for work samples; no mock data for connected users.

---

## Phase 11 — Onboarding

**Goal:** New users get a clear path to first kit and (optionally) first connection.

| Step | What to do |
|------|------------|
| 11.1 | **Post-signup:** After first login, redirect to onboarding (e.g. `/onboarding` or dashboard with empty state). |
| 11.2 | **Steps (optional):** (1) Complete profile (name, username, bio, links). (2) Connect Instagram. (3) Create first kit (name + slug). (4) Subscribe (if you gate kit creation behind paywall). Order can vary. |
| 11.3 | **Dashboard empty state:** If user has no kits, show “Create your first kit” CTA and short explanation instead of empty list. |
| 11.4 | **Username uniqueness:** On profile save, check `username` is unique (for `/kit/[slug]` and future vanity URLs). |

**Outcome:** Clear first-time experience; no dead ends.

---

## Phase 12 — Polish & ship

**Goal:** Production-ready behavior and small wins before launch.

| Step | What to do |
|------|------------|
| 12.1 | **Public kit 404:** When slug not found in DB, return 404 (or “Kit not found”) instead of mock data. |
| 12.2 | **Loading & errors:** Skeleton or spinner on dashboard, kit editor, public kit; error messages for failed API calls. |
| 12.3 | **Kit analytics (optional):** Store view events (e.g. `kit_id`, `viewed_at`, referrer); show “Views” or “Recent views” in dashboard. |
| 12.4 | **Env & docs:** Ensure SETUP/README list all env vars (DB, auth, Stripe, Meta). Document how to run migrations and deploy. |
| 12.5 | **Deploy:** Deploy to Vercel (or chosen host) with DB (e.g. Vercel Postgres), env set, Stripe webhook URL pointing to production. |

**Outcome:** App is shippable for web; you can iterate on analytics and design after launch.

---

## Suggested order

1. **Phase 6** — Auth (so everything else is “per user”).
2. **Phase 7** — Creator profile in DB (needed for public kit and dashboard).
3. **Phase 8** — Kits in DB + public kit from API (core product works end-to-end).
4. **Phase 9** — Subscription tied to user (payments and limits correct).
5. **Phase 10** — Instagram API (real stats and posts).
6. **Phase 11** — Onboarding (better first run).
7. **Phase 12** — Polish and deploy.

You can do 10 and 11 in parallel or swap order (e.g. ship with mock Instagram and add real API later). Phase 8 is the biggest step: once it’s done, the app is “complete” for a first version; 9–12 make it production-ready and nicer.
