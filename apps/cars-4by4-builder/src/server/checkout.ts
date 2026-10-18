import {
  NOWPAYMENTS_PAY_CURRENCY,
  NowPaymentsError,
  createInvoice as createNowInvoice,
  getMinAmount,
  priceMeetsMinimum,
  toCents,
} from "@smartekai/nowpayments";
import type { NowPayment } from "@smartekai/nowpayments";
import type { CreditPurchase, CreditPurchaseStatus } from "@smartekai/db/cars";
import type { CreditPack } from "@/lib/credit-packs";
import { creditPurchaseFromPayment, createPurchase, getPurchase, setPurchaseStatus } from "@/server/credits";

// Spec 3 §5: NOWPayments checkout (invoice) and IPN status handling.

const PRICE_CURRENCY = "usd";
const LOG = "[nowpayments]";

/** `PUBLIC_SITE_URL` without a trailing slash, or null if unset / not an http(s) URL. */
export function publicSiteUrl(): string | null {
  const raw = process.env.PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export type StartCheckoutResult = { ok: true; invoiceUrl: string } | { ok: false; error: string };

const CHECKOUT_FAILED = "Couldn't start checkout — try again.";

/**
 * The floor under a usdttrc20 deposit, in USD, or null if NOWPayments wouldn't tell us (then we
 * try the invoice anyway — see priceMeetsMinimum's fail-open note).
 *
 * The pair matters, and getting it wrong overstates the floor by ~60%: `currency_from=usd` asks
 * "what USD amount converts into the USDT minimum" ($18.55 at the time of writing), whereas the
 * question our USD-priced invoice is subject to is the minimum usdttrc20 *deposit* ($11.37).
 */
async function minimumFiat(): Promise<number | null> {
  try {
    const min = await getMinAmount(NOWPAYMENTS_PAY_CURRENCY, NOWPAYMENTS_PAY_CURRENCY, PRICE_CURRENCY);
    // min_amount is in usdttrc20, fiat_equivalent is that same floor in USD — the like-for-like
    // number for a USD pack price.
    const raw = min.fiatEquivalent ?? min.minAmount;
    const floor = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(floor) && floor > 0 ? floor : null;
  } catch (err) {
    console.warn(`${LOG} min-amount lookup failed, skipping the floor check:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Flow 2: purchase row (pending) → NOWPayments invoice → store the invoice id.
 * On an invoice failure the purchase becomes `failed`. `next` must already be safeNext'd.
 */
export async function startCheckout(userId: string, pack: CreditPack, next?: string): Promise<StartCheckoutResult> {
  const site = publicSiteUrl();
  if (!site) {
    console.error(`${LOG} PUBLIC_SITE_URL is not set (or not an http(s) URL) — checkout disabled`);
    return { ok: false, error: "Checkout isn't available right now." };
  }

  // Checked before the purchase row exists: an unpayable invoice would otherwise leave a
  // `pending` purchase and send the buyer to a payment page that can never be satisfied.
  const floor = await minimumFiat();
  if (floor !== null && !priceMeetsMinimum(pack.priceUsd, floor)) {
    console.warn(`${LOG} ${pack.id} ($${pack.priceUsd}) is under the usdttrc20 floor ($${floor}) — refusing checkout`);
    return {
      ok: false,
      error: `${pack.name} can't be paid right now — the network minimum is $${floor.toFixed(2)}, above this pack's $${pack.priceUsd}. Pick a bigger pack, or try again later.`,
    };
  }

  const purchaseId = await createPurchase(userId, pack);
  const nextQs = next ? `next=${encodeURIComponent(next)}` : "";
  try {
    const invoice = await createNowInvoice({
      priceAmount: Number(pack.priceUsd),
      priceCurrency: PRICE_CURRENCY,
      payCurrency: NOWPAYMENTS_PAY_CURRENCY,
      orderId: purchaseId,
      // ASCII only (IPN signature: PHP vs JS unicode escaping, spec §5 (a)).
      orderDescription: `4x4 Builder ${pack.name} pack - ${pack.credits} credits`,
      ipnCallbackUrl: `${site}/api/nowpayments/ipn`,
      successUrl: `${site}/credits?purchase=${purchaseId}${nextQs ? `&${nextQs}` : ""}`,
      cancelUrl: `${site}/credits${nextQs ? `?${nextQs}` : ""}`,
    });
    await setPurchaseStatus(purchaseId, "pending", { providerInvoiceId: invoice.id });
    console.info(`${LOG} invoice ${invoice.id} created for purchase ${purchaseId} (${pack.id})`);
    return { ok: true, invoiceUrl: invoice.invoiceUrl };
  } catch (err) {
    if (err instanceof NowPaymentsError) {
      console.error(
        `${LOG} createInvoice failed for purchase ${purchaseId}: operation=${err.operation} status=${err.status} code=${err.code ?? "-"}`,
      );
    } else {
      console.error(`${LOG} checkout failed for purchase ${purchaseId}:`, err instanceof Error ? err.message : err);
    }
    try {
      await setPurchaseStatus(purchaseId, "failed");
    } catch (markErr) {
      console.error(`${LOG} could not mark purchase ${purchaseId} failed:`, markErr);
    }
    return { ok: false, error: CHECKOUT_FAILED };
  }
}

// ── IPN status handling (spec §5 (d)/(e)) ──────────────────────────────────

const PAID = new Set(["confirmed", "finished"]);
const IN_PROGRESS = new Set(["waiting", "confirming", "sending"]);
const CLOSED = new Set(["expired", "failed", "refunded"]);

const PROVIDER_PAYMENT_ID_UNIQUE = "credit_purchases_provider_payment_id_unique";

/** A unique violation on `constraint` anywhere in the (drizzle-wrapped) error chain. */
function isUniqueViolation(err: unknown, constraint: string): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e && typeof e === "object"; depth++) {
    const { code, constraint: c, message } = e as { code?: unknown; constraint?: unknown; message?: unknown };
    if (code === "23505") {
      return c === constraint || (c === undefined && typeof message === "string" && message.includes(constraint));
    }
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/** What applyPayment did — logged by the IPN route; every outcome is a 200. */
export type ApplyOutcome =
  | "credited"
  | "already-credited"
  | "other-payment"
  | "review"
  | "partially-paid"
  | "status-updated"
  | "status-ignored"
  | "unknown-order"
  | "unknown-status"
  | "payment-id-conflict";

function paidMismatch(payment: NowPayment, purchase: CreditPurchase): string | null {
  const paid = toCents(payment.priceAmount);
  const expected = toCents(purchase.amountUsd);
  if (paid === null || expected === null || paid !== expected) {
    return `price_amount ${String(payment.priceAmount)} != ${purchase.amountUsd}`;
  }
  if (payment.priceCurrency !== PRICE_CURRENCY) return `price_currency ${payment.priceCurrency ?? "-"}`;
  if (payment.payCurrency !== NOWPAYMENTS_PAY_CURRENCY) return `pay_currency ${payment.payCurrency ?? "-"}`;
  if (!payment.invoiceId || payment.invoiceId !== purchase.providerInvoiceId) {
    return `invoice_id ${payment.invoiceId ?? "-"} != ${purchase.providerInvoiceId ?? "-"}`;
  }
  return null;
}

/**
 * Records a non-crediting status with the payment id. A payment id already
 * stored on ANOTHER purchase is a unique violation — logged for manual review
 * instead of thrown (a throw would 500 and make NOWPayments retry forever).
 */
async function recordStatus(
  purchaseId: string,
  status: Exclude<CreditPurchaseStatus, "credited">,
  paymentId: string,
): Promise<"updated" | "ignored" | "conflict"> {
  try {
    return (await setPurchaseStatus(purchaseId, status, { providerPaymentId: paymentId })) ? "updated" : "ignored";
  } catch (err) {
    if (!isUniqueViolation(err, PROVIDER_PAYMENT_ID_UNIQUE)) throw err;
    console.error(
      `${LOG} MANUAL REVIEW: payment ${paymentId} is already stored on another purchase (this order ${purchaseId}, status ${status})`,
    );
    return "conflict";
  }
}

/**
 * Applies a payment as returned by GET /payment (never the IPN body) to its
 * purchase. Idempotent; a `credited` purchase is never downgraded. Throws only
 * on DB errors (→ 500, NOWPayments retries).
 */
export async function applyPayment(payment: NowPayment): Promise<ApplyOutcome> {
  const { paymentId, status } = payment;
  const isPaid = PAID.has(status);
  const tag = `payment ${paymentId} (order ${payment.orderId ?? "-"}, status ${status})`;

  const purchase = payment.orderId ? await getPurchase(payment.orderId) : undefined;
  if (!purchase) {
    if (isPaid) console.error(`${LOG} MANUAL REVIEW: paid ${tag} has no matching purchase`);
    else console.warn(`${LOG} ${tag} has no matching purchase — ignored`);
    return "unknown-order";
  }

  if (isPaid) {
    const mismatch = paidMismatch(payment, purchase);
    if (mismatch) {
      console.error(`${LOG} MANUAL REVIEW: ${tag} does not match purchase ${purchase.id}: ${mismatch} — not credited`);
      const recorded = await recordStatus(purchase.id, "review", paymentId);
      return recorded === "conflict" ? "payment-id-conflict" : "review";
    }
    let result;
    try {
      result = await creditPurchaseFromPayment({
        purchaseId: purchase.id,
        providerPaymentId: paymentId,
        paymentRef: `nowpayments:${paymentId}`,
      });
    } catch (err) {
      if (!isUniqueViolation(err, PROVIDER_PAYMENT_ID_UNIQUE)) throw err;
      console.error(`${LOG} MANUAL REVIEW: ${tag} — payment id already stored on another purchase; not credited`);
      return "payment-id-conflict";
    }
    switch (result) {
      case "credited":
        console.info(`${LOG} ${tag}: credited purchase ${purchase.id} (+${purchase.credits})`);
        return "credited";
      case "already":
        console.info(`${LOG} ${tag}: purchase ${purchase.id} already credited by this payment — no-op`);
        return "already-credited";
      case "other-payment":
        console.error(
          `${LOG} MANUAL REVIEW: ${tag} — purchase ${purchase.id} was already credited by payment ${purchase.providerPaymentId ?? "-"} (buyer paid twice?)`,
        );
        return "other-payment";
      case "not-found":
        console.error(`${LOG} MANUAL REVIEW: paid ${tag} — purchase ${purchase.id} vanished before crediting`);
        return "unknown-order";
    }
  }

  if (status === "partially_paid") {
    console.error(`${LOG} MANUAL REVIEW: ${tag} underpaid (actually_paid ${String(payment.actuallyPaid ?? "-")}) — not credited`);
    const recorded = await recordStatus(purchase.id, "partially_paid", paymentId);
    return recorded === "conflict" ? "payment-id-conflict" : "partially-paid";
  }

  if (IN_PROGRESS.has(status) || CLOSED.has(status)) {
    if (status === "refunded" && purchase.status === "credited") {
      console.error(`${LOG} MANUAL REVIEW: ${tag} refunded but purchase ${purchase.id} was already credited — no auto claw-back`);
    }
    const recorded = await recordStatus(purchase.id, status as Exclude<CreditPurchaseStatus, "credited">, paymentId);
    if (recorded === "conflict") return "payment-id-conflict";
    if (recorded === "ignored") {
      console.info(`${LOG} ${tag}: purchase ${purchase.id} is credited — status not changed`);
      return "status-ignored";
    }
    console.info(`${LOG} ${tag}: purchase ${purchase.id} → ${status}`);
    return "status-updated";
  }

  console.warn(`${LOG} ${tag}: unknown status — purchase ${purchase.id} unchanged`);
  return "unknown-status";
}
