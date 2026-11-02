# Part images (AI illustrations + category fallback) — Implementation Plan

> For agentic workers: use superpowers:executing-plans. Steps use `- [ ]`.
> Order: **after** `2026-11-02-tacoma.md`, **before** `2026-11-02-help-me-choose.md`.

**Problem:** all 24 parts have `parts.image_url = ""`, so every card in the
upgrade step, the shopping list and the build pages shows `/part-placeholder.svg`.

**Decided with the user (2026-11-02):**

- **Now:** one AI-generated **illustration** per part (Gemini, the same
  `generateStudioImage` used for vehicle stock photos), consistent studio style,
  **no logos, no text**, shown with a small "Illustration" label.
- **Fallback:** a per-category icon instead of the generic placeholder.
- **Later (not this plan):** real product photos from Amazon's Product Advertising
  API (needs qualifying sales) or AvantLink merchant feeds (needs approval).
- Never copy images from Amazon or manufacturer sites.

## Ground rules

- Branch `feat/cars-part-images` from `main`. Never commit to `main`; merging and
  deploying need the user's OK.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- **Ask first:** every Gemini run (give the call count), production writes,
  deploy. Rehearse DB writes on the Neon branch `cars-credits`.
- No schema change.

## Files

- `apps/cars-4by4-builder/scripts/seed.ts` — stop overwriting `image_url` and `affiliate_url`.
- Create `apps/cars-4by4-builder/scripts/generate-part-images.ts` + `package.json` script `parts:images`.
- `apps/cars-4by4-builder/src/lib/builds.ts` — key → public URL.
- `apps/cars-4by4-builder/src/components/PartImage.tsx` — label + category fallback.
- Create `apps/cars-4by4-builder/public/parts/<category>.svg` (5 icons).
- Callers of `PartImage` (`PartCard.tsx`, `ShopList.tsx`, build pages) — pass `category`.

## Steps

### 1. The seed stops wiping images and links

Today `scripts/seed.ts` upserts parts with `set: p`, which resets
`image_url` to `""` and `affiliate_url` to null on every seed — the reason
for the "seed before links" rule.

- [ ] In the parts upsert, build `set` from the seed row **without**
  `imageUrl` and `affiliateUrl` (same pattern as vehicles, which already protect
  `stockImageKey`). New parts still insert with the seed's defaults.
- [ ] Comment: "imageUrl is owned by scripts/generate-part-images.ts and
  affiliateUrl by scripts/parts-links.ts — never overwrite them here."
- [ ] Verify on `cars-credits`: set a test `image_url` and `affiliate_url` on one
  part, re-seed, both survive; delete the test values.
- [ ] Update the "seed before links" warnings in
  `.agents/cars-4by4-builder/plans/active.md` and the links template header: the
  seed no longer resets links (links still need `parts:links` for new rows).
- [ ] Commit `fix(cars): db:seed keeps part images and affiliate links`.

### 2. Image generation script

- [ ] `scripts/generate-part-images.ts`, modelled on `scripts/generate-stock.ts`:
  - args: optional part ids (default: parts whose `image_url` is `""`);
    `--force` regenerates the given ids even if set.
  - prompt per part from its **generic description**, not the brand name, so the
    model doesn't invent logos. Add a `SUBJECTS` map for all 24 parts, e.g.
    `"rigid-led-lightbar": "a 40-inch straight black off-road LED light bar with mounting brackets"`,
    `"arb-esperance-tent": "a closed grey hard-shell rooftop tent, low profile clamshell"`,
    `"bfg-km3-33": "a single 33-inch mud-terrain tyre with aggressive tread blocks, side view"`,
    `"bilstein-5100-shocks": "a pair of yellow-bodied monotube off-road shock absorbers"`,
    `"bakflip-mx4": "a hard folding pickup truck bed cover, partly folded, matte black"`.
    Missing entry → throw (no silent fallback to the brand name).
  - shared style suffix: "Isolated product photograph on a seamless light-grey
    studio background, soft even lighting, three-quarter view, centred, whole
    product in frame. No logos, no brand names, no text, no people."
  - upload to `BUCKETS.renders` at `parts/<id>.<ext>` with `MUTABLE_PUBLIC_CACHE`,
    then `update parts set image_url = 'parts/<id>.<ext>'` (the **key**, not a URL).
  - one part at a time; log each key; stop on the first error.
- [ ] `package.json`: `"parts:images": "tsx --env-file=../../.env.local scripts/generate-part-images.ts"`.
  Add it to AGENTS.md's per-app extras line next to `stock:generate` (spends
  Gemini credits and writes production storage → user go-ahead).
- [ ] Commit `feat(cars): AI part illustrations script`.

### 3. Serve keys as URLs, label, fallback

> **Decided 2026-11-02: category icons, not the generic placeholder.** Commit
> `636d863` (on `main`) replaced a category-icon tile in `PartImage` with one
> "photo coming soon" SVG. Reverse that part: the fallback is a per-category
> icon. `git show 636d863` shows the earlier tile code, which may be reusable;
> keep `/part-placeholder.svg` only as the last fallback for an unknown category.

- [ ] `builds.ts` `toPublicPart` / `toTeaserPart` (and any other place that
  returns `parts.imageUrl`): if the value starts with `parts/`, return
  `publicImageUrl(value)`; otherwise return it unchanged (lets a future real
  photo URL be stored directly). Add `imageKind: "illustration" | "photo" | null`
  (`parts/` → illustration, other non-empty → photo, empty → null).
- [ ] `PartImage({ src, alt, category, kind })`:
  - `src` set → the image; when `kind === "illustration"`, a small
    "Illustration" badge in a corner (`text-[10px]`, muted, semi-opaque background).
  - `src` empty → `/parts/<category>.svg` (fallback to `/part-placeholder.svg`
    for an unknown category).
- [ ] Five simple monochrome SVG icons in `public/parts/`: `armor.svg`,
  `wheels_tires.svg`, `overland.svg`, `suspension.svg`, `lighting.svg`, matching
  the site's muted palette, `viewBox` 16:9 so `aspect-video` doesn't crop them.
- [ ] Update every `PartImage` caller to pass `category` and `kind`.
- [ ] Commit `feat(cars): part illustrations with label and category fallback`.

### 4. Generate (ask first)

- [ ] **Branch trial (ask: 3 Gemini calls):** run for `rigid-led-lightbar`,
  `arb-esperance-tent`, `bfg-km3-33` against `cars-credits`
  (note: storage is shared, so these keys are production objects; that's fine,
  they're the same keys production will use). Show the user the 3 images; adjust
  prompts if they show logos, text or the wrong object.
- [ ] **All parts (ask: one call per part still without an image — 21 after the
  3-part trial; the Tacoma adds no new parts):** run on production. Then review every image;
  regenerate bad ones with `--force <id>` (each is 1 call, ask if more than 3).

### 5. Verify

- [ ] Upgrade step, shopping list, report and public build page show the
  illustrations with the "Illustration" badge; a part with no image shows its
  category icon.
- [ ] Re-seed `cars-credits` → images and links unchanged.
- [ ] No layout shift; images lazy-load; public URLs return 200 `image/*`.
- [ ] Gate; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry`.

### 6. Ship (ask first)

- [ ] Ask to merge and deploy. After deploy: `/build?vehicle=f150&step=parts`
  shows images; `wrangler tail` CPU for `/build` unchanged (URLs are built from a
  key, no extra I/O).
- [ ] Log in `.agents/logs/`, current-work line in
  `.agents/cars-4by4-builder/plans/active.md`.

## Done when

Every part shows a labelled illustration (or a category icon if generation
failed); re-seeding no longer wipes images or links; Gemini spend and production
writes happened only with the user's OK.

## Out of scope

Amazon PA-API or AvantLink feed images (later plan), multiple images per part,
image editing UI, per-vehicle part images.
