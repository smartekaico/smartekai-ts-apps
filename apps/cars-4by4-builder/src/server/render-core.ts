import { generateUpgradeRender } from "@smartekai/ai";
import { BUCKETS, uploadObject } from "@smartekai/storage";
import { buildRenderPrompt } from "../lib/prompt";
import { originalImageUrl } from "./images";

/** Renders and stores the image; returns its key in cars-renders. No DB access. */
export async function renderUpgrade(input: {
  buildId: string;
  originalImageKey: string;
  vehicleDesc: string;
  snippets: string[];
}): Promise<string> {
  const prompt = buildRenderPrompt(input.vehicleDesc, input.snippets);
  const generated = await generateUpgradeRender(await originalImageUrl(input.originalImageKey), prompt);
  const extension = generated.mediaType.split("/")[1] || "png";
  const renderKey = `renders/${input.buildId}.${extension}`;
  await uploadObject(BUCKETS.renders, renderKey, Buffer.from(generated.data), generated.mediaType);
  return renderKey;
}
