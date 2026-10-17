import { and, eq, lt, notExists } from "drizzle-orm";
import { builds, carsUsers, getDbCars } from "@smartekai/db/cars";
import { BUCKETS, deleteObject } from "@smartekai/storage";
import { refundFailedBuild } from "../src/server/credits";
import { STALE_PROCESSING_MS, TIMED_OUT_MESSAGE } from "../src/server/generate";

const DAY = 86_400_000;

// Retention (Spec 2 §5): drafts > 24h; non-curated builds > 90 days unless an
// account (non-anonymous user) owns them. Curated never. Guests older than 30
// days with no builds left are deleted (sessions cascade).
// Clicks are kept — they have no FK to builds.
async function main() {
  const db = getDbCars();
  const now = Date.now();

  // Spec 3 §3: renders stuck in `processing` (server restarted mid-render) fail
  // and are refunded, even if nobody reopens the build page. Status-guarded, so a
  // build that completes meanwhile is left alone; refundFailedBuild is exactly-once.
  const timedOut = await db
    .update(builds)
    .set({ status: "failed", errorMessage: TIMED_OUT_MESSAGE, updatedAt: new Date() })
    .where(and(eq(builds.status, "processing"), lt(builds.updatedAt, new Date(now - STALE_PROCESSING_MS))))
    .returning({ id: builds.id });
  for (const b of timedOut) await refundFailedBuild(b.id);
  console.log(`cleanup: timed out and refunded ${timedOut.length} stuck renders`);

  const staleDrafts = await db
    .select()
    .from(builds)
    .where(and(eq(builds.status, "draft"), lt(builds.createdAt, new Date(now - DAY))));
  const old = await db
    .select({ build: builds, userId: carsUsers.id, isAnonymous: carsUsers.isAnonymous })
    .from(builds)
    .leftJoin(carsUsers, eq(carsUsers.id, builds.userId))
    .where(and(eq(builds.isCurated, false), lt(builds.createdAt, new Date(now - 90 * DAY))));
  // Keep only builds owned by an existing user that is not a guest. No user row
  // (userId null) = unowned, isAnonymous true = guest: both expire. A NULL
  // is_anonymous on a real user is treated as an account (kept).
  const expired = old.filter((r) => r.userId === null || r.isAnonymous === true).map((r) => r.build);

  const doomed = [...new Map([...staleDrafts, ...expired].map((b) => [b.id, b])).values()];
  for (const b of doomed) {
    if (!b.originalImageKey.startsWith("stock/")) await deleteObject(BUCKETS.uploads, b.originalImageKey);
    if (b.renderKey) await deleteObject(BUCKETS.renders, b.renderKey);
    await db.delete(builds).where(eq(builds.id, b.id));
  }

  const guests = await db
    .delete(carsUsers)
    .where(
      and(
        eq(carsUsers.isAnonymous, true),
        lt(carsUsers.createdAt, new Date(now - 30 * DAY)),
        notExists(db.select({ id: builds.id }).from(builds).where(eq(builds.userId, carsUsers.id))),
      ),
    )
    .returning({ id: carsUsers.id });

  console.log(`cleanup: removed ${doomed.length} builds, ${guests.length} stale guests`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
