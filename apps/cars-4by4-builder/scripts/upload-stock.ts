import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { getDbCars, vehicles } from "@smartekai/db/cars";
import { BUCKETS, MUTABLE_PUBLIC_CACHE, uploadObject } from "@smartekai/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function main() {
  const [vehicleId, file] = process.argv.slice(2);
  if (!vehicleId || !file) throw new Error("usage: npm run stock:upload -- <vehicleId> <imagePath>");
  const extension = extname(file).toLowerCase();
  const contentType = TYPES[extension];
  if (!contentType) throw new Error(`unsupported image type: ${extension}`);

  const db = getDbCars();
  const vehicle = (await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, vehicleId))).at(0);
  if (!vehicle) throw new Error(`unknown vehicle: ${vehicleId}`);

  const key = `stock/${vehicleId}${extension}`;
  const body = readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), file));
  await uploadObject(BUCKETS.renders, key, body, contentType, MUTABLE_PUBLIC_CACHE);
  await db.update(vehicles).set({ stockImageKey: key }).where(eq(vehicles.id, vehicleId));
  console.log(`Uploaded ${key} and set it on ${vehicleId}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
