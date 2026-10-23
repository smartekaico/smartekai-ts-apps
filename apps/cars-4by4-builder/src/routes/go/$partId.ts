import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { getDbCars, builds, outboundClicks, partVehicleLinks, parts } from "@smartekai/db/cars";
import { withSubId } from "@/lib/subid";

export const Route = createFileRoute("/go/$partId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const db = getDbCars();
        const buildId = new URL(request.url).searchParams.get("build");

        // A vehicle-specific link (shocks, lift kits, wheels, tonneau covers)
        // beats the part's default one; one query resolves both. Without a
        // build there is no vehicle, so the default link is used.
        const row = (
          await db
            .select({ defaultUrl: parts.affiliateUrl, vehicleUrl: partVehicleLinks.url })
            .from(parts)
            .leftJoin(builds, eq(builds.id, buildId ?? ""))
            .leftJoin(
              partVehicleLinks,
              and(eq(partVehicleLinks.partId, parts.id), eq(partVehicleLinks.vehicleId, builds.vehicleId)),
            )
            .where(eq(parts.id, params.partId))
        ).at(0);

        const target = row?.vehicleUrl ?? row?.defaultUrl;
        if (!target) return new Response("Not found", { status: 404 });

        await db.insert(outboundClicks).values({
          id: crypto.randomUUID(),
          partId: params.partId,
          buildId: buildId ? buildId.slice(0, 64) : null,
        });
        // Tag the outbound link with the build id so the network reports it back.
        return Response.redirect(withSubId(target, buildId), 302);
      },
    },
  },
});
