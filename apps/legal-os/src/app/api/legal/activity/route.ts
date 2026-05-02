export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSessions, sessionDocs, sessionEvents } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, gt, asc, and, isNull } from "drizzle-orm";

export async function GET() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (
		!session?.session?.activeOrganizationId &&
		!session?.user?.activeOrganizationId
	) {
		return NextResponse.json(
			{ error: "No active organization found for session" },
			{ status: 403 },
		);
	}

	const activeOrgId =
		(session.session as typeof session.session & { activeOrganizationId?: string }).activeOrganizationId ||
		(session.user as typeof session.user & { activeOrganizationId?: string }).activeOrganizationId;

	try {
		// 1. Fetch Latest Active Sessions
		const recentSessions = await db
			.select({
				id: workSessions.id,
				title: workSessions.title,
				createdAt: workSessions.createdAt,
				tag: workSessions.tag,
				isFavorite: workSessions.isFavorite,
			})
			.from(workSessions)
			.where(
				and(
					eq(workSessions.organizationId, activeOrgId),
					eq(workSessions.status, "Open"),
				),
			)
			.orderBy(desc(workSessions.createdAt))
			.limit(5);

		// 2. Fetch Latest Documents across all sessions for this org
		const recentDocs = await db
			.select({
				id: sessionDocs.id,
				title: sessionDocs.title,
				createdAt: sessionDocs.createdAt,
				sessionId: sessionDocs.sessionId,
				sessionTitle: workSessions.title,
			})
			.from(sessionDocs)
			.innerJoin(workSessions, eq(sessionDocs.sessionId, workSessions.id))
			.where(
				and(
					eq(workSessions.organizationId, activeOrgId),
					eq(sessionDocs.status, "Open"),
				),
			)
			.orderBy(desc(sessionDocs.createdAt))
			.limit(5);

		// 3. Fetch Upcoming Events
		const recentEvents = await db
			.select({
				id: sessionEvents.id,
				title: sessionEvents.title,
				eventDate: sessionEvents.eventDate,
				sessionId: sessionEvents.sessionId,
				sessionTitle: workSessions.title,
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
			.limit(5);

		// 4. Merge and Map to Activity Format
		const activities = [
			...recentSessions.map((s) => ({
				id: `sess-${s.id}`,
				type: "session",
				title: s.title,
				subtitle: "بدء جلسة عمل جديدة",
				time: s.createdAt,
				href: `/dashboard/sessions/${s.id}`,
				rawId: s.id,
				isFavorite: s.isFavorite,
			})),
			...recentDocs.map((d) => ({
				id: `doc-${d.id}`,
				type: "document",
				title: d.title,
				subtitle: `مستند في: ${d.sessionTitle}`,
				time: d.createdAt,
				href: `/dashboard/sessions/${d.sessionId}?docId=${d.id}`,
			})),
			...recentEvents.map((e) => ({
				id: `ev-${e.id}`,
				type: "event",
				title: e.title,
				subtitle: `موعد في: ${e.sessionTitle}`,
				time: e.eventDate,
				href: `/dashboard/sessions/${e.sessionId}`,
			})),
		];

		const sortedActivities = activities
			.sort((a, b) => {
				const timeA = a.time ? new Date(a.time).getTime() : 0;
				const timeB = b.time ? new Date(b.time).getTime() : 0;
				return timeB - timeA;
			})
			.slice(0, 10);

		return NextResponse.json(sortedActivities);
	} catch (error) {
		console.error("[ACTIVITY_ROUTE_ERROR]", error);
		// Ensure we return JSON, not HTML, even in 500 error cases
		return NextResponse.json(
			{
				error: "Internal Server Error",
				message: error instanceof Error ? error.message : "Unknown error",
				code: "FETCH_FAILED",
			},
			{ status: 500 },
		);
	}
}
