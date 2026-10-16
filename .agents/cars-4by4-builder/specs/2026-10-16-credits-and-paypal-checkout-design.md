# Credits + PayPal Checkout — Design

**Date:** 2026-10-16
**App:** `apps/cars-4by4-builder` (+ new `packages/paypal`)
**Status:** Agreed. Spec 3 of 3. **Depends on Spec 2**
(`2026-10-16-accounts-and-full-report-design.md`) for sign-in, guest
identity and `onLinkAccount`.

## 0. Business model

- Every visitor's **first render is free** — guests included.
- Each further render costs **1 credit**.
- Credits are bought as **one-time packs via PayPal** and require sign-in;
  guests never hold credits.
- Credits never expire. A failed render gives back what it used.
- Curated/gallery renders made by scripts (`render-gallery.ts`) bypass credits.

## 1. Data (cars database)

| Change | Purpose |
|---|---|
| `cars_user.credit_balance integer not null default 0` | Balance that checks run against. |
| `cars_user.free_render_used boolean not null default false` | One free render per user. |
| New `credit_ledger` table | Audit trail of every balance change. |

`credit_ledger` columns: `id text pk`, `user_id text not null` (FK
`cars_user.id` `on delete cascade`), `delta integer not null` (+N / −1),
`reason text not null` (`purchase | render | refund | grant`), `build_id
text` (no FK — ledger outlives cleaned-up builds), `paypal_order_id text
unique`, `amount_usd numeric(10,2)`, `created_at timestamp default now()`.
Index on `user_id`.

Added to `packages/db/src/cars/schema.ts`; applied with `db:push:cars`
(additive; ask before running).

### Atomicity

The cars db is `neon-http`: no interactive transactions. So:

- **Spend:** one conditional statement —
  `update cars_user set credit_balance = credit_balance - 1 where id = $u and credit_balance >= 1 returning credit_balance`.
  No row returned = no credit. Two concurrent renders cannot both spend the
  last credit.
- **Free render claim:** same shape —
  `update cars_user set free_render_used = true where id = $u and free_render_used = false returning id`.
- **Ledger rows** are written in the same `db.batch([...])` as the balance
  change where the balance change is unconditional (purchase, refund, grant).
  For spends, the ledger insert follows the conditional update that returned a
  row.

## 2. Credit packs

Defined in code, `src/lib/credit-packs.ts`:

```ts
export const CREDIT_PACKS = [
  { id: "pack-5", credits: 5, priceUsd: "4.99" },
  { id: "pack-15", credits: 15, priceUsd: "11.99" },
  { id: "pack-40", credits: 40, priceUsd: "24.99" },
] as const;
```

Prices and sizes are **provisional — the owner confirms them before switching
PayPal to live.** The server always resolves price from `id`; a client-sent
amount is never trusted.

## 3. Render gating — `startBuild`

After the existing validation, IP rate limit and daily cap, before the build
row flips to `processing`:

1. Read the session (`auth.api.getSession`). No session → treat as a guest
   with no free render left: "Sign in to keep building." (Spec 2 creates an
   anonymous session on the photo step, so this is rare.)
2. Claim the free render (atomic, §1) → succeeded: render, `builds.charge =
   "free"`.
3. Anonymous user → fail: "Sign in to keep building." with a link to
   `/sign-in?next=/build…`.
4. Spend 1 credit (atomic) → succeeded: ledger `render −1` with `build_id`,
   render, `builds.charge = "credit"`.
5. Otherwise fail: "You're out of credits." with a link to
   `/credits?next=/build…`.

New column `builds.charge text` (`"free" | "credit" | null`) records what the
render used, so a failure can return the right thing.

**Failure refund:** when `runGeneration` marks a build `failed`:
`charge = "credit"` → `credit_balance + 1` and ledger `refund +1`;
`charge = "free"` → `free_render_used = false`. Done once (guarded by
clearing `charge` in the same conditional update).

**Extra abuse guard:** at most **2 free renders per IP per day**
(new `freeRenderRules(ip)` in `src/server/rate-limit.ts`), checked only on
the free-render path. Clearing cookies yields a new guest, so this bounds it.

## 4. Guest → account

Extends Spec 2's `onLinkAccount`:

```
newUser.free_render_used = newUser.free_render_used OR anonymousUser.free_render_used
```

So signing up does not reset the free render. Guests never hold credits, so
no balance moves.

## 5. PayPal purchase flow

### `packages/paypal` — thin client (AGENTS.md: providers behind a package)

`fetch` against PayPal REST, no SDK dependency:

- `getAccessToken()` — OAuth2 client-credentials, cached until expiry.
- `createOrder({ amountUsd, customId, description })` → `{ id }`
  (Orders v2, `intent: "CAPTURE"`, currency `USD`).
- `captureOrder(orderId)` → `{ status, amountUsd, currency, customId }`.
- Base URL from `PAYPAL_ENV` (`sandbox` → `api-m.sandbox.paypal.com`,
  `live` → `api-m.paypal.com`).

### Server functions — `src/lib/credits.ts`

- `getCredits()` → `{ balance, freeRenderUsed }` for the header / build footer.
- `createPayPalOrder({ packId })` — signed-in, non-anonymous only; looks up
  the pack; `customId = "<userId>:<packId>"`; returns the order id.
- `capturePayPalOrder({ orderId })` — captures, then requires: status
  `COMPLETED`, amount + currency equal the pack, `customId` user = session
  user. Then `db.batch`: insert ledger `purchase +N` with `paypal_order_id`
  and `amount_usd`, and `credit_balance + N`. A duplicate `paypal_order_id`
  (unique violation) = already credited → return the current balance, no
  error. Any check failing after a successful capture is logged loudly for
  manual review (money taken, no credits).

### Page — `/credits`

Signed-in only (else `/sign-in?next=/credits`). Shows balance and the packs;
each pack has PayPal buttons via `@paypal/react-paypal-js` (new dependency),
wired to the two server functions. On success → toast, balance refresh, then
`next` if present.

### Not in this spec

PayPal webhooks (capture happens server-side synchronously; if the browser
closes before capture, PayPal has not taken payment), automated refunds
(do refunds in the PayPal dashboard, then insert a negative `grant` row by
hand), invoices/receipts beyond PayPal's own email, taxes.

## 6. UI

- Header (signed in): credit balance chip → `/credits`.
- Build footer, before Generate: "Free render" / "Uses 1 credit (N left)" /
  "Sign in to keep building" / "Buy credits".

## 7. Env + setup

`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` — in `turbo.json`
`globalEnv`, `.env.local`, the cars Dokploy app. The client id is also
exposed to the browser for the buttons. Start with a PayPal **sandbox** REST
app; create the live app only after packs and prices are confirmed.

## 8. Done when

Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`
plus `--filter=@smartekai/paypal`. Click-through with PayPal sandbox:

- [ ] Guest's first render is free; the second asks to sign in.
- [ ] After sign-up, the free render is still used (no second free one).
- [ ] Buying a pack raises the balance by exactly the pack's credits; calling
      capture again for the same order does not credit twice.
- [ ] A render spends exactly 1 credit (one ledger `render −1` row).
- [ ] A forced render failure refunds the credit (or the free render).
- [ ] Zero balance → "out of credits" → `/credits` → buy → back to the build.
- [ ] Third free render from one IP in a day is refused.
