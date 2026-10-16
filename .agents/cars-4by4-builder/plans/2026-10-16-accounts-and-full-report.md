# Accounts + Full Report + My Projects (cars-4by4-builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guests try the app without logging in; signing in (Google or email+password) unlocks a full HTML build report and saves builds as My projects. Also lands Spec 1's Step 1 affiliate-compliance UI changes.

**Specs:** `.agents/cars-4by4-builder/specs/2026-10-16-accounts-and-full-report-design.md` (Spec 2) and §4 Step 1 of `.agents/cars-4by4-builder/specs/2026-10-16-affiliate-sources-audit.md` (Spec 1).

**Architecture:** A new `createAuth` factory in `@smartekai/auth/factory` (no `@smartekai/db` import) builds the cars Better Auth instance on the cars database, with Google, email+password and the `anonymous()` plugin. Every visitor gets a guest identity before their first upload; builds carry `user_id`; `onLinkAccount` moves a guest's builds into the account they sign into. The public build page gets a trimmed payload; a new `getReport` server function serves the gated report to the owner (or anyone signed in, for curated builds). The PDF quote is removed.

**Tech Stack:** TanStack Start (Vite + Nitro), React 19, Better Auth 1.7.7 (`anonymous` plugin, Google social provider), Drizzle ORM + Neon HTTP, Tailwind v3. **No new dependencies** (one removed: `@react-pdf/renderer`; one workspace dep added: `@smartekai/auth`).

**Validation strategy:** No test suite exists (`AGENTS.md`: "test: none"). Each task verifies with the scoped gate plus the manual check it names. Pure helpers get `npx tsx -e '…'` spot checks with the expected output written down.

```bash
# from the repo root
npx turbo run build --filter=cars-4by4-builder^...     # build workspace deps' dist/ first
npx turbo run type-check lint --filter=cars-4by4-builder...
npx turbo run build --filter=cars-4by4-builder...      # where a task says so
```

Why the first line: in `turbo.json`, `type-check` has no `dependsOn: ["^build"]`, but the app type-checks against `@smartekai/auth` / `@smartekai/db` **`dist/`** types. `cars-4by4-builder^...` = its dependencies only, not the app. Run it whenever a task changed a package (Tasks 1, 3). Changing the repo-wide `turbo.json` task graph is out of scope here.

`./scripts/gate.sh` as a whole may still fail on pre-existing `apps/legal-os` lint; the scoped commands are the signal for this plan.

**Branch:** `feat/cars-accounts`, created from `docs/cars-monetization` (so the specs are present). Never commit to `main`.

**Ask-first checkpoint:** Task 3 Step 5 (`db:push:cars` against the real cars database, after a Neon-branch rehearsal in Step 4). Stop and get explicit user confirmation before running it.

**External setup the user does (not code):**
- Google Cloud → OAuth client (Web). Redirect URIs: `https://cars.smartekai.com/api/auth/callback/google`, `http://localhost:3002/api/auth/callback/google`. Put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in the root `.env.local` and the cars Dokploy app's env.

---

## File map

**`packages/auth`**
- Create `src/factory.ts` — `createAuth(options)`.
- Modify `package.json` — add `exports` for `.` and `./factory`.

**`packages/db`**
- Modify `src/cars/schema.ts` — `builds.userId` + index.

**`apps/cars-4by4-builder`**
- Modify `package.json` — add `@smartekai/auth`, remove `@react-pdf/renderer`.
- Modify `vite.config.ts` — SSR-externalize `@smartekai/auth/factory`.
- Rewrite `src/lib/auth.ts` — `createAuth` call + Google + `onLinkAccount`.
- Modify `src/lib/auth-client.ts` — `ensureGuestSession()`.
- Create `src/server/session.ts` — `currentUser()`, `accountUser()`.
- Create `src/lib/store.ts` — `storeOf()`, `BUY_LABEL`.
- Create `src/lib/next.ts` — `safeNext()`.
- Modify `src/lib/builds.ts` — ownership stamping, `store` on parts, `loadBuild`, trimmed `getBuild`, new `getReport`, `getProjects`.
- Modify `src/components/PhotoStep.tsx` — call `ensureGuestSession()`.
- Rewrite `src/components/ShopList.tsx` — store-named buttons, est. prices, optional detail fields.
- Modify `src/components/PartCard.tsx` — "Est." label.
- Rewrite `src/components/SiteHeader.tsx` — sign-in / My projects / sign out; `print:hidden`.
- Modify `src/components/SiteFooter.tsx` — `print:hidden`.
- Rewrite `src/routes/builds/$slug.tsx` — teaser page + Unlock button, no PDF, no fitment notes.
- Create `src/routes/builds/$slug_.report.tsx` — the gated report.
- Create `src/routes/sign-in.tsx`, `src/routes/projects.tsx`.
- Modify `scripts/cleanup.ts` — keep account-owned builds; delete stale guests.
- Delete `src/components/BuildQuotePdfLink.tsx`, `src/components/BuildReportPdf.tsx`, `src/routes/api/render.ts`.

**Root**
- Modify `turbo.json` — add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to `globalEnv`.

---

### Task 0: Branch

- [ ] **Step 1: Create the branch**

```bash
cd "/Users/ar/Desktop/Web Development/smartekai-saas"
git switch docs/cars-monetization
git switch -c feat/cars-accounts
```

Expected: `Switched to a new branch 'feat/cars-accounts'`.

---

### Task 1: `createAuth` factory in `@smartekai/auth`

**Files:**
- Create: `packages/auth/src/factory.ts`
- Modify: `packages/auth/package.json`

- [ ] **Step 1: Write the factory**

Create `packages/auth/src/factory.ts`:

```ts
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

type DrizzleDb = Parameters<typeof drizzleAdapter>[0];
type DrizzleSchema = NonNullable<Parameters<typeof drizzleAdapter>[1]["schema"]>;

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type CreateAuthOptions = Omit<BetterAuthOptions, "database"> & {
  db: DrizzleDb;
  schema: DrizzleSchema;
};

/**
 * Shared Better Auth defaults for an app that owns its database. The caller
 * passes its Drizzle db and table mapping — this module never imports
 * @smartekai/db, so an app only loads the database it uses. The legal/medical
 * `auth` instance in ./index is separate and unchanged.
 */
export function createAuth<O extends CreateAuthOptions>({ db, schema, ...options }: O) {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    ...options,
    session: {
      expiresIn: THIRTY_DAYS,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
      ...options.session,
    },
    database: drizzleAdapter(db, { provider: "pg", schema }),
  });
}
```

- [ ] **Step 2: Add package exports**

In `packages/auth/package.json`, after `"types": "dist/index.d.ts",` add:

```json
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./factory": { "types": "./dist/factory.d.ts", "default": "./dist/factory.js" }
  },
```

(`.` maps to the same file `main` already points at, so legal-os / medical-os resolution is unchanged. Neither app deep-imports `@smartekai/auth/*` — verified with grep.)

- [ ] **Step 3: Build and type-check the package**

```bash
npx turbo run build type-check --filter=@smartekai/auth
ls packages/auth/dist/factory.js packages/auth/dist/factory.d.ts
```

Expected: both tasks succeed; both files listed.

- [ ] **Step 4: Commit**

```bash
git add packages/auth/src/factory.ts packages/auth/package.json
git commit -m "feat(auth): add createAuth factory entry for per-app databases"
```

---

### Task 2: Cars auth on the factory, with Google

**Files:**
- Modify: `apps/cars-4by4-builder/package.json`
- Modify: `apps/cars-4by4-builder/vite.config.ts`
- Rewrite: `apps/cars-4by4-builder/src/lib/auth.ts`
- Modify: `turbo.json`

- [ ] **Step 1: Add the workspace dependency**

In `apps/cars-4by4-builder/package.json` `dependencies`, after `"@smartekai/ai": "*",` add:

```json
    "@smartekai/auth": "*",
```

then from the repo root:

```bash
npm install
ls -la node_modules/@smartekai/auth
```

Expected: the symlink points at `packages/auth`; lockfile updated by npm (never hand-edit it).

- [ ] **Step 2: SSR-externalize the factory**

In `apps/cars-4by4-builder/vite.config.ts`, in `ssr.external`, add `"@smartekai/auth/factory",` after `"@smartekai/storage",` (same reason as the other workspace packages: they ship CJS `dist`).

- [ ] **Step 3: Rewrite `src/lib/auth.ts`**

```ts
import { createAuth } from "@smartekai/auth/factory";
import { anonymous } from "better-auth/plugins";
import { carsAccounts, carsSessions, carsUsers, carsVerifications, getDbCars } from "@smartekai/db/cars";

export const auth = createAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",
  trustedOrigins: ["https://cars.smartekai.com", "http://cars.smartekai.com", process.env.BETTER_AUTH_URL ?? ""].filter(
    Boolean,
  ),
  db: getDbCars(),
  schema: {
    user: carsUsers,
    session: carsSessions,
    account: carsAccounts,
    verification: carsVerifications,
  },
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  plugins: [anonymous()],
});
```

- [ ] **Step 4: Register env vars with Turbo**

In `turbo.json` `globalEnv`, after `"PUBLIC_SITE_URL"` add `"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"` (mind the comma on the previous line).

- [ ] **Step 5: Gate**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
```

Expected: pass. If `auth.api.getSession` loses its plugin-aware user type later (Task 4), that is still fine — `src/server/session.ts` reads `isAnonymous` defensively.

- [ ] **Step 6: Manual check**

```bash
npm run dev:cars
curl -s http://localhost:3002/api/auth/get-session
```

Expected: `null` (no session), and no Better Auth startup error. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add apps/cars-4by4-builder/package.json package-lock.json apps/cars-4by4-builder/vite.config.ts apps/cars-4by4-builder/src/lib/auth.ts turbo.json
git commit -m "feat(cars): build auth with createAuth; add Google sign-in"
```

---

### Task 3: `builds.user_id`

**Files:**
- Modify: `packages/db/src/cars/schema.ts`

- [ ] **Step 1: Add the column and index**

In `packages/db/src/cars/schema.ts`, in the `builds` table columns, after `presetId: …,` add:

```ts
    // Owner: a guest (anonymous) or account user. null = curated, or a guest
    // whose anonymous sign-in failed. Moved to the account by onLinkAccount.
    userId: text("user_id").references(() => carsUsers.id, { onDelete: "set null" }),
```

and in the table's index callback, after `createdAtIdx: …,` add:

```ts
    userIdx: index("builds_user_id_idx").on(table.userId),
```

- [ ] **Step 2: Build the db package and type-check the app**

```bash
npx turbo run build --filter=@smartekai/db
npx turbo run type-check --filter=cars-4by4-builder...
```

Expected: pass.

- [ ] **Step 3: Push migrations over the direct connection**

`DATABASE_NEONDB_SMARTEKAI` is a **pooled** Neon URL (`-pooler` host). Neon: schema migrations must use the direct connection; the app keeps the pooled one. In `packages/db/drizzle.cars.config.ts`, replace

```ts
  dbCredentials: { url },
```

with

```ts
  // Migrations go over Neon's direct connection; the app keeps the pooled URL.
  // DRIZZLE_CARS_URL overrides (e.g. a Neon test branch's direct URL).
  dbCredentials: { url: process.env.DRIZZLE_CARS_URL ?? url.replace("-pooler.", ".") },
```

- [ ] **Step 4: Rehearse on a Neon branch**

The user authenticates the Neon CLI once (interactive): `! npx neon@latest auth`. Then:

```bash
npx neon@latest branches create --name cars-accounts-migration
export DRIZZLE_CARS_URL="$(npx neon@latest connection-string cars-accounts-migration)"
npm run db:push:cars -w @smartekai/db
```

Expected: drizzle-kit lists one added column (`builds.user_id`) and one index (`builds_user_id_idx`), **no drops**. If it proposes dropping anything, abort and report. (`neon connection-string` returns the direct URL by default. If the CLI asks for a project, pick the one holding the cars DB, host `ep-winter-frost-…`.)

- [ ] **Step 5: ASK FIRST, then push to the real database**

Stop. Tell the user: "Rehearsal on branch `cars-accounts-migration` was additive only (column + index). OK to run `db:push:cars` against the cars database?" Only on an explicit yes:

```bash
unset DRIZZLE_CARS_URL
npm run db:push:cars -w @smartekai/db
npx neon@latest branches delete cars-accounts-migration
```

Expected: the same additive diff; the test branch deleted.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/cars/schema.ts packages/db/drizzle.cars.config.ts
git commit -m "feat(db): builds.user_id for cars build ownership; migrate over direct URL"
```

---

### Task 4: Guest identity, ownership, account handoff

**Files:**
- Create: `apps/cars-4by4-builder/src/server/session.ts`
- Modify: `apps/cars-4by4-builder/src/lib/auth-client.ts`
- Modify: `apps/cars-4by4-builder/src/lib/auth.ts`
- Modify: `apps/cars-4by4-builder/src/lib/builds.ts`
- Modify: `apps/cars-4by4-builder/src/components/PhotoStep.tsx`

- [ ] **Step 1: Server session helpers**

Create `src/server/session.ts`:

```ts
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; isAnonymous?: boolean | null };

/** The request's user — a guest (anonymous plugin) or an account — or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  return session?.user ?? null;
}

/** Only a real account (Google or email), never an anonymous guest. */
export async function accountUser(): Promise<SessionUser | null> {
  const user = await currentUser();
  return user && !user.isAnonymous ? user : null;
}
```

- [ ] **Step 2: Client guest helper**

Replace `src/lib/auth-client.ts` with:

```ts
import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});

/**
 * Gives a first-time visitor a guest identity so their builds can follow them
 * into an account later (Spec 2 §3.1). Never throws — if it fails, the build
 * is simply unowned.
 */
export async function ensureGuestSession(): Promise<void> {
  try {
    const { data } = await authClient.getSession();
    if (!data) await authClient.signIn.anonymous();
  } catch {
    // fall through: unowned build
  }
}
```

- [ ] **Step 3: Move guest builds on sign-in / sign-up**

In `src/lib/auth.ts`, change the imports to:

```ts
import { createAuth } from "@smartekai/auth/factory";
import { anonymous } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import {
  builds,
  carsAccounts,
  carsSessions,
  carsUsers,
  carsVerifications,
  getDbCars,
} from "@smartekai/db/cars";
```

and replace `plugins: [anonymous()],` with:

```ts
  plugins: [
    anonymous({
      // Fires on /sign-in*, /sign-up* and /callback* (OAuth) in better-auth
      // 1.7.7, so sign-up, sign-in to an existing account and Google all move
      // the guest's builds. The plugin deletes the guest user afterwards.
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await getDbCars()
          .update(builds)
          .set({ userId: newUser.user.id })
          .where(eq(builds.userId, anonymousUser.user.id));
      },
    }),
  ],
```

- [ ] **Step 4: Stamp ownership in `checkPhoto` and `startBuild`**

In `src/lib/builds.ts`, add the import:

```ts
import { currentUser } from "@/server/session";
```

In `checkPhoto`'s handler, replace

```ts
    await db.insert(builds).values({
      id,
      vehicleId: vehicle.id,
      originalImageKey: key,
```

with

```ts
    const user = await currentUser();
    await db.insert(builds).values({
      id,
      userId: user?.id ?? null,
      vehicleId: vehicle.id,
      originalImageKey: key,
```

In `startBuild`'s handler (stock-photo branch), replace

```ts
      id = crypto.randomUUID();
      await db.insert(builds).values({
        id,
        vehicleId: vehicle.id,
```

with

```ts
      id = crypto.randomUUID();
      const user = await currentUser();
      await db.insert(builds).values({
        id,
        userId: user?.id ?? null,
        vehicleId: vehicle.id,
```

- [ ] **Step 5: Create the guest session before upload/start**

In `src/components/PhotoStep.tsx`, add the import:

```ts
import { ensureGuestSession } from "@/lib/auth-client";
```

In `handleFile`, make the first line after `setCheck({ state: "checking" });`:

```ts
    await ensureGuestSession();
```

In `start`, make the first line after `setStarting(true);`:

```ts
    await ensureGuestSession();
```

- [ ] **Step 6: Gate**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
```

Expected: pass.

- [ ] **Step 7: Manual check**

`npm run dev:cars`, open `http://localhost:3002/build`, pick a vehicle and parts, use the studio photo → Generate. Then:

```sql
-- Neon console, cars database
select b.id, b.user_id, u.is_anonymous from builds b left join cars_user u on u.id = b.user_id order by b.created_at desc limit 1;
```

Expected: `user_id` set, `is_anonymous = true`.

- [ ] **Step 8: Commit**

```bash
git add apps/cars-4by4-builder/src
git commit -m "feat(cars): guest sessions own builds; move them on sign-in"
```

---

### Task 5: Store-named Buy buttons and "Est." prices (Spec 1 Step 1)

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/store.ts`
- Modify: `apps/cars-4by4-builder/src/lib/builds.ts`
- Rewrite: `apps/cars-4by4-builder/src/components/ShopList.tsx`
- Modify: `apps/cars-4by4-builder/src/components/PartCard.tsx`

- [ ] **Step 1: Store helper**

Create `src/lib/store.ts`:

```ts
export type Store = "amazon" | "ebay" | "other";

/** Which store an affiliate URL leads to — Amazon requires the button to say so. */
export function storeOf(url: string | null): Store | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === "amzn.to" || /(^|\.)amazon\.[a-z.]+$/.test(host)) return "amazon";
  if (/(^|\.)ebay\.[a-z.]+$/.test(host)) return "ebay";
  return "other";
}

export const BUY_LABEL: Record<Store, string> = {
  amazon: "Buy on Amazon",
  ebay: "View on eBay",
  other: "Buy",
};
```

- [ ] **Step 2: Spot-check it**

```bash
cd apps/cars-4by4-builder
npx tsx -e 'import("./src/lib/store.ts").then(({storeOf})=>console.log(["https://www.amazon.com/dp/X?tag=a-20","https://amzn.to/abc","https://www.ebay.com/itm/1","https://ebay.us/x","https://realtruck.sjv.io/c/1","notaurl",null].map(storeOf).join(",")))'
cd ../..
```

Expected: `amazon,amazon,ebay,ebay,other,,` (the last two are `null`).

- [ ] **Step 3: Expose `store` instead of `buyable`; add the teaser part type**

In `src/lib/builds.ts`, add the import:

```ts
import { storeOf } from "@/lib/store";
import type { Store } from "@/lib/store";
```

Replace the `PublicPart` type and `toPublicPart` with:

```ts
export type PublicPart = {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceUsd: string;
  laborHoursEst: string;
  fitmentDifficulty: string;
  imageUrl: string;
  store: Store | null; // null = no partner link yet (Buy stays hidden)
};

/** What a guest sees on the public build page — no per-part price, labor or fitment. */
export type TeaserPart = Pick<PublicPart, "id" | "name" | "brand" | "category" | "imageUrl" | "store">;

function toPublicPart(p: Part): PublicPart {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceUsd: p.priceUsd,
    laborHoursEst: p.laborHoursEst,
    fitmentDifficulty: p.fitmentDifficulty,
    imageUrl: p.imageUrl,
    store: storeOf(p.affiliateUrl),
  };
}

function toTeaserPart(p: Part): TeaserPart {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    imageUrl: p.imageUrl,
    store: storeOf(p.affiliateUrl),
  };
}
```

(`toTeaserPart` is used in Task 6.)

- [ ] **Step 4: Rewrite `ShopList`**

Replace `src/components/ShopList.tsx` with:

```tsx
import type { PublicPart, TeaserPart } from "@/lib/builds";
import { formatPrice } from "@/lib/pricing";
import { BUY_LABEL } from "@/lib/store";
import { FitmentBadge } from "@/components/FitmentBadge";
import { PartImage } from "@/components/PartImage";

// Guests get TeaserPart; the signed-in report passes full PublicPart.
type ShopPart = TeaserPart & Partial<Pick<PublicPart, "priceUsd" | "laborHoursEst" | "fitmentDifficulty">>;

export function ShopList({ parts, buildId }: { parts: ShopPart[]; buildId: string }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        We earn a commission if you buy through these links.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <div className="w-20 shrink-0 overflow-hidden rounded-md">
              <PartImage src={p.imageUrl} alt={p.name} category={p.category} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.brand}
                {p.laborHoursEst !== undefined && <> · {p.laborHoursEst} hrs install</>}
              </p>
              {p.fitmentDifficulty !== undefined && (
                <div className="mt-1">
                  <FitmentBadge difficulty={p.fitmentDifficulty} />
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              {p.priceUsd !== undefined && (
                <p className="font-bold">
                  <span className="text-xs font-normal text-muted-foreground">Est. </span>
                  {formatPrice(Number(p.priceUsd))}
                </p>
              )}
              {p.store ? (
                <a
                  href={`/go/${p.id}?build=${buildId}`}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="mt-1 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90 print:hidden"
                >
                  {BUY_LABEL[p.store]} ↗
                </a>
              ) : (
                <span className="mt-1 inline-block text-xs text-muted-foreground">Link coming soon</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: "Est." on the configurator card**

In `src/components/PartCard.tsx`, replace

```tsx
          <span className="text-sm font-bold">{formatPrice(Number(part.priceUsd))}</span>
```

with

```tsx
          <span className="text-sm font-bold">
            <span className="text-xs font-normal text-muted-foreground">Est. </span>
            {formatPrice(Number(part.priceUsd))}
          </span>
```

- [ ] **Step 6: Gate**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
```

Expected: type errors **only** in `src/routes/builds/$slug.tsx` if any (it is rewritten in Task 6); `ShopList`, `PartCard`, `builds.ts` clean. If `$slug.tsx` errors, continue to Task 6 and gate there — commit Task 5 anyway.

- [ ] **Step 7: Commit**

```bash
git add apps/cars-4by4-builder/src
git commit -m "feat(cars): store-named Buy buttons, est. prices, link disclosure"
```

---

### Task 6: Trimmed public build page; remove the PDF

**Files:**
- Modify: `apps/cars-4by4-builder/src/lib/builds.ts`
- Rewrite: `apps/cars-4by4-builder/src/routes/builds/$slug.tsx`
- Delete: `src/components/BuildQuotePdfLink.tsx`, `src/components/BuildReportPdf.tsx`, `src/routes/api/render.ts`
- Modify: `apps/cars-4by4-builder/package.json` (via npm)

- [ ] **Step 1: Extract `loadBuild` and trim `getBuild`**

In `src/lib/builds.ts`, replace the whole `export const getBuild = …;` block with:

```ts
function validateSlugOrId(slugOrId: string): string {
  if (typeof slugOrId !== "string" || slugOrId.length > 100) throw new Error("invalid build id");
  return slugOrId;
}

/** Shared by the public page and the report. Throws notFound for missing/draft builds. */
async function loadBuild(slugOrId: string) {
  const db = getDbCars();
  const build = (await db.select().from(builds).where(or(eq(builds.slug, slugOrId), eq(builds.id, slugOrId)))).at(0);
  if (!build || build.status === "draft") throw notFound();

  let status = build.status;
  let errorMessage = build.errorMessage;
  if (status === "processing" && Date.now() - build.updatedAt.getTime() > STALE_PROCESSING_MS) {
    status = "failed";
    errorMessage = "Generation timed out — try again.";
    await db.update(builds).set({ status, errorMessage, updatedAt: new Date() }).where(eq(builds.id, build.id));
  }

  const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, build.vehicleId))).at(0);
  if (!vehicle) throw notFound();
  const preset = build.presetId
    ? (await db.select().from(presets).where(eq(presets.id, build.presetId))).at(0)
    : undefined;
  const buildParts = build.selectedPartIds.length
    ? await db.select().from(parts).where(inArray(parts.id, build.selectedPartIds))
    : [];

  return {
    build,
    parts: buildParts,
    view: {
      id: build.id,
      slug: build.slug,
      isCurated: build.isCurated,
      status,
      errorMessage,
      vehicle: { id: vehicle.id, name: vehicle.name },
      presetName: preset?.name ?? null,
      presetSlug: preset?.slug ?? null,
      selectedPartIds: build.selectedPartIds,
      beforeUrl: await originalImageUrl(build.originalImageKey),
      afterUrl: build.renderKey ? publicImageUrl(build.renderKey) : null,
    },
  };
}

/** Public build page: gated fields (per-part price, labor, fitment) are never sent. */
export const getBuild = createServerFn({ method: "GET" })
  .validator(validateSlugOrId)
  .handler(async ({ data: slugOrId }) => {
    const { view, parts: buildParts } = await loadBuild(slugOrId);
    return {
      ...view,
      parts: buildParts.map(toTeaserPart),
      estimatedTotalUsd: summarize(buildParts).totalUsd,
    };
  });
```

- [ ] **Step 2: Rewrite the build page**

Replace `src/routes/builds/$slug.tsx` with:

```tsx
import { useEffect } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { getBuild } from "@/lib/builds";
import { formatPrice } from "@/lib/pricing";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildProgress } from "@/components/BuildProgress";
import { ShareButton } from "@/components/ShareButton";
import { ShopList } from "@/components/ShopList";

export const Route = createFileRoute("/builds/$slug")({
  loader: ({ params }) => getBuild({ data: params.slug }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const title = loaderData.presetName
      ? `${loaderData.vehicle.name} ${loaderData.presetName} build`
      : `${loaderData.vehicle.name} build`;
    return {
      meta: [
        { title: `${title} | 4x4 Builder` },
        { name: "description", content: `${loaderData.parts.length} upgrades with estimated prices and install time.` },
        { property: "og:title", content: title },
        ...(loaderData.afterUrl ? [{ property: "og:image", content: loaderData.afterUrl }] : []),
        ...(loaderData.isCurated ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: BuildPage,
});

function BuildPage() {
  const build = Route.useLoaderData();
  const router = useRouter();

  useEffect(() => {
    if (build.status !== "processing") return;
    const timer = setInterval(() => void router.invalidate(), 3000);
    return () => clearInterval(timer);
  }, [build.status, router]);

  if (build.status === "processing") {
    return (
      <main className="mx-auto max-w-3xl px-4">
        <BuildProgress />
      </main>
    );
  }

  if (build.status === "failed" || !build.afterUrl) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl">That render didn't work</h1>
        <p className="text-muted-foreground">{build.errorMessage ?? "Generation failed — try again."}</p>
        <Link
          to="/build"
          search={{ vehicle: build.vehicle.id, parts: build.selectedPartIds, step: "photo" }}
          className="rounded-md bg-primary px-5 py-2.5 font-bold text-primary-foreground"
        >
          Try again
        </Link>
      </main>
    );
  }

  const title = build.presetName ? `${build.vehicle.name} — ${build.presetName}` : `Your ${build.vehicle.name} build`;
  const slug = build.slug ?? build.id;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl">{title}</h1>

      <div className="mt-6">
        <BeforeAfterSlider beforeUrl={build.beforeUrl} afterUrl={build.afterUrl} />
        <p className="mt-2 text-xs text-muted-foreground">AI visualization — actual appearance may vary.</p>
      </div>

      {build.isCurated && (
        <Link
          to="/build"
          search={{ vehicle: build.vehicle.id, preset: build.presetSlug ?? undefined, parts: build.selectedPartIds, step: "photo" }}
          className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          Make it yours — try it on your truck
        </Link>
      )}

      <section className="mt-10">
        <h2 className="text-2xl">Shop this build</h2>
        <div className="mt-4">
          <ShopList parts={build.parts} buildId={build.id} />
        </div>
        <div className="ml-auto mt-4 flex max-w-xs justify-between border-t border-border pt-1 text-base font-bold">
          <span>Estimated total</span>
          <span>{formatPrice(build.estimatedTotalUsd)}</span>
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-primary/40 bg-card p-5">
        <h2 className="text-xl">Full build report</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-part prices, install hours, the parts-and-labor breakdown and fitment notes — printable. Free with an
          account.
        </p>
        <Link
          to="/builds/$slug/report"
          params={{ slug }}
          className="mt-4 inline-flex rounded-md bg-primary px-5 py-2.5 font-bold text-primary-foreground"
        >
          Unlock full report
        </Link>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <ShareButton />
        <a
          href={build.afterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary"
        >
          Full-size image ↗
        </a>
      </div>
    </main>
  );
}
```

(The `/builds/$slug/report` link type-checks once Task 7 creates that route; until then expect one route-type error here.)

- [ ] **Step 3: Delete the PDF pieces**

```bash
cd apps/cars-4by4-builder
grep -rn "/api/render" src --exclude=routeTree.gen.ts
```

Expected: no output (only the old `$slug.tsx` used it). Then:

```bash
git rm src/components/BuildQuotePdfLink.tsx src/components/BuildReportPdf.tsx src/routes/api/render.ts
cd ../..
npm uninstall @react-pdf/renderer -w cars-4by4-builder
```

Expected: `@react-pdf/renderer` gone from `apps/cars-4by4-builder/package.json`.

- [ ] **Step 4: Commit** (gate runs after Task 7, when the report route exists)

```bash
git add -A apps/cars-4by4-builder package-lock.json
git commit -m "feat(cars): trimmed public build page with report CTA; drop PDF quote"
```

---

### Task 7: Sign-in page

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/next.ts`
- Create: `apps/cars-4by4-builder/src/routes/sign-in.tsx`

- [ ] **Step 1: Safe redirect helper**

Create `src/lib/next.ts`:

```ts
/** Only same-origin paths; anything else falls back to "/". */
export function safeNext(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/";
}
```

- [ ] **Step 2: Spot-check it**

```bash
cd apps/cars-4by4-builder
npx tsx -e 'import("./src/lib/next.ts").then(({safeNext})=>console.log(["/builds/x/report","//evil.com","/\\evil","https://evil.com",undefined].map(safeNext).join(" ")))'
cd ../..
```

Expected: `/builds/x/report / / / /`

- [ ] **Step 3: The page**

Create `src/routes/sign-in.tsx`:

```tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/next";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({ next: safeNext(search.next) }),
  head: () => ({ meta: [{ title: "Sign in | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: SignInPage,
});

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function SignInPage() {
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function google() {
    setError(null);
    setPending(true);
    const { error: err } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (err) {
      setError(err.message ?? "Google sign-in failed — try again.");
      setPending(false);
    }
    // success: the browser is redirected to Google
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: err } =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    if (err) {
      setError(err.message ?? "That didn't work — check your details.");
      setPending(false);
      return;
    }
    window.location.assign(next); // full load so header + loaders see the new session
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-5 px-4 py-16">
      <h1 className="text-3xl">{mode === "sign-in" ? "Sign in" : "Create your account"}</h1>
      <p className="text-sm text-muted-foreground">Unlock full build reports and keep your builds in My projects.</p>

      <button
        type="button"
        onClick={google}
        disabled={pending}
        className="rounded-md border border-border px-4 py-2.5 font-semibold hover:border-primary disabled:opacity-50"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <input className={INPUT} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input
          className={INPUT}
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={INPUT}
          type="password"
          placeholder="Password (8+ characters)"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
        }}
        className="text-sm font-semibold text-primary"
      >
        {mode === "sign-in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Regenerate routes and commit** (gate after Task 8)

```bash
npm run generate-routes -w cars-4by4-builder
git add apps/cars-4by4-builder/src
git commit -m "feat(cars): sign-in page (Google + email/password)"
```

---

### Task 8: Gated report page

**Files:**
- Modify: `apps/cars-4by4-builder/src/lib/builds.ts`
- Create: `apps/cars-4by4-builder/src/routes/builds/$slug_.report.tsx`
- Modify: `apps/cars-4by4-builder/src/components/SiteFooter.tsx`

- [ ] **Step 1: `getReport`**

In `src/lib/builds.ts`, change the router import to:

```ts
import { notFound, redirect } from "@tanstack/react-router";
```

and the session import to:

```ts
import { accountUser, currentUser } from "@/server/session";
```

Then add after `getBuild`:

```ts
/** Spec 2 §3.5: account users only; owner's builds, or any curated build. */
export const getReport = createServerFn({ method: "GET" })
  .validator(validateSlugOrId)
  .handler(async ({ data: slugOrId }) => {
    const user = await accountUser();
    if (!user) throw redirect({ to: "/sign-in", search: { next: `/builds/${slugOrId}/report` } });

    const { build, view, parts: buildParts } = await loadBuild(slugOrId);
    if (!build.isCurated && build.userId !== user.id) throw notFound(); // don't reveal it exists
    if (view.status === "processing") throw redirect({ to: "/builds/$slug", params: { slug: slugOrId } });
    if (view.status !== "completed" || !view.afterUrl) throw notFound();

    return { ...view, afterUrl: view.afterUrl, parts: buildParts.map(toPublicPart) };
  });
```

- [ ] **Step 2: The report route**

Create `src/routes/builds/$slug_.report.tsx` (the trailing `_` keeps it out of the `$slug` page's layout; URL is `/builds/<slug>/report`):

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Info } from "lucide-react";
import { getReport } from "@/lib/builds";
import { getAdvisories } from "@/lib/advisories";
import { formatPrice, summarize } from "@/lib/pricing";
import { ShopList } from "@/components/ShopList";

export const Route = createFileRoute("/builds/$slug_/report")({
  loader: ({ params }) => getReport({ data: params.slug }),
  head: () => ({ meta: [{ title: "Build report | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: ReportPage,
});

function ReportPage() {
  const report = Route.useLoaderData();
  const totals = summarize(report.parts);
  const advisories = getAdvisories(report.parts);
  const title = report.presetName ? `${report.vehicle.name} — ${report.presetName}` : `${report.vehicle.name} build`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Build report</p>
          <h1 className="text-3xl md:text-4xl">{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary print:hidden"
        >
          Print
        </button>
      </div>

      <img src={report.afterUrl} alt={title} className="mt-6 w-full rounded-lg" />
      <p className="mt-2 text-xs text-muted-foreground">AI visualization — actual appearance may vary.</p>

      <section className="mt-10">
        <h2 className="text-2xl">Parts</h2>
        <div className="mt-4">
          <ShopList parts={report.parts} buildId={report.id} />
        </div>
        <dl className="ml-auto mt-4 flex max-w-xs flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Parts</dt>
            <dd>{formatPrice(totals.partsUsd)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Est. labor ({totals.laborHours} hrs)</dt>
            <dd>{formatPrice(totals.laborUsd)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
            <dt>Estimated total</dt>
            <dd>{formatPrice(totals.totalUsd)}</dd>
          </div>
        </dl>
      </section>

      {advisories.length > 0 && (
        <section className="mt-10 break-inside-avoid">
          <h2 className="text-2xl">Fitment notes</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {advisories.map((a) => (
              <li key={a.message} className="flex gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                {a.type === "warning" ? (
                  <AlertTriangle aria-label="Warning" className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Info aria-label="Note" className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        Prices and install times are estimates. We earn a commission if you buy through links in this report.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Hide the footer when printing**

In `src/components/SiteFooter.tsx`, change `<footer className="border-t border-border">` to `<footer className="border-t border-border print:hidden">`. (The header gets the same in Task 9.)

- [ ] **Step 4: Regenerate routes and gate**

```bash
npm run generate-routes -w cars-4by4-builder
npx turbo run type-check lint build --filter=cars-4by4-builder...
```

Expected: pass (Tasks 5–8 now type-check together). If `redirect({ to: "/sign-in", search: { next } })` complains about search typing, the route tree is stale — rerun `generate-routes`.

- [ ] **Step 5: Manual check**

`npm run dev:cars`. Open a completed build page in a private window → "Unlock full report" → lands on `/sign-in?next=/builds/<id>/report`. DevTools → Network → the `getBuild` server-fn response: no `priceUsd`, `laborHoursEst` or `fitmentDifficulty` anywhere.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src
git commit -m "feat(cars): gated printable build report"
```

---

### Task 9: My projects + header account links

**Files:**
- Modify: `apps/cars-4by4-builder/src/lib/builds.ts`
- Create: `apps/cars-4by4-builder/src/routes/projects.tsx`
- Rewrite: `apps/cars-4by4-builder/src/components/SiteHeader.tsx`

- [ ] **Step 1: `getProjects`**

In `src/lib/builds.ts`, add `desc` to the drizzle import:

```ts
import { and, asc, count, desc, eq, gte, inArray, ne, or } from "drizzle-orm";
```

and add at the end of the file:

```ts
export const getProjects = createServerFn({ method: "GET" }).handler(async () => {
  const user = await accountUser();
  if (!user) throw redirect({ to: "/sign-in", search: { next: "/projects" } });

  const rows = await getDbCars()
    .select({
      id: builds.id,
      status: builds.status,
      renderKey: builds.renderKey,
      createdAt: builds.createdAt,
      vehicleName: vehicles.name,
    })
    .from(builds)
    .innerJoin(vehicles, eq(vehicles.id, builds.vehicleId))
    .where(and(eq(builds.userId, user.id), ne(builds.status, "draft")))
    .orderBy(desc(builds.createdAt));

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    vehicleName: r.vehicleName,
    createdAt: r.createdAt.toISOString(),
    thumbUrl: r.renderKey ? publicImageUrl(r.renderKey) : null,
  }));
});
```

- [ ] **Step 2: The page**

Create `src/routes/projects.tsx`:

```tsx
import { Link, createFileRoute } from "@tanstack/react-router";
import { getProjects } from "@/lib/builds";

export const Route = createFileRoute("/projects")({
  loader: () => getProjects(),
  head: () => ({ meta: [{ title: "My projects | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: ProjectsPage,
});

const STATUS_LABEL: Record<string, string> = { processing: "Rendering…", failed: "Failed", completed: "" };

function ProjectsPage() {
  const projects = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">My projects</h1>
      {projects.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No builds yet.{" "}
          <Link to="/build" className="font-semibold text-primary">
            Build your first one
          </Link>
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
              {p.status === "completed" ? (
                <Link to="/builds/$slug/report" params={{ slug: p.id }} className="block hover:opacity-90">
                  <ProjectCard project={p} />
                </Link>
              ) : (
                <Link to="/builds/$slug" params={{ slug: p.id }} className="block hover:opacity-90">
                  <ProjectCard project={p} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ProjectCard({ project }: { project: { vehicleName: string; createdAt: string; status: string; thumbUrl: string | null } }) {
  return (
    <>
      {project.thumbUrl ? (
        <img src={project.thumbUrl} alt={project.vehicleName} className="aspect-video w-full object-cover" />
      ) : (
        <div className="aspect-video w-full bg-muted" />
      )}
      <div className="flex items-center justify-between gap-2 p-3 text-sm">
        <span className="font-semibold">{project.vehicleName}</span>
        <span className="text-muted-foreground">
          {STATUS_LABEL[project.status] || new Date(project.createdAt).toLocaleDateString()}
        </span>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Header**

Replace `src/components/SiteHeader.tsx` with:

```tsx
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const { data } = authClient.useSession();
  const account = data && !data.user.isAnonymous ? data.user : null; // guests render as signed out

  async function signOut() {
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <header className="border-b border-border print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight">
          4x4 <span className="text-primary">Builder</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link to="/build" className="hover:text-primary">
            Build yours
          </Link>
          {account ? (
            <>
              <Link to="/projects" className="hover:text-primary">
                My projects
              </Link>
              <button type="button" onClick={signOut} className="text-muted-foreground hover:text-primary">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/sign-in" search={{ next: "/" }} className="hover:text-primary">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Regenerate routes and gate**

```bash
npm run generate-routes -w cars-4by4-builder
npx turbo run type-check lint build --filter=cars-4by4-builder...
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/src
git commit -m "feat(cars): My projects page and header account links"
```

---

### Task 10: Retention keeps account builds; prune stale guests

**Files:**
- Modify: `apps/cars-4by4-builder/scripts/cleanup.ts`

- [ ] **Step 1: Rewrite the script**

Replace `scripts/cleanup.ts` with:

```ts
import { and, eq, lt, notExists } from "drizzle-orm";
import { builds, carsUsers, getDbCars } from "@smartekai/db/cars";
import { BUCKETS, deleteObject } from "@smartekai/storage";

const DAY = 86_400_000;

// Retention (Spec 2 §5): drafts > 24h; non-curated builds > 90 days unless an
// account (non-anonymous user) owns them. Curated never. Guests older than 30
// days with no builds left are deleted (sessions cascade).
// Clicks are kept — they have no FK to builds.
async function main() {
  const db = getDbCars();
  const now = Date.now();
  const staleDrafts = await db
    .select()
    .from(builds)
    .where(and(eq(builds.status, "draft"), lt(builds.createdAt, new Date(now - DAY))));
  const old = await db
    .select({ build: builds, isAnonymous: carsUsers.isAnonymous })
    .from(builds)
    .leftJoin(carsUsers, eq(carsUsers.id, builds.userId))
    .where(and(eq(builds.isCurated, false), lt(builds.createdAt, new Date(now - 90 * DAY))));
  // isAnonymous: null = unowned (no user row), true = guest, false = account → keep.
  const expired = old.filter((r) => r.isAnonymous !== false).map((r) => r.build);

  const doomed = [...new Map([...staleDrafts, ...expired].map((b) => [b.id, b])).values()];
  for (const b of doomed) {
    if (!b.originalImageKey.startsWith("stock/")) await deleteObject(BUCKETS.uploads, b.originalImageKey);
    if (b.renderKey) await deleteObject(BUCKETS.renders, b.renderKey);
    await db.delete(builds).where(eq(builds.id, b.id));
  }

  const guests = await db
    .delete(carsUsers)
    .where(
      and(
        eq(carsUsers.isAnonymous, true),
        lt(carsUsers.createdAt, new Date(now - 30 * DAY)),
        notExists(db.select({ id: builds.id }).from(builds).where(eq(builds.userId, carsUsers.id))),
      ),
    )
    .returning({ id: carsUsers.id });

  console.log(`cleanup: removed ${doomed.length} builds, ${guests.length} stale guests`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Gate and dry run**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
npm run cleanup -w cars-4by4-builder
```

Expected: gate passes; script prints `cleanup: removed N builds, M stale guests` with no error (N, M likely 0 on a fresh DB).

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/scripts/cleanup.ts
git commit -m "feat(cars): keep account-owned builds; prune stale guest users"
```

---

### Task 11: End-to-end verification

Needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env.local` (user's external setup).

- [ ] **Step 1: Full scoped gate**

```bash
npx turbo run type-check lint build --filter=cars-4by4-builder... --filter=@smartekai/auth
```

Expected: pass.

- [ ] **Step 2: Click-through** (`npm run dev:cars`, desktop and ~390px mobile width; private window per run)

- [ ] Guest builds (studio photo) → build page shows render, part names, store-named Buy buttons, disclosure, estimated total, "Unlock full report".
- [ ] Unlock → `/sign-in` → **Continue with Google** → lands on the report for **that** build → header shows My projects → build listed there.
- [ ] Same with **Create account** (email+password).
- [ ] Guest builds, then **signs in** to the existing account from the previous run → the new build appears in that account's My projects.
- [ ] Signed-in user opens another user's (non-curated) report URL → 404 page.
- [ ] Signed-in user opens a curated build's report → report shows.
- [ ] Guest's `getBuild` network response has no `priceUsd` / `laborHoursEst` / `fitmentDifficulty`.
- [ ] Report → **Print** → preview shows only report content (no header, footer, Buy buttons, Print button).
- [ ] No "PDF quote" button anywhere.
- [ ] Buy → `/go/<partId>` → one new `outbound_clicks` row (only once real affiliate URLs are seeded — otherwise "Link coming soon" shows, which is correct).
- [ ] Sign out → header shows "Sign in"; `/projects` redirects to `/sign-in?next=/projects`.

- [ ] **Step 3: Report**

Summarize pass/fail per box to the user. Merging into `main` is ask-first (AGENTS.md).
