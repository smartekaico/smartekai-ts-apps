export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
	knowledgeBase,
	kbChunks,
	jurisdictions,
	caseCategories as categoriesTable,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || session.user.industryRole !== "ADMIN") {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const { searchParams } = new URL(req.url);
	const jurisdictionParam = searchParams.get("jurisdiction");
	const docTypeParam = searchParams.get("doc_type");

	try {
		const data = await db
			.select({
				id: knowledgeBase.id,
				title: knowledgeBase.title,
				docType: knowledgeBase.docType,
				jurisdiction: knowledgeBase.jurisdiction, // This is the ID/Code
				jurisdictionName: jurisdictions.nameAr,
				categoryId: knowledgeBase.categoryId,
				categoryName: categoriesTable.nameAr,
				status: knowledgeBase.status,
				createdAt: knowledgeBase.createdAt,
				chunksCount: sql<number>`count(${kbChunks.id})::int`,
			})
			.from(knowledgeBase)
			.leftJoin(kbChunks, eq(kbChunks.documentId, knowledgeBase.id))
			.leftJoin(jurisdictions, eq(jurisdictions.id, knowledgeBase.jurisdiction))
			.leftJoin(
				categoriesTable,
				eq(categoriesTable.id, knowledgeBase.categoryId),
			)
			.where(
				sql`(${knowledgeBase.organizationId} IS NULL) 
        ${jurisdictionParam ? sql`AND ${knowledgeBase.jurisdiction} = ${jurisdictionParam}` : sql``} 
        ${docTypeParam ? sql`AND ${knowledgeBase.docType} = ${docTypeParam}` : sql``}`,
			)
			.groupBy(knowledgeBase.id, jurisdictions.id, categoriesTable.id)
			.orderBy(sql`${knowledgeBase.createdAt} DESC`);

		return NextResponse.json({ documents: data });
	} catch (error: unknown) {
		console.error("Error fetching documents:", error);
		const message =
			error instanceof Error ? error.message : "Failed to fetch documents";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function DELETE(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || session.user.industryRole !== "ADMIN") {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Missing document ID" },
				{ status: 400 },
			);
		}

		// Delete child chunks first to resolve foreign key constraints
		await db
			.delete(kbChunks)
			.where(eq(kbChunks.documentId, Number.parseInt(id)));

		// Now safe to delete the parent document
		await db
			.delete(knowledgeBase)
			.where(eq(knowledgeBase.id, Number.parseInt(id)));

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to delete document";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
