# "Help me choose" questions — Implementation Plan

> For agentic workers: use superpowers:executing-plans. Steps use `- [ ]`.
> Spec: `.agents/cars-4by4-builder/specs/2026-11-02-interactive-builder-design.md` §2.
> Do this after the Tacoma plan (so the rules cover 7 vehicles).

**Goal:** an optional question step that pre-ticks fitting parts and explains
why, with no AI, no server code and no database change.

## Ground rules

- Branch `feat/cars-help-me-choose` from `main`. Never commit to `main`; merging
  and deploying need the user's OK.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- No server functions, no DB, no new dependencies.
- Local dev against `cars-credits` (`npm run dev-vars` with the branch URL, then
  `npm run dev -w cars-4by4-builder`, port 3002).

## Files

- Create `apps/cars-4by4-builder/src/lib/recommend.ts` — types, `PART_TRAITS`, `recommend()`.
- Create `apps/cars-4by4-builder/src/components/HelpMeChoose.tsx` — the question screen.
- Modify `apps/cars-4by4-builder/src/routes/build.tsx` — search params, the new step, "why" lines.
- Modify `apps/cars-4by4-builder/src/components/PartCard.tsx` — optional `reason` prop.

## Steps

### 1. `recommend.ts`

- [ ] Types:

```ts
export type Use = "overland" | "trail" | "desert" | "daily";
export type Budget = "2k" | "5k" | "10k" | "any";
export type Lift = "stock" | "mild" | "big";
export type Install = "diy" | "shop";
export type Answers = { use?: Use; budget?: Budget; lift?: Lift; install?: Install };
type Slot = "lift" | "shocks" | "tyres" | "wheels" | "rack" | "tent" | "awning"
  | "front" | "sides" | "under" | "lights" | "recovery" | "snorkel" | "bedcover";
```

- [ ] `PART_TRAITS: Record<string, { slot: Slot; scores: Record<Use, 0|1|2|3>; lift?: "mild"|"big"; needsLift?: true }>`
  covering **all 24 part ids** (check against `src/seed/parts.ts`). Suggested
  scores (adjust with judgement, keep them in one table):
  - overland: racks/tents/awning 3, KM3 3, Bilstein/OME/foam-cell 2–3, bumpers 2, winch 2, snorkel 2;
  - trail: sliders/underbody/winch 3, KM3 3, mild lift 3, beadlock 2;
  - desert: 6" lift 3, Nitto 35" 3, beadlock 3, light bar/pods 3, stealthbar 2;
  - daily: Fuel wheels 3, bilstein 2, tonneau 3, mild lift 1, pods 1.
  Mark `rough-country-lift-kit`, `ome-bp51`, `ironman-foam-cell` as `lift: "mild"`,
  `rough-country-6in-lift` as `lift: "big"`, `nitto-ridge-grappler-35` as `needsLift`.
  A missing trait entry must be a type error or a thrown error at module load,
  not a silent skip.
- [ ] `recommend(answers, parts, vehicleId)` per spec §2:
  1. fitting parts only; drop `lift` parts if `lift === "stock"`, `big` lifts if
     `"mild"`, `needsLift` parts if `"stock"`; drop `Custom Fabrication` if
     `install === "diy"`; with `lift === "big"` prefer the big lift for the `lift` slot.
  2. score = `scores[use]` (no `use` → sum of all scores / 4); sort by score desc,
     then price asc, then id (deterministic).
  3. one part per slot; shocks are skipped when a lift kit with its own shocks is
     picked (`rough-country-6in-lift`, `ome-bp51`, `ironman-foam-cell`);
     `needsLift` parts only if a lift was picked; a tent only if a rack is picked
     or the vehicle has no rack option.
  4. add in score order while total `priceUsd` ≤ ceiling (`2k` 2000, `5k` 5000,
     `10k` 10000, `any`/none ∞), max `MAX_PARTS`.
  5. reason per picked part, e.g. `"Overlanding pick · within $2–5k"`,
     `"Big lift"`, `"DIY bolt-on"` (join the relevant fragments with " · ").
  Returns `{ partIds, reasons }`.
- [ ] Spot-check with `npx tsx -e` (import from the file) for: F-150 + desert/10k/big/shop
  (expects the 6" lift, Nitto 35, beadlock, light bar); Land Cruiser +
  overland/5k/mild/diy (no fabrication parts, total ≤ 5000); Wrangler + no answers
  (non-empty, deterministic: run twice, same output); any vehicle + `lift: stock`
  (no lift, no 35"). Paste the outputs in the commit body or the log.
- [ ] Commit `feat(cars): rules-based part recommendations`.

### 2. Question screen

- [ ] `build.tsx` `validateSearch`: add `use`, `budget`, `lift`, `install`
  (accept only the listed values) and `step: "questions"` (add to `STEPS`; the
  progress text stays "Step n of 3" by not counting `questions`, or say
  "Optional" — keep it simple).
- [ ] After the vehicle is picked, go to `step=questions` (not `parts`). Presets
  still jump straight to `parts`.
- [ ] `HelpMeChoose.tsx`: the four questions as large tappable option buttons
  (one choice each, re-tap to clear), `Show my build` and `Skip` buttons. Mobile
  first, matches existing Tailwind tokens/components (look at `VehiclePicker`).
- [ ] `Show my build` → `navigate({ search: { ...answers, parts: recommend(...).partIds, preset: undefined, step: "parts" } })`.
  `Skip` → `step=parts` with no answers.
- [ ] Parts step: a small "Help me choose" link → `step=questions` keeping the
  current answers.
- [ ] Commit `feat(cars): Help me choose step`.

### 3. "Why" on ticked cards

- [ ] Parts step computes `reasons` from the URL answers (`recommend(...)`) —
  only when at least one answer is set.
- [ ] `PartCard` takes `reason?: string` and shows `Why: {reason}` under the
  title only when the part is selected and has a reason.
- [ ] Commit `feat(cars): explain recommended parts`.

### 4. Verify (branch, desktop + 375 px wide)

- [ ] Pick F-150 → questions appear; Skip → parts with nothing ticked (as today).
- [ ] Answer desert/10k/big/shop → parts step opens with the expected parts
  ticked, each with a "Why"; total ≤ $10k; the footer price matches.
- [ ] Untick one → it loses its "Why"; refresh → same state (URL); copy the URL to
  a private window → same state.
- [ ] Preset pills still work and don't show "Why".
- [ ] Continue to the photo step and start a render → unchanged behaviour (the
  `parts` param is what `startBuild` receives).
- [ ] Gate; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry`.

### 5. Ship (ask first)

- [ ] Ask to merge and deploy. After deploy: `/build?vehicle=f150&step=questions`
  200; `wrangler tail` CPU for `/build` recorded (should be unchanged — the logic
  is client-side).
- [ ] Log + current-work line in `.agents/cars-4by4-builder/plans/active.md`.

## Done when

Questions are optional, pre-tick only fitting parts within budget with a reason,
survive refresh/share via the URL, and changed no server code; gate passes;
merged/deployed with the user's OK.
