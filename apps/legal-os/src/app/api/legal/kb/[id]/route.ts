export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeBase } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const { id } = await params;
	const activeOrgId =
		session?.session?.activeOrganizationId ||
		session?.user?.activeOrganizationId;

	if (!session || !activeOrgId) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const docId = Number.parseInt(id);
	if (Number.isNaN(docId)) {
		return new NextResponse("Invalid ID", { status: 400 });
	}

	try {
		// Ensure the document belongs to this organization
		const [doc] = await db
			.select()
			.from(knowledgeBase)
			.where(
				and(
					eq(knowledgeBase.id, docId),
					eq(knowledgeBase.organizationId, activeOrgId),
				),
			)
			.limit(1);

		if (!doc) {
			return new NextResponse("Document not found or access denied", {
				status: 404,
			});
		}

		// Delete the document (kb_chunks will be deleted via CASCADE in DB if configured,
		// or we check the schema. In kb-schema.sql it was CASCADE)
		await db.delete(knowledgeBase).where(eq(knowledgeBase.id, docId));

		return NextResponse.json({
			success: true,
			message: "تم حذف المستند بنجاح",
		});
	} catch (error) {
		console.error("Delete KB doc error:", error);
		return NextResponse.json(
			{ error: "Failed to delete document" },
			{ status: 500 },
		);
	}
}
