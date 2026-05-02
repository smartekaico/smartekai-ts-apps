"use server";

import { auth } from "@/lib/auth";
import { resend } from "@/lib/mail";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { headers } from "next/headers";

/**
 * Submits a support request via Resend.
 * Sets the 'replyTo' header to the user's account email.
 */
export async function submitSupportRequest(formData: {
	name: string;
	type: string;
	product: string;
	message: string;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw new Error("يجب تسجيل الدخول لإرسال طلب دعم. (Unauthorized)");
	}

	const { user } = session;

	try {
		// Note: 'from' should ideally be a verified domain in Resend.
		// If smartekai.com is not yet verified, this might need fallback to 'onboarding@resend.dev'.
		const { error } = await resend.emails.send({
			from: "Smartek AI Support <notifications@smartekai.com>",
			to: ["admin@smartekai.com"],
			replyTo: user.email,
			subject: `[${formData.type.toUpperCase()}] [${formData.product.toUpperCase()}] - ${formData.name}`,
			html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; text-align: right;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">طلب دعم جديد (New Support Ticket)</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p><strong>الاسم (Name):</strong> ${formData.name}</p>
            <p><strong>بريد الحساب المرتبط (Linked Email):</strong> <a href="mailto:${user.email}">${user.email}</a></p>
            <p><strong>نوع الطلب (Type):</strong> ${formData.type === "support" ? "دعم فني" : formData.type === "feedback" ? "ملاحظات" : "ميزة جديدة"}</p>
            <p><strong>المنتج (Product):</strong> ${formData.product.toUpperCase()}</p>
          </div>

          <p><strong>الرسالة (Message):</strong></p>
          <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 16px; white-space: pre-wrap;">
            ${formData.message.replace(/\n/g, "<br />")}
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>تعليمات الرد:</strong> يمكنك الرد مباشرة على هذا البريد الإلكتروني للتواصل مع المستخدم عبر بريده المرتبط.
            </p>
          </div>
          
          <p style="margin-top: 40px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; pt: 10px;">
            تم إرسال هذا الطلب آلياً عبر منصة Smartek AI.
          </p>
        </div>
      `,
		});

		if (error) {
			console.error("Resend delivery failed:", error);
			return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
		}

		// Log the event for administrative visibility and validation
		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			userId: user.id,
			organizationId: user.activeOrganizationId,
			action: "SUPPORT_REQUEST",
			details: `تم إرسال طلب دعم: ${formData.type} - ${formData.product}`,
			createdAt: new Date(),
		});

		return { success: true };
	} catch (err) {
		console.error("Server Action Exception:", err);
		return {
			success: false,
			error: err instanceof Error ? err.message : "فشل إرسال البريد الإلكتروني",
		};
	}
}
