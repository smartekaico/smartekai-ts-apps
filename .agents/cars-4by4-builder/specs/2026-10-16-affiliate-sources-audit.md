# Affiliate Sources Audit — Design

**Date:** 2026-10-16
**App:** `apps/cars-4by4-builder`
**Audits:** `.agents/cars-4by4-builder/sops/sop-affiliate-links.md`
**Status:** Agreed. Spec 1 of 3 (2 = accounts + full report, 3 = credits + checkout). Step 1 code done; §7–§8 added 2026-10-18 (more programs + implementation tasks).

The SOP was written as general advice. This audit checks its claims against
primary sources (checked 2026-10-16) and against what the repo already does,
then picks a stepwise rollout: easy-to-join, broad-catalog programs first,
expand later.

## 1. What the repo already has

- **Bridge redirect exists.** `src/routes/go/$partId.ts` logs a row in
  `outbound_clicks` (`partId`, `buildId`) and `302`s to `parts.affiliate_url`.
  All Buy links point at it (`ShopList.tsx`).
- **One URL per part.** `parts.affiliate_url text` (nullable). All 21 seeded
  parts are `null`, so no Buy button renders yet.
- **Market is universal.** The 2026-10-08 MVP spec amendment removed regions.
  This audit keeps that: one link per part, no geo-routing.
- **Footer disclosure** already carries Amazon's required sentence.

## 2. Verdict on the SOP's sources

| SOP claim | Verdict | Finding |
|---|---|---|
| RealTruck on Impact | ✅ likely | Tracking domain `realtruck.sjv.io` is Impact's; ~4% per a directory listing. |
| ExtremeTerrain on Impact | ❓ | No affiliate program found; only a dealer program (Turn5). |
| Quadratec on Impact | ❓ | Not verified (site blocks automated fetch). |
| Front Runner on Impact | ❓ | No program found. |
| Tire Rack on CJ | ✅ | 6%, 60-day cookie (tirerack.com/affiliate). |
| 4WD Supacentre on CJ | ❌ | Listed on **Impact**, ~3%. |
| AutoZone on CJ | ❓ | Not verified. |
| "ShareASale / Awin" | ⚠️ outdated | ShareASale closed 2025-10-06; all programs now on **Awin**. |
| Rough Country on Awin | ❓ | Only a customer referral scheme found. |
| Amazon automotive 1–3% | ⚠️ | Third-party figures range 3–5%; read the US fee schedule after joining. |
| eBay Partner Network 1.5–4% | ✅ | eBay's auto-parts page shows 3% examples. |

**Missing from the SOP:**

- **AvantLink** — hosts **ARB USA** (3–5%, 45-day cookie). ARB is 6 of our 21
  seeded parts: the best brand fit we have.
- **Commission Factory** (Australia) — VicOffroad 8%, Outback Equipment 6–8.5%.
- **ArabClicks** (GCC) — Noon, Speero, Odiggo; often coupon-code tracked.

## 3. Compliance rules (primary sources)

Amazon Associates Operating Agreement, read 2026-10-16:

1. **No Special Links "in connection with any printed material, ebook" or
   offline.** → No affiliate links in PDFs. The PDF quote is being replaced by
   an HTML report page (Spec 2), so this is moot; it stays a rule for any
   future download.
2. **No cloaking; never "unclear that you are linking to an Amazon Site."**
   The `/go` redirect is allowed only if the button names the store.
3. **Prices and availability may only be shown if obtained via the Creators
   API or PA-API** (PA-API 5 is deprecated in 2026 in favour of the Creators
   API). → Our `priceUsd` is a catalog estimate and must be labelled as such,
   never presented as Amazon's price.

FTC Endorsement Guides: disclosure must be clear and conspicuous **near the
links**; a footer alone is not enough.

eBay Partner Network: links only off eBay properties; email/messaging use
needs separate approval. No conflict with our usage.

## 4. Rollout

### Step 1 — now: Amazon Associates + eBay Partner Network

Why: self-serve signup, no traffic gate, catalogs cover every seeded brand.

- **Amazon** covers most parts (Warn, Bilstein, KC, Rigid, BFGoodrich, Nitto,
  Smittybilt). Rule: **3 qualifying sales within 180 days** or the account is
  closed.
- **eBay** fills gaps (OME BP-51, Method beadlocks, Ironman tents) and has no
  activation threshold.

Per part, one URL: Amazon if listed, else eBay. Links come from Amazon
SiteStripe and the EPN link generator, pasted into `src/seed/parts.ts`
(`affiliateUrl`) and applied with the existing seed script.

Code changes (small, done with Spec 2's report work):

| Change | Where |
|---|---|
| Button label from the URL host: `amazon.*`/`amzn.to` → "Buy on Amazon", `ebay.*` → "View on eBay", else "Buy". No schema change. | `ShopList.tsx` (+ a tiny helper in `src/lib/`) |
| Price label "Est. price" wherever `priceUsd` shows. | `ShopList.tsx`, `PartCard.tsx` |
| Disclosure line directly above the shop list: "We earn a commission if you buy through these links." | build page, report page |
| `rel="sponsored nofollow noopener"` on Buy links. | `ShopList.tsx` |
| Footer keeps "As an Amazon Associate I earn from qualifying purchases." | `SiteFooter.tsx` (unchanged) |

### Step 2 — once the gallery has real traffic

> **Updated 2026-10-18:** §7 widens Steps 2–3 with more programs; §8 lists
> the implementation tasks.

- **AvantLink → ARB USA** (application is reviewed; AvantLink rejects many new sites).
- **CJ → Tire Rack** (tires).

Swap those parts' `affiliateUrl` to the better-paying program. Label helper
gains an "ARB" / "Tire Rack" case.

### Step 3 — later

- **Impact → RealTruck** (and verify Quadratec/Front Runner there).
- **Sub-ID tagging** on `/go`: append `buildId` using the network's parameter
  (Impact `subId1`; Amazon has none — use separate tracking IDs instead).
- **Regions** only if the universal-market decision is reversed: ArabClicks
  (GCC), Commission Factory (AU).

## 5. Rejected from the SOP

- **Geo-routing in `/go`** — contradicts the universal-market decision.
- **The "AI research agent" as written** — calls OpenAI, the Vercel AI SDK and
  Tavily directly (AGENTS.md: providers stay behind `@smartekai/ai` /
  `@smartekai/crw`); writes columns we don't have (`partNumber`, `weightKg`,
  `compatibleVehicleIds`); scrapes prices, which Amazon forbids displaying;
  schedules via GitHub Actions/`setInterval` (no CI; a Cloudflare Cron Trigger
  is the option once Spec 4 lands). Revisit as a `@smartekai/crw` + Gemini link-checker if the catalog
  outgrows hand-curation.

## 6. Done when (Step 1)

- [ ] Amazon Associates and EPN accounts approved.
- [ ] Every seeded part has an `affiliateUrl`; seed applied.
- [x] Buy buttons name the store, carry `rel="sponsored nofollow noopener"`,
      and a disclosure sits above the shop list. *(`src/lib/store.ts`,
      `ShopList.tsx`; merged with Spec 2.)*
- [x] Prices read "Est. price". *(`ShopList.tsx`, `PartCard.tsx`.)*
- [x] Click-through: Buy → `/go/$partId` → one `outbound_clicks` row → store page
      with the affiliate tag intact. *Verified on the Neon branch with temporary
      links on 2026-10-23 (there are still no real links — Task D is open): the
      button named the store ("Buy at ARB", "Buy on Amazon"), the redirect kept
      the tag, one click row was written per click, and the network links
      carried their sub-ID. The temporary links were deleted afterwards.*


## 7. More programs (added 2026-10-18)

Rates come from roundups and disagree, so check the merchant's page on the
network before relying on them.

| # | Program | Network | Fit | Confidence |
|---|---|---|---|---|
| 1 | ARB USA | AvantLink | 6 of 21 seeded parts; 3–5%, 45-day cookie | Verified (§2) |
| 2 | 4 Wheel Parts | AvantLink | Largest US 4x4 retailer; stocks ARB, OME, Warn, Bilstein, Smittybilt, Rough Country | Reported 3.2%, 30-day cookie (older listing: 2.4%) |
| 3 | Tire Rack | CJ | Tires (BFGoodrich, Nitto) | Verified: 6%, 60-day cookie |
| 4 | Baja Designs | AvantLink | Off-road LED lighting, premium | Own page, 30-day cookie (page is old) |
| 5 | Morris 4x4 Center | CJ | Jeep/4x4 parts | Reported, 30-day cookie |
| 6 | RealTruck | Impact | Bed covers, steps, lighting | Likely, ~4% (§2) |
| 7 | Inspired Overland | In-house | Rooftop tents, order value $900+ | Own page: 5–10%, 30-day cookie |

Not verified (no program found yet; check each brand's footer for
"Affiliates"): CARiD, Summit Racing, Quadratec, Front Runner, iKamper,
Roofnest, Dometic, MAXTRAX, Goal Zero.

**Order:**

- **Step 2:** one AvantLink application covering ARB USA, 4 Wheel Parts and
  Baja Designs; one CJ application covering Tire Rack and Morris 4x4. AvantLink
  reviews by hand and wants a live site, so apply after cars.smartekai.com is
  live (Spec 4).
- **Step 3:** RealTruck on Impact; sub-ID tagging.
- **Later:** grow the existing `overland` category with high-ticket items
  (rooftop tents, fridges, recovery boards), then join Inspired Overland and
  similar in-house programs.

**Per-part choice:** use the best-paying program that carries the exact part;
if it doesn't carry it, fall back to Amazon, then eBay. Each part keeps one
URL (§1).

## 8. Implementation tasks (for an implementing agent)

**Ground rules** (repo `AGENTS.md`):

- Branch `feat/cars-affiliates` from `main`; never commit to `main`.
- Scoped gate:
  `npx turbo run type-check lint build --filter=cars-4by4-builder...`
- Never run `db:push:cars` (it drops legacy sequences). Schema changes are
  hand DDL (`psql -1`, direct URL), rehearsed first on the Neon branch
  `cars-credits` (project `ancient-hall-95124568`).
- **Ask the user first** before any production DDL or production seed run.
- Spec 4 (Cloudflare Workers) may land before or after this work; nothing here
  depends on the runtime.

**What the user supplies** (not code): approved accounts, and per part a
tracking URL plus the store it leads to. Tasks A–C, E and F can be built
before any link exists. Task D needs the links.

### Task A — store recorded per part (schema)

Network links don't show the merchant in the host. AvantLink links run
through `avantlink.com`, CJ through its click domains (`anrdoezrs.net`,
`jdoqocy.com`, `tkqlhce.com`, `dpbolvw.net`, `kqzyfj.com`), and Impact
through `*.sjv.io` or `*.pxf.io`. So `storeOf(url)` can't name the store, and
Amazon requires the button to name it (§3). The fix is to store it:

- `packages/db/src/cars/schema.ts`: add `parts.affiliateStore`, a nullable
  `text("affiliate_store")`. Rebuild `packages/db` and commit its `dist`.
- DDL file `.agents/cars-4by4-builder/specs/2026-10-18-parts-affiliate-store.sql`:
  `ALTER TABLE parts ADD COLUMN affiliate_store text;`. Apply it to the
  branch; production only on approval.

**Status (2026-10-23): skipped.** The links being supplied are Amazon, eBay and
merchant-direct, so no link needs a *declared* store: the merchant is either
visible in the host (Task B rule 3) or is Amazon/eBay (rule 1). No column, no
DDL, and `storeOf(url)` keeps its one-argument signature — a declared store
would be an argument with nothing to pass it. If an AvantLink/CJ/Impact link
ever shows up, this task is where the column comes back.

### Task B — store registry and labels

`src/lib/store.ts`:

- Extend `Store` to: `amazon`, `ebay`, `arb`, `4wheelparts`, `tirerack`,
  `bajadesigns`, `morris4x4`, `realtruck`, `inspiredoverland`, `other`.
- Labels: "Buy on Amazon", "View on eBay", "Buy at ARB", "Buy at 4 Wheel
  Parts", "Buy at Tire Rack", "Buy at Baja Designs", "Buy at Morris 4x4",
  "Buy at RealTruck", "Buy at Inspired Overland", "Buy".
- Change the signature to `storeOf(url, declared?)`. Rules:
  1. An Amazon or eBay host always wins, whatever is declared. An Amazon
     link is never labelled otherwise.
  2. Otherwise a valid `declared` store wins, except that `amazon` or `ebay`
     declared on a non-Amazon/eBay host falls through. Never label a
     non-Amazon link as Amazon.
  3. Otherwise detect the merchant's own domain: `arbusa.com`,
     `4wheelparts.com`, `tirerack.com`, `bajadesigns.com`,
     `morris4x4center.com`, `realtruck.com`, `inspiredoverland.com`. Use the
     same anchored-suffix approach as today.
  4. Otherwise `other`.
- `src/lib/builds.ts:52` passes `p.affiliateStore`.
- Spot-check the rules with a `npx tsx -e` one-liner covering each rule,
  including `amazon.com.evil.com` → `other`, and an AvantLink URL with
  declared `arb` → `arb`.

**Status (2026-10-23): shipped, minus the `declared` parameter.** `Store` has
all ten values, `BUY_LABEL` names each of them, and `storeOf(url)` detects the
merchant's own domain — exact host or a real subdomain, so `amazon.com.evil.com`
and `arbusa.com.evil.com` both land on `other`. Two corrections to the text
above: the RealTruck domain is **realtruck.com**, not `realtrack.com`, and
rule 2 has no implementation because nothing declares a store (Task A was
skipped). Spot-checked with `npx tsx -e` over 21 URLs (Amazon short links,
Amazon country domains, eBay country domains, every merchant domain and two
look-alikes, plus the network hosts, which are `other` by design). In the
browser on the branch, a temporary `arbusa.com` link rendered as "Buy at ARB"
and an `amazon.com` link as "Buy on Amazon".

### Task C — links data file and checker

- New `src/seed/affiliate-links.ts`:
  `export const AFFILIATE_LINKS: Partial<Record<string, { url: string; store: Store }>>`,
  keyed by part id and empty at first.
- `src/seed/parts.ts` merges it into `seedParts`: `affiliateUrl` and
  `affiliateStore` come from the map, otherwise `null`. Keep the placeholder
  comment accurate.
- New `scripts/check-links.ts`, run as `npm run links:check`. It needs no
  database: it reads the map and `seedParts`, then prints a table with these
  columns:
  - part id;
  - store, as resolved by `storeOf`;
  - URL host;
  - HTTP status of a `GET`, following redirects, 10 s timeout.

  It flags missing links, non-https URLs, an unknown part id in the map, and
  any status ≥ 400. It exits non-zero only on malformed entries, not on
  missing ones.

**Status (2026-10-23): implemented as a `--check` mode on the existing
importer, not as a second mechanism.** The spreadsheet
(`scripts/parts-links.template.csv`) is the single source of truth for affiliate
URLs, so a separate `AFFILIATE_LINKS` map and a separate `scripts/check-links.ts`
would be a second place to keep in sync. Instead `scripts/parts-links.ts`
gained `--check` (run as `npm run links:check -- <file.csv>`): it validates
without writing and prints one row per part with the store, the host, the HTTP
status and where the URL came from (csv/db/missing); malformed rows (unknown
part id, duplicate id, non-URL, non-https) exit non-zero, missing links and
failing statuses do not. It reads the database rather than only the map,
because the part list and the currently linked URLs live there. The CSV path
resolves against the directory npm ran in, the current directory or the app, so
the same command works from the repo root and from inside the app.

### Task D — apply links (needs the user's links)

- The user provides the URLs; paste them into `AFFILIATE_LINKS`.
  `npm run links:check` must be clean.
- Run `npm run db:seed` against the Neon branch first and verify
  `select count(affiliate_url) from parts`. Production needs approval.
- Seeding upserts whole part rows. That's fine today because parts are
  seed-owned, but confirm nothing edits parts outside the seed before
  running it on production.

**Status (2026-10-23): blocked on the user — 0 of 24 links.** The catalogue grew
from 21 to 24 parts with the pickups, so three more rows are owed on top of the
original 21. The template lists every part id with a blank URL column. Paste a
link after the comma and run `npm run parts:links -- ./scripts/parts-links.template.csv`
on the branch first; production needs approval.

### Task E — sub-ID tagging in `/go/$partId`

Append the build id, when present and matching `^[A-Za-z0-9_-]{1,64}$`, using
the network's own parameter. Detect the network by host:

| Network | Hosts | Parameter |
|---|---|---|
| AvantLink | `avantlink.com` | `ctc` |
| CJ | the click domains above | `sid` |
| Impact | `*.sjv.io`, `*.pxf.io` | `subId1` |
| eBay | eBay hosts | `customid` |

- Amazon and unknown hosts are left untouched; Amazon has no sub-ID (§4
  Step 3).
- Pure helper `withSubId(url, buildId)` goes in `src/lib/subid.ts`. Never
  overwrite a parameter that's already set.
- Spot-check every row with `npx tsx -e`.

**Status (2026-10-23): done.** `src/lib/subid.ts` holds the pure helper
(`withSubId(url, buildId)`) and `src/routes/go/$partId.ts` applies it to the
redirect target. A build id must match `^[A-Za-z0-9_-]{1,64}$` — anything else
leaves the URL untouched, so a hand-crafted query string cannot be smuggled into
a merchant link. Spot-checked over every row of the table above plus the
negative cases (Amazon, a direct merchant, an existing `ctc`/`customid`, a
missing id, a malformed id, a malformed URL), and verified end to end through
`/go/<partId>?build=…` on the branch: `ctc`, `sid`, `subId1` and `customid` were
appended to the matching networks and nothing else was touched.

### Task F — verification (closes §6)

On the Neon branch with at least one Amazon link and one network link:

1. Each Buy button shows the right store name.
2. The disclosure appears above the shop list.
3. Clicking Buy goes to `/go/<id>` and inserts exactly one `outbound_clicks`
   row.
4. The redirect `Location` keeps the affiliate tag, plus the sub-ID for
   network links.
5. The gate passes.

Tick §6.

**Status (2026-10-23): verified as far as zero real links allow.** The gate
passes. The rest was checked on the Neon branch with *temporary* affiliate URLs
(ARB, Amazon, an AvantLink link, a CJ link, an Impact link and an eBay link),
all deleted afterwards — the branch and production are both back to 0 linked
parts. What was observed: the Buy button names the store, carries
`rel="sponsored nofollow noopener noreferrer"` and points at
`/go/<id>?build=<buildId>`; the disclosure sits above the list; each click
wrote exactly one `outbound_clicks` row; the redirect kept the affiliate tag
and added the network's sub-ID. What could **not** be verified: a real merchant
landing page (no product links exist yet) and the Amazon Associates tag on a
live URL. §6's click-through box is ticked on that basis.

### Later (not now)

The overland catalog: the user picks the products. Then add seed parts with
`aiPromptSnippet`s and render a gallery build to check that the prompts look
right.

## Sources

- Amazon Associates Operating Policies — https://affiliate-program.amazon.com/help/operating/policies
- Amazon PA-API 5 deprecation — https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation
- Tire Rack affiliate — https://www.tirerack.com/affiliate
- ARB USA affiliates — https://arbusa.com/affiliates
- RealTruck (LinkClicky) — https://linkclicky.com/affiliate-program/realtruck/
- 4WD Supacentre (LinkClicky) — https://linkclicky.com/affiliate-program/4wd-supacentre/
- ShareASale → Awin — https://www.awin.com/us/news-and-events/awin-news/shareasale-to-awin-upgrade
- eBay EPN auto parts — https://epnpartnernetwork.ebay.com/page/auto-parts-and-accessories
- EPN rules — https://epnpartnernetwork.ebay.com/solutions/step-5-knowing-the-rules
- Commission Factory: VicOffroad — https://www.commissionfactory.com/advertiser-directory/vicoffroad-affiliate-program/80327
- Commission Factory: Outback Equipment — https://commissionfactory.com/advertiser-directory/outback-equipment-affiliate-program/73792
- ArabClicks: Speero — https://www.arabclicks.com/advertisers/speero-affiliate-program/
- Impact sub-IDs — https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/tracking/tracking-links/link-parameters/sub-id-and-shared-id-parameters-explained-for-partners
- FTC Endorsement Guides update (Manatt) — https://manatt.com/insights/newsletters/advertising-law/an-in-depth-look-at-the-ftcs-updates-2
- 4 Wheel Parts (FlexOffers listing) — https://www.flexoffers.com/affiliate-programs/4-wheel-parts-affiliate-program/
- Automotive programs roundup (Lasso, 2026) — https://getlasso.co/niche/automotive/
- Car parts programs (Morris 4x4 on CJ) — https://makethatseachange.com/10-car-parts-affiliate-programs/
- Baja Designs affiliate — https://www.bajadesigns.com/affiliate-program/
- AvantLink review (Lasso) — https://getlasso.co/affiliate/avantlink/
- Inspired Overland affiliate — https://inspiredoverland.com/pages/affiliate-program
