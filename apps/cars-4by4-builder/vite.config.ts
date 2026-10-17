import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// SOURCE-OF-TRUTH: env loading for the server process — Vite does not load
// .env.local into process.env, and @smartekai/ai reads process.env at call
// time. Load (no VITE_ prefix filter) into process.env, first value wins:
//   1. vars set in the shell / Dokploy
//   2. this app's own .env.local — cars-only overrides, e.g.
//      BETTER_AUTH_URL=http://localhost:3002 (the shared root file points it
//      at legal-os on :3000)
//   3. the monorepo-root .env.local — shared secrets
const appDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(appDir, "../..");

export default defineConfig(({ mode }) => {
  for (const dir of [appDir, monorepoRoot]) {
    for (const [key, value] of Object.entries(loadEnv(mode, dir, ""))) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [nitro(), tanstackStart(), viteReact()],
    ssr: {
      external: [
        "@smartekai/ui",
        "@smartekai/db",
        "@smartekai/db/cars",
        "@smartekai/ai",
        "@smartekai/storage",
        "@smartekai/auth/factory",
      ],
      // lucide-react is installed at different versions across workspace
      // packages; externalizing it in SSR resolves a single hoisted copy and
      // diverges from the client's importer-relative resolution, causing
      // hydration mismatches on icons. Keep it in the vite graph for both.
      noExternal: ["lucide-react"],
    },
    // @smartekai/ui ships CJS dist; browsers can't read named exports from it,
    // so pre-bundle it into ESM for the client (SSR uses external require above).
    optimizeDeps: {
      include: ["@smartekai/ui"],
    },
  };
});