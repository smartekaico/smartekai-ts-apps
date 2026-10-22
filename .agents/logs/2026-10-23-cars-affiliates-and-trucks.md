# Cars: affiliate plumbing + pickup trucks (2026-10-23)

Branch `feat/cars-affiliates` (off `main`). Nothing was deployed, nothing was
written to production, and no Gemini credits were spent.

## What this was

Two things from the affiliate plan (`.agents/cars-4by4-builder/plans/2026-10-18-affiliates-and-trucks.md`):
the affiliate plumbing that was still missing (Spec 1 §8 Tasks A–F), and the
three full-size pickups (Task G).

The user chose the shape up front, in one question:

- **Skip Task A** — no `parts.affiliate_store` column, no DDL. The links being
  supplied are Amazon/eBay/merchant-direct, so the merchant is visible in the
  host and nothing needs to be declared. Consequence: `storeOf(url)` keeps its
  one-argument signature, and the spec's "declared store wins" rule has no
  implementation.
- **Extend the existing importer instead of adding a second mechanism** —
  `scripts/parts-links.ts` gained a `--check` mode (`npm run links:check`)
  rather than a new `src/seed/affiliate-links.ts` map and a new
  `scripts/check-links.ts`. One source of truth for affiliate URLs: the CSV the
  user fills in.

Task B shipped without the `declared` parameter but with the full ten-store
registry, the labels, and merchant-domain detection (`arbusa.com`,
`4wheelparts.com`, `tirerack.com`, `bajadesigns.com`, `morris4x4center.com`,
`realtruck.com`, `inspiredoverland.com`) — exact host or a real subdomain, so
`amazon.com.evil.com` and `arbusa.com.evil.com` both fall through to `other`.

## Code

- `src/lib/store.ts` — ten `Store` values, `BUY_LABEL` for each, `MERCHANT_HOSTS`
  detection, exported `isAmazonHost` / `isEbayHost`.
- `src/lib/subid.ts` (new) — `withSubId(url, buildId)`: AvantLink `ctc`, CJ
  `sid`, Impact `subId1`, eBay `customid`; never overwrites a parameter that is
  already set; Amazon and unknown hosts untouched; a build id must match
  `^[A-Za-z0-9_-]{1,64}$` or the URL is left alone.
- `src/routes/go/$partId.ts` — applies `withSubId` to the redirect target.
- `scripts/parts-links.ts` — `--check` mode: validates without writing, prints
  part / store / status / host / source, exits non-zero only on malformed rows
  (unknown id, duplicate id, non-URL, non-https); missing links and failing
  statuses are reported, not fatal. The CSV path resolves against the npm
  directory, the current directory or the app, so the command works from the
  repo root too.
- `package.json` — `links:check` script.
- `scripts/parts-links.template.csv` — the three truck parts added (24 rows now,
  not 21) and the `--check` usage documented.
- `src/seed/vehicles.ts` — Ford F-150, Chevrolet Silverado 1500, GMC Sierra 1500.
- `src/seed/parts.ts` — `SUVS` / `TRUCKS` / `BOTH`; 11 existing parts also fit
  the pickups (4 wheels, 2 suspension, 3 lighting, 2 rooftop tents), 3 new
  truck-only parts (Leitner ACS bed rack, BAKFlip MX4 tonneau, Rough Country 6"
  lift).
- `src/seed/presets.ts` — SUV and truck preset sets, truck slugs
  (`f-150-*`, `silverado-*`, `sierra-*`), and a **seed-time assertion**: a
  preset containing a part that does not fit its vehicle throws instead of
  shipping a build the configurator would silently drop parts from.
- `scripts/generate-stock.ts` — `SUBJECTS` for the three trucks.
- `packages/db/src/cars/schema.ts` — the comment on `vehicles.id` only; no
  schema change.

## Two corrections to the written plan

- The plan's prose says a pickup shows "the 9 shared parts plus the 3 truck
  parts", but its own list of shared parts has **11** entries. The list wins:
  a pickup shows **14** parts (11 shared + 3 truck-only), an SUV shows 21.
- The plan and the spec both wrote RealTruck's domain as `realtrack.com`; the
  live domain is `realtruck.com`.

## Verified on the Neon branch (`ep-wild-bar-b1pi4db8`)

- Seed: **6 vehicles, 24 parts, 18 presets**. Fitment in the database: 14 parts
  per pickup, 21 per SUV; the three truck-only parts fit the pickups only.
- `/build` shows the 6 vehicles; `/build?vehicle=f150` lists 14 parts including
  the three truck-only ones and no SUV-only armour; `/build?vehicle=lc300`
  lists 21 and no truck-only parts; an SUV-only part forced into a truck's URL
  is dropped by the fitment filter (F-150 with `arb-summit-bullbar` + 2 valid
  parts → "2 parts · est. $1,770", the bull bar ignored).
- `/go/<partId>?build=…` on the branch: AvantLink → `ctc`, CJ → `sid`, Impact →
  `subId1`, eBay → `customid`; Amazon, a direct merchant and an unknown host
  untouched; an existing `ctc`/`customid` not overwritten; no build id or a
  malformed one left the URL alone; an unknown part id → 404; one
  `outbound_clicks` row per click.
- In the browser, with temporary links on a completed branch build: the button
  read **"Buy at ARB"** for an `arbusa.com` link and **"Buy on Amazon"** for an
  `amazon.com` link, with `rel="sponsored nofollow noopener noreferrer"`,
  `href="/go/<id>?build=<buildId>"`, and the disclosure above the list.
- `npm run links:check` on the blank template: 24 parts · 0 linked · 24 missing
  · exit 0. On a deliberately broken file: four problems reported (non-https,
  unknown id, non-URL, duplicate id) and exit 1.
- Gate: `./scripts/gate.sh` → **PASSED** (typecheck, lint, build across every
  workspace except the paused `legal-os`; the two lint warnings in the
  generated `worker-configuration.d.ts` are pre-existing).

## Cleanup

Every temporary affiliate URL and every `outbound_clicks` row was deleted from
the branch: the branch is back to **0 links, 0 clicks**, with 6 vehicles /
24 parts / 18 presets from the seed. Production was never touched — still
**3 vehicles, 21 parts, 9 presets, 0 links**.

## Still open

- **Task D: 0 of 24 affiliate URLs.** The template
  `apps/cars-4by4-builder/scripts/parts-links.template.csv` has a row per part;
  paste the links and run `npm run parts:links -- ./scripts/parts-links.template.csv`
  on the branch first. Amazon links need `tag=<associate-id>`.
- **Task G Step 7: needs the user's go-ahead** — 3 stock images for the trucks,
  the production seed and 9 gallery renders (12 Gemini calls).
- The site is still gated (`COMING_SOON: "true"`); the live version is
  `803df561` and does not contain any of this work.

---

## Merge, production seed and truck stock photos (2026-10-23, later)

The user merged `feat/cars-affiliates` into `main` (merge commit `1a96d60`) and
approved **Task G step 7a**: the three stock photos and the production seed —
**3 Gemini calls**, no gallery renders.

**Order matters.** The trucks had to exist in production before their photos
could be attached, because `stock:generate` looks the vehicle up in the database
to set `vehicles.stockImageKey`. So: production seed first, then the photos.

**Production seed.** `npm run db:seed -w cars-4by4-builder` with the production
URL. Production went from 3 vehicles / 21 parts / 9 presets to **6 / 24 / 18**.
Nothing else moved: 0 affiliate links before and after (the seed sets
`affiliate_url` to null, so it would have wiped links — there were none), 0 part
images, 9 builds untouched. The vehicles upsert sets only name, year range and
sort order, so the three existing stock photos survived — confirmed by reading
`vehicles.stock_image_key` back.

**Stock photos.** `npm run stock:generate -w cars-4by4-builder -- f150
silverado-1500 sierra-1500` → 3 Gemini calls, 3 uploads to `cars-renders` at
`stock/<id>.jpeg`, and the three new `vehicles.stock_image_key` values set. All
six stock images now answer `200 image/jpeg` (~600 KB each) from the public
bucket URL.

**The AI images are the same kind as the three already live.** They carry the
brand badge — the F-150 shows the Ford oval, the Silverado a Chevrolet bowtie
and a misspelled "SILVERADUO" badge, the Land Cruiser that has been live since
October shows a Toyota badge too. Consistent with what the site already serves,
but if that matters for launch, the fix is a licensed photo or a re-roll, not a
different generator.

**Live check (browser, preview cookie).** The deployed worker is still
`803df561` — it predates this branch — but the catalogue lives in the database,
so the live site already shows the new data: the picker lists 6 vehicles, the
F-150 lists exactly **14** parts (including the three truck-only ones and none
of the SUV-only armour), and the Land Cruiser lists 21 with no truck-only parts.

**What is *not* live yet:** the merged code — the ten store labels, the
sub-ID tagging and `links:check` — is on `main` but not deployed. The live
worker still has the old three-value `Store` type.
