import { createAuth } from "@smartekai/auth/factory";
import { anonymous } from "better-auth/plugins";
import { carsAccounts, carsSessions, carsUsers, carsVerifications, getDbCars } from "@smartekai/db/cars";

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
  plugins: [anonymous()],
});
