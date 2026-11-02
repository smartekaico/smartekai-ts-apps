# Failed renders give back their rate-limit units — Task

> For the implementing agent. Steps use `- [ ]` checkboxes.

**Problem** (found in `.agents/logs/2026-10-26-patch-deps.md`): a render that fails
is refunded (credits or the free render come back, exactly once), but the
**rate-limit counters it used are not**. One failed render burns:

- `render:h:<ip>` (5/hour) and `render:d:<ip>` (15/day), taken in `startBuild`
  (`src/lib/builds.ts`, `tryConsume(renderRules(ip))`);
- `free:d:<ip>` (2/day), taken in `chargeRender` (`src/server/credits.ts`) on the
  free path.

So when Gemini fails (the 2026-10-26 billing outage returned HTTP 402 on every
render), a guest gets their free render back but can't use it until tomorrow:
`free:d` is spent. Two smaller leaks of the same kind:

- `startBuild` consumes `renderRules` and then can still refuse **in the same
  request** (daily capacity cap, no session user, `chargeRender` refusal such as
  `buy-credits` / `confirm-credits` / `sign-in`). Those units are never given back.
- The global daily cap counts `ne(builds.status, "draft")`, so **failed** renders
  count against `CARS_DAILY_RENDER_CAP` too.

**Goal:** a render that doesn't happen, or fails, costs the user no rate-limit
units and no global capacity. Successful renders are unchanged.

## Ground rules

- Branch `fix/cars-failed-render-limits` from `main`. Never commit to `main`;
  merging and the production deploy need the user's OK.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- One additive column → hand DDL. **Never `db:push:cars`.** Rehearse on the Neon
  branch `cars-credits` (project `ancient-hall-95124568`) with `psql -1` over the
  direct URL; **ask before production**, and apply it **before** the deploy.
- Local dev only against `cars-credits`
  (`DATABASE_NEONDB_SMARTEKAI="$(npx neon connection-string cars-credits --project-id ancient-hall-95124568 --pooled)" npm run dev-vars -w cars-4by4-builder`).
- Keep the exactly-once guarantees. A give-back runs only on the path that
  actually flipped the build to `failed` (that flip is already exactly-once).
  A lost give-back only over-counts, which is the safe side, so it is best-effort
  and never throws.
- Each forced failure on the branch costs nothing at Gemini if you break the
  model name (`GOOGLE_AI_IMAGE_MODEL=bad-model` in `.dev.vars`). Don't spend real
  renders to test failure.

## Design

A build remembers the rate-limit units its render took, and the failure path
hands them back.

- New column `builds.rate_limit_refs jsonb` (nullable): an array of
  `{ "key": string, "windowStart": ISO string }`, one entry per unit taken.
- `tryConsume` reports what it took; a new `giveBack(refs)` decrements those rows
  (`count = count - 1 WHERE key = … AND window_start = … AND count > 0`). If the
  window has already rolled over, the row is in a past window (or pruned), so
  nothing useful changes and nothing breaks.

## Files

- `packages/db/src/cars/schema.ts` (column)
- `apps/cars-4by4-builder/src/server/rate-limit.ts`
- `apps/cars-4by4-builder/src/server/credits.ts` (`chargeRender`)
- `apps/cars-4by4-builder/src/lib/builds.ts` (`startBuild`)
- `apps/cars-4by4-builder/src/server/generate.ts` (`failProcessingBuild`)
- `apps/cars-4by4-builder/src/server/cleanup.ts` (timed-out sweep)

## Steps

### 1. Column + DDL

- [ ] `builds`: `rateLimitRefs: jsonb("rate_limit_refs").$type<RateLimitRef[]>()`,
  exporting `type RateLimitRef = { key: string; windowStart: string }` from the
  schema module (types come from the schema; don't hand-write it in the app).
- [ ] DDL, rehearse on the branch, `\d builds` to confirm:

```sql
alter table builds add column if not exists rate_limit_refs jsonb;
```

- [ ] Commit `feat(cars): builds.rate_limit_refs column`.

### 2. `rate-limit.ts`

- [ ] `tryConsume(rules)` returns `RateLimitRef[] | null`: the refs taken on
  success, `null` when refused (it already gives back partial units on refusal;
  keep that). Update the four callers: `checkoutRules` and `photoRules` callers
  only test for `null`.
- [ ] Add `export async function giveBack(refs: RateLimitRef[] | null | undefined): Promise<void>`:
  one parameterized update per ref, `count > 0` guard, errors logged with
  `console.warn("[rate-limit] give-back failed", …)` and swallowed.
- [ ] Commit `feat(cars): rate-limit give-back`.

### 3. In-request refusals give back (`startBuild`, `chargeRender`)

- [ ] `chargeRender` returns the refs it took for `free:d` with a free charge
  (`{ ok: true, charge: "free", refs }`); a credit charge returns `refs: []`.
- [ ] `startBuild`: keep the `renderRules` refs. On **every** `return fail(...)`
  after that point (capacity cap, no user, charge refused, draft not found / not
  owned, the flip-or-insert not taking), call `giveBack(renderRefs)` first.
  Cleanest: a local `refuse(message, action?)` that gives back then returns
  `fail(...)`.
- [ ] When the build flips to `processing`, store
  `rateLimitRefs: [...renderRefs, ...chargeRefs]` in the same update/insert.
- [ ] Global cap: count builds with `status in ('processing', 'completed')` instead
  of `ne(status, 'draft')`, so failed renders free their capacity.

### 4. Failures give back (exactly once)

- [ ] `failProcessingBuild`: its update already returns a row **only** for the
  call that flipped the build. Add `rateLimitRefs: builds.rateLimitRefs` to its
  `.returning(...)`, then after `refundFailedBuild(buildId)` call
  `await giveBack(rows[0].rateLimitRefs)`. This covers the queue consumer's
  failure, `startBuild`'s queue-send failure and the read-time stale sweep.
- [ ] `cleanup.ts` timed-out sweep: it flips builds to `failed` itself, then
  refunds each. Return `rateLimitRefs` from that update and call `giveBack` per
  refunded build (still inside the existing per-run cap: one extra query per ref,
  ≤ 3 per build, so check the cron stays under the 50-subrequest budget —
  lower the stuck-render cap from 5 to 4 if it doesn't).
- [ ] Don't touch `refundFailedBuild`'s CTEs.
- [ ] Commit `fix(cars): failed or refused renders give back their rate-limit units`.

### 5. Verify on `cars-credits`

Inspect counters with `select key, window_start, count from rate_limits where key like '%<your ip>%' order by key;`.

- [ ] Guest, broken image model: start a render → build `failed`, free render
  released, and `free:d`, `render:h`, `render:d` are back to their previous counts.
  Start again → allowed (before the fix it was refused once `free:d` hit 2).
- [ ] Account with 10 credits, broken model: render fails → credits refunded
  (ledger `refund` row) and `render:h`/`render:d` back; `free:d` untouched.
- [ ] Account with 0 credits and free render used: `startBuild` refuses with
  `buy-credits` → `render:h`/`render:d` unchanged.
- [ ] Working model: a successful render keeps its counts (no give-back) and
  `rate_limit_refs` holds the 2 or 3 refs.
- [ ] Two concurrent failure paths on one build (e.g. stale read sweep + consumer
  failure): only one gives back (counts drop once).
- [ ] Cron: `curl "http://localhost:3002/cdn-cgi/handler/scheduled?cron=17+*+*+*+*"`
  with a timed-out build present → refunded and given back, no errors.
- [ ] Gate passes; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry` succeeds.

### 6. Ship (ask first)

- [ ] Ask for production DDL, apply it with `psql -1` over the production direct
  URL, `\d builds`.
- [ ] Ask to merge and deploy (`npm run deploy -w cars-4by4-builder`); after deploy,
  `/`, `/build` 200 and one real render completes (1 Gemini call, ask first).
- [ ] Log in `.agents/logs/`, current-work line in `.agents/cars-4by4-builder/plans/active.md`.

## Done when

A failed or refused render leaves `rate_limits` as if it never ran; successes are
unchanged; failed builds don't count toward the daily cap; the gate passes;
production DDL and deploy happened only with the user's OK.

## Out of scope

Changing the limits themselves, per-account (instead of per-IP) limits, the
`checkout` and `photo` limits' behaviour beyond the new return type.
