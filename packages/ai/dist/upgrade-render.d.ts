/**
 * Mask-free, instruction-based image edit (fal-ai/flux-pro/kontext) — not
 * raw inpainting, which would need an explicit mask_url this pipeline has
 * no way to generate. Takes the user's original photo + a natural-language
 * description of the upgrades to apply, returns the generated image URL.
 */
export declare function generateUpgradeRender(originalImageUrl: string, prompt: string): Promise<string>;
