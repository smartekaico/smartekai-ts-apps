# Cars on Cloudflare Workers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run `apps/cars-4by4-builder` on Cloudflare Workers (Free plan) at cars.smartekai.com, per Spec 4: `.agents/cars-4by4-builder/specs/2026-10-18-cloudflare-workers-deploy-design.md` (read it first — it is the source of truth; this plan is the order of work).

**Architecture:** `@cloudflare/vite-plugin` replaces Nitro. A custom entry `src/server.ts` exports TanStack's `fetch` plus a `queue` handler (AI render) and a `scheduled` handler (hourly cleanup). Rate limits move from process memory into a Postgres `rate_limits` table. Client IP comes from `cf-connecting-ip`.

**Tech stack:** TanStack Start (Vite 8) · `@cloudflare/vite-plugin` + `wrangler` · Cloudflare Queues + Cron Triggers · Drizzle 0.45 on Neon HTTP · Better Auth 1.7.7.

**Ground rules (repo `AGENTS.md`):**
- Work on branch `feat/cars-cloudflare`, created from `docs/cars-cloudflare` (which holds the spec). Never commit to `main`; merging needs the user's OK.
- Lockfile only changes through `npm install`.
- Never run `db:push:cars` (it drops legacy sequences). Schema changes go in as hand DDL in a transaction (`psql -1`) over the **direct** URL, with `-pooler.` stripped from the host.
- Rehearse on the Neon branch `cars-credits` (project `ancient-hall-95124568`). Production DDL, any `wrangler deploy`, and `wrangler secret put` are **ASK-FIRST**: stop and get the user's approval.
- No test suite. Validation is the scoped gate plus a click-through:
  `npx turbo run type-check lint build --filter=cars-4by4-builder...`
- `packages/*/dist` is committed. If a package's `src` changes, rebuild it and commit its `dist`. Never commit a regenerated `packages/auth/dist/index.*` you didn't intend to change; restore it with `git checkout`.
- Prefer facts over guesses. If an API named here differs in the installed version, check its `.d.ts` and adapt.

---

## File map

| File | Change |
|---|---|
| `apps/cars-4by4-builder/vite.config.ts` | Nitro → Cloudflare plugin; env loop removed |
| `apps/cars-4by4-builder/wrangler.jsonc` | new |
| `apps/cars-4by4-builder/src/server.ts` | new: `fetch` / `queue` / `scheduled` |
| `apps/cars-4by4-builder/scripts/dev-vars.ts` | new: writes `.dev.vars` |
| `apps/cars-4by4-builder/src/server/request.ts` | `cf-connecting-ip` |
| `packages/db/src/cars/schema.ts`, `packages/db/drizzle.cars.config.ts` | `rate_limits` table |
| `apps/cars-4by4-builder/src/server/rate-limit.ts` | async, DB-backed |
| `src/server/credits.ts:70`, `src/lib/credits.ts:57`, `src/lib/builds.ts:100,171` | `await tryConsume` |
| `apps/cars-4by4-builder/src/server/render-queue.ts` | new: `enqueueRender` |
| `apps/cars-4by4-builder/src/lib/builds.ts:265` | enqueue instead of `void runGeneration` |
| `apps/cars-4by4-builder/src/server/cleanup.ts` | new: `runCleanup` (moved from the script, capped) |
| `apps/cars-4by4-builder/scripts/cleanup.ts` | thin wrapper |
| `apps/cars-4by4-builder/package.json`, `tsconfig.json`, `.gitignore`, `Dockerfile` (deleted) | build plumbing |
| `AGENTS.md`, `.agents/cars-4by4-builder/plans/active.md`, `.agents/logs/…` | docs |

---

### Task 1: Workers runtime boots locally

- [x] **Step 1: Dependencies**

```bash
cd "apps/cars-4by4-builder"
npm uninstall nitro
npm install -D wrangler @cloudflare/vite-plugin
```

In `package.json` scripts:
- delete `start`;
- add `"deploy": "vite build && wrangler deploy"`, `"cf-typegen": "wrangler types"` and `"dev-vars": "tsx scripts/dev-vars.ts"`.

Delete `apps/cars-4by4-builder/Dockerfile`.

- [x] **Step 2: `vite.config.ts`** (full file)

```ts
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

// Runs on Cloudflare Workers (Spec 4). Server env comes from wrangler vars +
// secrets in production and from .dev.vars locally (npm run dev-vars).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), tanstackStart(), viteReact()],
  // @smartekai/ui ships CJS dist; pre-bundle it into ESM for the client.
  optimizeDeps: { include: ["@smartekai/ui"] },
});
```

- [x] **Step 3: `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "cars-4by4-builder",
  "main": "src/server.ts",
  // Use today's date; if wrangler rejects it as too new, the latest it accepts (must be ≥ 2025-04-01 so process.env is populated).
  "compatibility_date": "2026-10-18",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "upload_source_maps": true,
  "routes": [{ "pattern": "cars.smartekai.com", "custom_domain": true }],
  "queues": {
    "producers": [{ "binding": "RENDER_QUEUE", "queue": "cars-render" }],
    "consumers": [{ "queue": "cars-render", "max_batch_size": 1, "max_retries": 0 }]
  },
  "triggers": { "crons": ["17 * * * *"] },
  "vars": {
    "BETTER_AUTH_URL": "https://cars.smartekai.com",
    "PUBLIC_SITE_URL": "https://cars.smartekai.com",
    "NOWPAYMENTS_ENV": "live",
    "CARS_DAILY_RENDER_CAP": "200"
  }
}
```

Copy the non-secret values `GOOGLE_AI_MODEL`, `GOOGLE_AI_IMAGE_MODEL`, `AWS_REGION` and `AWS_ENDPOINT_URL_S3` from the root `.env.local` into `vars`. **Copy values only for those four keys.** Never put a secret in this file.

- [x] **Step 4: `src/server.ts`** (only `fetch` for now; Tasks 4 and 5 fill in the other handlers)

```ts
import handler from "@tanstack/react-start/server-entry";

export default {
  fetch: handler.fetch,
} satisfies ExportedHandler<Env>;
```

- [x] **Step 5: Types**

Run `npm run cf-typegen`. It writes `worker-configuration.d.ts`, which declares `Env`, including `RENDER_QUEUE`. Commit the file.

In `tsconfig.json`:
- set `"types": ["vite/client", "./worker-configuration.d.ts"]`, or keep `include` covering it;
- if `wrangler types` says so, drop the `DOM` lib clash per its output.

- [x] **Step 6: `scripts/dev-vars.ts`**

It writes `.dev.vars` with these precedence rules:
- shell env wins, then the app `.env.local`, then the root `.env.local`;
- only allow-listed keys are written;
- `BETTER_AUTH_URL` and `PUBLIC_SITE_URL` are forced to the local dev URL.

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

// Spec 4 §5: .env.local stays the one source of truth; .dev.vars is generated.
const KEYS = [
  "DATABASE_NEONDB_SMARTEKAI", "BETTER_AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "GOOGLE_AI_API_KEY", "GOOGLE_AI_MODEL", "GOOGLE_AI_IMAGE_MODEL",
  "AWS_REGION", "AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
  "NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET", "NOWPAYMENTS_ENV", "NOWPAYMENTS_IPN_IPS",
  "CARS_DAILY_RENDER_CAP",
] as const;
const LOCAL_URL = process.env.DEV_SITE_URL ?? "http://localhost:3002";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => (existsSync(p) ? parseEnv(readFileSync(p, "utf8")) : {});
const merged: Record<string, string | undefined> = {
  ...read(resolve(appDir, "../../.env.local")),
  ...read(resolve(appDir, ".env.local")),
};
const lines = KEYS.flatMap((k) => {
  const v = process.env[k] ?? merged[k];
  return v === undefined ? [] : [`${k}=${JSON.stringify(v)}`];
});
lines.push(`BETTER_AUTH_URL=${JSON.stringify(LOCAL_URL)}`, `PUBLIC_SITE_URL=${JSON.stringify(process.env.PUBLIC_SITE_URL ?? LOCAL_URL)}`);
writeFileSync(resolve(appDir, ".dev.vars"), lines.join("\n") + "\n");
console.log(`wrote .dev.vars (${lines.length} keys)`);
```

Before relying on `KEYS`, confirm it covers every `process.env.X` read on cars code paths:

```bash
grep -rhoE 'process\.env(\.|\[")[A-Z_0-9]+' apps/cars-4by4-builder/src packages/{ai,storage,nowpayments,auth}/src packages/db/src/cars | sort -u
```

Leave out `DEEPGRAM_API_KEY`, `RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL` only after confirming that cars never reaches the code that reads them.

Add `.dev.vars`, `.wrangler/` and `dist/` to `apps/cars-4by4-builder/.gitignore` (create it if missing).

- [x] **Step 7: Boot against the Neon branch.** **Local dev must never use the production database.**

```bash
BR=$(npx neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb --pooled)
DATABASE_NEONDB_SMARTEKAI="$BR" npm run dev-vars
npm run dev    # vite dev --port 3002, now inside workerd
```

Expected:
- `/`, `/build` and an existing `/builds/<slug>` render with no console errors and no hydration warnings.
- `curl -s localhost:3002/ | head` returns HTML.

If a workspace package fails to bundle (a CJS interop error), fix it in that package or with `ssr.optimizeDeps`. Record what you did in `.agents/logs/2026-10-18-cars-workers-port.md`.

- [x] **Step 8: Gate + commit**

```bash
npx turbo run type-check lint build --filter=cars-4by4-builder...
git add -A apps/cars-4by4-builder package-lock.json && git commit -m "build(cars): run on Cloudflare Workers via @cloudflare/vite-plugin"
```

Check `turbo.json`: its build `outputs` already include `dist/**`, so it needs no change unless the build emits elsewhere.

### Task 2: Client IP from Cloudflare

- [x] Replace `src/server/request.ts`:

```ts
import { getRequest, getRequestIP } from "@tanstack/react-start/server";

/**
 * Cloudflare sets cf-connecting-ip and clients can't override it. Never read
 * X-Forwarded-For: the first hop is client-controlled. Local dev (no header)
 * falls back to the socket address.
 */
export function requestIp(): string {
  return getRequest().headers.get("cf-connecting-ip")?.trim() || getRequestIP() || "unknown";
}
```

If `getRequest` isn't exported from `@tanstack/react-start/server`, use the `getRequestHeader` helper from the same module.

- [x] Gate, then commit: `fix(cars): client IP from cf-connecting-ip, never X-Forwarded-For`.

### Task 3: Rate limits in Postgres

- [x] **Step 1: Schema** in `packages/db/src/cars/schema.ts`. Match the file's existing style: plain `timestamp(...)` (no time zone), and import `primaryKey`, `integer` and `index` from `drizzle-orm/pg-core` if they aren't already imported.

```ts
/** Spec 4 §6: fixed-window counters (Workers isolates share no memory). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("rate_limits_expires_at_idx").on(t.expiresAt)],
);
```

Add `"rate_limits"` to `tablesFilter` in `packages/db/drizzle.cars.config.ts`. Rebuild with `npm run build -w @smartekai/db` and commit its `dist`.

- [x] **Step 2: DDL on the Neon branch**

Save this as `.agents/cars-4by4-builder/specs/2026-10-18-rate-limits.sql`:

```sql
CREATE TABLE rate_limits (
  key text NOT NULL,
  window_start timestamp NOT NULL,
  count integer NOT NULL,
  expires_at timestamp NOT NULL,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX rate_limits_expires_at_idx ON rate_limits (expires_at);
```

```bash
psql -1 -v ON_ERROR_STOP=1 "$(npx neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb)" -f .agents/cars-4by4-builder/specs/2026-10-18-rate-limits.sql
```

Check it with `psql "<branch url>" -c '\d rate_limits'`: the columns, primary key and index must match the Drizzle table above. Never run drizzle-kit `push` (it drops legacy sequences).

- [x] **Step 3: `src/server/rate-limit.ts`**

Keep `Rule`, `HOUR` and every `*Rules` export exactly as they are. Replace the `Map`, `prune` and `tryConsume` with:

```ts
import { and, eq, sql } from "drizzle-orm";
import { getDbCars, rateLimits } from "@smartekai/db/cars";

/**
 * Consumes one unit from every rule, or none if any rule is exhausted.
 * Fixed windows in Postgres. A refused rule gives back the units already
 * taken (best-effort: a lost give-back only over-counts, the safe side).
 */
export async function tryConsume(rules: Rule[]): Promise<boolean> {
  const db = getDbCars();
  const now = Date.now();
  const taken: { key: string; windowStart: Date }[] = [];
  for (const r of rules) {
    const windowStart = new Date(Math.floor(now / r.windowMs) * r.windowMs);
    const rows = await db
      .insert(rateLimits)
      .values({ key: r.key, windowStart, count: 1, expiresAt: new Date(windowStart.getTime() + r.windowMs) })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
        setWhere: sql`${rateLimits.count} < ${r.limit}`,
      })
      .returning({ count: rateLimits.count });
    if (rows.length === 0) {
      for (const t of taken) {
        await db
          .update(rateLimits)
          .set({ count: sql`${rateLimits.count} - 1` })
          .where(and(eq(rateLimits.key, t.key), eq(rateLimits.windowStart, t.windowStart)))
          .catch((err: unknown) => console.warn("[rate-limit] give-back failed", err));
      }
      return false;
    }
    taken.push({ key: r.key, windowStart });
  }
  return true;
}

/** Cron (Spec 4 §4): drop counters whose window has ended. */
export async function pruneRateLimits(): Promise<number> {
  const rows = await getDbCars()
    .delete(rateLimits)
    .where(sql`${rateLimits.expiresAt} < now()`)
    .returning({ key: rateLimits.key });
  return rows.length;
}
```

Every rule's limit is ≥ 1, so the first insert in a window always succeeds.

- [x] **Step 4: Callers.** Add `await` at `src/server/credits.ts:70` (`if (await tryConsume(freeRenderRules(ip)))`), `src/lib/credits.ts:57`, `src/lib/builds.ts:100` and `src/lib/builds.ts:171`. Type-check catches any missed caller, because a `Promise` is always truthy. Grep `tryConsume(` to be sure.

- [x] **Step 5: Verify on the branch.** Use a temporary `.mts` script in the scratchpad. Do not commit it.
  - Call `tryConsume(freeRenderRules("203.0.113.9"))` three times; expect `true, true, false`.
  - Call `tryConsume(renderRules("203.0.113.9"))` six times; expect five `true`, then `false`, and the daily row's count stays 5, showing the give-back worked.
  - Delete the test rows afterwards.

- [x] **Step 6:** Gate, then commit: `feat(cars): rate limits in Postgres (rate_limits) for Workers`.

### Task 4: Render through Cloudflare Queues

- [x] **Step 1: `src/server/render-queue.ts`.** It is server-only, so `cloudflare:workers` never reaches the client graph.

```ts
import { env } from "cloudflare:workers";

export type RenderMessage = { buildId: string };

/** Spec 4 §3: the queue consumer in src/server.ts runs runGeneration. */
export async function enqueueRender(buildId: string): Promise<void> {
  await env.RENDER_QUEUE.send({ buildId } satisfies RenderMessage);
}
```

- [x] **Step 2: `src/lib/builds.ts:265`.** Replace `void runGeneration(target.id); …` with the code below. Then remove the now-unused `runGeneration` import, and import `enqueueRender` and `failProcessingBuild` if they aren't already imported.

```ts
    try {
      await enqueueRender(target.id);
    } catch (err) {
      // Never queued, so nothing will run it: fail now (refunds exactly once).
      console.error(`[builds] enqueue of build ${target.id} failed`, err);
      await failProcessingBuild(target.id, "Couldn't start the render — try again.").catch((failErr: unknown) =>
        console.error(`[builds] build ${target.id}: marking failed also failed — the stale sweep refunds it`, failErr),
      );
      return fail("Couldn't start the render — try again.");
    }
    return { ok: true, id: target.id };
```

- [x] **Step 3: Consumer in `src/server.ts`**

```ts
import handler from "@tanstack/react-start/server-entry";
import { runGeneration } from "@/server/generate";
import type { RenderMessage } from "@/server/render-queue";

export default {
  fetch: handler.fetch,
  // max_retries 0 (wrangler.jsonc): runGeneration never rejects and already
  // fails + refunds; a retry would re-bill Gemini.
  async queue(batch: MessageBatch<unknown>) {
    for (const msg of batch.messages) {
      const body = msg.body as Partial<RenderMessage> | null;
      if (body && typeof body.buildId === "string") await runGeneration(body.buildId);
      else console.error(`[queue] malformed message ${msg.id}`);
      msg.ack();
    }
  },
} satisfies ExportedHandler<Env>;
```

- [x] **Step 4: Verify locally on the branch.** Workers' local queue simulation needs no Cloudflare login.
  - Start a guest render in the browser. The build page goes `processing`, then `completed`, and the dev log shows the consumer running.
  - Set `GOOGLE_AI_IMAGE_MODEL=bogus`, re-run `npm run dev-vars`, and render again. Expect the build `failed` and exactly one refund: a `free_render_used` reset, or one `render_refund` ledger row for a credit render.
  - Restore the model.

- [x] **Step 5:** Gate, then commit: `feat(cars): AI render runs in a Cloudflare Queue consumer`.

### Task 5: Cleanup as an hourly cron (subrequest-capped)

- [x] **Step 1: Move the logic.** Move the body of `main()` from `scripts/cleanup.ts` into `src/server/cleanup.ts` as:

```ts
export type CleanupCaps = { stuck?: number; builds?: number };
/** Spec 4 §4. Cron passes caps (Free plan: 50 subrequests per run); the manual script passes none. */
export async function runCleanup(caps: CleanupCaps = {}): Promise<void>
```

Change the logic as follows. Change no other logic.
- **Stuck renders:** select the ids first, with `.limit(caps.stuck)` when set, then run the same status-guarded update with `inArray(builds.id, ids)`. Refund each one that flipped.
- **`staleDrafts` and `expired`:** after deduping into `doomed`, apply `doomed.slice(0, caps.builds ?? Infinity)`. Also add `.limit(caps.builds * 4)` to the two selects when `caps.builds` is set, so the reads stay small.
- **At the end:** call `pruneRateLimits()` and log its count.
- **Imports:** use relative paths matching `src/server/*`, such as `./credits` and `./generate`. Use no `@/` alias, because `tsx` runs the script.

- [x] **Step 2: Thin script wrapper.** Replace `scripts/cleanup.ts` with:

```ts
import { runCleanup } from "../src/server/cleanup";

runCleanup().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Check it under `tsx` against the branch:

```bash
DATABASE_NEONDB_SMARTEKAI="$BR" npx tsx --env-file=../../.env.local scripts/cleanup.ts
```

The shell var wins over `--env-file`; confirm that by checking that the logged host is the branch.

- [x] **Step 3: Add the cron handler** to the default export in `src/server.ts`:

```ts
import { runCleanup } from "@/server/cleanup";
// …
  // Caps keep a run under the Free plan's 50 subrequests: 1 + 5 refunds + 2 reads + 8×3 deletes + 2 ≈ 34.
  async scheduled(_controller: ScheduledController, _env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCleanup({ stuck: 5, builds: 8 }));
  },
```

- [x] **Step 4: Trigger it locally.** Expect the cleanup log lines:

```bash
curl "http://localhost:3002/cdn-cgi/handler/scheduled?cron=17+*+*+*+*"
```

- [x] **Step 5:** Gate, then commit: `feat(cars): hourly cleanup as a Workers cron, subrequest-capped`.

### Task 6: Full click-through (local workerd, Neon branch)

Run the spec §8 list and tick each item in the spec, with one line of evidence per item:
- the pages render;
- the queue render, plus a forced failure that refunds once;
- the third free render from one IP is refused **after restarting the dev server**, proving the limit lives in the DB;
- email sign-up and sign-in, then Google if configured, then guest builds moving to the account;
- an IPN replay signed with `signIpn` from `@smartekai/nowpayments` returns 200, and an unsigned one returns 401;
- the cron runs;
- `npx wrangler deploy --dry-run --outdir /tmp/cars-dry` succeeds; record the bundle size.

Also check `/sitemap.xml`, the `/go/<partId>` redirect, and `/credits` pack buttons up to the point of invoice creation. Do not pay.

Done — evidence for each item is in the spec §8 checklist, plus:
`sitemap.xml` lists the curated slugs; `/go/arb-summit-bullbar` returns **302** to the
part's affiliate URL and writes one `outbound_clicks` row (tested with a temporary
`affiliate_url` on the branch, then reverted — nothing in the branch has one, so the
default is 404); the credits page created invoice **5055666156** (`credit_purchases`
row `c6430572-…`, `starter`, 100 credits, `$14.00`, `pending`, balance still 0) and
sent the browser to `nowpayments.io/payment?iid=5055666156` — **not paid**.

Commit: `docs(cars): Spec 4 local verification`.

### Task 7: Docs

- [x] **`AGENTS.md`, under "This repo":**
  - The **Deployment** bullet: cars is on Cloudflare Workers (`npm run deploy -w cars-4by4-builder`); legal-os and medical-os stay on Dokploy.
  - The **Env files** bullet: cars local dev reads `apps/cars-4by4-builder/.dev.vars`, generated by `npm run dev-vars -w cars-4by4-builder`; production uses wrangler vars and secrets.
- [x] **`.agents/cars-4by4-builder/plans/active.md`:** prepend a current-work line for Spec 4 that points to this plan.
- [x] **`.agents/logs/2026-10-18-cars-workers-port.md`:** record anything surprising from Task 1 Step 7.
- [x] Commit: `docs(cars): Workers deployment and env notes`.

### Task 8 — ASK-FIRST: preview deploy and CPU measurement

**Stop and ask the user.** They need to run `npx wrangler login` and `npx wrangler queues create cars-render`, and approve a preview deploy to `*.workers.dev`. The preview deploy runs against the **branch** database.

1. Create a preview config:
   - copy `wrangler.jsonc` to `wrangler.preview.jsonc`, with `name: "cars-4by4-builder-preview"`, no `routes`, `"workers_dev": true` and no `triggers`;
   - point `BETTER_AUTH_URL` and `PUBLIC_SITE_URL` at the `workers.dev` URL;
   - set the secrets on the preview worker only, with `DATABASE_NEONDB_SMARTEKAI` = the branch URL.

   **Deviations found while doing this (2026-10-18):**
   - `wrangler deploy -c wrangler.preview.jsonc` **cannot work**: bundling `src/server.ts`
     outside Vite fails on the virtual module `tanstack-start-manifest:v`. The plugin
     resolves the entry `wrangler config` at build time and writes the real deploy
     config to `.wrangler/deploy/config.json` → `dist/server/wrangler.json`
     (`no_bundle: true`, assets `dist/client`), which is what plain `wrangler deploy`
     reads. So the preview is built, not just deployed: `vite.config.ts` now passes
     `configPath: process.env.CARS_WRANGLER_CONFIG` to `cloudflare(...)` (unset =
     discover `wrangler.jsonc`, so dev and production are unchanged).
   - The preview host is not known before `wrangler login`, so both URL vars carry the
     literal `PREVIEW_SUBDOMAIN` placeholder; replace it with the account's workers.dev
     subdomain (`wrangler whoami`) and re-build before deploying.
2. Deploy: `CARS_WRANGLER_CONFIG=wrangler.preview.jsonc npx vite build && npx wrangler deploy`
   (no `-c` — the redirect config above is what selects the built preview bundle).
3. Measure CPU. Run sign-up, sign-in, the report page and one render. Read each invocation's **CPU time** in Workers observability (dashboard → the worker → Logs / Observability → `$workers.cpuTimeMs`), or watch `npx wrangler tail cars-4by4-builder-preview --format json`.
4. Record the numbers in the log. If any is over 10 ms, apply the spec §7 fallbacks in order, re-measure, and report to the user before choosing Paid.
5. Delete the preview worker after the user agrees.

**Done (2026-10-19).** Deployed as `cars-4by4-builder-preview` on
`smartekaico.workers.dev` (account `82e8bdf2828490cd4f28d0ce94e4667d`; the
subdomain comes from `GET /accounts/{id}/workers/subdomain` — `wrangler whoami` no
longer prints it). The `cars-render` queue already existed. All 7 §5 secrets that
exist anywhere were set from the generated `.dev.vars`
(`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` exist nowhere, so Google sign-in is dead
on the preview — same as locally). Click-through passed end to end, including the
guest→account build move; the only console error was a `/favicon.ico` 404 (the repo
has no favicon).

CPU, from `wrangler tail --format json` (61 invocations, 60 `ok` + 1 client-aborted
server function). Free's budget is 10 ms per request:

| invocation | CPU ms |
|---|---|
| `POST /api/auth/sign-up/email` | **84** |
| `POST /api/auth/sign-in/email` | **78, 84** |
| queue render (consumer) | **339** (12 423 ms wall) |
| `GET /` | 7–**37** |
| `GET /builds/<id>/report` | 2, **37** |
| `GET /builds/<id>` · `/projects` · `/credits` · `/build` | 10 · 7 · 6 · 8 |
| `POST /api/auth/sign-out` · `sign-in/anonymous` | 7, 12 · 5 |
| server functions (`/_serverFn/…`) | 0–13 |

The account is **still on Workers Free** (`cf accounts subscriptions get`: three
Free zones + `R2 Paid` + `Teams Free Base`, no Workers Paid).

**§7.1 was then applied (2026-10-19).** Production turned out to hold no password
hashes at all (`cars_account` is empty), so `emailAndPassword.password` now uses Web
Crypto PBKDF2-HMAC-SHA256 (`pbkdf2Password` in `packages/auth/src/factory.ts`), with
Better Auth's own verifier as the fallback for any `salt:key` row. Two things came
out of it:

- **workerd rejects PBKDF2 above 100 000 iterations** (`NotSupportedError: Pbkdf2
  failed: iteration counts above 100000 are not supported`), so the constant is
  100 000 — the platform ceiling, and still 6× below OWASP's floor for
  PBKDF2-SHA256. Sign-up/sign-in CPU fell from 78–84 ms to **18–22 ms**; a legacy
  scrypt row still costs 76 ms until that password is re-set.
- **The "Paid is forced" verdict above was wrong.** It compared the render consumer's
  339 ms against the *HTTP* cap, but queue consumers get **30 s CPU on Free as well as
  Paid** (Queues limits: "the maximum CPU time per consumer Worker invocation is set
  to 30 seconds", on a page whose limits "apply to both … plans"). Renders were never
  the blocker. Warm page loads all fit (p90 8–10 ms), so password auth is the only
  HTTP route over 10 ms — and 25/25 burst sign-ups at 84 ms returned 200, with no
  `exceededCpu` in ~130 measured invocations.

So the port **runs on Workers Free**: fallback 2 is unnecessary, fallback 3 is a
capacity choice rather than a blocker, and the remaining call is the user's — keep the
cheaper-but-weaker hash, move hashing to a Durable Object (which has a 30 s budget, so
scrypt can stay), or go Paid. Numbers and reasoning:
`.agents/logs/2026-10-18-cars-workers-port.md`, "Task 8" section.

### Task 9 — production go-live (DONE 2026-10-22, except the paid round-trip)

The user approved the cutover and chose this order. Each step below is what actually ran.

- [x] **Apply the DDL.** `psql "$DATABASE_NEONDB_SMARTEKAI" -w -v ON_ERROR_STOP=1 -1 -f
      .agents/cars-4by4-builder/specs/2026-10-18-rate-limits.sql` against
      `ep-winter-frost-b1drw3en-pooler` (production) → `CREATE TABLE` + `CREATE INDEX` in
      one transaction, confirmed in `information_schema` + `pg_indexes`. The table was
      **absent** beforehand, so deploying first would have 500'd every rate-limited route.
- [x] **Free the queue consumer, then delete the preview worker.** `wrangler delete`
      refuses while the worker is a queue consumer (`code 10064`), so:
      `wrangler queues consumer remove cars-render cars-4by4-builder-preview`, then
      `wrangler delete cars-4by4-builder-preview`. Verified via API afterwards:
      `cars-render` consumers `[]`, producers `[]`, account workers `[]`.
- [x] **Secrets before the first deploy.** `npm run deploy` validates the module scope, so a
      missing secret aborts the upload (`AWS_ACCESS_KEY_ID is not set — packages/storage
      needs it to reach Neon Object Storage`) and the worker is never created.
      `wrangler secret bulk` with the 9 §5 values from root `.env.local` creates the worker
      and its secrets in one step; the deploy then uploads code + `vars` over it.
- [x] **Deploy.** `npm run deploy -w cars-4by4-builder` → `Uploaded cars-4by4-builder`
      (4393.42 KiB / gzip 978.67 KiB, startup 98 ms) and `Deployed cars-4by4-builder
      triggers`: `cars.smartekai.com` (custom domain), `schedule: 17 * * * *`, Producer +
      Consumer for `cars-render`. Version `856b0a3a-ee37-482f-9880-58d2160c12b6`.
- [x] **Confirm DNS and the custom domain.** No `cars.smartekai.com` record existed; the
      deploy created it. `dig` → 172.67.208.218 / 104.21.91.25; `/` → 200, TLS 49 ms, cert
      issued.
- [ ] **Google OAuth redirect — open, user action.** The client now exists and Better Auth
      sends `redirect_uri=https://cars.smartekai.com/api/auth/callback/google`, but Google
      answers `Error 400: redirect_uri_mismatch`. Add that URI to the OAuth client
      (`1059490591744-…apps.googleusercontent.com`) in the Google console.

Smoke test, all against production:

- [x] `/` → 200, title "4x4 Builder — see upgrades on your truck before you buy".
- [x] **Guest render through the queue.** Wrangler JL + Overlander (6 parts, est. $12,470)
      + studio photo → build `bbf01940-d8d9-4672-b856-bf53bd2d9cea` went `processing` →
      `completed` in ~19 s with `charge: free` and `render_key
      renders/bbf01940-….jpeg`; the page shows before/after at 1408×768 straight from Neon
      Object Storage. This also wrote the first 3 `rate_limits` rows (free-daily,
      render-daily, render-hourly for the guest IP), so the new DDL is exercised in prod.
- [x] **Sign-up** — `smoke-test-1021@smartekai.com` via the toggle on `/sign-in`; its
      `cars_account` row is `pbkdf2-sha256$100000` (90 chars) — §7.1 is live in production.
- [x] **Sign-in** — same account; header shows "0 credits / My projects / Sign out".
      `wrangler tail`: `POST /api/auth/sign-in/email` **21 ms CPU** / 357 ms wall.
- [x] **Cron registered** — `schedules` → `17 * * * *`.
- [x] Auth-gated routes redirect when signed out: `/sign-in`, `/credits`, `/projects`,
      `/builds/<slug>/report` → 307. (`/builds/<slug>.report` is not a URL; the app links
      `/builds/<slug>/report`.)
- [ ] **Paid round-trip** — open: a real settled $14 payment ending with "✓ 100 credits
      added". Never pay the unconsumed invoices (`5869119746`, `5683911791`, `5102802102`,
      `5899540544`, `5055666156`).
- [ ] Confirm the first cron run in the logs (`:17`).

Finally, ask the user before merging `feat/cars-cloudflare` into `main`. **Asked and
approved on 2026-10-22** — merged fast-forward after the launch-gap work below.

**Operational notes from the cutover**

- `NOWPAYMENTS_ENV=live` is in `vars`: production takes real payments from now on.
- `GOOGLE_AI_IMAGE_MODEL` is not in `vars`; `packages/ai` falls back to
  `gemini-3.1-flash-image` (the same model the preview used).
- `NOWPAYMENTS_IPN_IPS` is unset. The IPN handler still verifies the HMAC signature and
  re-fetches the payment from the API, so the allowlist is defense-in-depth only.
- Test artifacts **removed 2026-10-22**: user `smoke-test-1021@smartekai.com` (its
  `cars_account`/`cars_session` rows cascaded), guest build `bbf01940-…` plus its
  `renders/` object, and the three unreferenced branch-era renders — see the launch-gap
  section below.

---

## Task 10: Launch gaps (2026-10-22)

Go-live left two visible dead ends and no way to fill the catalog. Scope picked by the
user: hide the dead ends, add affiliate-link import, merge to `main`, clean up. (A fresh
$14 invoice and the IPN watch were offered and deliberately not picked.)

- [x] **Step 1: Gate Google on both sides.** Credentials alone were not enough — the
      OAuth client still lacks `https://cars.smartekai.com/api/auth/callback/google`, so
      the button existed only to fail. New `src/server/social-auth.ts` exports
      `googleProvider()`, the single source of truth: returns the config only when
      `AUTH_GOOGLE_ENABLED === "true"` **and** both secrets are set. `src/lib/auth.ts`
      uses it for `socialProviders`, and `src/lib/auth-options.ts` (a `createServerFn`)
      reports `{ google: boolean }` to `/sign-in`'s loader, which now renders the button
      and its "or" divider only when true. `AUTH_GOOGLE_ENABLED: "false"` added to
      `wrangler.jsonc` vars, `turbo.json` `globalEnv`, and `scripts/dev-vars.ts` keys.
      **Flip to `"true"` after the console fix — one var, no code change.**
- [x] **Step 2: Drop the "Link coming soon" placeholder** in `ShopList.tsx`. The schema
      comment already said `null = no partner link yet (Buy stays hidden)`; the UI
      contradicted it. Parts still list with their prices; only the dead CTA is gone.
- [x] **Step 3: `scripts/parts-links.ts` + `parts:links` script.** Reads `partId,url`
      rows (header optional, `#` comments, blank lines skipped), then validates every
      row before writing: known part id, parseable `https:` URL, no duplicate ids — and
      warns when an Amazon host has no `tag=` parameter. Problems print with line numbers
      and exit 1 with nothing written. Writes sequentially because neon-http has no
      transactions; re-running the same CSV is safe. Documented as
      `npm run parts:links -- <file.csv>`.
- [x] **Step 4: Verify.** Scoped `type-check` + `lint` + `build` green. Import script
      exercised against the **branch** DB only: bad file (unknown id, duplicate, `http:`,
      no-comma row) → 4 problems listed, exit 1, `0 parts with a link`; good file →
      2 parts linked, then reverted to null. Production deploy → version `97027b9e`;
      `/sign-in` has 0 Google buttons and still renders the email form; a build page has
      0 "Link coming soon" and still renders "Shop this build"; `POST
      /api/auth/sign-in/social` → 404 `PROVIDER_NOT_FOUND`; Playwright email sign-in still
      lands signed in with the credits header.
- [x] **Step 5: Production cleanup.** Deleted guest build `bbf01940-…` and user
      `smoke-test-1021@…` in one transaction (`cars_account`/`cars_session` cascade;
      `builds.user_id` is `SET NULL` so the build went first). Enumerated both buckets
      with `ListObjectsV2` and compared keys against `builds.render_key` /
      `original_image_key` / `vehicles.stock_image_key`: 3 branch-era renders were
      unreferenced, and the deleted guest build's render became the 4th. All 4 deleted;
      the 9 live renders and 3 `stock/*` bases still return 200, the 4 deleted keys 404.
      Final production state: 3 anonymous users, 9 curated builds, 0 accounts,
      0 purchases, `cars-uploads` empty.
- [x] **Step 6: Merge.** `feat/cars-cloudflare` fast-forwards `main` (user approved).

**Left for the user:** 21 affiliate URLs as a CSV (start from
`scripts/parts-links.template.csv`; blank rows are skipped), and one real payment for the
credits path (postponed 2026-10-22). The Google console redirect URI was registered and
`AUTH_GOOGLE_ENABLED` flipped to `"true"` on 2026-10-22 (version `ded87cbb`) — the button
now reaches Google's account chooser with no `redirect_uri_mismatch`.

---

## Task 11: Coming-soon gate (2026-10-22)

User asked for the site to be deactivated until it is fully ready, with a coming-soon
notice instead. Done as a config flag at the Worker entry rather than by removing the
custom domain or deleting the Worker, so the domain still answers politely in one request.

- [x] **Step 1: Gate before the app.** `src/server/coming-soon.ts` holds the page and
      `comingSoon()`; `src/server.ts`'s `fetch` returns `comingSoonResponse()` when
      `COMING_SOON === "true"`, otherwise hands off to TanStack exactly as before. Because
      the check is in the Worker entry, it covers every path — routes, server functions,
      `/api/auth/*`, `/go/<part>`, `/sitemap.xml`, `robots.txt` — including POSTs. The
      `queue()` and `scheduled()` handlers are untouched, so the render queue and the
      hourly cleanup keep working internally.
- [x] **Step 2: Search engines.** 503 + `Retry-After: 3600` (temporary unavailable, so
      crawlers keep the URL instead of indexing a placeholder as the site), plus
      `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` so a visitor cannot
      get a cached coming-soon page after launch.
- [x] **Step 3: The page.** Self-contained HTML — no app CSS/JS, no network requests, so it
      renders even if the app bundle is broken. Dark theme, brand, "Coming soon", one line
      about what is being finished, the product hook, and the domain.
- [x] **Step 4: Config.** `COMING_SOON: "true"` in `wrangler.jsonc` vars, and
      `COMING_SOON` added to `turbo.json` `globalEnv`. Deliberately **not** added to
      `scripts/dev-vars.ts`, so local dev never inherits the gate.
- [x] **Step 5: Verify (version `4cf82c99`).** 503 on `/` (with the page, 2 580 bytes, no
      `/assets/` reference), `/build`, `/sign-in`, `/credits`, `/projects`,
      `/builds/land-cruiser-overlander`, `/go/arb-summit-bullbar`, `/sitemap.xml`,
      `/robots.txt`, `/api/auth/session`, `POST /api/auth/sign-in/email` and
      `POST /api/render`. `type-check` clean, `lint` 0 errors (the 2 warnings are the
      pre-existing unused eslint-disable comments in the generated
      `worker-configuration.d.ts`).
- [x] **Step 6: Launch path.** Flip `COMING_SOON` to `"false"` and redeploy; nothing else
      changes.

**Known nuance:** `/assets/*` keeps being served by Cloudflare's static asset handler —
those requests never reach the Worker, so they cannot be gated. The files are inert
without the HTML that references them; if that ever needs closing, it is an
`assets.run_worker_first` decision, which would have to be re-verified against asset
serving at launch.

## Task 12: Preview bypass, waitlist and launch QA (2026-10-22)

**Why:** the gate made two things impossible — verifying the real app (every path answered
503, so a change could only be checked by flipping the flag and flipping it back) and
doing anything useful with the visitors who did arrive. This task adds both without
opening the site.

- [x] **Step 1: Preview bypass (no new secret).** `src/server/coming-soon.ts` derives the
      token as `base64url(HMAC-SHA256(BETTER_AUTH_SECRET, "cars-preview-gate"))[0..32)`. A
      request to `?preview=<token>` is answered with **303 to the same URL with the parameter
      removed** plus `cars_preview=<token>` (`HttpOnly; Secure; SameSite=Lax; Max-Age=604800`),
      so the token does not linger in the address bar, history or a `Referer`; requests that
      already carry the cookie go straight to `handler.fetch`. Comparison is constant-time,
      and a wrong token falls through to the page with no hint that the mechanism exists.
      Rotating `BETTER_AUTH_SECRET` invalidates every preview link. Nothing is set as a
      secret and nothing is committed.
- [x] **Step 2: Waitlist.** `POST /api/waitlist` (handled in the Worker entry, before the
      gate) takes the page's plain HTML form: `email` + a hidden `website` honeypot, no JS.
      The address is trimmed, lowercased, length-capped at 254 and checked with a loose
      regex; the provider is the real validator. `waitlist_signups` has a unique `email`, and
      the insert is `onConflictDoNothing`, so a repeat sign-up is silent — the page must not
      reveal whether an address is already on the list. Rate limit is 5/hour/IP through the
      existing DB-backed `tryConsume` (`waitlist:h:<ip>`, `cf-connecting-ip` read directly
      because TanStack's request context does not exist this early). Responses are
      post/redirect/get: 303 to `/?joined=1`, or `/?error=invalid|slow|unavailable`; the page
      renders the notice and hides the form once joined.
- [x] **Step 3: Schema.** `waitlistSignups` in `packages/db/src/cars/schema.ts`, `"waitlist_signups"`
      added to `drizzle.cars.config.ts` `tablesFilter`, and the additive DDL written to
      `.agents/cars-4by4-builder/specs/2026-10-22-waitlist.sql` and applied by hand to the
      branch and production databases (`db:push:cars` must never run against production).
      `@smartekai/db` rebuilt so the committed `dist/` matches `src/`.
- [x] **Step 4: Verify the gate still holds (version `1be126ea`).** Anonymous `/` and
      `/build` → 503; a wrong `?preview=` → 503 with no hint; the right one → 303 +
      `Set-Cookie`; with the cookie `/` 200, `/build` 200, `/sitemap.xml` 200, `/sign-in` 307
      (auth redirect), and the home body is the real app markup. `POST /api/waitlist`: valid
      → 303 `/?joined=1` and one row; duplicate in different case → 303 and still one row;
      invalid → 303 `/?error=invalid` and no row; honeypot filled → 303 `/?joined=1` and no
      row; the limiter refused the request that made five in the hour for that IP. The page
      renders "You're on the list — we'll email you the moment it opens." with zero email
      inputs after joining, and the invalid-email text for the error state.
- [x] **Step 5: Full QA pass under the preview cookie.** Home renders 9 curated cards;
      `/builds/land-cruiser-overlander` renders with **0 buy links and no "Link coming soon"**
      (the affiliate gap is invisible rather than broken) and the "Full build report" CTA;
      `/credits` → `/sign-in?next=%2Fcredits`; the configurator Toyota → 3 parts →
      "3 parts · est. $5,350" (2 450 + 1 150 + 1 050 + 7 h × $100 — the pricing math is
      right) → studio photo → build `c7cbae96-…` → queue render completed in ~25 s with the
      before/after slider, the shop list, "Estimated total $5,350", the report gate and
      "Full-size image ↗"; "Unlock full report" → `/sign-in?next=…%2Freport`.
- [x] **Step 6: Clean up the QA artifacts.** Deleted build `c7cbae96-…`, the anonymous user
      it created, `renders/c7cbae96-….jpeg` from `cars-renders`, and the `free:d`/`render:d`/
      `render:h` counter rows; production is back to 3 users, 9 curated builds, 0 purchases,
      0 ledger rows, 0 waitlist rows, 0 rate-limit rows, and the build URL 404s.
- [x] **Step 7: Confirm the cron.** Cloudflare's Workers Observability telemetry query API
      returned three `origin: scheduled` events for `2026-10-21T23:17:27Z` — trigger
      `17 * * * *`, `outcome: ok`, 192 ms wall / 18 ms CPU — logging
      `cleanup: removed 0 builds, 0 stale guests, 1 rate-limit windows` and
      `cleanup: timed out and refunded 0 stuck renders`. That closes the "first cron run"
      open item from Task 9; the command is recorded in the log.

**Launch checklist (what is left):** the 21 affiliate URLs (`0 of 21` — fill
`apps/cars-4by4-builder/scripts/parts-links.template.csv` and run `npm run parts:links`);
one settled $14 payment (`confirmed`/`finished` → `credited` still never observed, postponed
by the user); the PBKDF2-vs-Durable-Object-vs-Paid hash decision. Then flip `COMING_SOON` to
`"false"` and redeploy. The 3 anonymous users and the AI studio stock shots are not blockers.

## Task 13: Hostname rename to overlander.smartekai.com (2026-10-23)

**Why:** the product is an overland build configurator; the public host now matches
("overlander", not "cars"). Scope was deliberately **hostname only** — the UI still says
"4x4 Builder" — with the old host kept as a permanent redirect.

- [x] **Step 1: Two custom domains.** `wrangler.jsonc` lists
      `overlander.smartekai.com` first (canonical, serves) and `cars.smartekai.com` second
      (kept only so the Worker can hand visitors over). Both are Workers custom domains, so
      Cloudflare creates the proxied `AAAA 100::` records and certificates itself; both
      records now exist.
- [x] **Step 2: The redirect.** `src/server.ts` compares the request host before anything
      else: **GET/HEAD** on the legacy host gets a **301 to the same path and query** on the
      canonical host, and every other method is left alone. Two reasons for that shape —
      `?preview=` must survive the hop (otherwise existing preview links break), and a
      webhook posted to the old host must not be answered with a redirect it may refuse to
      follow. The check runs before the gate, so it applies whether `COMING_SOON` is on or
      off.
- [x] **Step 3: Everything that carries a URL.** `BETTER_AUTH_URL` and `PUBLIC_SITE_URL` are
      the new host (auth `baseURL` + callbacks, sitemap, new NOWPayments invoices);
      `trustedOrigins` in `src/lib/auth.ts` follows; the gate page's footer host was
      hard-coded and now reads `overlander.smartekai.com`; the one literal host in the
      tracked `worker-configuration.d.ts` was patched to match (the file was not regenerated
      wholesale — `wrangler types` with a local `.dev.vars` also rewrites every var to
      `string` and adds the secret names, which is unrelated churn).
- [x] **Step 4: Google OAuth (user action).** The client needed
      `https://overlander.smartekai.com/api/auth/callback/google`; the user added it before
      the cutover, and the switch was sequenced behind that.
- [x] **Step 5: Deploy and verify (version `803df561`).** First attempt died with
      `fetch failed` during the upload after 162 s — a network error, nothing published;
      the retry deployed cleanly. Verified: new host 503 with the gate page (footer names
      the new host, waitlist form present, zero mentions of the old one); TLS verified;
      `?preview=` unlock 303 → cookie → real app 200; old host 301 on `/`, `/build?parts=…`,
      `/builds/<slug>`, `/sitemap.xml` and `/?preview=…` with path+query intact; `POST`
      is **not** redirected (303 from the handler, 0 redirects); sitemap emits
      `https://overlander.smartekai.com/…`; Better Auth returns a Google URL whose
      `redirect_uri` is the new callback, and a real click reaches Google's account chooser
      with no `redirect_uri_mismatch`. Queue consumer and the `17 * * * *` cron were listed
      in the deploy output, so they are untouched.
- [x] **Step 6: Cleanup.** The POST-on-legacy-host test wrote one waitlist row
      (`nobody@example.com`); it and its rate-limit rows were deleted. Production is back to
      0 waitlist rows.

**Known nuances:** `/assets/*` on the legacy host is answered by Cloudflare's static asset
handler before the Worker runs, so those requests do not redirect — inert files without the
HTML that references them. And the preview cookie is host-scoped, which is why the redirect
preserves `?preview=`: the browser lands on the new host, redeems the token and gets a
cookie for the new host.

**To retire the old host completely:** delete the second `routes` entry and the
`cars.smartekai.com` DNS record, and drop the redirect block in `src/server.ts`; one deploy.
Nothing else depends on it.
