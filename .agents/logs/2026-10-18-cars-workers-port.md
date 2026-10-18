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

## Open

- Task 3 Step 5's probe used the **pooled** URL for the app-style neon-http driver;
  only the DDL used the direct URL.
- The rate-limit probe ran through `tsx` + `packages/db/dist` (CJS), i.e. the same
  SQL, not the workerd bundle. The workerd path is exercised by the Task 6
  click-through.
- Task 8 (CPU measurement on the Free plan) and Task 9 (`wrangler deploy`,
  `wrangler secret put`, custom domain) are ask-first and still outstanding, as is the
  real paid round-trip (USDT).
