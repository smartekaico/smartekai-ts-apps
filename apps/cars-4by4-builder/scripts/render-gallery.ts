import { eq } from "drizzle-orm";
import { builds, getDbCars, parts, presets, vehicles } from "@smartekai/db/cars";
import { describeVehicle } from "../src/lib/prompt";
import { renderUpgrade } from "../src/server/render-core";

// Renders one curated build per preset from the vehicle's stock photo.
// Re-runnable: skips presets already rendered unless --force.
async function main() {
  const force = process.argv.includes("--force");
  const db = getDbCars();
  const allPresets = await db.select().from(presets);

  for (const preset of allPresets) {
    const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, preset.vehicleId))).at(0);
    if (!vehicle?.stockImageKey) {
      console.log(`skip ${preset.slug}: no stock image (run stock:upload first)`);
      continue;
    }
    const existing = (await db.select().from(builds).where(eq(builds.slug, preset.slug))).at(0);
    if (existing?.status === "completed" && !force) {
      console.log(`skip ${preset.slug}: already rendered`);
      continue;
    }

    const id = existing?.id ?? crypto.randomUUID();
    const values = {
      vehicleId: vehicle.id,
      presetId: preset.id,
      isCurated: true,
      originalImageKey: vehicle.stockImageKey,
      selectedPartIds: preset.partIds,
      status: "processing" as const,
      updatedAt: new Date(),
    };
    if (existing) await db.update(builds).set(values).where(eq(builds.id, id));
    else await db.insert(builds).values({ id, slug: preset.slug, ...values });

    console.log(`render ${preset.slug}…`);
    try {
      const snippets = (await db.select().from(parts))
        .filter((p) => preset.partIds.includes(p.id))
        .map((p) => p.aiPromptSnippet);
      const renderKey = await renderUpgrade({
        buildId: id,
        originalImageKey: vehicle.stockImageKey,
        vehicleDesc: describeVehicle(null, vehicle.name),
        snippets,
      });
      await db.update(builds).set({ renderKey, status: "completed", errorMessage: null, updatedAt: new Date() }).where(eq(builds.id, id));
      console.log("  → completed");
    } catch (err) {
      console.error("  → failed:", err);
      await db.update(builds).set({ status: "failed", errorMessage: "Gallery render failed", updatedAt: new Date() }).where(eq(builds.id, id));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
