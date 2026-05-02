import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSessions, sessionEvents, users, cases } from "@/db/schema";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, gte, lte, asc, desc, sql } from "drizzle-orm";

export async function GET(req: Request) {
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

	const { searchParams } = new URL(req.url);
	const from = searchParams.get("from");
	const to = searchParams.get("to");

	// Default: Next 7 days
	const startDate = from ? new Date(from) : new Date();
	const endDate = to ? new Date(to) : new Date();
	if (!to) {
		endDate.setDate(endDate.getDate() + 7);
	}

	try {
		const reportData = await db
			.select({
				id: sessionEvents.id,
				title: sessionEvents.title,
				eventType: sessionEvents.eventType,
				eventDate: sessionEvents.eventDate,
				court: sessionEvents.court,
				circuit: sessionEvents.circuit,
				rollNumber: sessionEvents.rollNumber,
				description: sessionEvents.description,
				status: sessionEvents.status,
				sessionTitle: workSessions.title,
				sessionTag: workSessions.tag,
				assignedTo: users.name,
				plaintiff: cases.plaintiff,
				defendant: cases.defendant,
			})
			.from(sessionEvents)
			.innerJoin(workSessions, eq(sessionEvents.sessionId, workSessions.id))
			.leftJoin(cases, eq(workSessions.caseId, cases.id))
			.leftJoin(users, eq(sessionEvents.assignedUserId, users.id))
			.where(
				and(
					eq(workSessions.organizationId, activeOrgId),
					gte(sessionEvents.eventDate, startDate),
					lte(sessionEvents.eventDate, endDate),
				),
			)
			.orderBy(asc(sessionEvents.eventDate));

		return NextResponse.json(reportData);
	} catch (error) {
		console.error("REPORT API ERROR:", error);
		return NextResponse.json(
			{ error: "Failed to fetch report data" },
			{ status: 500 },
		);
	}
}
