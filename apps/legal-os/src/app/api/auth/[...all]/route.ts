import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

const { GET, POST: AuthPOST } = toNextJsHandler(auth);
export { GET };

export async function POST(request: NextRequest) {
	// Block public sign-ups
	if (request.nextUrl.pathname.includes("/sign-up/email")) {
		// Only allow if it has the internal secret (passed by our own server action)
		const secret = request.headers.get("x-internal-signup-secret");
		if (!secret || secret !== process.env.BETTER_AUTH_SECRET) {
			return new Response(
				JSON.stringify({ error: "Public sign-ups are disabled." }),
				{ status: 403, headers: { "Content-Type": "application/json" } },
			);
		}
	}

	return AuthPOST(request);
}
