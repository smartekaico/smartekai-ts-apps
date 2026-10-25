# Admin: see and manage cars users — Task

> For the implementing agent. Use superpowers:executing-plans or
> subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** the owner can list, search and manage cars users from a `/admin`
page in the app, instead of SQL in the Neon console.

**Why not Neon Auth:** cars runs Better Auth itself against Neon Postgres
(AGENTS.md). Users live in `cars_user` / `cars_account` / `cars_session`, not in
Neon Auth's `neon_auth` schema, so the Neon console's Auth tab never shows them.

**Approach:** Better Auth's built-in **admin plugin** (`better-auth/plugins`,
`admin`) for ban/unban, revoking sessions and deleting users; our own Drizzle
query for the user list (it needs credits and sign-in methods, which the plugin's
`listUsers` doesn't return); our own server function for credit grants (the
ledger must stay consistent).

## Prerequisites

- Met (2026-10-26): cars is live on **overlander.smartekai.com** (cars.smartekai.com
  only 301s there). Start after the patch-dependency task has merged. Rebase on `main`.
- If the patch-dependency task (`.agents/monorepo/plans/2026-10-22-patch-dependency-updates.md`)
  has landed, Better Auth is 1.7.12; check the admin plugin docs for that version.

## Ground rules

- Branch `feat/cars-admin` from `main`. Never commit to `main`; merging needs
  the user's OK.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- **Never run `db:push:cars`** (it drops legacy sequences; see
  `.agents/logs/2026-10-16-cars-db-push-drops-sequences.md`). DDL is applied by
  hand with `psql -1` over the **direct** URL: rehearse on the Neon branch
  `cars-credits` (project `ancient-hall-95124568`) first.
- **Ask first** before production DDL, before setting the admin role in
  production, and before the production deploy.
- Local dev must point at `cars-credits`:
  `DATABASE_NEONDB_SMARTEKAI="$(npx neon connection-string cars-credits --project-id ancient-hall-95124568 --pooled)" npm run dev-vars -w cars-4by4-builder`.
- Keep it small. No impersonation UI, no role editor, no new design system: plain
  table using the app's existing Tailwind classes.

## Files

- Modify `packages/db/src/cars/schema.ts`: admin columns on `cars_user` and
  `cars_session`.
- Modify `apps/cars-4by4-builder/src/lib/auth.ts`: add `admin()` to `plugins`.
- Modify `apps/cars-4by4-builder/src/lib/auth-client.ts`: add `adminClient()`.
- Modify `apps/cars-4by4-builder/src/server/session.ts`: `adminUser()`.
- Modify `apps/cars-4by4-builder/src/server/credits.ts`: `grantCredits()`.
- Create `apps/cars-4by4-builder/src/lib/admin.ts`: server functions.
- Create `apps/cars-4by4-builder/src/routes/admin.tsx`: the page.

## Tasks

### 1. Schema + DDL

- [ ] In `carsUsers` add (Better Auth admin plugin field names, snake_case
  columns like the rest of the table):

```ts
  // Better Auth admin plugin. role "admin" unlocks /admin; banned users can't sign in.
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
```

- [ ] In `carsSessions` add `impersonatedBy: text("impersonated_by"),`. The plugin
  writes this field, so the column must exist even though we don't build an
  impersonation UI.
- [ ] The DDL (one transaction, idempotent). Earlier cars DDL wasn't committed as
  files; this plan is the record. Save it to a scratch file to apply it:

```sql
alter table cars_user
  add column if not exists role text default 'user',
  add column if not exists banned boolean default false,
  add column if not exists ban_reason text,
  add column if not exists ban_expires timestamp;
alter table cars_session
  add column if not exists impersonated_by text;
```

- [ ] Apply on `cars-credits`: `psql -1 "$BRANCH_DIRECT_URL" -f <scratch file>`, then
  `\d cars_user` and `\d cars_session` to confirm.
- [ ] Commit `feat(cars): admin-plugin columns on cars_user and cars_session`.

### 2. Wire the plugin

- [ ] `auth.ts`: `import { admin, anonymous } from "better-auth/plugins";` and add
  `admin()` to `plugins` after `anonymous(...)`. Defaults are fine: `adminRoles:
  ["admin"]`, `defaultRole: "user"`. Don't set `adminUserIds` (the role column is
  the single source of truth).
- [ ] `auth-client.ts`: `import { adminClient, anonymousClient } from "better-auth/client/plugins";`,
  `plugins: [anonymousClient(), adminClient()]`.
- [ ] `session.ts`: extend `SessionUser` with `role?: string | null` and add

```ts
/** A real account whose cars_user.role is "admin" (Better Auth admin plugin). */
export async function adminUser(): Promise<SessionUser | null> {
  const user = await accountUser();
  return user?.role === "admin" ? user : null;
}
```

- [ ] Check that a guest session and a normal sign-in still work (the plugin
  adds a ban check at session creation; the anonymous plugin must be unaffected).
- [ ] Commit `feat(cars): enable the Better Auth admin plugin`.

### 3. Credit grants

- [ ] In `server/credits.ts` add `grantCredits(userId, delta)`, modelled on
  `refundRender`: one `db.batch` that updates `cars_user.credit_balance` by
  `delta` and inserts a `credit_ledger` row with `reason: "grant"` (the
  `CreditReason` type already has it). Allow negative `delta` for corrections but
  refuse one that would take the balance below 0: add
  `where credit_balance + delta >= 0` and insert the ledger row only if the update
  matched (use a single data-modifying CTE like `refundFailedBuild` so the two
  can't diverge). Return `{ ok: boolean; balance: number }`.
- [ ] Commit `feat(cars): admin credit grants through the ledger`.

### 4. Server functions (`src/lib/admin.ts`)

Every function starts with `const admin = await adminUser(); if (!admin) throw notFound();`
(404, not 403, so the page doesn't advertise itself). Validate inputs with the
same `.validator()` style as `src/lib/credits.ts`.

- [ ] `getAdminUsers({ q?, page?, includeGuests? })` — Drizzle query, parameterized:
  - columns: id, email, name, created_at, role, banned, ban_reason,
    credit_balance, free_render_used, `string_agg(cars_account.provider_id)` as
    sign-in methods, count of `builds`, sum of `credit_purchases.amount_usd`
    where status `credited`;
  - `is_anonymous` false unless `includeGuests`;
  - `q` matches email or name with `ilike` (escape `%`/`_`);
  - order by `created_at desc`, 50 per page; also return the total count and the
    guest count.
- [ ] `getAdminUser({ id })` — the same row plus the last 20 `credit_ledger` rows
  and the last 10 `credit_purchases`.
- [ ] `adminGrantCredits({ userId, delta })` — `delta` an integer, non-zero,
  |delta| ≤ 10 000; calls `grantCredits`.
- [ ] Ban, unban, revoke sessions and delete go through the plugin's endpoints,
  called server-side with the admin's request headers so the plugin's own role
  check also applies:
  `auth.api.banUser({ body: { userId, banReason, banExpiresIn? }, headers })`,
  `auth.api.unbanUser`, `auth.api.revokeUserSessions`, `auth.api.removeUser`.
  Check the exact names and bodies against the installed version's types before
  using them. Refuse to ban or delete yourself.
- [ ] Deleting a user: sessions and accounts cascade; `builds`, `credit_ledger`
  and `credit_purchases` keep their rows with `user_id` set null (audit trail).
  The confirm text on the page says so.
- [ ] Commit `feat(cars): admin server functions`.

### 5. `/admin` page (`src/routes/admin.tsx`)

- [ ] `head`: title "Admin | 4x4 Builder", `robots: noindex`. Not linked from
  `SiteHeader` or the sitemap.
- [ ] Loader calls `getAdminUsers` with search params `q`, `page`, `guests`.
  Non-admins get the app's normal 404.
- [ ] Top line: total accounts, guests, total credited USD.
- [ ] Search box (submits as `?q=`), "include guests" toggle, pager.
- [ ] Table: email, name, sign-in methods, joined (fixed `en-US`/UTC formatter
  like `projects.tsx`, to avoid hydration mismatch), credits, builds, paid USD,
  status (Active / Banned).
- [ ] Row expands (or links to `/admin?user=<id>`) to the detail: ledger and
  purchases, plus actions:
  - Grant credits (number input, +/−) → shows the new balance;
  - Ban (reason required, optional days) / Unban;
  - Sign out everywhere (revoke sessions);
  - Delete user (typed-email confirm; no `window.confirm`).
- [ ] After an action, invalidate the router so the table refreshes.
- [ ] Commit `feat(cars): /admin users page`.

### 6. Verify on `cars-credits`

- [ ] Make yourself admin on the branch:
  `update cars_user set role = 'admin' where email = '<test account>';`
- [ ] Signed out and as a normal account, `/admin` is a 404, and calling the
  server functions directly (copy the fetch from devtools) is refused.
- [ ] As admin: the list shows accounts only; the guest toggle adds guests;
  search by part of an email works; paging works.
- [ ] Grant +100 → balance and a `grant` ledger row; −1000 on a 100 balance is
  refused and writes nothing.
- [ ] Ban a second test account → its open session is signed out and it can't
  sign in (check the message); Unban → it can again.
- [ ] Revoke sessions → that account is signed out on its next request.
- [ ] Delete a throwaway account → gone from the list; its builds and ledger
  rows remain with `user_id` null.
- [ ] Guest flow still works: guest render, then sign-up moves the builds.
- [ ] Gate passes; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry` succeeds.

### 7. Production (ask first, one step at a time)

- [ ] Production DDL with `psql -1` over the production direct URL; `\d` to confirm.
  This must happen **before** the deploy, or Better Auth fails on the missing
  columns for every session.
- [ ] Set the admin role for the user's own account (ask which email).
- [ ] `npm run deploy -w cars-4by4-builder`, then check `/admin` on
  overlander.smartekai.com and run `wrangler tail` for one `/admin` load to confirm the
  CPU time stays under the Free limit.
- [ ] Add a current-work line to `.agents/cars-4by4-builder/plans/active.md`.

## Done when

- Admin columns exist on the branch and (after approval) in production.
- `/admin` lists, searches and pages accounts; detail shows ledger and purchases.
- Grant, ban/unban, revoke sessions and delete all work, and non-admins get 404.
- Guest and sign-in flows are unchanged; the gate passes.
- Merge and deploy happened only with the user's OK.

## Out of scope

Impersonation UI, role management UI, audit log of admin actions, email
notifications to users, admin for legal-os/medical-os.
