import handler from "@tanstack/react-start/server-entry";
import { runCleanup } from "@/server/cleanup";
import { runGeneration } from "@/server/generate";
import type { RenderMessage } from "@/server/render-queue";

// Worker entry (wrangler.jsonc `main`). TanStack's RequestHandler takes an
// optional RequestOptions second argument, so it is not assignable to Workers'
// (request, env, ctx) fetch handler directly — a thin wrapper is needed. env and
// ctx are reached through `cloudflare:workers` where they're wanted (see
// src/server/render-queue.ts); the app reads process.env, which nodejs_compat
// populates from wrangler vars + secrets.
// Task 5 adds the cleanup cron.
export default {
  fetch: (request: Request) => handler.fetch(request),
  // max_retries 0 (wrangler.jsonc): runGeneration never rejects and already
  // fails + refunds; a retry would re-bill Gemini.
  async queue(batch: MessageBatch<unknown>) {
    for (const msg of batch.messages) {
      const body = msg.body as Partial<RenderMessage> | null;
      if (body && typeof body.buildId === "string") await runGeneration(body.buildId);
      else console.error(`[queue] malformed message ${msg.id}`);
      msg.ack();
    }
  },
  // Caps keep a run under the Free plan's 50 subrequests: 1 + 5 refunds + 2 reads + 8×3 deletes + 2 ≈ 34.
  async scheduled(_controller: ScheduledController, _env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCleanup({ stuck: 5, builds: 8 }));
  },
} satisfies ExportedHandler<Env>;
