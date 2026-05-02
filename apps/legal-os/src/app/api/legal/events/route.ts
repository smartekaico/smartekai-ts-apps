export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessionEvents, workSessions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, and, gt, asc } from "drizzle-orm";

/**
 * GET — List events for a specific session or all upcoming organizational events
 */
export async function GET(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;
	const { searchParams } = new URL(req.url);
	const sessionIdStr =
		searchParams.get("projectId") || searchParams.get("sessionId");

	try {
		if (sessionIdStr) {
			const sessionId = Number.parseInt(sessionIdStr, 10);
			if (Number.isNaN(sessionId))
				return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

			// Fetch for specific session
			const events = await db
				.select()
				.from(sessionEvents)
				.where(eq(sessionEvents.sessionId, sessionId))
				.orderBy(desc(sessionEvents.eventDate));
			return NextResponse.json(events);
		}
			// Fetch all upcoming for organization (Join with workSessions)
			if (!activeOrgId)
				return NextResponse.json(
					{ error: "No organization context" },
					{ status: 403 },
				);

			const events = await db
				.select({
					id: sessionEvents.id,
					title: sessionEvents.title,
					eventDate: sessionEvents.eventDate,
					projectId: sessionEvents.sessionId,
					projectTitle: workSessions.title,
				})
				.from(sessionEvents)
				.innerJoin(workSessions, eq(sessionEvents.sessionId, workSessions.id))
				.where(
					and(
						eq(workSessions.organizationId, activeOrgId),
						gt(sessionEvents.eventDate, new Date()),
					),
				)
				.orderBy(asc(sessionEvents.eventDate))
				.limit(50);
			return NextResponse.json(events);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

/**
 * POST — Create a new legal event
 */
export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const {
			sessionId,
			title,
			eventDate,
			eventType,
			court,
			circuit,
			rollNumber,
			description,
			reminderDays,
			assignedUserId,
			reminderEnabled,
		} = await req.json();

		if (!sessionId || !title || !eventDate) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const activeOrgId =
			session.session.activeOrganizationId || session.user.activeOrganizationId;
		if (!activeOrgId)
			return NextResponse.json(
				{ error: "No organization context" },
				{ status: 403 },
			);

		const sid = Number.parseInt(sessionId.toString(), 10);

		// Integrity Check: Verify session belongs to organization
		const sessionRecord = await db.query.workSessions.findFirst({
			where: and(
				eq(workSessions.id, sid),
				eq(workSessions.organizationId, activeOrgId),
			),
		});

		if (!sessionRecord) {
			return NextResponse.json(
				{ error: "Session not found or access denied" },
				{ status: 404 },
			);
		}

		const newEvent = await db
			.insert(sessionEvents)
			.values({
				sessionId: sid,
				title,
				eventDate: new Date(eventDate),
				eventType: eventType || "Hearing",
				court: court || null,
				circuit: circuit || null,
				rollNumber: rollNumber || null,
				description: description || null,
				assignedUserId: assignedUserId || session.user.id, // Default to creator if not specified
				reminderEnabled: !!reminderEnabled,
				reminderDays: reminderDays
					? Number.parseInt(reminderDays.toString(), 10)
					: 1,
			})
			.returning();

		return NextResponse.json(newEvent[0]);
	} catch (error) {
		console.error("CREATE EVENT ERROR:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
