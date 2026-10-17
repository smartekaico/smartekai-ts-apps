import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { PayPalError, captureOrder, createOrder, getOrder } from "@smartekai/paypal";
import type { CaptureResult } from "@smartekai/paypal";
import { findPack } from "@/lib/credit-packs";
import type { CreditState } from "@/lib/credit-packs";
import { safeNext } from "@/lib/next";
import { creditPurchase, findPurchase, getCreditState } from "@/server/credits";
import { accountUser, currentUser } from "@/server/session";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const ORDER_ID = /^[A-Za-z0-9-]{1,64}$/;

/** Header chip + build footer. null = no session at all. */
export const getCredits = createServerFn({ method: "GET" }).handler(async (): Promise<CreditState | null> => {
  const user = await currentUser();
  return user ? getCreditState(user) : null;
});

/** /credits loader: accounts only. */
export const getCreditsPage = createServerFn({ method: "GET" })
  .validator((input: { next?: string }) => ({
    next: typeof input.next === "string" ? safeNext(input.next) : undefined,
  }))
  .handler(async ({ data }) => {
    const user = await accountUser();
    if (!user) {
      const back = data.next ? `/credits?next=${encodeURIComponent(data.next)}` : "/credits";
      throw redirect({ to: "/sign-in", search: { next: back } });
    }
    const { balance } = await getCreditState(user);
    // The client id is public by design (the buttons need it); the secret never leaves the server.
    return { balance, paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "" };
  });

export const createPayPalOrder = createServerFn({ method: "POST" })
  .validator((input: { packId: string }) => {
    if (typeof input.packId !== "string") throw new Error("packId is required");
    return { packId: input.packId };
  })
  .handler(async ({ data }): Promise<{ ok: true; orderId: string } | Fail> => {
    const user = await accountUser();
    if (!user) return fail("Sign in to buy credits.");
    const pack = findPack(data.packId);
    if (!pack) return fail("Unknown pack.");
    try {
      const { id } = await createOrder({
        amountUsd: pack.priceUsd,
        customId: `${user.id}:${pack.id}`,
        description: `4x4 Builder ${pack.name} pack — ${pack.credits} credits`,
      });
      return { ok: true, orderId: id };
    } catch (err) {
      console.error(`[paypal] createOrder failed (user ${user.id}, pack ${pack.id})`, err);
      return fail("Couldn't start PayPal checkout — try again.");
    }
  });

type Captured = { ok: true; credited: number; balance: number };

/**
 * A capture error after which PayPal may or may not have taken the money: a
 * timeout, a network failure, or a 5xx. A 4xx business error from the capture
 * call itself (or any token failure — the capture was never sent) is definitive.
 */
function outcomeUnknown(err: unknown): boolean {
  if (!(err instanceof PayPalError)) return true;
  if (err.operation === "getAccessToken") return false;
  return err.issue === "TIMEOUT" || err.status === 0 || err.status >= 500;
}

export const capturePayPalOrder = createServerFn({ method: "POST" })
  .validator((input: { orderId: string; packId?: string }) => {
    if (typeof input.orderId !== "string" || !ORDER_ID.test(input.orderId)) throw new Error("invalid orderId");
    // packId is client-reported and only logged; the pack is always read back from PayPal's custom_id.
    const packId = typeof input.packId === "string" ? input.packId.slice(0, 32) : undefined;
    return { orderId: input.orderId, packId };
  })
  .handler(async ({ data }): Promise<Captured | Fail> => {
    const account = await accountUser();
    if (!account) return fail("Sign in to buy credits.");
    const user = account; // a non-null const, so the helpers below keep the narrowing
    const { orderId } = data;

    // Already credited (double click, retry)? Don't call PayPal again.
    const existing = await findPurchase(orderId);
    if (existing) {
      if (existing.userId !== user.id) return fail("That order belongs to another account.");
      return { ok: true, credited: 0, balance: (await getCreditState(user)).balance };
    }

    const retryFail = () =>
      fail(`PayPal didn't confirm the payment — try again. If you were charged, contact us with order ${orderId}.`);
    const unconfirmedFail = () =>
      fail(`We couldn't confirm your payment. If you were charged, contact us with order ${orderId}.`);

    /** Validates a COMPLETED capture against this user + pack, then credits it once. */
    async function creditCapture(capture: CaptureResult): Promise<Captured | Fail> {
      const [ownerId, packId] = (capture.customId ?? "").split(":");
      const pack = findPack(packId);
      const problem =
        capture.status !== "COMPLETED"
          ? `capture status ${capture.status}`
          : ownerId !== user.id
            ? `custom_id ${capture.customId} is not this user`
            : !pack
              ? `unknown pack in custom_id ${capture.customId}`
              : capture.currency !== "USD" || capture.amountUsd !== pack.priceUsd
                ? `paid ${capture.amountUsd} ${capture.currency}, pack costs ${pack.priceUsd} USD`
                : null;
      if (problem !== null || !pack) {
        // Money may have moved with no credits granted — must be resolved by hand.
        console.error(`[paypal] MANUAL REVIEW: order ${orderId} (user ${user.id}) not credited — ${problem}`, capture);
        return fail(`We couldn't confirm that payment. If you were charged, contact us with order ${orderId}.`);
      }

      let result: Awaited<ReturnType<typeof creditPurchase>>;
      try {
        result = await creditPurchase({ userId: user.id, credits: pack.credits, orderId, amountUsd: pack.priceUsd });
      } catch (err) {
        // The money is captured; only the credit write failed. A retry replays the
        // capture (same PayPal-Request-Id) and credits once — but flag it in case
        // the buyer never retries.
        console.error(
          `[paypal] MANUAL REVIEW: order ${orderId} (user ${user.id}, capture ${capture.captureId}) captured but credit write failed`,
          err,
        );
        return fail(`We couldn't add your credits yet. If you were charged, contact us with order ${orderId}.`);
      }
      return {
        ok: true,
        credited: result === "credited" ? pack.credits : 0,
        balance: (await getCreditState(user)).balance,
      };
    }

    /** Reads the order back from PayPal; undefined if that fails too. */
    async function readOrder(): Promise<CaptureResult | undefined> {
      try {
        return await getOrder(orderId);
      } catch (err) {
        const debugId = err instanceof PayPalError ? err.debugId : undefined;
        console.error(`[paypal] getOrder failed for order ${orderId} (user ${user.id}, debug_id ${debugId ?? "n/a"})`, err);
        return undefined;
      }
    }

    console.info(`[paypal] capture start: order ${orderId} user ${user.id} pack ${data.packId ?? "unknown"}`);
    let capture: CaptureResult;
    try {
      capture = await captureOrder(orderId);
    } catch (err) {
      const debugId = err instanceof PayPalError ? err.debugId : undefined;

      if (err instanceof PayPalError && err.issue === "ORDER_ALREADY_CAPTURED") {
        // Captured earlier (retry, or a capture whose credit step failed). Idempotent if we already credited it.
        const prior = await findPurchase(orderId);
        if (prior && prior.userId === user.id) {
          return { ok: true, credited: 0, balance: (await getCreditState(user)).balance };
        }
        if (!prior) {
          // Not in the ledger: if PayPal shows this user's completed capture, credit it now.
          const order = await readOrder();
          if (order?.status === "COMPLETED") return creditCapture(order);
        }
        console.error(
          `[paypal] MANUAL REVIEW: order ${orderId} already captured; requested by user ${user.id}; ledger: ${prior ? `credited to ${prior.userId ?? "a deleted user"}` : "not credited"} (debug_id ${debugId ?? "n/a"})`,
        );
        return fail(`We couldn't confirm this payment — contact support with order ${orderId}`);
      }

      console.error(`[paypal] capture failed for order ${orderId} (user ${user.id}, debug_id ${debugId ?? "n/a"})`, err);
      if (!outcomeUnknown(err)) return retryFail(); // PayPal refused the capture — no money taken

      // Timeout / network / 5xx: the capture may have gone through. Ask PayPal.
      const order = await readOrder();
      if (!order) {
        console.error(
          `[paypal] MANUAL REVIEW: order ${orderId} (user ${user.id}) capture outcome unknown (debug_id ${debugId ?? "n/a"})`,
        );
        return unconfirmedFail();
      }
      if (order.status === "NO_CAPTURE") return retryFail();
      return creditCapture(order); // COMPLETED → credit; PENDING/DECLINED/etc. → flagged for review
    }

    return creditCapture(capture);
  });
