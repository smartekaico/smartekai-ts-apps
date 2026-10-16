import { createAuth } from "@smartekai/auth/factory";
import { eq } from "drizzle-orm";
import { anonymous } from "better-auth/plugins";
import { builds, carsAccounts, carsSessions, carsUsers, carsVerifications, getDbCars } from "@smartekai/db/cars";

export const auth = createAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3002",
  trustedOrigins: ["https://cars.smartekai.com", "http://cars.smartekai.com", process.env.BETTER_AUTH_URL ?? ""].filter(
    Boolean,
  ),
  db: getDbCars(),
  schema: {
    user: carsUsers,
    session: carsSessions,
    account: carsAccounts,
    verification: carsVerifications,
  },
  emailAndPassword: { enabled: true },
  // Only offer Google when it's configured; otherwise sign-in attempts 500.
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
      : {},
  plugins: [
    anonymous({
      // Fires on /sign-in*, /sign-up* and /callback* (OAuth) in better-auth
      // 1.7.7, so sign-up, sign-in to an existing account and Google all move
      // the guest's builds. The plugin deletes the guest user afterwards.
      // Best-effort like the rest of ownership: a failed move must not fail the
      // sign-in (the builds then become unowned when the guest is deleted).
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        try {
          await getDbCars()
            .update(builds)
            .set({ userId: newUser.user.id })
            .where(eq(builds.userId, anonymousUser.user.id));
        } catch (err) {
          console.error("onLinkAccount: moving guest builds failed", err);
        }
      },
    }),
  ],
});
