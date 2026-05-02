import { type NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { retrieveChunks, buildContextBlock } from "@/lib/kb/retrieve";
import { db } from "@/db";
import { auditLogs, organizations } from "@/db/schema";
import { nanoid } from "nanoid";
import {
	consumeCredits,
	calculateWeightedCredits,
} from "@/lib/credits/credit-manager";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import { buildLegalDraftPrompt } from "@/lib/ai/prompts";
import { getModelForProduct } from "@/lib/ai/model-utils";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60; // Standardized per AGENTS.md

const TYPE_TRANSLATIONS: Record<string, string> = {
	statement_of_claim: "صحيفة دعوى",
	defense_memo: "مذكرة دفاع",
	official_warning: "إنذار رسمي",
};

const CASE_CATEGORY_MAP: Record<string, string> = {
	civil: "مدني — القانون المدني 67/1980",
	commercial: "تجاري — القانون التجاري 68/1980",
	labor: "عمالي — قانون العمل 6/2010",
	personal_status: "أحوال شخصية — قانون الأحوال الشخصية 51/1984",
	real_estate: "عقاري — قانون التسجيل العقاري 17/2012",
	traffic: "مرور — قانون المرور 12/2014",
	penal_persons: "جنح ضد الأشخاص — قانون الجزاء 16/1960",
	bounced_checks: "شيكات بدون رصيد — قانون الشيكات",
	cybercrime: "جرائم إلكترونية — قانون مكافحة الجرائم الإلكترونية 63/2015",
	narcotics: "مخدرات — المرسوم بقانون 159/2025",
	penal_property_trust: "إتلاف ممتلكات وخيانة أمانة — قانون الجزاء 16/1960",
	other: "عام",
};

const draftPayloadSchema = z.object({
	pleadingType: z.string().min(1),
	caseCategory: z.string().min(1),
	plaintiff: z.string().optional(),
	defendant: z.string().optional(),
	facts: z.string().min(10, "الوقائع قصيرة جداً"),
	caseId: z.string().optional(),
});

export async function POST(req: NextRequest) {
	try {
		const session = await getAuthenticatedSession({
			requiredRole: ["LEGAL", "ADMIN"],
		});
		const headerList = await headers();
		const locale = headerList.get("x-user-locale") || "ar";

		const userId = session.user.id;
		let body: Record<string, unknown>;
		try {
			body = await req.json();
		} catch (e) {
			return NextResponse.json(
				{ error: "Invalid JSON payload" },
				{ status: 400 },
			);
		}

		// Robust parsing for 'prompt' if it's a string from older clients
		let rawPayload = body;
		if (typeof body.prompt === "string") {
			try {
				rawPayload = JSON.parse(body.prompt);
			} catch (e) {
				rawPayload = body; // Fallback
			}
		} else if (body.prompt && typeof body.prompt === "object") {
			rawPayload = body.prompt as Record<string, unknown>;
		}

		// 1. Validate Payload with Zod
		const validation = draftPayloadSchema.safeParse(rawPayload);
		if (!validation.success) {
			return NextResponse.json(
				{
					error:
						locale === "ar"
							? "بيانات المدخلات غير صالحة."
							: "Invalid input data.",
					details: validation.error.format(),
				},
				{ status: 400 },
			);
		}
		const payload = validation.data;

		const {
			pleadingType,
			caseCategory,
			plaintiff,
			defendant,
			facts: rawFacts,
			caseId,
		} = payload;

		const activeOrgId =
			(session.session as { activeOrganizationId?: string }).activeOrganizationId ||
			(session.user as { activeOrganizationId?: string }).activeOrganizationId;
		if (!activeOrgId) {
			return NextResponse.json(
				{ error: "No active organization found" },
				{ status: 403 },
			);
		}

		// Fetch Organization for Jurisdiction context
		const [org] = await db
			.select({ defaultJurisdiction: organizations.defaultJurisdiction })
			.from(organizations)
			.where(eq(organizations.id, activeOrgId))
			.limit(1);

		// 1. Calculate Weighted Credits (based on input complexity)
		const { cost, processedText: facts } = calculateWeightedCredits(rawFacts);

		// 2. Consume Credits BEFORE AI call
		const creditResult = await consumeCredits(activeOrgId, cost);
		if (!creditResult.success) {
			return NextResponse.json(
				{
					error:
						creditResult.error ||
						(locale === "ar" ? "نقاط غير كافية." : "Insufficient credits."),
					code: "INSUFFICIENT_CREDITS",
				},
				{ status: 402 },
			);
		}

		const docTypeLabel =
			TYPE_TRANSLATIONS[pleadingType] ||
			(locale === "ar" ? "مذكرة قانونية" : "Legal Memorandum");
		const caseTypeLabel =
			CASE_CATEGORY_MAP[caseCategory] ||
			(locale === "ar" ? "قضية عامة" : "General Case");

		// 3. Perform Knowledge Base Retrieval (RAG)
		const query = `${docTypeLabel} ${caseTypeLabel} ${facts.substring(0, 512)}`;
		const chunks = await retrieveChunks(query, {
			topK: 6,
			category: caseCategory,
			jurisdiction: org?.defaultJurisdiction || "kuwait",
		});
		const context = buildContextBlock(chunks);

		// 4. Get Dynamic Model Instance
		const model = await getModelForProduct("legal-assistant-os");

		// 5. Build System Prompt and Stream Response
		const stream = await streamText({
			model,
			maxOutputTokens: 8192,
			temperature: 0.1, // Lower temperature for legal precision
			messages: [
				{
					role: "system",
					content: buildLegalDraftPrompt({
						docTypeLabel,
						caseTypeLabel,
						plaintiff: plaintiff || "",
						defendant: defendant || "",
						facts,
						context,
						jurisdiction:
							org?.defaultJurisdiction === "kuwait"
								? "دولة الكويت"
								: org?.defaultJurisdiction || "الكويت",
						locale,
					}),
				},
				{
					role: "user",
					content:
						locale === "ar"
							? `أرجو البدء في صياغة ${docTypeLabel} لتصنيف (${caseTypeLabel}) فوراً وبدقة عالية.`
							: `Please start drafting the ${docTypeLabel} for the (${caseTypeLabel}) category now with high precision.`,
				},
			],
		});

		// 6. Async Audit Log (Non-blocking)
		const logId = nanoid();
		db.insert(auditLogs)
			.values({
				id: logId,
				userId: userId,
				organizationId: activeOrgId,
				action: "LEGAL_DRAFTING",
				details: JSON.stringify({
					status: "success",
					caseId,
					pleadingType,
					caseCategory,
					factsLength: facts.length,
					cost,
					modelId: "gemini-2.5-flash",
				}),
				creditsSpent: cost,
			})
			.execute()
			.catch((err) => console.error("Audit log error:", err));

		return stream.toTextStreamResponse();
	} catch (error) {
		console.error("Legal Drafting Error:", error);
		return handleRawAuthError(error);
	}
}
