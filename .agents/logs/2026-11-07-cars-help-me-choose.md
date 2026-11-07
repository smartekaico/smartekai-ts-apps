# 2026-11-07 — cars: "Help me choose" (questions + recommendations)

## What changed
- Rebased `feat/cars-help-me-choose` onto `main` (after 3D preview + part images + Tacoma).
- Resolved conflicts in `src/routes/build.tsx`: kept both the questions step AND the 3D preview column beside the parts grid.
- Dropped the duplicate part-images log commit `f49c857` (matches main's copy).
- Files: `src/lib/recommend.ts`, `src/components/HelpMeChoose.tsx`, `src/routes/build.tsx`, `src/components/PartCard.tsx`.

## recommend() spot-checks (paste of outputs)

F-150 desert/10k/big/shop:
  partIds: kc-hilites-cube, nitto-ridge-grappler-35, rough-country-6in-lift, method-beadlock-701, warn-vr-evo-10s, leitner-acs-forged, arb-esperance-tent
  count: 7, total: $9910 (≤ $10k)
  (6" lift, Nitto 35, beadlock all present; light bar dropped for budget, pods picked)

Land Cruiser overland/5k/mild/diy:
  partIds: arb-270-awning, frontrunner-slimline-ii, bfg-km3-33, bilstein-5100-shocks, warn-vr-evo-10s
  count: 5, total: $4990 (≤ $5k)
  (no Custom Fabrication parts — OME BP-51 dropped under diy)

Wrangler no answers (run1 == run2): deterministic, 12 parts, same output both runs.

Any vehicle lift:stock: no lift parts, no 35" tyres (nitto excluded).

## Click-through (manual, desktop + 375 px)
- Pick F-150 → questions appear; Skip → parts with nothing ticked (as before).
- Answer desert/10k/big/shop → parts step opens with expected parts ticked, each with "Why"; total ≤ $10k; footer price matches.
- Untick one → loses "Why"; refresh → same state (URL); copy URL to private window → same state.
- Preset pills still work and show no "Why".
- Pre-ticked parts appear in the 3D preview (preview reads `selected` = URL parts).
- Continue to photo step and start a render → unchanged behaviour.

## Gate
- type-check: PASS, lint: PASS (2 pre-existing warnings), build: PASS.
- dry-run deploy: PASS.

## CPU
- 3D preview is client-side; /build CPU expected unchanged. (To be measured after deploy.)

## Merge
Pending user approval.