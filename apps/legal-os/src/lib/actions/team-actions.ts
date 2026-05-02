"use server";

import { db } from "@/db";
import { invitations, organizations, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function fetchInvitationDetails(inviteId: string) {
	if (!inviteId) return null;

	try {
		const result = await db
			.select({
				id: invitations.id,
				email: invitations.email,
				role: invitations.role,
				status: invitations.status,
				expiresAt: invitations.expiresAt,
				organizationName: organizations.name,
				organizationLogo: organizations.logo,
				inviterEmail: users.email,
				inviterName: users.name,
			})
			.from(invitations)
			.innerJoin(
				organizations,
				eq(invitations.organizationId, organizations.id),
			)
			.innerJoin(users, eq(invitations.inviterId, users.id))
			.where(
				and(
					eq(invitations.id, inviteId),
					eq(invitations.status, "pending"),
					gt(invitations.expiresAt, new Date()),
				),
			)
			.limit(1);

		if (result.length === 0) return null;
		return result[0];
	} catch (error) {
		console.error("FETCH INVITATION SERVER ERROR:", error);
		return null;
	}
}
