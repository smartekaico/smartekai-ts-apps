# Spec 5 — Interactive builder: Tacoma, "Help me choose", live 3D preview

**Date:** 2026-11-02 · **Status:** approved design · **App:** `apps/cars-4by4-builder`
(live at overlander.smartekai.com)

## 0. Why and constraints

The app leans on the AI photo render (Gemini) for its "wow". This spec makes the
builder interactive without AI: guided questions that pick parts, and a live 3D
preview that changes as parts are ticked. It also adds the Toyota Tacoma.

Decided with the user:

| Question | Decision |
|---|---|
| Hosting | Stay on **Workers Free** until the whole app is built. Nothing here may add server CPU: questions are pure client/URL logic, 3D renders in the browser only. |
| Affiliates | Amazon only until AvantLink approves. Blog postponed to last. |
| Tacoma | **3rd generation, 2016–2023**, one vehicle. |
| Questions output | **Pre-tick parts + a one-line "why" per part.** Nothing saved; answers live in the URL. |
| 3D style | **Stylized, one parametric model per body type** (pickup, SUV), built in code with `three` + `@react-three/fiber`. No licensed models, no 3D artist. |
| 3D placement | **Live preview on the parts step**, updating as parts are ticked; the same viewer on the build report and public build page. |

Build order — three independent sub-projects, each with its own plan and
usable on its own:

1. Tacoma → `plans/2026-11-02-tacoma.md`
2. Part images (added 2026-11-02, not part of this spec's design: AI
   illustrations + category icons, and `db:seed` stops wiping images/links)
   → `plans/2026-11-02-part-images.md`
3. Help me choose → `plans/2026-11-02-help-me-choose.md`
4. Live 3D preview → `plans/2026-11-02-3d-preview.md`

## 1. Toyota Tacoma (3rd gen)

- Vehicle `{ id: "tacoma-3g", name: "Toyota Tacoma", yearRange: "2016–2023", sortOrder: 7 }`,
  preset slug prefix `tacoma`.
- Fitment: joins the truck group. Every part that fits `TRUCKS` today also fits
  the Tacoma (tyres, wheels, Bilstein, both Rough Country lifts, light bar, cube
  lights, winch, both tents, Leitner rack, BAKFlip). Same 3 truck presets →
  3 new curated builds.
- Links: per-vehicle rows (`…,tacoma-3g`) in the links CSV; the Tacoma's
  bolt pattern is 6x139.7 (as GM) but listings must still be checked per part.
  Universal default links (tyres, lights, winch, tent) apply automatically.
- Gemini: 1 stock photo + 3 gallery renders, user go-ahead first.
- No schema change.

## 2. "Help me choose"

**Flow:** vehicle → *(optional)* questions → parts → photo. The questions screen
has **Skip**; the parts step has a "Help me choose" link back to it.

**Questions (one screen, all optional; unanswered = no constraint):**

| Key | Question | Values |
|---|---|---|
| `use` | What's it for? | `overland`, `trail`, `desert`, `daily` |
| `budget` | Parts budget | `2k`, `5k`, `10k`, `any` (under $2k / $2–5k / $5–10k / $10k+) |
| `lift` | How high? | `stock`, `mild`, `big` |
| `install` | Who installs? | `diy`, `shop` |

**Rules — `src/lib/recommend.ts`, pure, no I/O:**

```ts
recommend(answers: Answers, parts: Part[], vehicleId: string):
  { partIds: string[]; reasons: Record<string, string> }
```

- Only parts that fit the vehicle.
- Each part has a suitability score per `use` (0–3) in a code map
  `PART_TRAITS` next to the function, plus flags: `isLift: "mild" | "big"`,
  `needsLift` (35" tyres), `fabrication` (from `fitmentDifficulty === "Custom Fabrication"`).
- `lift: stock` excludes lifts and `needsLift` parts; `mild` excludes `big` lifts;
  `big` prefers the `big` lift where the vehicle has one.
- `install: diy` excludes fabrication parts.
- Pick at most one part per "slot" (lift, shocks, tyres, wheels, rack, tent,
  bumper/armour, lights, recovery, bed cover), highest score first, then add
  greedily while the running `priceUsd` total stays within the budget ceiling.
  Max `MAX_PARTS` (12).
- Every picked part gets a reason string built from the answers, e.g.
  `"Overlanding + $2–5k"`, `"Big lift"`, `"DIY-friendly bolt-on"`.
- Deterministic: same inputs → same output.

**State:** answers are search params on `/build` (`use`, `budget`, `lift`,
`install`) alongside the existing `vehicle`, `parts`, `step`. Submitting writes
`parts` from `recommend()` and `step=parts`. The parts step recomputes `reasons`
from the URL answers and shows "Why: …" under each **ticked** card that has a
reason. Unticking a part just removes it. No server function, no DB.

## 3. Live 3D preview

**Stack:** `three` + `@react-three/fiber` (+ `@react-three/drei` only for
`OrbitControls`, imported by path). Exact versions pinned at install time.
The viewer module is **client-only**: `React.lazy` + a mounted check, never
rendered during SSR, so it adds zero Worker CPU and nothing to the server
bundle's work.

**Model:** two parametric low-poly bodies built from primitives
(boxes/extrusions/cylinders), not imported meshes:

- `pickup` — cab + bed; `suv` — single box body.
- Per-vehicle dimensions in `src/lib/visuals.ts` (`VEHICLE_SHAPES`, keyed by
  vehicle id): `body`, `length`, `wheelbase`, `height`, `bedLength` (pickup),
  `colour`. F-150/Silverado/Sierra full-size, Tacoma mid-size, Wrangler short SUV,
  LC300/Patrol long SUV.

**Parts → visuals** (`PART_VISUALS` in `src/lib/visuals.ts`, keyed by part id;
a part without an entry changes nothing):

| Visual | Effect | Parts |
|---|---|---|
| `lift` (inches) | raise body/suspension gap | RC 2.5", RC 6", OME BP-51, Ironman foam cell, Bilstein (≈1") |
| `tyre` (diameter) | larger tyres | BFG 33", Nitto 35" |
| `wheel` (style) | rim style/colour | Fuel Vector, Method 701 |
| `lightbar` | roof-line bar | Rigid 40" |
| `pods` | bumper pods | KC cube |
| `roofRack` / `bedRack` | rack geometry | Front Runner / Leitner |
| `tent` | closed hard-shell box on rack/roof | ARB Esperance, Ironman tent |
| `awning` | rolled awning on rack side | ARB 270 |
| `bumper` | bull bar / stealth bar | ARB Summit, ARB StealthBar |
| `winch` | winch on bumper | Warn |
| `snorkel` | A-pillar snorkel | Ironman snorkel |
| `sliders` | rock sliders | Ironman sliders, Smittybilt SRC |
| `skid` | underbody plate | ARB underbody |
| `tonneau` | flat bed cover | BAKFlip |

Conflicts resolved by rule: the largest lift and tyre win; a tent needs a rack
(roof rack on SUVs, bed rack on pickups) — if none is selected, a minimal rack is
drawn under it.

**Component:** `<BuildPreview3D vehicleId partIds />` in
`src/components/preview3d/`. Pure function `sceneSpec(vehicleId, partIds)` →
plain data (dimensions + visuals); React components only draw that data, so the
mapping is checkable without WebGL.

**Where:** parts step (beside the list on desktop, above it on mobile, ~300px
tall), build report, public build page. Controls: drag to rotate, wheel/pinch
zoom (clamped), slow auto-rotate until the first interaction.

**Performance:** `frameloop="demand"`, `dpr={[1, 1.5]}`, one directional light +
ambient, no real-time shadows (a soft blob under the car), geometry built once per
`sceneSpec`. Target: < 250 KB gzipped extra JS for the lazy chunk, 60 fps on a
mid-range phone.

**Fallback:** no WebGL or the chunk fails → render nothing and keep today's
layout (part images). The AI photo render stays as the optional "see it on your
car" step.

## 4. Testing (no test suite exists)

- Pure functions (`recommend`, `sceneSpec`) spot-checked with `npx tsx -e` on
  fixed inputs.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...` and
  `npx wrangler deploy --dry-run --outdir /tmp/cars-dry` (record bundle size).
- Click-through on the `cars-credits` branch, desktop + a phone-width window;
  3D also on a real phone after deploy.
- `wrangler tail` after each deploy: `/build` and a report page stay within the
  Free budget (≤ 10 ms CPU typical; record the numbers).

## 5. Out of scope

Saving answers to the DB, accounts-only features, AI in the questions, realistic
or licensed 3D models, AR, exporting images from the 3D view, Tacoma 4th gen,
AvantLink links (separate plan), the blog.
