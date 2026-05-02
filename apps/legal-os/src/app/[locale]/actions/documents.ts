"use server";

import { db } from "@/db";
import { sessionDocs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function saveDocument(
	sessionId: number | string,
	title: string,
	content: string,
	docType: string,
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return { success: false, error: "Unauthorized" };
		}

		const sid =
			typeof sessionId === "string"
				? Number.parseInt(sessionId, 10)
				: sessionId;

		await db.insert(sessionDocs).values({
			sessionId: sid,
			title,
			content,
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to save document:", error);
		return { success: false, error: "Database error" };
	}
}
