# 2026-11-08 — cars: MVP without live AI renders (Spec 7)

## What changed
- `src/lib/features.ts`: `AI_RENDERS_ENABLED = false` (typed as `boolean` via `as boolean`).
- Server guards: `checkPhoto`, `startBuild`, `createInvoice` refuse with "This feature is paused."
- `/credits` redirects to `/build`; `/builds/$slug_/report` redirects to the build page.
- `/go/$partId`: accepts `?vehicle=<id>`; `build` still wins when present; unknown id falls back to the default link.
- `getConfigurator`: with a vehicle, loads that vehicle's part_vehicle_links and passes the URL to `toPublicPart`; adds `afterUrl` and `totalUsd` per preset (Promise.all).
- `ShopList`: props `buildId?` / `vehicleId?`.
- `TruckStep`: tiles only when AI off (heading "Pick your truck"). `VehiclePicker` uses `STUDIO_CROP`.
- `PopularBuilds`: photo cards (name + total) replacing PresetPills when off; "Help me choose" card beside them.
- `StepIndicator`: "3 Your parts list" when off.
- `BuildFooter`: "See my parts list" → `step=list`, disabled with 0 parts, `RenderCost` hidden.
- `PartsListStep`: spec §2 (photo, ShopList, BuildReport, Print, Edit parts, Copy link, 3D as on step 2, closest-preset "Closest look" label).
- `closestPreset` in `src/lib/recommend.ts`: pure, highest shared/union, ties to first preset.
- `BuildReport` (new): extracted from the report page; used on step 3, build page, and report page.
- `SiteHeader`: hide Sign in, credits, My projects for visitors when off; admin keeps Sign out + Admin link.
- `SiteFooter`: unchanged (credits line stays for Amazon).
- Copy: home hero/meta, /build description, __root.tsx meta, coming-soon hook updated.
- `getBuild`: returns full part data (`toPublicPart`) when switch is off.

## Verification (headless Chrome at 375px and desktop)
- `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=... --virtual-time-budget=8000 --screenshot=...`
- `/build?vehicle=f150&step=parts` → Popular builds, Help me choose, See my parts list. ✓
- `/build?vehicle=f150&parts=fuel-vector-wheels&parts=bilstein-5100-shocks&step=list` → parts list with BuildReport, Print, Copy link, "Closest look". ✓
- `/builds/f-150-overlander` → BuildReport + ShopList + total. ✓
- `/go/bilstein-5100-shocks?vehicle=f150` → 302 → Amazon ASIN with tag. ✓
- Bad vehicle param → 404 (no 500). ✓
- `/credits`, `/builds/<slug>/report` → 307 redirect. ✓
- `/sign-in`, `/admin` still work. ✓
- Gate PASSED (typecheck/lint/build). Dry-run OK.

## Production
- Deployed version `d62c4d4f-9d5d-408b-af83-a78c033e3759`.

## Notes
- No Gemini calls in this work. All AI code stays behind the switch.
- `ReviewStep` is still imported/rendered when AI is on (step=review maps to list when off).