import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
	const caseId = Number.parseInt(id, 10);
	if (Number.isNaN(caseId)) {
		return NextResponse.json({ error: "Invalid case ID" }, { status: 400 });
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
		const result = await db
			.select()
			.from(cases)
			.where(and(eq(cases.id, caseId), eq(cases.organizationId, activeOrgId)))
			.limit(1);

		if (result.length === 0) {
			return NextResponse.json({ error: "Case not found" }, { status: 404 });
		}

		return NextResponse.json(result[0]);
	} catch (error) {
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
	const caseId = Number.parseInt(id, 10);
	if (Number.isNaN(caseId)) {
		return NextResponse.json({ error: "Invalid case ID" }, { status: 400 });
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
		const body = await req.json();
		const { title, caseNumber, status, plaintiff, defendant } = body;

		const updated = await db
			.update(cases)
			.set({
				title,
				caseNumber,
				plaintiff,
				defendant,
				status,
			})
			.where(and(eq(cases.id, caseId), eq(cases.organizationId, activeOrgId)))
			.returning();

		if (updated.length === 0) {
			return NextResponse.json({ error: "Case not found" }, { status: 404 });
		}

		return NextResponse.json(updated[0]);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
