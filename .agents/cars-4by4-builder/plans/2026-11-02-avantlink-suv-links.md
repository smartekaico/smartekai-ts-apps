# AvantLink links for the SUV parts — Task

> **REMINDER: Part B starts when AvantLink approves application 1676225.**
> Status 2026-11-07: website verified, waiting for staff review (a few days;
> approval comes by email). Part A is done and live. Part B also needs the
> user's merchant approvals (ARB USA, 4 Wheel Parts, Baja Designs).

**Why:** 12 of 24 parts have no Buy button, almost all of them SUV parts — and
the home page's featured build is the Land Cruiser. They aren't on Amazon.com
(the Land Cruiser 300 and Patrol Y62 aren't US models), so the source is
**AvantLink**: ARB USA, 4 Wheel Parts and Baja Designs (Spec 1 §7).

| Unlinked part | Likely merchant | Link type |
|---|---|---|
| `arb-summit-bullbar`, `arb-stealthbar`, `arb-underbody-armor` | ARB USA | per vehicle (`lc300`, `patrol-y62`, `wrangler-jl`) |
| `arb-270-awning` | ARB USA / 4 Wheel Parts | one link |
| `ome-bp51` | ARB USA (Old Man Emu is ARB) | per vehicle |
| `ironman-rock-sliders`, `ironman-foam-cell`, `ironman-snorkel`, `ironman-hardshell-tent` | 4 Wheel Parts, if it carries Ironman 4x4 | per vehicle (tent: one link) |
| `smittybilt-src` | 4 Wheel Parts (Smittybilt is a 4WP brand) | per vehicle |
| `frontrunner-slimline-ii` | 4 Wheel Parts | per vehicle |
| `leitner-acs-forged` | none on AvantLink known; Leitner direct | per vehicle (Ford/GM) |

**Expect gaps:** US merchants may not stock LC300/Patrol fitments at all. A
blank row is fine (no button). Never link a product for a different vehicle.

## Part A — code, can be done now

**Problem:** an AvantLink deep link looks like
`https://www.avantlink.com/click.php?tt=cl&mi=<merchant>&pw=<site>&url=<encoded merchant URL>`.
`storeOf()` (`src/lib/store.ts`) sees the host `avantlink.com` and labels it
`"other"`, so the button can't say "Buy at ARB". Spec 1 planned a
`parts.affiliate_store` column for this; it isn't needed, because the merchant
is in the link's `url` parameter.

- [ ] Branch `feat/cars-network-links` from `main`.
- [ ] `storeOf`: when the host is a known network, unwrap the destination and
  classify **that**:
  - AvantLink (`avantlink.com`): the `url` query parameter;
  - CJ (`anrdoezrs.net`, `jdoqocy.com`, `tkqlhce.com`, `dpbolvw.net`,
    `kqzyfj.com`): the `url` query parameter, when present;
  - Impact (`*.sjv.io`, `*.pxf.io`): the `u` query parameter, when present.

  Unwrap **once** (no recursion), and only from those hosts. If the parameter is
  missing or isn't an http(s) URL, return `"other"`. A destination on Amazon/eBay
  inside a network link stays the merchant it names.
- [ ] Keep `withSubId` (`src/lib/subid.ts`) as is: AvantLink's sub-ID parameter
  `ctc` is already handled on the **outer** link. Check it doesn't touch the
  inner `url`.
- [ ] Update the comment above `MERCHANT_HOSTS` (it still says network links need
  a declared store).
- [ ] Spot-check with `npx tsx -e`: an AvantLink link wrapping
  `https://arbusa.com/...` → `arb`; wrapping `https://www.4wheelparts.com/...` →
  `4wheelparts`; no `url` → `other`; `url=javascript:…` → `other`;
  `avantlink.com.evil.com` → `other`.
- [ ] `links:check` shows the unwrapped store for a test row (branch DB only,
  delete the row after).
- [ ] Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- [ ] Commit `feat(cars): label AvantLink/CJ/Impact links by their destination merchant`;
  ask to merge; deploying can wait for Part B.

## Part B — after approval (user, then agent)

User:
1. In AvantLink, apply to **ARB USA**, **4 Wheel Parts** and **Baja Designs**
   (each merchant approves separately).
2. For each part above, open the exact product page for the vehicle on the
   merchant site, then AvantLink → *Link/Ad Tools* → *Custom Link Builder* →
   paste the product URL → copy the generated link.
3. Paste into `apps/cars-4by4-builder/scripts/parts-links.template.csv`:
   one-link parts as `partId,url`; per-vehicle parts as
   `partId,url,lc300` / `…,patrol-y62` / `…,wrangler-jl`.

Agent:
- [ ] `npm run links:check -- ./scripts/parts-links.template.csv` against the
  `cars-credits` branch first (store column must show `arb` / `4wheelparts`, HTTP 200
  or a redirect).
- [ ] Ask, then load into production: `npm run parts:links -- ./scripts/parts-links.template.csv`.
  **Seed before links**: never run `db:seed` after this without reloading links.
- [ ] Deploy Part A if not yet live (ask first).
- [ ] Live check: a Land Cruiser build's shopping list shows "Buy at ARB";
  `/go/<part>?build=<lc300 build>` redirects to `avantlink.com/click.php…&ctc=<build id>`.
- [ ] Log + current-work line in `.agents/cars-4by4-builder/plans/active.md`.

## Done when

Network links are labelled by their real merchant; every SUV part that a US
AvantLink merchant sells for that vehicle has a working, tagged link; parts
nobody sells stay blank.
