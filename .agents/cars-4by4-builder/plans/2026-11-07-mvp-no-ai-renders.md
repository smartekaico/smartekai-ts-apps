# MVP: no live AI renders — Implementation Plan

> For agentic workers: use superpowers:executing-plans. Steps use `- [ ]`.
> Spec: `.agents/cars-4by4-builder/specs/2026-11-07-mvp-no-ai-renders-design.md`. Read it first.

**Goal:** truck → popular build or Help me choose → custom parts → parts list with Buy
buttons. No upload, no Gemini, no sign-in, no credits. Hide the AI code; don't delete it.

`plans/2026-11-07-save-gemini-credits.md` is **paused**.

## Ground rules

- Your own git worktree, branch `feat/cars-mvp` from `main`. Never commit to `main` or
  change branch in the shared checkout.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- No schema change, no DDL, no new dependencies, **zero Gemini calls**.
- Tailwind only scans `src/components` and `src/routes`.
- **Ask first:** merge, deploy.
- **Testing is required, not recommended.** The last rollout skipped it. Headless Chrome is
  on this machine:
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=500,1000 --virtual-time-budget=8000 --screenshot=out.png <url>`.
  If you can't test something, **stop and ask before merging**. Log what was tested and how.

## Steps

### 1. The switch and server guards

- [ ] `src/lib/features.ts`: `export const AI_RENDERS_ENABLED = false;` with a comment
  saying what it controls and that Spec 7 explains it.
- [ ] `checkPhoto`, `startBuild`, `createInvoice`: first line refuses with `fail("This
  feature is paused.")` (or that function's error shape) when off.
- [ ] `/credits` redirects to `/build`; `/builds/$slug/report` redirects to the build page.
- [ ] Commit `feat(cars): AI_RENDERS_ENABLED switch, off for the MVP`.

### 2. Buy links without a build

- [ ] `/go/$partId`: accept `vehicle`. Use `build`'s vehicle when present, else `vehicle`,
  else default. Join `part_vehicle_links` on that id, in the same single query. An
  unknown id matches nothing, so the default link is used.
- [ ] `getConfigurator`: with a `vehicleId`, also load that vehicle's `partVehicleLinks`
  and call `toPublicPart(p, link)`. Add `afterUrl` per preset (curated build for that
  preset, `publicImageUrl(renderKey)`) and a `totalUsd` per preset. Run these with
  `Promise.all`. Keep it to the selected vehicle only: `/build` is near the 10 ms CPU limit.
- [ ] `ShopList`: props become `buildId?` and `vehicleId?`; the link uses whichever exists.
- [ ] Commit `feat(cars): Buy links work without a saved build`.

### 3. Steps 1 and 2

- [ ] `TruckStep`: when off, only the tiles (heading "Pick your truck"). Add the same
  `STUDIO_CROP` to `VehiclePicker` images: the white band shows on those tiles today.
- [ ] `PopularBuilds`: photo cards replacing `PresetPills` when off, with name and total.
- [ ] A "Help me choose" card beside them; the panel is unchanged.
- [ ] Footer: **See my parts list** → `step=list`. Disabled with 0 parts. Hide `RenderCost`.
- [ ] Remove the "Add your photo" caption under the 3D preview when off.
- [ ] Commit `feat(cars): popular builds and Help me choose lead the build step`.

### 4. Step 3: parts list

- [ ] First, extract `BuildReport` (spec §4a) from `routes/builds/$slug_.report.tsx`, and
  make the report page use it. Check the report page looks unchanged before moving on.

- [ ] `closestPreset(presets, partIds)` in `src/lib/recommend.ts` (pure). Spot-check with
  `npx tsx -e`: exact match, partial match, no overlap, tie.
- [ ] `step` gains `list`; `review` maps to `list` when off. `StepIndicator`: "3 Your parts list".
- [ ] `PartsListStep`: spec §2. Full `ShopList` with `vehicleId`, then `BuildReport`
  (labour and advisories), Print, Edit parts,
  Copy link (`navigator.clipboard`, with a visible "Copied"). 3D as on step 2.
- [ ] With no valid parts in the URL, send the user to step 2.
- [ ] Commit `feat(cars): parts list step`.

### 5. Build pages, header, copy

- [ ] Build page: **Customize this build** → `step=parts`. `getBuild` returns
  `toPublicPart` when off. Replace the report upsell with `BuildReport` and a Print button.
- [ ] `SiteHeader`: hide Sign in, credits and My projects for visitors when off. A
  signed-in admin keeps a Sign out, and a link to `/admin`.
- [ ] Home hero, meta descriptions, `/build` description and `pageMeta` copy per spec §5.
  Search `src` for "your own truck", "your truck", "photo", "Sign in", "credits", and check every hit.
- [ ] Commit `feat(cars): MVP copy and navigation`.

### 6. Verify, on `cars-credits`, 375 px and desktop

Local dev needs affiliate links on the branch, which has none: load them with
`parts:links` against `cars-credits` first.

- [ ] Full path on each of the 7 vehicles: pick → popular build → parts list. Buttons
  appear, photo is right.
- [ ] Help me choose → list. Hand-picked parts → list shows "Closest look".
- [ ] Per-vehicle link: F-150 and Silverado list → Bilstein goes to different ASINs, with the tag.
- [ ] Tacoma with BAKFlip → the Tacoma ASIN. Part with no link → no button.
- [ ] Bad `?vehicle=` on `/go` → default link or 404, no 500.
- [ ] Report content: a build with suspension, lighting and a Custom Fabrication part shows
  the labour line and the matching advisories, on step 3 and on the build page, signed out.
- [ ] Print preview of step 3 (headless Chrome `--print-to-pdf=out.pdf`): parts, totals and
  advisories readable; no header, footer or 3D.
- [ ] Shared `step=list` URL in a private window matches.
- [ ] Direct POSTs to `checkPhoto`, `startBuild`, `createInvoice` → refused. Check no Gemini
  calls in logs across the whole run.
- [ ] Old links: `/builds/<slug>`, `?step=review`, `?step=photo`, `?step=questions`,
  `/credits`, `/builds/<slug>/report`.
- [ ] `/sign-in` and `/admin` still work for the admin.
- [ ] Hydration clean in the console; page scrolls over the 3D preview.
- [ ] Gate passes; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry`.

### 7. Ship (ask first)

- [ ] Ask to merge and deploy. After deploy: live pass of the checks above with
  headless Chrome, and `/build?vehicle=f150&step=parts` CPU from `wrangler tail`
  (10 warm requests, p50/p95). If p50 is over 10 ms, stop and report.
- [ ] Log in `.agents/logs/`, current-work line in `plans/active.md`.

## Done when

Spec 7 §6 holds, results are logged with how each was tested, and merge and deploy had
the user's OK.
