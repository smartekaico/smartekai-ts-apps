import { createServerFn } from "@tanstack/react-start";
import { dbCars, parts } from "@smartekai/db";

export const getParts = createServerFn({ method: "GET" }).handler(async () => {
  return dbCars.select().from(parts);
});