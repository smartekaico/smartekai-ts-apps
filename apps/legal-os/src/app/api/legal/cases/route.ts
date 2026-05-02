import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
	const clientId = searchParams.get("clientId");

	try {
		const query = db
			.select()
			.from(cases)
			.where(eq(cases.organizationId, activeOrgId));

		if (clientId) {
			// Filter by client if provided
			const result = await db
				.select()
				.from(cases)
				.where(
					and(
						eq(cases.organizationId, activeOrgId),
						eq(cases.clientId, clientId),
					),
				)
				.orderBy(desc(cases.createdAt));
			return NextResponse.json(result);
		}

		const allCases = await db
			.select()
			.from(cases)
			.where(eq(cases.organizationId, activeOrgId))
			.orderBy(desc(cases.createdAt));

		return NextResponse.json(allCases);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}

export async function POST(req: Request) {
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

	try {
		const { title, clientId, caseNumber } = await req.json();

		if (!title || !clientId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const newCase = await db
			.insert(cases)
			.values({
				organizationId: activeOrgId,
				clientId,
				title,
				caseNumber: caseNumber || null,
				status: "Active",
			})
			.returning();

		return NextResponse.json(newCase[0]);
	} catch (error) {
		console.error("CREATE CASE ERROR:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
