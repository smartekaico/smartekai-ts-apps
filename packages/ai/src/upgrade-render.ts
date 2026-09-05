import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

/**
 * Mask-free, instruction-based image edit (fal-ai/flux-pro/kontext) — not
 * raw inpainting, which would need an explicit mask_url this pipeline has
 * no way to generate. Takes the user's original photo + a natural-language
 * description of the upgrades to apply, returns the generated image URL.
 */
export async function generateUpgradeRender(
  originalImageUrl: string,
  prompt: string,
): Promise<string> {
  const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
    input: { prompt, image_url: originalImageUrl },
    logs: false,
  });

  return result.data.images[0].url as string;
}