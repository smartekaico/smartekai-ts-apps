// Spec 3 §0/§2. Credits are a unit, not a render count, so other actions can
// be priced later without repricing packs. Client-safe: no server imports.

export const RENDER_COST = 10;

// No pack under ~$10: PayPal's fixed per-transaction fee would take ~13% of a
// $4.99 sale. The server always resolves price from `id`.
export const CREDIT_PACKS = [
  { id: "starter", name: "Starter", credits: 100, priceUsd: "9.99" }, // ≈ 10 renders
  { id: "builder", name: "Builder", credits: 300, priceUsd: "24.99" }, // ≈ 30 renders
  { id: "pro", name: "Pro", credits: 1000, priceUsd: "69.99" }, // ≈ 100 renders
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

/** Server-side price lookup — a client-sent amount is never trusted. */
export function findPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** "300 credits ≈ 30 renders". */
export function rendersFor(credits: number): number {
  return Math.floor(credits / RENDER_COST);
}

/**
 * Why a render was refused — the client turns it into a Sign in / Buy credits
 * link, or (confirm-credits) a button that retries the render paying credits.
 */
export type CreditBlock = "sign-in" | "buy-credits" | "confirm-credits";

/** `account` = a real account (guests never hold credits). */
export type CreditState = { account: boolean; balance: number; freeRenderUsed: boolean };
