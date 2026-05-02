"use server";

import React from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
	platformInvites,
	demoRequests,
	organizations,
	users,
	accounts,
	members,
	auditLogs,
	invitations,
	sessions,
	workSessions,
	sessionEvents,
	sessionDocs,
	sessionChats,
	generatedContracts,
	cases,
	appointments,
	clients,
	caseAnalyses,
	savedDocuments,
	creditBuckets,
	ledgers,
	verifications,
} from "@/db/schema";
import { auth, pendingMagicLinkUrls } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { eq, sql, and, or, inArray } from "drizzle-orm";
import { resend } from "@/lib/mail";
import { getBaseUrl, getPublicUrl } from "@/lib/utils";
import { DemoApprovedEmail } from "@/emails/DemoApprovedEmail";
import { addCreditsToOrg } from "@/lib/credits/credit-manager";

async function verifyAdmin() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session || session.user.industryRole !== "ADMIN") {
		throw new Error("Unauthorized");
	}
	return session;
}

export async function getOrganizations(industryRole?: string) {
	const session = await verifyAdmin();
	try {
		const query = db
			.select({
				id: organizations.id,
				name: organizations.name,
				creditBalance: organizations.creditBalance,
				industry: organizations.industry,
				defaultJurisdiction: organizations.defaultJurisdiction,
				createdAt: organizations.createdAt,
				ownerEmail: users.email,
			})
			.from(organizations)
			.innerJoin(members, eq(members.organizationId, organizations.id))
			.innerJoin(users, eq(users.id, members.userId))
			.where(
				and(
					or(eq(members.role, "admin"), eq(members.role, "owner")),
					industryRole
						? or(
								eq(organizations.industry, industryRole),
								eq(organizations.industry, "MIXED"),
							)
						: sql`true`,
				),
			)
			.orderBy(sql`${organizations.createdAt} DESC`);

		const orgs = await query;
		return { success: true, data: orgs };
	} catch (error) {
		console.error("Failed to fetch organizations:", error);
		return { error: "Failed to fetch organizations" };
	}
}

export async function updateOrganizationCredits(orgId: string, amount: number) {
	const session = await verifyAdmin();
	try {
		await addCreditsToOrg(orgId, amount);

		return { success: true };
	} catch (error) {
		console.error("Failed to update credits:", error);
		return { error: "Failed to update credits" };
	}
}

export async function generateInvite(role: string, credits: number) {
	const session = await verifyAdmin();

	try {
		const inviteId = nanoid();
		const token = nanoid(16).toUpperCase(); // Secure 16-character token

		await db.insert(platformInvites).values({
			id: inviteId,
			token,
			industryRole: role,
			initialCredits: credits,
			status: "unused",
			createdAt: new Date(),
		});

		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_INVITE",
			details: `توليد كود دعوة جديد لنظام ${role} برصيد ${credits}`,
			createdAt: new Date(),
		});

		return { success: true, token };
	} catch (error) {
		console.error("Failed to generate invite:", error);
		return { error: "Failed to generate invite" };
	}
}

export async function approveDemoRequest(
	requestId: string,
	role: string,
	credits: number,
) {
	const session = await verifyAdmin();

	try {
		// 1. Get the demo request email
		const request = await db.query.demoRequests.findFirst({
			where: eq(demoRequests.id, requestId),
		});

		if (!request) {
			return { error: "Request not found" };
		}

		// 2. Provision User Account (if not exists)
		const existingUser = await db.query.users.findFirst({
			where: eq(users.email, request.email),
		});

		let userId: string;

		if (existingUser) {
			userId = existingUser.id;
			// Also fix any potentially broken password hash from previous versions
			await db.update(accounts)
				.set({ password: null })
				.where(and(
					eq(accounts.userId, userId),
					eq(accounts.password, "ADMIN_PROVISIONED_NEEDS_RESET")
				));
		} else {
			userId = nanoid();
			await db.insert(users).values({
				id: userId,
				name: request.name,
				email: request.email,
				emailVerified: true,
				firmName: request.company,
				subscriptionTier: "free",
				creditBalance: credits,
				industryRole: role,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(accounts).values({
				id: nanoid(),
				userId: userId,
				accountId: request.email,
				providerId: "credential",
				password: null, // Scrypt/Bcrypt will fail on plain text; set to null for magic-link only start
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		// 3. Provision Workspace (Organization)
		const orgId = nanoid();
		await db.insert(organizations).values({
			id: orgId,
			name: request.company ? `${request.company} Workspace` : `${request.name}'s Workspace`,
			industry: role,
			creditBalance: credits,
			createdAt: new Date(),
		});

		await db.insert(members).values({
			id: nanoid(),
			organizationId: orgId,
			userId: userId,
			role: "owner",
			createdAt: new Date(),
		});

		// Set active org
		await db.update(users).set({ activeOrganizationId: orgId }).where(eq(users.id, userId));

		// 4. Delete the demo request automatically
		await db.delete(demoRequests).where(eq(demoRequests.id, requestId));

		// 5. Generate real magic link via Better Auth and send Welcome Email
		const publicUrl = getPublicUrl();
		let magicLink = `${publicUrl}/login`; // fallback

		try {
			const emailKey = request.email.toLowerCase();
			// Signal to auth.ts to suppress the default email and capture the URL
			pendingMagicLinkUrls.set(`__suppress_${emailKey}`, "true");
			
			// Better Auth's magic link plugin generates a real session-backed link
			await (auth.api as any).signInMagicLink({
				body: {
					email: request.email,
					callbackURL: `${publicUrl}/dashboard`,
				},
				headers: await headers(),
			});

			// Retrieve the captured URL
			const capturedUrl = pendingMagicLinkUrls.get(emailKey);
			if (capturedUrl) {
				magicLink = capturedUrl;
				pendingMagicLinkUrls.delete(emailKey);
			}
		} catch (mlErr) {
			const emailKey = request.email.toLowerCase();
			console.error("Magic link generation failed:", mlErr);
			// Clean up in case of error
			pendingMagicLinkUrls.delete(`__suppress_${emailKey}`);
		}

		await resend.emails.send({
			from: "Smartek AI Hub <team@smartekai.com>",
			to: [request.email],
			replyTo: "team@smartekai.com",
			subject: `تم اعتماد طلبك - أهلاً بك في ${role === "LEGAL" ? "Legal OS" : "Medical OS"}`,
			react: React.createElement(DemoApprovedEmail, {
				name: request.name,
				token: "MAGIC_LINK",
				industry: role,
				publicUrl: publicUrl,
				magicLink: magicLink,
			}),
		});
		
		// 6. Notify via Telegram
		try {
			const { sendTelegramNotification } = await import("@/lib/telegram");
			const message = `✅ <b>Demo Request Approved</b>\n\n👤 <b>Name:</b> ${request.name}\n📧 <b>Email:</b> ${request.email}\n⚖️ <b>Industry:</b> ${role}\n🏢 <b>Company:</b> ${request.company || "N/A"}\n\n✨ <i>User account provisioned & magic link sent.</i>`;
			await sendTelegramNotification(message);
		} catch (telegramErr) {
			console.error("Failed to send telegram notification:", telegramErr);
		}


		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_DEMO",
			details: `اعتماد طلب ديمو للمستخدم: ${request.email} (${role})`,
			createdAt: new Date(),
		});

		return { success: true, magicLink };
	} catch (error) {
		console.error("Failed to approve demo request:", error);
		return { error: "Failed to approve demo request" };
	}
}

export async function deleteDemoRequest(requestId: string) {
	const session = await verifyAdmin();

	try {
		await db.delete(demoRequests).where(eq(demoRequests.id, requestId));

		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_DEMO",
			details: `حذف طلب ديمو: ${requestId}`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to delete demo request:", error);
		return { error: "Failed to delete demo request" };
	}
}

export async function cancelInvite(inviteId: string) {
	const session = await verifyAdmin();

	try {
		await db.delete(platformInvites).where(eq(platformInvites.id, inviteId));

		// Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_INVITE",
			details: `إلغاء كود دعوة: ${inviteId}`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to cancel invite:", error);
		return { error: "Failed to cancel invite" };
	}
}
export async function deleteSubscriber(orgId: string) {
	const adminSession = await verifyAdmin();

	try {
		// 1. Get all members to delete their Auth data later
		const orgMembers = await db.query.members.findMany({
			where: eq(members.organizationId, orgId),
		});
		const userIds = orgMembers.map((m) => m.userId);

		// 2. Delete organization-specific data
		await db.delete(auditLogs).where(eq(auditLogs.organizationId, orgId));
		await db.delete(ledgers).where(eq(ledgers.organizationId, orgId));
		await db
			.delete(creditBuckets)
			.where(eq(creditBuckets.organizationId, orgId));
		await db
			.delete(savedDocuments)
			.where(eq(savedDocuments.organizationId, orgId));
		await db
			.delete(caseAnalyses)
			.where(eq(caseAnalyses.organizationId, orgId));
		await db
			.delete(generatedContracts)
			.where(eq(generatedContracts.organizationId, orgId));
		await db
			.delete(appointments)
			.where(eq(appointments.organizationId, orgId));

		// Working Sessions Sub-data
		const sessionsList = await db
			.select({ id: workSessions.id })
			.from(workSessions)
			.where(eq(workSessions.organizationId, orgId));

		if (sessionsList.length > 0) {
			const sessionIds = sessionsList.map((s) => s.id);
			await db
				.delete(sessionEvents)
				.where(inArray(sessionEvents.sessionId, sessionIds));
			await db
				.delete(sessionDocs)
				.where(inArray(sessionDocs.sessionId, sessionIds));
			await db
				.delete(sessionChats)
				.where(inArray(sessionChats.sessionId, sessionIds));
		}
		await db.delete(workSessions).where(eq(workSessions.organizationId, orgId));

		// Cases & Clients
		await db.delete(cases).where(eq(cases.organizationId, orgId));
		await db.delete(clients).where(eq(clients.organizationId, orgId));

		// 3. Delete Auth & Membership data
		await db.delete(members).where(eq(members.organizationId, orgId));
		await db.delete(invitations).where(eq(invitations.organizationId, orgId));

		for (const uid of userIds) {
			await db.delete(sessions).where(eq(sessions.userId, uid));
			await db.delete(accounts).where(eq(accounts.userId, uid));
			try {
				await db.delete(users).where(eq(users.id, uid));
			} catch (userErr) {
				console.warn(`Could not fully delete user ${uid}:`, userErr);
			}
		}

		// 4. Delete the Organization record
		await db.delete(organizations).where(eq(organizations.id, orgId));

		// Global Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: adminSession.user.id,
			organizationId: adminSession.session.activeOrganizationId,
			action: "ADMIN_DELETE_SUBSCRIBER",
			details: `حذف نهائي للمشترك والمؤسسة: ${orgId}`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to delete subscriber:", error);
		return { error: "Failed to delete subscriber and associated data" };
	}
}
