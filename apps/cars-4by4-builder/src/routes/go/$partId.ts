import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { getDbCars, outboundClicks, parts } from "@smartekai/db/cars";

export const Route = createFileRoute("/go/$partId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const db = getDbCars();
        const part = (
          await db.select({ affiliateUrl: parts.affiliateUrl }).from(parts).where(eq(parts.id, params.partId))
        ).at(0);
        const target = part?.affiliateUrl;
        if (!target) return new Response("Not found", { status: 404 });

        const buildId = new URL(request.url).searchParams.get("build");
        await db.insert(outboundClicks).values({
          id: crypto.randomUUID(),
          partId: params.partId,
          buildId: buildId ? buildId.slice(0, 64) : null,
        });
        return Response.redirect(target, 302);
      },
    },
  },
});
