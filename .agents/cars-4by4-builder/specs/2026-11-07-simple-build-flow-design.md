# Spec 6 — Simple build flow: truck, build, see it

**Date:** 2026-11-07 · **Status:** approved direction · **App:** `apps/cars-4by4-builder`
(overlander.smartekai.com) · **Plan:** `plans/2026-11-07-simple-build-flow.md`

## 0. Problem

Today: pick a truck → questions → parts → upload a photo.

1. **Mismatch bug.** `checkPhoto` only checks that a vehicle is in the photo. It never
   compares it with the chosen truck, so "Tacoma" plus a Silverado photo renders, with
   Tacoma parts and links.
2. **The photo comes last,** after every choice has been made for a possibly different truck.
3. **"Which truck?" is asked twice:** picker, then photo.
4. **An optional step blocks the way:** the questions sit before the parts.
5. **Changing truck wipes the build** (`parts: []`).

## 1. Decisions

| Question | Decision |
|---|---|
| Steps | Three: **1 Your truck · 2 Your build · 3 See it**. |
| Photo | Moves to step 1. The photo **chooses** the truck. |
| Questions | No longer a step: a "Not sure? 4 quick questions" card opening a panel on step 2. |
| 3D preview | Step 2 only; collapsed by default on phones, so the 3D code isn't downloaded unless opened. |
| Cost | Shown on the step 3 button, before the click. |
| Schema | No change. `startBuild` already writes `vehicleId` when a draft flips. |
| Hosting | Workers Free. No new server work beyond a small name lookup. |

Principles: ask once, as early as useful · one main decision and one main button per
screen · optional things aren't steps · cost before the click · never lose work ·
built for one thumb.

## 2. Step 1: Your truck

Two equal choices on one screen. Mobile: stacked, upload first.

**A. "Upload a photo of your truck"** (recommended label; opens the camera or gallery)

- Upload → `checkPhoto` → `matchVehicle(make, model)`.
- **Match:** "Looks like a Toyota Tacoma ✓" with a photo thumbnail, **Continue** and
  **Not right? Change**. Change opens the tiles.
- **No match, valid vehicle:** "We don't support your {make model} yet. Pick the closest
  match and we'll still use your photo." Tiles appear; the photo stays.
- **Not a vehicle, or detection fails:** the existing message, plus "Pick a model instead".

**B. "Pick a model"**: the existing tiles, using the studio photo. "No photo? No problem."

`matchVehicle` is a pure function: lower-cased, punctuation stripped, alias table per
vehicle id (`f-150`/`f150`, `silverado`, `sierra`, `tacoma`, `land cruiser`/`lc300`,
`patrol`, `wrangler`). Make and model must both agree where a make is given. It can't
judge generation or year; "Change" covers that.

## 3. Step 2: Your build

One screen. Order on phones: heading with truck name and **Change truck** → presets →
"Not sure? 4 quick questions" card → category tabs → part cards. Footer: parts count,
total and **Next: see it**.

- Questions open in a panel: bottom sheet on phones, centred on desktop. Submitting
  pre-ticks parts and closes it. "Why" lines stay.
- `@smartekai/ui` has no Dialog, so build a small panel in the app (focus moved in, Esc
  and backdrop close, `role="dialog"`).
- 3D: desktop in the side column as now. Phone: a "Show 3D preview" button; nothing
  loads until tapped.

**Changing truck keeps what fits.** Arriving at step 2 with parts that don't fit the
truck: drop them and show "2 upgrades don't fit the F-150 and were removed: …".

## 4. Step 3: See it

- Summary: photo (or studio photo) thumbnail, truck, upgrade names, estimated total.
  "Edit" returns to step 2.
- One button whose label says the cost:
  - free render available: **Generate my build · Free**
  - account with credits: **Generate my build · 10 credits**
  - guest, free render used: **Sign in to continue** (replaces Generate)
  - account, out of credits: **Buy credits to continue**
- No photo yet: a small "Use your own photo instead" link back to step 1.
- Existing server refusals stay as a fallback (network free-render limit →
  `confirm-credits`, daily cap, rate limits).

## 5. State

Still URL search params on `/build`, so refresh and share keep working.

- `step`: `vehicle` | `parts` | `review`. Old links: `photo` → `vehicle` if `parts` is
  set but no `photoId`, otherwise `review`; `questions` → `parts` with `help=1`.
- New `photoId` (the draft build id) carries the uploaded photo across steps.
- The thumbnail uses the local `URL.createObjectURL` while in the session. After a
  refresh it shows "Your photo ✓" with no image; no new endpoint.
- Expired or foreign draft: `startBuild` already says "That photo expired — upload it
  again."; that links to step 1.

**"Make it yours"** on a build page goes to step 1 keeping `parts`. After the photo, go
to **step 2**, so the user sees what fit (§3).

## 6. Server

- `checkPhoto`: `vehicleId` becomes optional and is no longer validated first. Returns
  `{ ok, buildId, detected, vehicleId: string | null }`.
- `builds.vehicle_id` is NOT NULL, so a draft with no match stores the first vehicle
  as a placeholder. `startBuild` overwrites it from the user's choice on the flip, and
  drafts never render without passing through it. Comment this.
- `describeVehicle` already prefers `detectedVehicle`, so a closest-match build still
  describes the real truck in the render prompt.

## 6a. Welcome credits (decided 2026-11-07)

A new account gets nothing extra today, so a guest who used the free render meets a
sign-in wall and then a payment wall. **Google sign-ups get 20 credits (2 renders).**

- **Google only.** Email sign-up has no verification, so throwaway accounts could farm
  Gemini spend. Email accounts get it once verification exists (not in this work).
- **Once per Google account, ever.** The ledger row uses
  `payment_ref = welcome:google:<Google account id>`, which is unique and survives user
  deletion (`user_id` is set null), so deleting and re-joining doesn't pay twice.
- **At most 2 grants per network per day:** `welcomeRules(ip)`. Over the limit, the
  account is created normally with no grant, and nothing is shown as an error.
- **Trigger:** Better Auth `databaseHooks.account.create.after`, only when
  `providerId === "google"`. Runs alongside the existing `databaseHooks` in
  `src/lib/auth.ts`. A failed grant must never fail the sign-in (log it, like
  `onLinkAccount`).
- **One statement:** a CTE inserts the ledger row (`reason: "grant"`, `ON CONFLICT DO
  NOTHING`) and adds to the balance only if that row was inserted, so the two can't
  diverge.
- `WELCOME_CREDITS = 20` in `credit-packs.ts`. The free render is unchanged.
- **Promise it only where true:** "Sign in with Google and get 20 free credits" on the
  sign-in page and on the step 3 sign-in button, only when Google sign-in is enabled.
  Don't promise it to someone who already has an account.

## 7. Done when

- A Silverado photo can't produce a Tacoma build unless the user explicitly chooses that.
- Three visible steps; no question screen in the path.
- Changing truck keeps fitting parts and says what was removed.
- Cost is visible on the final button for each user state.
- A new Google account gets 20 credits once; email accounts and repeat sign-ups don't.
- Phone users don't download the 3D code unless they open it.
- Old links keep working. Gate passes; click-through at 375 px and desktop.

## Out of scope

Email verification, saving answers, new vehicles, generation or year detection, accounts changes, visual
restyle beyond these screens, a new thumbnail endpoint.
