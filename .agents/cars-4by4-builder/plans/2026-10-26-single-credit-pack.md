# Single credit pack, offered only when the user is out — Task

> For the implementing agent. Steps use `- [ ]` checkboxes.

**Goal:** sell **one** pack — the smallest, **Starter: 100 credits for $14
(≈ 10 renders)** — and offer it **only when the user can't render any more**:
no credits left for a render. Until then, no pack and no Buy button is shown.

**Decided with the user (2026-10-26):** "single package with credits, the minimum
one, enabled when the credit limits are reached". Read as:

- the Pro pack (300 credits / $30) is removed from sale;
- "out" = a signed-in account whose `credit_balance < RENDER_COST` (10). The free
  render is not counted: a user who still has it unused but whose network's free
  renders are used up today gets `buy-credits` from `chargeRender` and must be
  able to buy, and `credit_balance < 10` covers that case too;
- the server enforces the rule, not only the UI.

If the user reads it differently at review (e.g. also hide the header credits
chip), change only §2's eligibility rule.

**Order:** after the patch-dependency task, before the admin-users task
(`2026-10-22-admin-users.md`). Live site: overlander.smartekai.com.

## Ground rules

- Branch `feat/cars-single-pack` from `main`. Never commit to `main`; merging
  and the production deploy need the user's OK.
- Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`.
- No schema change and no DDL. Past purchases keep working: `credit_purchases`
  snapshots the pack id, credits and price, and `getPurchaseStatus` already falls
  back to the pack id when `findPack` no longer knows it.
- Payments are **live** (`NOWPAYMENTS_ENV="live"`). Don't create a real checkout
  while testing; stop at the NOWPayments invoice page (don't pay) or test on
  `cars-credits` with a sandbox key if the user provides one.
- Local dev on the Neon branch `cars-credits` only
  (`DATABASE_NEONDB_SMARTEKAI="$(npx neon connection-string cars-credits --project-id ancient-hall-95124568 --pooled)" npm run dev-vars -w cars-4by4-builder`).

## Files

- `apps/cars-4by4-builder/src/lib/credit-packs.ts`
- `apps/cars-4by4-builder/src/lib/credits.ts` (`createInvoice`, `getCreditsPage`)
- `apps/cars-4by4-builder/src/routes/credits.tsx`
- whatever renders the `buy-credits` toast action (start at
  `src/components/PhotoStep.tsx` `blockAction`) — check only; it should keep
  linking to `/credits`.
- `.agents/cars-4by4-builder/specs/` Spec 3 — add a dated note that the pack line-up changed.

## Steps

### 1. One pack

- [ ] `credit-packs.ts`: `CREDIT_PACKS` keeps only
  `{ id: "starter", name: "Starter", credits: 100, priceUsd: "14.00" }`. Update
  the comment (the NOWPayments floor note stays; $14 is still above the ~$11.35
  USDT-TRC20 minimum, which `startCheckout` re-checks per checkout).
- [ ] Remove the "Pro"/300 wording anywhere it appears (`rendersFor` doc comment
  says "300 credits ≈ 30 renders" — change the example to 100 ≈ 10).
- [ ] `findPack("pro")` now returns `undefined`, so `createInvoice` refuses it
  ("That pack doesn't exist."). That's intended.

### 2. Eligibility rule (one helper, used by server and page)

- [ ] In `credit-packs.ts` (client-safe) add

```ts
/** A pack is offered only when an account can't afford one more render. */
export function canBuyCredits(state: CreditState): boolean {
  return state.account && state.balance < RENDER_COST;
}
```

### 3. Server enforces it

- [ ] `createInvoice`: after `accountUser()` and `findPack`, load the user's
  `getCreditState(user)`; if `!canBuyCredits(state)` return
  `{ ok: false, error: "You still have credits — buy more when you run out." }`.
  Do this **before** `tryConsume(checkoutRules…)` so a refused request doesn't use
  a checkout slot.
- [ ] `getCreditsPage` returns `canBuy: canBuyCredits(state)` alongside `balance`.

### 4. `/credits` page

- [ ] One centered pack card instead of the 2-column grid (`max-w-sm`, no
  `md:grid-cols-2`).
- [ ] `canBuy` false: no card and no Buy button. Show the balance line as now plus
  "You can buy more credits when you run out." and a link back to `next` (or
  `/build`). The purchase-status panel (`?purchase=`) must still render either
  way — a user returning from NOWPayments may already have credits.
- [ ] `canBuy` true: the card with "Buy 100 credits — $14", as now.
- [ ] Header chip (`SiteHeader.tsx`) still shows the balance and links to
  `/credits`; no change unless the user asks.

### 5. Verify on `cars-credits`

- [ ] Account with 0 credits and free render used → `/credits` shows the one
  Starter card; Buy creates a purchase row and redirects to the NOWPayments
  invoice (stop there, don't pay).
- [ ] Account with ≥ 10 credits (set with SQL on the **branch**) → no card, the
  message shows; calling `createInvoice` directly (copy the request from
  devtools) returns the "still have credits" error and writes no purchase row.
- [ ] Out of credits during a build → the `buy-credits` toast links to `/credits`
  and shows the card; after a (branch-simulated) credit, `next` returns to the build.
- [ ] `createInvoice` with `packId: "pro"` → "That pack doesn't exist."
- [ ] An old purchase id (`?purchase=` of an earlier row) still shows its status.
- [ ] Gate passes; `npx wrangler deploy --dry-run --outdir /tmp/cars-dry` succeeds.

### 6. Ship (ask first)

- [ ] Commit `feat(cars): one Starter credit pack, offered only when out of credits`.
- [ ] Ask the user to merge, then to deploy (`npm run deploy -w cars-4by4-builder`).
- [ ] After deploy: on overlander.smartekai.com, a signed-in account with credits
  sees no pack; `/credits` loads without errors in `wrangler tail`.
- [ ] Add a current-work line to `.agents/cars-4by4-builder/plans/active.md` and
  the Spec 3 note.

## Done when

- Only the Starter pack is sold, and only to accounts with fewer than 10 credits,
  enforced on the server.
- Past purchases and the return page work unchanged.
- Gate passes; merged and deployed only with the user's OK.

## Out of scope

Price changes, new currencies, subscriptions, changing `RENDER_COST`, hiding the
header credits chip.
