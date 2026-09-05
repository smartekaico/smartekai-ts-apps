import { eq, inArray } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { dbCars, parts, upgradeSessions } from "@smartekai/db";

export const getParts = createServerFn({ method: "GET" }).handler(async () => {
  return dbCars.select().from(parts);
});

export const getSession = createServerFn({ method: "GET" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const session = (await dbCars.select().from(upgradeSessions).where(eq(upgradeSessions.id, sessionId))).at(0);
    if (!session) throw new Error("Build not found");

    const sessionParts = session.selectedPartIds.length
      ? await dbCars.select().from(parts).where(inArray(parts.id, session.selectedPartIds))
      : [];

    return {
      session: {
        ...session,
        detectedVehicle: session.detectedVehicle as Record<string, string> | null,
      },
      parts: sessionParts,
    };
  });