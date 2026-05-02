"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
	name?: string;
	image?: string;
	firmName?: string;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw new Error("Unauthorized");
	}

	const userId = session.user.id;

	try {
		await db
			.update(users)
			.set({
				name: data.name,
				image: data.image,
				firmName: data.firmName,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId));

		// Log Activity
		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId,
			organizationId: session.user.activeOrganizationId,
			action: "PROFILE_UPDATED",
			details: "تم تحديث البيانات الشخصية",
			createdAt: new Date(),
		});

		revalidatePath("/[locale]/dashboard/settings/profile", "page");
		return { success: true };
	} catch (error) {
		console.error("Profile Update Error:", error);
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}

export async function updateWorkspace(data: {
	name?: string;
	defaultJurisdiction?: string;
	logo?: string;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw new Error("Unauthorized");
	}

	const organizationId = session.user.activeOrganizationId;

	if (!organizationId) {
		throw new Error("No active organization");
	}

	try {
		await db
			.update(organizations)
			.set({
				name: data.name,
				defaultJurisdiction: data.defaultJurisdiction,
				logo: data.logo,
			})
			.where(eq(organizations.id, organizationId));

		// Log Activity
		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: session.user.id,
			organizationId,
			action: "WORKSPACE_UPDATED",
			details: "تم تحديث إعدادات المكتب",
			createdAt: new Date(),
		});

		revalidatePath("/[locale]/dashboard/settings/workspace", "page");
		return { success: true };
	} catch (error) {
		console.error("Workspace Update Error:", error);
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}
