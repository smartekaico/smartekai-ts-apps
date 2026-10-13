import { eq } from "drizzle-orm";
import { generateStudioImage } from "@smartekai/ai";
import { getDbCars, vehicles } from "@smartekai/db/cars";
import { BUCKETS, MUTABLE_PUBLIC_CACHE, uploadObject } from "@smartekai/storage";

const SUBJECTS: Record<string, string> = {
  lc300: "Toyota Land Cruiser 300 (LC300) SUV",
  "patrol-y62": "Nissan Patrol Y62 SUV",
  "wrangler-jl": "Jeep Wrangler JL 4-door",
};

// Mints a rights-clean AI "studio shot" per vehicle when no licensed photo is
// available, uploads it to stock/<id>.<ext> and sets vehicles.stockImageKey.
// Re-runnable (always overwrites); pass vehicle ids to limit.
async function main() {
  const ids = process.argv.slice(2);
  const db = getDbCars();
  const all = await db.select().from(vehicles);
  const targets = ids.length > 0 ? all.filter((vehicle) => ids.includes(vehicle.id)) : all;
  if (targets.length === 0) throw new Error("no matching vehicles");

  for (const vehicle of targets) {
    const subject = SUBJECTS[vehicle.id] ?? vehicle.name;
    const prompt = [
      `Studio photograph of a ${subject}.`,
      "Three-quarter front view, whole vehicle centred and fully in frame, no crop.",
      "Seamless neutral grey studio background, soft even daylight, no people, no text or logos.",
      "Photorealistic automotive catalogue photo.",
    ].join(" ");
    console.log(`generate stock/${vehicle.id}…`);
    const image = await generateStudioImage(prompt);
    const extension = image.mediaType.split("/")[1] || "png";
    const key = `stock/${vehicle.id}.${extension}`;
    await uploadObject(BUCKETS.renders, key, Buffer.from(image.data), image.mediaType, MUTABLE_PUBLIC_CACHE);
    await db.update(vehicles).set({ stockImageKey: key }).where(eq(vehicles.id, vehicle.id));
    console.log(`  → ${key}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
