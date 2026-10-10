import { defineConfig } from "drizzle-kit";

// Load the monorepo-root env file when present (local dev); in other
// environments the variable comes from the process env.
try {
  process.loadEnvFile("../../.env.local");
} catch {
  // no file — fall through to process.env
}

const url = process.env.DATABASE_NEONDB_SMARTEKAI;
if (!url) throw new Error("DATABASE_NEONDB_SMARTEKAI is not set");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/cars/schema.ts",
  dbCredentials: { url },
  // The cars DB also holds leftover empty legal/medical tables from the old
  // shared-schema pushes. Only manage cars tables — never drop the others here.
  tablesFilter: [
    "vehicles",
    "parts",
    "presets",
    "builds",
    "outbound_clicks",
    "cars_user",
    "cars_session",
    "cars_account",
    "cars_verification",
  ],
});