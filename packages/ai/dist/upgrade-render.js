"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUpgradeRender = generateUpgradeRender;
exports.generateStudioImage = generateStudioImage;
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
const google = (0, google_1.createGoogleGenerativeAI)({
    apiKey: process.env.GOOGLE_AI_API_KEY,
});
const IMAGE_MODEL_NAME = process.env.GOOGLE_AI_IMAGE_MODEL || "gemini-3.1-flash-image";
function imageModel() {
    return google(IMAGE_MODEL_NAME.startsWith("models/") ? IMAGE_MODEL_NAME : `models/${IMAGE_MODEL_NAME}`);
}
function pickImage(result) {
    const image = result.files.find((file) => file.mediaType.startsWith("image/"));
    if (!image)
        throw new Error("Gemini did not return an image in the response");
    return { data: image.uint8Array, mediaType: image.mediaType };
}
/**
 * Mask-free, instruction-based image edit via Gemini 3.1 Flash Image
 * ("Nano Banana 2") — same mask-free shape the Fal.ai flux-pro/kontext call
 * had, now consolidated onto the same Gemini provider detectVehicle already
 * uses (one API key, no separate billing account). Takes the user's
 * original photo + a natural-language description of the upgrades to
 * apply, returns the generated image bytes directly (no second URL fetch
 * needed, unlike Fal.ai's response-then-download shape).
 */
async function generateUpgradeRender(originalImageUrl, prompt) {
    const result = await (0, ai_1.generateText)({
        model: imageModel(),
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
    return pickImage(result);
}
/**
 * Text-to-image "studio shot" via the same Gemini image model. Mints a
 * rights-clean base photo for the curated gallery when no licensed photo of a
 * vehicle exists yet (spec §7.3 allows AI-generated studio shots).
 */
async function generateStudioImage(prompt) {
    const result = await (0, ai_1.generateText)({
        model: imageModel(),
        providerOptions: {
            google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        prompt,
    });
    return pickImage(result);
}
