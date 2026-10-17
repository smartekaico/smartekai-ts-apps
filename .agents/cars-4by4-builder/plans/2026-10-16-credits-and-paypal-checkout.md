> **2026-10-17 — payment provider changed to NOWPayments (USDT TRC20).** Tasks 0–11 below are done (render gating, credit primitives, refunds, UI). The PayPal-specific parts (Tasks 4, 5, 9, 10, 12–14 payment steps) are superseded: the NOWPayments work is implemented directly from the spec `.agents/cars-4by4-builder/specs/2026-10-16-credits-and-paypal-checkout-design.md` §1, §2, §5–§9, without a code-complete plan.

# Credits + PayPal Checkout (cars-4by4-builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every visitor's first render is free; further renders cost 10 credits, bought as one-time PayPal packs by signed-in users. Failed renders refund what they used.

**Spec:** `.agents/cars-4by4-builder/specs/2026-10-16-credits-and-paypal-checkout-design.md` (Spec 3). Builds on Spec 2 (`2026-10-16-accounts-and-full-report-design.md`, implemented and merged at `b56f8a1`).

**Architecture:** `cars_user` gains `credit_balance` + `free_render_used`; `builds` gains `charge`; a new `credit_ledger` table records every balance change. Because the cars DB is `neon-http` (no interactive transactions), spends and free-render claims are single conditional `UPDATE … RETURNING` statements; purchases and refunds are `db.batch([...])` (a transaction). `startBuild` charges the render (free → credits → refuse) before the build flips to `processing`; `runGeneration` and the stale-timeout path refund a failed build exactly once. A new thin package `@smartekai/paypal` (plain `fetch`, Orders v2) creates and captures orders; the `/credits` page renders PayPal buttons with `@paypal/react-paypal-js` and credits the account on capture, idempotent by the unique `paypal_order_id`.

**Tech Stack:** TanStack Start (Vite + Nitro), React 19, Better Auth 1.7.7 (anonymous plugin), Drizzle ORM 0.45 + Neon HTTP, PayPal REST Orders v2, Tailwind v3. **New dependencies:** `@paypal/react-paypal-js@^10.5.2` (cars app; approved in Spec 3 §5) and the new workspace package `@smartekai/paypal` (no third-party deps). No PayPal server SDK.

**Validation strategy:** No test suite exists (`AGENTS.md`: "test: none"). Each task verifies with the scoped gate plus the spot check or manual check it names. Pure helpers get `npx tsx -e '…'` spot checks; DB primitives get a temporary `tsx` script run **against the Neon rehearsal branch only**; the package gets a sandbox spot check. Expected output is written down for each.

```bash
# from the repo root
npx turbo run build --filter=cars-4by4-builder^...     # build workspace deps' dist/ first
git checkout -- packages/auth/dist                      # ALWAYS after the line above (see Gotchas)
npx turbo run type-check lint --filter=cars-4by4-builder...
npx turbo run build --filter=cars-4by4-builder...      # where a task says so
```

`./scripts/gate.sh` as a whole may still fail on pre-existing `apps/legal-os` lint; the scoped commands are the signal for this plan.

**Gotchas (apply in every task):**
- Building `@smartekai/auth` regenerates `packages/auth/dist/index.*`, which are intentionally stale in git. After any turbo build that includes it, run `git checkout -- packages/auth/dist` and **never commit** anything under `packages/auth/`.
- Never hand-edit `apps/cars-4by4-builder/src/routeTree.gen.ts`; run `npm run generate-routes -w cars-4by4-builder`.
- `type-check` has no `dependsOn: ["^build"]`, and the app type-checks against packages' committed `dist/`. When a package changed, run `npx turbo run build --filter=cars-4by4-builder^...` first.
- Package `dist/` (`packages/db`, `packages/paypal`) **is committed**; commit it with the source change.
- Never print connection strings or secrets. Commands below capture them in shell variables only.
- Never hand-edit `package-lock.json`; edit `package.json`, run `npm install`.
- Commit messages: append the attribution trailer your session requires.

**Database rule for this plan (from `.agents/logs/2026-10-16-cars-db-push-drops-sequences.md`):** **never run `db:push:cars` against production.** drizzle-kit push on the cars DB also tries to DROP 8 legacy sequences. Schema changes go: Drizzle schema edit → generated-DDL cross-check → hand-written additive DDL applied to a Neon branch with `psql -1` → (all dev and click-through run against that branch) → **ask** → the same DDL applied to production in one transaction → delete the branch.

**Rehearsal branch DB (used by Tasks 3, 6, 7, 11, 12):** Neon project `ancient-hall-95124568`, branch `cars-credits`, database `neondb`. Every command that needs it computes the URL inline, refuses to run if empty, and never prints it:

```bash
BRANCH_DB="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb --pooled)" && test -n "$BRANCH_DB" && DATABASE_NEONDB_SMARTEKAI="$BRANCH_DB" <command>
```

Shell vars win over both `.env.local` files (`vite.config.ts` and Node `--env-file` never overwrite an existing var), so `<command>` (dev server, tsx scripts) talks to the branch, not production. `DATABASE_NEONDB_SMARTEKAI` is in `turbo.json` `globalEnv`, so `npm run dev:cars` passes it through.

**Branch:** `feat/cars-credits` (branched from `feat/cars-accounts` == `main` + this plan). Never commit to `main`; merging is ask-first.

**Ask-first checkpoints:**
1. Task 13 Step 2 — applying the DDL to the **production** cars database.
2. Task 14 — switching PayPal from sandbox to **live** (not executed by this plan).

**External setup the user does (not code) — needed from Task 5 on:**
- developer.paypal.com → Apps & Credentials → **Sandbox** → Create App (Merchant, REST). Copy Client ID and Secret.
- Add to the **root** `.env.local` (not the app-level one — that file holds cars-only overrides like `BETTER_AUTH_URL`):
  ```
  PAYPAL_CLIENT_ID=<sandbox client id>
  PAYPAL_CLIENT_SECRET=<sandbox secret>
  PAYPAL_ENV=sandbox
  ```
- Sandbox → Accounts: note the default **Personal** (buyer) sandbox account email/password for the click-through.
- Neon CLI authenticated once (interactive): `! neon auth`.

---

## File map

**`packages/db`**
- Modify `src/cars/schema.ts` — `carsUsers.creditBalance`, `carsUsers.freeRenderUsed`, `builds.charge`, new `creditLedger`; types `BuildCharge`, `CreditReason`, `CreditLedgerEntry`.
- Modify `drizzle.cars.config.ts` — add `credit_ledger` to `tablesFilter`.
- Rebuild + commit `dist/cars/*`.

**`packages/paypal`** (new)
- Create `package.json`, `tsconfig.json`, `src/index.ts` — `getAccessToken`, `createOrder`, `captureOrder`, `PayPalError`.
- Build + commit `dist/index.js`, `dist/index.d.ts`.

**`apps/cars-4by4-builder`**
- Modify `package.json` — add `@smartekai/paypal`, `@paypal/react-paypal-js`.
- Modify `vite.config.ts` — SSR-externalize `@smartekai/paypal`.
- Create `src/lib/credit-packs.ts` — `RENDER_COST`, `CREDIT_PACKS`, `findPack`, `rendersFor`, `CreditBlock`, `CreditState`.
- Modify `src/server/rate-limit.ts` — `freeRenderRules`.
- Create `src/server/credits.ts` — atomic primitives: `getCreditState`, `claimFreeRender`, `spendCredits`, `chargeRender`, `refundRender`, `refundFailedBuild`, `creditPurchase`, `findPurchase`.
- Modify `src/lib/builds.ts` — `Fail.action`; `startBuild` gating + draft-ownership fix; refund on stale timeout.
- Rewrite `src/server/generate.ts` — refund on failure.
- Modify `src/lib/auth.ts` — `onLinkAccount` carries `free_render_used`.
- Create `src/lib/credits.ts` — server fns `getCredits`, `getCreditsPage`, `createPayPalOrder`, `capturePayPalOrder`.
- Create `src/lib/use-credits.ts` — `useCredits`, `notifyCreditsChanged`.
- Rewrite `src/components/Toast.tsx` — `tone`, optional `action` link.
- Create `src/routes/credits.tsx` — the `/credits` page.
- Rewrite `src/components/SiteHeader.tsx` — balance chip.
- Rewrite `src/components/BuildFooter.tsx` — render-cost line.
- Rewrite `src/components/PhotoStep.tsx` — Sign in / Buy credits toast actions.

**Root**
- Modify `turbo.json` — `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` in `globalEnv`.

**Unchanged on purpose:** `scripts/render-gallery.ts` calls `renderUpgrade` directly (never `startBuild`), so curated renders already bypass credits (Spec 3 §0). `scripts/cleanup.ts` deletes stale *guest* users only; guests never hold credits. `credit_ledger.user_id` is `on delete set null`, so deleting any user keeps their purchase history.

---

### Task 0: Preflight

- [ ] **Step 1: Confirm branch and clean tree**

```bash
cd "/Users/ar/Desktop/Web Development/smartekai-saas"
git branch --show-current
git status --short
```

Expected: `feat/cars-credits`; status shows at most the untracked `.agents/cars-4by4-builder/sops/sop-affiliate-links.md` (not ours — leave it alone, never `git add -A` at the repo root).

- [ ] **Step 2: Confirm tools**

```bash
which neon psql
neon projects list --output table 2>&1 | grep -c ancient-hall-95124568
```

Expected: two paths; `1`. If `neon` reports it is not authenticated, ask the user to run `! neon auth`.

---

### Task 1: Credit packs (pure module)

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/credit-packs.ts`

- [ ] **Step 1: Write the module**

Create `apps/cars-4by4-builder/src/lib/credit-packs.ts`:

```ts
// Spec 3 §0/§2. Credits are a unit, not a render count, so other actions can
// be priced later without repricing packs. Client-safe: no server imports.

export const RENDER_COST = 10;

// No pack under ~$10: PayPal's fixed per-transaction fee would take ~13% of a
// $4.99 sale. The server always resolves price from `id`.
export const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 100, priceUsd: "9.99" }, // ≈ 10 renders
  { id: "builder", name: "Builder", credits: 300, priceUsd: "24.99" }, // ≈ 30 renders
  { id: "pro", name: "Pro", credits: 1000, priceUsd: "69.99" }, // ≈ 100 renders
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

/** Server-side price lookup — a client-sent amount is never trusted. */
export function findPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** "300 credits ≈ 30 renders". */
export function rendersFor(credits: number): number {
  return Math.floor(credits / RENDER_COST);
}

/** Why a render was refused — the client turns it into a Sign in / Buy credits link. */
export type CreditBlock = "sign-in" | "buy-credits";

/** `account` = a real account (guests never hold credits). */
export type CreditState = { account: boolean; balance: number; freeRenderUsed: boolean };
```

- [ ] **Step 2: Spot-check it**

```bash
cd apps/cars-4by4-builder
npx tsx -e 'import("./src/lib/credit-packs.ts").then(({CREDIT_PACKS,findPack,rendersFor})=>console.log(CREDIT_PACKS.map((p)=>p.id+":"+rendersFor(p.credits)).join(" "), findPack("builder")?.priceUsd, findPack("nope"), rendersFor(9), rendersFor(230)))'
cd ../..
```

Expected: `starter:10 builder:30 pro:100 24.99 undefined 0 23`

- [ ] **Step 3: Gate and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder
git add apps/cars-4by4-builder/src/lib/credit-packs.ts
git commit -m "feat(cars): credit packs and render cost"
```

Expected: gate passes.

---

### Task 2: Schema — credits columns and `credit_ledger`

**Files:**
- Modify: `packages/db/src/cars/schema.ts`
- Modify: `packages/db/drizzle.cars.config.ts`
- Rebuild: `packages/db/dist/cars/*`

- [ ] **Step 1: Columns on `cars_user`**

In `packages/db/src/cars/schema.ts`, in `carsUsers`, replace

```ts
  isAnonymous: boolean("is_anonymous").default(false),
```

with

```ts
  isAnonymous: boolean("is_anonymous").default(false),
  // Spec 3 §1. Guests never hold credits; every user (guest or account) gets
  // one free render. Better Auth never writes these — the defaults apply.
  creditBalance: integer("credit_balance").notNull().default(0),
  freeRenderUsed: boolean("free_render_used").notNull().default(false),
```

- [ ] **Step 2: `builds.charge`**

Below `export type BuildStatus = …;` add:

```ts
/** What a render used, so a failure can give back the right thing. null = curated, pre-credits, or already refunded. */
export type BuildCharge = "free" | "credit";
export type CreditReason = "purchase" | "render" | "refund" | "grant";
```

In the `builds` columns, after `errorMessage: text("error_message"),` add:

```ts
    charge: text("charge").$type<BuildCharge>(),
```

- [ ] **Step 3: `credit_ledger` table**

After the `builds` table (before `outboundClicks`) add:

```ts
// Audit trail of every balance change (Spec 3 §1). Purchases are idempotent
// by the unique paypal_order_id. build_id has no FK: the ledger outlives
// cleaned-up builds.
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    // Nullable + set null: deleting a user keeps their purchase history (audit trail).
    userId: text("user_id").references(() => carsUsers.id, { onDelete: "set null" }),
    delta: integer("delta").notNull(), // +N purchase/refund/grant, −RENDER_COST render
    reason: text("reason").$type<CreditReason>().notNull(),
    buildId: text("build_id"),
    paypalOrderId: text("paypal_order_id").unique(),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("credit_ledger_user_id_idx").on(table.userId),
  }),
);
```

At the end of the file, after `export type Build = …;` add:

```ts
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
```

(`index.ts` re-exports `*` from `./schema`, so no change there.)

- [ ] **Step 4: Let drizzle-kit see the new table**

In `packages/db/drizzle.cars.config.ts`, in `tablesFilter`, after `"outbound_clicks",` add:

```ts
    "credit_ledger",
```

- [ ] **Step 5: Build the db package; type-check the app**

```bash
npx turbo run build --filter=cars-4by4-builder^...
git checkout -- packages/auth/dist
npx turbo run type-check --filter=cars-4by4-builder...
git status --short packages
```

Expected: pass; status lists only `packages/db/src/cars/schema.ts`, `packages/db/drizzle.cars.config.ts`, `packages/db/dist/cars/schema.js`, `packages/db/dist/cars/schema.d.ts` (nothing under `packages/auth`).

- [ ] **Step 6: Cross-check the DDL drizzle would generate (no DB access)**

```bash
cd packages/db
OUT="${TMPDIR:-/tmp}/cars-ddl-check"; rm -rf "$OUT"
npx drizzle-kit generate --dialect=postgresql --schema=./src/cars/schema.ts --out="$OUT"
grep -h -e '"credit_balance"' -e '"free_render_used"' -e '"charge"' -e 'credit_ledger' "$OUT"/*.sql
grep -h -A11 'CREATE TABLE "credit_ledger"' "$OUT"/*.sql
rm -rf "$OUT"
cd ../..
```

Expected (order may differ; `generate` emits a full-schema snapshot, so the columns appear inside `CREATE TABLE` rather than as `ALTER`):

```
	"credit_balance" integer DEFAULT 0 NOT NULL,
	"free_render_used" boolean DEFAULT false NOT NULL,
	"charge" text,
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"build_id" text,
	"paypal_order_id" text,
	"amount_usd" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_paypal_order_id_unique" UNIQUE("paypal_order_id")
);
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_cars_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cars_user"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "credit_ledger_user_id_idx" ON "credit_ledger" USING btree ("user_id");
```

These are exactly the spellings used in the DDL of Tasks 3 and 13. If any name or type differs, **update the DDL in Tasks 3 and 13 to the generated spelling** before continuing (and note it in the task report).

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/cars/schema.ts packages/db/drizzle.cars.config.ts packages/db/dist/cars
git commit -m "feat(db): cars credit balance, free render flag, build charge, credit ledger"
```

Note: production does not have these columns yet (Task 13). Do not deploy this branch before Task 13.

---

### Task 3: Rehearse the DDL on a Neon branch

No commit. The branch `cars-credits` stays alive until Task 13 — all dev and click-through in this plan run against it.

- [ ] **Step 1: Create the branch from production**

```bash
neon branches create --project-id ancient-hall-95124568 --name cars-credits --parent production
```

Expected: a table describing branch `cars-credits` (no connection string printed unless the CLI does so by default — if it does, don't copy it anywhere).

- [ ] **Step 2: Apply the additive DDL in one transaction**

```bash
BRANCH_DIRECT="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb)" && test -n "$BRANCH_DIRECT" && psql "$BRANCH_DIRECT" -v ON_ERROR_STOP=1 -1 <<'SQL'
ALTER TABLE "cars_user" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cars_user" ADD COLUMN "free_render_used" boolean DEFAULT false NOT NULL;
ALTER TABLE "builds" ADD COLUMN "charge" text;
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"build_id" text,
	"paypal_order_id" text,
	"amount_usd" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_paypal_order_id_unique" UNIQUE("paypal_order_id")
);
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_cars_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cars_user"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "credit_ledger_user_id_idx" ON "credit_ledger" USING btree ("user_id");
SQL
```

Expected: `ALTER TABLE` ×3, `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, no `ERROR`. (`ADD COLUMN … DEFAULT … NOT NULL` is a metadata-only change on Postgres ≥ 11 — no table rewrite.)

- [ ] **Step 3: Verify the shape**

```bash
BRANCH_DIRECT="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb)" && test -n "$BRANCH_DIRECT" && psql "$BRANCH_DIRECT" -v ON_ERROR_STOP=1 <<'SQL'
select table_name, column_name, data_type, column_default, is_nullable
  from information_schema.columns
 where (table_name = 'cars_user' and column_name in ('credit_balance', 'free_render_used'))
    or (table_name = 'builds' and column_name = 'charge')
 order by 1, 2;
\d credit_ledger
SQL
```

Expected: `builds.charge text null YES`; `cars_user.credit_balance integer 0 NO`; `cars_user.free_render_used boolean false NO`; `\d credit_ledger` lists the 8 columns, `credit_ledger_pkey`, `credit_ledger_paypal_order_id_unique`, `credit_ledger_user_id_idx`, and the FK `credit_ledger_user_id_cars_user_id_fk … ON DELETE SET NULL`.

- [ ] **Step 4: Drift check — drizzle sees no remaining schema diff (branch only)**

```bash
BRANCH_DIRECT="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb)" && test -n "$BRANCH_DIRECT" && DRIZZLE_CARS_URL="$BRANCH_DIRECT" npm run db:push:cars -w @smartekai/db -- --verbose
```

Expected: the only planned statements are the known `DROP SEQUENCE "public".…_seq` lines (the log's 8 legacy sequences), then the known failure `2BP01 … depends on sequence …`. **No** `ALTER TABLE`/`CREATE TABLE`/`CREATE INDEX` touching `cars_user`, `builds` or `credit_ledger` — that proves the hand DDL matches the Drizzle schema. If any such statement appears, stop and reconcile Task 2's schema with the DDL. If drizzle-kit prompts interactively, answer No / Ctrl-C and report the planned statements instead. (This runs against the throwaway branch only; never point it at production.)

---

### Task 4: `@smartekai/paypal` thin client

**Files:**
- Create: `packages/paypal/package.json`
- Create: `packages/paypal/tsconfig.json`
- Create: `packages/paypal/src/index.ts`

- [ ] **Step 1: `package.json`** (mirrors `packages/storage`)

```json
{
  "name": "@smartekai/paypal",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "lint": "npx @biomejs/biome lint --write ./src",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.19.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: `tsconfig.json`** (identical to `packages/storage/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: `src/index.ts`**

```ts
/**
 * Thin PayPal REST client (OAuth2 + Orders v2) — plain fetch, no SDK.
 * Server-side only: it holds the client secret. PAYPAL_ENV picks the API host
 * ("sandbox" by default, "live" for real money). Apps never call PayPal's REST
 * API directly (AGENTS.md: providers stay behind a package).
 */

export type PayPalEnv = "sandbox" | "live";

const BASE_URL: Record<PayPalEnv, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — packages/paypal needs it to reach PayPal`);
  }
  return value;
}

export function paypalEnv(): PayPalEnv {
  const value = process.env.PAYPAL_ENV ?? "sandbox";
  if (value !== "sandbox" && value !== "live") {
    throw new Error(`PAYPAL_ENV must be "sandbox" or "live", got "${value}"`);
  }
  return value;
}

export class PayPalError extends Error {
  constructor(
    readonly operation: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`PayPal ${operation} failed: HTTP ${status} ${body.slice(0, 500)}`);
    this.name = "PayPalError";
  }
}

let cachedToken: { env: PayPalEnv; token: string; expiresAt: number } | undefined;

/** OAuth2 client-credentials token, cached until a minute before it expires. */
export async function getAccessToken(): Promise<string> {
  const env = paypalEnv();
  if (cachedToken && cachedToken.env === env && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  const basic = Buffer.from(`${requireEnv("PAYPAL_CLIENT_ID")}:${requireEnv("PAYPAL_CLIENT_SECRET")}`).toString(
    "base64",
  );
  const res = await fetch(`${BASE_URL[env]}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const text = await res.text();
  if (!res.ok) throw new PayPalError("getAccessToken", res.status, text);
  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  cachedToken = { env, token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return json.access_token;
}

async function post<T>(operation: string, path: string, options: { body?: unknown; requestId?: string } = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL[paypalEnv()]}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      // Idempotency: PayPal replays the original response for a repeated request id.
      ...(options.requestId ? { "PayPal-Request-Id": options.requestId } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  if (!res.ok) throw new PayPalError(operation, res.status, text);
  return JSON.parse(text) as T;
}

export type CreateOrderInput = {
  /** Decimal string, e.g. "9.99". */
  amountUsd: string;
  /** Echoed back on capture (max 127 chars). */
  customId: string;
  /** Shown to the buyer (max 127 chars). */
  description: string;
};

/** Orders v2, intent CAPTURE, USD. Digital goods: no shipping address is collected. */
export async function createOrder({ amountUsd, customId, description }: CreateOrderInput): Promise<{ id: string }> {
  const order = await post<{ id: string }>("createOrder", "/v2/checkout/orders", {
    body: {
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: amountUsd }, custom_id: customId, description }],
      application_context: { shipping_preference: "NO_SHIPPING" },
    },
  });
  return { id: order.id };
}

type CaptureResponse = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        custom_id?: string;
        amount?: { currency_code: string; value: string };
      }>;
    };
  }>;
};

export type CaptureResult = {
  orderId: string;
  captureId: string | null;
  /** The capture's own status ("COMPLETED" = money moved); the order's status if there is no capture. */
  status: string;
  amountUsd: string | null;
  currency: string | null;
  customId: string | null;
};

/** Captures an approved order. Repeating it for the same order replays PayPal's original response. */
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const order = await post<CaptureResponse>("captureOrder", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    requestId: `capture-${orderId}`,
  });
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    orderId: order.id,
    captureId: capture?.id ?? null,
    status: capture?.status ?? order.status,
    amountUsd: capture?.amount?.value ?? null,
    currency: capture?.amount?.currency_code ?? null,
    customId: capture?.custom_id ?? unit?.custom_id ?? null,
  };
}
```

- [ ] **Step 4: Link the workspace and build**

```bash
npm install
ls -la node_modules/@smartekai/paypal
npx turbo run build type-check lint --filter=@smartekai/paypal
ls packages/paypal/dist
```

Expected: symlink to `packages/paypal`; all three tasks succeed; `index.d.ts index.js`. `package-lock.json` changes (new workspace entry) — that is npm's doing, never hand-edit it.

- [ ] **Step 5: Commit**

```bash
git add packages/paypal package-lock.json
git commit -m "feat(paypal): thin fetch-based PayPal Orders v2 client"
```

---

### Task 5: Wire PayPal into the cars app

**Files:**
- Modify: `apps/cars-4by4-builder/package.json`
- Modify: `apps/cars-4by4-builder/vite.config.ts`
- Modify: `turbo.json`

Prerequisite: the user's PayPal sandbox setup (header) is done. Check without printing values:

```bash
grep -c -E '^(PAYPAL_CLIENT_ID|PAYPAL_CLIENT_SECRET|PAYPAL_ENV)=' .env.local
```

Expected: `3`. If not, stop and ask the user to add them to the **root** `.env.local`.

- [ ] **Step 1: Dependencies**

In `apps/cars-4by4-builder/package.json` `dependencies`, after `"@fontsource-variable/inter": "^5.3.0",` add

```json
    "@paypal/react-paypal-js": "^10.5.2",
```

and after `"@smartekai/db": "*",` add

```json
    "@smartekai/paypal": "*",
```

then from the repo root:

```bash
npm install
ls node_modules/@paypal/react-paypal-js/package.json node_modules/@smartekai/paypal/package.json
```

Expected: both listed; lockfile updated by npm. (New third-party dependency, approved in Spec 3 §5 — call it out in the task report. Its root entry is the PayPal JS SDK v5 integration — `PayPalScriptProvider` / `PayPalButtons`, ESM + CJS; the `/sdk-v6` entry is ESM-only and not used here.)

- [ ] **Step 2: SSR-externalize the package**

In `apps/cars-4by4-builder/vite.config.ts`, in `ssr.external`, after `"@smartekai/storage",` add:

```ts
        "@smartekai/paypal",
```

- [ ] **Step 3: Register env vars with Turbo**

In `turbo.json` `globalEnv`, after `"GOOGLE_CLIENT_SECRET"` add `"PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_ENV"` (mind the comma on the previous line).

- [ ] **Step 4: Sandbox spot check of the client**

```bash
npx tsx --env-file=.env.local -e 'import("@smartekai/paypal").then(async (m) => { const p = m.default ?? m; const t = await p.getAccessToken(); console.log("token:", t.length > 20 ? "ok" : "bad", "cached:", (await p.getAccessToken()) === t); const o = await p.createOrder({ amountUsd: "9.99", customId: "check:starter", description: "spot check" }); console.log("order:", /^[A-Z0-9]+$/.test(o.id) ? "created" : o.id); try { await p.captureOrder(o.id); console.log("capture: unexpected success"); } catch (e) { console.log("capture before approval: HTTP", e.status); } })'
```

Expected:

```
token: ok cached: true
order: created
capture before approval: HTTP 422
```

(422 `ORDER_NOT_APPROVED` — the buyer never approved; proves `PayPalError.status` surfaces.)

- [ ] **Step 5: Gate and commit**

```bash
npx turbo run build --filter=cars-4by4-builder^...
git checkout -- packages/auth/dist
npx turbo run type-check lint --filter=cars-4by4-builder...
git add apps/cars-4by4-builder/package.json apps/cars-4by4-builder/vite.config.ts turbo.json package-lock.json
git commit -m "build(cars): add PayPal client and React PayPal buttons; PayPal env in turbo"
```

Expected: gate passes.

---

### Task 6: Atomic credit primitives

**Files:**
- Modify: `apps/cars-4by4-builder/src/server/rate-limit.ts`
- Create: `apps/cars-4by4-builder/src/server/credits.ts`

- [ ] **Step 1: Free-render IP guard**

Append to `src/server/rate-limit.ts`:

```ts
/** Spec 3 §3: clearing cookies yields a new guest, so cap free renders per network. Free-render path only. */
export const freeRenderRules = (ip: string): Rule[] => [{ key: `free:d:${ip}`, limit: 2, windowMs: 24 * HOUR }];
```

- [ ] **Step 2: Spot-check it**

```bash
cd apps/cars-4by4-builder
npx tsx -e 'import("./src/server/rate-limit.ts").then(({freeRenderRules,tryConsume})=>console.log([1,2,3].map(()=>tryConsume(freeRenderRules("1.2.3.4"))).join(",")))'
cd ../..
```

Expected: `true,true,false`

- [ ] **Step 3: The primitives**

Create `src/server/credits.ts`:

```ts
import { and, eq, gte, sql } from "drizzle-orm";
import { builds, carsUsers, creditLedger, getDbCars } from "@smartekai/db/cars";
import type { BuildCharge } from "@smartekai/db/cars";
import { RENDER_COST } from "@/lib/credit-packs";
import type { CreditBlock, CreditState } from "@/lib/credit-packs";
import { freeRenderRules, tryConsume } from "@/server/rate-limit";
import type { SessionUser } from "@/server/session";

// Spec 3 §1. The cars DB is neon-http: no interactive transactions. Spends and
// claims are single conditional UPDATEs; unconditional balance changes go in
// one db.batch([...]) (a transaction) with their ledger row.

export async function getCreditState(user: SessionUser): Promise<CreditState> {
  const row = (
    await getDbCars()
      .select({ balance: carsUsers.creditBalance, freeRenderUsed: carsUsers.freeRenderUsed })
      .from(carsUsers)
      .where(eq(carsUsers.id, user.id))
  ).at(0);
  return { account: !user.isAnonymous, balance: row?.balance ?? 0, freeRenderUsed: row?.freeRenderUsed ?? false };
}

/** Atomic: only one request can flip free_render_used false → true. */
export async function claimFreeRender(userId: string): Promise<boolean> {
  const rows = await getDbCars()
    .update(carsUsers)
    .set({ freeRenderUsed: true })
    .where(and(eq(carsUsers.id, userId), eq(carsUsers.freeRenderUsed, false)))
    .returning({ id: carsUsers.id });
  return rows.length > 0;
}

async function releaseFreeRender(userId: string): Promise<void> {
  await getDbCars().update(carsUsers).set({ freeRenderUsed: false }).where(eq(carsUsers.id, userId));
}

/** Atomic: one conditional UPDATE, so two concurrent renders can't spend the same credits. */
export async function spendCredits(userId: string, buildId: string): Promise<boolean> {
  const db = getDbCars();
  const rows = await db
    .update(carsUsers)
    .set({ creditBalance: sql`${carsUsers.creditBalance} - ${RENDER_COST}` })
    .where(and(eq(carsUsers.id, userId), gte(carsUsers.creditBalance, RENDER_COST)))
    .returning({ balance: carsUsers.creditBalance });
  if (rows.length === 0) return false;
  try {
    await db.insert(creditLedger).values({ id: crypto.randomUUID(), userId, delta: -RENDER_COST, reason: "render", buildId });
  } catch (err) {
    // The balance is authoritative; a missing audit row must not fail a paid render.
    console.error(`[credits] ledger insert failed after spend (user ${userId}, build ${buildId})`, err);
  }
  return true;
}

export type RenderCharge = { ok: true; charge: BuildCharge } | { ok: false; error: string; action: CreditBlock };

/** Spec 3 §3 steps 2–5: free render, else (accounts only) RENDER_COST credits, else refuse. */
export async function chargeRender(user: SessionUser, buildId: string, ip: string): Promise<RenderCharge> {
  if (await claimFreeRender(user.id)) {
    if (tryConsume(freeRenderRules(ip))) return { ok: true, charge: "free" };
    await releaseFreeRender(user.id); // this network's free renders are used up today — fall through
  }
  if (user.isAnonymous) return { ok: false, error: "Sign in to keep building.", action: "sign-in" };
  if (await spendCredits(user.id, buildId)) return { ok: true, charge: "credit" };
  return { ok: false, error: "You're out of credits.", action: "buy-credits" };
}

/** Gives back what a render used. Never throws — a failed refund is logged for manual review. */
export async function refundRender(userId: string, charge: BuildCharge, buildId: string): Promise<void> {
  const db = getDbCars();
  try {
    if (charge === "free") {
      await releaseFreeRender(userId);
      return;
    }
    await db.batch([
      db
        .update(carsUsers)
        .set({ creditBalance: sql`${carsUsers.creditBalance} + ${RENDER_COST}` })
        .where(eq(carsUsers.id, userId)),
      db.insert(creditLedger).values({ id: crypto.randomUUID(), userId, delta: RENDER_COST, reason: "refund", buildId }),
    ]);
  } catch (err) {
    console.error(`[credits] MANUAL REVIEW: refund of ${charge} render for build ${buildId} (user ${userId}) failed`, err);
  }
}

/**
 * Refunds a failed build exactly once: clearing `charge` in the same conditional
 * UPDATE is the guard. Call after the build is marked failed. Never throws.
 */
export async function refundFailedBuild(buildId: string): Promise<void> {
  const db = getDbCars();
  try {
    for (const charge of ["credit", "free"] as const) {
      const cleared = await db
        .update(builds)
        .set({ charge: null })
        .where(and(eq(builds.id, buildId), eq(builds.status, "failed"), eq(builds.charge, charge)))
        .returning({ userId: builds.userId });
      const row = cleared.at(0);
      if (row) {
        if (row.userId) await refundRender(row.userId, charge, buildId);
        return;
      }
    }
  } catch (err) {
    console.error(`[credits] MANUAL REVIEW: refund for failed build ${buildId} failed`, err);
  }
}

function isUniqueViolation(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e && typeof e === "object"; depth++) {
    if ((e as { code?: unknown }).code === "23505") return true;
    e = (e as { cause?: unknown }).cause; // drizzle wraps driver errors
  }
  return false;
}

/** Ledger row + balance in one transaction. A repeated paypal_order_id = already credited. */
export async function creditPurchase(input: {
  userId: string;
  credits: number;
  orderId: string;
  amountUsd: string;
}): Promise<"credited" | "duplicate"> {
  const db = getDbCars();
  try {
    await db.batch([
      // Insert first: a duplicate order id aborts the batch before the balance moves.
      db.insert(creditLedger).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        delta: input.credits,
        reason: "purchase",
        paypalOrderId: input.orderId,
        amountUsd: input.amountUsd,
      }),
      db
        .update(carsUsers)
        .set({ creditBalance: sql`${carsUsers.creditBalance} + ${input.credits}` })
        .where(eq(carsUsers.id, input.userId)),
    ]);
    return "credited";
  } catch (err) {
    if (isUniqueViolation(err)) return "duplicate";
    throw err;
  }
}

export async function findPurchase(orderId: string): Promise<{ userId: string } | undefined> {
  return (
    await getDbCars()
      .select({ userId: creditLedger.userId })
      .from(creditLedger)
      .where(eq(creditLedger.paypalOrderId, orderId))
  ).at(0);
}
```

- [ ] **Step 4: Spot-check the primitives against the branch (temporary script)**

Create `apps/cars-4by4-builder/scripts/check-credits.ts` (**temporary — delete in Step 5, never commit**):

```ts
// TEMPORARY Task 6 spot check — run against the Neon branch only. Delete after; never commit.
import { eq } from "drizzle-orm";
import { carsUsers, creditLedger, getDbCars } from "@smartekai/db/cars";
import { claimFreeRender, creditPurchase, getCreditState, refundRender, spendCredits } from "../src/server/credits";

const db = getDbCars();
const id = `check-${crypto.randomUUID()}`;
const now = new Date();
await db.insert(carsUsers).values({
  id,
  name: "credits check",
  email: `${id}@example.invalid`,
  emailVerified: false,
  isAnonymous: false,
  createdAt: now,
  updatedAt: now,
});
const state = () => getCreditState({ id, isAnonymous: false });
const purchase = () => creditPurchase({ userId: id, credits: 100, orderId: `ORDER-${id}`, amountUsd: "9.99" });
try {
  console.log("free claims:", await claimFreeRender(id), await claimFreeRender(id));
  await db.update(carsUsers).set({ creditBalance: 9 }).where(eq(carsUsers.id, id));
  console.log("spend at 9:", await spendCredits(id, "b-0"));
  await db.update(carsUsers).set({ creditBalance: 20 }).where(eq(carsUsers.id, id));
  const spends = await Promise.all(["b-1", "b-2", "b-3"].map((b) => spendCredits(id, b)));
  console.log("concurrent spends from 20:", spends.filter(Boolean).length, "succeeded; balance", (await state()).balance);
  await refundRender(id, "credit", "b-1");
  await refundRender(id, "free", "b-x");
  const s = await state();
  console.log("after refunds: balance", s.balance, "freeRenderUsed", s.freeRenderUsed);
  console.log("purchase:", await purchase());
  console.log("same order again:", await purchase());
  console.log("balance", (await state()).balance);
  const rows = await db
    .select({ delta: creditLedger.delta, reason: creditLedger.reason })
    .from(creditLedger)
    .where(eq(creditLedger.userId, id));
  console.log("ledger:", rows.map((r) => `${r.reason}${r.delta > 0 ? "+" : ""}${r.delta}`).sort().join(" "));
} finally {
  await db.delete(creditLedger).where(eq(creditLedger.userId, id)); // test rows only; real deletes keep the ledger
  await db.delete(carsUsers).where(eq(carsUsers.id, id));
}
```

Run it (branch DB only — no `--env-file`, so a missing URL fails instead of falling back to production):

```bash
cd apps/cars-4by4-builder
BRANCH_DB="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb --pooled)" && test -n "$BRANCH_DB" && DATABASE_NEONDB_SMARTEKAI="$BRANCH_DB" npx tsx scripts/check-credits.ts
cd ../..
```

Expected:

```
free claims: true false
spend at 9: false
concurrent spends from 20: 2 succeeded; balance 0
after refunds: balance 10 freeRenderUsed false
purchase: credited
same order again: duplicate
balance 110
ledger: purchase+100 refund+10 render-10 render-10
```

- [ ] **Step 5: Delete the script, gate, commit**

```bash
rm apps/cars-4by4-builder/scripts/check-credits.ts
npx turbo run type-check lint --filter=cars-4by4-builder
git add apps/cars-4by4-builder/src/server/rate-limit.ts apps/cars-4by4-builder/src/server/credits.ts
git commit -m "feat(cars): atomic credit spend, free-render claim, refunds, idempotent purchases"
```

Expected: gate passes; `git status --short` shows no `scripts/check-credits.ts`.

---

### Task 7: Gate renders in `startBuild`; refund failed builds

**Files:**
- Modify: `apps/cars-4by4-builder/src/lib/builds.ts`
- Rewrite: `apps/cars-4by4-builder/src/server/generate.ts`

- [ ] **Step 1: Imports**

In `src/lib/builds.ts`, replace

```ts
import { and, asc, count, desc, eq, gte, inArray, ne, or } from "drizzle-orm";
```

with

```ts
import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or } from "drizzle-orm";
```

and replace

```ts
import { STALE_PROCESSING_MS, runGeneration } from "@/server/generate";
```

with

```ts
import type { CreditBlock } from "@/lib/credit-packs";
import { chargeRender, refundFailedBuild, refundRender } from "@/server/credits";
import { STALE_PROCESSING_MS, runGeneration } from "@/server/generate";
```

- [ ] **Step 2: `Fail` carries an optional action**

Replace

```ts
type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
```

with

```ts
type Fail = { ok: false; error: string; action?: CreditBlock };
const fail = (error: string, action?: CreditBlock): Fail => ({ ok: false, error, ...(action ? { action } : {}) });
```

- [ ] **Step 3: Replace `startBuild`**

Replace the whole `export const startBuild = …;` block (up to, not including, `function validateSlugOrId`) with:

```ts
export const startBuild = createServerFn({ method: "POST" })
  .validator((input: { buildId?: string; vehicleId: string; partIds: string[] }) => {
    if (typeof input.vehicleId !== "string") throw new Error("vehicleId is required");
    if (input.buildId !== undefined && typeof input.buildId !== "string") throw new Error("invalid buildId");
    if (!Array.isArray(input.partIds) || !input.partIds.every((p) => typeof p === "string")) {
      throw new Error("partIds must be an array of strings");
    }
    return { buildId: input.buildId, vehicleId: input.vehicleId, partIds: [...new Set(input.partIds)] };
  })
  .handler(async ({ data }): Promise<{ ok: true; id: string } | Fail> => {
    if (data.partIds.length === 0 || data.partIds.length > MAX_PARTS) {
      return fail(`Pick between 1 and ${MAX_PARTS} upgrades.`);
    }
    const db = getDbCars();
    const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, data.vehicleId))).at(0);
    if (!vehicle) return fail("Unknown vehicle.");

    const selected = await db
      .select({ id: parts.id, vehicleIds: parts.vehicleIds })
      .from(parts)
      .where(inArray(parts.id, data.partIds));
    if (selected.length !== data.partIds.length || selected.some((p) => !p.vehicleIds.includes(vehicle.id))) {
      return fail("Some upgrades don't fit this vehicle — go back and re-check.");
    }

    const ip = requestIp();
    if (!tryConsume(renderRules(ip))) return fail("You've hit the render limit for now — try again in an hour.");

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [{ value: rendersToday }] = await db
      .select({ value: count() })
      .from(builds)
      .where(and(gte(builds.createdAt, startOfDay), eq(builds.isCurated, false), ne(builds.status, "draft")));
    if (rendersToday >= DAILY_RENDER_CAP) {
      return fail("We're at capacity today — browse the gallery and check back tomorrow.");
    }

    // Spec 3 §3: every render is charged to a session user — a guest or an account.
    // PhotoStep creates a guest session first, so this is rare.
    const user = await currentUser();
    if (!user) return fail("Sign in to keep building.", "sign-in");

    // Resolve what to render before charging, so a bad request costs nothing.
    let target: { kind: "draft"; id: string } | { kind: "stock"; id: string; imageKey: string };
    if (data.buildId) {
      const draft = (
        await db
          .select({ userId: builds.userId })
          .from(builds)
          .where(and(eq(builds.id, data.buildId), eq(builds.status, "draft")))
      ).at(0);
      // Renders cost credits: only the caller's own draft (or an unowned one) may be started.
      if (!draft || (draft.userId !== null && draft.userId !== user.id)) {
        return fail("That photo expired — upload it again.");
      }
      target = { kind: "draft", id: data.buildId };
    } else {
      if (!vehicle.stockImageKey) return fail("No studio photo for this vehicle yet — upload your own.");
      target = { kind: "stock", id: crypto.randomUUID(), imageKey: vehicle.stockImageKey };
    }

    const gate = await chargeRender(user, target.id, ip);
    if (!gate.ok) return fail(gate.error, gate.action);

    try {
      if (target.kind === "draft") {
        const updated = await db
          .update(builds)
          .set({
            status: "processing",
            userId: user.id,
            charge: gate.charge,
            vehicleId: vehicle.id,
            selectedPartIds: data.partIds,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(builds.id, target.id),
              eq(builds.status, "draft"),
              or(isNull(builds.userId), eq(builds.userId, user.id)),
            ),
          )
          .returning({ id: builds.id });
        if (updated.length === 0) {
          await refundRender(user.id, gate.charge, target.id); // lost a race (double click, cleanup)
          return fail("That photo expired — upload it again.");
        }
      } else {
        await db.insert(builds).values({
          id: target.id,
          userId: user.id,
          charge: gate.charge,
          vehicleId: vehicle.id,
          originalImageKey: target.imageKey,
          status: "processing",
          selectedPartIds: data.partIds,
        });
      }
    } catch (err) {
      await refundRender(user.id, gate.charge, target.id);
      throw err;
    }

    void runGeneration(target.id); // intentionally not awaited — the build page polls getBuild
    return { ok: true, id: target.id };
  });
```

(Differences from the Spec 2 version: one `ip`; session required; **draft ownership checked in the pre-read and in the UPDATE's `WHERE` — the security fix from the Spec 2 review**; charge before the flip; `charge` stored; refund if the flip fails.)

- [ ] **Step 4: Refund on the stale-timeout path**

In `loadBuild`, replace

```ts
    await db.update(builds).set({ status, errorMessage, updatedAt: new Date() }).where(eq(builds.id, build.id));
  }
```

with

```ts
    await db.update(builds).set({ status, errorMessage, updatedAt: new Date() }).where(eq(builds.id, build.id));
    await refundFailedBuild(build.id); // a render lost to a restart gives back what it used
  }
```

- [ ] **Step 5: Refund in `runGeneration`**

Replace `src/server/generate.ts` with:

```ts
import { eq, inArray } from "drizzle-orm";
import { builds, getDbCars, parts, vehicles } from "@smartekai/db/cars";
import { describeVehicle } from "@/lib/prompt";
import { refundFailedBuild } from "@/server/credits";
import { renderUpgrade } from "@/server/render-core";

/** A `processing` build older than this is treated as failed (server restarted mid-render). */
export const STALE_PROCESSING_MS = 10 * 60_000;

/** Runs in-process, not awaited by the request. Always leaves the build completed or failed. */
export async function runGeneration(buildId: string): Promise<void> {
  const db = getDbCars();
  try {
    const build = (await db.select().from(builds).where(eq(builds.id, buildId))).at(0);
    if (!build) throw new Error("build not found");
    const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, build.vehicleId))).at(0);
    if (!vehicle) throw new Error(`vehicle ${build.vehicleId} not found`);
    const selected = await db.select().from(parts).where(inArray(parts.id, build.selectedPartIds));

    const renderKey = await renderUpgrade({
      buildId,
      originalImageKey: build.originalImageKey,
      vehicleDesc: describeVehicle(build.detectedVehicle, vehicle.name),
      snippets: selected.map((p) => p.aiPromptSnippet),
    });

    await db
      .update(builds)
      .set({ renderKey, status: "completed", errorMessage: null, updatedAt: new Date() })
      .where(eq(builds.id, buildId));
  } catch (err) {
    console.error(`[generate] build ${buildId} failed:`, err);
    await db
      .update(builds)
      .set({ status: "failed", errorMessage: "Generation failed — try again.", updatedAt: new Date() })
      .where(eq(builds.id, buildId));
    await refundFailedBuild(buildId); // Spec 3 §3: a failed render gives back what it used (once)
  }
}
```

- [ ] **Step 6: Gate**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder
```

Expected: pass. (`PhotoStep` still compiles — `action` is optional and unused until Task 11.)

- [ ] **Step 7: Manual check (branch DB)**

```bash
BRANCH_DB="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb --pooled)" && test -n "$BRANCH_DB" && DATABASE_NEONDB_SMARTEKAI="$BRANCH_DB" npm run dev:cars
```

In a private window: `http://localhost:3002/build` → pick a vehicle and parts → studio photo → Generate → render completes. Back → Generate again → toast "Sign in to keep building." Then on the branch:

```bash
BRANCH_DIRECT="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb)" && test -n "$BRANCH_DIRECT" && psql "$BRANCH_DIRECT" -c "select b.charge, b.status, u.is_anonymous, u.free_render_used from builds b join cars_user u on u.id = b.user_id order by b.created_at desc limit 2;"
```

Expected: one row, `free | completed | t | t` (the refused second attempt created no build). Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/builds.ts apps/cars-4by4-builder/src/server/generate.ts
git commit -m "feat(cars): charge renders (free, then credits); owner-only draft start; refund failures"
```

---

### Task 8: Guest → account keeps the free render used

**Files:**
- Modify: `apps/cars-4by4-builder/src/lib/auth.ts`

- [ ] **Step 1: Extend `onLinkAccount` inside its existing `try`**

In `src/lib/auth.ts`, replace

```ts
        try {
          await getDbCars()
            .update(builds)
            .set({ userId: newUser.user.id })
            .where(eq(builds.userId, anonymousUser.user.id));
        } catch (err) {
          console.error("onLinkAccount: moving guest builds failed", err);
        }
```

with

```ts
        try {
          const db = getDbCars();
          await db.update(builds).set({ userId: newUser.user.id }).where(eq(builds.userId, anonymousUser.user.id));
          // Spec 3 §4: signing up must not reset the free render
          // (new.free_render_used = new OR guest). Guests never hold credits,
          // so no balance moves.
          const guest = (
            await db
              .select({ freeRenderUsed: carsUsers.freeRenderUsed })
              .from(carsUsers)
              .where(eq(carsUsers.id, anonymousUser.user.id))
          ).at(0);
          if (guest?.freeRenderUsed) {
            await db.update(carsUsers).set({ freeRenderUsed: true }).where(eq(carsUsers.id, newUser.user.id));
          }
        } catch (err) {
          console.error("onLinkAccount: moving guest builds / free render failed", err);
        }
```

(`carsUsers` is already imported. The plugin deletes the guest only after this hook, so the guest row is still readable.)

- [ ] **Step 2: Gate**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder
```

Expected: pass.

- [ ] **Step 3: Manual check (branch DB)**

Start the dev server against the branch (command in Task 7 Step 7). Private window: render once as a guest (free) → `/sign-in` → **Create account** with a fresh email. Then:

```bash
BRANCH_DIRECT="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb)" && test -n "$BRANCH_DIRECT" && psql "$BRANCH_DIRECT" -v email='<the fresh email>' -c "select is_anonymous, free_render_used, credit_balance from cars_user where email = :'email';"
```

Expected: `f | t | 0`. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/auth.ts
git commit -m "feat(cars): signing up keeps the guest's free render used"
```

---

### Task 9: Credits server functions and client hook

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/credits.ts`
- Create: `apps/cars-4by4-builder/src/lib/use-credits.ts`

- [ ] **Step 1: Server functions**

Create `src/lib/credits.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { captureOrder, createOrder } from "@smartekai/paypal";
import type { CaptureResult } from "@smartekai/paypal";
import { findPack } from "@/lib/credit-packs";
import type { CreditState } from "@/lib/credit-packs";
import { safeNext } from "@/lib/next";
import { creditPurchase, findPurchase, getCreditState } from "@/server/credits";
import { accountUser, currentUser } from "@/server/session";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const ORDER_ID = /^[A-Za-z0-9-]{1,64}$/;

/** Header chip + build footer. null = no session at all. */
export const getCredits = createServerFn({ method: "GET" }).handler(async (): Promise<CreditState | null> => {
  const user = await currentUser();
  return user ? getCreditState(user) : null;
});

/** /credits loader: accounts only. */
export const getCreditsPage = createServerFn({ method: "GET" })
  .validator((input: { next?: string }) => ({
    next: typeof input.next === "string" ? safeNext(input.next) : undefined,
  }))
  .handler(async ({ data }) => {
    const user = await accountUser();
    if (!user) {
      const back = data.next ? `/credits?next=${encodeURIComponent(data.next)}` : "/credits";
      throw redirect({ to: "/sign-in", search: { next: back } });
    }
    const { balance } = await getCreditState(user);
    // The client id is public by design (the buttons need it); the secret never leaves the server.
    return { balance, paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "" };
  });

export const createPayPalOrder = createServerFn({ method: "POST" })
  .validator((input: { packId: string }) => {
    if (typeof input.packId !== "string") throw new Error("packId is required");
    return { packId: input.packId };
  })
  .handler(async ({ data }): Promise<{ ok: true; orderId: string } | Fail> => {
    const user = await accountUser();
    if (!user) return fail("Sign in to buy credits.");
    const pack = findPack(data.packId);
    if (!pack) return fail("Unknown pack.");
    try {
      const { id } = await createOrder({
        amountUsd: pack.priceUsd,
        customId: `${user.id}:${pack.id}`,
        description: `4x4 Builder ${pack.name} pack — ${pack.credits} credits`,
      });
      return { ok: true, orderId: id };
    } catch (err) {
      console.error(`[paypal] createOrder failed (user ${user.id}, pack ${pack.id})`, err);
      return fail("Couldn't start PayPal checkout — try again.");
    }
  });

export const capturePayPalOrder = createServerFn({ method: "POST" })
  .validator((input: { orderId: string }) => {
    if (typeof input.orderId !== "string" || !ORDER_ID.test(input.orderId)) throw new Error("invalid orderId");
    return { orderId: input.orderId };
  })
  .handler(async ({ data }): Promise<{ ok: true; credited: number; balance: number } | Fail> => {
    const user = await accountUser();
    if (!user) return fail("Sign in to buy credits.");

    // Already credited (double click, retry)? Don't call PayPal again.
    const existing = await findPurchase(data.orderId);
    if (existing) {
      if (existing.userId !== user.id) return fail("That order belongs to another account.");
      return { ok: true, credited: 0, balance: (await getCreditState(user)).balance };
    }

    let capture: CaptureResult;
    try {
      capture = await captureOrder(data.orderId);
    } catch (err) {
      console.error(`[paypal] capture failed for order ${data.orderId} (user ${user.id})`, err);
      return fail(`PayPal didn't confirm the payment — try again. If you were charged, contact us with order ${data.orderId}.`);
    }

    const [ownerId, packId] = (capture.customId ?? "").split(":");
    const pack = findPack(packId ?? "");
    const problem =
      capture.status !== "COMPLETED"
        ? `capture status ${capture.status}`
        : ownerId !== user.id
          ? `custom_id ${capture.customId} is not this user`
          : !pack
            ? `unknown pack in custom_id ${capture.customId}`
            : capture.currency !== "USD" || capture.amountUsd !== pack.priceUsd
              ? `paid ${capture.amountUsd} ${capture.currency}, pack costs ${pack.priceUsd} USD`
              : null;
    if (problem !== null || !pack) {
      // Money may have moved with no credits granted — must be resolved by hand.
      console.error(`[paypal] MANUAL REVIEW: order ${data.orderId} (user ${user.id}) not credited — ${problem}`, capture);
      return fail(`We couldn't confirm that payment. If you were charged, contact us with order ${data.orderId}.`);
    }

    const result = await creditPurchase({
      userId: user.id,
      credits: pack.credits,
      orderId: data.orderId,
      amountUsd: pack.priceUsd,
    });
    return {
      ok: true,
      credited: result === "credited" ? pack.credits : 0,
      balance: (await getCreditState(user)).balance,
    };
  });
```

- [ ] **Step 2: Client hook**

Create `src/lib/use-credits.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { getCredits } from "@/lib/credits";
import type { CreditState } from "@/lib/credit-packs";

const CHANGED = "cars:credits-changed";

/** Tells every mounted useCredits() to refetch — after a purchase or a render attempt. */
export function notifyCreditsChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * Client-side credit state: undefined = loading or disabled, null = no session.
 * Fetched after mount only, so SSR and hydration render the same (nothing).
 * Refetches when `sessionKey` changes or notifyCreditsChanged() fires.
 */
export function useCredits(enabled: boolean, sessionKey?: string): CreditState | null | undefined {
  const [credits, setCredits] = useState<CreditState | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setCredits(await getCredits());
    } catch {
      setCredits(undefined);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCredits(undefined);
      return;
    }
    const onChange = () => void refresh();
    onChange();
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
  }, [enabled, sessionKey, refresh]);

  return credits;
}
```

- [ ] **Step 3: Gate and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder
git add apps/cars-4by4-builder/src/lib/credits.ts apps/cars-4by4-builder/src/lib/use-credits.ts
git commit -m "feat(cars): credits server functions (balance, PayPal create/capture) and client hook"
```

Expected: gate passes. (`redirect({ to: "/sign-in", search: { next } })` type-checks because `/sign-in` exists.)

---

### Task 10: `/credits` page

**Files:**
- Rewrite: `apps/cars-4by4-builder/src/components/Toast.tsx`
- Create: `apps/cars-4by4-builder/src/routes/credits.tsx`

- [ ] **Step 1: Toast with tone and an optional action link**

Replace `src/components/Toast.tsx` with:

```tsx
type ToastProps = {
  message: string;
  onDismiss: () => void;
  tone?: "error" | "success";
  action?: { label: string; href: string };
};

export function Toast({ message, onDismiss, tone = "error", action }: ToastProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-xl ${
        tone === "error" ? "border-destructive/50" : "border-emerald-500/40"
      }`}
    >
      <span>{message}</span>
      {action && (
        <a href={action.href} className="shrink-0 font-bold text-primary underline-offset-4 hover:underline">
          {action.label}
        </a>
      )}
      <button type="button" onClick={onDismiss} className="shrink-0 font-semibold text-primary">
        Dismiss
      </button>
    </div>
  );
}
```

(Existing callers pass only `message` + `onDismiss`, so they keep the error look.)

- [ ] **Step 2: The page**

Create `src/routes/credits.tsx`:

```tsx
import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { CREDIT_PACKS, RENDER_COST, rendersFor } from "@/lib/credit-packs";
import type { CreditPack } from "@/lib/credit-packs";
import { capturePayPalOrder, createPayPalOrder, getCreditsPage } from "@/lib/credits";
import { safeNext } from "@/lib/next";
import { notifyCreditsChanged } from "@/lib/use-credits";
import { Toast } from "@/components/Toast";

type CreditsSearch = { next?: string };
type Notice = { message: string; tone: "success" | "error" };

export const Route = createFileRoute("/credits")({
  validateSearch: (search: Record<string, unknown>): CreditsSearch => ({
    next: typeof search.next === "string" ? safeNext(search.next) : undefined,
  }),
  loaderDeps: ({ search }) => ({ next: search.next }),
  loader: ({ deps }) => getCreditsPage({ data: { next: deps.next } }),
  head: () => ({ meta: [{ title: "Buy credits | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: CreditsPage,
});

function CreditsPage() {
  const { balance, paypalClientId } = Route.useLoaderData();
  const { next } = Route.useSearch();
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);

  async function purchased(credited: number) {
    notifyCreditsChanged(); // header chip
    await router.invalidate(); // this page's balance
    setNotice({
      tone: "success",
      message: credited > 0 ? `Added ${credited} credits.` : "That order is already in your balance.",
    });
    if (next) window.setTimeout(() => window.location.assign(next), 1500);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl">Credits</h1>
      <p className="mt-2 text-muted-foreground">
        You have <span className="font-bold text-foreground">{balance} credits</span> (≈ {rendersFor(balance)}{" "}
        renders). Each render uses {RENDER_COST} credits. Credits never expire, and a failed render gives them back.
      </p>
      {next && <p className="mt-1 text-sm text-muted-foreground">After you buy, we'll take you back to your build.</p>}

      {paypalClientId ? (
        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", intent: "capture" }}>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onPurchased={purchased}
                onError={(message) => setNotice({ tone: "error", message })}
              />
            ))}
          </ul>
        </PayPalScriptProvider>
      ) : (
        <p className="mt-8 rounded-md border border-border p-4 text-sm text-muted-foreground">
          Checkout isn't available right now — try again later.
        </p>
      )}

      <p className="mt-8 text-xs text-muted-foreground">Payments are processed by PayPal. Prices in USD.</p>
      {notice && <Toast message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} />}
    </main>
  );
}

function PackCard({
  pack,
  onPurchased,
  onError,
}: {
  pack: CreditPack;
  onPurchased: (credited: number) => Promise<void>;
  onError: (message: string) => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <h2 className="text-xl">{pack.name}</h2>
      <p className="text-3xl font-extrabold">
        {pack.credits} <span className="text-base font-semibold text-muted-foreground">credits</span>
      </p>
      <p className="text-sm text-muted-foreground">≈ {rendersFor(pack.credits)} renders</p>
      <p className="text-lg font-bold">${pack.priceUsd}</p>
      <div className="mt-2 min-h-[50px]">
        <PayPalButtons
          style={{ layout: "vertical", label: "pay" }}
          createOrder={async () => {
            const result = await createPayPalOrder({ data: { packId: pack.id } });
            if (!result.ok) throw new Error(result.error);
            return result.orderId;
          }}
          onApprove={async (data) => {
            const result = await capturePayPalOrder({ data: { orderId: data.orderID } });
            if (!result.ok) {
              onError(result.error);
              return;
            }
            await onPurchased(result.credited);
          }}
          onError={(err) => {
            console.error("PayPal checkout error", err);
            onError("PayPal checkout didn't go through — try again.");
          }}
        />
      </div>
    </li>
  );
}
```

- [ ] **Step 3: Regenerate routes and gate**

```bash
npm run generate-routes -w cars-4by4-builder
npx turbo run type-check lint build --filter=cars-4by4-builder...
git checkout -- packages/auth/dist
```

Expected: pass. If the SSR build or the dev server errors while importing `@paypal/react-paypal-js` (e.g. `window is not defined`), add `"@paypal/react-paypal-js"` to `ssr.noExternal` in `vite.config.ts` (next to `"lucide-react"`) and rerun; note it in the task report.

- [ ] **Step 4: Manual check (branch DB, PayPal sandbox)**

Start the dev server against the branch (command in Task 7 Step 7).
- Private window → `http://localhost:3002/credits` → redirected to `/sign-in?next=/credits`.
- Sign in with the account from Task 8 → lands on `/credits`: balance `0 credits (≈ 0 renders)`, three packs (Starter 100 ≈ 10 renders $9.99, Builder 300 ≈ 30 renders $24.99, Pro 1000 ≈ 100 renders $69.99), PayPal buttons under each.
- Starter → PayPal popup → log in with the **sandbox Personal** account → Pay → toast "Added 100 credits.", balance `100 credits (≈ 10 renders)`.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/src apps/cars-4by4-builder/vite.config.ts
git commit -m "feat(cars): /credits page with PayPal checkout"
```

---

### Task 11: Balance chip, render-cost line, actionable refusals

**Files:**
- Rewrite: `apps/cars-4by4-builder/src/components/SiteHeader.tsx`
- Rewrite: `apps/cars-4by4-builder/src/components/BuildFooter.tsx`
- Rewrite: `apps/cars-4by4-builder/src/components/PhotoStep.tsx`

- [ ] **Step 1: Header chip**

Replace `src/components/SiteHeader.tsx` with:

```tsx
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useCredits } from "@/lib/use-credits";

export function SiteHeader() {
  const { data, isPending } = authClient.useSession();
  const account = data && !data.user.isAnonymous ? data.user : null; // guests render as signed out
  const credits = useCredits(account !== null, account?.id);

  async function signOut() {
    try {
      await authClient.signOut();
    } catch (err) {
      console.error("sign out failed", err);
    }
    window.location.assign("/"); // reload either way; a failed sign-out shows the account links again
  }

  return (
    <header className="border-b border-border print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight">
          4x4 <span className="text-primary">Builder</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm font-semibold">
          <Link to="/build" className="hover:text-primary">
            Build yours
          </Link>
          {isPending ? null : account ? (
            <>
              {credits && (
                <Link
                  to="/credits"
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-primary"
                >
                  {credits.balance} credits
                </Link>
              )}
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

- [ ] **Step 2: Footer render-cost line**

Replace `src/components/BuildFooter.tsx` with:

```tsx
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { RENDER_COST } from "@/lib/credit-packs";
import type { CreditState } from "@/lib/credit-packs";
import { formatPrice } from "@/lib/pricing";
import { useCredits } from "@/lib/use-credits";

export function BuildFooter({
  count,
  totalUsd,
  nextLabel,
  onNext,
}: {
  count: number;
  totalUsd: number;
  nextLabel?: string;
  onNext?: () => void;
}) {
  const credits = useCredits(true);

  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm">
            <span className="font-semibold">
              {count} {count === 1 ? "part" : "parts"}
            </span>
            <span className="text-muted-foreground"> · est. </span>
            <span className="font-semibold">{formatPrice(totalUsd)}</span>
          </p>
          <RenderCost credits={credits} />
        </div>
        {onNext && nextLabel ? (
          <Button disabled={count === 0} onClick={onNext}>
            {nextLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Spec 3 §6: what the next render will use, shown before Generate. */
function RenderCost({ credits }: { credits: CreditState | null | undefined }) {
  const here = useRouterState({ select: (s) => s.location.href });
  const note = "text-xs text-muted-foreground";
  const link = "text-xs font-semibold text-primary hover:underline";

  if (credits === undefined) return null;
  if (!credits || !credits.freeRenderUsed) return <p className={note}>Free render</p>;
  if (!credits.account) {
    return (
      <Link to="/sign-in" search={{ next: here }} className={link}>
        Sign in to keep building
      </Link>
    );
  }
  if (credits.balance >= RENDER_COST) {
    return (
      <p className={note}>
        Uses {RENDER_COST} credits (you have {credits.balance})
      </p>
    );
  }
  return (
    <Link to="/credits" search={{ next: here }} className={link}>
      Buy credits
    </Link>
  );
}
```

- [ ] **Step 3: PhotoStep refusals link to Sign in / Buy credits**

Replace `src/components/PhotoStep.tsx` with:

```tsx
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { ensureGuestSession } from "@/lib/auth-client";
import { checkPhoto, startBuild } from "@/lib/builds";
import type { CreditBlock } from "@/lib/credit-packs";
import { notifyCreditsChanged } from "@/lib/use-credits";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { Toast } from "@/components/Toast";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "verified"; buildId: string; label: string }
  | { state: "rejected"; message: string };

type Notice = { message: string; action?: { label: string; href: string } };

/** A Sign in / Buy credits link that brings the user back to this exact step. */
function blockAction(block: CreditBlock | undefined): Notice["action"] {
  if (!block) return undefined;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  return block === "sign-in"
    ? { label: "Sign in", href: `/sign-in?next=${next}` }
    : { label: "Buy credits", href: `/credits?next=${next}` };
}

export function PhotoStep({
  vehicle,
  partIds,
}: {
  vehicle: { id: string; name: string; stockImageUrl: string | null };
  partIds: string[];
}) {
  const navigate = useNavigate();
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<Notice | null>(null);

  async function handleFile(file: File) {
    setCheck({ state: "checking" });
    await ensureGuestSession();
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("vehicleId", vehicle.id);
    try {
      const result = await checkPhoto({ data: formData });
      if (!result.ok) {
        setCheck({ state: "rejected", message: result.error });
        return;
      }
      const d = result.detected;
      const label = [d.color, d.make, d.model].filter(Boolean).join(" ") || vehicle.name;
      setCheck({ state: "verified", buildId: result.buildId, label });
    } catch {
      setCheck({ state: "idle" });
      setToast({ message: "Upload failed — check your connection and try again." });
    }
  }

  async function start(buildId?: string) {
    setStarting(true);
    await ensureGuestSession();
    try {
      const result = await startBuild({ data: { buildId, vehicleId: vehicle.id, partIds } });
      if (!result.ok) {
        setToast({ message: result.error, action: blockAction(result.action) });
        notifyCreditsChanged(); // the footer's cost line may be stale
        setStarting(false);
        return;
      }
      await navigate({ to: "/builds/$slug", params: { slug: result.id } });
    } catch {
      setToast({ message: "Something went wrong — try again." });
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoDropzone onFileSelected={handleFile} disabled={check.state === "checking" || starting} />

      {check.state === "checking" && <p className="text-sm text-muted-foreground">Checking your photo…</p>}
      {check.state === "verified" && (
        <p className="rounded-md border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-400">
          ✓ {check.label}
        </p>
      )}
      {check.state === "rejected" && (
        <p className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive">{check.message}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {vehicle.stockImageUrl ? (
          <button
            type="button"
            disabled={starting}
            onClick={() => start()}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            No photo? Use our studio {vehicle.name}
          </button>
        ) : (
          <span />
        )}
        <Button disabled={check.state !== "verified" || starting} onClick={() => check.state === "verified" && start(check.buildId)}>
          {starting ? "Starting…" : "Generate my build"}
        </Button>
      </div>

      {toast && <Toast message={toast.message} action={toast.action} onDismiss={() => setToast(null)} />}
    </div>
  );
}
```

- [ ] **Step 4: Gate**

```bash
npx turbo run type-check lint build --filter=cars-4by4-builder...
git checkout -- packages/auth/dist
```

Expected: pass.

- [ ] **Step 5: Manual check (branch DB)**

Dev server against the branch (Task 7 Step 7). Signed in as the Task 10 account (100 credits):
- Header shows `100 credits` chip → links to `/credits`.
- `/build` → footer: `Uses 10 credits (you have 100)`.
- Generate with the studio photo → render completes; chip after reload: `90 credits`.

In a fresh private window (guest): footer `Free render`; after one render, back on the photo step the footer says `Sign in to keep building`; Generate → toast "Sign in to keep building." with a **Sign in** link to `/sign-in?next=%2Fbuild%3F…`.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/components
git commit -m "feat(cars): credit balance chip, render-cost line, sign-in / buy-credits prompts"
```

---

### Task 12: End-to-end verification (branch DB + PayPal sandbox)

- [ ] **Step 1: Full scoped gate**

```bash
npx turbo run type-check lint build --filter=cars-4by4-builder... --filter=@smartekai/paypal
git checkout -- packages/auth/dist
git status --short
```

Expected: pass; status clean apart from the untracked SOP file.

- [ ] **Step 2: Click-through** (Spec 3 §8). Dev server against the branch:

```bash
BRANCH_DB="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb --pooled)" && test -n "$BRANCH_DB" && DATABASE_NEONDB_SMARTEKAI="$BRANCH_DB" npm run dev:cars
```

Rate limits are in memory (5 renders/hour/IP, 2 free renders/day/IP): **restart the dev server between checks** that render more than a couple of times. Desktop and ~390px width; private window per guest run. Ledger/balance queries for an account:

```bash
BRANCH_DIRECT="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb)" && test -n "$BRANCH_DIRECT" && psql "$BRANCH_DIRECT" -v email='<account email>' <<'SQL'
select credit_balance, free_render_used from cars_user where email = :'email';
select reason, delta, build_id, paypal_order_id, amount_usd from credit_ledger
 where user_id = (select id from cars_user where email = :'email') order by created_at;
SQL
```

- [ ] Guest's first render is free; the second asks to sign in (toast + Sign in link; footer says so too).
- [ ] After sign-up from that guest, the free render is still used: footer shows `Buy credits` (0 balance), `free_render_used = t`.
- [ ] Buying a pack raises the balance by exactly the pack's credits (one `purchase +100` row with `paypal_order_id` and `amount_usd 9.99`).
- [ ] Capturing the same order again does not credit twice — run with that row's `paypal_order_id`:

  Create `apps/cars-4by4-builder/scripts/check-capture.ts` (**temporary — delete after, never commit**):

  ```ts
  // TEMPORARY Task 12 check — branch DB only. Delete after; never commit.
  import { captureOrder } from "@smartekai/paypal";
  import { creditPurchase, findPurchase, getCreditState } from "../src/server/credits";

  const orderId = process.argv[2];
  if (!orderId) throw new Error("usage: check-capture.ts <paypal order id>");
  const owner = await findPurchase(orderId);
  console.log("ledger has order:", Boolean(owner));
  try {
    console.log("paypal re-capture:", (await captureOrder(orderId)).status);
  } catch (e) {
    console.log("paypal re-capture: HTTP", (e as { status?: number }).status);
  }
  if (owner) {
    const user = { id: owner.userId, isAnonymous: false };
    const before = (await getCreditState(user)).balance;
    console.log("credit again:", await creditPurchase({ userId: owner.userId, credits: 100, orderId, amountUsd: "9.99" }));
    console.log("balance unchanged:", (await getCreditState(user)).balance === before);
  }
  ```

  ```bash
  cd apps/cars-4by4-builder
  BRANCH_DB="$(neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb --pooled)" && test -n "$BRANCH_DB" && DATABASE_NEONDB_SMARTEKAI="$BRANCH_DB" npx tsx --env-file=../../.env.local scripts/check-capture.ts <ORDER_ID>
  rm scripts/check-capture.ts
  cd ../..
  ```

  Expected: `ledger has order: true`, `paypal re-capture: COMPLETED` (replayed via `PayPal-Request-Id`) or `paypal re-capture: HTTP 422` (`ORDER_ALREADY_CAPTURED`), `credit again: duplicate`, `balance unchanged: true`. (The shell's branch URL wins over `--env-file`, which only supplies the PayPal vars.)
- [ ] A render spends exactly 10 credits — one `render -10` row with the build's id; `builds.charge = 'credit'`.
- [ ] A balance of 9 is refused: set it on the branch (`psql "$BRANCH_DIRECT" -v email=… -c "update cars_user set credit_balance = 9 where email = :'email';"`), reload `/build` → footer `Buy credits`; Generate → toast "You're out of credits." with a **Buy credits** link; no new ledger row.
- [ ] A forced render failure refunds: restart the dev server with an invalid image model —
  `BRANCH_DB=… && GOOGLE_AI_IMAGE_MODEL=does-not-exist DATABASE_NEONDB_SMARTEKAI="$BRANCH_DB" npm run dev:cars` —
  render as the account with ≥ 10 credits → build page "That render didn't work"; ledger shows `render -10` then `refund +10` for that build; balance back; `builds.charge` is null. Repeat as a fresh guest: `free_render_used` back to `f` after the failure. Restart without the override afterwards.
- [ ] Zero balance → Generate → "You're out of credits." → **Buy credits** → `/credits?next=/build?…` → buy Starter → toast → returned to the build's photo step (selection intact) → Generate succeeds.
- [ ] Third free render from one IP in a day is refused: restart the dev server; three fresh private windows each render once as a guest → the third gets "Sign in to keep building."
- [ ] No regressions: My projects lists the new builds; report page still opens; sign out works; the configurator still shows est. prices publicly (product decision — gating unchanged).

- [ ] **Step 3: Report**

Summarize pass/fail per box to the user before Task 13.

---

### Task 13: Production schema (ASK FIRST), then delete the branch

- [ ] **Step 1: Pre-check production is untouched**

```bash
DIRECT_URL="$(grep '^DATABASE_NEONDB_SMARTEKAI=' .env.local | cut -d= -f2- | tr -d '"' | sed 's/-pooler\././')" && test -n "$DIRECT_URL" && psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.columns where table_name in ('cars_user','builds') and column_name in ('credit_balance','free_render_used','charge');" -c "select to_regclass('public.credit_ledger');"
```

Expected: `0` and an empty `to_regclass`.

- [ ] **Step 2: ASK FIRST**

Stop. Tell the user: "Rehearsal on Neon branch `cars-credits` applied cleanly, drizzle sees no remaining diff, and the click-through passed (Task 12 report). OK to apply this exact additive DDL to the **production** cars database in one transaction?" — and show the DDL below. Only on an explicit yes:

```bash
DIRECT_URL="$(grep '^DATABASE_NEONDB_SMARTEKAI=' .env.local | cut -d= -f2- | tr -d '"' | sed 's/-pooler\././')" && test -n "$DIRECT_URL" && psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -1 <<'SQL'
ALTER TABLE "cars_user" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cars_user" ADD COLUMN "free_render_used" boolean DEFAULT false NOT NULL;
ALTER TABLE "builds" ADD COLUMN "charge" text;
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"build_id" text,
	"paypal_order_id" text,
	"amount_usd" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_paypal_order_id_unique" UNIQUE("paypal_order_id")
);
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_cars_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cars_user"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "credit_ledger_user_id_idx" ON "credit_ledger" USING btree ("user_id");
SQL
```

Expected: `ALTER TABLE` ×3, `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`; any error rolls back everything (`-1`).

- [ ] **Step 3: Verify production**

```bash
DIRECT_URL="$(grep '^DATABASE_NEONDB_SMARTEKAI=' .env.local | cut -d= -f2- | tr -d '"' | sed 's/-pooler\././')" && test -n "$DIRECT_URL" && psql "$DIRECT_URL" -v ON_ERROR_STOP=1 <<'SQL'
select table_name, column_name, data_type, column_default, is_nullable
  from information_schema.columns
 where (table_name = 'cars_user' and column_name in ('credit_balance', 'free_render_used'))
    or (table_name = 'builds' and column_name = 'charge')
 order by 1, 2;
\d credit_ledger
SQL
```

Expected: same as Task 3 Step 3.

- [ ] **Step 4: Delete the rehearsal branch**

```bash
neon branches delete cars-credits --project-id ancient-hall-95124568
```

Expected: branch deleted.

- [ ] **Step 5: Log it and commit**

Append to `.agents/logs/2026-10-16-cars-db-push-drops-sequences.md`:

```markdown

## Spec 3 (credits), 2026-10-16

Applied without `db:push:cars`: the additive DDL (`cars_user.credit_balance`,
`cars_user.free_render_used`, `builds.charge`, table `credit_ledger` with
unique `paypal_order_id`, FK `credit_ledger_user_id_cars_user_id_fk`, index
`credit_ledger_user_id_idx`) was cross-checked against `drizzle-kit generate`,
rehearsed on branch `cars-credits` (push afterwards planned only the 8 known
sequence drops), then applied to production with `psql -1` after user approval.
Branch deleted. The open item above is still open.
```

```bash
git add .agents/logs/2026-10-16-cars-db-push-drops-sequences.md
git commit -m "docs(logs): Spec 3 credits schema applied by hand, not db:push"
```

---

### Task 14: Going live (manual, ASK FIRST — not part of this plan's execution)

Listed so nothing is forgotten; do **not** do any of it without the user's explicit go-ahead.

1. Deploy the branch to the cars Dokploy app with **sandbox** env first: add `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox` to the app's environment; redeploy; buy a Starter pack with the sandbox buyer on `https://cars.smartekai.com/credits`.
2. When packs and prices are confirmed: developer.paypal.com → **Live** → Create App → set the live `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` and `PAYPAL_ENV=live` in Dokploy (and only there — keep `.env.local` on sandbox); redeploy.
3. One real Starter purchase with a real account; confirm one `purchase +100` ledger row with `amount_usd 9.99`.
4. Refund it in the PayPal dashboard, then remove the credits by hand in one transaction:
   ```sql
   begin;
   update cars_user set credit_balance = credit_balance - 100 where id = '<user id>' and credit_balance >= 100;
   -- if that reported UPDATE 0 (credits already spent): ROLLBACK and decide by hand
   insert into credit_ledger (id, user_id, delta, reason) values (gen_random_uuid()::text, '<user id>', -100, 'grant');
   commit;
   ```
5. Watch the server logs for `[paypal] MANUAL REVIEW` and `[credits] MANUAL REVIEW` lines; each means money or credits need a manual fix.
