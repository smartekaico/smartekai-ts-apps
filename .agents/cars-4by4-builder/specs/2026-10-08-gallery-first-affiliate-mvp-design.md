# Gallery-First Affiliate MVP — Design

Source: brainstorming session 2026-10-08, following the project audit of the same
date. Supersedes the screen flow in `2026-09-12-ui-design-and-catalog-data.md`
(its §2 visual design system is kept) and folds in the reviewed parts of
`plans/updated-ui-ux.md`.

## 0. Decisions

| Decision | Choice |
|---|---|
| MVP goal | **Affiliate clicks.** No login anywhere in the flow. |
| Market | **Both US/global and GCC**, region-aware affiliate links. |
| Vehicles | Toyota Land Cruiser, Nissan Patrol (Y62), Jeep Wrangler (JL). |
| Flow | **Gallery-first**: curated pre-rendered builds on the home page, then a parts-first configurator. |
| Language | **English only.** No Arabic, no i18n scaffolding. |
| Currency | Prices stored in USD; GCC displays AED at the fixed peg (3.6725). |

## 1. Screens & routes

**`/` — Gallery home**
- Hero: one featured curated build's before/after slider, headline, "Build yours" CTA.
- Vehicle filter chips (All · Land Cruiser · Patrol · Wrangler) over a grid of 9
  curated builds (3 vehicles × 3 presets). Card = render, preset name, total price.

**`/builds/$slug` — Build page (curated and user builds share it)**
- Curated builds: readable slug (`/builds/land-cruiser-overlander`), indexable.
- User builds: UUID, `<meta name="robots" content="noindex">`.
- Order, top to bottom:
  1. Before/after slider.
  2. **Shop this build** — per part: image, name, regional price, fitment badge,
     primary **Buy ↗** button (via `/go/...`, §4).
  3. Totals: parts, estimated labor, total.
  4. Fitment advisory notes (static per category, existing `advisories.ts` approach).
  5. Share (copy link with "Copied" feedback), Download image, secondary "PDF quote"
     (existing `BuildReportPdf`).
- While `status = processing`, the same URL shows the progress screen and polls;
  it swaps to the result in place. Leaving and returning loses nothing.
- Unknown slug/id → TanStack `notFound()` (404 page), not a thrown `Error`.

**`/build` — Configurator, one route, three steps, state in search params**
(`?vehicle=lc300&preset=overlander&parts=a,b,c&step=parts`)
1. **Vehicle** — three large cards. Skipped when arriving with `vehicle` set.
2. **Parts** — preset pills (Overlander · Desert/Dune · Trail) + 5 category tabs.
   Card: image, price, fitment badge ("Bolt-on" / "Trimming" / "Fabrication"),
   toggle. Only parts whose `vehicleIds` include the chosen vehicle are shown.
   Sticky footer: "N parts · $X · Next". Next disabled at 0 parts; max 12.
3. **Photo** — dropzone with a side-profile silhouette guide. On drop: instant
   check (§3) → "✓ White Toyota Land Cruiser" badge or a friendly rejection with
   retry. Below: **"No photo? Use our studio {vehicle}"**. "Generate" →
   `/builds/<id>`.

**Header (all pages):** wordmark, "Build yours", **US | GCC** region switch.
**Footer (all pages):** affiliate disclosure (§6).

## 2. Data model

Cars tables move out of the shared `packages/db/src/schema.ts` into their own
`packages/db/src/cars/schema.ts`, exported via a new `@smartekai/db/cars` entry with
its own **lazily created** `dbCars` client and its own `drizzle.cars.config.ts`.
Effect: the cars database no longer receives legal/medical tables, and importing
`@smartekai/db` no longer requires `DATABASE_NEONDB_SMARTEKAI` (and vice versa).
No production data exists yet, so the existing `parts`/`upgrade_sessions` tables are
reshaped directly (`drizzle-kit push`), no data migration. The `cars_*` Better Auth
tables move with them unchanged.

- **`vehicles`**: `id` (`lc300` · `patrol-y62` · `wrangler-jl`), `name`,
  `yearRange`, `stockImageKey`, `sortOrder`.
- **`parts`**: existing columns, plus:
  - `vehicleIds text[] not null` — fitment.
  - `category` restricted to `armor | wheels_tires | overland | suspension | lighting`.
  - `affiliateUrls jsonb not null` — `{ us?: string; gcc?: string }`. A missing
    region hides that part's Buy button in that region.
  - `affiliateUrl` column removed. `priceUsd` stays the single price.
- **`presets`**: `id`, `vehicleId`, `slug`, `name`, `partIds text[]`, `sortOrder`.
- **`builds`** (replaces `upgrade_sessions`): `id`, `slug` (unique, curated only),
  `vehicleId`, `presetId` (nullable), `isCurated`, `originalImageKey`, `renderKey`
  (nullable), `status` (`draft | processing | completed | failed`), `errorMessage`,
  `selectedPartIds`, `detectedVehicle`, `createdAt`, `updatedAt`.
  **Keys, not URLs** — read URLs are generated at page load (fixes the expiring
  before-image). Keys under `stock/` live in the public `cars-renders` bucket; all
  other originals live in the private `cars-uploads` bucket.
- **`outbound_clicks`**: `id`, `partId`, `buildId` (nullable), `region`, `createdAt`.
  The one metric this MVP exists to move.
- **Labor rate**: single constant, $100/hr (AED-converted in GCC).

**Retention** — `scripts/cleanup.ts`, run on a Dokploy schedule:
- `draft` builds older than 24h → delete row + upload.
- Non-curated builds older than 90 days → delete row + upload + render.
- Curated builds never.

## 3. Generation pipeline

Three server functions replace the single synchronous `generateBuild`.

**`checkPhoto(formData)`** — trust boundary:
- Reject unless `image/jpeg | image/png | image/webp` and ≤ 10 MB.
- Upload to `cars-uploads` under `uploads/<uuid>.<ext>` — the user's filename is
  never used in the key.
- `detectVehicle` on a presigned URL. Invalid → delete the object, return the
  rejection text. Valid → insert a `builds` row with `status = draft`, return
  `{ buildId, detected }`.

**`startBuild({ buildId?, vehicleId, partIds })`**:
- Validate: `partIds` is a string array, 1–12 items, every id exists and fits
  `vehicleId`. With `buildId`: row must exist and be `draft`. Without: stock-photo
  build — new row with `originalImageKey = vehicle.stockImageKey`, no detection.
- Rate limits (§3.1). Set `status = processing`, kick off generation **without
  awaiting**, return `{ id }` immediately. Client navigates to `/builds/<id>`.

**Background generation** (in-process, same Node server):
- Build prompt from detected vehicle (or vehicle name) + part `aiPromptSnippet`s →
  `generateUpgradeRender` → upload to `cars-renders` → `status = completed`.
- Any error → `status = failed`, `errorMessage` set, logged with build id.
- Known limit: a server restart mid-render orphans the job. `getBuild` treats
  `processing` older than 10 minutes as failed. Acceptable for MVP; no queue infra.

**`getBuild(slugOrId)`** — returns build, parts, vehicle, and fresh image URLs
(presigned 1h for private originals, public URL otherwise). Polled every 3s by the
build page while `processing`.

### 3.1 Cost & abuse limits
- Per IP (from `x-forwarded-for`, set by Traefik): 5 renders/hour, 15/day.
  In-memory — the app runs as a single Node instance.
- Global: daily render cap from env `CARS_DAILY_RENDER_CAP` (default 200), counted
  from `builds` created today. Over the cap → friendly "We're at capacity today —
  browse the gallery" message, linking to `/`.
- `checkPhoto` counts toward a separate per-IP limit of 20/hour (cheap vision call).

### 3.2 Client error handling
Every server-function call in the UI is wrapped: on throw or `failed`, show the
toast and return the step to its idle state — never a stuck "Generating…" screen.
Failed build page offers "Try again" (back to `/build` with the same params).

## 4. Region & affiliate links

- Region resolution: `region` cookie (set by the header switch) → `cf-ipcountry`
  header if present → `US`. GCC = `AE SA KW QA BH OM`.
- **`/go/$partId?build=<id>`** — server route: resolve region, look up
  `affiliateUrls[region]`, insert `outbound_clicks`, `302` to it. 404 if no URL for
  that region. All Buy links point here; rendered with
  `rel="sponsored noopener noreferrer" target="_blank"`.

## 5. Curated gallery & SEO

- `scripts/render-gallery.ts` (run locally, one-off): for each `presets` row,
  render from the vehicle's stock image and upsert a curated `builds` row with
  `slug = <vehicle>-<preset>`. Re-runnable.
- **Stock vehicle images** — `stock/<vehicleId>.<ext>` in `cars-renders`. Must be
  images you have rights to (own photos, licensed stock, or AI-generated studio
  shots). Manufacturer press images are not assumed licensed.
- `/sitemap.xml` server route lists `/` and curated build pages. Curated pages set
  `og:image`, `og:title`, `<title>`, description.

## 6. Visual design & copy

**Visual:** keep `2026-09-12-ui-design-and-catalog-data.md` §2 as-is (dark charcoal,
amber primary, Inter with heavy headings, subtle texture on hero and dropzone only).
Mobile-first: configurator footer sticky; category tabs scroll horizontally.
Primitives `@smartekai/ui` lacks (tabs, pills, badges) are built locally in this app.

**Copy** (per `WORKFLOW.MD` "Copy needs its own spec"):
- **Voice:** confident, practical, gearhead-friendly. Short sentences.
- **Language:** English (US spelling). No Arabic.
- **Length:** headlines ≤ 8 words; card text ≤ 2 lines; advisory notes ≤ 2 sentences.
- **Claims permitted:** "estimated" prices and labor; "AI visualization — actual
  appearance may vary" under every render. **Not permitted:** guaranteed fitment,
  guaranteed prices, safety or legal-compliance claims, implied brand endorsement.
- **Required disclosure** (footer, every page): "We may earn a commission when you
  buy through links on this site." Plus Amazon's exact required sentence if Amazon
  Associates links are used.
- Wait screen: "This usually takes 1–2 minutes" with 3 cycling status lines; never
  a specific seconds figure.

## 7. Prerequisites you supply (not code)

1. Affiliate program accounts per region (e.g. Amazon Associates US + Amazon.ae,
   ExtremeTerrain, Quadratec) and the real per-part URLs.
2. Part images you're permitted to display (typically via the affiliate program's
   own image terms).
3. Three stock vehicle images (§5).

Until 1–2 land, seed values stay clearly marked placeholders and Buy buttons hide
for parts without a URL in the current region.

## 8. Acceptance criteria

- [ ] `/` shows 9 curated builds with filter chips; each opens its `/builds/<slug>`.
- [ ] Configurator: vehicle → parts → photo works with state surviving refresh;
      only fitting parts shown; max 12 parts enforced client and server side.
- [ ] Drop a non-vehicle photo → rejection within one request, object deleted.
- [ ] Stock-photo path produces a build with no upload.
- [ ] Generate returns immediately; build page shows progress, then the result,
      without manual refresh. Before image still loads > 1 hour later.
- [ ] Forced generation error → build page shows failed state + "Try again".
- [ ] 6th render from one IP within an hour is refused with a friendly message.
- [ ] US/GCC switch changes prices (USD/AED) and Buy destinations; each Buy click
      writes one `outbound_clicks` row and redirects.
- [ ] Unknown build → 404 page. User builds `noindex`; `/sitemap.xml` lists curated.
- [ ] Disclosure + "AI visualization" caption visible where specified.
- [ ] `npx turbo run type-check lint build --filter=cars-4by4-builder...` green.
- [ ] Browser click-through of every path above on desktop and mobile width.

## 9. Out of scope

Login / "my garage" (Better Auth wiring stays, unused); Arabic or any i18n; a
single-checkout "order all"; live price syncing; admin/CMS for the catalog; more
than 3 vehicles; queue infrastructure; Dockerfile/Dokploy deployment (next spec);
analytics beyond `outbound_clicks`.
