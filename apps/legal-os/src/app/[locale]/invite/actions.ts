"use server";

import { db } from "@/db";
import { users, platformInvites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";

export async function registerWithInviteAction(formData: FormData) {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const name = formData.get("name") as string;
	const token = formData.get("token") as string;

	if (!email || !password || !name || !token) {
		return { error: "جميع الحقول مطلوبة" };
	}

	// 1. Re-validate Token
	const invite = await db.query.platformInvites.findFirst({
		where: eq(platformInvites.token, token),
	});

	if (!invite || invite.status !== "unused") {
		return { error: "كود الدعوة غير صالح أو منتهي" };
	}

	try {
		const customHeaders = await headers();
		const requestHeaders = new Headers(customHeaders);
		requestHeaders.set(
			"x-internal-signup-secret",
			process.env.BETTER_AUTH_SECRET || "fallback",
		);

		const res = await auth.api.signUpEmail({
			body: {
				name,
				email,
				password,
				industryRole: invite.industryRole,
				creditBalance: invite.initialCredits,
				firmName: "",
				subscriptionTier: "free",
				activeOrganizationId: "",
			},
			headers: requestHeaders,
		});

		await db
			.update(platformInvites)
			.set({ status: "used" })
			.where(eq(platformInvites.id, invite.id));

		// 3. Notify via Telegram
		try {
			const { sendTelegramNotification } = await import("@/lib/telegram");
			const message = `🚀 <b>New User Registered</b>\n\n👤 <b>Name:</b> ${name}\n📧 <b>Email:</b> ${email}\n⚖️ <b>Industry:</b> ${invite.industryRole}\n🎫 <b>Via:</b> Invite Token (${token})`;
			await sendTelegramNotification(message);
		} catch (telegramErr) {
			console.error("Failed to send telegram notification:", telegramErr);
		}

		return { success: true };
	} catch (error) {
		console.error("Registration error:", error);
		if ((error as { status?: number }).status === 409 || (error instanceof Error && error.message?.includes("already exists"))) {
			return { error: "البريد الإلكتروني مسجل مسبقاً" };
		}
		return { error: "حدث خطأ أثناء إنشاء الحساب" };
	}
}
