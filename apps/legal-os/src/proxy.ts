import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Next.js Middleware for Authentication and Localization.
 * Handles:
 * 1. PostHog & Static Asset Skipping
 * 2. Locale Routing (next-intl)
 * 3. Dashboard/Admin Protection
 * 4. API Route Protection
 */
export default async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// 1. Skip PostHog proxy, API routes, and static assets from localization logic
	if (
		pathname.startsWith("/ingest") ||
		pathname.includes(".") || // Static files
		pathname.startsWith("/_next") ||
		pathname.startsWith("/_vercel")
	) {
		return NextResponse.next();
	}

	// 2. Handle Localization via next-intl for non-API routes
	if (!pathname.startsWith("/api")) {
		const response = intlMiddleware(request);

		// 3. Auth Protection for Dashboard & Admin
		const isDashboard = pathname.includes("/dashboard");
		const isAdmin = pathname.includes("/admin");
		const isAcceptInvite = pathname.includes("/accept-team-invite");

		// We protect dashboard and admin, but NOT accept-team-invite directly 
		// (it handles its own auth internally to allow viewing the invite)
		if (isDashboard || isAdmin) {
			// Check for auth cookie presence first (super fast)
			const sessionCookie =
				request.cookies.get("better-auth.session_token") ||
				request.cookies.get("__better_auth_session_token") ||
				request.cookies.get("__Secure-better-auth.session_token");

			if (!sessionCookie) {
				// Find the locale from the pathname or fallback to default
				const segments = pathname.split("/");
				const locale = routing.locales.includes(
					segments[1] as (typeof routing.locales)[number],
				)
					? segments[1]
					: routing.defaultLocale;

				// Redirect to login if no session cookie is found
				const loginUrl = new URL(`/${locale}/login`, request.url);
				
				// Add callback URL for post-login redirection
				loginUrl.searchParams.set("callbackUrl", pathname);
				
				return NextResponse.redirect(loginUrl);
			}
		}

		return response;
	}

	// 4. API Route Protection (No locale prefixing, just security)
	if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
		return NextResponse.next();
	}

	// Simple session check for API
	const sessionCookie =
		request.cookies.get("better-auth.session_token") ||
		request.cookies.get("__better_auth_session_token") ||
		request.cookies.get("__Secure-better-auth.session_token");

	if (!sessionCookie) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.next();
}

export const config = {
	// Match all paths except Static ones handled by Next.js internals
	matcher: ["/((?!_next|_vercel|static|.*\\..*).*)"],
};
