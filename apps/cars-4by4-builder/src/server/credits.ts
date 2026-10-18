import { and, eq, gte, ne, sql } from "drizzle-orm";
import { carsUsers, creditLedger, creditPurchases, getDbCars } from "@smartekai/db/cars";
import type { BuildCharge, CreditPurchase, CreditPurchaseStatus } from "@smartekai/db/cars";
import { RENDER_COST } from "@/lib/credit-packs";
import type { CreditBlock, CreditPack, CreditState } from "@/lib/credit-packs";
import { freeRenderRules, tryConsume } from "@/server/rate-limit";
import type { SessionUser } from "@/server/session";

// Spec 3 §1. The cars DB is neon-http: no interactive transactions. Spends and
// claims are single conditional UPDATEs; unconditional balance changes go in
// one db.batch([...]) (a transaction) with their ledger row.

export async function getCreditState(user: SessionUser): Promise<CreditState> {
  const row = (
    await getDbCars()
      .select({ balance: carsUsers.creditBalance, freeRenderUsed: carsUsers.freeRenderUsed })
      .from(carsUsers)
      .where(eq(carsUsers.id, user.id))
  ).at(0);
  return { account: !user.isAnonymous, balance: row?.balance ?? 0, freeRenderUsed: row?.freeRenderUsed ?? false };
}

/** Atomic: only one request can flip free_render_used false → true. */
export async function claimFreeRender(userId: string): Promise<boolean> {
  const rows = await getDbCars()
    .update(carsUsers)
    .set({ freeRenderUsed: true })
    .where(and(eq(carsUsers.id, userId), eq(carsUsers.freeRenderUsed, false)))
    .returning({ id: carsUsers.id });
  return rows.length > 0;
}

async function releaseFreeRender(userId: string): Promise<void> {
  await getDbCars().update(carsUsers).set({ freeRenderUsed: false }).where(eq(carsUsers.id, userId));
}

/** Atomic: one conditional UPDATE, so two concurrent renders can't spend the same credits. */
export async function spendCredits(userId: string, buildId: string): Promise<boolean> {
  const db = getDbCars();
  const rows = await db
    .update(carsUsers)
    .set({ creditBalance: sql`${carsUsers.creditBalance} - ${RENDER_COST}` })
    .where(and(eq(carsUsers.id, userId), gte(carsUsers.creditBalance, RENDER_COST)))
    .returning({ balance: carsUsers.creditBalance });
  if (rows.length === 0) return false;
  try {
    await db.insert(creditLedger).values({ id: crypto.randomUUID(), userId, delta: -RENDER_COST, reason: "render", buildId });
  } catch (err) {
    // The balance is authoritative; a missing audit row must not fail a paid render.
    console.error(`[credits] MANUAL REVIEW: ledger insert failed after spend (user ${userId}, build ${buildId})`, err);
  }
  return true;
}

export type RenderCharge = { ok: true; charge: BuildCharge } | { ok: false; error: string; action: CreditBlock };

/**
 * Spec 3 §3 steps 2–5: free render, else (accounts only) RENDER_COST credits, else refuse.
 * When the user's free render is available but this network's free renders are
 * used up, the UI had promised a free render — so an account is only charged
 * credits if it confirmed (`allowCredits`); otherwise it gets "confirm-credits".
 */
export async function chargeRender(
  user: SessionUser,
  buildId: string,
  ip: string,
  options: { allowCredits?: boolean } = {},
): Promise<RenderCharge> {
  if (await claimFreeRender(user.id)) {
    if (await tryConsume(freeRenderRules(ip))) return { ok: true, charge: "free" };
    await releaseFreeRender(user.id); // this network's free renders are used up today
    if (user.isAnonymous) return { ok: false, error: "Sign in to keep building.", action: "sign-in" };
    if (!options.allowCredits) {
      return {
        ok: false,
        error: `Free renders from this network are used up today. Generate again to use ${RENDER_COST} credits.`,
        action: "confirm-credits",
      };
    }
  }
  if (user.isAnonymous) return { ok: false, error: "Sign in to keep building.", action: "sign-in" };
  if (await spendCredits(user.id, buildId)) return { ok: true, charge: "credit" };
  return { ok: false, error: "You're out of credits.", action: "buy-credits" };
}

/**
 * Gives back what a render used, for a charge that is NOT stored on a build row
 * (startBuild's flip/insert didn't take). The caller guarantees it is called at
 * most once per charge — nothing here guards against a double refund. Never use
 * it for failed builds — use refundFailedBuild. Never throws — a failed refund
 * is logged for manual review.
 */
export async function refundRender(userId: string, charge: BuildCharge, buildId: string): Promise<void> {
  const db = getDbCars();
  try {
    if (charge === "free") {
      await releaseFreeRender(userId);
      return;
    }
    await db.batch([
      db
        .update(carsUsers)
        .set({ creditBalance: sql`${carsUsers.creditBalance} + ${RENDER_COST}` })
        .where(eq(carsUsers.id, userId)),
      db.insert(creditLedger).values({ id: crypto.randomUUID(), userId, delta: RENDER_COST, reason: "refund", buildId }),
    ]);
  } catch (err) {
    console.error(`[credits] MANUAL REVIEW: refund of ${charge} render for build ${buildId} (user ${userId}) failed`, err);
  }
}

type RefundCounts = { cleared: number; restored: number };

function countsOf(result: { rows: Record<string, unknown>[] }): RefundCounts {
  const row = result.rows[0] ?? {};
  return { cleared: Number(row.cleared ?? 0), restored: Number(row.restored ?? 0) };
}

/**
 * Refunds a failed build exactly once. Each case is ONE SQL statement
 * (data-modifying CTEs), so clearing `builds.charge` — the exactly-once guard —
 * commits or rolls back together with the balance/flag change and the ledger
 * row: a crash can't leave the charge cleared but the refund unpaid. A
 * concurrent second call blocks on the build row, then re-checks `charge` and
 * matches nothing. Only builds already marked `failed` are refunded. If the
 * owning user was deleted (user_id set null), the charge is just cleared.
 * Never throws: a DB error is logged for manual review (the charge stays set,
 * so a later call can retry).
 */
export async function refundFailedBuild(buildId: string): Promise<void> {
  const db = getDbCars();
  try {
    const credit = countsOf(
      await db.execute(sql`
        WITH c AS (
          UPDATE builds SET charge = NULL
          WHERE id = ${buildId} AND status = 'failed' AND charge = 'credit'
          RETURNING user_id
        ), u AS (
          UPDATE cars_user SET credit_balance = credit_balance + ${RENDER_COST}::integer
          FROM c WHERE cars_user.id = c.user_id
          RETURNING cars_user.id
        ), l AS (
          INSERT INTO credit_ledger (id, user_id, delta, reason, build_id)
          SELECT ${crypto.randomUUID()}::text, u.id, ${RENDER_COST}::integer, 'refund', ${buildId}::text FROM u
          RETURNING id
        )
        SELECT (SELECT count(*) FROM c) AS cleared, (SELECT count(*) FROM l) AS restored
      `),
    );
    if (credit.cleared > 0) {
      if (credit.restored === 0) console.warn(`[credits] build ${buildId}: credit charge cleared, owner gone — no refund`);
      return;
    }
    const free = countsOf(
      await db.execute(sql`
        WITH c AS (
          UPDATE builds SET charge = NULL
          WHERE id = ${buildId} AND status = 'failed' AND charge = 'free'
          RETURNING user_id
        ), u AS (
          UPDATE cars_user SET free_render_used = false
          FROM c WHERE cars_user.id = c.user_id
          RETURNING cars_user.id
        )
        SELECT (SELECT count(*) FROM c) AS cleared, (SELECT count(*) FROM u) AS restored
      `),
    );
    if (free.cleared > 0 && free.restored === 0) {
      console.warn(`[credits] build ${buildId}: free charge cleared, owner gone — nothing to release`);
    }
  } catch (err) {
    console.error(`[credits] MANUAL REVIEW: refund for failed build ${buildId} failed`, err);
  }
}

// ── Purchases (Spec 3 §1/§5) ────────────────────────────────────────────────

const PAYMENT_REF_UNIQUE = "credit_ledger_payment_ref_unique";

/** Only a duplicate ledger payment_ref counts; any other unique violation is a real error. */
function isDuplicatePayment(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e && typeof e === "object"; depth++) {
    const { code, constraint, message } = e as { code?: unknown; constraint?: unknown; message?: unknown };
    if (code === "23505") {
      if (constraint === PAYMENT_REF_UNIQUE) return true;
      if (constraint === undefined && typeof message === "string" && message.includes(PAYMENT_REF_UNIQUE)) return true;
      return false;
    }
    e = (e as { cause?: unknown }).cause; // drizzle wraps driver errors
  }
  return false;
}

/**
 * Inserts a `pending` purchase for a server-resolved pack (amount_usd is the
 * pack price snapshot) and returns its id — also the NOWPayments order_id.
 */
export async function createPurchase(userId: string, pack: CreditPack): Promise<string> {
  const id = crypto.randomUUID();
  await getDbCars().insert(creditPurchases).values({
    id,
    userId,
    packId: pack.id,
    credits: pack.credits,
    amountUsd: pack.priceUsd,
    status: "pending",
  });
  return id;
}

/** Purchase by id (the IPN's order_id). Not owner-checked — server-side use only. */
export async function getPurchase(id: string): Promise<CreditPurchase | undefined> {
  return (await getDbCars().select().from(creditPurchases).where(eq(creditPurchases.id, id))).at(0);
}

/** Owner-only read for the return page: someone else's id is indistinguishable from a missing one. */
export async function getPurchaseForUser(id: string, userId: string): Promise<CreditPurchase | undefined> {
  return (
    await getDbCars()
      .select()
      .from(creditPurchases)
      .where(and(eq(creditPurchases.id, id), eq(creditPurchases.userId, userId)))
  ).at(0);
}

/**
 * Records a non-crediting status (and optionally the provider ids). Never
 * touches a `credited` purchase — that status is terminal. Use
 * creditPurchaseFromPayment to credit; passing "credited" here throws.
 * Returns false if the purchase is missing or already credited.
 */
export async function setPurchaseStatus(
  id: string,
  status: Exclude<CreditPurchaseStatus, "credited">,
  ids: { providerInvoiceId?: string; providerPaymentId?: string } = {},
): Promise<boolean> {
  if ((status as CreditPurchaseStatus) === "credited") throw new Error("use creditPurchaseFromPayment to credit");
  const rows = await getDbCars()
    .update(creditPurchases)
    .set({
      status,
      updatedAt: sql`now()`,
      ...(ids.providerInvoiceId !== undefined && { providerInvoiceId: ids.providerInvoiceId }),
      ...(ids.providerPaymentId !== undefined && { providerPaymentId: ids.providerPaymentId }),
    })
    .where(and(eq(creditPurchases.id, id), ne(creditPurchases.status, "credited")))
    .returning({ id: creditPurchases.id });
  return rows.length > 0;
}

/**
 * - "credited": this call credited the purchase.
 * - "already": already credited by this same payment (retry / duplicate IPN) — no-op.
 * - "other-payment": already credited by a DIFFERENT payment (buyer paid twice) — no-op; caller logs MANUAL REVIEW.
 * - "not-found": no purchase with that id.
 */
export type CreditPaymentResult = "credited" | "already" | "other-payment" | "not-found";

/**
 * Credits a purchase exactly once, in ONE SQL statement (data-modifying CTEs):
 * flips credit_purchases.status to `credited` (only if it isn't already) and
 * stores provider_payment_id, inserts the ledger `purchase +credits` row with
 * the unique payment_ref, and adds the credits to cars_user.credit_balance —
 * all commit or roll back together. Credits and amount come from the purchase
 * row (the server-side pack snapshot), never from the provider.
 *
 * Concurrency: a second call blocks on the purchase row lock, then re-checks
 * the status and matches nothing. The unique payment_ref is a second guard: a
 * duplicate aborts the whole statement and reads as "already".
 *
 * The caller must already have verified the payment (paid status, amount,
 * currency, invoice id — spec §5 (d)). Throws on DB errors (→ 5xx, provider retries).
 */
export async function creditPurchaseFromPayment(input: {
  purchaseId: string;
  /** Provider payment id, stored on the purchase (NOWPayments payment_id, as a string). */
  providerPaymentId: string;
  /** Ledger idempotency key, e.g. `nowpayments:<payment_id>`. */
  paymentRef: string;
}): Promise<CreditPaymentResult> {
  const db = getDbCars();
  let flipped = 0;
  try {
    const result = await db.execute(sql`
      WITH p AS (
        UPDATE credit_purchases
        SET status = 'credited', provider_payment_id = ${input.providerPaymentId}::text, updated_at = now()
        WHERE id = ${input.purchaseId} AND status <> 'credited'
        RETURNING user_id, credits, amount_usd
      ), l AS (
        INSERT INTO credit_ledger (id, user_id, delta, reason, payment_ref, amount_usd)
        SELECT ${crypto.randomUUID()}::text, p.user_id, p.credits, 'purchase', ${input.paymentRef}::text, p.amount_usd FROM p
        RETURNING user_id, delta
      ), u AS (
        UPDATE cars_user SET credit_balance = credit_balance + l.delta
        FROM l WHERE cars_user.id = l.user_id
        RETURNING cars_user.id
      )
      SELECT (SELECT count(*) FROM p) AS flipped, (SELECT count(*) FROM u) AS balanced
    `);
    const row = result.rows[0] ?? {};
    flipped = Number(row.flipped ?? 0);
    if (flipped > 0) {
      if (Number(row.balanced ?? 0) === 0) {
        console.warn(`[credits] purchase ${input.purchaseId} credited but its owner is gone — no balance change`);
      }
      return "credited";
    }
  } catch (err) {
    if (!isDuplicatePayment(err)) throw err;
    console.warn(`[credits] payment ${input.paymentRef} already in the ledger (purchase ${input.purchaseId})`);
    return "already";
  }
  // Nothing flipped: read the current row (a fresh snapshot sees a concurrent winner's commit).
  const current = await getPurchase(input.purchaseId);
  if (!current) return "not-found";
  return current.providerPaymentId === input.providerPaymentId ? "already" : "other-payment";
}
