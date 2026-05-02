import { generateObject } from "ai";
import { z } from "zod";
import { providers } from "./model-utils";

/**
 * Detects the retrieval intent of a user query to optimize RAG search.
 * Identifies the most relevant document type and filters.
 */
export async function detectRetrievalIntent(query: string) {
	try {
		const { object } = await generateObject({
			model: providers.Google.chat("gemini-2.5-flash"),
			schema: z.object({
				intent: z.string().describe("Brief description of detected intent"),
				docType: z
					.enum([
						"law",
						"procedure",
						"principle",
						"precedent",
						"template",
						"all",
					])
					.describe("The most relevant document type for this query"),
				jurisdiction: z.string().nullable().default("global"),
				expandedQuery: z
					.string()
					.describe("An optimized search query in Arabic"),
			}),
			system: `
        Analyze the user's legal query and determine the best search parameters for a RAG system.
        
        - 'law': Questions about specific articles, laws, or legal provisions.
        - 'procedure': Questions about court competence, filing processes, deadlines, or how-to steps (e.g., أين أرفع دعوى، المحكمة المختصة).
        - 'principle': Questions about judicial principles or legal interpretations.
        - 'precedent': Requests for specific court cases or rulings (طعون).
        - 'template': Requests for legal document templates or contracts.
        - 'all': General or broad questions.

        CRITICAL RULE: If the user asks about WHERE to file a case (أين أرفع), WHICH court is competent (المحكمة المختصة), or HOW to proceed (كيفية الإجراء), you MUST strictly select 'procedure' as the docType. Do NOT select 'precedent' or 'all'.
        
        Always return an expanded query in professional Arabic that captures the legal essence of the user's request.
      `,
			prompt: query,
		});

		return object;
	} catch (error) {
		console.error("Intent detection failed:", error);
		return {
			intent: "fallback",
			docType: "all",
			jurisdiction: "global",
			expandedQuery: query,
		};
	}
}
