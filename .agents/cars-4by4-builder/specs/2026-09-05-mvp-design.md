# 4x4 Visualizer & Build Planner — MVP Design

Source material: `.agents/cars-4by4-builder/sops/sop.md` (pasted SOP, written against a
generic TanStack Start + pnpm + Zustand stack). This spec reconciles that SOP against
`smartekai-saas`'s actual conventions (see root `AGENTS.md`) and resolves every fork the
SOP left open. It is the artifact `writing-plans` should build an implementation plan
from.

## 1. What this is

A public, consumer-facing 3D configurator: pick one of 3 vehicles, add ARB/Ironman-style
accessories, see live weight/cost impact and a generated safety/suspension report. Builds
can be saved anonymously or claimed with an account. No B2B/multi-tenant concerns — this
is not another `legal-os`/`medical-os`-shaped app.

## 2. App & repo integration

- **Location:** `apps/cars-4by4-builder` — new workspace package, added to root
  `package.json` workspaces glob automatically (`apps/*`).
- **Framework:** TanStack Start (Vite + Nitro + `@tanstack/react-router`), matching
  `medical-os`'s current stack, *not* Next.js. The SOP's server-function recommendation
  engine and route conventions (`/builds/$buildId`) assume this already.
- **Package manager:** npm workspaces, per repo convention — SOP's `pnpm run db:seed`
  becomes `npm run db:seed --workspace=apps/cars-4by4-builder` (or a `turbo run db:seed
  --filter=cars-4by4-builder` task).
- **UI primitives:** `@smartekai/ui` (shadcn/Radix) — do not re-run `shadcn init` in this
  app; consume the shared package like the other two apps do.
- **Deployment:** Dokploy on the existing self-managed VPS — `turbo prune
  cars-4by4-builder --docker` + a per-app `Dockerfile`, same as `legal-os`/`medical-os`.
  The SOP's "deployment to Vercel/Netlify" is dropped.
- **Env var:** `DATABASE_NEONDB_SMARTEKAI` (already provisioned — see project memory
  `project-4by4-builder-planned`) is this app's dedicated Neon connection string. Add it
  to `turbo.json`'s `globalEnv` alongside the existing DB vars.

## 3. Data model — `packages/db`

New tables added to the existing shared `packages/db/src/schema.ts` (same file
legal/medical tables live in — one schema module, multiple physical databases per app,
per the existing `client.ts` pattern):

```typescript
export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),                    // "lc300" | "wrangler-jl" | "tacoma"
  name: text("name").notNull(),
  make: text("make").notNull(),
  baseWeightKg: integer("base_weight_kg").notNull(),
  maxGvmKg: integer("max_gvm_kg").notNull(),
  maxDynamicRoofKg: integer("max_dynamic_roof_kg").notNull(),
  baseModelUrl: text("base_model_url").notNull(), // relative path under app public/
});

export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  partNumber: text("part_number").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),           // "front_bumper" | "winch" | "roof_rack" | "rooftop_tent" | "suspension" | "side_step"
  compatibleVehicleIds: text("compatible_vehicle_ids").array().notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  weightKg: integer("weight_kg").notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  proxy3dModelUrl: text("proxy_3d_model_url"),     // relative path under app public/
  affiliateUrl: text("affiliate_url").notNull(),
});

export const builds = pgTable("builds", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // nullable — anonymous by default; FK resolves against dbCars's own users rows, not legal/medical's
  vehicleId: text("vehicle_id").references(() => vehicles.id).notNull(),
  selectedPartIds: text("selected_part_ids").array().notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  totalWeightKg: integer("total_weight_kg").notNull(),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

No `organizationId` on any of these tables — this app has no multi-tenant isolation
boundary, unlike the rest of the repo's invariant.

`packages/db/src/client.ts` gets one more dedicated connection, following the existing
`dbLegal`/`dbMedical` pattern:

```typescript
const carsSql = neon(process.env.DATABASE_NEONDB_SMARTEKAI!);
export const dbCars = drizzle({ client: carsSql, schema });
```

## 4. Auth — separate Better Auth instance, same package

The existing `@smartekai/auth` export (`packages/auth/src/index.ts`) is a *single* shared
instance whose Better Auth tables are physically stored in the default (legal) database,
scoped to `legal.smartekai.com`/`medical.smartekai.com`, and carries the `organization`
plugin plus legal/medical-specific `additionalFields` (`activeOrganizationId`,
`industryRole`, `creditBalance`). None of that belongs to a public consumer app with its
own dedicated database, so `cars-4by4-builder` does **not** join it.

Instead, `apps/cars-4by4-builder` constructs its own `betterAuth()` instance (own file,
e.g. `apps/cars-4by4-builder/src/lib/auth.ts`), same construction style as
`packages/auth`, but:

- `drizzleAdapter(dbCars, { schema: { user: users, session: sessions, account: accounts,
  verification: verifications } })` — reuses the *table shapes* already defined in
  `packages/db/src/schema.ts` (no new user/session table definitions), just points at the
  new dedicated database. No `organization`/`member`/`invitation` mapped in.
- `trustedOrigins` includes this app's own subdomain (e.g. `cars.smartekai.com`), not the
  legal/medical ones.
- Plugins for MVP: **anonymous session** + **email/password** only. OAuth (Google/Apple)
  and email OTP from the SOP are explicitly deferred — flagged in §8, not built now.
- `DB access stays inside packages/db` invariant is preserved: both the connection
  (`dbCars`) and the table schemas live in `packages/db`; the app only constructs the
  auth instance and imports from there.

## 5. 3D & asset pipeline

- `@react-three/fiber` + `@react-three/drei` for the canvas, mounted through a
  client-only boundary (dynamic import / custom boundary) to avoid SSR hydration
  mismatches, per the SOP's note.
- **Assets are placeholders for this spec.** Ship sample/placeholder `.glb` files under
  `apps/cars-4by4-builder/public/models/` — no object storage (S3/R2) is provisioned.
  `vehicles.baseModelUrl` / `parts.proxy3dModelUrl` just store paths like
  `/models/lc300.glb`.
- Real vehicle GLBs (licensed/modeled LC300, Wrangler JL, Tacoma + the 4 accessory
  proxies: `bullbar_heavy`, `prerunner_bumper`, `platform_roofrack`, `hardshell_tent`,
  with Blender-rigged anchor points) are **out of scope** — a separate, external
  deliverable (3D modeling/licensing work), not something this plan produces. The
  pipeline is built end-to-end against placeholders so swapping in real assets later is a
  drop-in path change, not a rebuild.
- Optimization step (`gltf-transform`, draco compression, 1024×1024 texture cap,
  4–6MB budget) is documented but only exercised once real assets exist.

## 6. Configurator UI & state

- Vehicle + selected part IDs live in the URL via TanStack Router's typed search params
  (no Zustand — no other app in this repo uses it, and search params give free
  shareable/bookmarkable builds).
- Layout matches the SOP's mockup: 3D canvas (~70% viewport) left, category-accordion
  parts panel (~30%, `Sheet` on mobile) right, running total bar along the bottom.
- Components sourced from `@smartekai/ui`: `Button`, `Sheet`, `Dialog`, `Progress`,
  `Card`, `Badge`, `Tabs`, `Separator`.

## 7. Catalog seeding

- Hand-curated seed script (`apps/cars-4by4-builder`'s own `db:seed` script), ~25–40
  parts across the 3 vehicles, statically authored (name, part number, category, price,
  weight, labor estimate, compatible vehicle IDs, affiliate URL) and inserted via
  Drizzle. No scraping — `@smartekai/crw` is not used for this pass, despite being
  available and used elsewhere in the repo (`legal-os`). Scraped/live catalog sync is a
  fast-follow, not MVP.

## 8. Build report & recommendation engine

Kept close to the original SOP — this section already fit TanStack Start idioms cleanly:

- Route `/builds/$buildId` renders the itemized BOM (parts, prices, weights, labor
  hours), subtotal, estimated labor cost, and total.
- A pure server function `generateRecommendations(vehicle, selectedParts)` runs the
  three rule checks from the SOP unchanged:
  1. Front-axle load warning when combined front-bumper + winch weight ≥ 70kg.
  2. Roof dynamic-load danger when roof-category weight exceeds 85% of
     `maxDynamicRoofKg`.
  3. GVM-consumption warning when total added weight exceeds 50% of `maxGvmKg`.
- PDF export via `@react-pdf/renderer` (new dependency) — same "thin wrapper" precedent
  as `@smartekai/ai`/`@smartekai/crw` for third-party integrations, though for MVP it can
  live directly in the app rather than as a new shared package (no second consumer yet).
- "Order All via Retailer" links out through each part's `affiliateUrl` — no checkout/cart
  logic in this app.

## 9. Explicitly out of scope for this spec

- Real 3D vehicle/accessory assets and any object-storage (S3/R2) provisioning.
- OAuth (Google/Apple) and email-OTP auth plugins.
- Scraped/live catalog data via `@smartekai/crw`.
- Any multi-tenant / organization concept for this app.
- The SOP's calendar-based "4-week sprint" — replaced by ordered milestones (no dates)
  in the implementation plan, since delivery pacing isn't a design concern.

## 10. Milestones (ordered, not dated)

1. **Foundation** — scaffold `apps/cars-4by4-builder` (TanStack Start), add
   `vehicles`/`parts`/`builds` to `packages/db` schema + `dbCars` connection, wire
   `DATABASE_NEONDB_SMARTEKAI` through `turbo.json`, stand up the app's own Better Auth
   instance (anonymous + email/password).
2. **3D pipeline against placeholders** — client-only R3F canvas, placeholder GLBs for
   all 3 vehicles + 4 accessory proxies under `public/models/`.
3. **Catalog & configurator** — hand-curated seed script, configurator UI with
   URL-search-param state, live weight/cost calculation.
4. **Build report & recommendations** — `/builds/$buildId` route, the three rule-engine
   checks, PDF export, affiliate link-out.
5. **Save/claim flow** — anonymous build creation, email/password save-and-claim,
   `isPublic`/share link.
