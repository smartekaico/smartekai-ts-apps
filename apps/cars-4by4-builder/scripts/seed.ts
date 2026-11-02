import { getDbCars, parts, presets, vehicles } from "@smartekai/db/cars";
import { seedParts } from "../src/seed/parts";
import { seedPresets } from "../src/seed/presets";
import { seedVehicles } from "../src/seed/vehicles";

async function main() {
  const db = getDbCars();

  console.log(`Seeding ${seedVehicles.length} vehicles...`);
  for (const v of seedVehicles) {
    // stockImageKey is owned by scripts/upload-stock.ts — never overwrite it here.
    await db.insert(vehicles).values(v).onConflictDoUpdate({
      target: vehicles.id,
      set: { name: v.name, yearRange: v.yearRange, sortOrder: v.sortOrder },
    });
  }

  console.log(`Seeding ${seedParts.length} parts...`);
  for (const p of seedParts) {
    // imageUrl is owned by scripts/generate-part-images.ts and affiliateUrl
    // (affiliate_url) by scripts/parts-links.ts — never overwrite them here.
    const { imageUrl, affiliateUrl, ...rest } = p;
    await db.insert(parts).values(p).onConflictDoUpdate({
      target: parts.id,
      set: { ...rest },
    });
  }

  console.log(`Seeding ${seedPresets.length} presets...`);
  for (const p of seedPresets) {
    await db.insert(presets).values(p).onConflictDoUpdate({ target: presets.id, set: p });
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
