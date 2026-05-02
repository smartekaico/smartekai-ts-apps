"use server";

import { db } from "@/db";
import { jurisdictions, caseCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Ensures the user is authenticated (LEGAL or ADMIN)
 */
async function ensureAuthenticated() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session) {
		throw new Error("Unauthorized");
	}
	return session;
}

/**
 * Get all active jurisdictions
 */
export async function getPublicJurisdictions() {
	try {
		await ensureAuthenticated();
		const data = await db
			.select()
			.from(jurisdictions)
			.where(eq(jurisdictions.isActive, true));
		return { success: true, data };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}

/**
 * Get categories filtered by jurisdiction and industry
 */
export async function getPublicCategories(
	jurisdictionId?: string,
	industry = "LEGAL",
) {
	try {
		await ensureAuthenticated();

		const conditions = [
			eq(caseCategories.isActive, true),
			eq(caseCategories.industry, industry),
		];

		if (jurisdictionId) {
			conditions.push(eq(caseCategories.jurisdictionId, jurisdictionId));
		}

		const data = await db
			.select()
			.from(caseCategories)
			.where(and(...conditions));
		return { success: true, data };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}
