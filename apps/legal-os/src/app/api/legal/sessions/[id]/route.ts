import { NextResponse } from "next/server";
import { db } from "@/db";
import {
	workSessions,
	sessionDocs,
	sessionEvents,
	cases,
	clients,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const sessionId = Number.parseInt(id, 10);
	if (Number.isNaN(sessionId)) {
		return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
	}

	try {
		const project = await db
			.select({
				id: workSessions.id,
				title: workSessions.title,
				tag: workSessions.tag,
				categoryId: workSessions.categoryId,
				status: workSessions.status,
				isFavorite: workSessions.isFavorite,
				createdAt: workSessions.createdAt,
				caseId: workSessions.caseId,
				// Case details
				caseTitle: cases.title,
				caseNumber: cases.caseNumber,
				caseStatus: cases.status,
				// Client details
				clientId: clients.id,
				clientName: clients.fullName,
				clientPhone: clients.phone,
				clientCivilId: clients.civilId,
			})
			.from(workSessions)
			.leftJoin(cases, eq(workSessions.caseId, cases.id))
			.leftJoin(clients, eq(cases.clientId, clients.id))
			.where(eq(workSessions.id, sessionId))
			.limit(1);

		if (project.length === 0) {
			return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
		}

		const allDocuments = await db
			.select({
				id: sessionDocs.id,
				title: sessionDocs.title,
				content: sessionDocs.content,
				docType: sessionDocs.docType,
				categoryId: sessionDocs.categoryId,
				createdAt: sessionDocs.createdAt,
			})
			.from(sessionDocs)
			.where(eq(sessionDocs.sessionId, sessionId))
			.orderBy(desc(sessionDocs.createdAt));

		const eventsSize = await db
			.select()
			.from(sessionEvents)
			.where(eq(sessionEvents.sessionId, sessionId))
			.orderBy(desc(sessionEvents.eventDate));

		return NextResponse.json({
			project: project[0],
			documents: allDocuments.map((doc) => ({
				...doc,
				categoryId: project[0].categoryId, // Force sync with session category
			})),
			events: eventsSize,
		});
	} catch (error) {
		console.error("Fetch Session Detail Error:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { id } = await params;
	const sessionId = Number.parseInt(id, 10);
	if (Number.isNaN(sessionId)) {
		return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
	}

	const body = await req.json();
	const { title, tag, categoryId, status: newStatus, isFavorite } = body;

	try {
		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (title !== undefined) updateData.title = title;
		if (tag !== undefined) updateData.tag = tag;
		if (categoryId !== undefined) updateData.categoryId = categoryId;
		if (newStatus !== undefined) updateData.status = newStatus;
		if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

		const updatedResult = await db
			.update(workSessions)
			.set(updateData)
			.where(eq(workSessions.id, sessionId))
			.returning();

		if (updatedResult.length === 0) {
			return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
		}

		// Return the joined record
		const project = await db
			.select({
				id: workSessions.id,
				title: workSessions.title,
				tag: workSessions.tag,
				categoryId: workSessions.categoryId,
				status: workSessions.status,
				isFavorite: workSessions.isFavorite,
				createdAt: workSessions.createdAt,
				caseId: workSessions.caseId,
				// Case details
				caseTitle: cases.title,
				caseNumber: cases.caseNumber,
				caseStatus: cases.status,
				// Client details
				clientId: clients.id,
				clientName: clients.fullName,
				clientPhone: clients.phone,
				clientCivilId: clients.civilId,
			})
			.from(workSessions)
			.leftJoin(cases, eq(workSessions.caseId, cases.id))
			.leftJoin(clients, eq(cases.clientId, clients.id))
			.where(eq(workSessions.id, sessionId))
			.limit(1);

		return NextResponse.json({
			success: true,
			session: project[0],
		});
	} catch (error) {
		console.error("Update Session Error:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
