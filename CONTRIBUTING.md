# Contributing to Kitevo

Thanks for your interest in improving Kitevo. This guide explains how to set up
the project, the conventions we follow and how changes get reviewed and merged.

By participating you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
Kitevo is licensed under [AGPL-3.0-only](./LICENSE); by submitting a contribution
you agree that it is licensed under the same terms.

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Development setup](#development-setup)
- [Workflow](#workflow)
- [Branch naming](#branch-naming)
- [Commit messages](#commit-messages)
- [Pull requests and review](#pull-requests-and-review)
- [Code conventions](#code-conventions)
- [Database changes](#database-changes)
- [Tests](#tests)

## Ways to contribute

- **Report bugs** with the [bug report form](https://github.com/S07K/kitevo/issues/new/choose).
- **Suggest features** with the feature request form, or start a
  [discussion](https://github.com/S07K/kitevo/discussions) for open-ended ideas.
- **Improve docs**: README, `.env.example` comments, `DEPLOY.md`, `docs/`.
- **Send code**: bug fixes, tests and features. For anything larger than a small
  fix, open an issue first so we can agree on the approach before you invest time.

Security issues are **not** reported through issues: see [SECURITY.md](./SECURITY.md).

## Development setup

Prerequisites:

- **Node.js 20.9+** (CI uses Node 20) and npm
- **PostgreSQL** running locally (Homebrew, Docker or Postgres.app)
- Git

```bash
# 1. Fork on GitHub, then clone your fork
git clone https://github.com/<your-username>/kitevo.git
cd kitevo
git remote add upstream https://github.com/S07K/kitevo.git

# 2. Install dependencies (postinstall runs `prisma generate`)
npm install

# 3. Configure environment
cp .env.example .env
#   Point DATABASE_URL and DIRECT_URL at your LOCAL database, e.g.
#   DATABASE_URL="postgresql://localhost:5432/kitevo"
#   DIRECT_URL="postgresql://localhost:5432/kitevo"
#   and set NEXTAUTH_SECRET (openssl rand -base64 32).

# 4. Create the database and apply migrations
createdb kitevo
npx prisma migrate deploy

# 5. Run the app (predev re-applies pending migrations on localhost databases)
npm run dev
```

Open <http://localhost:3000>. Most third-party integrations (Instagram, YouTube,
payments, email, AI, Supabase Storage, custom domains) are optional for local work;
`.env.example` explains what each variable unlocks and what happens when it is unset.

## Workflow

1. Sync your fork: `git fetch upstream && git checkout main && git merge upstream/main`.
2. Create a branch from `main` (see [naming](#branch-naming)).
3. Make focused changes with tests.
4. Run the checks locally:

   ```bash
   npx tsc --noEmit   # typecheck
   npm test           # Vitest unit + API route tests
   npm run lint       # ESLint
   npm run build      # production build
   ```

5. Push to your fork and open a pull request against `S07K/kitevo:main`.

## Branch naming

Use a type prefix and a short kebab-case description, matching the existing branches:

| Prefix | For | Example |
| --- | --- | --- |
| `feat/` | New features | `feat/kit-book-a-call` |
| `fix/` | Bug fixes | `fix/not-found-status` |
| `chore/` | Tooling, dependencies, housekeeping | `chore/middleware-to-proxy` |
| `docs/` | Documentation only | `docs/plan-status-rollback` |
| `perf/` | Performance work | `perf/launch-indexes` |
| `refactor/` | Code changes with no behaviour change | `refactor/payments-provider` |
| `test/` | Tests only | `test/deal-payments` |

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary in the imperative>

<optional body: what and why, wrapped at ~72 characters>

<optional footer: Closes #123, BREAKING CHANGE: ...>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`. Examples:

```
feat(kit): add book-a-call button under the profile bio
fix(payments): treat unknown Dodo statuses as inactive
docs: explain the two Supabase connection strings
```

Pull requests are squash-merged, so the **PR title** becomes the commit on `main`
and must follow the same format.

## Pull requests and review

- Fill in the pull request template: summary, linked issue, type of change, how you
  tested it and screenshots for UI changes (light and dark mode, phone and desktop).
- Keep PRs small and focused; split unrelated changes.
- CI must pass (typecheck, tests and build).
- `main` is protected. **Every PR needs an approving review from the code owner
  ([@S07K](https://github.com/S07K))** before it can be merged; new pushes dismiss
  stale approvals and all review threads must be resolved.
- The maintainer merges with **squash merge**. Branches are deleted after merge.

## Code conventions

[CLAUDE.md](./CLAUDE.md) is the detailed architecture guide (it is also what AI
coding agents read). Highlights:

- **TypeScript everywhere**, strict mode, `@/` path alias for imports from the root.
- **Payments go through `lib/payments`**, never a provider SDK directly. Creator-owned
  payment clients (`lib/razorpay.ts`, `lib/stripe-creator.ts`, `lib/paypal-creator.ts`)
  are small fetch-based clients.
- **Kit honesty rules**: never render fabricated stats; self-reported numbers are always
  labelled as such.
- **Tailwind CSS v4** with theme tokens from `app/globals.css` (no hard-coded surface
  colours). Kit pages use container queries, not viewport breakpoints.
- **Never run `shadcn init`**: it rewrites `globals.css`. Add registry components with
  `npx shadcn@latest add <item> --dry-run` first.
- **User-supplied strings in emails** go through `escapeHtml`.
- New routes where one account can reach another must call `activeGuard` and
  `blockedGuard` (see `lib/safety.ts`).
- New top-level routes must be added to `RESERVED_USERNAMES` in `lib/username.ts`.
- New environment variables go in `.env.example` with a comment and placeholder value.

## Database changes

Schema changes ship as versioned Prisma migrations:

```bash
# edit prisma/schema.prisma, then, against your LOCAL database:
npx prisma migrate dev --name <short_change_name>
```

Commit the schema and the generated `prisma/migrations/<timestamp>_<name>/` together.

- Never use `prisma db push` against a shared or production database.
- Every migration must keep working with the previous deployment (migrations apply
  before the new build goes live). Add columns as nullable or with a `DEFAULT`; split
  drops, renames and type changes into expand and contract releases.
- See [DEPLOY.md §8a](./DEPLOY.md) for the rollback rules.

## Tests

- **Unit and API route tests** use [Vitest](https://vitest.dev) and live next to the
  code as `*.test.ts`. Run them with `npm test` (or `npm run test:watch`). They do not
  need a database: Prisma and providers are mocked.
- **End-to-end tests** use [Playwright](https://playwright.dev) in `e2e/`. Install
  browsers once with `npx playwright install`, then run `npm run test:e2e`
  (`test:e2e:headed` or `test:e2e:ui` to watch). They start `npm run dev`
  automatically and need a working local database.

Add or update tests for every behaviour change. Thanks for contributing!
