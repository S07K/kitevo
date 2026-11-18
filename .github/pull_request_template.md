## Summary

<!-- What does this PR change, and why? Keep it to a few sentences. -->

## Linked issue

<!-- e.g. Closes #123. Open an issue first for anything larger than a small fix. -->

Closes #

## Type of change

- [ ] Bug fix (`fix/…`)
- [ ] New feature (`feat/…`)
- [ ] Refactor / performance (`refactor/…`, `perf/…`)
- [ ] Documentation (`docs/…`)
- [ ] Chore / tooling / dependencies (`chore/…`)
- [ ] Breaking change (existing behaviour, data or API changes)

## How was this tested?

<!-- Commands you ran and what you checked by hand. -->

- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] Added or updated unit tests (Vitest) for the change
- [ ] Ran the relevant Playwright specs (`npm run test:e2e`), if UI flows changed

## Screenshots / recordings

<!-- For UI changes: before / after, light and dark mode, phone and desktop widths. -->

## Checklist

- [ ] The PR title follows [Conventional Commits](https://www.conventionalcommits.org/) (`feat: …`, `fix: …`)
- [ ] Schema changes ship as a migration in `prisma/migrations` (never `db push`) and work with the previous deployment
- [ ] New env vars are documented in `.env.example` with placeholder values only
- [ ] No secrets, tokens, real user data or `.env` files are committed
- [ ] Docs updated (`README.md`, `DEPLOY.md`, `CLAUDE.md`) where behaviour changed
