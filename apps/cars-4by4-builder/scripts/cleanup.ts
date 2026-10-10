import { and, eq, lt } from "drizzle-orm";
import { builds, getDbCars } from "@smartekai/db/cars";
import { BUCKETS, deleteObject } from "@smartekai/storage";

const DAY = 86_400_000;

// Retention (spec §2): drafts > 24h; non-curated builds > 90 days. Curated never.
// Clicks are kept — they have no FK to builds.
async function main() {
  const db = getDbCars();
  const now = Date.now();
  const staleDrafts = await db
    .select()
    .from(builds)
    .where(and(eq(builds.status, "draft"), lt(builds.createdAt, new Date(now - DAY))));
  const expired = await db
    .select()
    .from(builds)
    .where(and(eq(builds.isCurated, false), lt(builds.createdAt, new Date(now - 90 * DAY))));

  const doomed = [...new Map([...staleDrafts, ...expired].map((b) => [b.id, b])).values()];
  for (const b of doomed) {
    if (!b.originalImageKey.startsWith("stock/")) await deleteObject(BUCKETS.uploads, b.originalImageKey);
    if (b.renderKey) await deleteObject(BUCKETS.renders, b.renderKey);
    await db.delete(builds).where(eq(builds.id, b.id));
  }
  console.log(`cleanup: removed ${doomed.length} builds`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
