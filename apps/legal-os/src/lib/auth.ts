import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, magicLink } from "better-auth/plugins";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { resend } from "./mail";
import TeamInvitationEmail from "@/emails/TeamInvitationEmail";
import ResetPasswordEmail from "@/emails/ResetPasswordEmail";
import MagicLinkEmail from "@/emails/MagicLinkEmail";
import React from "react";
import { getBaseUrl, getPublicUrl } from "@/lib/utils";

// In-memory store to capture magic link URLs during admin approval flow
// Allows the approval action to embed the real URL in the branded email
export const pendingMagicLinkUrls = new Map<string, string>();

export const auth = betterAuth({
	baseURL: getBaseUrl(),
	trustedOrigins: [
		"https://smartekai.com",
		"http://smartekai.com",
		"https://smartekai.com:3000",
		process.env.NEXT_PUBLIC_APP_URL || "",
		process.env.BETTER_AUTH_URL || "",
	].filter(Boolean),
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications,
			organization: schema.organizations,
			member: schema.members,
			invitation: schema.invitations,
		},
	}),
	user: {
		additionalFields: {
			activeOrganizationId: { type: "string" },
			firmName: { type: "string" },
			subscriptionTier: { type: "string" },
			creditBalance: { type: "number" },
			industryRole: { type: "string" },
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30 days
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60,
		},
		additionalFields: {
			activeOrganizationId: { type: "string" },
			industryRole: { type: "string" },
		},
	},
	emailAndPassword: {
		enabled: true,
		async sendResetPassword(data: {
			user: any;
			url: string;
			token: string;
		}) {
			const publicUrl = getPublicUrl();
			const resetLink = `${publicUrl}/reset-password?token=${data.token}`;

			await resend.emails.send({
				from: "Smartek AI Hub <team@smartekai.com>",
				to: [data.user.email],
				replyTo: "team@smartekai.com",
				subject: "استعادة كلمة المرور - Reset Your Password",
				react: React.createElement(ResetPasswordEmail, {
					userEmail: data.user.email,
					resetLink,
				}),
			});
		},
	},
	plugins: [
		organization({
			async sendInvitationEmail(data) {
				const publicUrl = getPublicUrl();
				const inviteLink = `${publicUrl}/accept-team-invite?id=${data.id}`;

				// Log Audit Action
				await db.insert(schema.auditLogs).values({
					id: crypto.randomUUID(),
					userId: data.inviter.userId,
					organizationId: data.organization.id,
					action: "TEAM_INVITE_SENT",
					details: `تم إرسال دعوة إلى ${data.email} برتبة ${data.role}`,
					createdAt: new Date(),
				});

				await resend.emails.send({
					from: "Smartek AI Hub <team@smartekai.com>",
					to: [data.email],
					replyTo: "team@smartekai.com",
					subject: `دعوة للانضمام إلى فريق ${data.organization.name}`,
					react: React.createElement(TeamInvitationEmail, {
						inviterName: data.inviter.user.name,
						inviterEmail: data.inviter.user.email,
						orgName: data.organization.name,
						inviteLink,
					}),
				});
			},
			// Log when a member is removed
			onMemberRemoved: async (data: {
				member: { userId: string; organizationId: string };
			}) => {
				await db.insert(schema.auditLogs).values({
					id: crypto.randomUUID(),
					userId: data.member.userId, // This is the person who WAS removed
					organizationId: data.member.organizationId,
					action: "MEMBER_REMOVED",
					details: `تمت إزالة العضو من الفريق (ID: ${data.member.userId})`,
					createdAt: new Date(),
				});
			},
		}),
		magicLink({
			expiresIn: 60 * 60 * 48, // 48 hours
			disableSignUp: true, // Only allow existing/approved users to request magic links
			async sendMagicLink(data) {
				const emailKey = data.email.toLowerCase();
				// 1. Manual check for user existence to enforce "approved only" access.
				// This is a second layer of defense alongside disableSignUp: true.
				const user = await db.query.users.findFirst({
					where: eq(schema.users.email, emailKey),
				});

				if (!user) {
					console.warn(`[AUTH] Blocked magic link request for unapproved email: ${data.email}`);
					// Throwing ensures the error propagates to the client UI instead of showing "Success"
					return; 
				}

				// Store the URL so it can be captured by the admin approval flow
				// before we send our branded email instead of the default one
				pendingMagicLinkUrls.set(emailKey, data.url);

				// Only send the generic magic link email if this isn't being
				// intercepted by our approval flow (i.e. user-initiated from login page)
				if (!pendingMagicLinkUrls.get(`__suppress_${emailKey}`)) {
					// Ensure the URL uses the public domain, especially if Better Auth generates a localhost one
					const publicUrl = getPublicUrl();
					const finalUrl = data.url.replace(/^(https?:\/\/[^/]+)/, publicUrl);

					await resend.emails.send({
						from: "Smartek AI Hub <team@smartekai.com>",
						to: [data.email],
						replyTo: "team@smartekai.com",
						subject: "تسجيل دخول آمن - Secure Magic Link Login",
						react: React.createElement(MagicLinkEmail, {
							userEmail: data.email,
							url: finalUrl,
						}),
					});
				}
				pendingMagicLinkUrls.delete(`__suppress_${emailKey}`);
			},
		}),
	],
});
