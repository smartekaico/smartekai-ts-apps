# Cars on Cloudflare Workers — port notes — 2026-10-18

Execution log for `.agents/cars-4by4-builder/plans/2026-10-18-cloudflare-workers-deploy.md`
(Spec 4: `.agents/cars-4by4-builder/specs/2026-10-18-cloudflare-workers-deploy-design.md`).
Branch `feat/cars-cloudflare`. Scope: cars only.

## Deviations from the plan / spec

- **Branch base.** The plan's ground rules say to branch from `docs/cars-cloudflare`.
  That branch does not exist and the spec was already on `main`; branched from local
  `main` instead (`main` was 5 docs-only commits ahead of `origin/main`, left unpushed).
- **`src/server.ts` entry (Task 1 Step 4).** The plan's literal snippet
  (`fetch: handler.fetch`) is wrong for this TanStack Start version: its
  `RequestHandler` is `(request: Request) => Promise<Response>`, not assignable to
  Workers' `(request, env, ctx) => Response | Promise<Response>`. Shipped a thin
  wrapper:
  ```ts
  fetch: (request: Request) => handler.fetch(request)
  ```
  which keeps `satisfies ExportedHandler<Env>` meaningful.
- **`rate_limits` (Task 3 Step 1).** Plan/spec snippets used the drizzle *array*
  constraint style and `timestamptz`; the cars schema file uses the *object* style
  and plain `timestamp` (no time zone) elsewhere. Followed the file: object-style
  `(table) => ({ pk: primaryKey(...), expiresAtIdx: index(...) })` and
  `timestamp("window_start").notNull()`. Matches the DDL applied (verified with `\d`).
- **`GOOGLE_AI_IMAGE_MODEL`** is not set in the root `.env.local`, so it was omitted
  from `wrangler.jsonc` `vars` rather than inventing a value. It must be set before
  a production deploy if image editing is expected to use a non-default model.
- **`.dev.vars` values are quoted** (`JSON.stringify`) — wrangler parses `.dev.vars`
  as dotenv, so `#`/spaces in a secret would otherwise truncate the value.
- **`compatibility_date: "2026-10-18"`** — accepted by the installed wrangler
  (workerd 1.20261012.1), so no fallback date was needed.
- **Not needed, confirmed by fact:** `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL` and
  `DEEPGRAM_API_KEY` were left out of `dev-vars.ts`. Cars uses
  `@smartekai/auth/factory`, which imports only `better-auth`; `BETTER_AUTH_SECRET`
  is kept.
- **`scripts/dev-vars.ts` now refuses production** (Task 5, agreed with the user —
  see "Incident" below). It exits non-zero without writing when the resolved
  `DATABASE_NEONDB_SMARTEKAI` contains the production endpoint
  (`ep-winter-frost-b1drw3en`), and always logs the DB host it wrote.
  `CARS_ALLOW_PROD_DB=1` overrides. This is beyond the plan's Step 6; the plan's
  Task 1 Step 7 rule ("local dev must never use the production database") is what
  it enforces.
- **`wrangler types` narrows `ProcessEnv`.** After Step 5, `worker-configuration.d.ts`
  declares every `wrangler.jsonc` var as always-defined in `NodeJS.ProcessEnv`, so the
  five pre-existing `process.env.X ?? fallback` reads on cars paths became lint errors
  ("unnecessary condition"). Fixed with `apps/cars-4by4-builder/src/process-env.d.ts`,
  which re-declares exactly those keys as optional (declaration merging restores
  `string | undefined`). Nothing else was changed.

## Root cause: the CJS interop failure (Task 1 Step 7)

`/` failed in workerd with `exports is not defined` / `__vite_ssr_import_* is not a
function`. Two independent layers:

1. **Workspace packages ship CJS `dist/`** (`@smartekai/*`: `ai`, `auth`, `db`,
   `nowpayments`, `storage`, `ui`) and workerd has no `require`. Vite resolves each
   package's `exports` map to `dist/*.js`, which is CommonJS with `exports.x = ...`
   at top level. `vite.config.ts` now aliases those specifiers to the packages'
   **TypeScript source** (`resolve.alias` regexes for `ai`, `auth/factory`,
   `db/cars`, `nowpayments`, `storage`, `ui`) plus `resolve.tsconfigPaths: true` for
   the app's own `@/` paths. The server graph is then ESM source end to end.
2. **The AWS SDK resolves its browser build two different ways.** `@aws-sdk/core/client`
   is picked by an exports *condition* (handled by Vite), but `@aws-sdk/client-s3`
   has **no exports map** and instead swaps `./dist-es/runtimeConfig` → `runtimeConfig.browser`
   through its `browser` *field* — and the importing specifier is extensionless
   (`S3Client.js` does `import "./runtimeConfig"`). Vite's SSR env/rolldown optimizer
   applies conditions but not the browser field to relative imports, so node's
   `runtimeConfig.js` (which calls `emitWarningIfUnsupportedVersion(process.version)`)
   and the browser stub's `Symbol.for("node-only")` landed in one chunk →
   `(0, __vite_ssr_import_1__.n) is not a function` when `new S3Client(...)` ran at
   module scope (`packages/storage/src/index.ts` builds the client on import).
   Fixed in `vite.config.ts`:
   ```ts
   environments: {
     ssr: {
       resolve: { mainFields: [...] },
       optimizeDeps: { rolldownOptions: { resolve: { aliasFields: [["browser"]] } } },
     },
   }
   ```
   `aliasFields: [["browser"]]` makes relative imports inside the SDK resolve through
   the browser field map too, so the whole S3 stack is the fetch-based one.

Facts that made this diagnosable: the CF plugin's worker resolve is
`noExternal: true` with `conditions: ["workerd","worker","module","browser",...]` and
**no `mainFields` of its own**; `@aws-sdk/client-s3` is `3.1151.0`
(`main: dist-cjs/index.js`, `module: dist-es/index.js`); `@smartekai/nowpayments` is
CommonJS.

## Verification

**Task 1 Step 7 (real workerd, Neon branch `cars-credits`):** `/` 200 (16.6 kB,
complete HTML), `/build` 200, `/builds/patrol-dune` 200 with the real vehicle title,
a nonexistent slug 404, `/projects` and `/credits` 307 → `/sign-in?next=…`;
no console errors or warnings; dev log clean.

**Production build** (`npx vite build`, exit 0): 0 occurrences of
`Symbol.for("node-only")`, 0 of `emitWarningIfUnsupportedVersion`, 0 of
`NodeHttpHandler`; `runtimeConfig.browser` present — i.e. one consistent fetch-based
S3 stack, no mixed node/browser runtime.

**Task 3 (branch only).** Table created with `psql -1 -v ON_ERROR_STOP=1` over the
direct (non-pooler) URL, from
`.agents/cars-4by4-builder/specs/2026-10-18-rate-limits.sql`. `\d rate_limits`:
`text/int4/timestamp` columns, `rate_limits_pkey PRIMARY KEY (key, window_start)`,
`rate_limits_expires_at_idx` — matches the Drizzle table. `db:push:cars` was not run
(it drops legacy sequences — `.agents/logs/2026-10-16-cars-db-push-drops-sequences.md`).

Behaviour against the branch (temporary `.mts` probe, deleted after use):

```
freeRenderRules("203.0.113.9") ×3      → true,true,false
renderRules("203.0.113.9")     ×6      → true,true,true,true,true,false
rows                                   → free:d count 2 · render:h count 5 · render:d count 5
```

The 6th render was refused by the hourly rule and the daily row **went back to 5**,
so the give-back path works. Test rows deleted.

Instrumentation patches to `node_modules/vite` and the CF plugin's module runner were
reverted; `packages/auth/dist` restored with `git checkout`.

**Task 4 (queue render, branch).** A guest render through the UI (studio-image
path, `lc300` + 2 parts) → build
`a9e88303-…`: `processing` → `completed`, `charge = free`, `render_key` set, and
the dev log showed `QUEUE cars-render 1/1 (17104ms)` — the consumer ran
`runGeneration`. The build page rendered the before/after slider.

Forced failure: `GOOGLE_AI_IMAGE_MODEL=bogus` + `npm run dev-vars` → render
`90de818c-…` → `status = failed`, `error_message = "Generation failed — try again."`,
`charge = NULL` (nulled by `refundFailedBuild` as its exactly-once guard),
`render_key` null, **no** `credit_ledger` row, and the guest's
`free_render_used` went back to `false` — exactly one refund, of the right kind.
The same run exercised the rate-limit `ON CONFLICT DO UPDATE` path in workerd
(all four keys 1 → 2), which Task 3's probe had only covered in Node.

**Task 5 (hourly cron, branch).**

```bash
DATABASE_NEONDB_SMARTEKAI="$BR" npx tsx --env-file=../../.env.local scripts/cleanup.ts
# cleanup: timed out and refunded 0 stuck renders
# cleanup: removed 0 builds, 0 stale guests, 2 rate-limit windows
curl "http://localhost:3002/cdn-cgi/handler/scheduled?cron=17+*+*+*+*"
# cleanup: timed out and refunded 0 stuck renders
# cleanup: removed 0 builds, 0 stale guests, 0 rate-limit windows
```

The script run pruned the two rate-limit windows that had already expired, which
is also proof it reached the branch database (production has no `rate_limits`
table — the prune would have thrown). The `--env-file` URL is overridden by the
shell var, as the plan requires.

## Incident: dev server briefly pointed at production (2026-10-18, ~19:51Z)

While re-generating `.dev.vars` for the Task 4 forced-failure test
(`GOOGLE_AI_IMAGE_MODEL=bogus npm run dev-vars`), `dev-vars.ts` re-resolved
`DATABASE_NEONDB_SMARTEKAI` from the monorepo-root `.env.local` — which points at
**production**. The dev server was restarted and one `startBuild` attempt ran
against production: the anonymous sign-in created a guest row, and the request
then died on the first write (`render:h`) with
`relation "rate_limits" does not exist`, which surfaced in the UI as
"Something went wrong — try again." (Not a rate-limit bug: the table simply does
not exist in production yet; Task 9 applies that DDL.)

Production footprint, measured afterwards (read-only):

| table | rows written |
|---|---|
| `cars_user` | 1 (anonymous, `free_render_used = false`, 0 credits) |
| `cars_session` | 1 (that guest's) |
| `builds`, `credit_ledger`, `credit_purchases`, `rate_limits` | 0 |

By the user's decision the stray guest and its session were **left in place** —
inert, and deleting rows in production is a destructive write that deserves more
care than the value of one empty guest row. Cleanup is manual if ever wanted:
`delete from cars_session where user_id = '5BcmG92kp6o4XymsC9WwBSvVwMv2puyV';`
then `delete from cars_user where id = '5BcmG92kp6o4XymsC9WwBSvVwMv2puyV';`.

Root cause is structural, not a slip: the root `.env.local` holds the production
DB URL for the other apps, the app `.env.local` only overrides `BETTER_AUTH_URL`,
and `.dev.vars` is *generated* from them — so a bare `npm run dev-vars` silently
retargets the workerd dev server at live data. Under Nitro the same root file was
read directly (`.agents/logs/2026-10-18-cars-spec3-ddl-applied-production.md`).
Fixed by the `dev-vars.ts` guard described above.

## Task 8 — preview deploy and CPU measurement (2026-10-19)

Deployed and measured on the user's go-ahead. Account
`82e8bdf2828490cd4f28d0ce94e4667d`; the workers.dev subdomain is `smartekaico`
(`GET /accounts/{id}/workers/subdomain` — `wrangler whoami` no longer prints it),
so the preview worker is
**https://cars-4by4-builder-preview.smartekaico.workers.dev** (version
`f292efd9-6cae-42b6-be8b-3267125f6b8c`, startup 49 ms, 4390.95 KiB / 977.45 KiB
gzip). The `cars-render` queue already existed (created 2026-10-18T21:15Z).

Setup notes, in the order they mattered:

- `PREVIEW_SUBDOMAIN` in `wrangler.preview.jsonc` → `smartekaico`.
- `wrangler secret put -c wrangler.preview.jsonc` on a worker that does not exist
  yet does not fail: non-interactively it answers its own "create a new Worker?"
  prompt with *yes*, uploads a placeholder script, and stores the secret. The
  deploy then replaces the placeholder, and all 7 secrets survive (`wrangler secret
  list`). So the order deploy-then-secrets is not required.
- The 7 preview secrets were piped from the generated `apps/cars-4by4-builder/.dev.vars`
  (branch DB `ep-wild-bar-b1pi4db8-pooler`, never production):
  `DATABASE_NEONDB_SMARTEKAI`, `BETTER_AUTH_SECRET`, `GOOGLE_AI_API_KEY`,
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NOWPAYMENTS_API_KEY`,
  `NOWPAYMENTS_IPN_SECRET`. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` exist nowhere,
  so Google sign-in stays dead on the preview exactly as it is locally.
- Build + deploy is `CARS_WRANGLER_CONFIG=wrangler.preview.jsonc npx vite build &&
  npx wrangler deploy` — no `-c`, per the deviation already recorded in the plan.

Click-through on the real worker (branch DB, via Playwright): `/` → `/build` →
Nissan Patrol + Overlander preset → studio photo → render → build page →
`/projects` → `/credits` → `/builds/<id>/report`, plus sign-up, sign-out and sign-in.
The guest build created on the preview (`e1156aa6-2f45-4389-b4c3-61797ab659fa`)
completed through the queue and then **moved to `cars-workers-test@example.com`**
when that account signed in — the guest→account move works on Workers, not just
under `vite dev`. Console: 1 error, a `/favicon.ico` 404 (the repo ships no
favicon at all — pre-existing, unrelated to the port). A new account
(`preview-task8-2132@example.com`) was created on the branch DB.

### Measured CPU

`npx wrangler tail cars-4by4-builder-preview --format json`, 61 invocations, 60
`ok` + 1 `canceled` (a client-aborted server function during a navigation). Values
are `cpuTime` / `wallTime` in ms:

| invocation | CPU ms | wall ms | n |
|---|---|---|---|
| `GET /` (landing) | 7, 9, 10, 10, **37** | 123–297 | 5 |
| `GET /build` | 8 | 137 | 1 |
| `GET /builds/<id>` | 10 | 345 | 1 |
| `GET /builds/<id>/report` | 2, **37** | 2, 417 | 2 |
| `GET /projects` · `GET /credits` | 7 · 6 | 124 · 120 | 1 each |
| `POST /api/auth/sign-up/email` | **84** | 573 | 1 |
| `POST /api/auth/sign-in/email` | **78, 84** | 420, 1599 | 2 |
| `POST /api/auth/sign-out` | 7, 12 | 577, 586 | 2 |
| `POST /api/auth/sign-in/anonymous` | 5 | 232 | 1 |
| server functions (`/_serverFn/…`) | 0–13 | 0–351 | 17 |
| **queue render (consumer)** | **339** | **12 423** | 1 |

Landing-page CPU is the widest spread (7–37 ms) — the SSR pass is DB-bound but not
free; the report page repeats the same spread.

### The limit this has to fit, and why the runs did not fail

The account is **still on Workers Free** — `cf accounts subscriptions get` returns
only the three Free zones, `R2 Paid`, and `Teams Free Base`, and no Workers Paid
subscription. Free's cap is 10 ms CPU per HTTP request. Invocations at 78–339 ms
completed anyway because Cloudflare's limits page grants every isolate "some
built-in flexibility to allow for cases where your Worker infrequently runs over
the configured limit", terminating only once a Worker "starts hitting the limit
consistently". These were a handful of runs, so they spent the burst allowance —
not evidence the limit is higher. Under real traffic, sign-up (every sign-up hashes
a password) and renders (every render) would start returning **Error 1102**.

So Spec §7's fallbacks apply, in order:

1. **Password hashing → Web Crypto PBKDF2-SHA256.** Buys sign-up/sign-in back under
   10 ms. Branch check first: production has no scrypt hashes to migrate beyond
   test accounts.
2. **Report page → client-side.** The report is 37 ms at its worst; landing is the
   same shape, so §7.2 as written does not cover both.
3. **Render consumer → Workers Paid.** 339 ms is Gemini's returned image being
   decoded and pushed to object storage; no arrangement of 1 and 2 puts that inside
   10 ms. This one is not optional: the port cannot run on Free.

Fallbacks 1 and 2 were **not applied** — with 3 forced, the 10 ms budget stops
being the constraint, and rewriting auth's password hashing is a real behaviour
change that should be the user's call. Recommendation: Workers Paid, $5/month.
Against Standard's 30 M included CPU-ms/month that is roughly 88 k renders, 350 k
sign-ups, or ~3 M page views.

Side effect to remember: the preview worker's `AWS_ENDPOINT_URL_S3` is the same
production bucket the root `.env.local` points at, so the Task 8 render wrote one
more orphan object there (no `builds` row references it).

## Open

- Task 8 is **deployed and measured** (above). What is left is the plan's §7
  decision — Paid vs fallbacks 1+2 — and then `npx wrangler delete
  cars-4by4-builder-preview` once the user agrees. `wrangler deploy -c <config>`
  does not work here; see the deviation note in the plan's Task 8.
- Task 3 Step 5's probe used the **pooled** URL for the app-style neon-http driver;
  only the DDL used the direct URL.
- The rate-limit probe ran through `tsx` + `packages/db/dist` (CJS), i.e. the same
  SQL, not the workerd bundle. The workerd path is exercised by the Task 6
  click-through.
- Task 8 (CPU measurement on the Free plan) and Task 9 (`wrangler deploy`,
  `wrangler secret put`, custom domain) are ask-first and still outstanding, as is the
  real paid round-trip (USDT).
- Task 5's cron caps were verified by triggering the handler, not by counting real
  subrequests in the Cloudflare dashboard (only a deploy can do that).
- **Object storage is not branch-scoped here.** `AWS_ENDPOINT_URL_S3` in the root
  `.env.local` points at the production branch's bucket, so the Task 4/6 test renders
  wrote real objects there: the `renders/` object for `a9e88303-…` (the completed
  guest build) and the `uploads/` object for the photo `checkPhoto` accepted before
  vehicle detection rejected it. No production `builds` row references them, so they
  are orphans; left in place (deleting from a production bucket is a destructive step
  that needs the user's go-ahead). The Neon branch DB and this bucket disagree by
  design until production go-live.
- **Google sign-in could not be exercised** (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
  unset everywhere; `socialProviders` is `{}`), yet `/sign-in` still renders a
  "Continue with Google" button. Pre-existing UI/API mismatch, out of this plan's
  scope, worth a separate look.
- The Task 6 invoice (`5055666156`, `$14.00`, status `pending`) and the two earlier
  unconsumed invoices are still unpaid — the paid round-trip remains open.
