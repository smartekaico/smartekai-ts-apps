# Credits + NOWPayments Checkout — Design

**Date:** 2026-10-16 (revised 2026-10-17: PayPal → NOWPayments, new packs)
**App:** `apps/cars-4by4-builder` (+ new `packages/nowpayments`; `packages/paypal` removed)
**Status:** Agreed. Spec 3 of 3. **Depends on Spec 2**
(`2026-10-16-accounts-and-full-report-design.md`) for sign-in, guest
identity and `onLinkAccount`.

> **Revision note (2026-10-17).** The first version of this spec used PayPal
> (Orders v2 + `@paypal/react-paypal-js`). That was implemented on
> `feat/cars-credits` (commits `dea6a26`…`2648960`) but never deployed, and
> its schema exists only on the Neon branch `cars-credits`. The payment
> provider is now **NOWPayments, USDT on Tron (TRC20) only**, and the packs
> changed. Everything not about the payment provider or the packs (§0, §1
> atomicity, §3 render gating, §4 guest → account, §6 UI chip/footer) is
> unchanged and already built. The file name keeps "paypal" for git history.

## 0. Business model

- Every visitor's **first render is free** — guests included. (Worth one
  render = `RENDER_COST` = 10 credits.)
- Each further render costs **10 credits** (`RENDER_COST`). Credits are a
  unit, not a render count, so cheaper or pricier actions (variations, HD
  renders) can be priced later without repricing packs. The UI always shows
  credits with approximate renders ("300 credits ≈ 30 renders").
- Credits are bought as **one-time packs paid in USDT on Tron (TRC20) via
  NOWPayments** and require sign-in; guests never hold credits.
- Credits never expire. A failed render gives back what it used.
- Curated/gallery renders made by scripts (`render-gallery.ts`) bypass credits.

## 1. Data (cars database)

| Change | Purpose |
|---|---|
| `cars_user.credit_balance integer not null default 0` | Balance that checks run against. |
| `cars_user.free_render_used boolean not null default false` | One free render per user. |
| `builds.charge text` (`"free" \| "credit" \| null`) | What a render used, so a failure refunds the right thing (§3). |
| New `credit_ledger` table | Audit trail of every balance change. |
| New `credit_purchases` table | One row per checkout attempt; tracks the NOWPayments invoice/payment and its status. |

`credit_ledger` columns: `id text pk`, `user_id text` (FK `cars_user.id`
`on delete set null` — deleting a user keeps the audit trail), `delta integer
not null` (+N / −`RENDER_COST`), `reason text not null` (`purchase | render |
refund | grant`), `build_id text` (no FK — ledger outlives cleaned-up
builds), **`payment_ref text unique`** (provider-neutral; for NOWPayments it
is `nowpayments:<payment_id>`; constraint `credit_ledger_payment_ref_unique`),
`amount_usd numeric(10,2)`, `created_at timestamp default now()`. Index on
`user_id`. (Was `paypal_order_id` in the first version — renamed; it only ever
existed on the Neon branch.)

`credit_purchases` columns: `id text pk` (UUID; also sent to NOWPayments as
`order_id`), `user_id text` (FK `cars_user.id` `on delete set null`),
`pack_id text not null`, `credits integer not null`, `amount_usd
numeric(10,2) not null` (snapshot of the pack price at checkout),
`provider_invoice_id text`, `provider_payment_id text unique`, `status text
not null default 'pending'`, `created_at timestamp default now() not null`,
`updated_at timestamp default now() not null`. Index on `user_id`.

`credit_purchases.status` values:

| Status | Meaning |
|---|---|
| `pending` | Row created; invoice being created or created, no payment yet. |
| `waiting` / `confirming` / `sending` | Mirrors NOWPayments while a payment is in flight. |
| `credited` | Credits added (from NOWPayments `confirmed` or `finished`). Terminal; never overwritten. |
| `partially_paid` | Underpaid. No credits; manual review. |
| `expired` / `failed` / `refunded` | No credits. `failed` is also used when invoice creation fails. |
| `review` | A paid status whose amount/currency/invoice didn't match. No credits; manual review. |

Schema lives in `packages/db/src/cars/schema.ts`. **Never `db:push:cars`
against production** (`.agents/logs/2026-10-16-cars-db-push-drops-sequences.md`):
hand-written DDL, cross-checked with `drizzle-kit generate`, rehearsed on a
Neon branch with `psql -1`, applied to production only after asking.

### Canonical DDL (production migration)

Additive only, applied in one transaction (`psql -v ON_ERROR_STOP=1 -1`).
Extracted from `drizzle-kit generate` against `src/cars/schema.ts`
(2026-10-17) and rehearsed on the Neon branch `cars-credits` (fresh from
`production`): applied cleanly, and `db:push:cars` against the branch then
planned only the 8 known legacy `DROP SEQUENCE`s — no schema drift.
Production already has `builds.user_id` (Spec 2).

```sql
ALTER TABLE "cars_user" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;
ALTER TABLE "cars_user" ADD COLUMN "free_render_used" boolean DEFAULT false NOT NULL;
ALTER TABLE "builds" ADD COLUMN "charge" text;
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"build_id" text,
	"payment_ref" text,
	"amount_usd" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_payment_ref_unique" UNIQUE("payment_ref")
);
CREATE TABLE "credit_purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"pack_id" text NOT NULL,
	"credits" integer NOT NULL,
	"amount_usd" numeric(10, 2) NOT NULL,
	"provider_invoice_id" text,
	"provider_payment_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_purchases_provider_payment_id_unique" UNIQUE("provider_payment_id")
);
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_cars_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cars_user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_cars_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cars_user"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "credit_ledger_user_id_idx" ON "credit_ledger" USING btree ("user_id");
CREATE INDEX "credit_purchases_user_id_idx" ON "credit_purchases" USING btree ("user_id");
```

### Atomicity

The cars db is `neon-http`: no interactive transactions. So:

- **Spend:** one conditional statement —
  `update cars_user set credit_balance = credit_balance - $cost where id = $u and credit_balance >= $cost returning credit_balance`.
  No row returned = not enough credits.
- **Free render claim:** same shape on `free_render_used`.
- **Refund of a failed build:** one statement (data-modifying CTEs) that
  clears `builds.charge` and restores the balance/flag + ledger row together.
- **Crediting a payment:** one statement (data-modifying CTEs):
  flip `credit_purchases.status` to `credited` **only if it isn't already**,
  insert the ledger `purchase +N` row with the unique `payment_ref`, and add
  N to `cars_user.credit_balance`. The row lock on the purchase serializes
  concurrent IPNs; the unique `payment_ref` is a second guard. Exactly once
  per purchase, across retries and out-of-order notifications.

## 2. Credit packs

Defined in code, `src/lib/credit-packs.ts`:

```ts
export const RENDER_COST = 10;

export const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 100, priceUsd: "14.00" }, // ≈ 10 renders
  { id: "pro", name: "Pro", credits: 300, priceUsd: "30.00" },         // ≈ 30 renders
] as const;
```

Plus the free first render (§0). The server always resolves price from `id`;
a client-sent amount is never trusted.

**Crypto minimums:** NOWPayments enforces a per-currency minimum payment.
Before going live, check `GET /v1/min-amount?currency_from=usdttrc20&currency_to=usdttrc20&fiat_equivalent=usd`
— its `fiat_equivalent` must be comfortably below $14.00 (the Starter
price). If it isn't, Starter cannot be paid and the packs must change
(ask the user).

> **2026-10-18 — checked, then made a runtime rule.** `fiat_equivalent` is **$11.35** (`min_amount`
> 11.367146 usdttrc20), comfortably below $14.00, so Starter is payable; the live payment page
> renders a $14 invoice as 13.96 USDT. **Use exactly the pair above.** `currency_from=usd`
> answers a *different* question — "what USD amount converts into the USDT minimum" — and
> reports $18.55; mistaking that for the floor makes Starter look unpayable (it did, and it
> isn't). The floor also moves, so this is no longer only a go-live checklist item:
> `startCheckout` (spec §5) re-reads it per checkout and refuses a pack below it, before
> creating a purchase row.

## 3. Render gating — `startBuild` (built)

After the existing validation, IP rate limit and daily cap, before the build
row flips to `processing`:

1. Read the session. No session → "Sign in to keep building."
2. Claim the free render (atomic, §1) → render, `builds.charge = "free"`.
   If this network's free renders are used up today (2/IP/day), release the
   claim: guests → "Sign in to keep building."; accounts → "Free renders from
   this network are used up today. Generate again to use 10 credits."
   (`confirm-credits`, retried with `allowCredits`).
3. Anonymous user → "Sign in to keep building." (`sign-in`).
4. Spend `RENDER_COST` credits (atomic) → ledger `render −10` with
   `build_id`, render, `builds.charge = "credit"`.
5. Otherwise "You're out of credits." (`buy-credits` → `/credits?next=…`).

**Failure refund:** when a build is marked `failed` (render error, stale
timeout on read, or the `scripts/cleanup.ts` stale sweep), the charge is
given back exactly once (§1). Status-guarded: a build that completes
meanwhile is left alone.

## 4. Guest → account (built)

`onLinkAccount`: `newUser.free_render_used = newUser.free_render_used OR
anonymousUser.free_render_used`. Guests never hold credits, so no balance moves.

## 5. NOWPayments purchase flow

**Provider settings:** `price_currency = "usd"`, `pay_currency =
"usdttrc20"` (USDT on Tron only — no currency picker). Base currency USD in
the NOWPayments dashboard.

### `packages/nowpayments` — thin client (AGENTS.md: providers behind a package)

`@smartekai/nowpayments`, plain `fetch`, no SDK, CJS `dist/` committed (same
conventions as the removed `packages/paypal`):

- Base URL from `NOWPAYMENTS_ENV`: `sandbox` →
  `https://api-sandbox.nowpayments.io/v1`, `live` →
  `https://api.nowpayments.io/v1`, anything else (including unset) **throws**.
- Auth header `x-api-key: $NOWPAYMENTS_API_KEY`.
- `createInvoice(input)` → `POST /invoice` → `{ id, invoiceUrl }`.
  `price_amount` is sent as a **JSON number** (`14`, `30`): the API docs'
  request examples use numbers, and the response echoes it back as a string.
  The pack keeps `priceUsd` as a decimal string; the client converts with
  `Number(pack.priceUsd)`. Comparisons are done in integer cents.
- `getPayment(paymentId)` → `GET /payment/{id}` → a normalized `NowPayment`
  (`paymentId`, `invoiceId`, `orderId`, `status`, `priceAmount`,
  `priceCurrency`, `payCurrency`, `payAmount`, `actuallyPaid`; ids as
  strings — the API returns them as numbers).
- `getMinAmount(from, to)` → `GET /min-amount` (setup/go-live checks only).
- `verifyIpnSignature(rawBody, header, secret)` — see §5 IPN (a).
- `signIpn(payload, secret)` — the same HMAC, for local replay tests.
- `NowPaymentsError` with `operation`, `status` (0 = timeout/network),
  `body`, `code` (NOWPayments' error `code`, or `TIMEOUT` / `NETWORK` /
  `BAD_RESPONSE`). 15 s timeout on every request.

Removed: `packages/paypal` (`@smartekai/paypal`), `@paypal/react-paypal-js`,
`PAYPAL_*` env vars, the `@smartekai/paypal` entry in `vite.config.ts`
`ssr.external`.

### Flow

1. **`/credits`** (signed-in accounts only; guests are redirected to
   `/sign-in?next=/credits…`, as today) shows the balance and the two packs,
   each with a "Pay with USDT (TRC20)" button.
2. **Server fn `createInvoice({ packId, next? })`** — account required; at
   most 10 checkouts per account per hour (in-memory rule, like the render
   limits); pack resolved server-side; requires `PUBLIC_SITE_URL`. Inserts a
   `credit_purchases` row (`pending`), then calls `POST /v1/invoice` with:
   `price_amount` (number), `price_currency: "usd"`, `pay_currency:
   "usdttrc20"`, `order_id` = purchase id, `order_description` = `4x4 Builder
   <Pack> pack - <N> credits` (ASCII only — see IPN (a)), `ipn_callback_url`
   = `${PUBLIC_SITE_URL}/api/nowpayments/ipn`, `success_url` =
   `${PUBLIC_SITE_URL}/credits?purchase=<id>[&next=…]`, `cancel_url` =
   `${PUBLIC_SITE_URL}/credits[?next=…]`. Stores `provider_invoice_id`,
   returns `invoice_url`. The client does a full navigation to it. If the
   invoice call fails, the purchase row becomes `failed` and the user sees
   "Couldn't start checkout — try again."
3. **IPN route `POST /api/nowpayments/ipn`** (TanStack Start server route,
   like `src/routes/go/$partId.ts`):
   - **(a) Signature.** `x-nowpayments-sig` must equal hex HMAC-SHA512 of
     the JSON body re-serialized with keys sorted, keyed by
     `NOWPAYMENTS_IPN_SECRET`; compared with `timingSafeEqual`. Sources
     disagree whether sorting is recursive: NOWPayments' own Node sample is
     `JSON.stringify(params, Object.keys(params).sort())` (top-level key list
     as a replacer), the PHP sample `ksort` (top level), third-party adapters
     sort recursively. **We compute the recursive form first and also accept
     the documented top-level-replacer form**; both need the secret, so
     accepting either costs no security (and the body is never trusted
     anyway, see (c)). The route logs which form matched; the e2e step
     confirms against a real sandbox IPN and drops the form that never
     matches. Invalid/missing signature → **401**. `order_description` is
     ASCII-only so PHP-vs-JS unicode escaping can't matter.
   - **(b) IP allowlist (optional).** If `NOWPAYMENTS_IPN_IPS` is set
     (comma-separated), the request IP (`requestIp()`, Traefik's
     `X-Forwarded-For`) must be in it, else **403**. Unset = skipped. The
     signature is the primary control.
   - **(c) Never trust the body.** Take only `payment_id` from it, then
     `GET /v1/payment/{payment_id}` with the API key and use only that
     response. (This also makes out-of-order IPNs harmless: we always act on
     the payment's current status.)
   - **(d) Match.** Purchase by `order_id`. For a paid status, require
     `price_amount` = purchase `amount_usd` (in cents; the purchase row is the
     server-side pack snapshot), `price_currency` = `usd`, `pay_currency` =
     `usdttrc20`, and `invoice_id` = stored `provider_invoice_id`.
   - **(e) Status handling** (from the GET, not the body):
     - `confirmed` / `finished` → credit **exactly once** (§1 atomic
       statement; ledger `payment_ref = nowpayments:<payment_id>`; purchase
       → `credited`, `provider_payment_id` stored). Already credited by the
       same payment → no-op. Already credited by a *different* payment (the
       buyer paid twice) → `[nowpayments] MANUAL REVIEW`.
     - `partially_paid` → no credit, status `partially_paid`,
       `[nowpayments] MANUAL REVIEW` log.
     - `waiting` / `confirming` / `sending` → update status only.
     - `expired` / `failed` / `refunded` → record the status, no credit. A
       `refunded` payment that was already credited → `MANUAL REVIEW` log;
       never auto-claw-back.
     - Any mismatch in (d) with a paid status → status `review`,
       `MANUAL REVIEW` log, no credit.
     - Unknown `order_id` → logged (`MANUAL REVIEW` if paid), 200.
     - A `credited` purchase is never downgraded by any later status.
   - **(f) Response.** 200 only after processing. 5xx on transient errors
     (`GET /payment` failed or timed out → 503; DB error → 500) so
     NOWPayments retries. Idempotent across retries.
4. **Return page `/credits?purchase=<id>`** — a status panel above the packs:
   "Waiting for payment" (`pending`/`waiting`), "Confirming on Tron"
   (`confirming`/`sending`), "✓ N credits added" (`credited`), "Payment
   expired" (`expired`/`failed`), "Underpaid — contact support with purchase
   id …" (`partially_paid`), "Payment refunded" (`refunded`), "We're checking
   this payment — contact support with purchase id …" (`review`). Polls server
   fn `getPurchase({ id })` (owner-only; someone else's id = "not found")
   every 4 s until terminal; on `credited` it calls `notifyCreditsChanged()`
   (header chip) and refreshes the balance, and offers "Back to your build"
   when `next` is present.

### Account setup (user, external — not code)

1. NOWPayments account (sandbox: `account-sandbox.nowpayments.io`; live:
   `account.nowpayments.io`). Separate keys per environment.
2. Dashboard → Settings → **Payments**: base currency **USD**; enable
   **USDT TRC20** (`usdttrc20`) as an accepted coin; set the outcome
   (payout) wallet.
3. **API key** (Settings → API keys) → `NOWPAYMENTS_API_KEY`.
4. **IPN secret** (Settings → Payments → Instant payment notifications) →
   `NOWPAYMENTS_IPN_SECRET`.
5. **Inbound IPNs:** if the VPS firewall restricts inbound 443, whitelist
   NOWPayments' IPN source IPs (list from support@nowpayments.io) so IPNs
   reach the webhook. The same list can go in `NOWPAYMENTS_IPN_IPS`.
   (cars is served by Traefik directly, no Cloudflare proxy — per
   `2026-10-13-cars-deployment.md`; if a proxy is ever added, its WAF/bot
   rules must let `/api/nowpayments/ipn` through and the IP check must read
   the proxy's client-IP header.)
6. **Outbound API whitelist:** if the dashboard's API IP whitelist is
   enabled, add the VPS public IPv4 + IPv6 (live) and the developer's IP
   (sandbox/dev calls).
7. Wallet-address whitelisting is for payouts — not used.

### Not in this spec

Automated refunds (refund in the NOWPayments dashboard, then insert a
negative `grant` row by hand), top-ups of underpaid payments, other coins or
networks, payouts, invoices/receipts beyond NOWPayments' own, taxes, cleanup
of abandoned `pending` purchase rows.

## 6. UI

- Header (signed in): credit balance chip ("230 credits") → `/credits`. (built)
- Build footer, before Generate: "Free render" / "Uses 10 credits (you have
  230)" / "Sign in to keep building" / "Buy credits". (built)
- `/credits` pack cards: name, credits, "≈ N renders", price in USD, "Pay
  with USDT (TRC20)". Footnote: "Payments are processed by NOWPayments in
  USDT on the Tron network (TRC20). Prices in USD."
- `/credits?purchase=<id>` status panel (§5 flow 4).

## 7. Env + setup

`NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_ENV`
(`sandbox` | `live`), optional `NOWPAYMENTS_IPN_IPS` — in the **root**
`.env.local`, `turbo.json` `globalEnv`, and the cars Dokploy app. Server-only;
nothing is exposed to the browser. `PUBLIC_SITE_URL` (already in
`globalEnv`) must be set wherever checkout runs — in dev, to a tunnel URL.
Start with the **sandbox**; switch to live only after asking.

## 8. Testing approach

localhost can't receive IPNs. Options, both used:

- **Tunnel:** `cloudflared tunnel --url http://localhost:3002` (a temporary
  `*.trycloudflare.com` URL), dev server started with `PUBLIC_SITE_URL` = the
  tunnel URL, NOWPayments sandbox keys.
- **Local replay:** a temporary script signs an IPN body with
  `signIpn(…, NOWPAYMENTS_IPN_SECRET)` and POSTs it to the dev server; the
  route's `getPayment` still hits the real sandbox.
- The status logic (`applyPayment`) is also exercised directly with synthetic
  `NowPayment` objects against the Neon branch, so the matrix doesn't depend
  on what the sandbox can simulate.

## 9. Done when

Gate: `npx turbo run type-check lint build --filter=cars-4by4-builder...`
plus `--filter=@smartekai/nowpayments`. Click-through on the Neon branch +
NOWPayments sandbox:

- [ ] Guest's first render is free; the second asks to sign in.
- [ ] After sign-up, the free render is still used.
- [ ] A render spends exactly 10 credits; a balance of 9 is refused.
- [ ] A forced render failure refunds the credit (or the free render).
- [ ] Third free render from one IP in a day is refused (accounts get the
      confirm-credits prompt).
- [ ] `min-amount` for `usdttrc20` (fiat equivalent) is below $14.00.
- [ ] The IPN signature form is confirmed against a real sandbox IPN.
- [ ] `confirmed`/`finished` → credited exactly once (+100 / +300); a
      duplicate IPN doesn't credit twice.
- [ ] `partially_paid` → no credit + `MANUAL REVIEW`; `expired` → no credit.
- [ ] Tampered signature → 401.
- [ ] Body says `finished` but GET says `waiting` → no credit.
- [ ] Zero balance → "out of credits" → `/credits` → pay → return page shows
      "✓ 100 credits added" → back to the build.
