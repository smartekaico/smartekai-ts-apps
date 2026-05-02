import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, or, isNull, sql } from "drizzle-orm";

export async function GET() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;

	const userClients = await db
		.select()
		.from(clients)
		.where(
			and(
				eq(clients.userId, session.user.id),
				or(
					activeOrgId ? eq(clients.organizationId, activeOrgId) : sql`FALSE`,
					isNull(clients.organizationId),
				),
			),
		)
		.orderBy(clients.fullName);

	return NextResponse.json(userClients);
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
		const { fullName, phone, civilId } = await req.json();

		if (!fullName) {
			return NextResponse.json(
				{ error: "Full name is required" },
				{ status: 400 },
			);
		}

		const newClient = await db
			.insert(clients)
			.values({
				id: crypto.randomUUID(),
				userId: session.user.id,
				organizationId: activeOrgId,
				fullName,
				phone,
				civilId,
			})
			.returning();

		return NextResponse.json(newClient[0]);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
