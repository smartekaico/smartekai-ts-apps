import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import { resolveRegion } from "@/lib/region";
import type { Region } from "@/lib/region";

export function requestRegion(): Region {
  const headers = getRequest().headers;
  return resolveRegion(headers.get("cookie") ?? undefined, headers.get("cf-ipcountry") ?? undefined);
}

/** Traefik sets X-Forwarded-For in front of this app. */
export function requestIp(): string {
  return getRequestIP({ xForwardedFor: true }) ?? "unknown";
}
