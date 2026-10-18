# The "Starter is below the crypto minimum" scare, and the real IPN signature form — 2026-10-18

## Symptom

Spec 3 §2 (and its go-live checklist) require NOWPayments' `usdttrc20` minimum to
sit "comfortably below $14.00 (the Starter price)". A check reported
`min_amount: 18.547373110254522 / fiat_equivalent: 18.54737311` — **above**
$14.00 — and an earlier reading had reported `11.36 USDT / fiat 11.34`. Read as
the same query drifting over time, that looked like a floating floor that had
outgrown the Starter pack, i.e. a pack that could not be paid.

Acting on that, Starter was repriced to 150 credits / $20.00 and a runtime floor
check was added to `startCheckout`.

**All of that was wrong**, and the repricing was reverted the same day.

## Root cause

The two figures are not one query drifting — they are **two different
questions**, asked with a different `currency_from`:

| query | `min_amount` | `fiat_equivalent` |
| --- | --- | --- |
| `from=usd&to=usdttrc20&fiat_equivalent=usd` | 18.547373110254522 | 18.54737311 |
| `from=usdttrc20&to=usdttrc20&fiat_equivalent=usd` | 11.367146 | 11.34553251 |

- `currency_from=usd` answers "what **USD** amount converts into the USDT
  minimum" — a conversion question.
- `currency_from=usdttrc20` answers "what is the minimum **usdttrc20 deposit**"
  — the question our invoices are actually subject to, and the one a USD→USDT
  conversion cannot stand in for. It is ~60% lower.

The spec prescribed the second (`from=usdttrc20`), and the user's dashboard
("Minimum deposit amount — 11.367146 USDT") agrees with it. The 11.36/11.34
reading was this call; the 18.55 reading was the other one, and the
contradiction was mistaken for time-drift.

## Evidence

- Corrected query, live: `min_amount=11.367146 usdttrc20`, `fiat_equivalent=11.34553251` — Starter
  `$14.00` clears it with ~24% headroom.
- The decisive one: the **live payment page** for a real `$14` invoice
  (`iid 5869119746`, created with `price_amount: 14`, `price_currency: usd`,
  `pay_currency: usdttrc20`) renders `Amount ~ $14` → **13.960683 USDT (TRX)**
  with a deposit address and no error. It was payable all along.
- `POST /v1/invoice` with `price_amount: 14` returns `HTTP 200` regardless — the
  invoice endpoint does not validate the floor, so "the API accepted it" proves
  nothing about payability. Only the payment page (or `/min-amount`) does.
- `priceMeetsMinimum` + the real pack prices, executed against the live floor:
  **13/13 PASS** (both packs allowed; `$10` refused; fail-open on an
  unset/zero/unparsable floor; a cent under refused).

## The IPN signature form (settled)

A **real** signed IPN arrived from NOWPayments over the public tunnel and was
accepted, which settles the question left open earlier. The dev log:

```
[nowpayments] ipn: payment 6382688870: signature matched (recursive form)
[nowpayments] payment 6382688870 (order 04061f2f-…, status waiting): purchase 04061f2f-… → waiting
[nowpayments] ipn: payment 6382688870 (waiting): status-updated
```

So: NOWPayments signs with the **recursive** form (all keys sorted at every
depth), *not* the top-level `JSON.stringify(body, Object.keys(body).sort())`
replacer its own docs show. `matchIpnSignature` still accepts both and logs
which matched; now that the real form is known, the unused branch is a
candidate for deletion.

This also proves, without a settled payment: the IPN route is reachable over the
tunnel, `NOWPAYMENTS_IPN_SECRET` matches the account's, the signature is
enforced, and a non-paid status (`waiting`) is recorded with its provider
payment id. Only `confirmed`/`finished` → `credited` remains unobserved.

## Consequence

- Packs are **unchanged**: Starter 100 credits / $14.00, Pro 300 / $30.00.
- `startCheckout` keeps a floor check, now asking the right question
  (`currency_from=usdttrc20`, `fiat_equivalent` vs the USD pack price) and
  refusing **before** the purchase row exists. It is fail-open: if `/min-amount`
  cannot be read, checkout proceeds as before.
- The comment in `src/lib/credit-packs.ts` and spec §2 both name the parameter
  trap explicitly, because the wrong pair makes a healthy pack look unpayable.
