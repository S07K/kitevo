# Pricing & checkout flow

## Current behavior

### 1. Who can open pricing?

- **Anyone.** The pricing page (`/pricing`) is **not** protected. Logged-in and logged-out users can open it.

### 2. Who can start checkout?

- **Anyone.** `POST /api/create-checkout-session` does **not** require auth.
  - If **logged in:** the API uses the session and sends `client_reference_id` and `metadata.userId` so Stripe can link the customer to your user after payment.
  - If **not logged in:** the API uses the `email` from the request body (from the pricing form / prompt). No user is linked until they log in and hit the success URL with `session_id` (see below).

### 3. After payment (Stripe success URL)

- Stripe always redirects to: **`/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`**.

So:

- **Logged-in user:**  
  They land on dashboard with `session_id` in the URL. The dashboard calls `POST /api/subscription-status` with `session_id`; the API exchanges it with Stripe, links `stripeCustomerId` to the user, and returns subscription info. Flow is correct.

- **Not logged-in user (guest checkout):**  
  1. Stripe redirects to `/dashboard?success=true&session_id=cs_xxx`.  
  2. Middleware protects `/dashboard`, so the user is redirected to **login** (e.g. `/login?callbackUrl=/dashboard%3Fsuccess%3Dtrue%26session_id%3Dcs_xxx` if the middleware passes the full URL as `callbackUrl`).  
  3. User signs up or logs in.  
  4. After login, they are redirected to the **callbackUrl**, i.e. back to `/dashboard?success=true&session_id=cs_xxx`.  
  5. Dashboard loads, calls subscription-status with `session_id`, and the API links the Stripe customer to the **now-logged-in** user.

So: **guest checkout does not redirect “to login after payment” in a bad way** — they are sent to login because dashboard is protected, and **if** the login redirect preserves the full callback URL (including `success` and `session_id`), then after login they land on dashboard and the subscription is linked correctly. If your middleware or NextAuth config does **not** preserve query params in `callbackUrl`, then the guest pays but loses `session_id` and the subscription is never linked to their account until they use “Manage subscription” or you fix the redirect.

### 4. Can a logged-in user checkout again?

- **Yes.** There is no check on the pricing page or in create-checkout-session that blocks already-subscribed users. So:
  - A logged-in user can open pricing and click “Continue with Starter” or “Continue with Pro” again.
  - Stripe will create a new checkout session. Whether that becomes a second subscription or an upgrade depends on your Stripe product/setup.
  - The app does **not** show “You’re already subscribed” or “Manage subscription” on the pricing page, and it does **not** redirect subscribed users away from pricing.

---

## Summary

| Scenario | What happens |
|----------|----------------|
| **Guest:** pricing → checkout → pay | Redirect to `/dashboard?...&session_id=...` → middleware → **redirect to login**. After login, if callbackUrl has the full dashboard URL with `session_id`, they land on dashboard and subscription is linked. |
| **Logged-in:** pricing → checkout → pay | Redirect to dashboard with `session_id` → subscription-status links Stripe customer to user. |
| **Logged-in, already subscribed:** pricing → checkout again | Allowed. No “already subscribed” guard; they can start another checkout. |

---

## Optional improvements

1. **Guest checkout:** Ensure the middleware (or NextAuth config) passes the **full** original URL (including `?success=true&session_id=...`) as `callbackUrl` when redirecting unauthenticated users to login, so the subscription is always linked after they sign up / log in.
2. **Logged-in + already subscribed:** On pricing, either redirect them to dashboard (or a “Manage subscription” page) or show a message like “You’re already subscribed” and a link to manage subscription instead of “Continue with Starter/Pro” again.
