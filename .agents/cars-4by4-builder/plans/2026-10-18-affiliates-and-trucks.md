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
8. **Task H (added 2026-10-23):** Amazon picks for the trucks (user) + per-vehicle links (code). See below.

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
| G step 7 | stock photos, production seed, 9 gallery renders | **waiting on the user** — spends Gemini credits and writes production | — |

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

## Task H (added 2026-10-23): Amazon picks for the trucks + per-vehicle links

The user joined Amazon Associates (store ID ends in `-20`). This task has two
parts: **H1** is the user's product-picking guide (no code); **H2** is the code
change that lets one part carry a different link per vehicle.

### Why per-vehicle links

`parts.affiliate_url` holds **one** URL per part. That's fine for universal
parts (a light bar is the same product on every truck), but shocks, lift kits,
wheels and tonneau covers are sold as a **different Amazon listing per vehicle**.
A Bilstein 5100 link for the F-150 is the wrong part for a Silverado.

Silverado 1500 and Sierra 1500 share the GM T1 platform (same frame, bed, bolt
pattern and suspension), so in practice the trucks need only **two** link
variants: **Ford** and **GM**. The SUVs each need their own.

### H1 — Product-picking guide for the 14 truck parts (user, no code)

How to pick on Amazon: search the term, open the listing **sold by the brand or
by Amazon**, use Amazon's "fits your vehicle" check with the year/cab/bed below,
then SiteStripe → Get Link → Full Link, or build
`https://www.amazon.com/dp/<ASIN>?tag=<id>-20`.

Default truck configuration to pick for (the most common trims): **F-150 2021+
SuperCrew, 5.5 ft bed, 4WD** · **Silverado/Sierra 1500 2019+ crew cab, short box
(5 ft 10 in), 4WD**.

| Part id | Link type | Amazon search term | What to pick |
|---|---|---|---|
| `bfg-km3-33` | one link | `BFGoodrich Mud-Terrain T/A KM3 33x12.50R17` | The KM3 listing with a size selector; 33x12.50R17 is the common truck size. |
| `nitto-ridge-grappler-35` | one link | `Nitto Ridge Grappler 35x12.50R20` | The listing with a size selector; 35x12.50R20. |
| `fuel-vector-wheels` | **Ford / GM** | `Fuel Vector D579 17x9 6x135` (Ford) · `6x139.7` (GM) | Bolt pattern decides it: Ford 6x135, GM 6x139.7 (6x5.5). Matte black, 17x9. |
| `method-beadlock-701` | **Ford / GM** | `Method MR701 17x9 6x135` (Ford) · `6x5.5` (GM) | Same bolt-pattern rule. MR701 is beadlock-*style*; say so if the page title differs. |
| `bilstein-5100-shocks` | **Ford / GM** | `Bilstein 5100 F-150 2021 front` / `Silverado 1500 2019 front` | Front and rear are separate listings; link the **front adjustable** one (the visible part). |
| `rough-country-lift-kit` | **Ford / GM** | `Rough Country 2.5 leveling kit F-150 2021` / `Silverado 1500 2019` | The front leveling kit for that truck (2.5" on Ford, 2" on GM is the closest fit; keep the part name). |
| `rough-country-6in-lift` | **Ford / GM** | `Rough Country 6 inch lift kit F-150 2021 4WD` / `Silverado 1500 2019 6 inch` | 4WD kit with N3 shocks. Check the listing names the trim (no Tremor/Trail Boss/AT4 unless stated). |
| `bakflip-mx4` | **Ford / GM** | `BAKFlip MX4 F-150 5.5 ft` / `BAKFlip MX4 Silverado 5 ft 10 in` | Bed length must match; pick the defaults above. Sold on Amazon by RealTruck/BAK. |
| `rigid-led-lightbar` | one link | `Rigid Industries Radiance+ 40 inch` or `RDS-SR 40` | The 40" bar alone; mounts are vehicle-specific but not part of this item. |
| `kc-hilites-cube` | one link | `KC HiLiTES FLEX ERA 3 pair` (current Cube successor) | If the C-Series cube is listed, use it; otherwise FLEX ERA 3 pair kit. |
| `warn-vr-evo-10s` | one link | `WARN VR EVO 10-S winch 103253` | Synthetic rope version. Universal; it needs a winch-ready bumper. |
| `arb-esperance-tent` | likely **not on Amazon** | `ARB Esperance rooftop tent` | If there's no listing sold by ARB/an authorised dealer, leave blank (AvantLink later). |
| `ironman-hardshell-tent` | likely **not on Amazon** | `Ironman 4x4 rooftop tent` | Same as above. |
| `leitner-acs-forged` | likely **not on Amazon** | `Leitner ACS Forged bed rack` | Sold direct by Leitner. Leave blank or use a merchant-direct link. |

Rules while picking:
- Avoid third-party resellers with few ratings and "used/renewed" listings.
- Never type an Amazon price or star rating into the site; the catalogue "Est."
  prices stay ours.
- If a product isn't on Amazon, leave the row blank: no button shows, which is
  better than a wrong product.
- **Until H2 ships**, a Ford/GM row can hold an Amazon **search link** that
  lets the shopper pick their own vehicle, e.g.
  `https://www.amazon.com/s?k=Bilstein+5100+shocks&tag=<id>-20`. Search links
  with a tag are allowed and earn commission; swap them for exact product links
  after H2.

### H2 — Per-vehicle affiliate links (implementing agent)

**Files:** `packages/db/src/cars/schema.ts`, `scripts/parts-links.ts`,
`scripts/parts-links.template.csv`, `src/routes/go/$partId.ts`, the loader that
feeds `ShopList` (whatever builds the report's part rows; find it from
`src/components/ShopList.tsx`), `drizzle.cars.config.ts` (`tablesFilter`).

- [ ] **Step 1: Table.** Add `partVehicleLinks`:

```ts
// One affiliate URL per (part, vehicle) where the product differs by vehicle
// (shocks, lift kits, wheels, tonneau covers). Falls back to parts.affiliate_url.
export const partVehicleLinks = pgTable(
  "part_vehicle_links",
  {
    partId: text("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
    vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.partId, t.vehicleId] }) }),
);
```

  DDL (one transaction, rehearse on `cars-credits`, **ask before production**,
  never `db:push:cars`; add the table to `tablesFilter`):

```sql
create table if not exists part_vehicle_links (
  part_id text not null references parts(id) on delete cascade,
  vehicle_id text not null references vehicles(id) on delete cascade,
  url text not null,
  primary key (part_id, vehicle_id)
);
```

- [ ] **Step 2: CSV gets an optional third column.** `partId,url[,vehicleIds]`.
  `vehicleIds` is `|`-separated (`silverado-1500|sierra-1500`), so the GM link is
  one row. No third column = the part's default link (`parts.affiliate_url`,
  today's behaviour). Validation adds: every vehicle id exists, the part fits
  that vehicle (`parts.vehicle_ids`), and no (part, vehicle) appears twice.
  Upsert on the primary key. `--check` prints one line per (part, vehicle).
  Parse quoted URLs carefully: URLs may contain commas only if quoted; keep the
  existing first-comma split for the 2-column form and split from the **right**
  for the 3-column form only when the last field matches `^[a-z0-9|-]+$`.
- [ ] **Step 3: Template.** Under each Ford/GM part in
  `parts-links.template.csv`, add commented example rows:
  `# bilstein-5100-shocks,<ford link>,f150` and
  `# bilstein-5100-shocks,<gm link>,silverado-1500|sierra-1500`. Keep the header
  comment explaining the third column.
- [ ] **Step 4: `/go/$partId`.** When `?build=` is present, read the build's
  `vehicle_id` and use `part_vehicle_links.url` for that vehicle if there is one,
  else `parts.affiliate_url`. One query: left join `builds` →
  `part_vehicle_links` on part id + vehicle id, plus `parts`. 404 only if both
  are null. `withSubId` and the `outbound_clicks` insert are unchanged.
- [ ] **Step 5: Buy button visibility.** The report's shopping list must show
  "Buy on …" when **either** link exists for the build's vehicle, and the store
  label (`storeOf`) must come from the URL that `/go` will actually use. Do the
  same coalesce in the loader.
- [ ] **Step 6: Verify on `cars-credits`** with temporary links (delete after):
  - a Ford-only link: an F-150 report shows the button and `/go` lands on the
    Ford URL; a Silverado report with no GM link and no default shows no button;
  - a default + GM link: Silverado and Sierra get the GM URL, F-150 the default;
  - an SUV build is unaffected;
  - `outbound_clicks` gets one row per click; `links:check` lists per-vehicle rows;
  - the gate passes.
- [ ] **Step 7: Commit** `feat(cars): per-vehicle affiliate links for vehicle-specific parts`.

### Task H — done when

- [ ] H1: the user has filled the truck rows (or left them blank on purpose).
- [ ] H2 merged and its DDL applied in production (with approval).
- [ ] `npm run links:check` shows every filled row with HTTP 200 and store "amazon".

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

- [ ] **Step 7: Ask first, because it spends Gemini credits and writes production.** These steps:
  - generate stock photos for the 3 trucks (`npm run stock:generate -w cars-4by4-builder -- f150 silverado-1500 sierra-1500`);
  - run the production seed;
  - render the 9 new gallery presets (`npm run gallery:render`).

  Each needs the user's go-ahead. Give the expected Gemini call count: 3 stock images plus 9 renders.

- [ ] **Step 8: Commit.** Use the message `feat(cars): add Ford F-150, Silverado 1500 and Sierra 1500 with truck fitment and presets`.

### Done when

- [x] Spec 1 §8 Task B (minus the `declared` parameter), Task C (as the
      importer's `--check` mode) and Task E are done.
- [ ] Task D — **blocked on the user's links**: 0 of 24 are in place.
- [x] Task F verified as far as the links allow — with temporary branch links
      (since deleted): store labels, disclosure, `rel` attributes, the redirect,
      the sub-IDs and one `outbound_clicks` row per click.
- [x] Task G Steps 1–6 done; **Step 7 waits on the user** (3 stock images, the
      production seed and 9 gallery renders).
- [x] The gate passes, and the spec's §6 boxes are ticked where verified.
- [x] Current-work line added to `.agents/cars-4by4-builder/plans/active.md`.
