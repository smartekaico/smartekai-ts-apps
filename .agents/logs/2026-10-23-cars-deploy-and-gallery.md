# Cars: the affiliate work deployed, the truck gallery rendered (2026-10-23)

Two things happened on the user's go-ahead, in this order: the merged affiliate +
pickup work went live (**still behind the coming-soon gate**), and the 9 gallery
renders for the new truck presets were generated against production.

## The deploy

`npm run deploy -w cars-4by4-builder` → **version
`f1606d4c-2a2e-44ee-809d-71bf2923fb41`**. This is the first deploy carrying:

- the ten-store registry with real labels and merchant-domain detection
  (`src/lib/store.ts`),
- the per-network sub-ID tagging (`src/lib/subid.ts`) in `/go`,
- the Ford F-150 / Silverado 1500 / Sierra 1500 catalogue (seeded in production
  back in Step 7a),
- per-vehicle affiliate link resolution (Task H2) — one query, vehicle-specific
  link beats the part default.

Wrangler re-attached both custom domains, the `cars-render` producer and
consumer, and the `:17 * * * *` cron unchanged. `COMING_SOON` is still `"true"`.

| Check | Result |
|---|---|
| `overlander.smartekai.com/` | 503 gate page (unchanged) |
| `cars.smartekai.com/` | 301 → `https://overlander.smartekai.com/` |
| `?preview=<token>` | 303 → cookie set → app 200 |
| `/go/arb-summit-bullbar` (no link) | **404**, not 500 |
| `/go/arb-summit-bullbar?build=x` | **404** — the vehicle join runs cleanly with a bogus build id |
| `/sitemap.xml` | 19 URLs (home + 18 build pages), all on the new host |
| gate | passed before the deploy; tree clean, so the deploy matches `main` |

**What cannot be verified live yet:** production holds **0 affiliate links**, so the
store labels, the sub-ID parameters and the per-vehicle fallbacks have nothing to
resolve. Those were verified on the branch with temporary links (deleted) — see
`2026-10-23-cars-affiliates-and-trucks.md` and
`2026-10-23-cars-per-vehicle-links.md`. What the deploy *does* prove live is that
the new `/go` query (parts → builds → `part_vehicle_links`) is healthy against the
production schema now that the table exists — it answers a clean 404 rather than
erroring, which is exactly the failure a missing table would have caused.

## The 9 gallery renders

`npm run gallery:render -w cars-4by4-builder` — 9 Gemini calls, one per truck
preset (F-150 / Silverado / Sierra × Overlander / Desert-Dune / Trail). The 9 SUV
presets were skipped as already rendered, which is the script's re-run behaviour.

Production went from 9 completed curated builds to **18 — every one of the 18
presets now has a completed render**, and each of the 9 new renders and its
`stock/<id>.jpeg` before-image returns 200 `image/jpeg`.

| Check | Before | After |
|---|---|---|
| completed curated builds | 9 | 18 |
| presets with a completed render | 9 / 18 | **18 / 18** |
| home gallery cards | 9 | **18** |
| vehicle filter buttons | 7 (All + 6) | 7 (unchanged) |
| sitemap URLs | 10 | 19 |

Filtering the gallery to "GMC Sierra 1500" returns exactly its 3 cards. The home
hero stays a Land Cruiser: the gallery sorts by vehicle `sortOrder` then preset
`sortOrder`, and the trucks sort 4–6, so the render batch did not disturb the
featured card.

Browser pass on `/builds/sierra-dune`: correct title, the 5 preset parts listed,
0 buy buttons — correct, because there are still no affiliate links — and the
commission disclosure ("We may earn a commission when you buy through links on
this site.") above the list.

## Where launch stands

- **Live and done:** the catalogue (6 vehicles / 24 parts / 18 presets), all 18
  gallery renders, the gate with preview + waitlist, the hostname rename with the
  legacy 301, and Docker-free Workers hosting on the **Free** plan.
- **The launch blocker is the links:** 0 of 24. Fill
  `scripts/parts-links.template.csv` (the Ford/GM per-vehicle example rows are
  commented in place), then `npm run links:check -- …`, then `npm run parts:links
  -- …` — **on the branch first, then production, and seed before links**, because
  the seed resets `parts.affiliate_url` to null.
- **Then:** flip `COMING_SOON` to `"false"` and redeploy.
- The one settled $14 payment (`confirmed`/`finished` → `credited`) is still
  unobserved and remains postponed by the user.
- The PBKDF2-vs-Durable-Object-vs-Paid hash question is **settled — stay on
  PBKDF2**; the reasoning is in `2026-10-18-cars-workers-port.md` (§7.1 revisited)
  and the deploy plan's launch checklist.
