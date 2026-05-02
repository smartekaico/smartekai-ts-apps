"use server";

import { db } from "@/db";
import { jurisdictions, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

// Ensure the user is an admin and returns session
async function ensureAdmin() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session || session.user.industryRole !== "ADMIN") {
		throw new Error("Unauthorized");
	}
	return session;
}

export async function getJurisdictions() {
	await ensureAdmin();
	try {
		const data = await db.select().from(jurisdictions);
		return { success: true, data };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}

export async function addJurisdiction(
	nameAr: string,
	nameEn: string,
	code: string,
) {
	const session = await ensureAdmin();
	try {
		const id = code.toLowerCase();
		await db.insert(jurisdictions).values({
			id,
			code: code.toUpperCase(),
			nameAr,
			nameEn,
			isActive: true,
		});

		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_JURISDICTION",
			details: `إضافة نطاق قضائي جديد: ${nameAr} (${code.toUpperCase()})`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}

export async function toggleJurisdictionStatus(id: string, isActive: boolean) {
	const session = await ensureAdmin();
	try {
		await db
			.update(jurisdictions)
			.set({ isActive })
			.where(eq(jurisdictions.id, id));

		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_JURISDICTION",
			details: `${isActive ? "تفعيل" : "تعطيل"} النطاق القضائي: ${id}`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}

export async function deleteJurisdiction(id: string) {
	const session = await ensureAdmin();
	try {
		// Note: In a production app, we would check for dependent records first.
		await db.delete(jurisdictions).where(eq(jurisdictions.id, id));

		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_JURISDICTION",
			details: `حذف النطاق القضائي: ${id}`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}

export async function updateJurisdiction(
	id: string,
	data: { nameAr?: string; nameEn?: string; code?: string; isActive?: boolean },
) {
	const session = await ensureAdmin();
	try {
		const updateData: Record<string, unknown> = { ...data };
		if (data.code) updateData.code = data.code.toUpperCase();

		await db
			.update(jurisdictions)
			.set(updateData as typeof data)
			.where(eq(jurisdictions.id, id));

		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_JURISDICTION",
			details: `تحديث بيانات النطاق القضائي: ${id}`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}
