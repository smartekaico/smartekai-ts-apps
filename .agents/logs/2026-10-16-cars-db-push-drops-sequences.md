# `db:push:cars` tries to drop legacy sequences — 2026-10-16

## What happened

Rehearsing the `builds.user_id` migration (Spec 2 plan, Task 3) on a Neon
branch (`cars-accounts-migration`, project `smartekai-apps`), `drizzle-kit
push --config=drizzle.cars.config.ts` planned, after the expected additive
statements, eight drops:

```
DROP SEQUENCE "public"."cases_id_seq";        -- and kb_chunks, kb_documents,
DROP SEQUENCE ... session_*_id_seq, work_sessions_id_seq, kb_upload_log_id_seq
```

It applied the column/FK/index, then failed on the first drop
(`2BP01: default value for column id of table cases depends on sequence
cases_id_seq`), so nothing was dropped — by luck of ordering.

## Root cause

The cars database still holds empty legal/medical tables from the old shared
schema. `drizzle.cars.config.ts` `tablesFilter` keeps drizzle-kit away from
those **tables**, but their **sequences** are not covered by the filter, so
push diffs them as "not in schema" and drops them.

## What we did

- Production: applied the three generated statements by hand, in one
  transaction (`psql -1`), with user approval:
  `ADD COLUMN user_id text`, FK `builds_user_id_cars_user_id_fk` (on delete set
  null), `CREATE INDEX builds_user_id_idx`. Verified; all 8 sequences intact.
- Deleted the test branch.
- `drizzle.cars.config.ts` now migrates over the direct (non-pooler) URL, with
  `DRIZZLE_CARS_URL` to target a test branch.

## Open

**Do not run `db:push:cars` against production until this is fixed** (Spec 3's
credit tables will need it). Options: drop the leftover legal/medical tables
(and with them their sequences) from the cars database after confirming they
are empty; or move cars to `drizzle-kit generate` + reviewed SQL migrations.
Needs a user decision.
