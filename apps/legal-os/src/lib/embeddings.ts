import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: "https://openrouter.ai/api/v1",
});

export async function generateEmbedding(text: string): Promise<number[]> {
	try {
		const { embedding } = await embed({
			model: openrouter.embedding("openai/text-embedding-3-small"),
			value: text,
		});
		return embedding;
	} catch (error) {
		console.error("Failed to generate OpenRouter embedding:", error);
		throw new Error("Embedding generation failed.");
	}
}
