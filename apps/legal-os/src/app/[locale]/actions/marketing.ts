"use server";

import type React from "react";
import { db } from "@/db";
import { demoRequests } from "@/db/schema";
import { nanoid } from "nanoid";
import { resend } from "@/lib/mail";
import { AdminAlertEmail } from "@/emails/AdminAlertEmail";

export async function submitDemoRequest(formData: FormData) {
	const name = formData.get("name") as string;
	const email = formData.get("email") as string;
	const industry = formData.get("industry") as string;
	const company = formData.get("company") as string;
	const country = (formData.get("country") as string) || "KW";

	if (!name || !email || !industry) {
		return { error: "الرجاء إكمال جميع الحقول المطلوبة." };
	}

	try {
		await db.insert(demoRequests).values({
			id: nanoid(),
			name,
			email,
			industry,
			company: company || null,
			country,
			status: "pending",
			createdAt: new Date(),
		});

		// Notify Admin via Email (Async, don't block response)
		if (process.env.RESEND_API_KEY) {
			resend.emails
				.send({
					from: "Smartek AI Hub <onboarding@smartekai.com>",
					to: "admin@smarteka.com", // Fallback for testing
					subject: `New Demo Request: ${name}`,
					react: AdminAlertEmail({
						name,
						email,
						industry,
						company,
					}) as React.ReactElement,
				})
				.catch((err) => console.error("Email notification failed:", err));
		}

		// Notify Admin via Telegram
		try {
			const { sendTelegramNotification } = await import("@/lib/telegram");
			const message = `🚨 <b>New Demo Request</b>\n\n👤 <b>Name:</b> ${name}\n📧 <b>Email:</b> ${email}\n🏢 <b>Company:</b> ${company || "N/A"}\n⚖️ <b>Industry:</b> ${industry}\n🌍 <b>Country:</b> ${country}\n\n👉 <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin">Review in Admin Hub</a>`;
			await sendTelegramNotification(message);
		} catch (telegramErr) {
			console.error("Failed to send telegram notification:", telegramErr);
		}

		return { success: true };
	} catch (error) {
		console.error("Failed to submit demo request:", error);
		return { error: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً." };
	}
}

/**
 * Validates a platform invitation token
 */
export async function validateInviteToken(token: string) {
	if (!token) return { valid: false, error: "كود الدعوة مطلوب." };

	try {
		const invite = await db.query.platformInvites.findFirst({
			where: (invites, { eq, and }) =>
				and(eq(invites.token, token), eq(invites.status, "unused")),
		});

		if (!invite) {
			return {
				valid: false,
				error: "كود الدعوة غير صالح أو تم استخدامه مسبقاً.",
			};
		}

		// Check expiration (if expiresAt exists)
		if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
			return { valid: false, error: "كود الدعوة هذا قد انتهت صلاحيته." };
		}

		return {
			valid: true,
			token: invite.token,
			industryRole: invite.industryRole,
			email: invite.email,
		};
	} catch (error) {
		console.error("Error validating invite token:", error);
		return { valid: false, error: "حدث خطأ أثناء التحقق من الكود." };
	}
}
