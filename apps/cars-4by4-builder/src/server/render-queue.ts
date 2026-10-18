import { env } from "cloudflare:workers";

export type RenderMessage = { buildId: string };

/** Spec 4 §3: the queue consumer in src/server.ts runs runGeneration. */
export async function enqueueRender(buildId: string): Promise<void> {
  await env.RENDER_QUEUE.send({ buildId } satisfies RenderMessage);
}
