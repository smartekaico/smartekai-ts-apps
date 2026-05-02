"use server";

import { db } from "@/db";
import { caseAnalyses } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getActiveCases() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return { success: false, error: "Unauthorized" };
		}

		// We fetch all cases for this user (for MVP, returning all active drafts or completed)
		const userCases = await db.select().from(caseAnalyses).limit(20);

		return { success: true, cases: userCases };
	} catch (error) {
		console.error("Failed to fetch cases:", error);
		return { success: false, error: "Database error" };
	}
}
