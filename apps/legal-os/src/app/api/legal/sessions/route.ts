import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSessions, sessionEvents } from "@/db/schema";
export const dynamic = "force-dynamic";
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

	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;
	if (!activeOrgId) {
		return NextResponse.json(
			{ error: "No active organization" },
			{ status: 403 },
		);
	}

	const sessionsResult = await db
		.select()
		.from(workSessions)
		.where(
			and(
				eq(workSessions.organizationId, activeOrgId),
				isNull(workSessions.deletedAt),
			),
		)
		.orderBy(desc(workSessions.createdAt));

	if (sessionsResult.length === 0) return NextResponse.json([]);

	const allUpcomingEvents = await db
		.select({
			sessionId: sessionEvents.sessionId,
			title: sessionEvents.title,
			eventDate: sessionEvents.eventDate,
		})
		.from(sessionEvents)
		.where(
			and(
				gt(sessionEvents.eventDate, new Date()),
				isNull(sessionEvents.deletedAt),
			),
		)
		.orderBy(asc(sessionEvents.eventDate));

	const eventMap = new Map();
	for (const event of allUpcomingEvents) {
		if (!eventMap.has(event.sessionId)) {
			eventMap.set(event.sessionId, event);
		}
	}

	const enrichedSessions = sessionsResult.map((sess) => ({
		...sess,
		nextAction: eventMap.get(sess.id) || null,
	}));

	return NextResponse.json(enrichedSessions);
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;
	if (!activeOrgId) {
		return NextResponse.json(
			{ error: "No active organization" },
			{ status: 403 },
		);
	}

	try {
		const { title, caseId } = await req.json();

		const newProject = await db
			.insert(workSessions)
			.values({
				organizationId: activeOrgId,
				caseId: caseId ? Number.parseInt(caseId.toString(), 10) : null,
				title: title || "جلسة عمل جديدة",
			})
			.returning();

		return NextResponse.json(newProject[0]);
	} catch (error) {
		console.error("CREATE SESSION ERROR:", error);
		const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
