import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
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
	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;

	if (!activeOrgId) {
		return NextResponse.json(
			{ error: "No active organization" },
			{ status: 403 },
		);
	}

	try {
		const client = await db
			.select()
			.from(clients)
			.where(and(eq(clients.id, id), eq(clients.organizationId, activeOrgId)))
			.limit(1);

		if (client.length === 0) {
			return NextResponse.json({ error: "Client not found" }, { status: 404 });
		}

		return NextResponse.json(client[0]);
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
		const { fullName, phone, civilId } = body;

		const updated = await db
			.update(clients)
			.set({
				fullName,
				phone,
				civilId,
			})
			.where(and(eq(clients.id, id), eq(clients.organizationId, activeOrgId)))
			.returning();

		if (updated.length === 0) {
			return NextResponse.json({ error: "Client not found" }, { status: 404 });
		}

		return NextResponse.json(updated[0]);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
