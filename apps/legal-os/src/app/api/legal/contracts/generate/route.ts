import { type NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { db } from "@/db";
import { auditLogs, organizations } from "@/db/schema";
import { nanoid } from "nanoid";
import { consumeCredits } from "@/lib/credits/credit-manager";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import { getModelForProduct } from "@/lib/ai/model-utils";
import { buildContractGenerationPrompt } from "@/lib/ai/prompts";
import { retrieveChunks, buildContextBlock } from "@/lib/kb/retrieve";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export const maxDuration = 60;
export const runtime = "nodejs";

import { z } from "zod";

const contractPayloadSchema = z.object({
	contractType: z.string().min(2, "نوع العقد مطلوب"),
	subject: z.string().min(1, "موضوع العقد مطلوب"),
	parties: z.any().optional(),
	clauses: z.string().optional(),
	additionalNotes: z.string().optional(),
	jurisdiction: z.string().optional(),
});

export async function POST(req: NextRequest) {
	try {
		const session = await getAuthenticatedSession({
			requiredRole: ["LEGAL", "ADMIN"],
		});
		const headerList = await headers();
		const locale = headerList.get("x-user-locale") || "ar";

		let body: Record<string, unknown>;
		try {
			body = await req.json();
		} catch (e) {
			return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
		}

		// Handle 'prompt' as string or object
		let rawPayload: any = body;
		if (typeof body.prompt === "string") {
			try {
				rawPayload = JSON.parse(body.prompt);
			} catch (e) {
				rawPayload = body;
			}
		} else if (body.prompt && typeof body.prompt === "object") {
			rawPayload = body.prompt;
		}

		// 1. Validate Payload with Zod
		const validation = contractPayloadSchema.safeParse(rawPayload);
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

		const activeOrgId =
			(session.session as { activeOrganizationId?: string }).activeOrganizationId ||
			(session.user as { activeOrganizationId?: string }).activeOrganizationId;
		if (!activeOrgId) {
			return NextResponse.json(
				{ error: "No active organization found." },
				{ status: 403 },
			);
		}

		// Fetch Organization for Jurisdiction context
		const [org] = await db
			.select({ defaultJurisdiction: organizations.defaultJurisdiction })
			.from(organizations)
			.where(eq(organizations.id, activeOrgId))
			.limit(1);

		const jurisdiction =
			payload.jurisdiction || org?.defaultJurisdiction || "kuwait";

		// 2. Check & Consume Credits (Contract generation costs 2 points)
		const creditResult = await consumeCredits(activeOrgId, 2);
		if (!creditResult.success) {
			return NextResponse.json(
				{
					error:
						locale === "ar"
							? "رصيد المكتب غير كافٍ (نقطتان مطلوبتان)."
							: "Insufficient credits (2 required).",
					code: "INSUFFICIENT_CREDITS",
				},
				{ status: 402 },
			);
		}

		// 3. Optimized RAG for contract templates/clauses
		// Construct a rich query for better embedding match
		const ragQuery = `نموذج عقد ${payload.contractType} موضوعه ${payload.subject} في ${jurisdiction}`;
		const chunks = await retrieveChunks(ragQuery, {
			topK: 5,
			category: "contract",
			jurisdiction: jurisdiction,
		});
		const context = buildContextBlock(chunks);

		// 4. Get Dynamic Model instance
		const model = await getModelForProduct("contract-generator");

		// 5. Stream AI Generation
		const stream = await streamText({
			model,
			maxOutputTokens: 8192,
			temperature: 0.2, // Low temperature for consistency
			messages: [
				{
					role: "system",
					content: buildContractGenerationPrompt({
						payload,
						context,
						jurisdiction:
							jurisdiction === "kuwait" ? "دولة الكويت" : jurisdiction,
						locale,
					}),
				},
				{
					role: "user",
					content:
						locale === "ar"
							? `قم بصياغة عقد (${payload.contractType}) كامل ومفصل بناءً على المعطيات والسياق المسترجع.`
							: `Draft a full and detailed (${payload.contractType}) contract based on the provided inputs and context.`,
				},
			],
		});

		// 6. Audit Log (Non-blocking)
		const logId = nanoid();
		db.insert(auditLogs)
			.values({
				id: logId,
				userId: session.user.id,
				organizationId: activeOrgId,
				action: "CONTRACT_GENERATION",
				details: JSON.stringify({
					status: "success",
					contractType: payload.contractType,
					subject: payload.subject,
					modelId: "gemini-2.5-flash",
				}),
				creditsSpent: 2,
			})
			.execute()
			.catch((err) => console.error("Audit log error:", err));

		return stream.toTextStreamResponse();
	} catch (error) {
		console.error("Contract Generation Error:", error);
		return handleRawAuthError(error);
	}
}
