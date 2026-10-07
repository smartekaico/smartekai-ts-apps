import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// SOURCE-OF-TRUTH: env loading for the server process — Vite does not load
// .env.local into process.env, and @smartekai/ai reads process.env at call
// time. The env file lives at the monorepo root, so load from there (no VITE_
// prefix filter) into process.env without clobbering vars set in the shell.
const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, monorepoRoot, "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [nitro(), tanstackStart(), viteReact()],
    ssr: {
      external: [
        "@smartekai/ui",
        "@smartekai/db",
        "@smartekai/ai",
        "@smartekai/storage",
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