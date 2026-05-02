export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessionDocs, workSessions, savedDocuments } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc, isNull, or, and, sql } from "drizzle-orm";
import crypto from "node:crypto";

export const runtime = "nodejs";

// POST — Save a new document (Unassigned by default)
export async function POST(req: NextRequest) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { title, content, caseProjectId, id, docType } = await req.json();

		// Allow empty content for new/scratch documents
		const finalContent = content || "";
		const finalDocType = docType || "Draft";

		// If caseProjectId is provided, save into sessionDocs
		if (caseProjectId) {
			if (id && !Number.isNaN(Number.parseInt(id))) {
				const updatedDoc = await db
					.update(sessionDocs)
					.set({
						title: title || "مستند بدون عنوان",
						content: finalContent,
						docType: finalDocType,
					})
					.where(eq(sessionDocs.id, Number.parseInt(id)))
					.returning();
				return NextResponse.json({
					message: "تم التحديث بنجاح",
					document: updatedDoc[0],
				});
			}

			// Inherit category from session
			const sessionData = await db.query.workSessions.findFirst({
				where: eq(workSessions.id, Number.parseInt(caseProjectId)),
				columns: { categoryId: true },
			});

			const newDoc = await db
				.insert(sessionDocs)
				.values({
					sessionId: Number.parseInt(caseProjectId),
					title: title || "مستند بدون عنوان",
					content: finalContent,
					docType: finalDocType,
					categoryId: sessionData?.categoryId || null,
				})
				.returning();

			return NextResponse.json({
				message: "تم الحفظ بنجاح",
				document: newDoc[0],
			});
		}
		// Save to legacy savedDocuments if no session provided (global bucket)
		const activeOrgId =
			session.session.activeOrganizationId ||
			(session.user as { activeOrganizationId?: string }).activeOrganizationId;

		const newLegacyDoc = await db
			.insert(savedDocuments)
			.values({
				id: id || crypto.randomUUID(),
				organizationId: activeOrgId,
				title: title || "مستند بدون عنوان",
				content: finalContent,
				docType: finalDocType,
			})
			.returning();

		return NextResponse.json({
			message: "تم الحفظ بنجاح",
			document: newLegacyDoc[0],
		});
	} catch (error) {
		console.error("Save Error:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

// GET — List all saved documents for the user (including project titles)
export async function GET(req: NextRequest) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");
		const projectId = searchParams.get("projectId");
		const status = searchParams.get("status") || "Open";
		const activeOrgId =
			session.session.activeOrganizationId || session.user.activeOrganizationId;

		// Handle single document fetch
		if (id) {
			if (!Number.isNaN(Number.parseInt(id))) {
				const doc = await db
					.select({
						id: sessionDocs.id,
						title: sessionDocs.title,
						content: sessionDocs.content,
						docType: sessionDocs.docType,
						createdAt: sessionDocs.createdAt,
						sessionId: sessionDocs.sessionId,
						status: sessionDocs.status,
						categoryId: workSessions.categoryId,
					})
					.from(sessionDocs)
					.leftJoin(workSessions, eq(sessionDocs.sessionId, workSessions.id))
					.where(eq(sessionDocs.id, Number.parseInt(id)))
					.limit(1);

				if (doc.length > 0) return NextResponse.json(doc[0]);
			}

			const legacyDoc = await db.query.savedDocuments.findFirst({
				where: eq(savedDocuments.id, id),
			});
			if (legacyDoc) return NextResponse.json(legacyDoc);

			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		// Dynamic where clause for sessionDocs
		const statusFilters = eq(sessionDocs.status, status);

		const whereClause = projectId
			? and(
				eq(sessionDocs.sessionId, Number.parseInt(projectId)),
				statusFilters,
			)
			: activeOrgId
				? and(eq(workSessions.organizationId, activeOrgId), statusFilters)
				: sql`FALSE`;

		const docs = await db
			.select({
				id: sessionDocs.id,
				title: sessionDocs.title,
				doc_type: sessionDocs.docType,
				preview: sql<string>`LEFT(${sessionDocs.content}, 200)`,
				created_at: sessionDocs.createdAt,
				case_project_id: sessionDocs.sessionId,
				project_title: workSessions.title,
				status: sessionDocs.status,
				category_id: workSessions.categoryId,
			})
			.from(sessionDocs)
			.leftJoin(workSessions, eq(sessionDocs.sessionId, workSessions.id))
			.where(whereClause)
			.orderBy(desc(sessionDocs.createdAt))
			.limit(100);

		// If filtering by project, we don't return legacy docs (strict session view)
		if (projectId) {
			return NextResponse.json(docs);
		}

		// Fetch from legacy table for global view
		const legacyDocs = await db
			.select({
				id: savedDocuments.id,
				title: savedDocuments.title,
				doc_type: savedDocuments.docType,
				preview: sql<string>`LEFT(${savedDocuments.content}, 200)`,
				created_at: savedDocuments.createdAt,
				case_project_id: sql<string | null>`NULL`,
				project_title: sql<string | null>`'Legacy Archive'`,
				status: savedDocuments.status,
			})
			.from(savedDocuments)
			.where(
				and(
					eq(savedDocuments.status, status),
					activeOrgId
						? eq(savedDocuments.organizationId, activeOrgId)
						: sql`FALSE`,
				),
			);

		// Filter out potential duplicates by ID if any
		const allDocs: any[] = [...docs];
		for (const lDoc of legacyDocs) {
			allDocs.push({
				id: lDoc.id,
				title: lDoc.title || "مستند قديم",
				doc_type: lDoc.doc_type || "Draft",
				preview: lDoc.preview,
				created_at: lDoc.created_at || new Date(),
				case_project_id: null,
				project_title: "Legacy Archive",
				status: lDoc.status,
				category_id: null,
			});
		}

		allDocs.sort((a, b) => {
			const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
			const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
			return timeB - timeA;
		});

		return NextResponse.json(projectId ? docs : { documents: allDocs });
	} catch (error) {
		console.error("List Error:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
