import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import { consumeCredits } from "@/lib/credits/credit-manager";
import { buildFormatTextPrompt } from "@/lib/ai/prompts";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Using Gemini 1.5 Flash for high-speed legal formatting
const google = createGoogleGenerativeAI({
	apiKey: apiKey || "",
});

export const runtime = "nodejs";
export const maxDuration = 180; // Extended for large document chunking

export async function POST(req: Request) {
	try {
		const session = await getAuthenticatedSession({
			requiredRole: ["LEGAL", "ADMIN"],
		});
		const orgId = session.user.activeOrganizationId;

		if (!orgId) {
			return new Response("No active organization found", { status: 400 });
		}

		if (!apiKey) {
			console.error("Critical Error: Missing GEMINI_API_KEY or GOOGLE_API_KEY");
			return new Response("AI configuration error", { status: 500 });
		}

		const { text } = await req.json();

		if (!text || text.length < 50) {
			return new Response("Text too short to reformat.", { status: 400 });
		}

		// Chunked processing for very large documents
		const CHUNK_SIZE = 15000;
		const textChunks: string[] = [];
		for (let i = 0; i < text.length; i += CHUNK_SIZE) {
			textChunks.push(text.slice(i, i + CHUNK_SIZE));
		}

		console.log(
			`Processing ${textChunks.length} chunks for smart extraction via Gemini...`,
		);

		const formattedChunks = await Promise.all(
			textChunks.map(async (chunk, i) => {
				try {
					const result = await generateText({
						model: google.chat("gemini-2.5-flash"),
						system: buildFormatTextPrompt(i),
						prompt: chunk,
						temperature: 0.1,
					});
					return result.text;
				} catch (chunkError) {
					console.error(`Error formatting chunk ${i}:`, chunkError);
					throw chunkError;
				}
			}),
		);

		const finalResult = formattedChunks.join("\n\n---\n\n");

		// ONLY consume credit after successful AI generation and processing
		const creditResult = await consumeCredits(orgId, 1);
		if (!creditResult.success) {
			console.warn(
				"Post-formatting credit consumption failed:",
				creditResult.error,
			);
		}

		return Response.json({ text: finalResult });
	} catch (error) {
		console.error("Format-text API error:", error);
		if (error instanceof Error && error.name === "AbortError") {
			return new Response("Request aborted by user", { status: 499 });
		}
		return handleRawAuthError(error);
	}
}
