# Gallery-First Affiliate MVP (cars-4by4-builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `apps/cars-4by4-builder` into the gallery-first, region-aware affiliate MVP described in `.agents/cars-4by4-builder/specs/2026-10-08-gallery-first-affiliate-mvp-design.md`.

**Architecture:** Cars tables move into their own `@smartekai/db/cars` entry (own schema file, lazy client, own drizzle config). Generation becomes async: `checkPhoto` → draft build, `startBuild` → kicks off an in-process render and returns immediately, `getBuild` is polled by the build page. Region (US/GCC) is resolved per request from a cookie or `cf-ipcountry`; all Buy links go through a `/go/$partId` redirect that logs a click.

**Tech Stack:** TanStack Start (Vite + Nitro), React 19, Drizzle ORM + Neon HTTP, Neon Object Storage via `@smartekai/storage`, Gemini via `@smartekai/ai`, Tailwind v3, `@react-pdf/renderer`, `lucide-react`. **No new dependencies.**

**Validation strategy:** No test suite exists (`AGENTS.md`: "test: none"). Each task verifies with the scoped gate plus the manual check it names:

```bash
# from the worktree root
npx turbo run type-check lint --filter=cars-4by4-builder...
npx turbo run build --filter=cars-4by4-builder...      # where a task says so
```

Pure helpers are spot-checked with `npx tsx -e '…'` one-liners. `./scripts/gate.sh` as a whole still fails on `apps/legal-os` lint (pre-existing, user said ignore legal-os) — the scoped commands above are the signal for this plan.

**Working directory:** every path below is relative to the worktree root
`/Users/ar/Desktop/Web Development/worktrees/smartekai-saas/feat/app-4by4-builder/smartekai-saas`, branch `feat/app-4by4-builder`.

**Ask-first checkpoints (per `lean-build` §5):** Task 3 (destructive schema push to the cars database) — stop and get explicit user confirmation before running it.

**Interim breakage is expected:** after Task 3 drops `upgrade_sessions` and reshapes `parts`, the *old* routes (`/`, `/upload`, `/builds/$sessionId`) fail at runtime until Tasks 10–11 replace them. Type-check/lint stay green throughout.

---

## File map

**`packages/storage`**
- Modify `src/index.ts` — add `deleteObject`.

**`packages/db`**
- Create `src/cars/schema.ts` — all cars tables + row types.
- Create `src/cars/client.ts` — lazy `getDbCars()`.
- Create `src/cars/index.ts` — entry for `@smartekai/db/cars`.
- Create `drizzle.cars.config.ts` — cars-only push config with `tablesFilter`.
- Modify `package.json` — `./cars` export, `db:push:cars` script.
- Modify (Task 14) `src/schema.ts`, `src/client.ts`, `src/index.ts` — remove cars tables + `dbCars`.

**`apps/cars-4by4-builder`**
- Create `src/lib/catalog.ts` — categories, labels, fitment badges, `MAX_PARTS`.
- Create `src/lib/region.ts` — `Region`, `resolveRegion`, `formatPrice`.
- Create `src/lib/pricing.ts` — `summarize`, `LABOR_RATE_USD`.
- Create `src/lib/prompt.ts` — `describeVehicle`, `buildRenderPrompt`.
- Modify `src/lib/advisories.ts` — new category keys.
- Create `src/seed/vehicles.ts`, `src/seed/presets.ts`; rewrite `src/seed/parts.ts`, `scripts/seed.ts`.
- Create `src/server/rate-limit.ts`, `src/server/request.ts`, `src/server/images.ts`, `src/server/render-core.ts`, `src/server/generate.ts`.
- Create `src/lib/builds.ts` — all server functions.
- Create `src/routes/go/$partId.ts`, `src/routes/sitemap[.]xml.ts`.
- Create components: `PartImage`, `FitmentBadge`, `BuildProgress`, `ShareButton`, `PartCard`, `CategoryTabs`, `PresetPills`, `VehiclePicker`, `BuildFooter`, `ShopList`, `PhotoStep`, `BuildCard`, `SiteHeader`, `RegionSwitch`, `SiteFooter`.
- Modify components: `Toast`, `BeforeAfterSlider`, `PhotoDropzone`, `BuildReportPdf`.
- Create routes `src/routes/build.tsx`, `src/routes/builds/$slug.tsx`; rewrite `src/routes/index.tsx`, `src/routes/__root.tsx`.
- Delete `src/routes/upload.tsx`, `src/routes/builds/$sessionId.tsx`, `src/lib/generate-build.ts`, `src/lib/queries.ts`, `src/components/PartsSelectionGrid.tsx`.
- Create `scripts/upload-stock.ts`, `scripts/render-gallery.ts`, `scripts/cleanup.ts`.
- Modify `package.json` (scripts), `vite.config.ts` (SSR external), `src/styles.css` (theme), `src/lib/auth.ts` (Task 14 import switch).

**Root**
- Modify `turbo.json` — add `CARS_DAILY_RENDER_CAP`, `PUBLIC_SITE_URL` to `globalEnv`.

---

### Task 1: `deleteObject` in `@smartekai/storage`

**Files:**
- Modify: `packages/storage/src/index.ts`

- [x] **Step 1: Add the import and function**

Change the import block at the top of `packages/storage/src/index.ts` to:

```ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
```

Add after `uploadObject`:

```ts
export async function deleteObject(bucket: string, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
```

- [x] **Step 2: Build and verify**

```bash
npm run build --workspace=@smartekai/storage
npx turbo run type-check lint --filter=@smartekai/storage
```

Expected: both succeed; `packages/storage/dist/index.d.ts` now declares `deleteObject`.

- [x] **Step 3: Commit** (this repo commits package `dist/`)

```bash
git add packages/storage/src/index.ts packages/storage/dist
git commit -m "feat(storage): add deleteObject

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `@smartekai/db/cars` entry (additive — shared schema untouched)

**Files:**
- Create: `packages/db/src/cars/schema.ts`, `packages/db/src/cars/client.ts`, `packages/db/src/cars/index.ts`, `packages/db/drizzle.cars.config.ts`
- Modify: `packages/db/package.json`, `apps/cars-4by4-builder/vite.config.ts`

- [x] **Step 1: Create `packages/db/src/cars/schema.ts`**

```ts
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Cars 4x4 customizer — dedicated database (DATABASE_NEONDB_SMARTEKAI).
// Pushed with drizzle.cars.config.ts, never with the shared legal/medical config.

export type AffiliateUrls = { us?: string; gcc?: string };
export type DetectedVehicle = {
  make: string | null;
  model: string | null;
  color: string | null;
};
export type BuildStatus = "draft" | "processing" | "completed" | "failed";

// Better Auth tables — unchanged; unused by the MVP flow (no login).
export const carsUsers = pgTable("cars_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const carsSessions = pgTable(
  "cars_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => carsUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    tokenIdx: index("cars_session_token_idx").on(table.token),
    userIdx: index("cars_session_user_idx").on(table.userId),
  }),
);

export const carsAccounts = pgTable(
  "cars_account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => carsUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("cars_account_user_idx").on(table.userId),
  }),
);

export const carsVerifications = pgTable("cars_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(), // "lc300" | "patrol-y62" | "wrangler-jl"
  name: text("name").notNull(),
  yearRange: text("year_range").notNull(),
  stockImageKey: text("stock_image_key"), // "stock/<id>.<ext>" in cars-renders; null until uploaded
  sortOrder: integer("sort_order").notNull().default(0),
});

export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // armor | wheels_tires | overland | suspension | lighting
  brand: text("brand").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  fitmentDifficulty: text("fitment_difficulty").notNull(), // "Direct Bolt-On" | "Minor Trimming" | "Custom Fabrication"
  aiPromptSnippet: text("ai_prompt_snippet").notNull(),
  imageUrl: text("image_url").notNull().default(""), // "" = no licensed image yet
  vehicleIds: text("vehicle_ids").array().notNull(),
  affiliateUrls: jsonb("affiliate_urls").$type<AffiliateUrls>().notNull().default({}),
});

export const presets = pgTable("presets", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(), // also the curated build's slug
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  name: text("name").notNull(),
  partIds: text("part_ids").array().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const builds = pgTable(
  "builds",
  {
    id: text("id").primaryKey(),
    slug: text("slug").unique(), // curated builds only
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    presetId: text("preset_id").references(() => presets.id),
    isCurated: boolean("is_curated").notNull().default(false),
    // Storage keys, never URLs — read URLs are generated at request time.
    // Keys under "stock/" live in cars-renders (public); others in cars-uploads (private).
    originalImageKey: text("original_image_key").notNull(),
    renderKey: text("render_key"),
    status: text("status").$type<BuildStatus>().notNull().default("draft"),
    errorMessage: text("error_message"),
    selectedPartIds: text("selected_part_ids").array().notNull(),
    detectedVehicle: jsonb("detected_vehicle").$type<DetectedVehicle>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("builds_created_at_idx").on(table.createdAt),
  }),
);

export const outboundClicks = pgTable("outbound_clicks", {
  id: text("id").primaryKey(),
  partId: text("part_id").notNull(),
  buildId: text("build_id"), // no FK: clicks outlive cleaned-up builds
  region: text("region").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type Preset = typeof presets.$inferSelect;
export type Build = typeof builds.$inferSelect;
```

- [x] **Step 2: Create `packages/db/src/cars/client.ts`**

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDbCars() {
  const url = process.env.DATABASE_NEONDB_SMARTEKAI;
  if (!url) {
    throw new Error("DATABASE_NEONDB_SMARTEKAI is not set — @smartekai/db/cars needs it");
  }
  return drizzle({ client: neon(url), schema });
}

let instance: ReturnType<typeof createDbCars> | undefined;

/** Lazy: importing this module never requires the env var; first use does. */
export function getDbCars() {
  if (!instance) instance = createDbCars();
  return instance;
}

export type CarsDatabase = ReturnType<typeof getDbCars>;
```

- [x] **Step 3: Create `packages/db/src/cars/index.ts`**

```ts
export * from "./schema";
export { getDbCars, type CarsDatabase } from "./client";
```

- [x] **Step 4: Add the export and push script to `packages/db/package.json`**

Replace the `exports` block with (order matters — `./cars` before `./*`):

```json
  "exports": {
    ".": "./dist/index.js",
    "./cars": {
      "types": "./dist/cars/index.d.ts",
      "default": "./dist/cars/index.js"
    },
    "./*": "./dist/*"
  },
```

Add to `scripts`:

```json
    "db:push:cars": "drizzle-kit push --config=drizzle.cars.config.ts",
```

- [x] **Step 5: Create `packages/db/drizzle.cars.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

// Load the monorepo-root env file when present (local dev); in other
// environments the variable comes from the process env.
try {
  process.loadEnvFile("../../.env.local");
} catch {
  // no file — fall through to process.env
}

const url = process.env.DATABASE_NEONDB_SMARTEKAI;
if (!url) throw new Error("DATABASE_NEONDB_SMARTEKAI is not set");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/cars/schema.ts",
  dbCredentials: { url },
  // The cars DB also holds leftover empty legal/medical tables from the old
  // shared-schema pushes. Only manage cars tables — never drop the others here.
  tablesFilter: [
    "vehicles",
    "parts",
    "presets",
    "builds",
    "outbound_clicks",
    "cars_user",
    "cars_session",
    "cars_account",
    "cars_verification",
  ],
});
```

- [x] **Step 6: Add the subpath to the app's SSR externals**

In `apps/cars-4by4-builder/vite.config.ts`, change the `external` array to:

```ts
      external: [
        "@smartekai/ui",
        "@smartekai/db",
        "@smartekai/db/cars",
        "@smartekai/ai",
        "@smartekai/storage",
      ],
```

- [x] **Step 7: Build and verify**

```bash
npm run build --workspace=@smartekai/db
ls packages/db/dist/cars          # expect: client.js client.d.ts index.js index.d.ts schema.js schema.d.ts
npx turbo run type-check lint build --filter=cars-4by4-builder...
```

Expected: all green (nothing imports the new entry yet; this proves it compiles and the export map is valid).

- [x] **Step 8: Commit**

```bash
git add packages/db/src/cars packages/db/dist packages/db/package.json packages/db/drizzle.cars.config.ts apps/cars-4by4-builder/vite.config.ts
git commit -m "feat(db): add @smartekai/db/cars entry with lazy client and cars-only push config

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Push the cars schema — ⚠️ ASK FIRST

Destructive on the cars database: drops `upgrade_sessions` and `parts` (both hold only seed/test data — 25 seeded parts and a few test sessions; no real users exist). **Stop and get explicit user confirmation before Step 1.**

- [x] **Step 1: Confirm with the user** — quote this task's first paragraph and wait for "yes".

- [x] **Step 2: Drop the two tables being reshaped**

```bash
cd packages/db
npx tsx --env-file=../../.env.local -e '
(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_NEONDB_SMARTEKAI);
  await sql`DROP TABLE IF EXISTS upgrade_sessions`;
  await sql`DROP TABLE IF EXISTS parts`;
  console.log("dropped");
})();
'
cd ../..
```

Expected: `dropped`.

- [x] **Step 3: Push**

```bash
npm run db:push:cars --workspace=@smartekai/db
```

Expected: drizzle-kit lists creating `vehicles`, `parts`, `presets`, `builds`, `outbound_clicks`, and no changes to `cars_*`. If it proposes dropping anything not in that list, abort (Ctrl-C) and report — `tablesFilter` should prevent it.

- [x] **Step 4: No commit** (database change only). Record the result under "Execution log" at the bottom of this plan.

---

### Task 4: Pure domain helpers

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/catalog.ts`, `src/lib/region.ts`, `src/lib/pricing.ts`, `src/lib/prompt.ts`
- Modify: `apps/cars-4by4-builder/src/lib/advisories.ts`

- [x] **Step 1: Create `src/lib/catalog.ts`**

```ts
export const CATEGORIES = ["armor", "wheels_tires", "overland", "suspension", "lighting"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  armor: "Armor",
  wheels_tires: "Wheels & Tires",
  overland: "Overland",
  suspension: "Suspension",
  lighting: "Lighting & Recovery",
};

export const MAX_PARTS = 12;

export const FITMENT_BADGES: Record<string, { label: string; tone: "ok" | "warn" | "hard" }> = {
  "Direct Bolt-On": { label: "Bolt-on", tone: "ok" },
  "Minor Trimming": { label: "Trimming", tone: "warn" },
  "Custom Fabrication": { label: "Fabrication", tone: "hard" },
};
```

- [x] **Step 2: Create `src/lib/region.ts`**

```ts
export type Region = "us" | "gcc";

const GCC_COUNTRIES = new Set(["AE", "SA", "KW", "QA", "BH", "OM"]);

/** AED is pegged to USD. */
export const AED_PER_USD = 3.6725;

export function parseRegionCookie(cookieHeader: string | undefined): Region | null {
  const match = cookieHeader?.match(/(?:^|;\s*)region=(us|gcc)(?:;|$)/);
  return match ? (match[1] as Region) : null;
}

/** Cookie (header switch) wins, then Cloudflare's country header, then US. */
export function resolveRegion(cookieHeader: string | undefined, country: string | undefined): Region {
  const fromCookie = parseRegionCookie(cookieHeader);
  if (fromCookie) return fromCookie;
  return country && GCC_COUNTRIES.has(country.toUpperCase()) ? "gcc" : "us";
}

export function formatPrice(usd: number, region: Region): string {
  if (region === "gcc") {
    return `AED ${Math.round(usd * AED_PER_USD).toLocaleString("en-US")}`;
  }
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}
```

- [x] **Step 3: Create `src/lib/pricing.ts`**

```ts
export const LABOR_RATE_USD = 100;

type PricedPart = { priceUsd: string; laborHoursEst: string };

export function summarize(parts: PricedPart[]) {
  const partsUsd = parts.reduce((sum, p) => sum + Number(p.priceUsd), 0);
  const laborHours = Math.round(parts.reduce((sum, p) => sum + Number(p.laborHoursEst), 0) * 10) / 10;
  const laborUsd = laborHours * LABOR_RATE_USD;
  return { partsUsd, laborHours, laborUsd, totalUsd: partsUsd + laborUsd };
}
```

- [x] **Step 4: Create `src/lib/prompt.ts`** (relative-import-free so scripts can use it)

```ts
type Detected = { make: string | null; model: string | null; color: string | null } | null;

export function describeVehicle(detected: Detected, fallbackName: string): string {
  const parts = detected ? [detected.color, detected.make, detected.model].filter(Boolean) : [];
  return parts.length > 0 ? parts.join(" ") : fallbackName;
}

export function buildRenderPrompt(vehicleDesc: string, snippets: string[]): string {
  return [
    `Edit this photo of a ${vehicleDesc}.`,
    "Keep the exact same vehicle, paint color, camera angle, lighting and background.",
    `Add these aftermarket upgrades with realistic, seamless fitment: ${snippets.join("; ")}.`,
    "Photorealistic automotive photography. Do not add any text, logos or watermarks.",
  ].join(" ");
}
```

- [x] **Step 5: Update `src/lib/advisories.ts` category keys**

Replace the `CATEGORY_ADVISORIES` constant with:

```ts
const CATEGORY_ADVISORIES: Record<string, string> = {
  armor: "Front armor adds weight over the front axle — a heavier-rate front spring is commonly paired with it to keep ride height.",
  wheels_tires: "Larger tires may need a lift or trimming to clear at full steering lock.",
  overland: "Roof-mounted gear raises the center of gravity — drive conservatively at highway speed and in crosswinds.",
  suspension: "Suspension changes affect alignment and headlight aim — book an alignment after install.",
  lighting: "Auxiliary lights may need to be covered or switched off on public roads — check your local rules.",
};
```

- [x] **Step 6: Spot-check the pure functions**

```bash
cd apps/cars-4by4-builder
npx tsx -e '
import { resolveRegion, formatPrice } from "./src/lib/region.ts";
import { summarize } from "./src/lib/pricing.ts";
console.log(resolveRegion(undefined, "AE"), resolveRegion("a=1; region=us", "AE"), resolveRegion(undefined, undefined));
console.log(formatPrice(2450, "us"), formatPrice(2450, "gcc"));
console.log(summarize([{ priceUsd: "2450.00", laborHoursEst: "3.5" }, { priceUsd: "1050.00", laborHoursEst: "2.0" }]));
'
cd ../..
```

Expected:
```
gcc us us
$2,450 AED 8,998
{ partsUsd: 3500, laborHours: 5.5, laborUsd: 550, totalUsd: 4050 }
```

- [x] **Step 7: Verify and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
git add apps/cars-4by4-builder/src/lib
git commit -m "feat(cars-4by4-builder): add region, pricing, catalog and prompt helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Seed data (vehicles, parts, presets)

Part images and affiliate URLs stay empty until the user supplies real, permitted values (spec §7). Every part fits all three vehicles for now — real per-vehicle fitment arrives with the real catalog data. Four parts were dropped because they produce no visible change in a render (fridge, air locker, constant-load springs, recovery kit).

**Files:**
- Create: `apps/cars-4by4-builder/src/seed/vehicles.ts`, `src/seed/presets.ts`
- Rewrite: `apps/cars-4by4-builder/src/seed/parts.ts`, `scripts/seed.ts`

- [x] **Step 1: Create `src/seed/vehicles.ts`**

```ts
export const seedVehicles = [
  { id: "lc300", name: "Toyota Land Cruiser", yearRange: "2022–2026", sortOrder: 1 },
  { id: "patrol-y62", name: "Nissan Patrol", yearRange: "2010–2024", sortOrder: 2 },
  { id: "wrangler-jl", name: "Jeep Wrangler", yearRange: "2018–2026", sortOrder: 3 },
];
```

- [x] **Step 2: Rewrite `src/seed/parts.ts`**

```ts
// PLACEHOLDER CATALOG: imageUrl "" and affiliateUrls {} until real, permitted
// values are supplied (spec §7). Buy buttons stay hidden for parts without a
// URL in the visitor's region. vehicleIds = all three until real fitment data.
const ALL = ["lc300", "patrol-y62", "wrangler-jl"];

type SeedPart = {
  id: string;
  name: string;
  category: string;
  brand: string;
  priceUsd: string;
  laborHoursEst: string;
  fitmentDifficulty: string;
  aiPromptSnippet: string;
};

const catalog: SeedPart[] = [
  // Armor
  { id: "arb-summit-bullbar", name: "ARB Summit Bull Bar", category: "armor", brand: "ARB", priceUsd: "2450.00", laborHoursEst: "3.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a matte black heavy-duty steel bull bar with integrated recovery points and round driving lights on the front bumper" },
  { id: "arb-stealthbar", name: "ARB StealthBar", category: "armor", brand: "ARB", priceUsd: "1890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile matte black stealth front bumper with integrated fog lights" },
  { id: "ironman-rock-sliders", name: "Ironman 4x4 Rock Sliders", category: "armor", brand: "Ironman 4x4", priceUsd: "890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "black powder-coated steel rock sliders along the rocker panels" },
  { id: "smittybilt-src", name: "Smittybilt SRC Side Armor", category: "armor", brand: "Smittybilt", priceUsd: "620.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "textured black tubular side armor bars along the rocker panels" },
  { id: "arb-underbody-armor", name: "ARB Underbody Armor Kit", category: "armor", brand: "ARB", priceUsd: "540.00", laborHoursEst: "2.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visible steel skid plate beneath the front bumper" },
  // Wheels & Tires
  { id: "method-beadlock-701", name: "Method 701 Beadlock Wheels", category: "wheels_tires", brand: "Method", priceUsd: "1840.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "bronze 17-inch beadlock-style wheels with visible bolt rings" },
  { id: "nitto-ridge-grappler-35", name: "35\" Nitto Ridge Grappler Tires", category: "wheels_tires", brand: "Nitto", priceUsd: "1600.00", laborHoursEst: "1.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "35-inch aggressive hybrid all-terrain/mud-terrain tires with deep chunky tread" },
  { id: "bfg-km3-33", name: "33\" BFGoodrich KM3 Mud-Terrain Tires", category: "wheels_tires", brand: "BFGoodrich", priceUsd: "1280.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "33-inch mud-terrain tires with large tread blocks" },
  { id: "fuel-vector-wheels", name: "Fuel Vector Wheels", category: "wheels_tires", brand: "Fuel", priceUsd: "1120.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "matte black 18-inch off-road wheels with a deep concave face" },
  // Overland
  { id: "frontrunner-slimline-ii", name: "Front Runner Slimline II Roof Rack", category: "overland", brand: "Front Runner", priceUsd: "1150.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a slim black aluminum platform roof rack mounted flush to the roofline" },
  { id: "arb-esperance-tent", name: "ARB Esperance Rooftop Tent", category: "overland", brand: "ARB", priceUsd: "2200.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a closed grey hardshell rooftop tent on the roof rack" },
  { id: "ironman-hardshell-tent", name: "Ironman 4x4 Hardshell Rooftop Tent", category: "overland", brand: "Ironman 4x4", priceUsd: "2450.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile black hardshell rooftop tent on the roof" },
  { id: "arb-270-awning", name: "ARB 270° Awning", category: "overland", brand: "ARB", priceUsd: "890.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a rolled-up 270-degree awning bag mounted along the side of the roof rack" },
  // Suspension
  { id: "ome-bp51", name: "Old Man Emu BP-51 Suspension Kit", category: "suspension", brand: "Old Man Emu", priceUsd: "3200.00", laborHoursEst: "6.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visibly lifted stance with about 2 inches more wheel gap" },
  { id: "ironman-foam-cell", name: "Ironman 4x4 Foam Cell Suspension", category: "suspension", brand: "Ironman 4x4", priceUsd: "1620.00", laborHoursEst: "5.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a moderate 2-inch suspension lift with more ground clearance" },
  { id: "rough-country-lift-kit", name: "Rough Country 2.5\" Lift Kit", category: "suspension", brand: "Rough Country", priceUsd: "980.00", laborHoursEst: "4.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 2.5-inch suspension lift with a more aggressive stance" },
  { id: "bilstein-5100-shocks", name: "Bilstein 5100 Series Shocks", category: "suspension", brand: "Bilstein", priceUsd: "620.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "yellow-bodied performance shock absorbers visible behind the wheels" },
  // Lighting & Recovery
  { id: "rigid-led-lightbar", name: "Rigid 40\" LED Light Bar", category: "lighting", brand: "Rigid Industries", priceUsd: "650.00", laborHoursEst: "1.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 40-inch LED light bar mounted above the windshield" },
  { id: "kc-hilites-cube", name: "KC HiLiTES Cube LED Pods", category: "lighting", brand: "KC HiLiTES", priceUsd: "220.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a pair of small square LED pod lights on the A-pillars" },
  { id: "ironman-snorkel", name: "Ironman 4x4 Snorkel", category: "lighting", brand: "Ironman 4x4", priceUsd: "310.00", laborHoursEst: "2.5", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a black safari snorkel running up the A-pillar to the roofline" },
  { id: "warn-vr-evo-10s", name: "Warn VR EVO 10-S Winch", category: "lighting", brand: "Warn", priceUsd: "1050.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a black recovery winch mounted at the front center of the bumper" },
];

export const seedParts = catalog.map((p) => ({
  ...p,
  imageUrl: "",
  vehicleIds: ALL,
  affiliateUrls: {},
}));
```

- [x] **Step 3: Create `src/seed/presets.ts`**

```ts
const PRESET_PARTS = {
  overlander: ["frontrunner-slimline-ii", "arb-esperance-tent", "arb-270-awning", "arb-summit-bullbar", "bfg-km3-33", "ome-bp51"],
  dune: ["arb-stealthbar", "method-beadlock-701", "nitto-ridge-grappler-35", "rough-country-lift-kit", "kc-hilites-cube"],
  trail: ["ironman-rock-sliders", "arb-underbody-armor", "bfg-km3-33", "ironman-foam-cell", "warn-vr-evo-10s", "ironman-snorkel"],
};

const PRESET_NAMES = { overlander: "Overlander", dune: "Desert / Dune", trail: "Trail" };

const VEHICLE_SLUGS = { lc300: "land-cruiser", "patrol-y62": "patrol", "wrangler-jl": "wrangler" };

export const seedPresets = Object.entries(VEHICLE_SLUGS).flatMap(([vehicleId, vehicleSlug]) =>
  (Object.keys(PRESET_PARTS) as Array<keyof typeof PRESET_PARTS>).map((key, i) => ({
    id: `${vehicleId}-${key}`,
    slug: `${vehicleSlug}-${key}`,
    vehicleId,
    name: PRESET_NAMES[key],
    partIds: PRESET_PARTS[key],
    sortOrder: i + 1,
  })),
);
```

- [x] **Step 4: Rewrite `scripts/seed.ts`**

```ts
import { getDbCars, parts, presets, vehicles } from "@smartekai/db/cars";
import { seedParts } from "../src/seed/parts";
import { seedPresets } from "../src/seed/presets";
import { seedVehicles } from "../src/seed/vehicles";

async function main() {
  const db = getDbCars();

  console.log(`Seeding ${seedVehicles.length} vehicles...`);
  for (const v of seedVehicles) {
    // stockImageKey is owned by scripts/upload-stock.ts — never overwrite it here.
    await db.insert(vehicles).values(v).onConflictDoUpdate({
      target: vehicles.id,
      set: { name: v.name, yearRange: v.yearRange, sortOrder: v.sortOrder },
    });
  }

  console.log(`Seeding ${seedParts.length} parts...`);
  for (const p of seedParts) {
    await db.insert(parts).values(p).onConflictDoUpdate({ target: parts.id, set: p });
  }

  console.log(`Seeding ${seedPresets.length} presets...`);
  for (const p of seedPresets) {
    await db.insert(presets).values(p).onConflictDoUpdate({ target: presets.id, set: p });
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [x] **Step 5: Verify every preset part exists**

```bash
cd apps/cars-4by4-builder
npx tsx -e '
import { seedParts } from "./src/seed/parts.ts";
import { seedPresets } from "./src/seed/presets.ts";
const ids = new Set(seedParts.map((p) => p.id));
const missing = seedPresets.flatMap((p) => p.partIds.filter((id) => !ids.has(id)));
console.log(seedParts.length, seedPresets.length, missing);
'
cd ../..
```

Expected: `21 9 []`

- [x] **Step 6: Run the seed (requires Task 3 done)**

```bash
npm run db:seed --workspace=cars-4by4-builder
```

Expected: `Seeding 3 vehicles...` / `Seeding 21 parts...` / `Seeding 9 presets...` / `Seed complete.`

- [x] **Step 7: Verify and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
git add apps/cars-4by4-builder/src/seed apps/cars-4by4-builder/scripts/seed.ts
git commit -m "feat(cars-4by4-builder): seed vehicles, re-categorized parts and presets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Server-side modules (rate limit, request context, images, generation)

`render-core.ts`, `images.ts` and `prompt.ts` use **relative imports and no `drizzle-orm`** so the CommonJS-scoped scripts in `scripts/` can import them without re-triggering the dual-package hazard fixed in commit `8ae03a5` (two drizzle evaluations → Symbol mismatch). DB access stays in callers.

**Files:**
- Create: `apps/cars-4by4-builder/src/server/rate-limit.ts`, `request.ts`, `images.ts`, `render-core.ts`, `generate.ts`

- [x] **Step 1: Create `src/server/rate-limit.ts`**

```ts
type Rule = { key: string; limit: number; windowMs: number };
type Window = { count: number; resetAt: number };

// In-memory: correct for the single Node instance this app deploys as.
const windows = new Map<string, Window>();
const HOUR = 3_600_000;

function prune(now: number) {
  if (windows.size < 10_000) return;
  for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
}

/** Consumes one unit from every rule, or none if any rule is exhausted. */
export function tryConsume(rules: Rule[]): boolean {
  const now = Date.now();
  prune(now);
  const current = rules.map((r) => {
    const w = windows.get(r.key);
    return !w || w.resetAt <= now ? { count: 0, resetAt: now + r.windowMs } : w;
  });
  if (rules.some((r, i) => current[i].count >= r.limit)) return false;
  rules.forEach((r, i) => windows.set(r.key, { count: current[i].count + 1, resetAt: current[i].resetAt }));
  return true;
}

export const renderRules = (ip: string): Rule[] => [
  { key: `render:h:${ip}`, limit: 5, windowMs: HOUR },
  { key: `render:d:${ip}`, limit: 15, windowMs: 24 * HOUR },
];

export const photoRules = (ip: string): Rule[] => [{ key: `photo:h:${ip}`, limit: 20, windowMs: HOUR }];
```

- [x] **Step 2: Create `src/server/request.ts`**

```ts
import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import { resolveRegion } from "@/lib/region";
import type { Region } from "@/lib/region";

export function requestRegion(): Region {
  const headers = getRequest().headers;
  return resolveRegion(headers.get("cookie") ?? undefined, headers.get("cf-ipcountry") ?? undefined);
}

/** Traefik sets X-Forwarded-For in front of this app. */
export function requestIp(): string {
  return getRequestIP({ xForwardedFor: true }) ?? "unknown";
}
```

- [x] **Step 3: Create `src/server/images.ts`**

```ts
import { BUCKETS, getPresignedReadUrl, getPublicUrl } from "@smartekai/storage";

export const STOCK_PREFIX = "stock/";

/** Stock photos are public; user uploads are private and get a 1-hour signed URL. */
export async function originalImageUrl(key: string): Promise<string> {
  return key.startsWith(STOCK_PREFIX)
    ? getPublicUrl(BUCKETS.renders, key)
    : getPresignedReadUrl(BUCKETS.uploads, key, 3600);
}

export function publicImageUrl(key: string): string {
  return getPublicUrl(BUCKETS.renders, key);
}
```

- [x] **Step 4: Create `src/server/render-core.ts`**

```ts
import { generateUpgradeRender } from "@smartekai/ai";
import { BUCKETS, uploadObject } from "@smartekai/storage";
import { buildRenderPrompt } from "../lib/prompt";
import { originalImageUrl } from "./images";

/** Renders and stores the image; returns its key in cars-renders. No DB access. */
export async function renderUpgrade(input: {
  buildId: string;
  originalImageKey: string;
  vehicleDesc: string;
  snippets: string[];
}): Promise<string> {
  const prompt = buildRenderPrompt(input.vehicleDesc, input.snippets);
  const generated = await generateUpgradeRender(await originalImageUrl(input.originalImageKey), prompt);
  const extension = generated.mediaType.split("/")[1] || "png";
  const renderKey = `renders/${input.buildId}.${extension}`;
  await uploadObject(BUCKETS.renders, renderKey, Buffer.from(generated.data), generated.mediaType);
  return renderKey;
}
```

- [x] **Step 5: Create `src/server/generate.ts`**

```ts
import { eq, inArray } from "drizzle-orm";
import { builds, getDbCars, parts, vehicles } from "@smartekai/db/cars";
import { describeVehicle } from "@/lib/prompt";
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
  }
}
```

- [x] **Step 6: Spot-check the rate limiter**

```bash
cd apps/cars-4by4-builder
npx tsx -e '
import { tryConsume, renderRules } from "./src/server/rate-limit.ts";
const results = Array.from({ length: 6 }, () => tryConsume(renderRules("1.2.3.4")));
console.log(results, tryConsume(renderRules("5.6.7.8")));
'
cd ../..
```

Expected: `[ true, true, true, true, true, false ] true`

- [x] **Step 7: Verify and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
git add apps/cars-4by4-builder/src/server
git commit -m "feat(cars-4by4-builder): add rate limiter, request context, image URLs and async generation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If `getRequest`/`getRequestIP` fail to resolve from `@tanstack/react-start/server`, check `node_modules/@tanstack/react-start/dist/esm/server.d.ts` (it re-exports `@tanstack/react-start-server`, which wraps `@tanstack/start-server-core/dist/esm/request-response.d.ts` where both are declared) and import from the package that actually exports them — don't hand-roll header parsing.

---

### Task 7: Server functions

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/builds.ts`

- [x] **Step 1: Create `src/lib/builds.ts`**

```ts
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { and, asc, count, eq, gte, inArray, ne, or } from "drizzle-orm";
import { builds, getDbCars, parts, presets, vehicles } from "@smartekai/db/cars";
import type { DetectedVehicle, Part } from "@smartekai/db/cars";
import { detectVehicle } from "@smartekai/ai";
import { BUCKETS, deleteObject, getPresignedReadUrl, uploadObject } from "@smartekai/storage";
import { MAX_PARTS } from "@/lib/catalog";
import { summarize } from "@/lib/pricing";
import type { Region } from "@/lib/region";
import { STALE_PROCESSING_MS, runGeneration } from "@/server/generate";
import { originalImageUrl, publicImageUrl } from "@/server/images";
import { photoRules, renderRules, tryConsume } from "@/server/rate-limit";
import { requestIp, requestRegion } from "@/server/request";

const ACCEPTED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const DAILY_RENDER_CAP = Number(process.env.CARS_DAILY_RENDER_CAP ?? 200);

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

export type PublicPart = {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceUsd: string;
  laborHoursEst: string;
  fitmentDifficulty: string;
  imageUrl: string;
  buyable: boolean;
};

function toPublicPart(p: Part, region: Region): PublicPart {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceUsd: p.priceUsd,
    laborHoursEst: p.laborHoursEst,
    fitmentDifficulty: p.fitmentDifficulty,
    imageUrl: p.imageUrl,
    buyable: Boolean(p.affiliateUrls[region]),
  };
}

export const getRegion = createServerFn({ method: "GET" }).handler(async () => requestRegion());

export const getConfigurator = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDbCars();
  const region = requestRegion();
  const [allVehicles, allParts, allPresets] = await Promise.all([
    db.select().from(vehicles).orderBy(asc(vehicles.sortOrder)),
    db.select().from(parts).orderBy(asc(parts.category), asc(parts.name)),
    db.select().from(presets).orderBy(asc(presets.sortOrder)),
  ]);
  return {
    region,
    vehicles: allVehicles.map((v) => ({
      id: v.id,
      name: v.name,
      yearRange: v.yearRange,
      stockImageUrl: v.stockImageKey ? publicImageUrl(v.stockImageKey) : null,
    })),
    parts: allParts.map((p) => ({ ...toPublicPart(p, region), vehicleIds: p.vehicleIds })),
    presets: allPresets.map((p) => ({ id: p.id, slug: p.slug, vehicleId: p.vehicleId, name: p.name, partIds: p.partIds })),
  };
});

export type ConfiguratorData = Awaited<ReturnType<typeof getConfigurator>>;

export const checkPhoto = createServerFn({ method: "POST" })
  .validator((formData: FormData) => {
    const photo = formData.get("photo");
    const vehicleId = formData.get("vehicleId");
    if (!(photo instanceof File)) throw new Error("photo is required");
    if (typeof vehicleId !== "string" || vehicleId === "") throw new Error("vehicleId is required");
    return { photo, vehicleId };
  })
  .handler(async ({ data }): Promise<{ ok: true; buildId: string; detected: DetectedVehicle } | Fail> => {
    const extension = ACCEPTED_TYPES[data.photo.type] as string | undefined;
    if (!extension) return fail("Please upload a JPG, PNG or WebP photo.");
    if (data.photo.size > MAX_PHOTO_BYTES) return fail("That photo is over 10 MB — try a smaller one.");
    if (!tryConsume(photoRules(requestIp()))) return fail("Too many uploads — try again in a bit.");

    const db = getDbCars();
    const vehicle = (await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, data.vehicleId))).at(0);
    if (!vehicle) return fail("Pick a vehicle first.");

    const id = crypto.randomUUID();
    const key = `uploads/${id}.${extension}`; // never the user's filename
    await uploadObject(BUCKETS.uploads, key, Buffer.from(await data.photo.arrayBuffer()), data.photo.type);

    let detection: Awaited<ReturnType<typeof detectVehicle>>;
    try {
      detection = await detectVehicle(await getPresignedReadUrl(BUCKETS.uploads, key));
    } catch (err) {
      await deleteObject(BUCKETS.uploads, key);
      throw err;
    }
    if (!detection.isValidVehicle) {
      await deleteObject(BUCKETS.uploads, key);
      return fail(detection.validationError ?? "We couldn't find a 4x4 in that photo — try another angle.");
    }

    const detected: DetectedVehicle = {
      make: detection.detectedMake,
      model: detection.detectedModel,
      color: detection.detectedColor,
    };
    await db.insert(builds).values({
      id,
      vehicleId: vehicle.id,
      originalImageKey: key,
      status: "draft",
      selectedPartIds: [],
      detectedVehicle: detected,
    });
    return { ok: true, buildId: id, detected };
  });

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

    if (!tryConsume(renderRules(requestIp()))) return fail("You've hit the render limit for now — try again in an hour.");

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [{ value: rendersToday }] = await db
      .select({ value: count() })
      .from(builds)
      .where(and(gte(builds.createdAt, startOfDay), eq(builds.isCurated, false), ne(builds.status, "draft")));
    if (rendersToday >= DAILY_RENDER_CAP) {
      return fail("We're at capacity today — browse the gallery and check back tomorrow.");
    }

    let id: string;
    if (data.buildId) {
      const updated = await db
        .update(builds)
        .set({ status: "processing", vehicleId: vehicle.id, selectedPartIds: data.partIds, updatedAt: new Date() })
        .where(and(eq(builds.id, data.buildId), eq(builds.status, "draft")))
        .returning({ id: builds.id });
      if (updated.length === 0) return fail("That photo expired — upload it again.");
      id = data.buildId;
    } else {
      if (!vehicle.stockImageKey) return fail("No studio photo for this vehicle yet — upload your own.");
      id = crypto.randomUUID();
      await db.insert(builds).values({
        id,
        vehicleId: vehicle.id,
        originalImageKey: vehicle.stockImageKey,
        status: "processing",
        selectedPartIds: data.partIds,
      });
    }

    void runGeneration(id); // intentionally not awaited — the build page polls getBuild
    return { ok: true, id };
  });

export const getBuild = createServerFn({ method: "GET" })
  .validator((slugOrId: string) => {
    if (typeof slugOrId !== "string" || slugOrId.length > 100) throw new Error("invalid build id");
    return slugOrId;
  })
  .handler(async ({ data: slugOrId }) => {
    const db = getDbCars();
    const region = requestRegion();
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
      id: build.id,
      slug: build.slug,
      isCurated: build.isCurated,
      status,
      errorMessage,
      region,
      vehicle: { id: vehicle.id, name: vehicle.name },
      presetName: preset?.name ?? null,
      presetSlug: preset?.slug ?? null,
      selectedPartIds: build.selectedPartIds,
      beforeUrl: await originalImageUrl(build.originalImageKey),
      afterUrl: build.renderKey ? publicImageUrl(build.renderKey) : null,
      parts: buildParts.map((p) => toPublicPart(p, region)),
    };
  });

export const getGallery = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDbCars();
  const region = requestRegion();
  const [curated, allParts, allVehicles, allPresets] = await Promise.all([
    db.select().from(builds).where(and(eq(builds.isCurated, true), eq(builds.status, "completed"))),
    db.select({ id: parts.id, priceUsd: parts.priceUsd, laborHoursEst: parts.laborHoursEst }).from(parts),
    db.select().from(vehicles).orderBy(asc(vehicles.sortOrder)),
    db.select().from(presets).orderBy(asc(presets.sortOrder)),
  ]);
  const partById = new Map(allParts.map((p) => [p.id, p]));
  const vehicleOrder = new Map(allVehicles.map((v, i) => [v.id, i]));
  const presetById = new Map(allPresets.map((p) => [p.id, p]));

  const gallery = await Promise.all(
    curated.flatMap((b) => {
      if (!b.slug || !b.renderKey) return [];
      const slug = b.slug;
      const renderKey = b.renderKey;
      const preset = b.presetId ? presetById.get(b.presetId) : undefined;
      const vehicle = allVehicles.find((v) => v.id === b.vehicleId);
      const priced = b.selectedPartIds.flatMap((id) => {
        const p = partById.get(id);
        return p ? [p] : [];
      });
      return [
        (async () => ({
          slug,
          vehicleId: b.vehicleId,
          vehicleName: vehicle?.name ?? "",
          presetName: preset?.name ?? "",
          presetSort: preset?.sortOrder ?? 0,
          partIds: b.selectedPartIds,
          totalUsd: summarize(priced).totalUsd,
          beforeUrl: await originalImageUrl(b.originalImageKey),
          afterUrl: publicImageUrl(renderKey),
        }))(),
      ];
    }),
  );

  gallery.sort(
    (a, b) =>
      (vehicleOrder.get(a.vehicleId) ?? 0) - (vehicleOrder.get(b.vehicleId) ?? 0) || a.presetSort - b.presetSort,
  );

  return {
    region,
    vehicles: allVehicles.map((v) => ({ id: v.id, name: v.name })),
    builds: gallery,
  };
});
```

- [x] **Step 2: Verify and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
git add apps/cars-4by4-builder/src/lib/builds.ts
git commit -m "feat(cars-4by4-builder): add checkPhoto/startBuild/getBuild/gallery server functions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If lint flags `as string | undefined` on `ACCEPTED_TYPES[...]` as unnecessary, the app's tsconfig lacks `noUncheckedIndexedAccess`; replace with `const extension: string | undefined = ACCEPTED_TYPES[data.photo.type];` rather than disabling the rule.

---

### Task 8: Server routes — `/go/$partId` and `/sitemap.xml`

**Files:**
- Create: `apps/cars-4by4-builder/src/routes/go/$partId.ts`, `apps/cars-4by4-builder/src/routes/sitemap[.]xml.ts`
- Modify: `turbo.json`

- [x] **Step 1: Create `src/routes/go/$partId.ts`**

```ts
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { getDbCars, outboundClicks, parts } from "@smartekai/db/cars";
import { resolveRegion } from "@/lib/region";

export const Route = createFileRoute("/go/$partId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const region = resolveRegion(
          request.headers.get("cookie") ?? undefined,
          request.headers.get("cf-ipcountry") ?? undefined,
        );
        const db = getDbCars();
        const part = (
          await db.select({ affiliateUrls: parts.affiliateUrls }).from(parts).where(eq(parts.id, params.partId))
        ).at(0);
        const target = part?.affiliateUrls[region];
        if (!target) return new Response("Not found", { status: 404 });

        const buildId = new URL(request.url).searchParams.get("build");
        await db.insert(outboundClicks).values({
          id: crypto.randomUUID(),
          partId: params.partId,
          buildId: buildId ? buildId.slice(0, 64) : null,
          region,
        });
        return Response.redirect(target, 302);
      },
    },
  },
});
```

- [x] **Step 2: Create `src/routes/sitemap[.]xml.ts`**

```ts
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { builds, getDbCars } from "@smartekai/db/cars";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;
        const curated = await getDbCars()
          .select({ slug: builds.slug })
          .from(builds)
          .where(and(eq(builds.isCurated, true), eq(builds.status, "completed")));
        const urls = [`${origin}/`, ...curated.flatMap((b) => (b.slug ? [`${origin}/builds/${b.slug}`] : []))];
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
          "</urlset>",
          "",
        ].join("\n");
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
```

- [x] **Step 3: Add the two env vars to `turbo.json` `globalEnv`**

Append `"CARS_DAILY_RENDER_CAP"` and `"PUBLIC_SITE_URL"` to the `globalEnv` array.

- [x] **Step 4: Regenerate routes, verify, commit**

```bash
npm run generate-routes --workspace=cars-4by4-builder
npx turbo run type-check lint --filter=cars-4by4-builder...
git add apps/cars-4by4-builder/src/routes apps/cars-4by4-builder/src/routeTree.gen.ts turbo.json
git commit -m "feat(cars-4by4-builder): add affiliate click redirect and sitemap routes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `routeTree.gen.ts` now contains `/go/$partId` and `/sitemap.xml`.

---

### Task 9: UI building blocks (no route links)

**Files:**
- Create: `apps/cars-4by4-builder/src/components/PartImage.tsx`, `FitmentBadge.tsx`, `BuildProgress.tsx`, `ShareButton.tsx`, `PartCard.tsx`, `CategoryTabs.tsx`, `PresetPills.tsx`, `VehiclePicker.tsx`, `BuildFooter.tsx`, `ShopList.tsx`
- Modify: `Toast.tsx`, `BeforeAfterSlider.tsx`, `PhotoDropzone.tsx`

- [x] **Step 1: `PartImage.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function PartImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) return <div aria-hidden className={cn("aspect-video w-full bg-muted bg-texture", className)} />;
  return <img src={src} alt={alt} loading="lazy" className={cn("aspect-video w-full object-cover", className)} />;
}
```

- [x] **Step 2: `FitmentBadge.tsx`**

```tsx
import { FITMENT_BADGES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const TONES = {
  ok: "border-emerald-500/40 text-emerald-400",
  warn: "border-primary/50 text-primary",
  hard: "border-destructive/50 text-destructive",
};

export function FitmentBadge({ difficulty }: { difficulty: string }) {
  const badge = FITMENT_BADGES[difficulty] ?? { label: difficulty, tone: "warn" as const };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", TONES[badge.tone])}>
      {badge.label}
    </span>
  );
}
```

- [x] **Step 3: `BuildProgress.tsx`**

```tsx
import { useEffect, useState } from "react";

const LINES = ["Reading your truck's lines…", "Fitting your upgrades…", "Matching light and shadows…"];

export function BuildProgress() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((n) => (n + 1) % LINES.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-lg font-bold">{LINES[index]}</p>
      <p className="text-sm text-muted-foreground">
        This usually takes 1–2 minutes. You can leave — this page keeps your build.
      </p>
    </div>
  );
}
```

- [x] **Step 4: `ShareButton.tsx`**

```tsx
import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={copy} className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary">
      {copied ? "Link copied" : "Share this build"}
    </button>
  );
}
```

- [x] **Step 5: `PartCard.tsx`**

```tsx
import type { PublicPart } from "@/lib/builds";
import { formatPrice } from "@/lib/region";
import type { Region } from "@/lib/region";
import { cn } from "@/lib/utils";
import { FitmentBadge } from "@/components/FitmentBadge";
import { PartImage } from "@/components/PartImage";

export function PartCard({
  part,
  region,
  selected,
  disabled,
  onToggle,
}: {
  part: PublicPart;
  region: Region;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled && !selected}
      aria-pressed={selected}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition",
        selected ? "-translate-y-0.5 shadow-lg shadow-primary/10 ring-2 ring-primary" : "hover:border-primary/50",
        disabled && !selected && "opacity-50",
      )}
    >
      <PartImage src={part.imageUrl} alt={part.name} />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-sm font-semibold leading-tight">{part.name}</p>
        <p className="text-xs text-muted-foreground">{part.brand}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-bold">{formatPrice(Number(part.priceUsd), region)}</span>
          <FitmentBadge difficulty={part.fitmentDifficulty} />
        </div>
      </div>
    </button>
  );
}
```

- [x] **Step 6: `CategoryTabs.tsx`**

```tsx
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function CategoryTabs({
  active,
  onChange,
}: {
  active: Category | "all";
  onChange: (next: Category | "all") => void;
}) {
  const tabs: Array<{ id: Category | "all"; label: string }> = [
    { id: "all", label: "All" },
    ...CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
  ];
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold",
            active === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [x] **Step 7: `PresetPills.tsx`**

```tsx
import type { ConfiguratorData } from "@/lib/builds";
import { cn } from "@/lib/utils";

type Preset = ConfiguratorData["presets"][number];

export function PresetPills({
  presets,
  activeSlug,
  onPick,
}: {
  presets: Preset[];
  activeSlug: string | undefined;
  onPick: (preset: Preset) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick start</span>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={activeSlug === p.slug}
          onClick={() => onPick(p)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-semibold",
            activeSlug === p.slug ? "border-primary text-primary" : "border-border hover:border-primary/60",
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
```

- [x] **Step 8: `VehiclePicker.tsx`**

```tsx
import type { ConfiguratorData } from "@/lib/builds";

type Vehicle = ConfiguratorData["vehicles"][number];

export function VehiclePicker({ vehicles, onPick }: { vehicles: Vehicle[]; onPick: (id: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {vehicles.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onPick(v.id)}
          className="overflow-hidden rounded-lg border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary"
        >
          {v.stockImageUrl ? (
            <img src={v.stockImageUrl} alt={v.name} className="aspect-video w-full object-cover" />
          ) : (
            <div aria-hidden className="aspect-video w-full bg-muted bg-texture" />
          )}
          <div className="flex items-center justify-between p-4">
            <span className="text-lg font-extrabold tracking-tight">{v.name}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{v.yearRange}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [x] **Step 9: `BuildFooter.tsx`**

```tsx
import { Button } from "@smartekai/ui";
import { formatPrice } from "@/lib/region";
import type { Region } from "@/lib/region";

export function BuildFooter({
  count,
  totalUsd,
  region,
  nextLabel,
  onNext,
}: {
  count: number;
  totalUsd: number;
  region: Region;
  nextLabel?: string;
  onNext?: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold">{count} {count === 1 ? "part" : "parts"}</span>
          <span className="text-muted-foreground"> · est. </span>
          <span className="font-semibold">{formatPrice(totalUsd, region)}</span>
        </p>
        {onNext && nextLabel ? (
          <Button disabled={count === 0} onClick={onNext}>
            {nextLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
```

- [x] **Step 10: `ShopList.tsx`**

```tsx
import type { PublicPart } from "@/lib/builds";
import { formatPrice } from "@/lib/region";
import type { Region } from "@/lib/region";
import { FitmentBadge } from "@/components/FitmentBadge";
import { PartImage } from "@/components/PartImage";

export function ShopList({ parts, region, buildId }: { parts: PublicPart[]; region: Region; buildId: string }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {parts.map((p) => (
        <li key={p.id} className="flex items-center gap-3 p-3">
          <div className="w-20 shrink-0 overflow-hidden rounded-md">
            <PartImage src={p.imageUrl} alt={p.name} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.brand} · {p.laborHoursEst} hrs install
            </p>
            <div className="mt-1">
              <FitmentBadge difficulty={p.fitmentDifficulty} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold">{formatPrice(Number(p.priceUsd), region)}</p>
            {p.buyable ? (
              <a
                href={`/go/${p.id}?build=${buildId}`}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="mt-1 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Buy ↗
              </a>
            ) : (
              <span className="mt-1 inline-block text-xs text-muted-foreground">Link coming soon</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [x] **Step 11: Replace `Toast.tsx`**

```tsx
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-destructive/50 bg-card px-4 py-3 text-sm shadow-xl"
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 font-semibold text-primary">
        Dismiss
      </button>
    </div>
  );
}
```

- [x] **Step 12: Replace `BeforeAfterSlider.tsx`** (clip-path instead of width math; pointer + keyboard support)

```tsx
import { useRef, useState } from "react";

export function BeforeAfterSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);

  function moveTo(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      ref={ref}
      className="relative aspect-video w-full touch-none select-none overflow-hidden rounded-lg bg-muted"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e.clientX);
      }}
    >
      <img src={afterUrl} alt="After: AI visualization with upgrades" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={beforeUrl}
        alt="Before: original photo"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.6)]" style={{ left: `${position}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-bold text-black shadow-lg">
          ⇆
        </div>
      </div>
      <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Before</span>
      <span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">After</span>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Compare before and after"
        className="sr-only"
      />
    </div>
  );
}
```

- [x] **Step 13: Update `PhotoDropzone.tsx`** — restrict accepted types, add a disabled state, and strengthen the empty state

Replace the whole file with:

```tsx
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

export function PhotoDropzone({ onFileSelected, disabled }: { onFileSelected: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFile(file: File) {
    if (disabled) return;
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelected(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files.item(0);
        if (file) handleFile(file);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex h-72 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center",
        dragging ? "border-primary bg-primary/5" : "border-border bg-texture",
        disabled && "cursor-wait opacity-70",
      )}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Selected vehicle" className="h-full w-full object-contain" />
      ) : (
        <>
          <Camera aria-hidden className="h-10 w-10 text-primary" />
          <p className="mt-3 text-lg font-bold">Drop a photo of your 4x4</p>
          <p className="mt-1 text-sm text-muted-foreground">Side profile or 3/4 front angle, in daylight. JPG, PNG or WebP, up to 10 MB.</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.item(0);
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

- [x] **Step 14: Add the `bg-texture` utility** — append to `src/styles.css` (the full theme lands in Task 12; components need the class now):

```css
@layer components {
  .bg-texture {
    background-image: repeating-linear-gradient(
      135deg,
      hsl(var(--foreground) / 0.035) 0 1px,
      transparent 1px 12px
    );
  }
}
```

- [x] **Step 15: Verify and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
git add apps/cars-4by4-builder/src/components apps/cars-4by4-builder/src/styles.css
git commit -m "feat(cars-4by4-builder): add configurator and build-page UI components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Routes `/build` and `/builds/$slug` (replace `/upload` and `/builds/$sessionId`)

These two routes link to each other, so they land in one task.

**Files:**
- Create: `apps/cars-4by4-builder/src/components/PhotoStep.tsx`, `src/routes/build.tsx`, `src/routes/builds/$slug.tsx`
- Modify: `apps/cars-4by4-builder/src/components/BuildReportPdf.tsx`
- Delete: `src/routes/upload.tsx`, `src/routes/builds/$sessionId.tsx`, `src/lib/generate-build.ts`

- [x] **Step 1: Delete the replaced files**

```bash
git rm apps/cars-4by4-builder/src/routes/upload.tsx "apps/cars-4by4-builder/src/routes/builds/\$sessionId.tsx" apps/cars-4by4-builder/src/lib/generate-build.ts
```

- [x] **Step 2: Create `src/components/PhotoStep.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { checkPhoto, startBuild } from "@/lib/builds";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { Toast } from "@/components/Toast";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "verified"; buildId: string; label: string }
  | { state: "rejected"; message: string };

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
  const [toast, setToast] = useState<string | null>(null);

  async function handleFile(file: File) {
    setCheck({ state: "checking" });
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
      setToast("Upload failed — check your connection and try again.");
    }
  }

  async function start(buildId?: string) {
    setStarting(true);
    try {
      const result = await startBuild({ data: { buildId, vehicleId: vehicle.id, partIds } });
      if (!result.ok) {
        setToast(result.error);
        setStarting(false);
        return;
      }
      await navigate({ to: "/builds/$slug", params: { slug: result.id } });
    } catch {
      setToast("Something went wrong — try again.");
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
```

- [x] **Step 3: Create `src/routes/build.tsx`**

```tsx
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getConfigurator } from "@/lib/builds";
import { MAX_PARTS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { summarize } from "@/lib/pricing";
import { BuildFooter } from "@/components/BuildFooter";
import { CategoryTabs } from "@/components/CategoryTabs";
import { PartCard } from "@/components/PartCard";
import { PhotoStep } from "@/components/PhotoStep";
import { PresetPills } from "@/components/PresetPills";
import { VehiclePicker } from "@/components/VehiclePicker";

type Step = "vehicle" | "parts" | "photo";
type BuildSearch = { vehicle?: string; preset?: string; parts?: string[]; step?: Step };
const STEPS: Step[] = ["vehicle", "parts", "photo"];

export const Route = createFileRoute("/build")({
  validateSearch: (search: Record<string, unknown>): BuildSearch => ({
    vehicle: typeof search.vehicle === "string" ? search.vehicle : undefined,
    preset: typeof search.preset === "string" ? search.preset : undefined,
    parts: Array.isArray(search.parts)
      ? search.parts.filter((p): p is string => typeof p === "string").slice(0, MAX_PARTS)
      : undefined,
    step: STEPS.find((s) => s === search.step),
  }),
  loader: () => getConfigurator(),
  head: () => ({ meta: [{ title: "Build your 4x4 | 4x4 Builder" }] }),
  component: Configurator,
});

function Configurator() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/build" });
  const [category, setCategory] = useState<Category | "all">("all");

  const vehicle = data.vehicles.find((v) => v.id === search.vehicle);
  const step: Step = !vehicle || search.step === "vehicle" ? "vehicle" : (search.step ?? "parts");
  const selected = search.parts ?? [];
  const fitting = vehicle ? data.parts.filter((p) => p.vehicleIds.includes(vehicle.id)) : [];
  const selectedParts = fitting.filter((p) => selected.includes(p.id));
  const visible = category === "all" ? fitting : fitting.filter((p) => p.category === category);
  const { totalUsd } = summarize(selectedParts);

  function update(next: BuildSearch, replace = false) {
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace });
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    update({ parts: next, preset: undefined }, true);
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step {STEPS.indexOf(step) + 1} of 3{vehicle ? ` · ${vehicle.name}` : ""}
        </p>

        {step === "vehicle" && (
          <>
            <h1 className="mt-1 text-3xl">Pick your truck</h1>
            <div className="mt-6">
              <VehiclePicker
                vehicles={data.vehicles}
                onPick={(id) => update({ vehicle: id, parts: [], preset: undefined, step: "parts" })}
              />
            </div>
          </>
        )}

        {step === "parts" && vehicle && (
          <>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-3xl">Choose your upgrades</h1>
              <button type="button" onClick={() => update({ step: "vehicle" })} className="text-sm text-primary">
                Change truck
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <PresetPills
                presets={data.presets.filter((p) => p.vehicleId === vehicle.id)}
                activeSlug={search.preset}
                onPick={(p) => update({ preset: p.slug, parts: p.partIds }, true)}
              />
              <CategoryTabs active={category} onChange={setCategory} />
            </div>
            {selected.length >= MAX_PARTS && (
              <p className="mt-3 text-sm text-muted-foreground">That's the max of {MAX_PARTS} upgrades per build.</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((part) => (
                <PartCard
                  key={part.id}
                  part={part}
                  region={data.region}
                  selected={selected.includes(part.id)}
                  disabled={selected.length >= MAX_PARTS}
                  onToggle={() => toggle(part.id)}
                />
              ))}
            </div>
          </>
        )}

        {step === "photo" && vehicle && (
          <>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-3xl">Add your truck</h1>
              <button type="button" onClick={() => update({ step: "parts" })} className="text-sm text-primary">
                Back to upgrades
              </button>
            </div>
            <div className="mt-6 max-w-2xl">
              <PhotoStep vehicle={vehicle} partIds={selectedParts.map((p) => p.id)} />
            </div>
          </>
        )}
      </main>

      {step !== "vehicle" && (
        <BuildFooter
          count={selectedParts.length}
          totalUsd={totalUsd}
          region={data.region}
          nextLabel={step === "parts" ? "Next: add your truck" : undefined}
          onNext={step === "parts" ? () => update({ step: "photo" }) : undefined}
        />
      )}
    </>
  );
}
```

- [x] **Step 4: Update `src/components/BuildReportPdf.tsx` for region pricing and totals**

Replace the file with:

```tsx
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { summarize } from "@/lib/pricing";
import { formatPrice } from "@/lib/region";
import type { Region } from "@/lib/region";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 18, marginBottom: 12 },
  image: { width: "100%", marginBottom: 6 },
  caption: { fontSize: 9, color: "#666", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#eee" },
  total: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 12 },
  sectionTitle: { fontSize: 14, marginTop: 16, marginBottom: 8 },
});

type Part = { id: string; name: string; priceUsd: string; laborHoursEst: string };

export function BuildReportPdf({
  title,
  renderUrl,
  parts,
  advisories,
  region,
}: {
  title: string;
  renderUrl: string;
  parts: Part[];
  advisories: { message: string }[];
  region: Region;
}) {
  const totals = summarize(parts);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Image src={renderUrl} style={styles.image} />
        <Text style={styles.caption}>AI visualization — actual appearance may vary.</Text>

        <Text style={styles.sectionTitle}>Estimated quote</Text>
        {parts.map((part) => (
          <View key={part.id} style={styles.row}>
            <Text>{part.name}</Text>
            <Text>
              {formatPrice(Number(part.priceUsd), region)} · {part.laborHoursEst} hrs
            </Text>
          </View>
        ))}
        <View style={styles.total}>
          <Text>Parts</Text>
          <Text>{formatPrice(totals.partsUsd, region)}</Text>
        </View>
        <View style={styles.total}>
          <Text>Est. labor ({totals.laborHours} hrs)</Text>
          <Text>{formatPrice(totals.laborUsd, region)}</Text>
        </View>
        <View style={styles.total}>
          <Text>Estimated total</Text>
          <Text>{formatPrice(totals.totalUsd, region)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Fitment notes</Text>
        {advisories.map((a) => (
          <Text key={a.message} style={{ marginBottom: 6 }}>
            {a.message}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
```

- [x] **Step 5: Create `src/routes/builds/$slug.tsx`**

```tsx
import { useEffect } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { AlertTriangle, Info } from "lucide-react";
import { getBuild } from "@/lib/builds";
import { getAdvisories } from "@/lib/advisories";
import { summarize } from "@/lib/pricing";
import { formatPrice } from "@/lib/region";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildProgress } from "@/components/BuildProgress";
import { BuildReportPdf } from "@/components/BuildReportPdf";
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

  const advisories = getAdvisories(build.parts);
  const totals = summarize(build.parts);
  const title = build.presetName ? `${build.vehicle.name} — ${build.presetName}` : `Your ${build.vehicle.name} build`;

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
          <ShopList parts={build.parts} region={build.region} buildId={build.id} />
        </div>
        <dl className="mt-4 ml-auto flex max-w-xs flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Parts</dt>
            <dd>{formatPrice(totals.partsUsd, build.region)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Est. labor ({totals.laborHours} hrs)</dt>
            <dd>{formatPrice(totals.laborUsd, build.region)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
            <dt>Estimated total</dt>
            <dd>{formatPrice(totals.totalUsd, build.region)}</dd>
          </div>
        </dl>
      </section>

      {advisories.length > 0 && (
        <section className="mt-10">
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
        <PDFDownloadLink
          document={
            <BuildReportPdf
              title={title}
              renderUrl={build.afterUrl}
              parts={build.parts}
              advisories={advisories}
              region={build.region}
            />
          }
          fileName="4x4-build-quote.pdf"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary"
        >
          {({ loading }) => (loading ? "Preparing PDF…" : "PDF quote")}
        </PDFDownloadLink>
      </div>
    </main>
  );
}
```

- [x] **Step 6: Regenerate routes, verify, build**

```bash
npm run generate-routes --workspace=cars-4by4-builder
npx turbo run type-check lint build --filter=cars-4by4-builder...
```

Expected: green. `routeTree.gen.ts` has `/build` and `/builds/$slug`, no `/upload` or `/builds/$sessionId`. (`src/routes/index.tsx` still uses `queries.ts` — replaced in Task 11.)

- [x] **Step 7: Manual check (dev server)**

```bash
npm run dev --workspace=cars-4by4-builder     # http://localhost:3002
```

1. `/build` → pick Land Cruiser → URL gains `vehicle=lc300&step=parts`.
2. Tap a preset → parts selected, footer shows count and `$` total. Refresh → selection survives.
3. Toggle 12 parts → remaining cards disabled.
4. Next → drop a non-vehicle image (e.g. a screenshot) → red rejection message.
5. Drop a real truck photo → green "✓ …" badge → Generate → lands on `/builds/<uuid>` with progress, then the result without a manual refresh.
6. Open `/builds/does-not-exist` → 404 page.

- [x] **Step 8: Commit**

```bash
git add -A apps/cars-4by4-builder/src
git commit -m "feat(cars-4by4-builder): add /build configurator and /builds/\$slug page with async render

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Gallery home `/`

**Files:**
- Create: `apps/cars-4by4-builder/src/components/BuildCard.tsx`
- Rewrite: `apps/cars-4by4-builder/src/routes/index.tsx`
- Delete: `src/lib/queries.ts`, `src/components/PartsSelectionGrid.tsx`

- [x] **Step 1: Create `src/components/BuildCard.tsx`**

```tsx
import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/region";
import type { Region } from "@/lib/region";

export function BuildCard({
  slug,
  afterUrl,
  vehicleName,
  presetName,
  totalUsd,
  region,
}: {
  slug: string;
  afterUrl: string;
  vehicleName: string;
  presetName: string;
  totalUsd: number;
  region: Region;
}) {
  return (
    <Link
      to="/builds/$slug"
      params={{ slug }}
      className="group overflow-hidden rounded-lg border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary"
    >
      <img src={afterUrl} alt={`${vehicleName} ${presetName} build`} loading="lazy" className="aspect-video w-full object-cover" />
      <div className="flex items-center justify-between gap-2 p-4">
        <div>
          <p className="font-extrabold tracking-tight">{presetName}</p>
          <p className="text-xs text-muted-foreground">{vehicleName}</p>
        </div>
        <span className="text-sm font-bold text-primary">{formatPrice(totalUsd, region)}</span>
      </div>
    </Link>
  );
}
```

- [x] **Step 2: Rewrite `src/routes/index.tsx`**

```tsx
import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { getGallery } from "@/lib/builds";
import { cn } from "@/lib/utils";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildCard } from "@/components/BuildCard";

export const Route = createFileRoute("/")({
  loader: () => getGallery(),
  head: () => ({
    meta: [
      { title: "4x4 Builder — see upgrades on your truck before you buy" },
      { name: "description", content: "Pick real off-road upgrades, see them on your own truck, and get an itemized parts list with estimated prices." },
    ],
  }),
  component: Home,
});

function Home() {
  const { builds, vehicles, region } = Route.useLoaderData();
  const [filter, setFilter] = useState("all");
  const featured = builds.at(0);
  const visible = filter === "all" ? builds : builds.filter((b) => b.vehicleId === filter);

  return (
    <main>
      <section className="border-b border-border bg-texture">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center md:py-16">
          <div>
            <h1 className="text-4xl md:text-5xl">Build your 4x4 before you buy</h1>
            <p className="mt-4 text-muted-foreground">
              Pick real upgrades, see them on your own truck, and get an itemized parts list with estimated prices.
            </p>
            <Link to="/build" className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground">
              Build yours
            </Link>
          </div>
          {featured ? (
            <div>
              <BeforeAfterSlider beforeUrl={featured.beforeUrl} afterUrl={featured.afterUrl} />
              <p className="mt-2 text-xs text-muted-foreground">
                {featured.vehicleName} — {featured.presetName}. AI visualization — actual appearance may vary.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl">Popular builds</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[{ id: "all", name: "All" }, ...vehicles].map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={filter === v.id}
              onClick={() => setFilter(v.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold",
                filter === v.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
              )}
            >
              {v.name}
            </button>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((b) => (
              <BuildCard key={b.slug} {...b} region={region} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-muted-foreground">
            Gallery builds are on the way.{" "}
            <Link to="/build" className="font-semibold text-primary">
              Start your own build
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  );
}
```

- [x] **Step 3: Delete the replaced files**

```bash
git rm apps/cars-4by4-builder/src/lib/queries.ts apps/cars-4by4-builder/src/components/PartsSelectionGrid.tsx
```

- [x] **Step 4: Verify, build, commit**

```bash
npx turbo run type-check lint build --filter=cars-4by4-builder...
git add -A apps/cars-4by4-builder/src
git commit -m "feat(cars-4by4-builder): gallery-first home page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Manual: `/` renders the empty-gallery message (no curated builds until Task 13), "Build yours" opens `/build`.

---

### Task 12: Theme and site shell

**Files:**
- Modify: `apps/cars-4by4-builder/src/styles.css`, `apps/cars-4by4-builder/src/routes/__root.tsx`
- Create: `apps/cars-4by4-builder/src/components/SiteHeader.tsx`, `RegionSwitch.tsx`, `SiteFooter.tsx`

- [x] **Step 1: Replace `src/styles.css`** (spec §6 → `2026-09-12` spec §2 palette)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: dark;
    --background: 24 8% 10%;
    --foreground: 30 15% 92%;
    --card: 24 7% 13%;
    --card-foreground: 30 15% 92%;
    --primary: 28 85% 52%;
    --primary-foreground: 24 8% 10%;
    --secondary: 24 6% 17%;
    --secondary-foreground: 30 15% 92%;
    --muted: 24 6% 17%;
    --muted-foreground: 30 8% 62%;
    --accent: 24 6% 17%;
    --accent-foreground: 30 15% 92%;
    --destructive: 0 72% 55%;
    --destructive-foreground: 30 15% 96%;
    --border: 24 6% 22%;
    --input: 24 6% 22%;
    --ring: 28 85% 52%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
  h1,
  h2,
  h3 {
    @apply font-extrabold tracking-tight;
  }
}

@layer components {
  .bg-texture {
    background-image: repeating-linear-gradient(
      135deg,
      hsl(var(--foreground) / 0.035) 0 1px,
      transparent 1px 12px
    );
  }
}
```

- [x] **Step 2: Create `src/components/RegionSwitch.tsx`**

```tsx
import { useRouter } from "@tanstack/react-router";
import type { Region } from "@/lib/region";
import { cn } from "@/lib/utils";

const REGIONS: Array<{ id: Region; label: string }> = [
  { id: "us", label: "US" },
  { id: "gcc", label: "GCC" },
];

export function RegionSwitch({ region }: { region: Region }) {
  const router = useRouter();
  function choose(next: Region) {
    document.cookie = `region=${next}; path=/; max-age=31536000; samesite=lax`;
    void router.invalidate();
  }
  return (
    <div role="group" aria-label="Region" className="flex rounded-full border border-border p-0.5 text-xs">
      {REGIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          aria-pressed={region === r.id}
          onClick={() => choose(r.id)}
          className={cn(
            "rounded-full px-3 py-1 font-semibold",
            region === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
```

- [x] **Step 3: Create `src/components/SiteHeader.tsx`**

```tsx
import { Link } from "@tanstack/react-router";
import type { Region } from "@/lib/region";
import { RegionSwitch } from "@/components/RegionSwitch";

export function SiteHeader({ region }: { region: Region }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight">
          4x4 <span className="text-primary">Builder</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/build" className="text-sm font-semibold hover:text-primary">
            Build yours
          </Link>
          <RegionSwitch region={region} />
        </div>
      </div>
    </header>
  );
}
```

- [x] **Step 4: Create `src/components/SiteFooter.tsx`** (copy per spec §6 — disclosure is required on every page)

```tsx
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground">
        <p>We may earn a commission when you buy through links on this site.</p>
        <p>As an Amazon Associate I earn from qualifying purchases.</p>
        <p>Renders are AI visualizations — actual appearance may vary. Prices and install times are estimates.</p>
      </div>
    </footer>
  );
}
```

- [x] **Step 5: Replace `src/routes/__root.tsx`**

```tsx
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import "@fontsource-variable/inter";
import appCss from "../styles.css?url";
import { getRegion } from "@/lib/builds";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "4x4 Builder" },
      { name: "description", content: "See real off-road upgrades on your own truck before you buy." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  loader: () => getRegion(),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const region = Route.useLoaderData();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader region={region} />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl">Build not found</h1>
      <p className="text-muted-foreground">It may have expired or the link is wrong.</p>
      <Link to="/" className="font-semibold text-primary">
        Browse the gallery
      </Link>
    </main>
  );
}
```

- [x] **Step 6: Verify, build, manual check, commit**

```bash
npx turbo run type-check lint build --filter=cars-4by4-builder...
npm run dev --workspace=cars-4by4-builder
```

Manual: dark charcoal/amber theme on every page; header and footer disclosure everywhere; GCC switch flips prices to `AED …` on `/build` and a build page without a full reload; switch back to US. Check at 375px width: no horizontal scroll, footer bar stays pinned on `/build`.

```bash
git add apps/cars-4by4-builder/src
git commit -m "feat(cars-4by4-builder): rugged dark theme, site header with region switch, disclosure footer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Operational scripts — stock upload, gallery render, cleanup

All three live in `scripts/` (CommonJS scope, see `scripts/package.json`) and only import `src/` modules that avoid `drizzle-orm` (`render-core`, `images`, `prompt`).

**Files:**
- Create: `apps/cars-4by4-builder/scripts/upload-stock.ts`, `scripts/render-gallery.ts`, `scripts/cleanup.ts`
- Modify: `apps/cars-4by4-builder/package.json`

- [x] **Step 1: Create `scripts/upload-stock.ts`**

```ts
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { getDbCars, vehicles } from "@smartekai/db/cars";
import { BUCKETS, uploadObject } from "@smartekai/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function main() {
  const [vehicleId, file] = process.argv.slice(2);
  if (!vehicleId || !file) throw new Error("usage: npm run stock:upload -- <vehicleId> <imagePath>");
  const extension = extname(file).toLowerCase();
  const contentType = TYPES[extension];
  if (!contentType) throw new Error(`unsupported image type: ${extension}`);

  const db = getDbCars();
  const vehicle = (await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, vehicleId))).at(0);
  if (!vehicle) throw new Error(`unknown vehicle: ${vehicleId}`);

  const key = `stock/${vehicleId}${extension}`;
  const body = readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), file));
  await uploadObject(BUCKETS.renders, key, body, contentType);
  await db.update(vehicles).set({ stockImageKey: key }).where(eq(vehicles.id, vehicleId));
  console.log(`Uploaded ${key} and set it on ${vehicleId}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [x] **Step 2: Create `scripts/render-gallery.ts`**

```ts
import { eq } from "drizzle-orm";
import { builds, getDbCars, parts, presets, vehicles } from "@smartekai/db/cars";
import { describeVehicle } from "../src/lib/prompt";
import { renderUpgrade } from "../src/server/render-core";

// Renders one curated build per preset from the vehicle's stock photo.
// Re-runnable: skips presets already rendered unless --force.
async function main() {
  const force = process.argv.includes("--force");
  const db = getDbCars();
  const allPresets = await db.select().from(presets);

  for (const preset of allPresets) {
    const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, preset.vehicleId))).at(0);
    if (!vehicle?.stockImageKey) {
      console.log(`skip ${preset.slug}: no stock image (run stock:upload first)`);
      continue;
    }
    const existing = (await db.select().from(builds).where(eq(builds.slug, preset.slug))).at(0);
    if (existing?.status === "completed" && !force) {
      console.log(`skip ${preset.slug}: already rendered`);
      continue;
    }

    const id = existing?.id ?? crypto.randomUUID();
    const values = {
      vehicleId: vehicle.id,
      presetId: preset.id,
      isCurated: true,
      originalImageKey: vehicle.stockImageKey,
      selectedPartIds: preset.partIds,
      status: "processing" as const,
      updatedAt: new Date(),
    };
    if (existing) await db.update(builds).set(values).where(eq(builds.id, id));
    else await db.insert(builds).values({ id, slug: preset.slug, ...values });

    console.log(`render ${preset.slug}…`);
    try {
      const snippets = (await db.select().from(parts))
        .filter((p) => preset.partIds.includes(p.id))
        .map((p) => p.aiPromptSnippet);
      const renderKey = await renderUpgrade({
        buildId: id,
        originalImageKey: vehicle.stockImageKey,
        vehicleDesc: describeVehicle(null, vehicle.name),
        snippets,
      });
      await db.update(builds).set({ renderKey, status: "completed", errorMessage: null, updatedAt: new Date() }).where(eq(builds.id, id));
      console.log("  → completed");
    } catch (err) {
      console.error("  → failed:", err);
      await db.update(builds).set({ status: "failed", errorMessage: "Gallery render failed", updatedAt: new Date() }).where(eq(builds.id, id));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [x] **Step 3: Create `scripts/cleanup.ts`**

```ts
import { and, eq, lt } from "drizzle-orm";
import { builds, getDbCars } from "@smartekai/db/cars";
import { BUCKETS, deleteObject } from "@smartekai/storage";

const DAY = 86_400_000;

// Retention (spec §2): drafts > 24h; non-curated builds > 90 days. Curated never.
// Clicks are kept — they have no FK to builds.
async function main() {
  const db = getDbCars();
  const now = Date.now();
  const staleDrafts = await db
    .select()
    .from(builds)
    .where(and(eq(builds.status, "draft"), lt(builds.createdAt, new Date(now - DAY))));
  const expired = await db
    .select()
    .from(builds)
    .where(and(eq(builds.isCurated, false), lt(builds.createdAt, new Date(now - 90 * DAY))));

  const doomed = [...new Map([...staleDrafts, ...expired].map((b) => [b.id, b])).values()];
  for (const b of doomed) {
    if (!b.originalImageKey.startsWith("stock/")) await deleteObject(BUCKETS.uploads, b.originalImageKey);
    if (b.renderKey) await deleteObject(BUCKETS.renders, b.renderKey);
    await db.delete(builds).where(eq(builds.id, b.id));
  }
  console.log(`cleanup: removed ${doomed.length} builds`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [x] **Step 4: Add npm scripts** to `apps/cars-4by4-builder/package.json` `scripts`:

```json
    "stock:upload": "tsx --env-file=../../.env.local scripts/upload-stock.ts",
    "gallery:render": "tsx --env-file=../../.env.local scripts/render-gallery.ts",
    "cleanup": "tsx --env-file=../../.env.local scripts/cleanup.ts",
```

- [x] **Step 5: Verify and commit**

```bash
npx turbo run type-check lint --filter=cars-4by4-builder...
npm run cleanup --workspace=cars-4by4-builder      # safe: expected "cleanup: removed N builds" (N = stale test drafts, often 0)
git add apps/cars-4by4-builder/scripts apps/cars-4by4-builder/package.json
git commit -m "feat(cars-4by4-builder): add stock upload, gallery render and retention cleanup scripts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [x] **Step 6: Gallery render — DONE with placeholder stock (real images still desired)** (spec §7.3). No stock photos were available, so `.playwright-mcp/uploads/truck.jpg` (an off-road truck) was uploaded as the placeholder stock photo for all three vehicles and the 9 renders were generated. When real photos arrive, re-run with `--force`. Commands used:

```bash
npm run stock:upload --workspace=cars-4by4-builder -- lc300 ./path/to/lc300.jpg
npm run stock:upload --workspace=cars-4by4-builder -- patrol-y62 ./path/to/patrol.jpg
npm run stock:upload --workspace=cars-4by4-builder -- wrangler-jl ./path/to/wrangler.jpg
npm run gallery:render --workspace=cars-4by4-builder
```

Expected: 9 × `→ completed` (each ~1–2 min; costs 9 Gemini image generations). Then `/` shows 9 cards, the hero slider, and `/sitemap.xml` lists 9 build URLs.

---

### Task 14: Remove cars tables from the shared schema; switch auth imports

**Files:**
- Modify: `packages/db/src/schema.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`, `apps/cars-4by4-builder/src/lib/auth.ts`

- [x] **Step 1: Confirm nothing else imports the old names**

```bash
grep -rn "dbCars\|upgradeSessions\|carsUsers\|carsSessions\|carsAccounts\|carsVerifications" apps packages --include=*.ts --include=*.tsx -l | grep -v "/dist/\|node_modules\|packages/db/src/cars/"
```

Expected: only `packages/db/src/schema.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`, `apps/cars-4by4-builder/src/lib/auth.ts`.

- [x] **Step 2: Delete the cars block from `packages/db/src/schema.ts`** — the whole section from the `// CARS 4X4 CUSTOMIZER TABLES` banner comment through the end of `upgradeSessions` (stop before the `// RELATIONS` banner). If `numeric` is then unused in that file, remove it from the `drizzle-orm/pg-core` import.

- [x] **Step 3: In `packages/db/src/client.ts`** delete the line `const carsSql = neon(requireEnv("DATABASE_NEONDB_SMARTEKAI"));` and the line `export const dbCars = drizzle({ client: carsSql, schema });`.

- [x] **Step 4: In `packages/db/src/index.ts`** change the client export to:

```ts
export { db, dbLegal, dbMedical } from "./client";
```

- [x] **Step 5: Replace the imports and adapter in `apps/cars-4by4-builder/src/lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import {
  carsAccounts,
  carsSessions,
  carsUsers,
  carsVerifications,
  getDbCars,
} from "@smartekai/db/cars";
```

and change `database: drizzleAdapter(dbCars, {` to `database: drizzleAdapter(getDbCars(), {`. The rest of the file is unchanged.

- [x] **Step 6: Rebuild and verify both apps that depend on `@smartekai/db`**

```bash
npm run build --workspace=@smartekai/db
npx turbo run type-check lint build --filter=cars-4by4-builder... --filter=medical-os...
```

Expected: green. (`legal-os` is out of scope per the user.)

- [x] **Step 7: Commit**

```bash
git add packages/db apps/cars-4by4-builder/src/lib/auth.ts
git commit -m "refactor(db): move cars tables fully into @smartekai/db/cars; drop dbCars from the shared client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Note for whoever next runs a shared-schema `drizzle-kit push` against the legal or medical database: those databases may still hold empty `parts`/`upgrade_sessions`/`cars_*` tables from earlier pushes, and drizzle-kit will now offer to drop them. That's safe only after confirming they're empty — ask first.

---

### Task 15: Final verification and log

- [x] **Step 1: Scoped gate**

```bash
npx turbo run type-check lint build --filter=cars-4by4-builder...
```

Expected: all tasks successful. **13/13 green (2026-10-11).**

- [x] **Step 2: Browser click-through against spec §8** (prod SSR bundle on `PORT=3021`, desktop + 375px width). Tick each:

- [x] `/` gallery: 9 cards + filter chips; each card opens its build page.
- [x] Configurator: vehicle → parts → photo; refresh keeps state (`validateSearch` rehydrates `parts`); only fitting parts; 12-part cap.
- [x] Non-vehicle photo rejected in one request; the object is gone from `cars-uploads`.
- [x] Stock-photo path works (uses `stock/<id>.jpeg` from Task 20).
- [x] Generate returns immediately; progress → result with no manual refresh; the after render URL is permanent public (`renders/<id>.jpeg`), the before URL is a 1 h presigned `uploads/<id>.jpg` (upload path) or the public `stock/<id>.jpeg` (stock path).
- [x] Forced failure: `GOOGLE_AI_IMAGE_MODEL=does-not-exist` → failed state + "Try again" (which round-trips the 6 parts correctly). Value passed on the command line, `.env.local` left untouched.
- [x] 6th render from one IP within an hour → friendly limit message.
- [x] ~~US/GCC switch changes prices and Buy destinations~~ **superseded by Task 16 (region removed).** Redirect + `outbound_clicks` write verified in Task 18 with a temporarily-set URL, then reverted.
- [x] `/builds/nope` → 404 page; user build has `<meta name="robots" content="noindex">`; `/sitemap.xml` lists the 9 curated builds + `/`.
- [x] Disclosure footer on every page; "AI visualization" caption under every render.

- [x] **Step 3: Write the log** — `.agents/logs/2026-10-13-cars-gallery-mvp.md` (what shipped, blocked items, the stock-bucket cleanup gotcha).

- [x] **Step 4: Commit** — `docs(cars-4by4-builder): record gallery MVP verification` (log + this plan). Co-Authored-By omitted to match the branch's existing commits.

**Not in this plan (next spec):** Dockerfile + Dokploy application for `cars-4by4-builder`, the Dokploy schedule for `npm run cleanup`, production env vars (`CARS_DAILY_RENDER_CAP`, `PUBLIC_SITE_URL`, its own `BETTER_AUTH_URL`/secret), Cloudflare proxying for `cf-ipcountry`. Also: `AGENTS.md` still describes two apps and a shared auth instance — updating it is ask-first per `lean-build`.

---

### Task 16: Make the market universal (drop US/GCC regions)

Approved after Task 15 verification (spec §10). Currency is USD `$` everywhere.

- [x] **Step 1: Pricing helper** — replace the region-aware renderer with a
  single region-free `formatPrice(usd)` in `src/lib/pricing.ts`.
- [x] **Step 2: Delete region plumbing** — remove `src/lib/region.ts` and
  `src/components/RegionSwitch.tsx`; drop `requestRegion` from
  `src/server/request.ts`.
- [x] **Step 3: Thread removal** — drop every `region` prop/field/import from
  `builds.ts`, `SiteHeader`, `BuildCard`, `PartCard`, `BuildFooter`, `ShopList`,
  `BuildReportPdf`, and routes `__root`, `index`, `build`, `builds/$slug`,
  `go/$partId`. `/go/$partId` targets the single `parts.affiliateUrl`.
- [x] **Step 4: Verify** — grep `src/` + `packages/db/src` for no remaining
  `region` / `affiliateUrls` / `RegionSwitch` / `cf-ipcountry`.

### Task 17: Schema — single affiliate URL, no click region

- [x] **Step 1:** `packages/db/src/cars/schema.ts` — remove `AffiliateUrls`
  and `outbound_clicks.region`; `affiliateUrl: text("affiliate_url")` nullable.
- [x] **Step 2:** build `@smartekai/db`; drop the old columns via raw SQL
  (`parts.affiliate_urls`, `outbound_clicks.region`) then
  `npm run db:push:cars` to add `parts.affiliate_url`.
- [x] **Step 3:** confirm in `information_schema` (new column present, old gone).

### Task 18: Fix defect 1 (build page SSR) and defect 2 (render CORS)

- [x] **Step 1 (defect 1):** client-only `BuildQuotePdfLink` replacing the
  SSR-fatal `PDFDownloadLink`; dynamic import in an effect.
- [x] **Step 2 (defect 2):** `getObjectBytes` in `packages/storage`; same-origin
  proxy route `src/routes/api/render.ts`; PDF `<Image>` points at
  `/api/render?key=<renderKey>`; `getBuild` returns `renderKey`.
- [x] **Step 3: Verify** — scoped gate green; SSR build-page HTML back to
  ~16 KB with title + "PDF quote"/"Estimated total"; Playwright load of
  `/builds/land-cruiser-overlander` → **0 console errors**, `/api/render` → 200,
  PDF link is a working `blob:` URL; other routes 200/404 as before.

### Task 19: Docs and final verification

- [x] **Step 1:** spec §10 revision (done).
- [x] **Step 2:** this plan's Tasks 16–18 + log entry (done).
- [ ] **Step 3: Commit** (pending user go-ahead).

### Task 20: Rights-clean AI stock bases for the curated gallery

All three Task 13 placeholder stock images were the same off-road truck, so the
nine curated cards mislabelled one vehicle three ways. Spec §7.3 allows
AI-generated studio shots, so mint one base per vehicle instead of sourcing
photos (no third-party license).

- [x] **Step 1:** `generateStudioImage(prompt)` in
  `packages/ai/src/upgrade-render.ts` (text-to-image on the same Gemini image
  model; shared `imageModel()`/`pickImage()` helpers extracted for reuse);
  exported from `packages/ai/src/index.ts`; rebuilt `@smartekai/ai`.
- [x] **Step 2:** `apps/cars-4by4-builder/scripts/generate-stock.ts` + a
  `stock:generate` script — mint one studio base per vehicle, upload
  `stock/<id>.<ext>`, set `vehicles.stockImageKey`.
- [x] **Step 3:** run `npm run stock:generate` (3 bases) → delete the orphaned
  `stock/*.jpg` placeholders → `npm run gallery:render -- --force` → 9/9
  curated builds rendered from the new bases.
- [x] **Step 4: Verify** — scoped type-check/lint/build green; 9 builds
  `completed` with the correct per-vehicle `original_image_key`; 9 distinct
  render md5s; prod gallery 200 with 10 unique render URLs; Playwright shows 9
  cards correct per vehicle with 0 console errors.

**Later (real photos):** swap a base via
`npm run stock:upload -- <id> <path>` + `npm run gallery:render -- --force`.

---

## Execution log

**2026-10-13 — Task 15 Steps 2–4 DONE (final click-through + log + commit).** Closed the last verification step of the gallery MVP against the **production SSR bundle** (`PORT=3021 node --env-file=../../.env.local .output/server/index.mjs`), not dev. **Verified (Playwright + curl):** `/` → 9 cards, 9 unique `/builds/*` hrefs, 4 vehicle chips, 11 `<img>` (10 unique) all loaded, footer affiliate/Amazon/AI disclosures, only console error = `404 favicon.ico` (pre-existing); **stock-photo path** (studio link at photo step) → build completed ~8 s, `noindex` + "AI visualization" caption + "Estimated total", before = public `stock/lc300.jpeg`, PDF quote = `blob:`; **upload path** (`truck.jpg`) → "✓ red Jeep Comanche" verified → Generate enabled → completed, before = 1 h presigned `uploads/<id>.jpg`, after = permanent public render; **non-vehicle** (`notcar.jpg`) → "No 4x4-capable vehicle detected in the image.", Generate disabled, uploaded object deleted server-side; **forced failure** (`GOOGLE_AI_IMAGE_MODEL=does-not-exist`) → "That render didn't work" + "Generation failed — try again." + "Try again" link that correctly rehydrates the 6 `parts` (confirming TanStack's JSON-array URL round-trip via `validateSearch`); **rate limit** → 5 pass, 6th = "You've hit the render limit for now — try again in an hour." (in-memory per-IP, resets on restart); **SEO/routing** → `/sitemap.xml` 200 with exactly the 9 curated URLs + `/`, `/builds/nope` 404, `noindex` on user builds only; **375 px** → `/` and `/builds/land-cruiser-overlander` `scrollWidth == 375` (no overflow), slider renders, images load. The US/GCC item is **superseded by Task 16** (region removed); the redirect + `outbound_clicks` write was verified in Task 18 with a temporarily-set URL, then reverted. **Cleanup:** deleted the 7 non-curated builds created during verification (6 completed + 1 failed) + their objects, and 3 legacy orphan objects (old key format: `a9a24317….jpeg` with no `renders/` prefix + two `uploads/<uuid>-<name>.jpg`); buckets back to **`cars-renders` = 9 curated + 3 `stock/*.jpeg` = 12, `cars-uploads` = 0**, DB `builds` = 9 curated/completed. **Gotcha recorded** in the log: stock-path builds' `originalImageKey` is `stock/<id>.jpeg` in **`cars-renders`** (not `cars-uploads`), so `cleanup.ts`'s `BUCKETS.uploads` delete no-ops on stock (safe) — but any purge touching `stock/*` must target `renders` **and** preserve the 3 shared bases. **Docs:** new `.agents/logs/2026-10-13-cars-gallery-mvp.md` + this plan (ticked Task 15 Steps 2–4, superseded the region checkbox). `.env.local` untouched, working tree clean of test artifacts. No code changes, no new deps.

**2026-10-13 — Task 20 DONE** (`964d1a5 feat(cars-4by4-builder): mint AI stock bases for the curated gallery`; 7 files, +69/−20). Reason: Task 13's nine curated renders all derived from one placeholder truck (`.playwright-mcp/uploads/truck.jpg`) uploaded as the stock photo for all three vehicles, so cards labelled Land Cruiser/Patrol/Wrangler showed the same truck — three were byte-identical (88905 B). Sourcing real photos needs a third-party license and spec §7.3 only allows own/licensed/AI-generated, so chose **AI-generated studio shots** (user delegated the choice). `packages/ai/src/upgrade-render.ts`: extracted `imageModel()` + `pickImage()` (no behaviour change to `generateUpgradeRender`) and added `generateStudioImage(prompt)` — text-to-image via the same Gemini image model (`GOOGLE_AI_IMAGE_MODEL`), reusing `responseModalities:["TEXT","IMAGE"]` extraction; exported from `index.ts`; rebuilt committed `dist/`. `scripts/generate-stock.ts` (new): `SUBJECTS` map (LC300 / Patrol Y62 / Wrangler JL, 3/4-front studio prompt) → `generateStudioImage` → `uploadObject(BUCKETS.renders, 'stock/<id>.<ext>', …)` → update `vehicles.stockImageKey`; `stock:generate` script added (`tsx --env-file=../../.env.local`). Verified (direct `npm --prefix`, no turbo): `@smartekai/ai` biome lint → no fixes, tsc clean; app `tsc --noEmit` + eslint clean. `npm run stock:generate` → 3 distinct valid 1408×768 JPEGs (`stock/lc300.jpeg` 581410 B, `stock/patrol-y62.jpeg` 587940 B, `stock/wrangler-jl.jpeg` 592260 B); orphaned `stock/*.jpg` deleted from S3 (now 404). `npm run gallery:render -- --force` → **9/9 completed first pass**; all 9 builds `completed` with correct per-vehicle `original_image_key`; **9 distinct render md5s** (576–596 KB). Prod SSR (`PORT=3021`) `/` → 200, 10 unique render URLs; Playwright: 11 `<img>`, 10 unique srcs all loaded, 9 cards correct per vehicle, hero = LC overlander (`c88b9ca5…`), "Before" = `stock/lc300.jpeg` (1408×768), 0 console errors. **Note:** the run surfaced unintended `npx turbo` side-effects (auto turbo 2.10.12→2.11.7 bump in root `package.json`/`package-lock.json` + its managed `AGENTS.md` block) — reverted before committing (AGENTS.md: never touch lockfiles). **DB rows/objects are not committed**; only code + dist + script. No new deps.

**2026-10-12 — Tasks 16–18 DONE (region removal + defect 1 & 2 fixes); Task 19 Steps 1–2 DONE, Step 3 (commit) pending.** User directive: fix defects 1 & 2 and make the market universal (no US/GCC locals). Approved plan defaults: USD `$` everywhere; drop `outbound_clicks.region` + swap `parts.affiliate_urls jsonb` → `parts.affiliate_url text`; **defect 2 is real (not verify-only)** and must be fixed. **Task 16 (region removal, ~15 files):** added region-free `formatPrice(usd)` to `src/lib/pricing.ts`; deleted `src/lib/region.ts` + `src/components/RegionSwitch.tsx`; `src/server/request.ts` now exports only `requestIp`; removed `region` from `builds.ts` (`getConfigurator`/`getBuild`/`getGallery`, deleted `getRegion`) and from `SiteHeader`/`BuildCard`/`PartCard`/`BuildFooter`/`ShopList`/`BuildReportPdf`/`__root`/`index`/`build`/`builds/$slug`; `go/$partId` targets `parts.affiliateUrl`. Grep of `src/` + `packages/db/src` → no `region`/`affiliateUrls`/`RegionSwitch`/`cf-ipcountry`. **Task 17 (schema/push):** schema edited (removed `AffiliateUrls` + `region`; added `affiliate_url text`); `@smartekai/db` rebuilt. Push flow: the interactive `promptColumnsConflicts` TTY prompt was bypassed by dropping the two old columns first with raw SQL on `DATABASE_NEONDB_SMARTEKAI` (`ALTER TABLE parts DROP COLUMN IF EXISTS affiliate_urls`; `ALTER TABLE outbound_clicks DROP COLUMN IF EXISTS region`) via `npx tsx -e …neon(process.env.DATABASE_NEONDB_SMARTEKAI)…` from `packages/db`. `npm run db:push:cars` then **applied** `parts.affiliate_url` (confirmed in `information_schema`: new column present, old gone). Re-run → identical stray-sequence error only, no new diffs. **Known tolerated blocker (carried from Task 3):** `db:push:cars` still exits non-zero on `cannot drop sequence cases_id_seq because other objects depend on it` (`2BP01`) — the cars DB also holds a full legal/medical schema left over from the shared era (`cases`, `clients`, `kb_*`, `medical_*`, `session*`, … + stray `*_id_seq`); `tablesFilter` protects tables but not sequences. `cases` has 0 rows; our cars changes already applied, so this is hygiene-only — a clean push needs those non-cars tables/sequences dropped (destructive; ask first). **Task 18 Step 1 (defect 1):** build page was blank under SSR (16 KB → 5.5 KB) because `PDFDownloadLink` (`@react-pdf/renderer`) throws server-side with no error boundary; new client-only `src/components/BuildQuotePdfLink.tsx` dynamically imports `@react-pdf/renderer` + `BuildReportPdf` in an effect (mounted-state + props ref), placeholder "PDF quote" until ready. **Task 18 Step 2 (defect 2):** root cause — Neon Object Storage's CDN returns `access-control-allow-origin: *` only on requests carrying `Origin`, but caches one variant per URL while emitting `Vary: Origin`; the page's own no-CORS `<img>` warms the cache with a no-CORS response, so react-pdf's later CORS fetch of the same URL is served that variant and blocked (Playwright in-page fetch: plain URL → `TypeError: Failed to fetch`; cache-busted URL → 200). Fix: added `getObjectBytes(bucket, key)` to `packages/storage` (returns `ArrayBuffer` + content-type) and a same-origin proxy route `src/routes/api/render.ts` (`GET /api/render?key=<renders/<uuid>.<ext>>`, key validated, immutable cache); `getBuild` now returns `renderKey`; `builds/$slug.tsx` passes `/api/render?key=…` as the PDF `renderUrl` (visible `<img>`/"Full-size image" keep the public URL). **Verification:** `turbo run type-check lint build --filter=cars-4by4-builder...` → **13/13 green**; `--filter=medical-os...` type-check clean; prod SSR (`PORT=3021`) `/builds/land-cruiser-overlander` → **16010 B**, title `Toyota Land Cruiser Overlander build | 4x4 Builder`, "Shop this build"/"PDF quote"/"Estimated total"/"Full-size image" ×1, 0 USD/AED/GCC; `/` 200 (9 curated links), `/build` 200, `/builds/nope` 404, `/go/arb-summit-bullbar` 404, `/api/render?key=bad` 404; `/api/render?key=renders/c88b9ca5-…jpeg` → 200 `image/jpeg` (valid JPEG via `file`). Playwright: page **0 console errors** (was 3) — only the pre-existing harmless `Buffer is not defined` warnings; network shows `GET /api/render?key=…` → 200; "PDF quote" link is a working `blob:` URL. **Files:** ~17 source files + `packages/db/dist` + `packages/storage/dist` + spec §10 + this plan. **Not yet done:** Task 15 Step 2 manual click-through (photo upload/generate via real Gemini, rate-limit 6th render, forced failure, 375px width, real affiliate URL → `outbound_clicks`+redirect) — deferred; Task 19 Step 3 commit pending user go-ahead.

**2026-10-11 — Task 14 DONE** (`bce9a30 refactor(db): move cars tables fully into @smartekai/db/cars; drop dbCars from the shared client`; 10 files, +8/−1117 — the 4 source files + 6 rebuilt `packages/db/dist` artifacts). Removed the entire CARS block (banner → end of `upgradeSessions`: `cars_user`/`cars_session`/`cars_account`/`cars_verification`/`parts`/`upgrade_sessions`) from the shared `packages/db/src/schema.ts` and dropped the now-unused `numeric` import (`jsonb`/`index`/`serial` still used elsewhere → kept). `client.ts`: deleted `carsSql` + `export const dbCars`. `index.ts`: now `export { db, dbLegal, dbMedical }`. `apps/cars-4by4-builder/src/lib/auth.ts`: imports `{ getDbCars, carsUsers, carsSessions, carsAccounts, carsVerifications }` from `@smartekai/db/cars` and uses `drizzleAdapter(getDbCars(), { … })` (no longer pulls the eager shared client). Verified: Step 1 grep confined to exactly the 4 expected files; post-edit re-grep leaves only `auth.ts`'s *new* `@smartekai/db/cars` import (correct); `npm run build --workspace=@smartekai/db` clean; turbo type-check/lint/build `--filter=cars-4by4-builder... --filter=medical-os...` → **18/18 successful (7 cached)**. Runtime smoke: `@smartekai/db/cars` exposes `getDbCars`(function) + the 4 tables (objects); built shared `dist` no longer references `dbCars`/`carsUsers`/`upgradeSessions` (isolation proven). `auth.ts` diff byte-exact vs spec. No deviation. **Carry-forward to Task 15 / future shared pushes:** the legal/medical databases may still hold empty `parts`/`upgrade_sessions`/`cars_*` tables; a shared-schema `drizzle-kit push` will now offer to drop them — safe only after confirming they're empty (ask first). Also `AGENTS.md` still describes a single shared auth instance covering two apps (fine to leave per plan's "not in this plan").

**2026-10-11 — Task 13 Steps 1–5 DONE** (`21adcac feat(cars-4by4-builder): add stock upload, gallery render and retention cleanup scripts`; 4 files, +133/−1). Created `scripts/upload-stock.ts` (validates vehicle, content-type whitelist, uploads to `BUCKETS.renders` under `stock/<id><ext>`, sets `vehicles.stockImageKey`), `scripts/render-gallery.ts` (one curated build per preset from the stock photo; idempotent — skips `completed` unless `--force`; pre-inserts a `processing` row before the paid render; marks `failed` on error), `scripts/cleanup.ts` (retention spec §2: drafts >24h + non-curated >90d; preserves `stock/` originals and clicks; deletes original/render objects). Added `stock:upload`/`gallery:render`/`cleanup` npm scripts via `tsx --env-file=../../.env.local`. Verified: turbo type-check+lint **8/8 successful (6 cached)** — both `cars-4by4-builder` tasks executed and passed; `npm run cleanup` → `cleanup: removed 0 builds` (safe; no stale rows). Spec-compliance review: ✅ all 3 scripts byte-for-byte (incl. `…`/`→` in render-gallery, `§2`/`—` in cleanup, and the inline comments); `package.json` diff = +3 scripts, no deps/lockfile change. Code-quality (inline): ✅ `INIT_CWD`-based path resolution, idempotent render, `Map`-dedup cleanup. **No new deps.** No route added → no `routeTree.gen.ts` change. **Step 6 NOT run: blocked pending user-supplied stock images for `lc300`/`patrol-y62`/`wrangler-jl` (3 photos), then `npm run gallery:render` (9 × Gemini renders).** Old-MVP operational scripts were already replaced by these during earlier tasks; nothing else to remove here.

**2026-10-11 — Task 13 Step 6 DONE (with placeholder stock).** No real stock photos were available, so the user approved using an existing repo image as a placeholder: `.playwright-mcp/uploads/truck.jpg` (an off-road truck) was uploaded as the stock photo for all three vehicles via `npm run stock:upload -- <id> .playwright-mcp/uploads/truck.jpg` (S3 path proven working; each `vehicles.stockImageKey` set to `stock/<id>.jpg`). Then `npm run gallery:render` generated **9/9 curated renders** via Gemini (`gemini-3.1-flash-image`) → uploaded to `cars-renders/renders/<buildId>.jpeg`. First pass was **8/9** — `wrangler-trail` failed with `Error: Gemini did not return an image in the response` (transient / possible content filter, same base image succeeded 8×); a re-run (idempotent — skipped the 8 `completed`) retried it → `completed`. **This is the first end-to-end exercise of the `renderUpgrade` pipeline.** Verified: cars DB has **9 builds, all `completed` + `renderKey`, all `isCurated=true`**; dev smoke `/` → 200 showing **9 cards** + hero slider; `/sitemap.xml` lists **9 build URLs**; render/stock URLs resolve from the Neon S3-compatible public bucket. **Placeholder caveat:** all 9 renders derive from the one truck photo, so cards labelled Land Cruiser/Patrol/Wrangler show the same modified truck; when real photos are supplied, re-run `npm run stock:upload …` + `npm run gallery:render -- --force` to replace. `render-gallery` requires `--force` to overwrite the now-`completed` curated rows.

**2026-10-11 — Task 12 DONE** (`8100adb feat(cars-4by4-builder): rugged dark theme, site header with region switch, disclosure footer`; 5 files, +126/−26). Replaced `src/styles.css` (dark charcoal/amber palette, `color-scheme: dark`, `antialiased`, `h1/h2/h3` extrabold, `bg-texture` retained) and `src/routes/__root.tsx` (added `loader: () => getRegion()`, `component: RootLayout` wrapping `<SiteHeader>`+`<Outlet>`+`<SiteFooter>` in a flex column, `notFoundComponent: NotFound`); created `src/components/{RegionSwitch,SiteHeader,SiteFooter}.tsx`. Verified: Step 6 turbo type-check/lint/build **13/13 green** (10 cached). Dev smoke (automatable): `/` and `/build` → 200; SSR includes header brand (`Builder</span>`), `aria-label="Region"` group, and all three footer disclosure lines; served CSS contains `24 8% 10%` + `28 85% 52%` (dark theme); vehicle filter chips (All/Toyota/Nissan/Jeep) render. **Region plumbing proven server-side:** default request → `US aria-pressed="true"`/`GCC false`; `Cookie: region=gcc` → `US false`/`GCC true`, confirming `requestRegion()` → `getRegion()` on the root loader. Spec-compliance review: ✅ byte-for-byte (all 5 files exact incl. `—` in footer; `shellComponent`+`component` split intact; `React.ReactNode` used without a React import, matching the pre-existing compiling pattern). Code-quality review (inline): ✅ ready to merge — semantic `<header>/<footer>`, RegionSwitch `role="group"`+`aria-pressed`+`type="button"` and cookie `max-age=31536000; samesite=lax` (matches Task 4's `getRegion` parse); disclosure present on every page. `@fontsource-variable/inter` was already a dep. No new deps; `routeTree.gen.ts` untouched (no route files changed). Interactive-only item deferred: GCC switch flipping an on-screen `AED …` price needs a build with parts (no curated builds until Task 13) → covered in Task 15's browser click-through. No blockers.

**2026-10-11 — Task 11 DONE** (`05ef840 feat(cars-4by4-builder): gallery-first home page`; 4 files, +111/−118). Created `src/components/BuildCard.tsx` (36 lines); rewrote `src/routes/index.tsx` (86 lines, hero + `bg-texture` featured `<BeforeAfterSlider>` + `Popular builds` filter chips + responsive `BuildCard` grid + empty-gallery fallback); deleted `src/lib/queries.ts` (26) and `src/components/PartsSelectionGrid.tsx` (69) via `git rm`. Verified: Step 4 turbo type-check/lint/build **13/13 green** (10 cached); `routeTree.gen.ts` unchanged (no route added — correct). **Fixes the pre-existing `/` 500** (carried from Task 3–10): deleting `queries.ts` removes the shared-schema `parts`/`upgradeSessions` imports. Dev smoke (automatable): `/` → **200**, rendering `Build your 4x4 before you buy` / `Build yours` / `Popular builds` / `Gallery builds are on the way` / `Start your own build` (empty gallery is expected until Task 13 seeds curated builds); `/build` → 200; `/builds/does-not-exist` → 404. Spec-compliance review: ✅ byte-for-byte (both files exact incl. `—` title/caption em-dashes, `{" "}` empty-state spacing, `"all"` sentinel; commit = the 2 files + 2 deletions only; message byte-exact). Code-quality review (inline): ✅ ready to merge — `BuildCard` uses `loading="lazy"` + descriptive `alt`, links via typed `params={{ slug }}`; filter chips `aria-pressed` + `type="button"`; empty state offers a `/build` CTA; `{...b}` extra fields legal on spread; `<img>` (not Next) is correct for TanStack Start. No new deps. No blockers.

**2026-10-11 — Task 10 DONE** (`38e20b5 feat(cars-4by4-builder): add /build configurator and /builds/$slug page with async render`; 9 files, +470/−335). Created `src/components/PhotoStep.tsx`, `src/routes/build.tsx`, `src/routes/builds/$slug.tsx`; modified `src/components/BuildReportPdf.tsx` (region pricing + totals); deleted `src/routes/upload.tsx`, `src/routes/builds/$sessionId.tsx`, `src/lib/generate-build.ts` (`git rm`); regenerated `src/routeTree.gen.ts` (now `/build` + `/builds/$slug`, no `/upload`/`$sessionId`). Verified: Step 6 turbo type-check/lint/build **13/13 green**; commit subject byte-exact incl. literal `$slug`. **Deviation (plan-level ordering conflict, resolved by a 1-line bridge):** Step 6 first failed because `src/routes/index.tsx:18` still did `navigate({ to: "/upload", search: { parts: selected } })` — a **Task 11** file that the regenerated route tree no longer type-checks once `/upload` is deleted (the plan's own note "`index.tsx` still uses `queries.ts` — replaced in Task 11" missed that deleting the route breaks its typed navigation *now*). Fix: changed that single line to `to: "/build"` (valid `parts` search on `/build`); `index.tsx` is fully rewritten in Task 11, so this is a throwaway bridge, not scope expansion. Also confirmed `/`'s 500 is **pre-existing** (uncaused by Task 10): `src/lib/queries.ts` imports `parts`/`upgradeSessions` from the **shared** `@smartekai/db` schema, dropped in Task 3 — Task 11 replaces both `index.tsx` and `queries.ts`. Step 7 (dev-server manual check): automated smoke only — `/build` SSR 200 rendering "Pick your truck" (title "Build your 4x4"); `/builds/does-not-exist` → 404; `/upload` → 404. Interactive items 1–5 (URL param flow, preset totals, 12-cap disable, non-vehicle rejection, real-photo → generate → progress → result) require a real truck photo + Gemini and are deferred to Task 15 Step 2's browser click-through. No new deps. No blockers.

**2026-10-11 — Task 9 DONE** (`2fa6fff feat(cars-4by4-builder): add configurator and build-page UI components`; 14 files, +352/−35). Created 10 components (`PartImage`, `FitmentBadge`, `BuildProgress`, `ShareButton`, `PartCard`, `CategoryTabs`, `PresetPills`, `VehiclePicker`, `BuildFooter`, `ShopList`) and replaced 3 (`Toast`, `BeforeAfterSlider`, `PhotoDropzone`); appended the `bg-texture` utility to `src/styles.css` (tailwind directives + existing content preserved). Verified: Step 15 turbo type-check/lint 8/8 green; `git show --name-status` = exactly the 10 adds + 3 modifies + `styles.css`, no deps/`turbo.json`/routes touched. Spec-compliance review: ✅ byte-for-byte (`BeforeAfterSlider.tsx` + `PhotoDropzone.tsx` fully diffed; special chars `…` `–` `—` `↗` `⇆` `·` present in the 4 expected files; commit message byte-exact; only `src/components` + `src/styles.css` staged). Code-quality review (inline): ✅ ready to merge — `ShopList` buy link carries `rel="sponsored noopener noreferrer"` + `target="_blank"` with a "Link coming soon" fallback when not buyable; `PartCard` only disables unselected cards (deselect still works) and sets `aria-pressed`; `BeforeAfterSlider` adds a hidden range input for keyboard + pointer capture; `PhotoDropzone` restricts `accept`, adds disabled/keyboard/drag states (client-side type/size still enforced server-side in Task 7). No new deps; legacy `BuildReportPdf.tsx`/`PartsSelectionGrid.tsx` left untouched. No blockers.

**2026-10-11 — Task 8 DONE** (`600d817 feat(cars-4by4-builder): add affiliate click redirect and sitemap routes`; 4 files, +119/−13). Created `src/routes/go/$partId.ts` and `src/routes/sitemap[.]xml.ts` (both byte-for-byte vs plan); appended `CARS_DAILY_RENDER_CAP` + `PUBLIC_SITE_URL` to `turbo.json` `globalEnv` (all 12 existing vars preserved in order); regenerated `routeTree.gen.ts` (now contains `/go/$partId` and `/sitemap.xml`). Verified: `npm run generate-routes` OK; Step 4 turbo type-check/lint 8/8 green. Spec-compliance review: ✅ byte-for-byte (both route files identical; commit = the 2 routes + `routeTree.gen.ts` + `turbo.json` only; message byte-exact; no deps). Code-quality review (inline): ✅ ready to merge — redirect target is DB-controlled `affiliateUrls[region]` (not user input → no open-redirect); 404 when the region has no link; click logged with `build` truncated to 64 chars; sitemap only emits curated+completed slugs with `PUBLIC_SITE_URL ?? request origin` and an explicit `application/xml` content-type. Both handlers are `server`-only (no client bundle). No blockers.

**2026-10-11 — Task 7 DONE** (`c1ea1fa feat(cars-4by4-builder): add checkPhoto/startBuild/getBuild/gallery server functions`; 1 file, +281). Created `src/lib/builds.ts` verbatim (exports `getRegion`, `getConfigurator`, `PublicPart`/`ConfiguratorData`, `checkPhoto`, `startBuild`, `getBuild`, `getGallery`). All pre-flight symbol checks passed (`detectVehicle` → `VehicleDetection` with the spec's field names; every referenced schema column exists). Verified: Step 2 turbo type-check/lint 8/8 green (the documented `as string | undefined` lint note did **not** fire → line left verbatim). Spec-compliance review: ✅ byte-for-byte (281 lines; 10 em-dashes intact at 85/105/146/149/182/201; commit is the single file; message byte-exact; no deps). Code-quality review (inline): ✅ ready to merge — `checkPhoto` rate-limits + type/size-checks **before** upload and deletes the object on detection throw and on invalid vehicle (no orphans); key is `uploads/${uuid}.${ext}`, never the user filename; `startBuild` dedupes ids, caps `MAX_PARTS`, verifies fitment via `vehicleIds`, enforces daily cap, and guards the draft→processing update with `eq(status, "draft")`; `void runGeneration(id)` intentionally un-awaited (page polls `getBuild`); `getBuild` throws `notFound()` on draft and lazily marks stale `processing` → `failed`; `getGallery` skips builds missing slug/renderKey then sorts by vehicle order → preset sort. No raw SQL, no new deps. No blockers.

**2026-10-11 — Task 6 DONE** (`34700c4 feat(cars-4by4-builder): add rate limiter, request context, image URLs and async generation`; 5 files, +114). Created `src/server/{rate-limit,request,images,render-core,generate}.ts`, all byte-for-byte vs plan. Verified: Step 6 spot-check re-run → `[ true, true, true, true, true, false ] true`; Step 7 turbo type-check/lint 8/8 green. Spec-compliance review: ✅ (all 5 files exact incl. em-dash in `"Generation failed — try again."`; the deliberate relative-import/no-`drizzle-orm` split kept for `render-core`/`images` vs alias+`drizzle` for `generate`; commit message byte-exact; only `src/server` staged; no deps). Code-quality review (inline): ✅ ready to merge — dependency exports all confirmed present (`generateUpgradeRender`, storage fns, `getRequest`/`getRequestIP` resolve via the `@tanstack/react-start/server` re-export chain); `getDbCars()` lazy inside `runGeneration`; `render-core`/`images` import-free of drizzle as intended. Process note carried from Task 5: code-quality was verified inline (commands are sub-second; the heavyweight review subagent was the time sink). No blockers.

**2026-10-10 — Task 5 DONE** (`c549a1dc feat(cars-4by4-builder): seed vehicles, re-categorized parts and presets`; 4 files, +95/−39). Created `src/seed/{vehicles,presets}.ts`; rewrote `src/seed/parts.ts` (21 placeholder parts, new categories) and `scripts/seed.ts` (idempotent upserts via `@smartekai/db/cars`, preserves `stockImageKey`). Verified: Step 5 output `21 9 []` (re-confirmed independently, 0.65s); Step 6 seed printed the 4 expected lines; live DB rows confirmed read-only `vehicles=3, parts=21, presets=9`; Step 7 turbo type-check/lint 8/8 green (0 cached). Spec-compliance review: ✅ byte-for-byte (all 4 files exact vs plan; 21 parts across the 5 allowed categories; `SeedPart` non-exported; em-dashes/`°` intact; commit message byte-exact; no deps). Code-quality review: ✅ ready to merge — no dup part ids / preset ids / preset slugs; every `preset.vehicleId`, `part.vehicleIds`, `preset.partIds` ref resolves; all `imageUrl` empty and `affiliateUrls` `{}`; `getDbCars()` invoked only inside `main()` (env-var safe); categories exactly match `CATEGORIES`. Process note: two review subagent runs were cancelled before completion — diagnosis showed the *commands* are all sub-second (turbo 0.4s cached, step 5 0.65s, seed 6.2s wall / 0.64s CPU where ~5.5s is npm+neon-http teardown, not a hang); the time sink was the heavyweight `general` review subagent itself, so the Task 5 code-quality verification was performed inline instead. Carry-forward: Task 4's "do NOT run db:seed before Task 5" is now resolved.

**2026-10-10 — Task 4 DONE** (`ffc390b feat(cars-4by4-builder): add region, pricing, catalog and prompt helpers`). Created `src/lib/{catalog,region,pricing,prompt}.ts`; replaced `CATEGORY_ADVISORIES` keys in `advisories.ts` with the new catalog categories (logic/types untouched). Verified: spot-check output matches expected exactly (`gcc us us` / `$2,450 AED 8,998` / `{ partsUsd: 3500, laborHours: 5.5, laborUsd: 550, totalUsd: 4050 }`); turbo type-check/lint 8/8 green (`--force`, 0 cached). Spec-compliance review: ✅ (byte-for-byte; only advisories constant changed; no deps; commit message exact). Code-quality review: ✅ ready to merge — no critical/important; all four files genuinely pure (zero imports, `prompt.ts` fully import-free for Task 6 scripts), cookie regex validated against Task 12's RegionSwitch format. Minor (deferred/plan-level): no EOF newlines on new files (cosmetic); `.filter(Boolean)` doesn't narrow `string|null` under TS 6 (inert today); empty-snippets prompt has dangling comma (callers always pass ≥1); `FITMENT_BADGES`/`CATEGORY_ADVISORIES` are `Record<string, …>` not exhaustively keyed — plan amendment suggested for later. Carry forward: **do NOT run `npm run db:seed` before Task 5** — old `src/seed/parts.ts` still uses the previous category keys (`front_bumper`, `roof_tent`, `lift_kit`); Task 5 rewrites it first.

**2026-10-10 — Task 3 DONE** (database only — no code commits). User confirmed the ASK-FIRST step. Dropped `upgrade_sessions` + old-shape `parts` via raw SQL on `DATABASE_NEONDB_SMARTEKAI`, then ran `npm run db:push:cars --workspace=@smartekai/db`. Result: `vehicles`, `parts`, `presets`, `builds`, `outbound_clicks` created with exactly the planned column shapes (verified against information_schema); `upgrade_sessions` gone; `cars_user/session/account/verification` untouched. `tablesFilter` held — no leftover legal/medical table was modified or dropped. One deviation to carry forward: drizzle-kit's push attempted to drop the stray `cases_id_seq` sequence (a legal/medical leftover owned by `cases` still present in the cars DB) and failed with a dependency error, surfacing as a non-clean `drizzle-kit push` exit — the DB state itself is exactly as planned, and a re-run of `db:push:cars` should now be a no-op apart from that same tolerated sequence hiccup. Unrelated SSL-mode deprecation warning from `pg` (non-blocking).

**2026-10-10 — Task 2 DONE** (`d404e1f feat(db): add @smartekai/db/cars entry…`). Created `packages/db/src/cars/{schema,client,index}.ts` + `drizzle.cars.config.ts`; added `./cars` export + `db:push:cars` script; added `@smartekai/db/cars` to Vite SSR externals. Verified: `dist/cars` 6 files, db build clean, turbo type-check/lint/build 13/13. Spec-compliance review: ✅ (byte-for-byte; additive constraint held — shared schema/client/index untouched). Code-quality review: ✅ ready to merge (no critical/important). Verified findings: `tablesFilter` genuinely protects non-cars tables (drizzle-kit introspection filters before diff); `require("@smartekai/db/cars")` import-safe with env unset, only `getDbCars()` throws; committed dist is drift-free. Notes carried forward: Task 3 must drop old-shape `parts` BEFORE pushing (filter includes `parts`, reordering would diff old→new shape); Task 14 must also kill the eager `dbCars` in the *shared* `client.ts` (`requireEnv` at module load). Minor: no EOF newlines on new files (cosmetic); pre-existing committed `.js`/`.d.ts` siblings under `packages/db/src/` (untouched).

**2026-10-10 — Task 1 DONE** (`7898415 feat(storage): add deleteObject`). Added `DeleteObjectCommand` + `deleteObject(bucket, key)` to `packages/storage/src/index.ts`; rebuilt committed `dist/`. Verified: storage build + type-check/lint green; `dist/index.d.ts` declares the export. Spec-compliance review: ✅. Code-quality review: ✅ (ready to merge; no issues beyond optional JSDoc). No consumers yet — first use is Task 7 (cleanup paths in `checkPhoto`). Infra note from review: `cars-uploads` access key must permit `DeleteObject`, else those cleanup paths throw — confirm when first consumer lands.

(Append dated results here as tasks complete.)
