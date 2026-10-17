import { and, eq, gte, sql } from "drizzle-orm";
import { builds, carsUsers, creditLedger, getDbCars } from "@smartekai/db/cars";
import type { BuildCharge } from "@smartekai/db/cars";
import { RENDER_COST } from "@/lib/credit-packs";
import type { CreditBlock, CreditState } from "@/lib/credit-packs";
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
    console.error(`[credits] ledger insert failed after spend (user ${userId}, build ${buildId})`, err);
  }
  return true;
}

export type RenderCharge = { ok: true; charge: BuildCharge } | { ok: false; error: string; action: CreditBlock };

/** Spec 3 §3 steps 2–5: free render, else (accounts only) RENDER_COST credits, else refuse. */
export async function chargeRender(user: SessionUser, buildId: string, ip: string): Promise<RenderCharge> {
  if (await claimFreeRender(user.id)) {
    if (tryConsume(freeRenderRules(ip))) return { ok: true, charge: "free" };
    await releaseFreeRender(user.id); // this network's free renders are used up today — fall through
  }
  if (user.isAnonymous) return { ok: false, error: "Sign in to keep building.", action: "sign-in" };
  if (await spendCredits(user.id, buildId)) return { ok: true, charge: "credit" };
  return { ok: false, error: "You're out of credits.", action: "buy-credits" };
}

/** Gives back what a render used. Never throws — a failed refund is logged for manual review. */
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

/**
 * Refunds a failed build exactly once: clearing `charge` in the same conditional
 * UPDATE is the guard. Call after the build is marked failed. Never throws.
 */
export async function refundFailedBuild(buildId: string): Promise<void> {
  const db = getDbCars();
  try {
    for (const charge of ["credit", "free"] as const) {
      const cleared = await db
        .update(builds)
        .set({ charge: null })
        .where(and(eq(builds.id, buildId), eq(builds.status, "failed"), eq(builds.charge, charge)))
        .returning({ userId: builds.userId });
      const row = cleared.at(0);
      if (row) {
        if (row.userId) await refundRender(row.userId, charge, buildId);
        return;
      }
    }
  } catch (err) {
    console.error(`[credits] MANUAL REVIEW: refund for failed build ${buildId} failed`, err);
  }
}

function isUniqueViolation(err: unknown): boolean {
  let e: unknown = err;
  for (let depth = 0; depth < 5 && e && typeof e === "object"; depth++) {
    if ((e as { code?: unknown }).code === "23505") return true;
    e = (e as { cause?: unknown }).cause; // drizzle wraps driver errors
  }
  return false;
}

/** Ledger row + balance in one transaction. A repeated paypal_order_id = already credited. */
export async function creditPurchase(input: {
  userId: string;
  credits: number;
  orderId: string;
  amountUsd: string;
}): Promise<"credited" | "duplicate"> {
  const db = getDbCars();
  try {
    await db.batch([
      // Insert first: a duplicate order id aborts the batch before the balance moves.
      db.insert(creditLedger).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        delta: input.credits,
        reason: "purchase",
        paypalOrderId: input.orderId,
        amountUsd: input.amountUsd,
      }),
      db
        .update(carsUsers)
        .set({ creditBalance: sql`${carsUsers.creditBalance} + ${input.credits}` })
        .where(eq(carsUsers.id, input.userId)),
    ]);
    return "credited";
  } catch (err) {
    if (isUniqueViolation(err)) return "duplicate";
    throw err;
  }
}

export async function findPurchase(orderId: string): Promise<{ userId: string | null } | undefined> {
  return (
    await getDbCars()
      .select({ userId: creditLedger.userId })
      .from(creditLedger)
      .where(eq(creditLedger.paypalOrderId, orderId))
  ).at(0);
}
