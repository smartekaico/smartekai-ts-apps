export type Store = "amazon" | "ebay" | "other";

/** Which store an affiliate URL leads to — Amazon requires the button to say so. */
export function storeOf(url: string | null): Store | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === "amzn.to" || /(^|\.)amazon\.[a-z.]+$/.test(host)) return "amazon";
  if (/(^|\.)ebay\.[a-z.]+$/.test(host)) return "ebay";
  return "other";
}

export const BUY_LABEL: Record<Store, string> = {
  amazon: "Buy on Amazon",
  ebay: "View on eBay",
  other: "Buy",
};
