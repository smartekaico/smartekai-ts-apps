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

- [x] **1. Baseline.** On `main`, run `./scripts/gate.sh` and record which
  checks fail. The 2026-09-02 run had pre-existing lint failures (package
  `eslint --ext` scripts, legal-os biome a11y); a failure that's also in the
  baseline isn't caused by this update.
- [x] **2. Read the changelogs.** Better Auth 1.7.8–1.7.12 on its GitHub
  releases. Look for anything touching the anonymous plugin, custom
  `emailAndPassword.password.{hash,verify}` (cars uses Web Crypto PBKDF2),
  cookies/sessions, or the DB schema. If a release needs a schema change, stop
  and report: cars DDL is hand-applied, never `db:push:cars`. Skim the TanStack
  Start/Router notes for anything about server functions or the Vite plugin.
- [x] **3. Update.** `git checkout -b chore/deps main && npm update`.
  Then `git diff --stat`: only `package-lock.json` may change. If any
  `package.json` changed, revert and report. Confirm versions with
  `npm ls better-auth @tanstack/react-start @tanstack/react-router wrangler vite react`.
  Other in-range transitive bumps that `npm update` brings along are expected.
- [x] **4. Gate.** `./scripts/gate.sh`. It must match the baseline: no new
  failures.
- [x] **5. Cars click-through** (`npm run dev -w cars-4by4-builder`, port 3002,
  real workerd, on `cars-credits`):
  - home, gallery, `/build`, a report and `/credits` render, no hydration errors;
  - email sign-up, sign-out, sign-in (this exercises the PBKDF2 hash/verify);
  - a guest render goes through the queue and completes;
  - `npx wrangler deploy --dry-run --outdir /tmp/cars-dry` succeeds; compare the
    bundle size with the one recorded in Spec 4 §8.
- [x] **6. Other apps.**
  - legal-os (`npm run dev:legal`, port 3001): sign in works (Better Auth).
  - medical-os (`npm run dev:medical`, port 3000): main routes load (TanStack
    Start + Vite).
- [x] **7. Commit and report.** Commit message `chore(deps): patch updates (better-auth 1.7.12, tanstack start 1.169.3, vite 8.3.5, react 19.3.1)`.
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

## Result (2026-10-26)

Done on branch `chore/deps`, merged into `main` with the user's OK.

| Package | Before | After |
|---|---|---|
| `better-auth` | 1.7.7 | **1.7.13** |
| `@tanstack/react-start` | 1.169.1 | **1.169.4** |
| `@tanstack/react-router` | 1.170.44 | **1.170.46** |
| `@tanstack/router-cli` | 1.167.43 | **1.167.46** |
| `wrangler` | 4.151.1 | **4.152.0** |
| `vite` | 8.3.4 | **8.3.5** |
| `react` / `react-dom` | 19.3.0 | 19.3.0 (**not bumped**) |

Every package landed one or two patches beyond this file's table because the table was
snapshotted on 2026-10-22; all are still same-major and inside the declared ranges.

**React was not bumped.** All four app/package manifests pin it exactly (`"19.3.0"`, not
`^19.3.0`), so `npm update` cannot reach 19.3.1 and the ground rule "no `package.json` edits"
forbids editing the pins. Asked the user; answer was "do safe task", so it stays at 19.3.0.
Change the pins in a future task if 19.3.1 is wanted.

**Changelogs:** Better Auth 1.7.8–1.7.13 touch none of the anonymous plugin, the custom
PBKDF2 `password.hash`/`verify`, cookies/sessions, or the schema in a way cars cares about
(1.7.12's one action-required note is about ID-token providers without `clientId`, unused
here). No DDL needed.

**Gate:** PASSED at baseline and after the update, identical output (the two lint warnings
in the generated `worker-configuration.d.ts` are baseline noise). Only `package-lock.json`
changed.

**Cars click-through (branch `cars-credits`):** `/`, `/build`, `/builds/lc300-…`, the build
report and `/credits` all render with 0 console errors; email sign-up → `200`, account row
`pbkdf2-sha256$100000$…`; sign-out → `POST /api/auth/sign-out` `200` and the header returns
to signed-out; sign-in → `200`. `wrangler deploy --dry-run` succeeds: **Total Upload
4374.50 KiB / gzip 987.18 KiB** (Spec 4 recorded 4390.95 / 977.45). Production was never
touched by the click-through.

**Guest render — queue works, Gemini does not.** The render was enqueued, the consumer
picked it up (`QUEUE cars-render 1/1 (3418ms)`), and the build failed cleanly with
"That render didn't work / Generation failed — try again" and no charge. The cause is
external: Google answered **HTTP 402 "Your prepayment credits are depleted"** for
`gemini-3.1-flash-image`. `apps/cars-4by4-builder/.dev.vars` and the root `.env.local` carry
the same key, so **production renders fail the same way** until the AI Studio project is
topped up. Nothing in this update caused it. Test artifacts (build, user, sessions, the
`127.0.0.1` rate-limit rows) were deleted from the branch DB afterwards.

**legal-os check skipped on the user's instruction** ("stop running or testing legal-os
app"); the dev server was stopped. medical-os: `/` `200`, `/workspace/notes` `200`,
`/workspace` and `/workspace/sessions/$id` `307` (auth redirect, expected).

**Deploy:** not done in this task. The cars deploy is folded into the admin task's
production step, so one deploy carries the dependency bump plus the two features.
