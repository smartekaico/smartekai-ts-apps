import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import type { CreditState } from "@/lib/credit-packs";
import { safeNext } from "@/lib/next";
import { getCreditState } from "@/server/credits";
import { accountUser, currentUser } from "@/server/session";

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
    return { balance, next: data.next };
  });
