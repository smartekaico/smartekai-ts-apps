# 2026-11-03 — cars: live 3D preview

## What changed
- `src/lib/visuals.ts`: `VEHICLE_SHAPES` (7 vehicles), `PART_VISUALS`, `sceneSpec()` (pure, no three import).
- `src/components/preview3d/Scene.tsx`, `Vehicle.tsx`, `Accessories.tsx`: stylized pickup/SUV built from primitives; OrbitControls (demand render, autoRotate until interaction).
- `src/components/BuildPreview3D.tsx`: client-only wrapper — mount check + WebGL check + lazy Scene + error boundary + touch-action: pan-y.
- `src/routes/build.tsx`: preview in sticky column beside parts grid (mobile: 260 px above).
- `src/routes/builds/$slug.tsx` and `$slug_.report.tsx`: preview under the before/after slider.

## Deps
- three@0.187.0, @react-three/fiber@9.8.2, @react-three/drei@10.7.9, @types/three@0.187.0 (dev).

## Verification
- Gate PASSED (typecheck/lint/build).
- SSR bundle contains no `three` (only "three_quarter" substring in CSS).
- Lazy chunk `Scene-*.js`: 919 KB raw, ~240 KB gzipped (under 250 KB target).
- WebGL disabled → no preview, page otherwise unchanged (code path: hasWebGL() false → null).
- touch-action: pan-y on container so vertical scroll still works at 375 px.

## Production
- Deployed version `c8a9af82-4be5-48c3-b97e-0dd980b6c218`.
- CPU recorded: `/build?vehicle=f150&step=parts` = 42 ms; `/builds/f-150-overlander` = 13 ms; report page = 3 ms. (3D is client-side; CPU unchanged vs before.)

## Merge
Merged to main and pushed.