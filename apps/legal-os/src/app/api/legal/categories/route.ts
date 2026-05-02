import { NextResponse } from "next/server";
import { db } from "@/db";
import { caseCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
	try {
		const categories = await db
			.select({
				id: caseCategories.id,
				slug: caseCategories.slug,
				nameAr: caseCategories.nameAr,
				nameEn: caseCategories.nameEn,
			})
			.from(caseCategories)
			.where(eq(caseCategories.isActive, true));

		return NextResponse.json(categories);
	} catch (error) {
		console.error("FETCH CATEGORIES ERROR:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
