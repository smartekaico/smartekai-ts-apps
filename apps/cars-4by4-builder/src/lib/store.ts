export type Store =
  | "amazon"
  | "ebay"
  | "arb"
  | "4wheelparts"
  | "tirerack"
  | "bajadesigns"
  | "morris4x4"
  | "realtruck"
  | "inspiredoverland"
  | "other";

// Amazon's official short-link domains (Associates "short links").
const AMAZON_SHORT_HOSTS = new Set(["amzn.to", "a.co", "amzn.eu", "amzn.asia", "amzn.com"]);
// Anchored to a real suffix (.com, .de, .co.uk, .com.au …) so look-alikes such
// as amazon.com.evil.com are not labelled as Amazon.
const SUFFIX = String.raw`([a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$`;
const AMAZON_HOST = new RegExp(String.raw`(^|\.)amazon\.` + SUFFIX);
const EBAY_HOST = new RegExp(String.raw`(^|\.)ebay\.` + SUFFIX);

/**
 * Merchants whose own domain names them (spec 1 §8 Task B, rule 3). Network
 * links are the exception: AvantLink, CJ and Impact hide the merchant in the
 * host, which is why those need a *declared* store. Nothing uses them yet, so
 * there is no column and no declaration to read — an unknown network link is
 * labelled "other" rather than guessed.
 */
const MERCHANT_HOSTS: Array<[Store, string]> = [
  ["arb", "arbusa.com"],
  ["4wheelparts", "4wheelparts.com"],
  ["tirerack", "tirerack.com"],
  ["bajadesigns", "bajadesigns.com"],
  ["morris4x4", "morris4x4center.com"],
  ["realtruck", "realtruck.com"],
  ["inspiredoverland", "inspiredoverland.com"],
];

/** Exact domain or a real subdomain — `arbusa.com.evil.com` is not ARB. */
function onDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isAmazonHost(host: string): boolean {
  const lower = host.toLowerCase();
  return AMAZON_SHORT_HOSTS.has(lower) || AMAZON_HOST.test(lower);
}

export function isEbayHost(host: string): boolean {
  return EBAY_HOST.test(host.toLowerCase());
}

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
  if (isAmazonHost(host)) return "amazon";
  if (isEbayHost(host)) return "ebay";
  for (const [store, domain] of MERCHANT_HOSTS) {
    if (onDomain(host, domain)) return store;
  }
  return "other";
}

export const BUY_LABEL: Record<Store, string> = {
  amazon: "Buy on Amazon",
  ebay: "View on eBay",
  arb: "Buy at ARB",
  "4wheelparts": "Buy at 4 Wheel Parts",
  tirerack: "Buy at Tire Rack",
  bajadesigns: "Buy at Baja Designs",
  morris4x4: "Buy at Morris 4x4",
  realtruck: "Buy at RealTruck",
  inspiredoverland: "Buy at Inspired Overland",
  other: "Buy",
};
