import { db } from "@/db";
import { sessionEvents, workSessions, caseCategories } from "@/db/schema";
import { eq, and, gt, asc, desc, inArray, isNull } from "drizzle-orm";

/**
 * Fetch the next 10 upcoming legal events for a lawyer's dashboard.
 * Prioritizes hearings, expert sessions, and deadlines.
 */
export async function getUpcomingLegalEvents(organizationId: string) {
	try {
		const upcoming = await db
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
					eq(workSessions.organizationId, organizationId),
					gt(sessionEvents.eventDate, new Date()),
					isNull(workSessions.deletedAt),
					isNull(sessionEvents.deletedAt),
				),
			)
			.orderBy(asc(sessionEvents.eventDate))
			.limit(10);

		return upcoming;
	} catch (error) {
		console.error("Error fetching upcoming events:", error);
		return [];
	}
}

/**
 * Fetch case sessions with their immediate next event.
 */
export async function getSessionsWithNextAction(organizationId: string) {
	try {
		// 1. Fetch all sessions for the user with category details
		const sessions = await db
			.select({
				id: workSessions.id,
				title: workSessions.title,
				tag: workSessions.tag,
				createdAt: workSessions.createdAt,
				categoryId: workSessions.categoryId,
				categoryNameAr: caseCategories.nameAr,
				categoryNameEn: caseCategories.nameEn,
				categorySlug: caseCategories.slug,
			})
			.from(workSessions)
			.leftJoin(caseCategories, eq(workSessions.categoryId, caseCategories.id))
			.where(
				and(
					eq(workSessions.organizationId, organizationId),
					isNull(workSessions.deletedAt),
				),
			)
			.orderBy(desc(workSessions.createdAt));

		if (sessions.length === 0) return [];

		// 2. Fetch all upcoming events for these sessions in one go
		// This avoids the N+1 query problem
		const sessionIds = sessions.map((p) => p.id);
		const allUpcomingEvents = await db
			.select({
				projectId: sessionEvents.sessionId,
				title: sessionEvents.title,
				eventDate: sessionEvents.eventDate,
			})
			.from(sessionEvents)
			.where(
				and(
					inArray(sessionEvents.sessionId, sessionIds),
					gt(sessionEvents.eventDate, new Date()),
					isNull(sessionEvents.deletedAt),
				),
			)
			.orderBy(asc(sessionEvents.eventDate));

		// 3. Map the closest event to each project in memory
		const eventMap = new Map();
		for (const event of allUpcomingEvents) {
			if (!eventMap.has(event.projectId)) {
				eventMap.set(event.projectId, event);
			}
		}

		return sessions.map((session) => ({
			...session,
			nextAction: eventMap.get(session.id) || null,
		}));
	} catch (error) {
		console.error("Error fetching projects with actions:", error);
		return [];
	}
}
