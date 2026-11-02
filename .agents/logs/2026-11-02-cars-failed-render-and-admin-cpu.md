# 2026-11-02 — cars: failed-render limits, AvantLink Part A, /admin CPU, bootstrap cleanup

## Failed renders give back rate-limit units (plan 1)
- `packages/db/src/cars/schema.ts`: `builds.rate_limit_refs jsonb` (nullable), `RateLimitRef` type.
- Production DDL applied: `alter table builds add column if not exists rate_limit_refs jsonb;` (direct URL, `psql -1`). Rehearsed on `cars-credits` first.
- `src/server/rate-limit.ts`: `tryConsume` now returns `RateLimitRef[] | null`; added `giveBack()`.
- `src/server/credits.ts`: `chargeRender` returns `refs`; `RenderCharge` carries `refs`.
- `src/lib/builds.ts`: stores `rate_limit_refs` on processing builds; gives back on every in-request refusal; daily cap counts only `processing`/`completed`.
- `src/server/generate.ts`: `failProcessingBuild` gives back from stored refs (exactly once).
- `src/server/cleanup.ts`: timed-out sweep gives back per refunded build.
- Deployed version `c5f5371c-d16f-4a4a-8190-946c4217272e`. Gate PASSED; dry-run ok.

## AvantLink Part A (code only, Part B waits for approval)
- `src/lib/store.ts`: `storeOf` unwraps one level of AvantLink/CJ/Impact link and classifies the destination host. Spot-checks passed (`arb`, `4wheelparts`, `other` for missing/invalid/look-alike). `links:check` shows the unwrapped store. Merged, not deployed (waits for Part B).

## Authenticated /admin CPU
- Measured with wrangler tail (JSON): `/admin` (signed in as admin) = 34 ms CPU, 185 ms wall, outcome ok.

## Bootstrap cleanup
- Removed `ADMIN_BOOTSTRAP_EMAIL` from `wrangler.jsonc` vars and redeployed (`eae77ee4-1e73-4e33-9df0-f9151d1baef3`). Admin account `smartekaico@gmail.com` remains admin. Dev-vars KEYS entry retained for local testing.