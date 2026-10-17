import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import type { CreditPurchaseStatus } from "@smartekai/db/cars";
import { findPack } from "@/lib/credit-packs";
import type { CreditState } from "@/lib/credit-packs";
import { safeNext } from "@/lib/next";
import { startCheckout } from "@/server/checkout";
import type { StartCheckoutResult } from "@/server/checkout";
import { getCreditState, getPurchaseForUser } from "@/server/credits";
import { checkoutRules, tryConsume } from "@/server/rate-limit";
import { accountUser, currentUser } from "@/server/session";

/** Purchase ids are crypto.randomUUID() — also the NOWPayments order_id. */
const PURCHASE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPurchaseId(value: unknown): value is string {
  return typeof value === "string" && PURCHASE_ID.test(value);
}

/** Header chip + build footer. null = no session at all. */
export const getCredits = createServerFn({ method: "GET" }).handler(async (): Promise<CreditState | null> => {
  const user = await currentUser();
  return user ? getCreditState(user) : null;
});

/** /credits loader: accounts only. */
export const getCreditsPage = createServerFn({ method: "GET" })
  .validator((input: { next?: string; purchase?: string }) => ({
    next: typeof input.next === "string" ? safeNext(input.next) : undefined,
    purchase: isPurchaseId(input.purchase) ? input.purchase : undefined,
  }))
  .handler(async ({ data }) => {
    const user = await accountUser();
    if (!user) {
      const qs = new URLSearchParams();
      if (data.purchase) qs.set("purchase", data.purchase);
      if (data.next) qs.set("next", data.next);
      const back = qs.toString() ? `/credits?${qs.toString()}` : "/credits";
      throw redirect({ to: "/sign-in", search: { next: back } });
    }
    const { balance } = await getCreditState(user);
    return { balance, next: data.next };
  });


/** Spec 3 §5 flow 2: start a NOWPayments checkout for a pack; the client navigates to `invoiceUrl`. */
export const createInvoice = createServerFn({ method: "POST" })
  .validator((input: { packId: string; next?: string }) => {
    if (typeof input.packId !== "string") throw new Error("packId is required");
    return { packId: input.packId, next: typeof input.next === "string" ? safeNext(input.next) : undefined };
  })
  .handler(async ({ data }): Promise<StartCheckoutResult> => {
    const user = await accountUser();
    if (!user) return { ok: false, error: "Sign in to buy credits." };
    const pack = findPack(data.packId);
    if (!pack) return { ok: false, error: "That pack doesn't exist." };
    if (!tryConsume(checkoutRules(user.id))) return { ok: false, error: "Too many checkouts — try again in a bit." };
    return startCheckout(user.id, pack, data.next);
  });

export type PurchaseView = {
  id: string;
  status: CreditPurchaseStatus;
  credits: number;
  packName: string;
  createdAt: string;
};

/** Spec 3 §5 flow 4: return-page status. Owner-only; someone else's id reads as not found (null). */
export const getPurchaseStatus = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => {
    if (!isPurchaseId(input.id)) throw new Error("invalid purchase id");
    return { id: input.id };
  })
  .handler(async ({ data }): Promise<PurchaseView | null> => {
    const user = await accountUser();
    if (!user) return null;
    const purchase = await getPurchaseForUser(data.id, user.id);
    if (!purchase) return null;
    return {
      id: purchase.id,
      status: purchase.status,
      credits: purchase.credits,
      packName: findPack(purchase.packId)?.name ?? purchase.packId,
      createdAt: purchase.createdAt.toISOString(),
    };
  });
