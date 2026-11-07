# Save Gemini credits — Implementation Plan

> For agentic workers: use superpowers:executing-plans. Steps use `- [ ]`.
> **Start only after `plans/2026-11-07-simple-build-flow.md` has merged:** step 3 of
> the flow (`ReviewStep`) is where most of this lands.

**Goal:** stop paying Gemini for images we already have, and cut the cost of free ones.

**Why it's worth doing:** a render costs about **$0.067** (Gemini 3.1 Flash Image, 1K).
Ten credits sell for $1.40, so paid renders are healthy. The cost is **free** use: the free
render and the 20 welcome credits. Don't degrade paid renders to save money.

**Related config:** `CARS_DAILY_RENDER_CAP` lowered from 200 to 40 (about $2.70 a day
worst case).

## Ground rules

- Your own git worktree, branch `feat/cars-save-gemini` from `main`. Never commit to `main`.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- **Ask first:** production DDL, every Gemini run (give the call count), merge, deploy.
- Rehearse on the Neon branch `cars-credits`. Never `db:push:cars`.
- Tailwind only scans `src/components` and `src/routes`.
- Workers Free: the lookups below must stay small.

## 1. Reuse studio renders (the main saving)

Same studio photo, same parts → same result. Generate once, and later requests get it
instantly with no Gemini call and **no credit or free render used**.

- [ ] `findReadyRender(vehicleId, partIds)` in `src/server/`: the newest `completed` build
  with `original_image_key` = the vehicle's stock key, a `render_key`, and the exact same
  part set. Compare as sets with `selected_part_ids @> $1 AND selected_part_ids <@ $1`:
  presets aren't stored sorted. Only stock-photo builds qualify, **never a customer's own
  photo**.
- [ ] `startBuild` with no `buildId`: check this **before** rate limits and charging. On a
  hit, insert a new `completed` row for this user pointing at the same `render_key`, with
  `charge: null`, and return its id. It shows up in My projects like any other build.
- [ ] **Shared files, the dangerous part.** `src/server/cleanup.ts` deletes a build's
  `render_key` from storage when it expires. Reused rows share that file, so one expiry
  would break every other build using it, including curated ones. Before deleting, check
  no other build references the key, within the cron's 50-subrequest budget (one grouped
  query per run, not one per build).
- [ ] The daily cap in `startBuild` counts `processing`/`completed`. Reused rows cost
  nothing, so count only rows with `charge IS NOT NULL`.
- [ ] Commit `feat(cars): reuse studio renders instead of regenerating them`.

## 2. Show it before the click

- [ ] New `getRenderOffer({ vehicleId, partIds })` for `ReviewStep`, only when there's no
  uploaded photo. Exact match → the main button says **See it now · Free**.
- [ ] Close match, computed client-side from the presets already loaded: same vehicle,
  overlap of at least 60% of parts (shared ÷ union). Show "Similar build ready: Desert /
  Dune" linking to `/builds/<slug>`, above the Generate button. Don't block generating.
- [ ] Commit `feat(cars): offer ready-made builds on the review step`.

## 3. Don't pay twice for the same photo

- [ ] Additive DDL: `alter table builds add column if not exists photo_hash text;` plus
  `create index if not exists builds_photo_hash_idx on builds (user_id, photo_hash);`
  Rehearse, then ask for production. Update the schema.
- [ ] `checkPhoto`: SHA-256 of the file with Web Crypto. If **this same user** has a recent
  draft or build with that hash, reuse its `detectedVehicle` and skip `detectVehicle`.
- [ ] `startBuild` with a draft: if this user already has a `completed` build with that
  hash and the same part set, return it instead of rendering. Same user only: never match
  across users.
- [ ] Poor photos: `detectVehicle` already rejects blurry, interior and unusable shots, so
  there's nothing to add. Double-click races are already handled by the status guard.
- [ ] Commit `feat(cars): skip repeat detection and renders for the same photo`.

## 4. Smaller uploads

- [ ] Before upload (`TruckStep`/`PhotoDropzone`): `createImageBitmap(file, {
  imageOrientation: "from-image" })`, scale the long edge to 1600 px, JPEG at 0.85 via
  canvas. If anything fails, or the file is already smaller, send the original.
- [ ] Check a portrait phone photo stays upright, and a render still looks right.
- [ ] Commit `feat(cars): shrink photos in the browser before upload`.

## 5. Cheaper model for free renders (user decides)

- [ ] Confirm the Lite model's exact id and price on the official pricing page.
- [ ] **Ask first: 6 Gemini calls.** Render the same 3 builds on both models. Show the
  user side-by-side images.
- [ ] Only if the user approves: `GOOGLE_AI_FREE_IMAGE_MODEL` in `wrangler.jsonc`, used
  when `charge === "free"`. Paid renders keep the main model. Pass the model through the
  thin client in `@smartekai/ai`.
- [ ] Commit `feat(cars): cheaper image model for free renders`.

## 6. Verify (`cars-credits`)

Gemini budget for steps 1–4: **up to 4 renders and 4 uploads**. Say so before starting.

- [ ] Studio photo + a preset's exact parts → instant, no Gemini call, no credit, no free
  render used, and the build appears in My projects. Check by logs and ledger, not by eye.
- [ ] Same parts in a different tick order → still a hit.
- [ ] A new combination → one render; the same combination again from another account →
  a hit, no second render.
- [ ] Own photo → never a hit against a studio render or another user's build.
- [ ] Same photo uploaded twice by one user → one detection; by a different user → two.
- [ ] Reused row expires → the file survives; last reference expires → the file is
  deleted. Curated builds keep working.
- [ ] Reused builds don't count toward the daily cap.
- [ ] Failed render → not reusable (only `completed` with a `render_key`).
- [ ] Gate passes; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry`.

## 7. Ship (ask first)

- [ ] Production DDL before deploy, then merge and deploy. Record `/build` and `startBuild`
  CPU from `wrangler tail`.
- [ ] Log in `.agents/logs/`, current-work line in `plans/active.md`.

## User's side

- Set a **budget alert** on the Google project behind `GOOGLE_AI_API_KEY`.
- Raise `CARS_DAILY_RENDER_CAP` when real users start hitting it.

## Done when

Repeat studio builds cost nothing, shared files can't be deleted early, customers' photos
are never shared across users, the gate passes, and production changes had the user's OK.

## Out of scope

Requiring sign-in for guest renders (kept for now; revisit if free use eats the cap).
Batch pricing: only useful for gallery renders; use it next time presets are generated.
