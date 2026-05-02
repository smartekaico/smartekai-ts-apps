export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessionDocs, savedDocuments, workSessions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		console.log(`[API] Fetching document: ${id}`);

		const isNumericId = /^\d+$/.test(id);
		let doc: unknown;

		if (isNumericId) {
			const numericId = Number.parseInt(id, 10);
			const results = await db
				.select({
					id: sessionDocs.id,
					sessionId: sessionDocs.sessionId,
					title: sessionDocs.title,
					content: sessionDocs.content,
					docType: sessionDocs.docType,
					status: sessionDocs.status,
					createdAt: sessionDocs.createdAt,
					categoryId: workSessions.categoryId,
				})
				.from(sessionDocs)
				.leftJoin(workSessions, eq(sessionDocs.sessionId, workSessions.id))
				.where(eq(sessionDocs.id, numericId))
				.limit(1);

			doc = results[0];
		} else {
			doc = await db.query.savedDocuments.findFirst({
				where: eq(savedDocuments.id, id),
			});
		}

		if (!doc) {
			console.log(`[API] Document ${id} not found`);
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ document: doc });
	} catch (error) {
		console.error("[API] Error fetching document:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const isNumericId = /^\d+$/.test(id);

		if (isNumericId) {
			// sessionDocs use serial IDs (Numbers)
			await db
				.delete(sessionDocs)
				.where(eq(sessionDocs.id, Number.parseInt(id)));
		} else {
			// savedDocuments use text IDs (UUID strings)
			const activeOrgId =
				session.session.activeOrganizationId ||
				(session.user as { activeOrganizationId?: string }).activeOrganizationId;

			if (!activeOrgId) {
				return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
			}

			await db
				.delete(savedDocuments)
				.where(
					and(
						eq(savedDocuments.id, id),
						eq(savedDocuments.organizationId, activeOrgId),
					),
				);
		}

		return NextResponse.json({ message: "تم الحذف بنجاح" });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const { title, content } = await req.json();

		if (!content) {
			return NextResponse.json(
				{ error: "Content is required" },
				{ status: 400 },
			);
		}

		let result: unknown[] = [];
		if (!Number.isNaN(Number.parseInt(id))) {
			result = await db
				.update(sessionDocs)
				.set({ title: title, content: content, updatedAt: new Date() })
				.where(eq(sessionDocs.id, Number.parseInt(id)))
				.returning();
		}

		if (result.length === 0) {
			result = await db
				.update(savedDocuments)
				.set({ title: title, content: content, updatedAt: new Date() })
				.where(eq(savedDocuments.id, id))
				.returning();
		}

		if (result.length === 0) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			message: "تم التحديث بنجاح",
			document: result[0],
		});
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const { status, title, categoryId } = await req.json();

		const updateData: Record<string, unknown> = {};
		if (status) updateData.status = status;
		if (title) updateData.title = title;
		if (categoryId) updateData.categoryId = categoryId;

		if (Object.keys(updateData).length === 0) {
			return NextResponse.json(
				{ error: "No update data provided" },
				{ status: 400 },
			);
		}

		let result: unknown[] = [];
		if (!Number.isNaN(Number.parseInt(id))) {
			result = await db
				.update(sessionDocs)
				.set({ ...updateData, updatedAt: new Date() })
				.where(eq(sessionDocs.id, Number.parseInt(id)))
				.returning();
		}

		if (result.length === 0) {
			result = await db
				.update(savedDocuments)
				.set({ ...updateData, updatedAt: new Date() })
				.where(eq(savedDocuments.id, id))
				.returning();
		}

		if (result.length === 0) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			message: "تم تحديث الحالة بنجاح",
			document: result[0],
		});
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
