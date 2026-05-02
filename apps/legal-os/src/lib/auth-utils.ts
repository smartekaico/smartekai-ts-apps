import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type RequiredRole = "ADMIN" | "LEGAL";

/**
 * Checks if a session is active and optionally if the user has a specific role.
 * Throws a NextResponse if unauthorized/forbidden for easy return.
 */
export async function getAuthenticatedSession(options?: {
	requiredRole?: RequiredRole | RequiredRole[];
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw NextResponse.json(
			{ error: "Unauthorized. Please login." },
			{ status: 401 },
		);
	}

	const { requiredRole } = options || {};
	if (requiredRole) {
		const userRole = session.user.industryRole as string;
		const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

		// Admin always has access to Legal routes, but Legal doesn't have access to Admin routes
		const hasAccess = roles.includes(userRole as any) || userRole === "ADMIN";

		if (!hasAccess) {
			throw NextResponse.json(
				{
					error: `Forbidden. This action requires ${roles.join(" or ")} role.`,
				},
				{ status: 403 },
			);
		}
	}

	return session;
}

/**
 * Helper to wrap API logic in a try/catch that specifically handles the thrown NextResponses
 * from getAuthenticatedSession.
 */
export function handleRawAuthError(error: unknown) {
	if (error instanceof NextResponse) return error;
	console.error("Internal Server Error:", error);
	return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
