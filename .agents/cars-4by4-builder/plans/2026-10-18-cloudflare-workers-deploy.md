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

- [ ] **`AGENTS.md`, under "This repo":**
  - The **Deployment** bullet: cars is on Cloudflare Workers (`npm run deploy -w cars-4by4-builder`); legal-os and medical-os stay on Dokploy.
  - The **Env files** bullet: cars local dev reads `apps/cars-4by4-builder/.dev.vars`, generated by `npm run dev-vars -w cars-4by4-builder`; production uses wrangler vars and secrets.
- [ ] **`.agents/cars-4by4-builder/plans/active.md`:** prepend a current-work line for Spec 4 that points to this plan.
- [ ] **`.agents/logs/2026-10-18-cars-workers-port.md`:** record anything surprising from Task 1 Step 7.
- [ ] Commit: `docs(cars): Workers deployment and env notes`.

### Task 8 — ASK-FIRST: preview deploy and CPU measurement

**Stop and ask the user.** They need to run `npx wrangler login` and `npx wrangler queues create cars-render`, and approve a preview deploy to `*.workers.dev`. The preview deploy runs against the **branch** database.

1. Create a preview config:
   - copy `wrangler.jsonc` to `wrangler.preview.jsonc`, with `name: "cars-4by4-builder-preview"`, no `routes`, `"workers_dev": true` and no `triggers`;
   - point `BETTER_AUTH_URL` and `PUBLIC_SITE_URL` at the `workers.dev` URL;
   - set the secrets on the preview worker only, with `DATABASE_NEONDB_SMARTEKAI` = the branch URL.
2. Deploy: `npx vite build && npx wrangler deploy -c wrangler.preview.jsonc`.
3. Measure CPU. Run sign-up, sign-in, the report page and one render. Read each invocation's **CPU time** in Workers observability (dashboard → the worker → Logs / Observability → `$workers.cpuTimeMs`), or watch `npx wrangler tail cars-4by4-builder-preview --format json`.
4. Record the numbers in the log. If any is over 10 ms, apply the spec §7 fallbacks in order, re-measure, and report to the user before choosing Paid.
5. Delete the preview worker after the user agrees.

### Task 9 — ASK-FIRST: production go-live

Each of these needs the user's go-ahead:
- apply `2026-10-18-rate-limits.sql` to production (direct URL, `psql -1`);
- run `wrangler secret put` for each spec §5 secret (the user pastes the values);
- `npm run deploy`;
- add the Google OAuth redirect `https://cars.smartekai.com/api/auth/callback/google`;
- confirm DNS and the custom domain.

Then:
- smoke-test `/`;
- run the open Spec 3 payment test: a real $14 payment ends with "✓ 100 credits added";
- confirm a cron run in the logs.

Finally, ask the user before merging `feat/cars-cloudflare` into `main`.
