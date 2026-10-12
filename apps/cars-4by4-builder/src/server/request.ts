import { getRequestIP } from "@tanstack/react-start/server";

/** Traefik sets X-Forwarded-For in front of this app. */
export function requestIp(): string {
  return getRequestIP({ xForwardedFor: true }) ?? "unknown";
}
