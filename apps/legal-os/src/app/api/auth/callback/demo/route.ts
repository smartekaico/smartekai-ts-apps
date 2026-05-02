import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const token = searchParams.get("token");
	const email = searchParams.get("email");

	if (!token || !email) {
		return redirect("/login?error=invalid_magic_link");
	}

	// 1. Verify token
	const verification = await db.query.verifications.findFirst({
		where: and(
			eq(schema.verifications.identifier, email),
			eq(schema.verifications.value, token),
		),
	});

	if (!verification || verification.expiresAt < new Date()) {
		console.error("MAGIC LINK FAILED: Invalid or expired token", { email, token });
		return redirect("/login?error=expired_magic_link");
	}

	// 2. Find User
	const user = await db.query.users.findFirst({
		where: eq(schema.users.email, email),
	});

	if (!user) {
		console.error("MAGIC LINK FAILED: User not found", { email });
		return redirect("/login?error=user_not_found");
	}

	// 3. Create Session manually
	const sessionToken = crypto.randomUUID(); // Secure token
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

	await db.insert(schema.sessions).values({
		id: crypto.randomUUID(),
		userId: user.id,
		token: sessionToken,
		expiresAt: expiresAt,
		createdAt: new Date(),
		updatedAt: new Date(),
		userAgent: request.headers.get("user-agent"),
		ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
	});

	// 4. Set Cookie
	const cookieStore = await cookies();
	cookieStore.set("better-auth.session_token", sessionToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		expires: expiresAt,
	});

	// 5. Cleanup
	await db.delete(schema.verifications).where(eq(schema.verifications.id, verification.id));

	// 6. Redirect to dashboard
	return redirect("/dashboard?welcome=true");
}
