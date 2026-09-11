import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

const IMAGE_MODEL_NAME = process.env.GOOGLE_AI_IMAGE_MODEL || "gemini-3.1-flash-image";

export type GeneratedImage = {
  data: Uint8Array;
  mediaType: string;
};

/**
 * Mask-free, instruction-based image edit via Gemini 3.1 Flash Image
 * ("Nano Banana 2") — same mask-free shape the Fal.ai flux-pro/kontext call
 * had, now consolidated onto the same Gemini provider detectVehicle already
 * uses (one API key, no separate billing account). Takes the user's
 * original photo + a natural-language description of the upgrades to
 * apply, returns the generated image bytes directly (no second URL fetch
 * needed, unlike Fal.ai's response-then-download shape).
 */
export async function generateUpgradeRender(
  originalImageUrl: string,
  prompt: string,
): Promise<GeneratedImage> {
  const model = google(
    IMAGE_MODEL_NAME.startsWith("models/") ? IMAGE_MODEL_NAME : `models/${IMAGE_MODEL_NAME}`,
  );

  const result = await generateText({
    model,
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          // Same "image" content-block shape detectVehicle already uses
          // successfully against remote URLs — the cookbook's "file" +
          // URL shape failed to fetch in practice (see plan notes).
          { type: "image", image: originalImageUrl },
        ],
      },
    ],
  });

  const image = result.files.find((f) => f.mediaType.startsWith("image/"));
  if (!image) {
    throw new Error("Gemini did not return an image in the response");
  }

  return { data: image.uint8Array, mediaType: image.mediaType };
}
