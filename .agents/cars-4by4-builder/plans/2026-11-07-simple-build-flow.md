# Simple build flow — Implementation Plan

> For agentic workers: use superpowers:executing-plans. Steps use `- [ ]`.
> Spec: `.agents/cars-4by4-builder/specs/2026-11-07-simple-build-flow-design.md`. Read it first.

**Goal:** replace truck → questions → parts → photo with **Your truck → Your build →
See it**, with the photo choosing the truck.

## Ground rules

- Your own git worktree, branch `feat/cars-simple-flow` from `main`. Never commit to
  `main`; never change branch in the shared checkout.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- No schema change, no new dependencies.
- Tailwind only scans `src/components` and `src/routes`: class strings in `src/lib`
  are not generated.
- Local dev on the Neon branch `cars-credits` only.
- **Ask first:** real photo tests beyond the budget below (each upload is one Gemini
  call; each render is one more), merge, deploy.
- Validate by clicking through in a real browser at 375 px and desktop. Reading code
  doesn't count as testing.

## Files

- Create `src/lib/match-vehicle.ts`, `src/components/TruckStep.tsx` (replaces
  `PhotoStep`'s upload half), `src/components/ReviewStep.tsx`,
  `src/components/StepIndicator.tsx`, `src/components/Panel.tsx`.
- Modify `src/lib/builds.ts` (`checkPhoto`), `src/routes/build.tsx`,
  `src/components/HelpMeChoose.tsx`, `src/components/BuildFooter.tsx`,
  `src/components/BuildPreview3D.tsx` usage, `src/routes/builds/$slug.tsx` (both
  `step: "photo"` links).
- Delete `src/components/PhotoStep.tsx` once nothing uses it.

## Steps

### 1. Match the photo to a vehicle

- [ ] `matchVehicle(make, model): string | null` per spec §2. Spot-check with
  `npx tsx -e`: `Toyota/Tacoma` → `tacoma-3g`; `Ford/F-150` and `Ford/F150` → `f150`;
  `Chevrolet/Silverado 1500` → `silverado-1500`; `GMC/Sierra` → `sierra-1500`;
  `Toyota/Land Cruiser` → `lc300`; `Nissan/Patrol` → `patrol-y62`; `Jeep/Wrangler` →
  `wrangler-jl`; `Toyota/Hilux` → null; `null/null` → null; `Ford/Ranger` → null.
- [ ] `checkPhoto` per spec §6, with the placeholder comment. Keep the type, size and
  rate-limit checks and the delete-on-failure paths. Catch detection errors and return
  a `fail` instead of throwing, so the UI can offer "Pick a model instead".
- [ ] Commit `feat(cars): match an uploaded photo to a supported vehicle`.

### 2. Step 1

- [ ] `validateSearch`: `step` is `vehicle | parts | review`; add `photoId` and `help`;
  map old `photo` and `questions` per spec §5.
- [ ] `StepIndicator`: "1 Your truck · 2 Your build · 3 See it"; earlier steps are
  tappable; replaces the "Step n of 3" text.
- [ ] `TruckStep`: the two choices and all result states in spec §2. Reuse
  `PhotoDropzone` and `ensureGuestSession`. Picking or confirming goes to
  `step=parts`, keeping `parts`.
- [ ] Commit `feat(cars): truck step, photo first`.

### 3. Step 2

- [ ] Remove the `questions` step. Add `Panel`, and open `HelpMeChoose` in it from the
  "Not sure? 4 quick questions" card (`help=1` opens it). Its Skip becomes close.
- [ ] Keep fitting parts when the truck changes, and show the removal notice. Note the
  configurator loader only returns the selected vehicle's parts, so compare
  `search.parts` with what it returned, after it has loaded; the names of removed parts
  aren't in that data, so say the count if names aren't available.
- [ ] Phone: 3D behind "Show 3D preview"; `BuildPreview3D` isn't rendered until
  tapped. Desktop unchanged. Check at the breakpoint without a hydration mismatch
  (start collapsed everywhere, expand on mount for `lg`).
- [ ] Footer: **Next: see it**.
- [ ] Commit `feat(cars): one-screen build step`.

### 4. Step 3

- [ ] `ReviewStep` per spec §4. Move `start()`, `blockAction` and the retry-with-credits
  logic from `PhotoStep`. Button label from `useCredits`.
- [ ] Hide the sticky footer on this step; the summary carries the total.
- [ ] `$slug.tsx`: "Make it yours" links go to `step=vehicle` keeping `parts`.
- [ ] Delete `PhotoStep.tsx`.
- [ ] Commit `feat(cars): review step with the cost on the button`.

### 5. Verify (`cars-credits`, 375 px and desktop)

Gemini budget: **up to 5 uploads and 2 renders**. Say so before starting.

- [ ] Tacoma photo → "Looks like a Toyota Tacoma" → Continue → parts for the Tacoma.
- [ ] Silverado photo → Silverado selected. **The mismatch can't happen silently.**
- [ ] Unsupported truck (e.g. Hilux) → closest-match prompt; the render's prompt
  describes the real truck, with the chosen truck's parts.
- [ ] A photo with no vehicle → message and "Pick a model instead".
- [ ] Pick a model → studio photo → render works.
- [ ] Questions panel: opens, pre-ticks, closes; Esc and backdrop close; "Why" lines show.
- [ ] Change truck: fitting parts stay, notice shows.
- [ ] Button states: free, credits, guest with free render used, out of credits.
- [ ] Old links: `?step=photo`, `?step=questions`, "Make it yours".
- [ ] Refresh on each step; back button; share a step 2 URL in a private window.
- [ ] Phone width: the network tab shows no 3D chunk until "Show 3D preview" is tapped.
- [ ] Gate passes; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry`.

### 6. Ship (ask first)

- [ ] Ask to merge and deploy. After deploy: walk the flow on overlander.smartekai.com
  with a studio photo, and record `/build` CPU from `wrangler tail`.
- [ ] Log in `.agents/logs/`, current-work line in `plans/active.md`.

## Done when

Spec 6 §7 holds, with results logged, and merge and deploy happened only with the
user's OK.
