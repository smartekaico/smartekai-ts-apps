export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeBase } from "@/db/schema";
import { eq, and, desc, count, gte } from "drizzle-orm";

export async function GET(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const activeOrgId =
		session?.session?.activeOrganizationId ||
		session?.user?.activeOrganizationId;

	if (!session || !activeOrgId) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		// 1. Get all documents for this organization
		const docs = await db
			.select()
			.from(knowledgeBase)
			.where(eq(knowledgeBase.organizationId, activeOrgId))
			.orderBy(desc(knowledgeBase.createdAt));

		// 2. Calculate Stats
		const totalCount = docs.length;

		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const [dailyCountResult] = await db
			.select({ value: count() })
			.from(knowledgeBase)
			.where(
				and(
					eq(knowledgeBase.organizationId, activeOrgId),
					gte(knowledgeBase.createdAt, twentyFourHoursAgo),
				),
			);

		return NextResponse.json({
			documents: docs,
			stats: {
				totalDocs: totalCount,
				totalLimit: 100,
				dailyUploads: dailyCountResult.value,
				dailyLimit: 10,
				freeRemaining: Math.max(0, 5 - totalCount),
			},
		});
	} catch (error) {
		console.error("Fetch Org KB docs error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch documents" },
			{ status: 500 },
		);
	}
}
