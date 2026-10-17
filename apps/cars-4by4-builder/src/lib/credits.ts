import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { PayPalError, captureOrder, createOrder } from "@smartekai/paypal";
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

export const capturePayPalOrder = createServerFn({ method: "POST" })
  .validator((input: { orderId: string }) => {
    if (typeof input.orderId !== "string" || !ORDER_ID.test(input.orderId)) throw new Error("invalid orderId");
    return { orderId: input.orderId };
  })
  .handler(async ({ data }): Promise<{ ok: true; credited: number; balance: number } | Fail> => {
    const user = await accountUser();
    if (!user) return fail("Sign in to buy credits.");

    // Already credited (double click, retry)? Don't call PayPal again.
    const existing = await findPurchase(data.orderId);
    if (existing) {
      if (existing.userId !== user.id) return fail("That order belongs to another account.");
      return { ok: true, credited: 0, balance: (await getCreditState(user)).balance };
    }

    let capture: CaptureResult;
    try {
      capture = await captureOrder(data.orderId);
    } catch (err) {
      if (err instanceof PayPalError && err.issue === "ORDER_ALREADY_CAPTURED") {
        // Captured earlier (retry, or a capture whose credit step failed). Idempotent if we already credited it.
        const prior = await findPurchase(data.orderId);
        if (prior && prior.userId === user.id) {
          return { ok: true, credited: 0, balance: (await getCreditState(user)).balance };
        }
        console.error(
          `[paypal] MANUAL REVIEW: order ${data.orderId} already captured but not credited to user ${user.id} (debug_id ${err.debugId ?? "n/a"})`,
        );
        return fail(`We couldn't confirm this payment — contact support with order ${data.orderId}`);
      }
      const debugId = err instanceof PayPalError ? err.debugId : undefined;
      console.error(`[paypal] capture failed for order ${data.orderId} (user ${user.id}, debug_id ${debugId ?? "n/a"})`, err);
      return fail(`PayPal didn't confirm the payment — try again. If you were charged, contact us with order ${data.orderId}.`);
    }

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
      console.error(`[paypal] MANUAL REVIEW: order ${data.orderId} (user ${user.id}) not credited — ${problem}`, capture);
      return fail(`We couldn't confirm that payment. If you were charged, contact us with order ${data.orderId}.`);
    }

    const result = await creditPurchase({
      userId: user.id,
      credits: pack.credits,
      orderId: data.orderId,
      amountUsd: pack.priceUsd,
    });
    return {
      ok: true,
      credited: result === "credited" ? pack.credits : 0,
      balance: (await getCreditState(user)).balance,
    };
  });
