import { isEbayHost } from "@/lib/store";

// Build attribution (spec §8 Task E): each affiliate network carries the build
// id under a different query parameter, so a click can be traced back to the
// build that produced it. Amazon has no equivalent — use separate Associates
// tracking IDs per surface instead (spec §4 step 3).
const CJ_HOSTS = ["anrdoezrs.net", "jdoqocy.com", "tkqlhce.com", "dpbolvw.net", "kqzyfj.com"];
const IMPACT_HOSTS = ["sjv.io", "pxf.io"];

// Build ids are client-supplied on the /go link, so only pass through something
// that is unambiguously an id — never an arbitrary string from the query.
const BUILD_ID = /^[A-Za-z0-9_-]{1,64}$/;

function onDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function parameterFor(host: string): string | null {
  if (onDomain(host, "avantlink.com")) return "ctc";
  if (CJ_HOSTS.some((domain) => onDomain(host, domain))) return "sid";
  if (IMPACT_HOSTS.some((domain) => onDomain(host, domain))) return "subId1";
  if (isEbayHost(host)) return "customid";
  return null; // Amazon and unknown hosts are left exactly as supplied.
}

/**
 * Appends the build id as the network's sub-id parameter.
 *
 * Never overwrites a parameter the link already carries — a hand-tuned `ctc` or
 * `customid` in the spreadsheet wins over the automatic one — and never
 * rewrites the URL for an unusable id, a malformed URL or an Amazon/unknown
 * host. Returns the input untouched in all of those cases.
 */
export function withSubId(url: string, buildId: string | null | undefined): string {
  if (!buildId || !BUILD_ID.test(buildId)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const parameter = parameterFor(parsed.hostname.toLowerCase());
  if (!parameter || parsed.searchParams.has(parameter)) return url;

  parsed.searchParams.set(parameter, buildId);
  return parsed.toString();
}
