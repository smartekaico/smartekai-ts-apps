# Amazon only — Replan

> For agentic workers: use superpowers:executing-plans. Steps use `- [ ]`.
> Replaces the cancelled `plans/2026-11-02-avantlink-suv-links.md`.

**Situation (2026-11-13):** AvantLink rejected the site, so income is **Amazon.com only**
(tag `smartekaiover-20`). The account closes without **3 qualifying sales by about late
April 2027**.

**Coverage today** (part × vehicle with an Amazon link, from `parts-links.template.csv`):

| | Linked |
|---|---|
| Trucks (F-150, Silverado, Sierra, Tacoma) | every part except the Leitner bed rack and the Ironman tent |
| Wrangler JL | universal parts only: tyres, light bar, pods, winch, ARB tent |
| Land Cruiser 300, Patrol Y62 | universal parts only |
| SUV-only parts (ARB bars and armour, Ironman sliders, snorkel, foam cell and tent, OME BP-51, Front Runner rack, ARB awning, Smittybilt SRC) | **none** |

So a visitor building an SUV sees mostly parts with no Buy button. And the home page's
featured build is the Land Cruiser.

**Goal:** every part in a popular build has an Amazon Buy button for its vehicle, and the
catalogue leans to vehicles Amazon.com actually sells parts for.

## Decision for the user (blocks step 3)

The Land Cruiser 300 and Patrol Y62 aren't sold in the US, and Amazon.com has few parts for
them. Where are your visitors?

- **A. US / amazon.com (recommended):** replace the Patrol with the **Toyota 4Runner (5th
  gen, 2014–2024)** and the Land Cruiser with the **Ford Bronco (6th gen, 2021+)**. Both have
  a very large Amazon aftermarket. About 8 Gemini calls (2 stock photos, 6 preset renders),
  roughly $0.55.
- **B. Keep them** for Gulf visitors. They'd stay mostly without Buy buttons on amazon.com.
  Earning from them would need a separate Amazon.ae or Amazon.sa Associates account
  (separate approval, separate tag), which this plan doesn't cover.
- **C. Keep them and hide them** from the home page and Popular builds, so traffic goes to
  vehicles that earn.

## Ground rules

- Your own git worktree, a branch per step, from `main`. Never commit to `main`.
- **Ask first:** every ASIN list before it goes live, production `parts:links`, production
  `db:seed`, every Gemini run (give the count), merge, deploy.
- Links are added with the existing importer and its per-vehicle third column; never by hand
  in the database. Rehearse on `cars-credits`. After any production `db:seed`, links and
  images survive (the seed no longer overwrites them).
- Real browser testing is required.

## Steps

### 1. Wrangler JL links for existing parts (no catalogue change)

The Wrangler has one of the biggest aftermarkets on Amazon, and these parts already fit it.

- [ ] Research Wrangler JL (2018+, 4-door, 4WD) Amazon listings for: `bilstein-5100-shocks`,
  `rough-country-lift-kit`, `fuel-vector-wheels` (5x5, 17x9), `method-beadlock-701` (5x5,
  17x9), `smittybilt-src`, `frontrunner-slimline-ii`, `arb-270-awning`, `arb-stealthbar`,
  `ironman-snorkel`, `ironman-rock-sliders`, `arb-underbody-armor`. Same standards as the
  truck links: sold by the brand or Amazon, the listing names the JL, a fit note per row.
  Leave blank what isn't clearly sold for the JL.
- [ ] Show the user the ASIN list. On approval: rows with `,wrangler-jl`, `links:check` on
  the branch, then production `parts:links`.

### 2. Swap catalogue parts Amazon doesn't sell

For each part with no Amazon listing for most of the vehicles it fits, either find the
Amazon listing or replace it with an equivalent **sold on Amazon by the brand or Amazon**,
same type and position:

| Today | Look for on Amazon (examples, verify) |
|---|---|
| `leitner-acs-forged` (bed rack) | a bed rack sold on Amazon for these trucks |
| `ironman-hardshell-tent` | remove: a second hard-shell tent adds nothing; the ARB tent is linked |
| `ironman-rock-sliders` | rock sliders on Amazon for the vehicles it fits |
| `ironman-snorkel` | a snorkel on Amazon for the vehicles it fits |
| `ironman-foam-cell` | drop if `ome-bp51` or a linked lift covers the slot |
| `arb-summit-bullbar`, `arb-underbody-armor`, `ome-bp51` | keep only if Amazon sells them for those vehicles |

- [ ] Show the user the swap list (old part → new part, ASINs, price estimate, install hours,
  fitment). On approval:
  - new parts get new ids in `src/seed/parts.ts`, with a generic `aiPromptSnippet` and a
    `parts:images` illustration (Gemini: ask first, 1 call each);
  - presets that used a removed part get the replacement (`src/seed/presets.ts`); the seed's
    fit assertion must pass;
  - `PART_VISUALS` and `PART_TRAITS` updated for new ids (3D and Help me choose);
  - links added; production seed; **re-render only presets whose parts changed** (Gemini:
    ask first, give the count).
- [ ] Old part ids stay valid for saved builds: keep removed parts in the database, just out
  of presets and hidden from the parts step (add `retired: true` to seed data and filter it;
  no schema change if it lives in seed only, otherwise ask before DDL).

### 3. Vehicles (after the user's decision above)

- **A:** add `4runner-5g` and `bronco-6g` as in the Tacoma plan: vehicle, fitment, presets,
  stock photos, renders, links, `VEHICLE_SHAPES`, `matchVehicle` aliases. Retire `patrol-y62`
  and `lc300` from new builds; keep their existing gallery builds reachable, out of the home
  page and Popular builds.
- **B:** no change here.
- **C:** hide them from the home page and Popular builds; keep `/build` access.

### 4. Lead with what earns

- [ ] The home page's featured build becomes one where **every** part has a Buy button (a
  truck build today). Choose by data: the curated build with the most linked parts, then
  the highest total.
- [ ] Gallery order: fully linked builds first.
- [ ] Popular builds on step 2: same ordering.

### 5. Content

- [ ] The blog plan's launch set is already truck- and Amazon-focused; keep it. Add, after it,
  one Wrangler JL guide (once step 1 has links), and with decision A, one 4Runner guide.
- [ ] Articles only feature parts with working Amazon links for that vehicle (already a
  blog-plan rule).

### 6. Amazon housekeeping (user)

- Check that `overlander.smartekai.com` is the site listed in Associates Central (the old
  `cars.` address redirects; list the new one).
- Watch Associates **Reports** weekly; the deadline is about late April 2027.
- Later, with sales: Amazon's Product Advertising API can supply real product photos in place
  of illustrations. Access depends on recent sales, so don't plan on it yet.

## Done when

Every popular build's parts have Amazon Buy buttons for its vehicle (or are listed as "no
link yet" on purpose), the home page leads with a fully linked build, the vehicle decision is
recorded and applied, and every ASIN list, seed, Gemini run, merge and deploy had the user's OK.
