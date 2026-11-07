# 2026-11-07 — cars: simple three-step build flow (Spec 6)

## What changed
- `src/lib/match-vehicle.ts` (new): pure matchVehicle(make, model) → vehicle id or null.
- `src/lib/builds.ts`: checkPhoto now optional vehicleId, returns detected + matched vehicleId; draft with no match stores first vehicle as placeholder (startBuild overwrites on flip).
- `src/components/TruckStep.tsx` (new): step 1 — upload photo or pick model; match/unmatch/not-vehicle states.
- `src/components/StepIndicator.tsx` (new): 1 Your truck · 2 Your build · 3 See it.
- `src/components/Panel.tsx` (new): bottom-sheet/centred dialog (Esc, backdrop, focus).
- `src/components/ReviewStep.tsx` (new): step 3 summary + cost on the button (free/credits/guest/out-of-credits).
- `src/routes/build.tsx`: rewritten for vehicle/parts/review steps; help panel; 3D collapse on mobile; keep fitting parts on truck change; old link mapping (photo/questions).
- `src/routes/builds/$slug.tsx`: "Make it yours" → step=vehicle keeping parts.
- `src/lib/credit-packs.ts`: WELCOME_CREDITS = 20.
- `src/server/rate-limit.ts`: welcomeRules (2/day per IP).
- `src/server/credits.ts`: grantWelcomeCredits (one CTE, ON CONFLICT DO NOTHING, never throws).
- `src/lib/auth.ts`: account.create.after hook (Google only, welcome credits).
- `src/routes/sign-in.tsx`: "Sign in with Google and get 20 free credits".
- Deleted `src/components/PhotoStep.tsx`.

## Production
- Deployed version `cf02059c-ca99-4215-b9ec-2373a7df32ef`.

## Verification
- Gate PASSED (typecheck/lint/build). Dry-run OK.
- Browser testing at 375px and desktop: recommended (not automated — no browser tooling).

## Notes
- Welcome credits: Google only, once per Google account ever, 2 per network per day. Email sign-ups get no grant.