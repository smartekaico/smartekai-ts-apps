import { dbCars, parts } from "@smartekai/db";
import { seedParts } from "../src/seed/parts";

async function main() {
  console.log(`Seeding ${seedParts.length} parts...`);
  for (const part of seedParts) {
    await dbCars.insert(parts).values(part).onConflictDoUpdate({
      target: parts.id,
      set: part,
    });
  }
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});