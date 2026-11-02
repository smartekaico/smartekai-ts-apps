# Cars admin users page — implementation and production rollout

**Date:** 2026-11-02
**Plan:** `.agents/cars-4by4-builder/plans/2026-10-22-admin-users.md` (Tasks 1–7)
**Branch:** `feat/cars-admin` → merged into `main` as `cc50b2e` (`e4594d7..cc50b2e`, pushed)
**Production:** DDL applied, Worker `9be406b0-39dd-46e4-9cf9-2af0c8f2571d`

## What shipped

- `packages/db/src/cars/schema.ts`: `cars_user` gains `role` (default `'user'`),
  `banned` (default `false`), `ban_reason`, `ban_expires`; `cars_session` gains
  `impersonated_by`. Rebuilt `packages/db/dist` (tracked in this repo).
- `src/lib/auth.ts` / `auth-client.ts`: Better Auth **admin plugin** (`admin()`,
  `adminClient()`) after `anonymous()`. Defaults only — `adminRoles: ["admin"]`,
  `defaultRole: "user"`, no `adminUserIds`.
- `src/server/session.ts`: `SessionUser.role`, and `adminUser()` (real account
  with `role === "admin"`).
- `src/server/credits.ts`: `grantCredits(userId, delta)` — one data-modifying
  CTE; updates `credit_balance` and inserts the `grant` ledger row together, and
  only matches while `credit_balance + delta >= 0`.
- `src/lib/admin.ts`: `getAdminUsers` (search, guest toggle, 50/page, aggregate
  columns as correlated subqueries), `getAdminUser` (last 20 ledger, last 10
  purchases), `adminGrantCredits`, and ban/unban/revoke/delete through the
  plugin's own endpoints with the request headers. Every entry point 404s for
  non-admins; self-ban and self-delete are refused.
- `src/routes/admin.tsx`: `/admin` — accounts only by default, `?guests=1`
  toggle, `?q=` search, pager, `?user=<id>` detail with grant/correction,
  ban/unban, sign-out-everywhere and a typed-email delete. `noindex`, not
  linked from the header or sitemap.

## Verification (branch `cars-credits`)

| Check | Result |
|---|---|
| DDL on the branch | applied with `psql -1` over the direct URL; 37 existing rows took `role='user'`, `banned=false` |
| guest session + email sign-up/sign-out/sign-in with the plugin | all 200; new accounts get `role: "user"`, `banned: false`; `sign-in/anonymous` still 200 |
| `/admin` signed out, and as a normal account | **404** ("Build not found") |
| admin server functions called directly by a normal account | each throws `isNotFound: true` |
| list | 34 accounts, guest toggle → 40 rows (6 guests), search `normal-check` → 1 match, `zzz-nobody` → 0 |
| paging | 55 matches over 2 pages (50 + 5); "Next →" → `?page=2`, "← Previous" back |
| grant +100 | balance 100, one `+100 grant` ledger row, "Done — balance is now 100." |
| grant −1000 on a 100 balance | refused ("can't go below zero (balance: 100)"), **no** ledger row, balance unchanged |
| ban (reason + 7 days) | row shows Banned, banner with reason and expiry, sessions deleted, sign-in → **403 `BANNED_USER`** |
| unban | sign-in 200 again, ban form restored |
| revoke sessions | session rows 0; the same token (cookie cache stripped) → `get-session` null |
| delete (typed email) | button disabled until the email matches; user/sessions/accounts gone, `builds` and `credit_ledger` rows kept with `user_id` NULL |
| guest → sign-up | guest deleted, its build moved to the new account, `free_render_used` carried over |
| gate | **PASSED** (`./scripts/gate.sh`, after fixing 6 lint errors in `admin.ts`) |
| deploy dry-run | 4458.16 KiB / gzip 1002.71 KiB |

Test accounts, their builds, ledger rows and the two synthetic `admin-delete-*`
rows were deleted afterwards; production was confirmed untouched
(3 users, 0 ledger, 0 purchases).

## Production

1. **DDL first** — the same idempotent file, `psql -1` over
   `ep-winter-frost-b1drw3en` (direct, no `-pooler`): `ALTER TABLE` twice.
   Columns confirmed by `information_schema`; the 3 existing guest rows took
   the defaults. Applied **before** the deploy so Better Auth never sees a
   missing column.
2. **Deploy** — `npm run deploy -w cars-4by4-builder` → version
   `9be406b0-39dd-46e4-9cf9-2af0c8f2571d`, upload 4458.16 KiB / gzip 1002.71
   KiB, startup 89 ms, custom domains + queue + `17 * * * *` cron re-attached.
3. **Live checks** — `/` 200, `/build` 200, `/admin` **404**, `/credits` 307,
   `/projects` 307, `/sitemap.xml` 200, `/robots.txt` 200, `get-session` 200.
4. **CPU** (`wrangler tail`): `/admin` signed out = **4 ms**, `/` = **11 ms**.
   The authenticated `/admin` load could not be measured yet — see below.

## Findings worth keeping

- **Production has no real accounts.** `cars_user` holds only 3 anonymous
  guests from 2026-10-16/18. `smartekaico@gmail.com` does not exist there, so
  the admin role was **not** set. The owner must sign in once
  (Google or email) on overlander.smartekai.com; then
  `update cars_user set role = 'admin' where email = 'smartekaico@gmail.com';`
- **Role changes take up to 5 minutes to be seen** on a client that is already
  signed in: `cookieCache` is enabled with `maxAge: 5 * 60`
  (`packages/auth/src/factory.ts`), so `getSession` serves the cached user
  object, including the old `role`. Signing out and back in refreshes it. This
  is existing app behaviour, not introduced here — but it is the reason a
  freshly promoted admin may still get a 404 on `/admin` until they re-auth.
- **TanStack's search parser JSON-parses values**, so `?guests=1` arrives as
  the number `1`, not the string `"1"`. The first version only accepted
  strings and silently ignored the toggle; fixed in `3e40b30` (also accepts
  `1`, `"1"`, `"true"`, `true`).
- **Ban deletes sessions** (`deleteUserSessions` in the plugin's ban endpoint),
  and `removeUser` cascades sessions/accounts while `builds` and `credit_*`
  keep their rows through `onDelete: "set null"` — the audit trail the page
  promises in its delete hint.
- Gemini image credits were reported depleted (HTTP 402) in the earlier task;
  one guest render during this verification completed normally, so the key was
  working again at that moment.
