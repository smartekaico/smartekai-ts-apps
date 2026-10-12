# 2026-10-13 — cars gallery MVP: Task 15 click-through + Task 20 stock cleanup

Branch: `feat/app-4by4-builder`

Closes Task 15 Step 2/3 (browser click-through + log) for the gallery-first
affiliate MVP, and completes the cleanup for Task 20 (AI studio stock bases).
All checks ran against the production SSR bundle, not dev:
`PORT=3021 node --env-file=../../.env.local .output/server/index.mjs`.

## Done — Task 15 Step 2 click-through (prod, Playwright + curl)

- **`/` gallery:** 9 cards, 9 unique `/builds/*` hrefs, 4 vehicle chips
  (All / Toyota Land Cruiser / Nissan Patrol / Jeep Wrangler); 11 `<img>`
  (10 unique srcs) all `complete`; footer shows the affiliate commission line,
  the Amazon Associate line and the AI-visualization line. Only console error
  is a `404 favicon.ico` (cosmetic, pre-existing).
- **Stock-photo path:** on `/build?vehicle=lc300&step=photo&parts=…`, "No photo?
  Use our studio Toyota Land Cruiser" → build completed in ~8 s. User build
  carries `<meta name="robots" content="noindex">`, the "AI visualization"
  caption and "Estimated total"; before = public `cars-renders/stock/lc300.jpeg`;
  PDF quote link is a `blob:` URL; after = public `cars-renders/renders/<id>.jpeg`.
- **Upload path:** `truck.jpg` → photo verified ("✓ red Jeep Comanche"),
  Generate enabled → build completed. Before = 1 h presigned
  `cars-uploads/uploads/<id>.jpg` (private bucket); after = permanent public
  render. Confirms `detectVehicle` + `describeVehicle(detected, vehicle.name)`.
- **Non-vehicle rejection:** `notcar.jpg` → "No 4x4-capable vehicle detected in
  the image.", Generate stays disabled, and the uploaded object is deleted
  server-side (no `uploads/` object remains — see cleanup).
- **Forced failure:** started the server with `GOOGLE_AI_IMAGE_MODEL=does-not-exist`
  (env on the command line, `.env.local` untouched) → build failed; page shows
  "That render didn't work" + "Generation failed — try again." + a "Try again"
  link. The link round-trips correctly: TanStack serializes `parts` as a JSON
  array in the URL and `validateSearch` rehydrates it back to the same 6 parts.
- **Rate limit:** 5 renders/hour from one IP pass; the 6th is blocked with
  "You've hit the render limit for now — try again in an hour." The limiter is
  in-memory per-IP and resets on server restart (used to isolate the tests).
- **Currency / redirection:** region switch was removed in Task 16, so there is
  no US/GCC toggle to test. `/go/arb-summit-bullbar` (affiliate URL null) → 404;
  the redirect + `outbound_clicks` write was verified in Task 18 with a
  temporarily-set URL, then reverted (baseline: 0 click rows).
- **SEO / routing:** `/sitemap.xml` → 200 with exactly the 9 curated build URLs
  + `/`; `/builds/nope` → 404; `noindex` on user builds only (absent on curated).
- **375 px:** `/` and `/builds/land-cruiser-overlander` → `scrollWidth == 375`
  (no horizontal overflow), slider renders, all images load.

## Done — cleanup (Task 20 leftovers + this session's test data)

Deleted the 7 non-curated builds created during verification (6 completed + 1
failed) together with their render/upload objects, and removed 3 legacy orphan
objects left by earlier manual testing (old key format: one `a9a24317….jpeg`
with no `renders/` prefix in `cars-renders`, and two `uploads/<uuid>-<name>.jpg`).

Buckets back to baseline:
- `cars-renders`: 9 curated `renders/*.jpeg` + 3 `stock/*.jpeg` = 12 objects.
- `cars-uploads`: 0 objects.
- `builds` table: 9 rows, all curated + completed.

## Gotcha / decision to carry forward

Stock-path builds store `originalImageKey = "stock/<id>.jpeg"`, which lives in
the **`cars-renders`** bucket — not `cars-uploads`. A naive purge that deletes
every build's `originalImageKey` from `BUCKETS.uploads` is a harmless no-op for
stock (safe) but is conceptually wrong: any real cleanup that touches `stock/*`
must target `BUCKETS.renders` **and skip curated builds**, since all three
vehicles share the same 3 studio bases — deleting one would break the gallery.
The curated builds + AI bases are runtime state (not version-controlled);
re-create with `npm run db:seed` → `npm run stock:generate` →
`npm run gallery:render -- --force`.

## Remaining (out of this log's scope)

- Part `affiliate_url`s and part `image_url`s are still null (placeholder
  catalog) → ShopList shows the "link coming soon" state.
- Dockerfile + Dokploy application for `cars-4by4-builder`, the Dokploy
  `cleanup` schedule, and production env vars — next spec (Task 15's
  "not in this plan" list).
- `db:push:cars` still exits non-zero on the pre-existing stray
  `cases_id_seq` dependency error (hygiene only; cars changes apply).
