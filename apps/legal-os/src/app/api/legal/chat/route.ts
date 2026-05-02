import { type NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { retrieveChunks, buildContextBlock, type RetrievedChunk } from "@/lib/kb/retrieve";
import { detectRetrievalIntent } from "@/lib/ai/intent-detector";
import { db } from "@/db";
import { auditLogs, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
	consumeCredits,
	calculateWeightedCredits,
} from "@/lib/credits/credit-manager";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import { getActiveModel } from "@/lib/ai/model-utils";
import { ratelimit } from "@/lib/redis";

// Configure OpenRouter
const openrouter = createOpenAI({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: "https://openrouter.ai/api/v1",
});

export const runtime = "nodejs";
export const maxDuration = 180; // Extended for long document summaries

export async function POST(req: NextRequest) {
	try {
		const session = await getAuthenticatedSession({
			requiredRole: ["LEGAL", "ADMIN"],
		});
		let body: any;
		try {
			body = await req.json();
		} catch (e) {
			return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
		}

		const {
			messages,
			userId,
			organizationId,
			uploadedContext,
			locale = "ar",
		} = body;

		// Extract activeOrgId safely from session
		const activeOrgId =
			(session.session as { activeOrganizationId?: string })?.activeOrganizationId ||
			(session.user as { activeOrganizationId?: string })?.activeOrganizationId;

		if (!activeOrgId) {
			return NextResponse.json(
				{ error: "No active organization found" },
				{ status: 403 },
			);
		}

		// 0. Rate Limiting (Upstash Redis)
		if (ratelimit) {
			const { success, limit, reset, remaining } = await ratelimit.limit(
				`ratelimit_chat_${activeOrgId}`,
			);

			if (!success) {
				return NextResponse.json(
					{
						error: "Too many requests. Please slow down.",
						code: "RATE_LIMIT_EXCEEDED",
					},
					{
						status: 429,
						headers: {
							"X-RateLimit-Limit": limit.toString(),
							"X-RateLimit-Remaining": remaining.toString(),
							"X-RateLimit-Reset": reset.toString(),
						},
					},
				);
			}
		}

		// Process last message to get the prompt
		const lastMessage = messages[messages.length - 1];
		const userPrompt =
			lastMessage?.content ||
			(lastMessage?.parts
				? (lastMessage.parts as { text: string }[])
						.map((p) => p.text)
						.join("\n")
				: "") ||
			"";

		// 1. Calculate Weighted Credits (SOP Best Practice)
		// Chat without context is 1, with context scales based on length
		const { cost, processedText } = calculateWeightedCredits(
			uploadedContext || userPrompt,
		);

		// 2. Consume Credits
		const creditResult = await consumeCredits(activeOrgId, cost);
		if (!creditResult.success) {
			return NextResponse.json(
				{
					error: creditResult.error || "نقاط غير كافية.",
					code: "INSUFFICIENT_CREDITS",
				},
				{ status: 402 },
			);
		}

		// 3. Optional RAG (if no extracted text is provided)
		let contextBlock = uploadedContext || "";
		let chunks: RetrievedChunk[] = [];
		let detectedIntentType = "all";

		if (!uploadedContext && userPrompt) {
			try {
				// Detect intent to intelligently filter by law, procedure, etc.
				const intent = await detectRetrievalIntent(userPrompt);
				detectedIntentType = intent.docType;

				chunks = await retrieveChunks(intent.expandedQuery, {
					topK: 5,
					docType:
						intent.docType === "all" ? undefined : intent.docType,
				});

				if (chunks && chunks.length > 0) {
					contextBlock = buildContextBlock(chunks);
				}
			} catch (e) {
				console.error("Retrieval failed, continuing without RAG context", e);
			}
		}

		const { buildLexSystemPrompt } = await import("@/lib/ai/prompts");

		let orgJurisdiction = "kuwait";
		try {
			const orgRecord = await db
				.select({ defaultJurisdiction: organizations.defaultJurisdiction })
				.from(organizations)
				.where(eq(organizations.id, activeOrgId));
			if (orgRecord.length > 0) {
				orgJurisdiction = orgRecord[0].defaultJurisdiction;
			}
		} catch (e) {
			console.error("Failed to fetch org jurisdiction", e);
		}

		// Extrapolate jurisdiction names based on internal map
		const jMap: Record<string, { ar: string; en: string }> = {
			kuwait: { ar: "الكويت", en: "Kuwait" },
			egypt: { ar: "مصر", en: "Egypt" },
			ksa: { ar: "السعودية", en: "Saudi Arabia" },
			uae: { ar: "الإمارات", en: "UAE" },
			qatar: { ar: "قطر", en: "Qatar" },
			bahrain: { ar: "البحرين", en: "Bahrain" },
			oman: { ar: "عمان", en: "Oman" },
		};

		const jurisdictionNameAr = jMap[orgJurisdiction]?.ar || "الكويت";
		const jurisdictionNameEn = jMap[orgJurisdiction]?.en || "Kuwait";

		// 4. System Prompt
		const systemPrompt = buildLexSystemPrompt({
			userId: session.user.id,
			organizationId: activeOrgId,
			uploadedContext: contextBlock,
			intentType: detectedIntentType,
			jurisdictionCode: orgJurisdiction,
			jurisdictionNameAr,
			jurisdictionNameEn,
			locale,
		});

		// 5. Stream AI Response
		const activeModelId = await getActiveModel();
		const stream = await streamText({
			model: openrouter.chat(activeModelId),
			maxOutputTokens: 8192, // Boosted for long summaries
			messages: [
				{ role: "system", content: systemPrompt },
				...messages.map(
					(m: {
						role: string;
						content?: string;
						parts?: { text: string }[];
					}) => ({
						role: m.role,
						content:
							m.content ||
							(m.parts ? m.parts.map((p) => p.text).join("\n") : ""),
					}),
				),
			],
		});

		// 6. Audit Log (fire-and-forget)
		const logId = nanoid();
		db.insert(auditLogs)
			.values({
				id: logId,
				userId: session.user.id,
				organizationId: activeOrgId,
				action: "LEGAL_CHAT",
				details: JSON.stringify({
					status: "success",
					hasContext: !!uploadedContext,
					cost,
				}),
				creditsSpent: cost,
			})
			.execute()
			.catch(console.error);

		// 7. Stream with Metadata Annotations for the UI
		return stream.toUIMessageStreamResponse({
			messageMetadata: ({ part }) => {
				// Attach source metadata to the 'text-start' part so useChat populates msg.annotations
				if (part.type === "text-start" && chunks && chunks.length > 0) {
					return {
						sources: chunks.map((c) => ({
							id: c.documentId,
							title: c.docTitle,
							docType: c.docType,
							jurisdiction: c.jurisdiction,
							heading: c.headingPath,
							category: c.categoryId,
						})),
					};
				}
			},
		});
	} catch (error) {
		return handleRawAuthError(error);
	}
}
