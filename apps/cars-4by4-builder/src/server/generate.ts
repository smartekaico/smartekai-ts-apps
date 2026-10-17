import { and, eq, inArray, lt } from "drizzle-orm";
import { builds, getDbCars, parts, vehicles } from "@smartekai/db/cars";
import { describeVehicle } from "@/lib/prompt";
import { refundFailedBuild } from "@/server/credits";
import { renderUpgrade } from "@/server/render-core";

/** A `processing` build older than this is treated as failed (server restarted mid-render). */
export const STALE_PROCESSING_MS = 10 * 60_000;

export const TIMED_OUT_MESSAGE = "Generation timed out — try again.";

/**
 * Marks a build failed only if it is still `processing` (and, with `olderThan`,
 * not updated since), then refunds it. Returns false when the build had already
 * left `processing` (completed, or failed by someone else) — nothing changed.
 */
export async function failProcessingBuild(buildId: string, errorMessage: string, olderThan?: Date): Promise<boolean> {
  const rows = await getDbCars()
    .update(builds)
    .set({ status: "failed", errorMessage, updatedAt: new Date() })
    .where(
      and(
        eq(builds.id, buildId),
        eq(builds.status, "processing"),
        olderThan ? lt(builds.updatedAt, olderThan) : undefined,
      ),
    )
    .returning({ id: builds.id });
  if (rows.length === 0) return false;
  await refundFailedBuild(buildId); // Spec 3 §3: a failed render gives back what it used (once)
  return true;
}

/** Runs in-process, not awaited by the request. Leaves the build completed or failed; never rejects. */
export async function runGeneration(buildId: string): Promise<void> {
  const db = getDbCars();
  try {
    const build = (await db.select().from(builds).where(eq(builds.id, buildId))).at(0);
    if (!build) throw new Error("build not found");
    const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, build.vehicleId))).at(0);
    if (!vehicle) throw new Error(`vehicle ${build.vehicleId} not found`);
    const selected = await db.select().from(parts).where(inArray(parts.id, build.selectedPartIds));

    const renderKey = await renderUpgrade({
      buildId,
      originalImageKey: build.originalImageKey,
      vehicleDesc: describeVehicle(build.detectedVehicle, vehicle.name),
      snippets: selected.map((p) => p.aiPromptSnippet),
    });

    // Status guard: a build already timed out (and refunded) stays failed.
    const done = await db
      .update(builds)
      .set({ renderKey, status: "completed", errorMessage: null, updatedAt: new Date() })
      .where(and(eq(builds.id, buildId), eq(builds.status, "processing")))
      .returning({ id: builds.id });
    if (done.length === 0) console.warn(`[generate] build ${buildId} finished after leaving processing — kept as is`);
  } catch (err) {
    console.error(`[generate] build ${buildId} failed:`, err);
    try {
      await failProcessingBuild(buildId, "Generation failed — try again.");
    } catch (writeErr) {
      // Left `processing`: the stale sweep (loadBuild / cleanup) fails and refunds it later.
      console.error(`[generate] build ${buildId}: marking failed also failed`, writeErr);
    }
  }
}
