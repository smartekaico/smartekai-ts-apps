# Spec 7 — MVP: popular builds and parts lists, no live AI renders

**Date:** 2026-11-07 · **Status:** approved direction · **App:** `apps/cars-4by4-builder`
(overlander.smartekai.com) · **Plan:** `plans/2026-11-07-mvp-no-ai-renders.md`

## 0. Decision

For the MVP, visitors don't upload a photo and nothing calls Gemini at request time.
They start from a **popular build** or **Help me choose**, customise the parts, and get a
**parts list** with prices and Buy buttons.

**Why:** Gemini cost drops to about zero, no sign-in or payment stands between a visitor
and the Buy buttons, the photo mismatch problem disappears, and the unproven payment path
goes quiet. Income is Amazon commission; the job right now is reaching 3 sales by about
late April 2027.

**Given up, on purpose:** "see it on my own truck", and credit sales. **Hidden, not
deleted:** all of that code stays, behind one switch, to return after the MVP.

## 1. The switch

`AI_RENDERS_ENABLED = false` in `src/lib/features.ts`: a plain constant, safe on client and
server. Turning AI back on is a one-line change and a deploy. **Off means:**

| Area | Behaviour |
|---|---|
| Step 1 | Tiles only; no upload |
| Step 3 | Parts list instead of Generate |
| `checkPhoto`, `startBuild`, `createInvoice` | Refused on the server, not just hidden: "This feature is paused." |
| Header | No Sign in, no credits chip, no My projects, for visitors. A signed-in admin keeps Sign out |
| `/credits` | Redirects to `/build` |
| Welcome-credit hook | Stays (it only fires on a Google sign-up); sign-up isn't offered anywhere |
| Copy | No "your own truck", no "Free with an account" |

Unchanged: `/sign-in` by direct link (admin needs it), `/admin`, the NOWPayments webhook
(a late payment must still credit), the render queue consumer, existing builds and the cron.

## 2. Flow

**1 Your truck → 2 Your build → 3 Your parts list**

**Step 1.** The vehicle tiles. Picking one goes to step 2.

**Step 2.** At the top, two ways in:
- **Popular builds:** the truck's three presets as photo cards with name and total, replacing
  the text pills. Tapping one ticks its parts.
- **Help me choose:** the existing 4 questions in the panel.

Below: category tabs and part cards, with the running total in the footer. 3D as now
(collapsed on phones). Footer button: **See my parts list**, disabled with 0 parts.

**Step 3.** One screen, no server write, everything from the URL
(`/build?vehicle=…&parts=…&step=list`), so it can be shared.

- Heading: "Your {truck} build".
- Image: if the parts exactly match a preset, its photo. Otherwise the **closest** preset
  photo, labelled **"Closest look. Your parts are listed below."** If nothing overlaps, the
  studio photo, labelled the same way. Never imply it shows the exact build.
- `ShopList` with per-part estimated price, install hours and fitment.
- **The full build report, free and with no sign-in** (§4a): parts total, estimated labour
  hours and cost, estimated total, and the advisory notes.
- Buy buttons, the commission disclosure, **Edit parts**, and **Copy link**.

`closestPreset(presets, partIds)`: pure; highest shared ÷ union; ties to the first preset.

## 3. Buy links without a saved build

Today `/go/$partId` finds the truck through `?build=`, and the configurator's `store` uses only
the default link. On step 3 there is no build, so per-vehicle parts (Bilstein, lift kits,
wheels, tonneau) would show no button or 404.

- `/go/$partId` also accepts `?vehicle=<id>`, validated against `vehicles`. `build` still
  wins when present. A bad id falls back to the default link.
- `getConfigurator`, when given a vehicle, loads `part_vehicle_links` for it and passes the
  URL to `toPublicPart`, so the label matches what `/go` will use.
- `ShopList` takes `buildId` or `vehicleId`.
- `outbound_clicks` gets `build_id` null for these: no schema change, attribution by part only.

## 4. Build pages

- CTA becomes **Customize this build** → `step=parts`, keeping the parts.
- `getBuild` returns full part data when the switch is off, so prices, install hours and
  fitment show on the public page. No sign-in needed. Remove the "Full build report" upsell.
- The slider stays, with its existing "AI visualization" note: those are real, saved images.
- The build page shows the same full report as step 3 (§4a).
- `/builds/<slug>/report` redirects to the build page when off. Its auth gate stays for later.

## 4a. The build report goes free

The report has no AI: catalogue prices and install hours, totals from `summarize()`, and
fixed-rule advisories from `getAdvisories()` in `src/lib/advisories.ts`. The MVP gives it
to everyone instead of dropping it with the report page.

- Extract `BuildReport` (`src/components/`) from `routes/builds/$slug_.report.tsx`: the
  Parts / Est. labour (hrs) / Estimated total breakdown, then the advisory list, with the
  same icons and wording.
- Use it on step 3, on the build page, and on the report page (for when the switch is back
  on), so there's one copy of the logic.
- Step 3 and the build page get a **Print** button (`window.print()`, hidden in print).
  Check the print layout: no header, footer or 3D, and readable black text.
- Advisories are guidance, not guarantees. Keep the existing wording.

## 5. Copy

- Home hero and meta: drop "on your own truck"; lead with real builds, real parts and prices.
  For example: "Plan your 4x4 build. Start from a popular build, swap parts, see the cost
  and where to buy."
- Remove "Make it yours — try it on your truck" and every photo-upload prompt.

## 6. Done when

- No visitor path can reach Gemini, a credit charge or a checkout, including by calling
  the server functions directly.
- A custom build shows correct Buy buttons for per-vehicle parts on all 7 vehicles.
- Step 3 and every build page show the labour estimate and advisories, with no sign-in.
- Parts-list URLs work when shared to a private window.
- Existing build links, `?step=review`, `?step=vehicle` with parts, and `/admin` still work.
- Tested in a real browser at 375 px and desktop, with results logged.

## Out of scope

Deleting AI, credit or payment code; schema changes; AvantLink; the blog; save-Gemini work
(paused, as it only matters when AI returns).
