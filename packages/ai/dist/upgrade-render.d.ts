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
export declare function generateUpgradeRender(originalImageUrl: string, prompt: string): Promise<GeneratedImage>;
/**
 * Text-to-image "studio shot" via the same Gemini image model. Mints a
 * rights-clean base photo for the curated gallery when no licensed photo of a
 * vehicle exists yet (spec §7.3 allows AI-generated studio shots).
 */
export declare function generateStudioImage(prompt: string): Promise<GeneratedImage>;
