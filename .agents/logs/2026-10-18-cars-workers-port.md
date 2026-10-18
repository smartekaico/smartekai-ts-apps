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

## Open

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
