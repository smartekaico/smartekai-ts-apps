import { NextResponse } from "next/server";
import { redis, ratelimit, isEnterpriseActive } from "@/lib/redis";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";

export const runtime = "nodejs";

/**
 * Diagnostics endpoint for Upstash Redis
 * Restricted to ADMIN role
 */
export async function GET() {
	try {
		const session = await getAuthenticatedSession({
			requiredRole: ["ADMIN"],
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const results: any = {
			config: {
				hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
				hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
				isEnterpriseActive: isEnterpriseActive(),
			},
			status: "checking",
		};

		if (!redis) {
			results.status = "error";
			results.message = "Redis client not initialized. Check env vars.";
			return NextResponse.json(results, { status: 500 });
		}

		try {
			const start = Date.now();
			const ping = await redis.ping();
			const latency = Date.now() - start;

			results.status = ping === "PONG" ? "healthy" : "unhealthy";
			results.ping = ping;
			results.latencyMs = latency;

			// Test ratelimit object
			results.ratelimitAvailable = !!ratelimit;
			
			if (ratelimit) {
				const testKey = `debug_test_${Date.now()}`;
				const rlTest = await ratelimit.limit(testKey);
				results.ratelimitTest = {
					success: rlTest.success,
					remaining: rlTest.remaining,
				};
			}

		} catch (e: any) {
			results.status = "error";
			results.error = e.message;
		}

		return NextResponse.json(results);
	} catch (error: any) {
		return handleRawAuthError(error);
	}
}
