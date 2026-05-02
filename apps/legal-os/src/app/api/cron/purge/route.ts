import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSessions, sessionDocs } from "@/db/schema";
import { lte, isNotNull, and } from "drizzle-orm";

/**
 * Nightly Cron Job: Permanent deletion of soft-deleted records.
 *
 * Strategy: Hard-delete any Document or WorkSession where 'deletedAt'
 * was set more than 30 days ago.
 */
export async function GET(req: Request) {
	// Security Check: Optional 'Authorization' header check for Cron service
	const authHeader = req.headers.get("authorization");
	if (
		process.env.CRON_SECRET &&
		authHeader !== `Bearer ${process.env.CRON_SECRET}`
	) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		console.log(
			`[Retention Purge] Starting purge for records older than: ${thirtyDaysAgo.toISOString()}`,
		);

		// 1. Delete Documents older than 30 days
		const deletedDocs = await db
			.delete(sessionDocs)
			.where(
				and(
					isNotNull(sessionDocs.deletedAt),
					lte(sessionDocs.deletedAt, thirtyDaysAgo),
				),
			)
			.returning({ id: sessionDocs.id });

		// 2. Delete Work Sessions older than 30 days
		const deletedSessions = await db
			.delete(workSessions)
			.where(
				and(
					isNotNull(workSessions.deletedAt),
					lte(workSessions.deletedAt, thirtyDaysAgo),
				),
			)
			.returning({ id: workSessions.id });

		return NextResponse.json({
			success: true,
			purged: {
				documents: deletedDocs.length,
				sessions: deletedSessions.length,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[Retention Purge Error]:", error);
		return NextResponse.json(
			{ error: `Purge failed: ${error instanceof Error ? error.message : "Unknown error"}` },
			{ status: 500 },
		);
	}
}
