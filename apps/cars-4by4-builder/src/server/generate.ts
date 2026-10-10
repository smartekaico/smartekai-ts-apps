import { eq, inArray } from "drizzle-orm";
import { builds, getDbCars, parts, vehicles } from "@smartekai/db/cars";
import { describeVehicle } from "@/lib/prompt";
import { renderUpgrade } from "@/server/render-core";

/** A `processing` build older than this is treated as failed (server restarted mid-render). */
export const STALE_PROCESSING_MS = 10 * 60_000;

/** Runs in-process, not awaited by the request. Always leaves the build completed or failed. */
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

    await db
      .update(builds)
      .set({ renderKey, status: "completed", errorMessage: null, updatedAt: new Date() })
      .where(eq(builds.id, buildId));
  } catch (err) {
    console.error(`[generate] build ${buildId} failed:`, err);
    await db
      .update(builds)
      .set({ status: "failed", errorMessage: "Generation failed — try again.", updatedAt: new Date() })
      .where(eq(builds.id, buildId));
  }
}
