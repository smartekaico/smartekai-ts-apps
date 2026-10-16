export type Store = "amazon" | "ebay" | "other";

// Amazon's official short-link domains (Associates "short links").
const AMAZON_SHORT_HOSTS = new Set(["amzn.to", "a.co", "amzn.eu", "amzn.asia", "amzn.com"]);
// Anchored to a real suffix (.com, .de, .co.uk, .com.au …) so look-alikes such
// as amazon.com.evil.com are not labelled as Amazon.
const SUFFIX = String.raw`([a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$`;
const AMAZON_HOST = new RegExp(String.raw`(^|\.)amazon\.` + SUFFIX);
const EBAY_HOST = new RegExp(String.raw`(^|\.)ebay\.` + SUFFIX);

/** Which store an affiliate URL leads to — Amazon requires the button to say so. */
export function storeOf(url: string | null): Store | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.toLowerCase();
  if (AMAZON_SHORT_HOSTS.has(host) || AMAZON_HOST.test(host)) return "amazon";
  if (EBAY_HOST.test(host)) return "ebay";
  return "other";
}

export const BUY_LABEL: Record<Store, string> = {
  amazon: "Buy on Amazon",
  ebay: "View on eBay",
  other: "Buy",
};
