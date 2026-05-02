import { embed, embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Fallback to empty string if missing, handled safely by ai-sdk errors
const google = createGoogleGenerativeAI({
	apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
});

export async function embedSingle(text: string): Promise<number[]> {
	if (!text || text.trim() === "") {
		return Array(768).fill(0);
	}

	const { embedding } = await embed({
		model: google.textEmbeddingModel("gemini-embedding-2-preview"),
		value: text,
		// @ts-expect-error - taskType is valid for Gemini
		taskType: "RETRIEVAL_QUERY",
	});

	return embedding.slice(0, 768);
}

/**
 * Generates an embedding for a multimodal input (e.g., image + text).
 */
export async function embedMultimodal(
	text: string,
	imageBuffer?: Buffer,
	mimeType?: string,
): Promise<number[]> {
	const { embedding } = await embed({
		model: google.textEmbeddingModel("gemini-embedding-2-preview"),
		// For multimodal, we pass an array of parts if supported, 
		// otherwise we rely on the model's native multimodal ingestion.
		// @ts-expect-error - value can be multimodal in latest AI SDK + Gemini
		value: imageBuffer 
			? [
					{ type: "text", text },
					{ type: "image", image: imageBuffer, mimeType: mimeType || "image/jpeg" }
			  ]
			: text,
		taskType: "RETRIEVAL_DOCUMENT",
	});

	return embedding.slice(0, 768);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
	const BATCH_SIZE = 96;
	const allEmbeddings: number[][] = [];

	for (let i = 0; i < texts.length; i += BATCH_SIZE) {
		const batch = texts.slice(i, i + BATCH_SIZE);

		const { embeddings } = await embedMany({
			model: google.textEmbeddingModel("gemini-embedding-2-preview"),
			values: batch,
			// @ts-expect-error - taskType is specific to Google embeddings
			taskType: "RETRIEVAL_DOCUMENT",
		});

		// Enforce Matryoshka truncation manually (sometimes outputDimensionality flag is ignored in preview API)
		const truncatedEmbeddings = embeddings.map((e) => e.slice(0, 768));
		allEmbeddings.push(...truncatedEmbeddings);

		if (i + BATCH_SIZE < texts.length) {
			// Gentle pause to avoid rate limits
			await new Promise((r) => setTimeout(r, 200));
		}
	}

	return allEmbeddings;
}
