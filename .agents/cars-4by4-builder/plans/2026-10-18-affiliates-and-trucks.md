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

## What actually shipped (2026-10-23)

The user chose a smaller shape than the plan's Tasks A/B/C, so the plan text
above is the design that was **not** followed verbatim. What was decided with the
user and built:

| Task | Plan said | Shipped | Why |
|---|---|---|---|
| A | add `parts.affiliate_store` column + DDL | **skipped** | The user's links are Amazon/eBay/merchant-direct, so no link needs a *declared* store. No schema change, no DDL. |
| B | `Store` registry, `storeOf(url, declared?)`, 10 labels | registry + labels + **merchant-domain detection** shipped; the `declared` parameter and the `affiliateStore` column behind it were dropped with Task A | Without a declared store there is nothing to pass, so the parameter would be dead code. |
| C | new `src/seed/affiliate-links.ts` map + `scripts/check-links.ts` | **no second mechanism** — the existing `scripts/parts-links.ts` gained a `--check` mode (and `npm run links:check`) | One place that owns affiliate URLs: the CSV the user fills in. A second map would be a second source of truth. `--check` needs the database (the part list and the currently linked URLs live there), where the plan's version read only the map. |
| E | `src/lib/subid.ts` + wiring in `/go/$partId` | as planned | — |
| F | verify on the branch | done as far as zero real links allow: the store labels, the disclosure, the `rel` attributes, the redirect, the sub-IDs and the `outbound_clicks` row were all exercised with **temporary** branch links, which were deleted afterwards | — |
| G steps 1–6 | seed data + branch verification | done | — |
| G step 7 | stock photos, production seed, 9 gallery renders | **stock photos + production seed done** (3 Gemini calls, on the user's go-ahead); the 9 gallery renders wait for another go-ahead | — |

Two more deviations worth remembering:

- **The truck part count is 14, not 12.** The plan's prose says "the 9 shared
  parts plus the 3 truck parts", but its own list of shared parts has **11**
  entries (4 wheels, 2 suspension, 3 lighting, 2 rooftop tents). The explicit
  list wins: a pickup shows 11 shared + 3 truck-only = 14 parts, an SUV shows
  21.
- **`RealTruck` is `realtruck.com`.** The plan (and the spec) wrote
  `realtrack.com`; the live domain is `realtruck.com`, so that is what the
  merchant list uses.

### Task D — still blocked on the user

**0 of 24** affiliate URLs are in place (the catalogue grew from 21 to 24 parts
with the trucks, so three more rows are owed). The template
`apps/cars-4by4-builder/scripts/parts-links.template.csv` lists every part id
with a blank URL column; paste a link after the comma and run
`npm run parts:links -- ./scripts/parts-links.template.csv` (or
`npm run links:check -- …` first, which writes nothing and reports the store,
host and HTTP status of every row). Amazon links need `tag=<associate-id>`.

---

### Task G: Pickup trucks (F-150, Silverado 1500, Sierra 1500)

Today's catalogue has three SUVs, and every part fits all three (`vehicleIds: ALL`). The build page already filters parts by `vehicleIds` (`src/routes/build.tsx:41`), and `startBuild` rejects parts that don't fit (`src/lib/builds.ts:166`). The vehicle detector already accepts pickups. So this task is mostly seed data.

**Files:**
- `src/seed/vehicles.ts`
- `src/seed/parts.ts`
- `src/seed/presets.ts`
- `scripts/generate-stock.ts` (`SUBJECTS`)
- `packages/db/src/cars/schema.ts`: update the comment on `vehicles.id` only. No schema change.

- [x] **Step 1: Vehicles.** Append to `seedVehicles`:

```ts
  { id: "f150", name: "Ford F-150", yearRange: "2021–2026", sortOrder: 4 },
  { id: "silverado-1500", name: "Chevrolet Silverado 1500", yearRange: "2019–2026", sortOrder: 5 },
  { id: "sierra-1500", name: "GMC Sierra 1500", yearRange: "2019–2026", sortOrder: 6 },
```

- [x] **Step 2: Fitment per part.** In `src/seed/parts.ts`:
  - Replace the single `ALL` with `SUVS = ["lc300", "patrol-y62", "wrangler-jl"]` and `TRUCKS = ["f150", "silverado-1500", "sierra-1500"]`.
  - Add an optional `vehicleIds?: string[]` to `SeedPart`.
  - Parts default to `SUVS`.
  - These existing parts also fit full-size trucks, so they get `[...SUVS, ...TRUCKS]`:
    - Wheels and tyres: `method-beadlock-701`, `fuel-vector-wheels`, `nitto-ridge-grappler-35`, `bfg-km3-33`.
    - Suspension: `bilstein-5100-shocks`, `rough-country-lift-kit`.
    - Lighting and recovery: `rigid-led-lightbar`, `kc-hilites-cube`, `warn-vr-evo-10s`.
    - Rooftop tents, which mount on a bed rack: `arb-esperance-tent`, `ironman-hardshell-tent`.
  - All other parts stay SUV-only. The ARB and Ironman armour, OME, the Ironman snorkel, Smittybilt and Front Runner are body-specific to the SUVs.

- [x] **Step 3: Truck-only parts.** Add these three parts with `vehicleIds: TRUCKS`.

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

- [x] **Step 4: Presets per vehicle group.** In `src/seed/presets.ts`:
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

- [x] **Step 5: Stock-photo subjects.** In `scripts/generate-stock.ts`, add to `SUBJECTS`:

```ts
  f150: "Ford F-150 (14th generation) SuperCrew pickup truck",
  "silverado-1500": "Chevrolet Silverado 1500 crew cab pickup truck",
  "sierra-1500": "GMC Sierra 1500 crew cab pickup truck",
```

- [x] **Step 6: Verify on the branch.**
  - Seed the branch: `DATABASE_NEONDB_SMARTEKAI="<branch pooled url>" npm run db:seed -w cars-4by4-builder`.
  - Expect 6 vehicles, 24 parts and 18 presets.
  - Click through on the branch:
    - `/build` shows 6 vehicles. The picker grid is `sm:grid-cols-3`, so 2 rows.
    - Picking F-150 lists only the 9 shared parts plus the 3 truck parts.
    - Picking Land Cruiser shows no truck-only parts.
    - Starting a build with an SUV-only part on a truck is refused.
  - Run the gate.

- [x] **Step 7a: stock photos for the 3 trucks + the production seed.** Run on
  2026-10-23 with the user's go-ahead (3 Gemini calls):
  `npm run stock:generate -w cars-4by4-builder -- f150 silverado-1500 sierra-1500`
  and then `npm run db:seed -w cars-4by4-builder` against **production**.
  Production is now **6 vehicles / 24 parts / 18 presets**, and all six vehicles
  have a stock photo at `stock/<id>.jpeg` in `cars-renders`. The seed does **not**
  overwrite `vehicles.stockImageKey`, so the three original SUV photos survived
  untouched — which is also why the stock photos had to come *after* the seed
  (the trucks had to exist before their photos could be attached).
- [ ] **Step 7b: the 9 gallery renders for the new truck presets.** Still waiting
  on the user's go-ahead (9 Gemini calls).

- [ ] **Step 8: Commit.** Use the message `feat(cars): add Ford F-150, Silverado 1500 and Sierra 1500 with truck fitment and presets`.

### Done when

- [x] Spec 1 §8 Task B (minus the `declared` parameter), Task C (as the
      importer's `--check` mode) and Task E are done.
- [ ] Task D — **blocked on the user's links**: 0 of 24 are in place.
- [x] Task F verified as far as the links allow — with temporary branch links
      (since deleted): store labels, disclosure, `rel` attributes, the redirect,
      the sub-IDs and one `outbound_clicks` row per click.
- [x] Task G Steps 1–6 done; **Step 7a done** (3 stock photos + the production
  seed, on the user's go-ahead), **Step 7b waits on the user** (9 gallery
  renders for the new truck presets).
- [x] The gate passes, and the spec's §6 boxes are ticked where verified.
- [x] Current-work line added to `.agents/cars-4by4-builder/plans/active.md`.
