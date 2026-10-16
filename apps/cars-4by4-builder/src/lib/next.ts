const PROBE_ORIGIN = "http://same-origin.invalid";

/**
 * Only same-origin paths; anything else falls back to "/". Rejects backslashes
 * and control characters anywhere — browsers strip tab/newline before parsing,
 * so "/\t/evil.com" would otherwise navigate to //evil.com.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  // eslint-disable-next-line no-control-regex -- control characters are exactly what we reject
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    return new URL(value, PROBE_ORIGIN).origin === PROBE_ORIGIN ? value : "/";
  } catch {
    return "/";
  }
}
