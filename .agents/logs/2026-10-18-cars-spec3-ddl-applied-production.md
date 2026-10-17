# Spec 3 credits DDL applied to production — 2026-10-18

## Symptom

The cars home page (`GET /`) — the "main url" on local dev, `localhost:3002` —
failed with:

```
Failed query: select "id", "slug", "vehicle_id", ..., "charge", ... from "builds"
where ("builds"."is_curated" = $1 and "builds"."status" = $2)
params: true, completed
```

(`getGallery` in `apps/cars-4by4-builder/src/lib/builds.ts` does
`db.select().from(builds)` — all columns, including the Spec 3 `charge`.)

## Root cause

The running code (`feat/cars-credits`) needs the Spec 3 schema, but the database
it talks to did not have it. Local cars dev reads `DATABASE_NEONDB_SMARTEKAI`
from the **monorepo-root** `.env.local` (the app-level `.env.local` does not set
it), and that points at the Neon **production** branch — pooled host
`ep-winter-frost-b1drw3en-pooler.c-5.eu-central-1.aws.neon.tech`.

`neon diff cars-credits production` named the drift exactly: `builds.charge`,
`cars_user.credit_balance`, `cars_user.free_render_used`, and the
`credit_ledger` / `credit_purchases` tables with their PKs, uniques, FKs and
indexes — all present on the rehearsal branch, all absent on production.

This was the production DDL apply that had been deliberately held. Not a code
bug: code one migration ahead of its database.

Contributing factor: the shared root `.env.local` (the turborepo skill's
"root `.env` affects all packages implicitly" anti-pattern) means a local cars
change silently runs against the production database.

## What we did

Applied the canonical Spec 3 DDL (`specs/2026-10-16-credits-and-paypal-checkout-design.md`
§ "Canonical DDL (production migration)") to production — additive only, one
transaction, over the **direct** (non-pooler) connection, with the user's
approval:

```bash
psql "$(neon connection-string production --project-id ancient-hall-95124568 --database-name neondb)" \
  -v ON_ERROR_STOP=1 -1 <<'SQL'
ALTER TABLE "cars_user" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cars_user" ADD COLUMN "free_render_used" boolean DEFAULT false NOT NULL;
ALTER TABLE "builds" ADD COLUMN "charge" text;
CREATE TABLE "credit_ledger" ( ... );
CREATE TABLE "credit_purchases" ( ... );
-- + 2 FKs (ON DELETE SET NULL), + 2 user_id btree indexes
SQL
```

Result: 9/9 statements, `ALTER TABLE` ×3, `CREATE TABLE` ×2, `ALTER TABLE` ×2,
`CREATE INDEX` ×2, exit 0.

`db:push:cars` was **not** used — it still plans the 8 legacy sequence drops
(`.agents/logs/2026-10-16-cars-db-push-drops-sequences.md`).

## Verification

- `information_schema`: `builds.charge`, `cars_user.credit_balance`,
  `cars_user.free_render_used` present; tables `credit_ledger`,
  `credit_purchases` present; all 4 constraints and both indexes present.
- `neon diff cars-credits production` → **NO DIFF** (drift eliminated).
- Dev server on `:3002` (already running): `GET /` → **HTTP 200**, 17,250 bytes,
  **9 build cards**, zero error markers; `GET /credits` → **307** to sign-in
  (unauthenticated, as designed).

## Open

- NOWPayments sandbox end-to-end is still outstanding; NOWPayments deprecated
  the sandbox in 2025 and points to production as the source of truth, so a real
  (or staged) payment is the remaining exercise. The crediting logic itself was
  already verified against the `cars-credits` branch with synthetic payments.
- `db:push:cars` against production remains unsafe until the legacy
  legal/medical sequences are resolved.
