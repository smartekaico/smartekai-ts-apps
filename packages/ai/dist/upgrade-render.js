"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUpgradeRender = generateUpgradeRender;
const client_1 = require("@fal-ai/client");
client_1.fal.config({ credentials: process.env.FAL_KEY });
/**
 * Mask-free, instruction-based image edit (fal-ai/flux-pro/kontext) — not
 * raw inpainting, which would need an explicit mask_url this pipeline has
 * no way to generate. Takes the user's original photo + a natural-language
 * description of the upgrades to apply, returns the generated image URL.
 */
async function generateUpgradeRender(originalImageUrl, prompt) {
    const result = await client_1.fal.subscribe("fal-ai/flux-pro/kontext", {
        input: { prompt, image_url: originalImageUrl },
        logs: false,
    });
    return result.data.images[0].url;
}
