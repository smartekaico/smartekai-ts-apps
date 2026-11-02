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
 * links (AvantLink, CJ, Impact) hide the merchant in the host, so those are
 * unwrapped in storeOf and classified by their destination URL instead.
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

const CJ_HOSTS = new Set(["anrdoezrs.net", "jdoqocy.com", "tkqlhce.com", "dpbolvw.net", "kqzyfj.com"]);

function networkKind(host: string): "avantlink" | "cj" | "impact" | null {
  const h = host.toLowerCase();
  if (h === "avantlink.com" || h.endsWith(".avantlink.com")) return "avantlink";
  if (CJ_HOSTS.has(h)) return "cj";
  if (h === "sjv.io" || h.endsWith(".sjv.io") || h === "pxf.io" || h.endsWith(".pxf.io")) return "impact";
  return null;
}

function classifyHost(host: string): Store {
  const lower = host.toLowerCase();
  if (isAmazonHost(lower)) return "amazon";
  if (isEbayHost(lower)) return "ebay";
  for (const [store, domain] of MERCHANT_HOSTS) {
    if (onDomain(lower, domain)) return store;
  }
  return "other";
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

  // Unwrap a single level of network (AvantLink/CJ/Impact) link so the
  // destination merchant is labelled instead of "other". Unwrap once only.
  const kind = networkKind(host);
  if (kind) {
    const param = kind === "impact" ? "u" : "url";
    const dest = parsed.searchParams.get(param);
    if (!dest) return "other";
    let destParsed: URL;
    try {
      destParsed = new URL(dest);
    } catch {
      return "other";
    }
    if (destParsed.protocol !== "https:" && destParsed.protocol !== "http:") return "other";
    return classifyHost(destParsed.hostname);
  }
  return classifyHost(host);
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
