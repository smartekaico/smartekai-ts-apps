# 2026-11-03 — cars: part illustrations (AI + category icons)

## What changed
- `scripts/seed.ts`: upsert no longer overwrites `image_url` or `affiliate_url` (verified on cars-credits: both survive a re-seed).
- `scripts/generate-part-images.ts` (new) + `parts:images` npm script: one Gemini illustration per part, generic descriptions only (no brand names/logos/text), uploaded to `parts/<id>.<ext>` in cars-renders with mutable cache; sets `parts.image_url` to the key.
- `src/lib/builds.ts`: `toPublicPart`/`toTeaserPart` resolve `parts/` keys to public URLs; added `imageKind: "illustration" | "photo" | null`.
- `src/components/PartImage.tsx`: `src` set → image with "Illustration" badge when `kind === "illustration"`; empty → per-category SVG (`/parts/<category>.svg`), fallback `/part-placeholder.svg`.
- `public/parts/`: 5 category icons (armor, wheels_tires, overland, suspension, lighting).
- Callers (PartCard, ShopList) pass `category` and `kind`.

## Production
- 3-part trial (rigid-led-lightbar, arb-esperance-tent, bfg-km3-33) approved, then all 24 parts generated (24 Gemini calls total including trial). All 24 `parts.image_url` set; keys return 200.
- db:seed keeps images/links (verified).

## Deploy
- Merged to main and deployed version `fb41aed0-3fc4-4b59-945e-c45fa94dafa4`. `/build` 200, `/parts/*.svg` 200, part images 200.

## Notes
- Fallback is category icons (not the generic placeholder), per decision 2026-11-02 (reverses commit 636d863's placeholder). `/part-placeholder.svg` kept as last fallback for unknown categories.