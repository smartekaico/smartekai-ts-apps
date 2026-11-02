# 2026-11-02 — cars: first-admin bootstrap

## What changed
- `apps/cars-4by4-builder/src/lib/auth.ts`: added `databaseHooks.user.create.before`. A non-guest whose email (case-insensitive, trimmed) equals `ADMIN_BOOTSTRAP_EMAIL` is inserted with `role="admin"` while no row with `role='admin'` exists yet. Role is set before insert so the session created in the same sign-up already carries it (avoids the 5-minute cookie-cache wait). Guests (`isAnonymous`) and any other email are untouched. No schema change, no production DDL.
- `apps/cars-4by4-builder/wrangler.jsonc`: added `vars.ADMIN_BOOTSTRAP_EMAIL = "smartekaico@gmail.com"`.
- `apps/cars-4by4-builder/scripts/dev-vars.ts`: added `ADMIN_BOOTSTRAP_EMAIL` to `KEYS`.

## Why
The admin users page shipped with no way to become admin short of hand-running SQL against production. The owner asked for the first registered account to be promoted automatically. To keep a public site from handing admin to a stranger, the rule is email-gated and only fires while zero admins exist (not "first row wins").

## Verified
- Scratch Neon branch `admin-bootstrap-test` (from production, with the new role columns): sign-up as `stranger@example.com` → `role='user'`; sign-up as `smartekaico@gmail.com` → `role='admin'`; 3 anonymous guests stayed `user`; `GET /admin` 200 for the admin cookie. Branch deleted after.
- `./scripts/gate.sh` PASSED (typecheck/lint/build/secret scan).
- Typecheck: `tsc --noEmit` clean.

## Caveats
- Email is unverified at sign-up, so the gate is an identifier check, not proof of ownership; it only matters in the bootstrap window (zero admins). Remove or change the var once the admin account exists.
- Race: two matching sign-ups in the same instant could both see zero admins and both become admin; negligible for this traffic and fails safe (extra admin, never lockout). Can be hardened with an advisory lock or partial unique index later.
- If the only admin is deleted, the next sign-up with the configured email re-arms. Acceptable for bootstrap.
- `ADMIN_BOOTSTRAP_EMAIL` is a non-secret var in `wrangler.jsonc` (committed). If the repo goes public, move it to `wrangler secret put` (needs explicit approval).

## Deploy
Not deployed yet. Pending user approval: deploy this branch so the owner can sign in once as `smartekaico@gmail.com` and be promoted automatically; the manual production role step becomes unnecessary.