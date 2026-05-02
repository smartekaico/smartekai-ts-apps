import { db } from "@/db";
import { products, models } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";

type ProviderMap = {
	OpenRouter: OpenAIProvider;
	Groq: OpenAIProvider;
	Together: OpenAIProvider;
	OpenAI: OpenAIProvider;
	Google: GoogleGenerativeAIProvider;
};

export const providers: ProviderMap = {
	OpenRouter: createOpenAI({
		apiKey: process.env.OPENROUTER_API_KEY,
		baseURL: "https://openrouter.ai/api/v1",
	}),
	Groq: createOpenAI({
		apiKey: process.env.GROQ_API_KEY,
		baseURL: "https://api.groq.com/openai/v1",
	}),
	Together: createOpenAI({
		apiKey: process.env.TOGETHER_API_KEY,
		baseURL: "https://api.together.xyz/v1",
	}),
	OpenAI: createOpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	}),
	Google: createGoogleGenerativeAI({
		apiKey: process.env.GEMINI_API_KEY,
	}),
};

/**
 * Returns a configured model instance based on the product's active configuration.
 * Automatically selects the correct provider (Groq, Together, etc.) from the DB.
 */
export async function getModelForProduct(productId = "legal-assistant-os") {
	try {
		const [platformProduct] = await db
			.select({ activeLlmModelId: products.activeLlmModelId })
			.from(products)
			.where(eq(products.id, productId))
			.limit(1);

		// Default fallback to Gemini 2.0 Flash for superior legal reasoning and speed
		const activeModelId =
			platformProduct?.activeLlmModelId || "gemini-2.5-flash";

		// Fetch provider details for this model
		const [modelDetails] = await db
			.select()
			.from(models)
			.where(eq(models.id, activeModelId))
			.limit(1);

		const providerName = modelDetails?.provider || "Google";
		const provider =
			(providers as Record<string, unknown>)[providerName] || providers.Google;

		return providers.Google.chat(activeModelId);
	} catch (error) {
		console.error(`Error configuring model for ${productId}:`, error);
		return providers.Google.chat("gemini-2.5-flash");
	}
}

/**
 * Returns a configured OpenRouter model instance (Legacy helper)
 */
export function getOpenRouterModel(modelId: string) {
	return providers.OpenRouter.chat(modelId);
}

/**
 * Fetches the currently active LLM model ID for a specific product from the database.
 */
export async function getActiveModel(
	productId = "legal-assistant-os",
): Promise<string> {
	try {
		const [platformProduct] = await db
			.select({ activeLlmModelId: products.activeLlmModelId })
			.from(products)
			.where(eq(products.id, productId))
			.limit(1);

		return platformProduct?.activeLlmModelId || "gemini-2.5-flash";
	} catch (error) {
		console.error(
			`Error fetching active model for ${productId} from DB:`,
			error,
		);
		return "gemini-2.5-flash";
	}
}
