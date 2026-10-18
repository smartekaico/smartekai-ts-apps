# Spec 4 — Deploy cars-4by4-builder on Cloudflare Workers

**Date:** 2026-10-18 · **Status:** approved design · **Replaces:** the Dokploy
deployment (Dockerfile + Nitro node server) for this app only. legal-os and
medical-os are untouched.

## 0. Decisions

| Question | Decision |
|---|---|
| Runtime | **Cloudflare Workers** via the official `@cloudflare/vite-plugin` (not Containers, not Pages). |
| Plan | **Workers Free first.** Measure CPU (§8) before go-live; upgrade to Paid ($5/mo) only if a free fix (§7) doesn't fit. No code differs between plans. |
| Background render | **Cloudflare Queues** (available on Free; message retention fixed at 24h). |
| Rate limits | **Postgres table** — the Workers Rate Limiting binding only supports 10s/60s periods; ours are hourly/daily, and isolate memory isn't shared. |
| Domain | **cars.smartekai.com** as a Workers Custom Domain (the smartekai.com zone must be on Cloudflare DNS). |
| Storage | Unchanged: Neon Object Storage through `@smartekai/storage` (S3 client). R2 is out of scope. |
| Deploy | `wrangler deploy` from the developer machine (no git remote → no Workers Builds yet). |

Free-plan limits that shape the design (developers.cloudflare.com/workers/platform/limits):
10 ms CPU per HTTP request and per cron run (network waits don't count),
50 subrequests per invocation, 100k requests/day, 5 cron triggers per account,
`waitUntil` ≤ 30 s after the response, queue consumers 15 min wall time.

## 1. Build and runtime

- `apps/cars-4by4-builder/vite.config.ts`: replace `nitro()` with
  `cloudflare({ viteEnvironment: { name: "ssr" } })`, keep `tanstackStart()`
  and `viteReact()`. Drop the `ssr.external` list (workerd bundles
  everything; workspace packages' CJS `dist/` is bundled by Vite). Keep
  `noExternal: ["lucide-react"]` and the `optimizeDeps` entry only if the
  build still needs them. Remove the `loadEnv → process.env` loop (§5 replaces
  it).
- New `apps/cars-4by4-builder/wrangler.jsonc`:
  - `name: "cars-4by4-builder"`, `main: "src/server.ts"`,
    `compatibility_date` = the implementation date,
    `compatibility_flags: ["nodejs_compat"]` (a date ≥ 2025-04-01 populates
    `process.env` from vars + secrets, so existing `process.env.X` reads keep
    working, including module-scope ones),
    `observability: { enabled: true }`, `upload_source_maps: true`.
  - `routes: [{ pattern: "cars.smartekai.com", custom_domain: true }]`.
  - `queues.producers: [{ binding: "RENDER_QUEUE", queue: "cars-render" }]`,
    `queues.consumers: [{ queue: "cars-render", max_batch_size: 1, max_retries: 0 }]`.
  - `triggers.crons: ["17 * * * *"]` (hourly cleanup).
  - `vars` per §5.
- `package.json`: remove `nitro` and the `start` script; add `wrangler` and
  `@cloudflare/vite-plugin` (dev), `@cloudflare/workers-types` if
  `wrangler types` output needs it; scripts `deploy: "vite build && wrangler deploy"`,
  `cf-typegen: "wrangler types"`, `dev-vars: "tsx scripts/dev-vars.ts"`.
  Lockfile changes only via `npm install`.
- Delete `apps/cars-4by4-builder/Dockerfile`.
- `turbo.json`: build outputs for this app become `dist/**` (whatever
  `vite build` emits with the Cloudflare plugin — check, don't guess).

## 2. Entry `src/server.ts`

```ts
import handler from "@tanstack/react-start/server-entry";
export default {
  fetch: handler.fetch,
  async queue(batch, env, ctx) { /* for each message: await runGeneration(body.buildId); msg.ack() */ },
  async scheduled(event, env, ctx) { ctx.waitUntil(runCleanup()); },
} satisfies ExportedHandler<Env>;
```

- `queue`: validates `{ buildId: string }`, awaits `runGeneration` (it never
  rejects and already marks failure + refunds), always `ack()`s. `max_retries: 0`
  because a retry would re-bill Gemini for a build already refunded.
- `scheduled`: runs `runCleanup()` (§4).

## 3. Render job

- `startBuild` (`src/lib/builds.ts`, today `void runGeneration(target.id)`):
  after the build flips to `processing`, `await env.RENDER_QUEUE.send({ buildId })`
  (`import { env } from "cloudflare:workers"`). If `send` throws:
  `failProcessingBuild(buildId, "Couldn't start the render — try again.")`
  (which refunds exactly once) and return that error to the client.
- Queue consumer CPU on Free is unspecified by Cloudflare; the Gemini base64
  decode + upload is the heaviest step. Measured in §8.
- Unchanged: status guards, `STALE_PROCESSING_MS` sweep on read and in cron,
  build-page polling.

## 4. Cleanup as a cron

- Move the body of `scripts/cleanup.ts` into `src/server/cleanup.ts` as
  `export async function runCleanup(opts?: { maxBuilds?: number })`.
  `scripts/cleanup.ts` becomes a thin wrapper (manual runs from the machine).
- **Subrequest budget (Free = 50 per invocation):** every DB query and every
  storage delete is a subrequest. In the cron, cap the work per run:
  `maxBuilds = 10` (≤ 2 storage deletes + 1 DB delete each), plus a fixed
  handful of queries for the stuck-render sweep, guest prune and
  `rate_limits` prune. Hourly runs drain any backlog. The manual script passes
  no cap.
- Stuck-render refunds loop one `refundFailedBuild` per build — also capped
  (first 10 per run).
- Add: delete `rate_limits` rows whose window ended (§6).

## 5. Env and secrets

`vars` in `wrangler.jsonc` (non-secret):
`BETTER_AUTH_URL=https://cars.smartekai.com`,
`PUBLIC_SITE_URL=https://cars.smartekai.com`, `NOWPAYMENTS_ENV=live`,
`CARS_DAILY_RENDER_CAP=200`, `GOOGLE_AI_MODEL`, `GOOGLE_AI_IMAGE_MODEL`,
`AWS_REGION`, `AWS_ENDPOINT_URL_S3`, `NOWPAYMENTS_IPN_IPS` (optional).

Secrets (`wrangler secret put <NAME>`, run by the user — never committed):
`DATABASE_NEONDB_SMARTEKAI`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_AI_API_KEY`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`.
(Confirm the full list by grepping `process.env` in the app and the packages
it imports; `DEEPGRAM_API_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL` are
read only by code paths cars doesn't use — verify, don't add blindly.)

Local dev: the Cloudflare Vite plugin reads `apps/cars-4by4-builder/.dev.vars`
(gitignored). New `scripts/dev-vars.ts` writes it from the root `.env.local`
then the app `.env.local` (app wins), keeping only the keys listed above, so
`.env.local` stays the one source of truth. Add `.dev.vars` and `.wrangler/`
to `.gitignore`. Update AGENTS.md's env-files note.

## 6. Rate limits in Postgres

New table in `packages/db/src/cars/schema.ts`:

```
rate_limits(key text, window_start timestamptz, count integer not null,
            expires_at timestamptz not null, primary key (key, window_start))
```

`tryConsume(rules)` becomes `async` and keeps its contract (all-or-nothing
across rules). One statement per rule, fixed windows:
`INSERT … ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
 WHERE rate_limits.count < $limit RETURNING count` — no row returned = over
the limit. Multi-rule all-or-nothing: consume rules in order; if one is
refused, decrement the ones already consumed (best-effort; a lost decrement
only over-counts, which is the safe side). Callers (`credits.ts:70`,
`lib/credits.ts:57`, `builds.ts:100`, `builds.ts:171`) add `await`.
`window_start = floor(now / windowMs) * windowMs`. Parameterized drizzle
`sql` only. Add `rate_limits` to `drizzle.cars.config.ts` `tablesFilter`.

Production DDL is applied by hand (never `db:push:cars` — see
`.agents/logs/2026-10-16-cars-db-push-drops-sequences.md`), rehearsed on a
Neon branch first, **user approval required** before production.

## 7. Client IP and CPU fallbacks

- `src/server/request.ts`: `requestIp()` returns the `cf-connecting-ip`
  header; if absent (local dev only) `getRequestIP()` without
  `xForwardedFor`; else `"unknown"`. Never read `x-forwarded-for`.
- CPU fallbacks if §8 shows a route over 10 ms, cheapest first:
  1. Better Auth password hashing → `emailAndPassword.password.{hash,verify}`
     using Web Crypto PBKDF2-SHA256 (existing scrypt hashes: none in
     production beyond test accounts — verify with a count first; if any,
     verify-old-then-rehash).
  2. Report page SSR too heavy → render the shopping list client-side.
  3. Anything else / render consumer → upgrade to Workers Paid.

## 8. Done when

Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
Click-through under `vite dev` (real workerd runtime) on the Neon
`cars-credits` branch:

- [x] Home, gallery, build page, report and `/credits` render; no hydration errors.
      `/` 200 (12 Land Cruiser / 11 Patrol / 11 Wrangler cards), `/builds/patrol-dune` 200
      (`<h1>Nissan Patrol — Desert / Dune</h1>`), `/builds/3f16b342-…/report` renders the
      report + Print + parts, `/credits` 307 → `/sign-in?next=/credits` signed out and
      renders signed in. Browser console: 0 errors, 0 warnings on `/`, `/build`,
      `/builds/patrol-dune`, the build page, `/credits` and `/sitemap.xml`.
- [x] Guest render goes through the queue and completes; a forced failure
      (bad `GOOGLE_AI_IMAGE_MODEL`) marks the build failed and refunds once.
      `a9e88303-…`: `processing` → `completed`, `render_key` set, dev log
      `QUEUE cars-render 1/1 (17104ms)`. Forced failure `90de818c-…`: `failed`,
      `charge = NULL`, no `credit_ledger` row, `free_render_used` back to `false`
      (one refund, of the right kind).
- [x] Third free render from one IP in a day is refused (limit read from
      `rate_limits`, survives a dev-server restart).
      `free:d:127.0.0.1` = 2 in the branch; a fresh guest (cookies cleared) on a
      restarted dev server got "Sign in to keep building.", the counter stayed at 2,
      `free_render_used` was released and no `builds` row was created.
- [x] Sign up (email+password), sign in, Google sign-in (if configured), guest
      builds move to the account.
      Sign-up created `VxW5zwbU…` (`is_anonymous = false`); its guest build
      `3f16b342-…` moved to it, `free_render_used` carried over `true`, the guest row
      was deleted. Signed out, signed back in → `/projects` lists the build.
      **Google not exercised:** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set
      nowhere, so `socialProviders` is empty — yet the sign-in page still renders
      "Continue with Google" (pre-existing UI/API mismatch, not a Workers regression).
- [x] Signed IPN replay (`signIpn`) → 200; unsigned → 401.
      Signed replay of payment `6382688870` → 200 `{"ok":true}`, log
      `signature matched (recursive form)` then `(order 04061f2f-…, status waiting)
      has no matching purchase — ignored` (the branch has no purchase row for it; the
      provider lookup runs live). Unsigned → 401 `invalid signature`. Writing credits
      still needs a settled payment.
- [x] Cron: `curl "http://localhost:<port>/cdn-cgi/handler/scheduled?cron=17+*+*+*+*"` runs cleanup within the subrequest cap.
      200 `ok`, and both cleanup lines appear in the dev log. `scripts/cleanup.ts` under
      `tsx` prints the same lines plus `2 rate-limit windows` pruned. Real subrequest
      counts are only visible after a deploy.
- [x] `wrangler deploy --dry-run --outdir` succeeds; bundle size recorded.
      Exit 0 → **Total Upload 4390.95 KiB / gzip 977.45 KiB** (62 worker modules
      3696.35 KiB; 26 client assets). Bindings read back: `RENDER_QUEUE` plus 7 vars.
- [x] **CPU measured** for: sign-up, sign-in, report page, a queue render
      (`wrangler tail` / Workers observability `cpuTime` after a preview
      deploy to `*.workers.dev`, user go-ahead first). Each ≤ 10 ms, or the §7 fallback applied.
      **Over budget, so §7 applies.** Preview `cars-4by4-builder-preview.smartekaico.workers.dev`,
      61 invocations (60 `ok`): sign-up **84 ms**, sign-in **78 / 84 ms**, queue
      render **339 ms** CPU (12 423 ms wall), `/` 7–**37 ms**, report page 2 / **37 ms**,
      build page 10 ms, `/projects` 7 ms, `/credits` 6 ms, server functions 0–13 ms.
      The account is still on Workers Free, so those runs only passed on the
      runtime's burst allowance for infrequent overages — under traffic they would
      be Error 1102. §7 fallback **3 (Workers Paid) is forced** by the render
      consumer, so fallbacks 1 and 2 were deliberately not applied; the choice was
      handed back to the user. Full table: `.agents/logs/2026-10-18-cars-workers-port.md`.
      **Not measured** — needs the preview deploy, which is Task 8's ask-first step.

Then, with the user's go-ahead: production `rate_limits` DDL, secrets set,
first deploy to cars.smartekai.com, Google OAuth redirect URI
`https://cars.smartekai.com/api/auth/callback/google`, NOWPayments IPN
reaches `/api/nowpayments/ipn`, and the still-open Spec 3 item (a real
settled $14 payment → "✓ 100 credits added").

## 9. User's side (not code)

Cloudflare account with smartekai.com on Cloudflare DNS · `npx wrangler login`
· `npx wrangler queues create cars-render` · the secrets in §5 · Google OAuth
client redirect URI · retire the Dokploy app for cars if one exists.

## Out of scope

R2 migration · git-connected Workers Builds / CI · legal-os and medical-os ·
any change to pricing, credits or payment logic.
