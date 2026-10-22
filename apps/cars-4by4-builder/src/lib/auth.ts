import { createAuth, pbkdf2Password } from "@smartekai/auth/factory";
import { eq } from "drizzle-orm";
import { anonymous } from "better-auth/plugins";
import { builds, carsAccounts, carsSessions, carsUsers, carsVerifications, getDbCars } from "@smartekai/db/cars";
import { googleProvider } from "@/server/social-auth";

const google = googleProvider();

export const auth = createAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3002",
  trustedOrigins: ["https://overlander.smartekai.com", "http://overlander.smartekai.com", process.env.BETTER_AUTH_URL ?? ""].filter(
    Boolean,
  ),
  db: getDbCars(),
  schema: {
    user: carsUsers,
    session: carsSessions,
    account: carsAccounts,
    verification: carsVerifications,
  },
  // Web Crypto PBKDF2 rather than Better Auth's pure-JS scrypt: measured at ~80 ms
  // of CPU per sign-up on a Worker, where a Free-plan request gets 10 ms.
  emailAndPassword: { enabled: true, password: pbkdf2Password },
  // Only offer Google when it can actually complete: credentials plus the
  // registered redirect URI (`AUTH_GOOGLE_ENABLED`). See src/server/social-auth.ts.
  socialProviders: google ? { google } : {},
  plugins: [
    anonymous({
      // Fires on /sign-in*, /sign-up* and /callback* (OAuth) in better-auth
      // 1.7.7, so sign-up, sign-in to an existing account and Google all move
      // the guest's builds. The plugin deletes the guest user afterwards.
      // Best-effort like the rest of ownership: a failed move must not fail the
      // sign-in (the builds then become unowned when the guest is deleted).
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        try {
          const db = getDbCars();
          await db.update(builds).set({ userId: newUser.user.id }).where(eq(builds.userId, anonymousUser.user.id));
          // Spec 3 §4: signing up must not reset the free render
          // (new.free_render_used = new OR guest). Guests never hold credits,
          // so no balance moves.
          const guest = (
            await db
              .select({ freeRenderUsed: carsUsers.freeRenderUsed })
              .from(carsUsers)
              .where(eq(carsUsers.id, anonymousUser.user.id))
          ).at(0);
          if (guest?.freeRenderUsed) {
            await db.update(carsUsers).set({ freeRenderUsed: true }).where(eq(carsUsers.id, newUser.user.id));
          }
        } catch (err) {
          console.error("onLinkAccount: moving guest builds / free render failed", err);
        }
      },
    }),
  ],
});
