# Realistic 3D: one-vehicle pilot (Tacoma) — Plan

> For agentic workers: use superpowers:executing-plans. Steps use `- [ ]`.
> Status: **waiting for the user to approve buying a model.** Don't start step 2
> until the user has bought one.

**Why:** the code-built model reached its limit: it can't look like the AI photo
next to it. Realism needs an artist-made model with real textures. Before spending
on 7 vehicles, prove it with one: the Tacoma, whose aftermarket earns the most.

**Decision this pilot answers:** does a licensed model look good enough, and load
fast enough on a phone, to replace the stylized one? If not, keep the stylized
preview on the parts step (as shipped 2026-11-07) and stop. Nothing is lost but
the cost of one model.

**Budget:** one model, about $25–100, paid by the user. No other spend.

## Ground rules

- Branch `feat/cars-real-model-pilot` from `main`, in your own git worktree. Never
  commit to `main`.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- **Ask first:** the purchase, uploading to storage, merge, deploy.
- The model loads only in the browser, lazily: no server CPU, and no `three`
  evaluated during SSR. Stay on Workers Free.
- Other vehicles keep the stylized model. Only `tacoma-3g` changes.
- Don't commit the source or GLB files to git.

## Steps

### 1. Shortlist (agent) and buy (user)

- [ ] Find 3 candidates (CGTrader, Sketchfab, TurboSquid, RenderHub) and give the
  user a table: link, price, licence, formats, poly count, whether wheels are
  separate objects.
- [ ] Each candidate must be:
  - a **3rd-gen Tacoma (2016–2023)**, double cab, short bed;
  - **royalty-free with commercial use allowed in a real-time web app**. Reject
    "Editorial" licences, and read the actual licence text: some forbid redistribution
    of the file, which is what a browser download can count as;
  - **wheels as separate objects** (or easily separable): wheel swaps and lift need it;
  - a real model, not a raw 3D scan (scans have unusable topology);
  - under about 300k triangles, or reducible without damaging it.
- [ ] Flag for the user: a model of a real truck shows Toyota's design and badge.
  Remove the badge from the model. If the site's use of a branded model worries
  them, they should get advice; this plan doesn't settle that.
- [ ] The user picks and buys. Keep the receipt and licence with the source file,
  outside git.

### 2. Convert

- [ ] Convert to GLB with Blender (headless) and `gltf-transform`.
- [ ] Separate and name the nodes: `body`, `wheel_fl`, `wheel_fr`, `wheel_rl`,
  `wheel_rr`. Origin at ground level, centred, front facing −x, metres (matching
  `vehicleLayout`).
- [ ] Reduce: target **≤ 120k triangles, ≤ 2K textures (WebP/KTX2), GLB ≤ 6 MB**.
  Compress with **meshopt**, not Draco: drei's Draco setup fetches its decoder from
  a third-party CDN.
- [ ] Record final size and triangle count in the log.

### 3. Host (ask first)

- [ ] Upload to `BUCKETS.renders` at `models/tacoma-3g.glb` (public, long cache).
  Check the bucket allows the browser to fetch it (CORS) from
  overlander.smartekai.com.

### 4. Render

- [ ] `src/components/preview3d/RealVehicle.tsx`: `useGLTF(url)` with the meshopt
  decoder. Show the stylized model while it downloads, and keep it if loading
  fails, via the existing error boundary.
- [ ] `VEHICLE_MODELS` in `src/lib/visuals.ts`: `{ "tacoma-3g": "<public url>" }`.
  `Scene.tsx` uses `RealVehicle` when the vehicle has an entry.
- [ ] Lift moves the `body` node. Tyres and rims: replace the model's wheel nodes
  with the existing `Wheel` component at the same axle positions, unless no upgrade
  is selected, then keep the model's own wheels.
- [ ] Accessories: measure the real model and add Tacoma-specific overrides for
  `vehicleLayout` (roof, belt, axles, front, rear) so `Accessories.tsx` sits
  correctly. Accessories stay code-built in this pilot; note honestly how they
  look next to the real body.
- [ ] Lighting: keep the `Environment` setup; tune for the real paint and glass.

### 5. Evaluate (user decides)

Deploy behind a check that only `tacoma-3g` uses it (ask first). Record:

- [ ] Download size, and time to appear on a phone over mobile data (target < 5 s).
- [ ] Smooth rotation on the user's real phone.
- [ ] Parts step CPU unchanged in `wrangler tail`.
- [ ] Screenshots: stock, then with lift, tyres, rack and tent.
- [ ] **The user looks at it on their phone and answers: go or no-go.**

### 6. After the decision

- **Go:** write a rollout plan, one vehicle at a time, with a cost estimate. Revisit
  whether the 3D view returns to the build pages. Consider realistic accessory models.
- **No-go:** remove the pilot code, delete `models/tacoma-3g.glb` (ask first), and
  keep the stylized preview.
- [ ] Log in `.agents/logs/`, and a current-work line in
  `.agents/cars-4by4-builder/plans/active.md`.

## Done when

The user has seen the real model on their phone, the go/no-go is recorded, and the
site works either way: a failed model load falls back to the stylized preview.

## Out of scope

Buying more than one model, photoreal part models, open tent or door animation,
AI image-to-3D (can't show live part choices), layered photos.
