# Fix Prisma P3009 / P3018 (failed migration) on production

You will see one of these in Vercel (or CI) during `prisma migrate deploy`:

| Code | Meaning |
|------|--------|
| **P3009** | A migration was **recorded as failed** earlier. Prisma blocks all newer migrations until you fix history. |
| **P3018** | A migration **just failed while applying** (SQL error, timeout, Neon pooler drop). Same recovery idea: fix DB state, then `migrate resolve`. |

Until the failed migration is **resolved**, deploys keep failing.

**Use the exact migration name from your log** (the folder name under `prisma/migrations/`, without a path). In this repo the onboarding migration is:

`20260304150000_add_onboarding_completed_at`

If your log shows a different name, use that name in every `migrate resolve` command below.

---

## Onboarding migration (`20260304150000_add_onboarding_completed_at`)

Prisma stores a **failed** record in `_prisma_migrations` (P3009) or failed mid-apply (P3018). Until you **resolve** it, `prisma migrate deploy` will not apply **any newer** migrations.

The migration only does:

```sql
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
```

---

## 1. Check if the column already exists

In **Neon** (or any Postgres) **SQL Editor**, or `psql`:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'User'
  AND column_name = 'onboardingCompletedAt';
```

- **Row returned** → the change is already in the DB (common if SQL ran but Prisma/connection errored afterward, or you see P3018 with **“column already exists”**). Go to **step A**.
- **No row** → the migration never committed. Go to **step B**.

**Neon tip:** For one-off `migrate deploy` / `migrate resolve` from your laptop, using the **non-pooler** (“direct”) connection string can avoid flaky failures during DDL. The pooler URL in Vercel is fine for the app at runtime.

---

## Step A — Column exists (most common after a flaky deploy)

Mark the migration as **successfully applied** (does not re-run SQL):

```bash
DATABASE_URL="postgresql://YOUR_PRODUCTION_URL" \
  npx prisma migrate resolve --applied 20260304150000_add_onboarding_completed_at
```

Then deploy again (or run):

```bash
DATABASE_URL="postgresql://YOUR_PRODUCTION_URL" npx prisma migrate deploy
```

That should apply any **later** migrations (`instagram` fields, `KitView`, `appearance`, etc.) if they were pending.

---

## Step B — Column missing

Apply the SQL once (same as the migration file), then mark applied:

```sql
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
```

Then:

```bash
DATABASE_URL="postgresql://YOUR_PRODUCTION_URL" \
  npx prisma migrate resolve --applied 20260304150000_add_onboarding_completed_at
```

```bash
DATABASE_URL="postgresql://YOUR_PRODUCTION_URL" npx prisma migrate deploy
```

If `ADD COLUMN` errors with **“column already exists”**, use **step A** instead.

---

## Step C — You are sure nothing was applied (rare)

Tell Prisma to treat the migration as rolled back, then redeploy so it runs again:

```bash
DATABASE_URL="postgresql://YOUR_PRODUCTION_URL" \
  npx prisma migrate resolve --rolled-back 20260304150000_add_onboarding_completed_at
```

```bash
DATABASE_URL="postgresql://YOUR_PRODUCTION_URL" npx prisma migrate deploy
```

Only use **C** if the column does **not** exist and you want Prisma to **re-execute** that migration.

---

## After repair

- Redeploy on Vercel (or let the next build run `migrate deploy`).
- Official docs: [Resolve migration issues in production](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
