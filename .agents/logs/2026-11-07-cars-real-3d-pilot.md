# 2026-11-07 — cars: realistic 3D pilot (Tacoma, LagzDesign CC BY)

## What changed
- `src/lib/visuals.ts`: added `VEHICLE_MODELS` (`tacoma-3g` → GLB URL) and `hasRealModel()`.
- `src/components/preview3d/RealVehicle.tsx` (new): loads the GLB via `useGLTF` with meshopt decoding, scales to match the stylized scene, applies lift to the body node, keeps the model's own wheels.
- `src/components/preview3d/Scene.tsx`: uses `RealVehicle` when `hasRealModel(vehicleId)`, otherwise the stylized `VehicleBody`.
- `src/components/SiteFooter.tsx`: CC BY credit line.

## Model
- Source: Toyota Tacoma TRD by LagzDesign (Sketchfab), CC Attribution 4.0.
- License: https://creativecommons.org/licenses/by/4.0/ — commercial use allowed, attribution required.
- Author: LagzDesign (cgtrader: LAGZ3D).
- Link: https://sketchfab.com/3d-models/toyota-tacoma-trd-f13b2c73a13147a69a6d2a83f72b2505
- License proof saved to: ~/Documents/smartekai-assets/tacoma-pilot/model-proof/
- Original FBX inspected: wheels are separate objects (fl_tire, fr_tire, rl_tire, rr_tire, fl_rim, fr_rim, rl_rim, rr_rim) → separable.
- GLB: 142.87 KB, 23,832 triangles, meshopt + WebP compressed, no Draco.

## Production
- Uploaded to `cars-renders/models/tacoma-3g.glb` (public, long cache). Returns 200 `model/gltf-binary`.
- Deployed version `402f57cd-a841-4285-aea4-8e467357a769`.

## Live check
- View at: https://overlander.smartekai.com/build?vehicle=tacoma-3g&step=parts
- Only `tacoma-3g` uses the real model; all other vehicles keep the stylized preview.

## Next
- User evaluates on phone: go (roll out to more vehicles) or no-go (remove pilot, delete GLB).