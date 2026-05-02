"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Checks if an email belongs to an existing (approved) user.
 * Used on the login page to prevent unapproved magic link requests.
 */
export async function checkEmailApprovedAction(email: string) {
	if (!email) return false;
	
	const user = await db.query.users.findFirst({
		where: eq(users.email, email.toLowerCase()),
	});

	return !!user;
}
