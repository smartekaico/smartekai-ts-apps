import { createFileRoute } from "@tanstack/react-router";
import { BUCKETS, getObjectBytes } from "@smartekai/storage";

// Only generated renders are proxied; keys are `renders/<uuid>.<ext>`.
const RENDER_KEY = /^renders\/[A-Za-z0-9._-]+$/;

/**
 * Same-origin proxy for render images. The PDF fetches its image with the
 * browser CORS mode, but Neon Object Storage's CDN caches a no-CORS variant
 * under `Vary: Origin`, so a direct cross-origin fetch fails. Streaming the
 * bytes through our own origin sidesteps CORS entirely.
 */
export const Route = createFileRoute("/api/render")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = new URL(request.url).searchParams.get("key") ?? "";
        if (!RENDER_KEY.test(key)) return new Response("Not found", { status: 404 });
        try {
          const { bytes, contentType } = await getObjectBytes(BUCKETS.renders, key);
          return new Response(bytes, {
            headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
