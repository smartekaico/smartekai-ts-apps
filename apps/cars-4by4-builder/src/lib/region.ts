export type Region = "us" | "gcc";

const GCC_COUNTRIES = new Set(["AE", "SA", "KW", "QA", "BH", "OM"]);

/** AED is pegged to USD. */
export const AED_PER_USD = 3.6725;

export function parseRegionCookie(cookieHeader: string | undefined): Region | null {
  const match = cookieHeader?.match(/(?:^|;\s*)region=(us|gcc)(?:;|$)/);
  return match ? (match[1] as Region) : null;
}

/** Cookie (header switch) wins, then Cloudflare's country header, then US. */
export function resolveRegion(cookieHeader: string | undefined, country: string | undefined): Region {
  const fromCookie = parseRegionCookie(cookieHeader);
  if (fromCookie) return fromCookie;
  return country && GCC_COUNTRIES.has(country.toUpperCase()) ? "gcc" : "us";
}

export function formatPrice(usd: number, region: Region): string {
  if (region === "gcc") {
    return `AED ${Math.round(usd * AED_PER_USD).toLocaleString("en-US")}`;
  }
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}