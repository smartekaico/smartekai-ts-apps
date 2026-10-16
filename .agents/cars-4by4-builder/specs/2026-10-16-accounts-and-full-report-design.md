# Accounts + Full Report + My Projects — Design

**Date:** 2026-10-16
**App:** `apps/cars-4by4-builder` (+ a new entry in `packages/auth`)
**Status:** Agreed. Spec 2 of 3. Spec 1 = affiliate audit
(`2026-10-16-affiliate-sources-audit.md`); Spec 3 = credits + checkout
(depends on this spec).

## 0. Goal

Anyone can try the app without logging in. Signing in (Google or
email+password) unlocks a full HTML report for a build and saves the user's
builds as **My projects**. Affiliate Buy links stay public so clicks are not
lost to the login wall. The PDF quote is removed; the report page replaces it.

| | Guest | Signed in |
|---|---|---|
| Before/after render | ✅ | ✅ |
| Part names + Buy buttons | ✅ | ✅ |
| Estimated total | ✅ | ✅ |
| Per-part price + labor hours, cost/labor breakdown | — | ✅ |
| Fitment notes / advisories | — | ✅ |
| Print-friendly report | — | ✅ |
| Builds saved in My projects | — | ✅ |

## 1. Auth

### `packages/auth` — new `createAuth` factory

- New file `src/factory.ts`, exported as a new package entry
  `@smartekai/auth/factory` (`package.json` `exports`).
- `createAuth(options)` holds the shared defaults: `baseURL` from
  `BETTER_AUTH_URL`, 30-day sessions, 5-minute cookie cache, Drizzle adapter
  (`provider: "pg"`). Callers pass `db`, `schema`, `trustedOrigins`,
  `emailAndPassword`, `socialProviders`, `plugins`.
- The factory **does not import `@smartekai/db`** — the caller passes the db.
- `src/index.ts` and its `auth` export are **untouched**; legal-os and
  medical-os are out of scope.

### Cars instance — `apps/cars-4by4-builder/src/lib/auth.ts`

Becomes a `createAuth` call with:

- `db: getDbCars()`, schema `cars_user` / `cars_session` / `cars_account` /
  `cars_verification`.
- `trustedOrigins`: `https://cars.smartekai.com`, `BETTER_AUTH_URL`.
- `emailAndPassword: { enabled: true }` — no verification, no reset in this
  spec (reset needs Resend wiring for the cars domain; later).
- `socialProviders.google` from `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- `plugins: [anonymous({ onLinkAccount })]` — see §3.

`src/lib/auth-client.ts` keeps `anonymousClient()`.

### Env + external setup

- Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to `turbo.json` `globalEnv`,
  `.env.local`, and the cars Dokploy app.
- Google Cloud OAuth client (Web), redirect URIs:
  `https://cars.smartekai.com/api/auth/callback/google`,
  `http://localhost:3002/api/auth/callback/google`.

## 2. Data (cars database)

- `builds.user_id text` — nullable, FK → `cars_user.id`
  `on delete set null`, index `builds_user_id_idx`.
  `null` = curated build, or a guest whose anonymous sign-in failed.
- No other schema changes. Guests are `cars_user` rows with
  `is_anonymous = true` (column exists).
- Applied with `db:push:cars` (additive; ask before running per AGENTS.md).

## 3. Flow

1. **Guest identity.** On the photo step, before upload, the client calls
   `authClient.signIn.anonymous()` when there is no session. `checkPhoto` and
   `startBuild` read the session server-side
   (`auth.api.getSession({ headers })`) and set `builds.user_id`. If anonymous
   sign-in fails, the build proceeds unowned.
2. **Public build page `/builds/$slug`.** Render, part names, Buy buttons,
   estimated total, and an **"Unlock full report"** button →
   `/sign-in?next=/builds/$slug/report` (or straight to the report if already
   signed in). `getBuild` returns only these fields; gated fields are never
   sent to the guest's browser.
3. **Sign-in `/sign-in?next=`.** "Continue with Google" + email+password
   (sign-up and sign-in tabs). `next` must be a same-origin path, else `/`.
   On success → `next`.
4. **Handoff.** The anonymous plugin's `onLinkAccount({ anonymousUser,
   newUser })` runs `update builds set user_id = newUser.id where user_id =
   anonymousUser.id`; the plugin then deletes the anonymous user. Verified in
   better-auth 1.7.7: the hook fires on `/sign-in*`, `/sign-up*` and
   `/callback*` (OAuth), so it covers sign-up, sign-in to an existing account,
   and Google.
5. **Report `/builds/$slug/report`.** New `getReport` server function:

   | Condition | Result |
   |---|---|
   | No session, or anonymous session | redirect `/sign-in?next=…` |
   | Signed in, build curated or `user_id` = you, completed | full report |
   | Build processing | redirect to `/builds/$slug` |
   | Anything else | 404 (doesn't reveal the build exists) |

   Contents: render; shop list with per-part est. price, labor hours and Buy
   buttons (Spec 1 labels, disclosure, `rel`); parts/labor/total breakdown;
   fitment notes; **Print** button + print stylesheet (hides header, footer,
   buttons).
6. **My projects `/projects`.** Signed-in only (else redirect to sign-in).
   The user's builds, newest first: thumbnail, vehicle, status, date; links
   to the report (completed) or build page (processing/failed).
7. **Header.** Guest: "Sign in". Signed in: account menu → My projects,
   Sign out. Anonymous sessions render as guests.

## 4. Removals

`src/components/BuildQuotePdfLink.tsx`, `src/components/BuildReportPdf.tsx`,
the PDF button on the build page, and the `@react-pdf/renderer` dependency
(plus its `vite.config.ts` SSR-external entry if present).

## 5. Retention — `scripts/cleanup.ts`

- Builds owned by a non-anonymous user: **kept** (no 90-day delete).
- Unowned or anonymous-owned non-curated builds: 90-day delete as today.
- Drafts > 24h: deleted as today.
- New: delete anonymous `cars_user` rows older than 30 days with no builds.

## 6. Spec 1 changes landed here

Store-named Buy buttons, "Est. price" labels, disclosure above the shop list,
`rel="sponsored nofollow noopener"` — applied to `ShopList` / `PartCard`,
which both the build page and the report use.

## 7. Out of scope

Credits / paid renders (Spec 3), password reset, email verification, account
deletion UI, sharing reports publicly, legal-os / medical-os auth.

## 8. Done when

Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`
plus `--filter=@smartekai/auth`. Click-through on desktop and mobile width:

- [ ] Guest builds → "Unlock full report" → Google → report shows that build →
      it appears in My projects.
- [ ] Same with email+password sign-up; and with sign-in to an existing
      account (builds move over).
- [ ] Signed-in user opening another user's report → 404.
- [ ] Guest's `getBuild` response contains no per-part prices, labor hours or
      advisories.
- [ ] Print preview of the report shows only report content.
- [ ] Curated build report opens for any signed-in user.
- [ ] No PDF button anywhere; `@react-pdf/renderer` gone from the bundle.
