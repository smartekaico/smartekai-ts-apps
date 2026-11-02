# 2026-11-03 — cars: Toyota Tacoma (3rd gen, 2016–2023)

## What changed
- `src/seed/vehicles.ts`: added `tacoma-3g` (sortOrder 7).
- `src/seed/parts.ts`: added `tacoma-3g` to `TRUCKS` (fitment: BOTH + truck-only).
- `src/seed/presets.ts`: added `tacoma-3g` to `TRUCKS` and `VEHICLE_SLUGS` (`tacoma`).
- `scripts/generate-stock.ts`: `SUBJECTS["tacoma-3g"]`.
- `scripts/parts-links.template.csv`: one per-vehicle row — `rough-country-6in-lift,https://www.amazon.com/dp/B0BQX3HXVV?tag=smartekaiover-20,tacoma-3g`.

## Production
- `db:seed`: 7 vehicles, 24 parts, 21 presets.
- `parts:links`: 20 rows (6 universal defaults + 14 per-vehicle, incl. Tacoma 6in lift).
- `stock:generate tacoma-3g`: 1 Gemini call → `stock/tacoma-3g.jpeg` (200).
- `gallery:render`: 3 Gemini calls (tacoma-overlander/dune/trail); others skipped.
- No deploy needed (sitemap built from DB at request time; vehicle list from DB).

## Live check
- 21 curated builds in DB; sitemap shows `tacoma-overlander`, `tacoma-dune`, `tacoma-trail`.
- `part_vehicle_links` has the Tacoma 6in lift row.
- Stock image 200.

## ASINs researched
- rough-country-6in-lift → B0BQX3HXVV (confirmed)
- bakflip-mx4, bilstein-5100-shocks, rough-country-lift-kit, fuel-vector-wheels, method-beadlock-701 → left blank (no clear Amazon listing confirmed). Universal defaults apply to the rest.

## Merge
Pending user approval.