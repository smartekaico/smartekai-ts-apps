import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessionEvents, workSessions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * GET — List events for a specific session or all organization sessions
 */
export async function GET(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { searchParams } = new URL(req.url);
	const sessionId = searchParams.get("projectId"); // Keep query param name for backward compatibility
	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;

	if (!activeOrgId) {
		return NextResponse.json(
			{ error: "No active organization" },
			{ status: 400 },
		);
	}

	try {
		if (sessionId) {
			// Fetch for specific session
			const events = await db
				.select()
				.from(sessionEvents)
				.where(eq(sessionEvents.sessionId, Number.parseInt(sessionId)))
				.orderBy(desc(sessionEvents.eventDate));
			return NextResponse.json(events);
		}
			// Fetch all upcoming for the active organization
			const events = await db
				.select({
					id: sessionEvents.id,
					title: sessionEvents.title,
					eventDate: sessionEvents.eventDate,
					sessionId: sessionEvents.sessionId,
					sessionTitle: workSessions.title,
				})
				.from(sessionEvents)
				.innerJoin(workSessions, eq(sessionEvents.sessionId, workSessions.id))
				.where(eq(workSessions.organizationId, activeOrgId))
				.orderBy(desc(sessionEvents.eventDate))
				.limit(50);
			return NextResponse.json(events);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

/**
 * POST — Create a new legal event for a session
 */
export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { caseProjectId, title, eventType, eventDate } = await req.json();
		const sessionId = Number.parseInt(caseProjectId);

		if (!sessionId || !title || !eventDate) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Verify session belongs to user's org
		const activeOrgId =
			session.session.activeOrganizationId || session.user.activeOrganizationId;
		const ws = await db
			.select()
			.from(workSessions)
			.where(
				and(
					eq(workSessions.id, sessionId),
					eq(workSessions.organizationId, activeOrgId!),
				),
			)
			.limit(1);

		if (ws.length === 0) {
			return NextResponse.json(
				{ error: "Session not found or access denied" },
				{ status: 404 },
			);
		}

		const newEvent = await db
			.insert(sessionEvents)
			.values({
				sessionId,
				title,
				eventType: eventType || "Deadline",
				eventDate: new Date(eventDate),
				status: "Upcoming",
			})
			.returning();

		return NextResponse.json(newEvent[0]);
	} catch (error) {
		console.error("CREATE EVENT ERROR:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
