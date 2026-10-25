# Patch dependency updates, and the two things they surfaced (2026-10-26)

Branch `chore/deps` from `main`, merged with the user's OK. Full step record and the
version table: `.agents/monorepo/plans/2026-10-22-patch-dependency-updates.md` ("Result").

## What changed

Lockfile only — no `package.json` was touched:

| Package | Before | After |
|---|---|---|
| `better-auth` | 1.7.7 | 1.7.13 |
| `@tanstack/react-start` | 1.169.1 | 1.169.4 |
| `@tanstack/react-router` | 1.170.44 | 1.170.46 |
| `@tanstack/router-cli` | 1.167.43 | 1.167.46 |
| `wrangler` | 4.151.1 | 4.152.0 |
| `vite` | 8.3.4 | 8.3.5 |

The plan's target table was written on 2026-10-22, so every package landed one or two
patches past it. Still same-major, still inside the declared `^` ranges.

## Decision: react stays at 19.3.0

The plan targets 19.3.1, but every app and `packages/marketing` pin react/react-dom
exactly (`"19.3.0"`), not with a caret. `npm update` therefore cannot move them, and the
task's ground rule says "no `package.json` edits". The plan contradicted itself. Asked the
user, who answered **"do safe task"** — so the pins are untouched and react stays at
19.3.0. Bumping them is a one-line-per-manifest change whenever it is wanted.

## Finding: production renders are currently dead (external billing)

The one verification render was enqueued and the consumer ran (`QUEUE cars-render 1/1
(3418ms)`), but Google rejected the image call:

```
HTTP 402  {"error":{"code":402,"status":"RESOURCE_EXHAUSTED",
  "message":"Your prepayment credits are depleted. Please go to AI Studio at
   https://ai.studio/projects to manage your project and billing."}}
```

`apps/cars-4by4-builder/.dev.vars` and the root `.env.local` hold the **same key**
(sha256 prefix `553ce176e37e`), so the live Worker fails identically. The site launched
today and its gallery is pre-rendered, so the pages look fine — but any new user render
fails. The failure is handled cleanly (build goes `failed`, no charge, the page offers
"Try again"), and the queue path itself is proven. Fixing it needs an AI Studio top-up;
nothing in the dependency bump caused it.

Side effect worth knowing: a failed **guest** render still burns the daily/hourly rate-limit
counters (`free:d`, `render:d`, `render:h`), so a user who hits the billing outage cannot
retry the free render until the window resets. Not changed here — it is pre-existing
behaviour, not a patch regression.

## Verification detail

- Gate PASSED before and after, identical output; two lint warnings in the generated
  `worker-configuration.d.ts` are baseline noise.
- `/`, `/build`, a build page, its report, `/credits`: render, 0 console errors.
- Sign-up → `200` and `pbkdf2-sha256$100000$…` in `cars_account`; sign-out → `200` and the
  header returns to signed-out; sign-in → `200`. (An earlier "sign out failed: Failed to
  fetch" was my own navigation race, not a regression — reproduced cleanly with the
  response awaited.)
- `wrangler deploy --dry-run`: **4374.50 KiB / gzip 987.18 KiB**, vs Spec 4's 4390.95 /
  977.45. Well inside the Free limit.
- medical-os: `/` 200, `/workspace/notes` 200, protected routes 307.
- **legal-os skipped** at the user's instruction; its dev server was stopped. (Its 500 on a
  bogus sign-in was a missing DB env var in that app, not the auth bump.)
- Branch DB test artifacts deleted (build, user, sessions, `127.0.0.1` rate-limit rows);
  production was never touched.
