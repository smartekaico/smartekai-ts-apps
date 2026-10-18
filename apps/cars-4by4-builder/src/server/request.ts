import { getRequest, getRequestIP } from "@tanstack/react-start/server";

/**
 * Cloudflare sets cf-connecting-ip and clients can't override it. Never read
 * X-Forwarded-For: the first hop is client-controlled. Local dev (no header)
 * falls back to the socket address.
 */
export function requestIp(): string {
  return getRequest().headers.get("cf-connecting-ip")?.trim() || getRequestIP() || "unknown";
}
