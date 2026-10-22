import handler from "@tanstack/react-start/server-entry";
import { runCleanup } from "@/server/cleanup";
import {
  comingSoon,
  comingSoonResponse,
  handleWaitlist,
  isPreviewRequest,
  previewUnlock,
} from "@/server/coming-soon";
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
  // Pre-launch gate: while COMING_SOON is "true" nothing above this line runs —
  // no route, auth endpoint, affiliate redirect or checkout is reachable, and
  // the queue/cron below stay internal. The two exceptions are the waitlist
  // signup the page posts to, and the preview cookie that lets one browser
  // through for launch QA. Flip the var to go live.
  async fetch(request: Request) {
    if (!comingSoon()) return handler.fetch(request);

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/waitlist") return handleWaitlist(request);

    const unlocked = await previewUnlock(url);
    if (unlocked) return unlocked;
    if (await isPreviewRequest(request)) return handler.fetch(request);
    return comingSoonResponse(url);
  },
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
