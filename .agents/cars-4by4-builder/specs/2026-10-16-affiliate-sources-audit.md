# Affiliate Sources Audit — Design

**Date:** 2026-10-16
**App:** `apps/cars-4by4-builder`
**Audits:** `.agents/cars-4by4-builder/sops/sop-affiliate-links.md`
**Status:** Agreed. Spec 1 of 3 (2 = accounts + full report, 3 = credits + checkout).

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
  schedules via GitHub Actions/`setInterval` (no CI; Dokploy schedules are the
  option). Revisit as a `@smartekai/crw` + Gemini link-checker if the catalog
  outgrows hand-curation.

## 6. Done when (Step 1)

- [ ] Amazon Associates and EPN accounts approved.
- [ ] Every seeded part has an `affiliateUrl`; seed applied.
- [x] Buy buttons name the store, carry `rel="sponsored nofollow noopener"`,
      and a disclosure sits above the shop list. *(`src/lib/store.ts`,
      `ShopList.tsx`; merged with Spec 2.)*
- [x] Prices read "Est. price". *(`ShopList.tsx`, `PartCard.tsx`.)*
- [ ] Click-through: Buy → `/go/$partId` → one `outbound_clicks` row → store page
      with the affiliate tag intact.

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
