# Patch Dependency Updates — Task

> For the implementing agent. Same-major patch bumps only; no `package.json` edits.

**Goal:** bring the key packages to their latest patch releases. All of them are
already allowed by the existing `^` ranges, so `npm update` changes only
`package-lock.json`.

| Package | Installed (2026-10-22) | Target |
|---|---|---|
| `better-auth` (+ `@better-auth/core`) | 1.7.7 | 1.7.12 |
| `@tanstack/react-start` | 1.169.1 | 1.169.3 |
| `@tanstack/react-router` | 1.170.44 | 1.170.45 |
| `@tanstack/router-cli` | 1.167.43 | 1.167.45 |
| `wrangler` | 4.151.1 | 4.151.3 |
| `vite` | 8.3.4 | 8.3.5 |
| `react` / `react-dom` | 19.3.0 | 19.3.1 |

Already current, no action: `turbo` 2.11.10, `@neondatabase/serverless` 1.2.0,
`drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, `@cloudflare/vite-plugin` 1.64.0.

## Prerequisite

Met (2026-10-26): cars is live on **overlander.smartekai.com** (cars.smartekai.com
only 301s there). Originally: don't update in the middle of the go-live: the build and the
CPU measurement were done on the current versions.

## Ground rules

- Branch `chore/deps` from `main`. Never commit to `main`; merging needs the
  user's OK.
- Never hand-edit the lockfile. Never `npm install <pkg>@latest`, and no major
  bumps (those stay in `2026-09-02-monorepo-dependency-updates.md`, deferred).
- Cars local dev must point at the Neon `cars-credits` branch, never production:
  `DATABASE_NEONDB_SMARTEKAI="$(npx neon connection-string cars-credits --project-id ancient-hall-95124568 --pooled)" npm run dev-vars -w cars-4by4-builder`.
- **Ask first** before deploying cars to production with the new versions.

## Steps

- [ ] **1. Baseline.** On `main`, run `./scripts/gate.sh` and record which
  checks fail. The 2026-09-02 run had pre-existing lint failures (package
  `eslint --ext` scripts, legal-os biome a11y); a failure that's also in the
  baseline isn't caused by this update.
- [ ] **2. Read the changelogs.** Better Auth 1.7.8–1.7.12 on its GitHub
  releases. Look for anything touching the anonymous plugin, custom
  `emailAndPassword.password.{hash,verify}` (cars uses Web Crypto PBKDF2),
  cookies/sessions, or the DB schema. If a release needs a schema change, stop
  and report: cars DDL is hand-applied, never `db:push:cars`. Skim the TanStack
  Start/Router notes for anything about server functions or the Vite plugin.
- [ ] **3. Update.** `git checkout -b chore/deps main && npm update`.
  Then `git diff --stat`: only `package-lock.json` may change. If any
  `package.json` changed, revert and report. Confirm versions with
  `npm ls better-auth @tanstack/react-start @tanstack/react-router wrangler vite react`.
  Other in-range transitive bumps that `npm update` brings along are expected.
- [ ] **4. Gate.** `./scripts/gate.sh`. It must match the baseline: no new
  failures.
- [ ] **5. Cars click-through** (`npm run dev -w cars-4by4-builder`, port 3002,
  real workerd, on `cars-credits`):
  - home, gallery, `/build`, a report and `/credits` render, no hydration errors;
  - email sign-up, sign-out, sign-in (this exercises the PBKDF2 hash/verify);
  - a guest render goes through the queue and completes;
  - `npx wrangler deploy --dry-run --outdir /tmp/cars-dry` succeeds; compare the
    bundle size with the one recorded in Spec 4 §8.
- [ ] **6. Other apps.**
  - legal-os (`npm run dev:legal`, port 3001): sign in works (Better Auth).
  - medical-os (`npm run dev:medical`, port 3000): main routes load (TanStack
    Start + Vite).
- [ ] **7. Commit and report.** Commit message `chore(deps): patch updates (better-auth 1.7.12, tanstack start 1.169.3, vite 8.3.5, react 19.3.1)`.
  Report the gate result versus the baseline and the click-through results. Then
  ask the user before merging and before the cars production deploy
  (`npm run deploy -w cars-4by4-builder`). After that deploy, check sign-in on
  overlander.smartekai.com (Google and email) and run `wrangler tail` for one sign-in, to confirm the CPU
  time is still under the Free limit.

## If something breaks

Find the package that caused it with `npm update <pkg>` one at a time, from the
baseline lockfile. Keep the rest, pin nothing, and report the culprit with the
error. Don't change app code to work around a patch regression without asking.

## Done when

- Only `package-lock.json` changed, and the versions match the table.
- The gate has no failures beyond the baseline.
- The cars, legal-os and medical-os checks pass.
- The branch is committed, and the user has been asked about the merge and the
  deploy.
