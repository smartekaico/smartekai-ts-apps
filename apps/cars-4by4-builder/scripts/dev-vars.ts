import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

// Spec 4 §5: .env.local stays the one source of truth; .dev.vars is generated.
// Cloudflare's Vite plugin reads .dev.vars for the local workerd server.
const KEYS = [
  "DATABASE_NEONDB_SMARTEKAI", "BETTER_AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "GOOGLE_AI_API_KEY", "GOOGLE_AI_MODEL", "GOOGLE_AI_IMAGE_MODEL",
  "AWS_REGION", "AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
  "NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET", "NOWPAYMENTS_ENV", "NOWPAYMENTS_IPN_IPS",
  "CARS_DAILY_RENDER_CAP",
] as const;
const LOCAL_URL = process.env.DEV_SITE_URL ?? "http://localhost:3002";
// Local dev must never touch the production database (Spec 4 Task 1 Step 7). The
// monorepo-root .env.local points DATABASE_NEONDB_SMARTEKAI at production, so a
// bare `npm run dev-vars` would silently retarget the workerd dev server at live
// data (see .agents/logs/2026-10-18-cars-spec3-ddl-applied-production.md).
// Pass the cars-credits branch in the shell instead; CARS_ALLOW_PROD_DB=1
// overrides when production is really what you want.
const PROD_DB_ENDPOINT = "ep-winter-frost-b1drw3en";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => (existsSync(p) ? parseEnv(readFileSync(p, "utf8")) : {});
const merged: Record<string, string | undefined> = {
  ...read(resolve(appDir, "../../.env.local")),
  ...read(resolve(appDir, ".env.local")),
};
const dbUrl = process.env.DATABASE_NEONDB_SMARTEKAI ?? merged.DATABASE_NEONDB_SMARTEKAI ?? "";
if (dbUrl.includes(PROD_DB_ENDPOINT) && process.env.CARS_ALLOW_PROD_DB !== "1") {
  console.error(
    `refusing to write .dev.vars: DATABASE_NEONDB_SMARTEKAI points at production (${PROD_DB_ENDPOINT}).\n` +
      `Pass the rehearsal branch, e.g.\n` +
      `  BR=$(npx neon connection-string cars-credits --project-id ancient-hall-95124568 --database-name neondb --pooled)\n` +
      `  DATABASE_NEONDB_SMARTEKAI="$BR" npm run dev-vars\n` +
      `Set CARS_ALLOW_PROD_DB=1 to override.`,
  );
  process.exit(1);
}

const lines = KEYS.flatMap((k) => {
  const v = process.env[k] ?? merged[k];
  return v === undefined ? [] : [`${k}=${JSON.stringify(v)}`];
});
lines.push(`BETTER_AUTH_URL=${JSON.stringify(LOCAL_URL)}`, `PUBLIC_SITE_URL=${JSON.stringify(process.env.PUBLIC_SITE_URL ?? LOCAL_URL)}`);
writeFileSync(resolve(appDir, ".dev.vars"), lines.join("\n") + "\n");
console.log(`wrote .dev.vars (${lines.length} keys) — DATABASE_NEONDB_SMARTEKAI host: ${dbUrl ? new URL(dbUrl).host : "(unset)"}`);
