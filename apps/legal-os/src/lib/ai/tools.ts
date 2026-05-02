// @ts-nocheck
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { appointments, users, organizations } from "@/db/schema";
import { retrieveChunks, buildContextBlock } from "@/lib/kb/retrieve";
import { eq } from "drizzle-orm";

export const aiTools = {
	searchKnowledgeBase: tool({
		description:
			"Search the Legal Knowledge Base (laws and case precedents) for relevant information. Use this whenever asked about specific laws or legal research. Supports searching both standard laws and the firm's private legal library. Ensure you pass the correct jurisdiction (country) provided in your operational context.",
		parameters: z.object({
			query: z
				.string()
				.describe(
					"The legal question or topic to search for in Arabic or English",
				),
			organizationId: z
				.string()
				.describe("The ID of the organization to filter documents for"),
			jurisdiction: z
				.string()
				.describe(
					"The jurisdiction (country) code to filter laws for (e.g., 'kuwait')",
				),
		}),
		execute: async ({
			query,
			organizationId,
			jurisdiction,
		}: { query: string; organizationId: string; jurisdiction: string }) => {
			try {
				const chunks = await retrieveChunks(query, {
					organizationId,
					jurisdiction: jurisdiction || "global",
					topK: 10,
					useHybrid: true,
				});

				if (chunks.length === 0) {
					return `لا توجد نتائج مطابقة في قاعدة المعرفة لـ (${jurisdiction}). (No matching results found in your legal library or the platform knowledge base for this jurisdiction).`;
				}

				return buildContextBlock(chunks);
			} catch (error) {
				console.error("Tool Error - searchKnowledgeBase:", error);
				return "حدث خطأ أثناء البحث في قاعدة المعرفة.";
			}
		},
	}),

	addAppointment: tool({
		description: "Schedule a hearing or appointment in the lawyer's calendar.",
		parameters: z.object({
			userId: z.string().describe("The user ID of the lawyer"),
			title: z.string().describe("The title or description of the appointment"),
			appointmentDate: z
				.string()
				.describe("The date and time of the appointment in ISO 8601 format"),
		}),
		execute: async ({
			userId,
			title,
			appointmentDate,
		}: { userId: string; title: string; appointmentDate: string }) => {
			try {
				const date = new Date(appointmentDate);
				const reminderDate = new Date(date);
				reminderDate.setDate(date.getDate() - 2); // 48 hours prior

				await db.insert(appointments).values({
					id: crypto.randomUUID(),
					userId,
					title,
					appointmentDate: date,
					reminderDate,
					status: "upcoming",
				});

				return `تمت إضافة الموعد: ${title} بتاريخ ${date.toLocaleDateString("ar")} (Appointment added).`;
			} catch (error) {
				return "فشل في إضافة الموعد.";
			}
		},
	}),

	manageAppointments: tool({
		description: "Retrieve a summary of upcoming appointments for the user.",
		parameters: z.object({
			userId: z.string().describe("The user ID of the lawyer"),
		}),
		execute: async ({ userId }: { userId: string }) => {
			try {
				const upcoming = await db
					.select()
					.from(appointments)
					.where(eq(appointments.userId, userId))
					.limit(5);

				if (upcoming.length === 0) return "لا توجد مواعيد قادمة.";
				return upcoming
					.map(
						(a) =>
							`- ${a.title} في ${a.appointmentDate.toLocaleDateString("ar")}`,
					)
					.join("\n");
			} catch (error) {
				return "فشل في جلب المواعيد.";
			}
		},
	}),

	checkCreditBalance: tool({
		description:
			"Check if the organization has enough credits before performing a heavy task like generating a full legal memo or contract.",
		parameters: z.object({
			organizationId: z
				.string()
				.describe("The ID of the organization to check balance for"),
			requiredCredits: z
				.number()
				.describe("The number of credits required for the action"),
		}),
		execute: async ({
			organizationId,
			requiredCredits,
		}: { organizationId: string; requiredCredits: number }) => {
			try {
				const org = await db
					.select({ creditBalance: organizations.creditBalance })
					.from(organizations)
					.where(eq(organizations.id, organizationId))
					.limit(1);
				if (org.length === 0)
					return { allowed: false, reason: "المؤسسة غير موجودة." };

				const hasEnough = org[0].creditBalance >= requiredCredits;
				return {
					allowed: hasEnough,
					balance: org[0].creditBalance,
					message: hasEnough
						? "الرصيد كافٍ للعملية."
						: "الرصيد غير كافٍ. يرجى شحن الرصيد.",
				};
			} catch (error) {
				return { allowed: false, reason: "فشل في التحقق من الرصيد." };
			}
		},
	}),

	updateDraftDocument: tool({
		description:
			"Update the live Legal Memorandum document working draft that the user sees on their screen. Use this when you have gathered enough information to write the formal analysis.",
		parameters: z.object({
			documentText: z
				.string()
				.describe("The full Markdown formatted text of the legal memorandum."),
		}),
		execute: async ({ documentText }: { documentText: string }) => {
			// Return a confirmation message. The actual UI update happens organically via the client intercepting this tool call.
			return "تم تحديث المسودة بنجاح على شاشة المحامي.";
		},
	}),
};
