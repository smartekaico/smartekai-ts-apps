import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { builds, getDbCars } from "@smartekai/db/cars";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin;
        const curated = await getDbCars()
          .select({ slug: builds.slug })
          .from(builds)
          .where(and(eq(builds.isCurated, true), eq(builds.status, "completed")));
        const urls = [`${origin}/`, ...curated.flatMap((b) => (b.slug ? [`${origin}/builds/${b.slug}`] : []))];
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
          "</urlset>",
          "",
        ].join("\n");
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
