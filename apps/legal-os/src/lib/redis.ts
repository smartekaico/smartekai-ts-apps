import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Upstash Redis client for global state (Rate Limiting, Caching)
 */
export const redis =
	process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
		? new Redis({
				url: process.env.UPSTASH_REDIS_REST_URL,
				token: process.env.UPSTASH_REDIS_REST_TOKEN,
			})
		: null;

/**
 * Unified Rate Limiter: 5 requests per minute per Organization
 * Usage: ratelimit.limit(`ratelimit_org_${orgId}`)
 */
export const ratelimit = redis
	? new Ratelimit({
			redis: redis,
			limiter: Ratelimit.slidingWindow(5, "1 m"),
			analytics: true,
			prefix: "@upstash/ratelimit",
		})
	: null;

/**
 * Helper to check if Enterprise features are active (has Redis)
 */
export const isEnterpriseActive = () => !!redis;
