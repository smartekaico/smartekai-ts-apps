import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDbCars() {
  const url = process.env.DATABASE_NEONDB_SMARTEKAI;
  if (!url) {
    throw new Error("DATABASE_NEONDB_SMARTEKAI is not set — @smartekai/db/cars needs it");
  }
  return drizzle({ client: neon(url), schema });
}

let instance: ReturnType<typeof createDbCars> | undefined;

/** Lazy: importing this module never requires the env var; first use does. */
export function getDbCars() {
  if (!instance) instance = createDbCars();
  return instance;
}

export type CarsDatabase = ReturnType<typeof getDbCars>;