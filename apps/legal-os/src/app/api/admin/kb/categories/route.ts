export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export async function GET(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || session.user.industryRole !== "ADMIN") {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const jurisdictionId = searchParams.get("jurisdictionId");
		const action = searchParams.get("action");

		if (action === "domains") {
			const domains = await db
				.selectDistinct({
					legalDomain: caseCategories.legalDomain,
				})
				.from(caseCategories);
			return NextResponse.json(
				domains.map((r) => r.legalDomain).filter(Boolean),
			);
		}

		const query = db.select().from(caseCategories);
		const data = jurisdictionId
			? await query.where(eq(caseCategories.jurisdictionId, jurisdictionId))
			: await query;

		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to fetch categories" },
			{ status: 500 },
		);
	}
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || session.user.industryRole !== "ADMIN") {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		const body = await req.json();
		const { nameAr, nameEn, jurisdictionId, legalDomain, descriptionAr, slug } =
			body;

		if (!nameAr || !nameEn || !jurisdictionId || !legalDomain) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const id = randomUUID();
		const newCategory = await db
			.insert(caseCategories)
			.values({
				id,
				slug: slug || id.substring(0, 10),
				nameAr,
				nameEn,
				descriptionAr: descriptionAr || "",
				jurisdictionId,
				workspaceSlug: "legal", // Default for now
				legalDomain,
				isActive: true,
			})
			.returning();

		return NextResponse.json(newCategory[0]);
	} catch (error) {
		console.error("Error creating category:", error);
		return NextResponse.json(
			{ error: (error instanceof Error ? error.message : null) || "Failed to create category" },
			{ status: 500 },
		);
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
				{ error: "Missing category ID" },
				{ status: 400 },
			);
		}

		await db.delete(caseCategories).where(eq(caseCategories.id, id));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting category:", error);
		return NextResponse.json(
			{ error: (error instanceof Error ? error.message : null) || "Failed to delete category" },
			{ status: 500 },
		);
	}
}
