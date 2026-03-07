# Launch checklist — Media Kit Pro

Use this when deploying to production. Full details: [SETUP.md](./SETUP.md) §2 (env) and §5 (Vercel).

---

## Before you start

- [ ] Code is pushed to GitHub (or your Git host).
- [ ] You have a **Stripe** account and a **production** Stripe key (or use test keys first).
- [ ] (Optional) **Meta app** for Instagram: create at [developers.facebook.com](https://developers.facebook.com/apps/).

---

## 1. Vercel — create project

- [ ] Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
- [ ] **Import** your Git repository (e.g. `me-talk`).
- [ ] Framework: **Next.js** (auto-detected). Leave Build Command as is (project uses `vercel.json` to run Prisma + build).
- [ ] Click **Deploy** once to get a URL (e.g. `me-talk-xxx.vercel.app`). You’ll add env and DB next.

---

## 2. Production database

- [ ] Create a **Postgres** database:
  - **Vercel Postgres:** Project → Storage → Create Database → Postgres.
  - Or **Neon** / **Supabase** / any Postgres — copy the connection string.
- [ ] In Vercel → **Project → Settings → Environment Variables**, add:
  - `DATABASE_URL` = your Postgres URL (e.g. `postgresql://...`).
  - Apply to **Production** (and Preview if you want).

---

## 3. Environment variables (Vercel)

In **Settings → Environment Variables**, add these for **Production**:

| Variable | Example / note |
|----------|----------------|
| `DATABASE_URL` | Postgres URL (from step 2) |
| `NEXTAUTH_SECRET` | Random 32+ chars (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL, e.g. `https://me-talk-xxx.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` |
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...` for testing) |
| `STRIPE_WEBHOOK_SECRET` | Set after step 5 (webhook) |
| `STRIPE_PRICE_ID_STARTER` | Stripe Price ID for Starter plan |
| `STRIPE_PRICE_ID_PRO` | Stripe Price ID for Pro plan |
| `SUBSCRIPTION_COOKIE_SECRET` | Random 32+ chars |
| `META_APP_ID` | (Optional) Facebook App ID for Instagram |
| `META_APP_SECRET` | (Optional) Facebook App secret |

- [ ] All variables above are set.

---

## 4. Redeploy (run migrations)

- [ ] **Redeploy** the project (Deployments → ⋮ → Redeploy, or push a commit).
- [ ] The build runs `prisma generate` and `prisma migrate deploy`, so tables are created on first deploy.
- [ ] Check the build log for success; open your app URL and confirm the site loads.

---

## 5. Stripe webhook

- [ ] **Stripe Dashboard** → [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
- [ ] **Endpoint URL:** `https://<your-vercel-url>/api/webhook` (e.g. `https://me-talk-xxx.vercel.app/api/webhook`).
- [ ] **Events:** select `checkout.session.completed` (and optionally `customer.subscription.updated`, `customer.subscription.deleted`).
- [ ] Copy the **Signing secret** (`whsec_...`).
- [ ] In Vercel → **Environment Variables**, set `STRIPE_WEBHOOK_SECRET` to that value.
- [ ] **Redeploy** again so the new secret is used.

---

## 6. Smoke test

- [ ] Open your app URL → landing page loads.
- [ ] **Sign up** with a new email → onboarding → dashboard.
- [ ] **Pricing** → subscribe (use Stripe test card `4242 4242 4242 4242` if in test mode).
- [ ] Create a **kit** → edit → publish; open the public **kit URL** and confirm it loads.
- [ ] (If Instagram is configured) **Connect Instagram** from dashboard.

---

## 7. Optional after launch

- [ ] **Custom domain:** Vercel → Settings → Domains → Add.
- [ ] **Instagram redirect:** In Meta App → Facebook Login settings, add `https://<your-domain>/api/instagram/callback` to Valid OAuth Redirect URIs.

---

You’re live when steps 1–6 are done and the smoke test passes.

---

## If the deployment fails

- **Failure after “Running TypeScript” or “Generating static pages”** — Usually the build is hitting the database without `DATABASE_URL` set. Fix: add a Postgres database and set `DATABASE_URL` in Vercel (step 2) **before** deploying (or before your first redeploy). The app is now resilient for demo kit slugs when the DB is missing, but `prisma migrate deploy` in the build still needs `DATABASE_URL`.
- **Failure at “prisma migrate deploy”** — Set `DATABASE_URL` in Vercel to a valid Postgres URL and redeploy.
- **Full error** — In Vercel, open the failed deployment → scroll to the **bottom** of the Build Logs to see the exact error line.
