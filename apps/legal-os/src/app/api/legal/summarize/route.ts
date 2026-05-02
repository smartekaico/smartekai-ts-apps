import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import { consumeCredits } from "@/lib/credits/credit-manager";
import { getActiveModel } from "@/lib/ai/model-utils";
import { buildSummarizationPrompt } from "@/lib/ai/prompts";

// Configure OpenRouter
const openrouter = createOpenAI({
	baseURL: "https://openrouter.ai/api/v1",
	apiKey: process.env.OPENROUTER_API_KEY,
});

export const runtime = "nodejs";
export const maxDuration = 180; // Extended for complex legal docs

export async function POST(req: Request) {
	try {
		const session = await getAuthenticatedSession({
			requiredRole: ["LEGAL", "ADMIN"],
		});

		const activeOrgId =
			(session.session as { activeOrganizationId?: string }).activeOrganizationId ||
			(session.user as { activeOrganizationId?: string }).activeOrganizationId;
		if (!activeOrgId) {
			return new Response("No active organization found.", { status: 403 });
		}

		const { documentText } = await req.json();
		if (!documentText || documentText.length < 10) {
			return new Response("Document text is too short for summarization.", {
				status: 400,
			});
		}

		// 1. Consume Credits using FIFO buckets
		const creditResult = await consumeCredits(activeOrgId, 1);
		if (!creditResult.success) {
			return new Response(
				creditResult.error || "رصيد المكتب غير كافٍ. (Insufficient credits)",
				{ status: 402 },
			);
		}

		// 2b. Determine active model
		const activeModelId = await getActiveModel();

		// 2. Call via OpenRouter with enhanced system prompt
		const result = streamText({
			model: openrouter.chat(activeModelId),
			system: buildSummarizationPrompt(),
			prompt: `قم بتلخيص هذا المستند القانوني بدقة:\n\n${documentText}`,
			maxOutputTokens: 8192, // High capacity for long summaries
			temperature: 0.3,
		});

		// 3. Stream the result back
		return result.toTextStreamResponse();
	} catch (error) {
		return handleRawAuthError(error);
	}
}
