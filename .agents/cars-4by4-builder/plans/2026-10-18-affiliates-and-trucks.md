# Affiliate Step 2–3 + Pickup Trucks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:**
- Finish the affiliate work in Spec 1 (§8, Tasks A–F).
- Add three full-size pickups: Ford F-150, Chevrolet Silverado 1500 and GMC Sierra 1500.

**Source of truth:**
- `.agents/cars-4by4-builder/specs/2026-10-16-affiliate-sources-audit.md`, §7 and §8. Read them first. Tasks A–F live there in full and are not repeated here.
- Task G below is defined only in this plan.

**Ground rules** (repo `AGENTS.md`):
- Branch `feat/cars-affiliates` from `main`. Never commit to `main`, and merging needs the user's OK.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- Never run `db:push:cars`. Schema changes go in as hand DDL with `psql -1` over the **direct** URL.
- Rehearse everything on the Neon branch `cars-credits` (project `ancient-hall-95124568`).
- **Ask first** before any production DDL, a production `db:seed`, or any script that spends Gemini credits or writes production storage (`stock:generate`, `gallery:render`).
- Local dev reads the root `.env.local`, which points at **production**. Override `DATABASE_NEONDB_SMARTEKAI` with the branch URL in your shell for every seed or run.
- No test suite. Spot-check pure helpers with `npx tsx -e`, and click through the app on the branch.
- Spec 4 (the Cloudflare Workers move) may land first. Nothing here depends on the runtime. If Spec 4 has landed, local env comes from `.dev.vars` (`npm run dev-vars`).

## Order

1. **Task A:** add the `parts.affiliate_store` column.
2. **Task B:** the store registry and Buy-button labels.
3. **Task C:** `affiliate-links.ts` plus the `links:check` script.
4. **Task E:** sub-ID tagging in `/go/$partId`.
5. **Task G:** pickup trucks (below).
6. **Task D:** apply the links. **Blocked on the user's links**; skip it and report if they aren't there.
7. **Task F:** verification and closing Spec 1 §6. Needs at least one link; if there is none, verify everything except the store redirect.

Commit after each task, using `feat(cars): …` or `docs(cars): …`.

---

### Task G: Pickup trucks (F-150, Silverado 1500, Sierra 1500)

Today's catalogue has three SUVs, and every part fits all three (`vehicleIds: ALL`). The build page already filters parts by `vehicleIds` (`src/routes/build.tsx:41`), and `startBuild` rejects parts that don't fit (`src/lib/builds.ts:166`). The vehicle detector already accepts pickups. So this task is mostly seed data.

**Files:**
- `src/seed/vehicles.ts`
- `src/seed/parts.ts`
- `src/seed/presets.ts`
- `scripts/generate-stock.ts` (`SUBJECTS`)
- `packages/db/src/cars/schema.ts`: update the comment on `vehicles.id` only. No schema change.

- [ ] **Step 1: Vehicles.** Append to `seedVehicles`:

```ts
  { id: "f150", name: "Ford F-150", yearRange: "2021–2026", sortOrder: 4 },
  { id: "silverado-1500", name: "Chevrolet Silverado 1500", yearRange: "2019–2026", sortOrder: 5 },
  { id: "sierra-1500", name: "GMC Sierra 1500", yearRange: "2019–2026", sortOrder: 6 },
```

- [ ] **Step 2: Fitment per part.** In `src/seed/parts.ts`:
  - Replace the single `ALL` with `SUVS = ["lc300", "patrol-y62", "wrangler-jl"]` and `TRUCKS = ["f150", "silverado-1500", "sierra-1500"]`.
  - Add an optional `vehicleIds?: string[]` to `SeedPart`.
  - Parts default to `SUVS`.
  - These existing parts also fit full-size trucks, so they get `[...SUVS, ...TRUCKS]`:
    - Wheels and tyres: `method-beadlock-701`, `fuel-vector-wheels`, `nitto-ridge-grappler-35`, `bfg-km3-33`.
    - Suspension: `bilstein-5100-shocks`, `rough-country-lift-kit`.
    - Lighting and recovery: `rigid-led-lightbar`, `kc-hilites-cube`, `warn-vr-evo-10s`.
    - Rooftop tents, which mount on a bed rack: `arb-esperance-tent`, `ironman-hardshell-tent`.
  - All other parts stay SUV-only. The ARB and Ironman armour, OME, the Ironman snorkel, Smittybilt and Front Runner are body-specific to the SUVs.

- [ ] **Step 3: Truck-only parts.** Add these three parts with `vehicleIds: TRUCKS`.

  **Proposed names and prices.** These are catalogue estimates shown as "Est.". If the user changes them at plan review, use theirs.

```ts
  // Trucks
  { id: "leitner-acs-forged", name: "Leitner ACS Forged Bed Rack", category: "overland", brand: "Leitner Designs", priceUsd: "1400.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a black aluminum bed rack over the pickup bed, rising to cab height", vehicleIds: TRUCKS },
  { id: "bakflip-mx4", name: "BAKFlip MX4 Tonneau Cover", category: "overland", brand: "BAK", priceUsd: "1100.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile matte black hard folding tonneau cover over the pickup bed", vehicleIds: TRUCKS },
  { id: "rough-country-6in-lift", name: "Rough Country 6\" Lift Kit", category: "suspension", brand: "Rough Country", priceUsd: "1600.00", laborHoursEst: "8.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a tall 6-inch suspension lift with much larger wheel gaps and an aggressive stance", vehicleIds: TRUCKS },
```

  Then:
  - In the `seedParts` map, use `vehicleIds: p.vehicleIds ?? SUVS` instead of `ALL`.
  - Keep the placeholder comment accurate.
  - BAK is a RealTruck brand, so it goes on RealTruck/Impact links later (Spec 1 §7).

- [ ] **Step 4: Presets per vehicle group.** In `src/seed/presets.ts`:
  - Split `PRESET_PARTS` into `SUV_PRESET_PARTS` (today's object, unchanged) and `TRUCK_PRESET_PARTS`:

```ts
const TRUCK_PRESET_PARTS = {
  overlander: ["leitner-acs-forged", "arb-esperance-tent", "bfg-km3-33", "fuel-vector-wheels", "bilstein-5100-shocks"],
  dune: ["rough-country-6in-lift", "method-beadlock-701", "nitto-ridge-grappler-35", "rigid-led-lightbar", "kc-hilites-cube"],
  trail: ["rough-country-lift-kit", "bfg-km3-33", "warn-vr-evo-10s", "rigid-led-lightbar", "bakflip-mx4"],
};
```

  - Add the truck slugs to `VEHICLE_SLUGS`: `f150: "f-150"`, `"silverado-1500": "silverado"`, `"sierra-1500": "sierra"`.
  - Pick the parts map by whether the vehicle id is in the truck list. The preset ids and slugs keep the existing `${vehicleId}-${key}` and `${vehicleSlug}-${key}` patterns.
  - Every preset part must fit its vehicle. Assert this in the seed script before writing: throw if any preset part's `vehicleIds` doesn't include the preset's vehicle.

- [ ] **Step 5: Stock-photo subjects.** In `scripts/generate-stock.ts`, add to `SUBJECTS`:

```ts
  f150: "Ford F-150 (14th generation) SuperCrew pickup truck",
  "silverado-1500": "Chevrolet Silverado 1500 crew cab pickup truck",
  "sierra-1500": "GMC Sierra 1500 crew cab pickup truck",
```

- [ ] **Step 6: Verify on the branch.**
  - Seed the branch: `DATABASE_NEONDB_SMARTEKAI="<branch pooled url>" npm run db:seed -w cars-4by4-builder`.
  - Expect 6 vehicles, 24 parts and 18 presets.
  - Click through on the branch:
    - `/build` shows 6 vehicles. The picker grid is `sm:grid-cols-3`, so 2 rows.
    - Picking F-150 lists only the 9 shared parts plus the 3 truck parts.
    - Picking Land Cruiser shows no truck-only parts.
    - Starting a build with an SUV-only part on a truck is refused.
  - Run the gate.

- [ ] **Step 7: Ask first, because it spends Gemini credits and writes production.** These steps:
  - generate stock photos for the 3 trucks (`npm run stock:generate -w cars-4by4-builder -- f150 silverado-1500 sierra-1500`);
  - run the production seed;
  - render the 9 new gallery presets (`npm run gallery:render`).

  Each needs the user's go-ahead. Give the expected Gemini call count: 3 stock images plus 9 renders.

- [ ] **Step 8: Commit.** Use the message `feat(cars): add Ford F-150, Silverado 1500 and Sierra 1500 with truck fitment and presets`.

### Done when

- Spec 1 §8 Tasks A, B, C and E are done.
- Task D is done, or reported as blocked on the user's links.
- Task F is verified as far as the links allow.
- Task G Steps 1–6 are done; Step 7 waits on the user.
- The gate passes, and the spec's §6 boxes are ticked where verified.
- Add a current-work line to `.agents/cars-4by4-builder/plans/active.md`.
