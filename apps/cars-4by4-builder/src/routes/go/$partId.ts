import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { getDbCars, outboundClicks, parts } from "@smartekai/db/cars";
import { resolveRegion } from "@/lib/region";

export const Route = createFileRoute("/go/$partId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const region = resolveRegion(
          request.headers.get("cookie") ?? undefined,
          request.headers.get("cf-ipcountry") ?? undefined,
        );
        const db = getDbCars();
        const part = (
          await db.select({ affiliateUrls: parts.affiliateUrls }).from(parts).where(eq(parts.id, params.partId))
        ).at(0);
        const target = part?.affiliateUrls[region];
        if (!target) return new Response("Not found", { status: 404 });

        const buildId = new URL(request.url).searchParams.get("build");
        await db.insert(outboundClicks).values({
          id: crypto.randomUUID(),
          partId: params.partId,
          buildId: buildId ? buildId.slice(0, 64) : null,
          region,
        });
        return Response.redirect(target, 302);
      },
    },
  },
});
