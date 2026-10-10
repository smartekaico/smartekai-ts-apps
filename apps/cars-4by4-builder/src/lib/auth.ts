import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import {
  getDbCars,
  carsUsers,
  carsSessions,
  carsAccounts,
  carsVerifications,
} from "@smartekai/db/cars";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return "";
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  return "http://localhost:3002";
};

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  trustedOrigins: [
    "https://cars.smartekai.com",
    "http://cars.smartekai.com",
    process.env.BETTER_AUTH_URL || "",
  ].filter(Boolean),
  database: drizzleAdapter(getDbCars(), {
    provider: "pg",
    schema: {
      user: carsUsers,
      session: carsSessions,
      account: carsAccounts,
      verification: carsVerifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [anonymous()],
});