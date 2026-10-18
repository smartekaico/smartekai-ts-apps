import handler from "@tanstack/react-start/server-entry";

// Worker entry (wrangler.jsonc `main`). TanStack's RequestHandler takes an
// optional RequestOptions second argument, so it is not assignable to Workers'
// (request, env, ctx) fetch handler directly — a thin wrapper is needed. env and
// ctx are reached through `cloudflare:workers` where they're wanted (see
// src/server/render-queue.ts); the app reads process.env, which nodejs_compat
// populates from wrangler vars + secrets.
// Task 4 adds the queue consumer and Task 5 the cleanup cron.
export default {
  fetch: (request: Request) => handler.fetch(request),
} satisfies ExportedHandler<Env>;
