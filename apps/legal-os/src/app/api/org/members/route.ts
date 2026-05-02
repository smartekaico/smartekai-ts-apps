import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export async function GET() {
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
			{ error: "No organization context" },
			{ status: 403 },
		);
	}

	try {
		const orgMembers = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				role: members.role,
			})
			.from(members)
			.innerJoin(users, eq(members.userId, users.id))
			.where(eq(members.organizationId, activeOrgId));

		return NextResponse.json(orgMembers);
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
