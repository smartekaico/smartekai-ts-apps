"use server";

import type React from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { organizations, users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resend } from "@/lib/mail";
import { AdminCreditRequestEmail } from "@/emails/AdminCreditRequestEmail";
import { UserCreditRequestConfirmedEmail } from "@/emails/UserCreditRequestConfirmedEmail";
import { getPostHogClient } from "@/lib/posthog-server";
import { nanoid } from "nanoid";
import { addCreditsToOrg } from "@/lib/credits/credit-manager";

export async function requestManualTopup(
	packageId: "lite" | "pro" | "scale" = "lite",
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return { error: "الرجاء تسجيل الدخول لتقديم طلب شحن." };
	}

	try {
		const userId = session.user.id;
		const userEmail = session.user.email;
		const userName = session.user.name;

		// Get Organization Details
		const orgId = session.session.activeOrganizationId;
		if (!orgId) {
			return { error: "لم يتم العثور على مؤسسة نشطة لهذا المستخدم." };
		}

		const orgResult = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);
		const org = orgResult[0];

		if (!org) {
			return { error: "المؤسسة غير موجودة." };
		}

		// Package-specific configuration
		const packageConfig = {
			lite: {
				name: "الباقة الأساسية (Lite)",
				credits: 50,
				envTitle: "MANUAL_PAYMENT_URL_LITE",
			},
			pro: {
				name: "الباقة الاحترافية (Pro)",
				credits: 150,
				envTitle: "MANUAL_PAYMENT_URL_PRO",
			},
			scale: {
				name: "الباقة المتكاملة (Scale)",
				credits: 300,
				envTitle: "MANUAL_PAYMENT_URL_SCALE",
			},
		};

		const pkg = packageConfig[packageId];
		const adminEmail = process.env.ADMIN_EMAIL || "admin@smarteka.com";
		const paymentUrl =
			process.env[pkg.envTitle] || "https://payment.smarteka.com/pay-manual";

		if (process.env.RESEND_API_KEY) {
			await resend.emails.send({
				from: "AI Law Copilot Admin <billing@smarteka.com>",
				to: adminEmail,
				subject: `🚨 New Manual Credit Request [${pkg.name}]: ${org.name}`,
				react: AdminCreditRequestEmail({
					name: userName,
					email: userEmail,
					orgName: org.name,
					currentBalance: org.creditBalance || 0,
					packageName: pkg.name,
					requestedCredits: pkg.credits,
				}) as React.ReactElement,
			});

			// 2. Notify User with Payment Link
			await resend.emails.send({
				from: "Smartek AI Hub Billing <billing@smarteka.com>",
				to: userEmail,
				subject: `تم استلام طلب شحن [${pkg.name}] - تفاصيل الدفع`,
				react: UserCreditRequestConfirmedEmail({
					name: userName,
					orgName: org.name,
					paymentUrl: paymentUrl,
					packageName: pkg.name,
					credits: pkg.credits,
				}) as React.ReactElement,
			});
		}

		const posthog = getPostHogClient();
		posthog.capture({
			distinctId: userId,
			event: "credit_topup_requested",
			properties: {
				packageId,
				packageName: pkg.name,
				credits: pkg.credits,
				organizationId: orgId,
				organizationName: org.name,
			},
		});

		return { success: true };
	} catch (error) {
		console.error("Manual topup request error:", error);
		return { error: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً." };
	}
}
