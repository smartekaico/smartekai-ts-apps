import { db } from "@/db";
import { users, organizations, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { addCreditsToOrg } from "./credits/credit-manager";

/**
 * Ensures a user has a default organization and moves their credits there.
 * This is a "Soft Migration" utility to be called upon user login.
 */
export async function ensureUserOrganization(userId: string) {
	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
	});

	if (!user) return null;

	// If user already has an active org, we're good
	if (user.activeOrganizationId) return user.activeOrganizationId;

	// Check if they are already a member of any org
	const existingMember = await db.query.members.findFirst({
		where: eq(members.userId, userId),
	});

	if (existingMember) {
		// Update user's active org
		await db
			.update(users)
			.set({ activeOrganizationId: existingMember.organizationId })
			.where(eq(users.id, userId));
		return existingMember.organizationId;
	}

	// Create a new organization for this user
	const orgId = uuidv4();
	const orgName = `${user.name} - Hub`;

	await db.insert(organizations).values({
		id: orgId,
		name: orgName,
		slug: `org-${userId.substring(0, 8)}`,
		industry:
			user.industryRole === "ADMIN" ? "MIXED" : user.industryRole || "MIXED",
		createdAt: new Date(),
		creditBalance: 0, // Reset and use buckets
	});

	// Initialize credits properly with buckets (FIFO)
	const initialCredits =
		user.creditBalance && user.creditBalance > 0 ? user.creditBalance : 50;
	await addCreditsToOrg(orgId, initialCredits);

	// Add user as OWNER of this new org
	await db.insert(members).values({
		id: uuidv4(),
		organizationId: orgId,
		userId: userId,
		role: "owner",
		createdAt: new Date(),
	});

	// Update user's active org
	await db
		.update(users)
		.set({ activeOrganizationId: orgId })
		.where(eq(users.id, userId));

	return orgId;
}
