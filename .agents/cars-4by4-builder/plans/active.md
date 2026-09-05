# AI-Powered 4x4 Customizer (cars-4by4-builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/cars-4by4-builder` end to end: upload a photo of your 4x4, pick upgrades from a catalog, get back a Gemini-validated, Fal.ai-generated photorealistic render of your actual truck wearing those parts, plus an itemized quote and fitment notes.

**Architecture:** TanStack Start app (mirrors `apps/medical-os`). `packages/db` gains `parts`/`upgradeSessions` tables plus a minimal cars-scoped Better Auth table family, all on a new dedicated `dbCars` connection (`DATABASE_NEONDB_SMARTEKAI`). A new `packages/storage` wraps Neon Object Storage (S3-compatible, same Neon project — not R2/S3) for raw uploads and generated renders. `packages/ai` gains two Gemini/Fal.ai-backed functions. One synchronous server function does upload → validate → generate, since this app deploys to a self-hosted Node server with no request-timeout pressure forcing a job queue.

**Tech Stack:** TanStack Start (Vite + Nitro), React 19, Drizzle ORM + Neon (`@smartekai/db`), Better Auth (own cars-scoped instance, anonymous + email/password), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (Neon Object Storage), `@ai-sdk/google` + `generateObject` (vision, via `@smartekai/ai`), `@fal-ai/client` (`fal-ai/flux-pro/kontext`, via `@smartekai/ai`), `@react-pdf/renderer`.

**Validation strategy:** No test suite in this repo (`AGENTS.md`: "test: none"). Every task's verification is `npm run type-check` / `npm run lint` / `npm run build` (what `scripts/gate.sh` runs) plus, for user-visible or external-API-touching changes, an explicit manual check.

**External prerequisites — not executable by this plan unattended:**
1. **Fal.ai account + `FAL_KEY`** — sign up at fal.ai, create an API key. Needed before Task 10.
2. **`neonctl` authentication** — this environment's stored session was rejected (`invalid_request` from Neon's auth server) when checked this session. Run `npx neonctl auth` interactively (opens a browser) once, *or* set a `NEON_API_KEY` env var (from the Neon Console → Account → API keys) so `neonctl` runs non-interactively. Needed before Task 6.

Every other task in this plan is directly executable once those two exist.

**Supersedes:** `.agents/cars-4by4-builder/specs/2026-09-05-mvp-design.md` and this file's prior contents (the 3D Three.js configurator) — see `.agents/cars-4by4-builder/specs/2026-09-05-ai-customizer-pivot-design.md` for the full pivot rationale.

**Inherited quirk (unchanged from the prior plan):** `packages/db/src/schema.ts` is one file pushed to three separate physical databases (`dbLegal`, `dbMedical`, `dbCars`) via `drizzle-kit push` with `DATABASE_URL` swapped per target. `db:push` against `DATABASE_NEONDB_SMARTEKAI` also creates the legal/medical tables (empty) in the cars database, and vice versa — this is how `dbLegal`/`dbMedical` already work today, not a regression this plan introduces.

---

## Phase 1: Foundation

### Task 1: Scaffold `apps/cars-4by4-builder`

**Files:**
- Create: `apps/cars-4by4-builder/package.json`
- Create: `apps/cars-4by4-builder/vite.config.ts`
- Create: `apps/cars-4by4-builder/tsconfig.json`
- Create: `apps/cars-4by4-builder/tailwind.config.js`
- Create: `apps/cars-4by4-builder/postcss.config.js`
- Create: `apps/cars-4by4-builder/eslint.config.js`
- Create: `apps/cars-4by4-builder/tsr.config.json`
- Create: `apps/cars-4by4-builder/components.json`
- Create: `apps/cars-4by4-builder/src/router.tsx`
- Create: `apps/cars-4by4-builder/src/routes/__root.tsx`
- Create: `apps/cars-4by4-builder/src/routes/index.tsx`
- Create: `apps/cars-4by4-builder/src/styles.css`
- Create: `apps/cars-4by4-builder/src/lib/utils.ts`
- Modify: `package.json` (root — add `dev:cars` script)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cars-4by4-builder",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite dev --port 3002",
    "start": "node .output/server/index.mjs",
    "generate-routes": "tsr generate",
    "lint": "eslint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@fontsource-variable/inter": "^5.3.0",
    "@smartekai/ai": "*",
    "@smartekai/db": "*",
    "@smartekai/storage": "*",
    "@smartekai/ui": "*",
    "@tanstack/react-router": "^1.170.32",
    "@tanstack/react-start": "^1.168.49",
    "better-auth": "^1.5.6",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "nitro": "3.0.260610-beta",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@tanstack/eslint-config": "^0.4.0",
    "@tanstack/router-cli": "^1.167.33",
    "@types/node": "^20.0.0",
    "@types/react": "19.2.14",
    "@vitejs/plugin-react": "^6.1.1",
    "autoprefixer": "^10.0.0",
    "eslint": "^9.39.5",
    "tailwindcss": "^3.4.0",
    "typescript": "^6.0.3",
    "vite": "^8.2.2"
  }
}
```

Mirrors `apps/medical-os/package.json`, minus `@smartekai/ai`'s medical-only consumers, plus `better-auth` (this app builds its own instance), `@smartekai/db`, and `@smartekai/storage` (Task 5). Port `3002` avoids `legal-os` (3001) / `medical-os` (3000).

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [nitro(), tanstackStart(), viteReact()],
    ssr: {
      external: ["@smartekai/ui"],
      noExternal: ["lucide-react"],
    },
    optimizeDeps: {
      include: ["@smartekai/ui"],
    },
  };
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/routes/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Create `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
  },
};
```

- [ ] **Step 6: Create `eslint.config.js`**

```javascript
// @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ignores: ["eslint.config.js", "postcss.config.js", "tailwind.config.js", ".next/**", ".output/**"],
  },
];
```

- [ ] **Step 7: Create `tsr.config.json`**

```json
{
  "target": "react"
}
```

- [ ] **Step 8: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 9: Create `src/lib/utils.ts`**

```typescript
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 10: Create `src/router.tsx`**

```typescript
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

- [ ] **Step 11: Create `src/routes/__root.tsx`**

```typescript
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import "@fontsource-variable/inter";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI 4x4 Customizer" },
      {
        name: "description",
        content: "Upload a photo of your 4x4 and see it transformed with real upgrades.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 12: Create `src/routes/index.tsx`** (placeholder — Task 16 makes this the real Step 1 of the flow)

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <h1 className="text-2xl font-semibold">AI 4x4 Customizer — coming soon</h1>
    </main>
  );
}
```

- [ ] **Step 13: Create `src/styles.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 47.4% 11.2%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 47.4% 11.2%;
    --primary: 262.1 83.3% 57.8%;
    --primary-foreground: 210 40% 98%;
    --secondary: 220 14.3% 95.9%;
    --secondary-foreground: 220.9 30% 18%;
    --muted: 220 14.3% 95.9%;
    --muted-foreground: 220 9% 46%;
    --accent: 220 14.3% 95.9%;
    --accent-foreground: 220.9 30% 18%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 262.1 83.3% 57.8%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 14: Add a `dev:cars` convenience script to the root `package.json`**

```json
    "dev:cars": "turbo run dev --filter=cars-4by4-builder --output-logs=full",
```

- [ ] **Step 15: Install and generate the route tree**

```bash
npm install
npm run generate-routes --workspace=apps/cars-4by4-builder
```

Expected: `apps/cars-4by4-builder/src/routeTree.gen.ts` is created (auto-generated — never hand-edit it).

- [ ] **Step 16: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
npm run lint --workspace=apps/cars-4by4-builder
npm run build --workspace=apps/cars-4by4-builder
```

Expected: all three pass.

- [ ] **Step 17: Commit**

```bash
git add apps/cars-4by4-builder package.json
git commit -m "feat(cars-4by4-builder): scaffold TanStack Start app shell"
```

---

### Task 2: Add `parts`/`upgradeSessions` + cars-scoped auth tables to `packages/db`

**Files:**
- Modify: `packages/db/src/schema.ts`

- [ ] **Step 1: Add the `numeric` import**

Change the top-of-file import block:

```typescript
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  customType,
  index,
  serial,
} from "drizzle-orm/pg-core";
```

to:

```typescript
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  customType,
  index,
  serial,
  numeric,
} from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Append the new tables** at the end of `packages/db/src/schema.ts`, before any `relations(...)` blocks:

```typescript
// ============================================
// CARS 4X4 CUSTOMIZER TABLES (dedicated DB — see dbCars in client.ts)
// ============================================

export const carsUsers = pgTable("cars_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const carsSessions = pgTable(
  "cars_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => carsUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    tokenIdx: index("cars_session_token_idx").on(table.token),
    userIdx: index("cars_session_user_idx").on(table.userId),
  }),
);

export const carsAccounts = pgTable(
  "cars_account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => carsUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    userIdx: index("cars_account_user_idx").on(table.userId),
  }),
);

export const carsVerifications = pgTable("cars_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "front_bumper" | "wheels_tires" | "roof_tent" | "lift_kit" | "snorkel" | "lighting"
  brand: text("brand").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  fitmentDifficulty: text("fitment_difficulty").notNull(), // "Direct Bolt-On" | "Minor Trimming" | "Custom Fabrication"
  aiPromptSnippet: text("ai_prompt_snippet").notNull(),
  imageUrl: text("image_url").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
});

export const upgradeSessions = pgTable("upgrade_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => carsUsers.id), // nullable — guest by default
  originalImageUrl: text("original_image_url").notNull(),
  transformedImageUrl: text("transformed_image_url"),
  detectedVehicle: jsonb("detected_vehicle"), // { make, model, year, color }
  selectedPartIds: text("selected_part_ids").array().notNull(),
  status: text("status").default("pending").notNull(), // "pending" | "processing" | "completed" | "failed"
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 3: Build and verify**

```bash
npm run build --workspace=packages/db
npm run type-check --workspace=packages/db
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema.ts
git commit -m "feat(db): add parts/upgradeSessions and cars-scoped auth tables"
```

---

### Task 3: Add the `dbCars` connection

**Files:**
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Add `dbCars` to `client.ts`**

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const legalSql = neon(
  process.env.DATABASE_LEGAL_URL ?? process.env.DATABASE_URL!,
);
const medicalSql = neon(
  process.env.DATABASE_MEDICAL_URL ?? process.env.DATABASE_URL!,
);
const carsSql = neon(process.env.DATABASE_NEONDB_SMARTEKAI!);

const sql = neon(process.env.DATABASE_URL ?? process.env.DATABASE_LEGAL_URL!);

export const db = drizzle({ client: sql, schema });

export const dbLegal = drizzle({ client: legalSql, schema });
export const dbMedical = drizzle({ client: medicalSql, schema });
export const dbCars = drizzle({ client: carsSql, schema });

export type Database = typeof db;
```

- [ ] **Step 2: Update the re-export in `index.ts`**

Change:

```typescript
export { db, dbLegal, dbMedical } from "./client";
```

to:

```typescript
export { db, dbLegal, dbMedical, dbCars } from "./client";
```

- [ ] **Step 3: Verify**

```bash
npm run build --workspace=packages/db
npm run type-check --workspace=packages/db
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/client.ts packages/db/src/index.ts
git commit -m "feat(db): add dbCars connection for DATABASE_NEONDB_SMARTEKAI"
```

---

### Task 4: Cars Better Auth instance + auth client + API route

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/auth.ts`
- Create: `apps/cars-4by4-builder/src/lib/auth-client.ts`
- Create: `apps/cars-4by4-builder/src/routes/api/auth/$.ts`

- [ ] **Step 1: Create `src/lib/auth.ts`**

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import {
  dbCars,
  carsUsers,
  carsSessions,
  carsAccounts,
  carsVerifications,
} from "@smartekai/db";

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
  database: drizzleAdapter(dbCars, {
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
```

- [ ] **Step 2: Create `src/lib/auth-client.ts`**

```typescript
import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});
```

- [ ] **Step 3: Create `src/routes/api/auth/$.ts`**

```typescript
import { createServerFileRoute } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const ServerRoute = createServerFileRoute().methods({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
```

- [ ] **Step 4: Regenerate routes and verify**

```bash
npm run generate-routes --workspace=apps/cars-4by4-builder
npm run type-check --workspace=apps/cars-4by4-builder
npm run build --workspace=apps/cars-4by4-builder
```

Expected: all pass. If `createServerFileRoute` doesn't match the installed `@tanstack/react-start` version's actual export, `tsc`'s error will name the real one — check `node_modules/@tanstack/react-start/dist/**/*.d.ts`.

- [ ] **Step 5: Manual verification**

```bash
npm run dev --workspace=apps/cars-4by4-builder &
sleep 3
curl -i http://localhost:3002/api/auth/ok
kill %1
```

Expected: a response *from Better Auth* (JSON body, any status), not a bare 404 — confirms the route reaches `auth.handler`.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/auth.ts apps/cars-4by4-builder/src/lib/auth-client.ts apps/cars-4by4-builder/src/routes/api/auth apps/cars-4by4-builder/src/routeTree.gen.ts
git commit -m "feat(cars-4by4-builder): add dedicated Better Auth instance (anonymous + email/password)"
```

---

### Task 5: `packages/storage` — Neon Object Storage thin client

**Files:**
- Create: `packages/storage/package.json`
- Create: `packages/storage/tsconfig.json`
- Create: `packages/storage/src/index.ts`

- [ ] **Step 1: Create `packages/storage/package.json`**

```json
{
  "name": "@smartekai/storage",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/s3-request-presigner": "^3.700.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

(Mirrors `packages/db`'s `package.json` shape — same `main`/`types`/build script convention.)

- [ ] **Step 2: Create `packages/storage/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/storage/src/index.ts`**

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // required for a custom (non-AWS) S3 endpoint
});

export async function uploadObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

/**
 * For the private cars-uploads bucket — Gemini/Fal.ai fetch the photo via
 * this short-lived URL instead of the object ever being made public.
 */
export async function getPresignedReadUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

/** Public URL for an object in a public_read bucket — no signing needed. */
export function getPublicUrl(bucket: string, key: string): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3!;
  return `${endpoint}/${bucket}/${key}`;
}

export const BUCKETS = {
  uploads: "cars-uploads",
  renders: "cars-renders",
} as const;
```

- [ ] **Step 4: Add the workspace member to root install and build**

```bash
npm install
npm run build --workspace=packages/storage
npm run type-check --workspace=packages/storage
```

Expected: both pass. (`npm install` picks up the new workspace package automatically via the root `workspaces: ["apps/*", "packages/*"]` glob — no manual registration needed.)

- [ ] **Step 5: Commit**

```bash
git add packages/storage
git commit -m "feat(storage): add @smartekai/storage wrapping Neon Object Storage"
```

---

### Task 6: Provision Neon Object Storage buckets

**Files:** none (operational task)

**Depends on:** `neonctl` authentication (see plan header's external prerequisites).

- [ ] **Step 1: Authenticate `neonctl`** (skip if already done)

```bash
npx neonctl auth
```

This opens a browser for interactive login. If running non-interactively, set `NEON_API_KEY` instead (from the Neon Console → Account → API keys) and pass `--api-key "$NEON_API_KEY"` to every `neonctl` command below.

- [ ] **Step 2: Identify the project/branch backing `DATABASE_NEONDB_SMARTEKAI`**

```bash
npx neonctl projects list
```

Find the project whose connection string matches `DATABASE_NEONDB_SMARTEKAI`, note its `project-id`.

- [ ] **Step 3: Create the two buckets**

```bash
npx neonctl buckets create cars-uploads --access-level private --project-id <project-id>
npx neonctl buckets create cars-renders --access-level public_read --project-id <project-id>
```

Expected: both commands print a created bucket with a `token_id` and `s3_secret_access_key` — **copy these immediately, they cannot be retrieved later.**

- [ ] **Step 4: Add the resulting credentials to `.env.local`**

```
AWS_ENDPOINT_URL_S3=https://br-<branch-id>.storage.c-1.<region>.aws.neon.tech
AWS_ACCESS_KEY_ID=<token_id from Step 3>
AWS_SECRET_ACCESS_KEY=<s3_secret_access_key from Step 3>
AWS_REGION=<region from the endpoint, e.g. us-east-2>
```

(The exact endpoint is printed by the bucket-creation command or visible in the Neon Console's Object Storage tab.)

- [ ] **Step 5: Add the same 4 vars to `turbo.json`'s `globalEnv`**

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "globalEnv": [
    "DATABASE_URL",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "GOOGLE_AI_API_KEY",
    "DEEPGRAM_API_KEY",
    "CRW_INTERNAL_URL",
    "DATABASE_NEONDB_SMARTEKAI",
    "AWS_ENDPOINT_URL_S3",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "FAL_KEY"
  ],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", ".output/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "outputs": [] },
    "type-check": { "outputs": [] }
  }
}
```

(`FAL_KEY` is included here even though it's provisioned in Task 10 — one `turbo.json` edit covers both.)

- [ ] **Step 6: No commit for Steps 1-4** (external provisioning + local secrets, not repo files). Commit the `turbo.json` change:

```bash
git add turbo.json
git commit -m "chore: add Neon Object Storage and FAL_KEY vars to turbo globalEnv"
```

---

### Task 7: Verify storage round-trip

**Files:** none (operational task)

- [ ] **Step 1: Write a throwaway verification script**

```bash
npx tsx -e '
import { uploadObject, getPresignedReadUrl, getPublicUrl, BUCKETS } from "@smartekai/storage";
async function main() {
  const body = Buffer.from("hello from cars-4by4-builder");
  await uploadObject(BUCKETS.uploads, "test.txt", body, "text/plain");
  const signed = await getPresignedReadUrl(BUCKETS.uploads, "test.txt");
  console.log("presigned:", signed);

  await uploadObject(BUCKETS.renders, "test.txt", body, "text/plain");
  console.log("public:", getPublicUrl(BUCKETS.renders, "test.txt"));
}
main();
'
```

Expected: both `console.log` lines print URLs with no thrown errors. Fetch the public URL in a browser or `curl` — it should return `hello from cars-4by4-builder` with no auth. Fetch the presigned URL similarly (works because it's signed); fetching the same object *without* the signature (bare `https://.../cars-uploads/test.txt`) should 403 — confirms the private bucket is actually private.

- [ ] **Step 2: No commit** — this is a manual verification, not a code change.

---

## Phase 2: AI thin clients

(Storage ended up folded into Phase 1 above, alongside the rest of the foundational infra — `packages/storage` and its buckets need to exist before anything else, same as `dbCars` and the auth instance. This phase covers the spec's remaining "Storage & AI thin clients" milestone: the AI side.)

### Task 8: `detectVehicle` — vision validation via Gemini

**Files:**
- Create: `packages/ai/src/vehicle-detector.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 1: Create `packages/ai/src/vehicle-detector.ts`**

Mirrors `soap-generator.ts`'s exact pattern (same client construction, same `generateObject` shape), with a multimodal image input instead of a text transcript:

```typescript
import { z } from "zod";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const vehicleDetectionSchema = z.object({
  isValidVehicle: z.boolean(),
  vehicleType: z.string().nullable(),
  detectedMake: z.string().nullable(),
  detectedModel: z.string().nullable(),
  detectedColor: z.string().nullable(),
  angle: z.string().nullable(),
  validationError: z.string().nullable(),
});

export type VehicleDetection = z.infer<typeof vehicleDetectionSchema>;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";

/**
 * Validates that an uploaded photo is a usable exterior shot of a 4x4-style
 * vehicle, and extracts make/model/color/angle for prompt construction.
 */
export async function detectVehicle(imageUrl: string): Promise<VehicleDetection> {
  const model = google(
    MODEL_NAME.startsWith("models/") ? MODEL_NAME : `models/${MODEL_NAME}`,
  );

  const { object } = await generateObject({
    model,
    schema: vehicleDetectionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are validating a photo upload for a 4x4/SUV/truck customizer app.
Look at the image and determine: is this a clear exterior photo of a 4x4-capable
vehicle (SUV, pickup truck, off-roader)? Reject blurry images, interior shots,
non-4x4 vehicles (sedans, sports cars), or images with no vehicle at all.
If valid, detect the make, model, color, and camera angle
(e.g. "front_three_quarter", "side_profile", "rear_three_quarter").
If invalid, explain why in validationError and leave the other detected fields null.`,
          },
          { type: "image", image: imageUrl },
        ],
      },
    ],
  });

  return object;
}
```

- [ ] **Step 2: Export it from `packages/ai/src/index.ts`**

```typescript
export { transcribeMedicalAudio, type TranscriptionResult } from "./transcription";
export { generateSoapNote, soapNoteSchema, type SoapNote } from "./soap-generator";
export { detectVehicle, vehicleDetectionSchema, type VehicleDetection } from "./vehicle-detector";
```

- [ ] **Step 3: Verify**

```bash
npm run build --workspace=packages/ai
npm run type-check --workspace=packages/ai
```

Expected: both pass.

- [ ] **Step 4: Manual verification against the real Gemini API**

```bash
npx tsx -e '
import { detectVehicle } from "@smartekai/ai";
detectVehicle("https://upload.wikimedia.org/wikipedia/commons/8/8a/2016_Toyota_Land_Cruiser_%28FJA300R%29_GXL_wagon_%282018-11-02%29_01.jpg")
  .then(console.log)
  .catch(console.error);
'
```

Expected: `isValidVehicle: true`, with `detectedMake`/`detectedModel` roughly matching "Toyota"/"Land Cruiser". Requires `GOOGLE_AI_API_KEY` to already be set (it is — this repo's existing key, no new provisioning).

- [ ] **Step 5: Commit**

```bash
git add packages/ai/src/vehicle-detector.ts packages/ai/src/index.ts
git commit -m "feat(ai): add detectVehicle vision validation via Gemini"
```

---

### Task 9: Fal.ai dependency + `generateUpgradeRender`

**Files:**
- Create: `packages/ai/src/upgrade-render.ts`
- Modify: `packages/ai/src/index.ts`
- Modify: `packages/ai/package.json`

**Depends on:** `FAL_KEY` (plan header's external prerequisite #1).

- [ ] **Step 1: Add the dependency**

In `packages/ai/package.json`'s `dependencies`:

```json
    "@fal-ai/client": "^1.2.0",
```

```bash
npm install
```

- [ ] **Step 2: Create `packages/ai/src/upgrade-render.ts`**

```typescript
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

/**
 * Mask-free, instruction-based image edit (fal-ai/flux-pro/kontext) — not
 * raw inpainting, which would need an explicit mask_url this pipeline has
 * no way to generate. Takes the user's original photo + a natural-language
 * description of the upgrades to apply, returns the generated image URL.
 */
export async function generateUpgradeRender(
  originalImageUrl: string,
  prompt: string,
): Promise<string> {
  const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
    input: { prompt, image_url: originalImageUrl },
    logs: false,
  });

  return result.data.images[0].url as string;
}
```

- [ ] **Step 3: Export it from `packages/ai/src/index.ts`**

```typescript
export { generateUpgradeRender } from "./upgrade-render";
```

- [ ] **Step 4: Verify**

```bash
npm run build --workspace=packages/ai
npm run type-check --workspace=packages/ai
```

Expected: both pass. If `fal.subscribe`'s return shape doesn't match `result.data.images[0].url`, check `node_modules/@fal-ai/client/dist/**/*.d.ts` for the actual response type — the exact field layout can vary slightly by model.

- [ ] **Step 5: Manual verification against the real Fal.ai API**

```bash
npx tsx -e '
import { generateUpgradeRender } from "@smartekai/ai";
generateUpgradeRender(
  "https://upload.wikimedia.org/wikipedia/commons/8/8a/2016_Toyota_Land_Cruiser_%28FJA300R%29_GXL_wagon_%282018-11-02%29_01.jpg",
  "Add a matte black heavy-duty steel bull bar with round driving lights to the front of this vehicle. Photorealistic, seamless fitment."
).then(console.log).catch(console.error);
'
```

Expected: prints a URL to a generated image. Open it — confirm the vehicle now visibly has a bull bar and still resembles the original photo (same color, background, angle).

- [ ] **Step 6: Commit**

```bash
git add packages/ai/src/upgrade-render.ts packages/ai/src/index.ts packages/ai/package.json package-lock.json
git commit -m "feat(ai): add generateUpgradeRender via Fal.ai flux-pro/kontext"
```

---

## Phase 3: Upload → validate → generate pipeline

### Task 10: The synchronous pipeline server function

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/generate-build.ts`

- [ ] **Step 1: Create `src/lib/generate-build.ts`** implementing spec §5's 7 steps

```typescript
import { createServerFn } from "@tanstack/react-start";
import { detectVehicle, generateUpgradeRender } from "@smartekai/ai";
import { uploadObject, getPresignedReadUrl, getPublicUrl, BUCKETS } from "@smartekai/storage";
import { dbCars, parts, upgradeSessions } from "@smartekai/db";
import { inArray } from "drizzle-orm";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const generateBuild = createServerFn({ method: "POST" })
  .validator((formData: FormData) => {
    const photo = formData.get("photo");
    const partIdsRaw = formData.get("partIds");
    if (!(photo instanceof File)) throw new Error("photo is required");
    if (typeof partIdsRaw !== "string") throw new Error("partIds is required");
    return { photo, partIds: JSON.parse(partIdsRaw) as string[] };
  })
  .handler(async ({ data }) => {
    const { headers } = getWebRequest();
    const session = await auth.api.getSession({ headers });

    // Step 2: upload the raw photo to the private bucket, get a presigned read URL
    const buffer = Buffer.from(await data.photo.arrayBuffer());
    const uploadKey = `${crypto.randomUUID()}-${data.photo.name}`;
    await uploadObject(BUCKETS.uploads, uploadKey, buffer, data.photo.type);
    const presignedUrl = await getPresignedReadUrl(BUCKETS.uploads, uploadKey);

    // Step 3: vision validation
    const detection = await detectVehicle(presignedUrl);
    if (!detection.isValidVehicle) {
      return { status: "failed" as const, validationError: detection.validationError };
    }

    // Step 4: build the transformation prompt
    const selectedParts = data.partIds.length
      ? await dbCars.select().from(parts).where(inArray(parts.id, data.partIds))
      : [];
    const vehicleDesc = [detection.detectedColor, detection.detectedMake, detection.detectedModel]
      .filter(Boolean)
      .join(" ");
    const prompt = `Photorealistic photo of a ${vehicleDesc} modified with: ${selectedParts
      .map((p) => p.aiPromptSnippet)
      .join(", ")}. Professional automotive photography, realistic reflections, seamless fitment, 8k.`;

    // Step 5: generate (awaited directly — no polling)
    let transformedUrl: string;
    try {
      transformedUrl = await generateUpgradeRender(presignedUrl, prompt);
    } catch {
      return { status: "failed" as const, validationError: "Generation failed — try again." };
    }

    // Step 6: fetch the generated image and store it in the public bucket
    const generatedResponse = await fetch(transformedUrl);
    const generatedBuffer = Buffer.from(await generatedResponse.arrayBuffer());
    const renderKey = `${crypto.randomUUID()}.jpg`;
    await uploadObject(BUCKETS.renders, renderKey, generatedBuffer, "image/jpeg");
    const publicRenderUrl = getPublicUrl(BUCKETS.renders, renderKey);

    // Step 7: persist the session
    const [inserted] = await dbCars
      .insert(upgradeSessions)
      .values({
        id: crypto.randomUUID(),
        userId: session?.user.id ?? null,
        originalImageUrl: presignedUrl,
        transformedImageUrl: publicRenderUrl,
        detectedVehicle: {
          make: detection.detectedMake,
          model: detection.detectedModel,
          color: detection.detectedColor,
        },
        selectedPartIds: data.partIds,
        status: "completed",
        isPublic: true,
      })
      .returning();

    return { status: "completed" as const, session: inserted };
  });
```

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS. If `createServerFn`'s `FormData` validator shape, or `getWebRequest`'s export name, don't match the installed `@tanstack/react-start` version, check `node_modules/@tanstack/react-start/dist/esm/**/*.d.ts` for the actual signatures.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/generate-build.ts
git commit -m "feat(cars-4by4-builder): add synchronous upload-validate-generate pipeline"
```

---

## Phase 4: Catalog & selection UI

### Task 11: Seed data — parts catalog

**Files:**
- Create: `apps/cars-4by4-builder/src/seed/parts.ts`

- [ ] **Step 1: Create `src/seed/parts.ts`** (26 hand-curated parts across the SOP's 4 categories, with AI prompt snippets)

```typescript
export const seedParts = [
  // Armor & Protection
  { id: "arb-summit-bullbar", name: "ARB Summit Bull Bar", category: "front_bumper", brand: "ARB", priceUsd: "2450.00", laborHoursEst: "3.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a matte black heavy-duty steel bull bar with integrated recovery hooks and round driving lights mounted on the front bumper", imageUrl: "https://arb4x4.com/images/summit-bull-bar.jpg", affiliateUrl: "https://arb4x4.com/products/summit-bull-bar" },
  { id: "arb-stealthbar", name: "ARB StealthBar", category: "front_bumper", brand: "ARB", priceUsd: "1890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile matte black stealth front bumper with integrated fog lights", imageUrl: "https://arb4x4.com/images/stealthbar.jpg", affiliateUrl: "https://arb4x4.com/products/stealthbar" },
  { id: "ironman-rock-sliders", name: "Ironman 4x4 Rock Sliders", category: "front_bumper", brand: "Ironman 4x4", priceUsd: "890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "black powder-coated steel rock slider side steps running along the rocker panels", imageUrl: "https://ironman4x4.com/images/rock-sliders.jpg", affiliateUrl: "https://ironman4x4.com/products/rock-sliders" },
  { id: "smittybilt-src", name: "Smittybilt SRC Side Armor", category: "front_bumper", brand: "Smittybilt", priceUsd: "620.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "textured black tubular side armor bars along the rocker panels", imageUrl: "https://smittybilt.com/images/src-side-armor.jpg", affiliateUrl: "https://smittybilt.com/products/src-side-armor" },
  { id: "arb-underbody-armor", name: "ARB Underbody Armor Kit", category: "front_bumper", brand: "ARB", priceUsd: "540.00", laborHoursEst: "2.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visible steel skid plate beneath the front bumper", imageUrl: "https://arb4x4.com/images/underbody-armor.jpg", affiliateUrl: "https://arb4x4.com/products/underbody-armor" },

  // Wheels & Tires
  { id: "method-beadlock-701", name: "Method Race Wheels 701 Beadlock", category: "wheels_tires", brand: "Method", priceUsd: "1840.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "bronze 17-inch beadlock wheels with visible beadlock rings", imageUrl: "https://methodracewheels.com/images/701-beadlock.jpg", affiliateUrl: "https://methodracewheels.com/products/701-beadlock" },
  { id: "nitto-ridge-grappler-35", name: "35\" Nitto Ridge Grapplers", category: "wheels_tires", brand: "Nitto", priceUsd: "1600.00", laborHoursEst: "1.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "35-inch aggressive hybrid all-terrain/mud-terrain tires with deep chunky tread", imageUrl: "https://nittotire.com/images/ridge-grappler.jpg", affiliateUrl: "https://nittotire.com/products/ridge-grappler" },
  { id: "bfg-km3-33", name: "33\" BFGoodrich KM3 Mud-Terrain", category: "wheels_tires", brand: "BFGoodrich", priceUsd: "1280.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "33-inch aggressive mud-terrain tires with large tread blocks", imageUrl: "https://bfgoodrichtires.com/images/km3.jpg", affiliateUrl: "https://bfgoodrichtires.com/products/km3" },
  { id: "fuel-vector-wheels", name: "Fuel Vector Off-Road Wheels", category: "wheels_tires", brand: "Fuel", priceUsd: "1120.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "matte black 18-inch off-road wheels with a deep concave design", imageUrl: "https://fuelwheels.com/images/vector.jpg", affiliateUrl: "https://fuelwheels.com/products/vector" },

  // Overlanding & Roof Gear
  { id: "frontrunner-slimline-ii", name: "Front Runner Slimline II Roof Platform", category: "roof_tent", brand: "Front Runner", priceUsd: "1150.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "an ultra-slim aluminum platform roof rack mounted flush to the roofline", imageUrl: "https://frontrunneroutfitters.com/images/slimline-ii.jpg", affiliateUrl: "https://frontrunneroutfitters.com/products/slimline-ii" },
  { id: "arb-esperance-tent", name: "ARB Esperance Rooftop Tent", category: "roof_tent", brand: "ARB", priceUsd: "2200.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a closed hardshell rooftop tent clamped to the roof rack", imageUrl: "https://arb4x4.com/images/esperance-tent.jpg", affiliateUrl: "https://arb4x4.com/products/esperance-tent" },
  { id: "ironman-hardshell-tent", name: "Ironman 4x4 Hardshell Rooftop Tent", category: "roof_tent", brand: "Ironman 4x4", priceUsd: "2450.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile black hardshell rooftop tent", imageUrl: "https://ironman4x4.com/images/hardshell-tent.jpg", affiliateUrl: "https://ironman4x4.com/products/hardshell-tent" },
  { id: "arb-270-awning", name: "ARB 270° Awning", category: "roof_tent", brand: "ARB", priceUsd: "890.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a 270-degree fabric awning deployed from the side of the roof rack", imageUrl: "https://arb4x4.com/images/270-awning.jpg", affiliateUrl: "https://arb4x4.com/products/270-awning" },
  { id: "arb-fridge-freezer", name: "ARB 63QT Fridge Freezer", category: "roof_tent", brand: "ARB", priceUsd: "1180.00", laborHoursEst: "0.2", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a portable fridge freezer visible through the open rear cargo area", imageUrl: "https://arb4x4.com/images/fridge-freezer.jpg", affiliateUrl: "https://arb4x4.com/products/fridge-freezer" },

  // Off-Road Lighting & Extras
  { id: "rigid-led-lightbar", name: "Rigid Industries 40\" LED Light Bar", category: "lighting", brand: "Rigid Industries", priceUsd: "650.00", laborHoursEst: "1.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 40-inch LED light bar mounted above the windshield or on the roof rack", imageUrl: "https://rigidindustries.com/images/40-led-bar.jpg", affiliateUrl: "https://rigidindustries.com/products/40-led-bar" },
  { id: "ironman-snorkel", name: "Ironman 4x4 Snorkel", category: "lighting", brand: "Ironman 4x4", priceUsd: "310.00", laborHoursEst: "2.5", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a black safari snorkel running up the A-pillar to the roofline", imageUrl: "https://ironman4x4.com/images/snorkel.jpg", affiliateUrl: "https://ironman4x4.com/products/snorkel" },
  { id: "warn-vr-evo-10s", name: "Warn VR EVO 10-S Winch", category: "lighting", brand: "Warn", priceUsd: "1050.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a black recovery winch mounted at the front center of the bumper", imageUrl: "https://warn.com/images/vr-evo-10s.jpg", affiliateUrl: "https://warn.com/products/vr-evo-10s" },
  { id: "kc-hilites-cube", name: "KC HiLiTES Cube LED Pod Lights", category: "lighting", brand: "KC HiLiTES", priceUsd: "220.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a pair of small square LED pod lights mounted on the front bumper or A-pillars", imageUrl: "https://kchilites.com/images/cube-leds.jpg", affiliateUrl: "https://kchilites.com/products/cube-leds" },

  // Suspension / lift
  { id: "ome-bp51", name: "Old Man Emu BP-51 Suspension Kit", category: "lift_kit", brand: "Old Man Emu", priceUsd: "3200.00", laborHoursEst: "6.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visibly lifted stance with the wheel gap increased by about 2 inches", imageUrl: "https://oldmanemu4x4.com/images/bp51.jpg", affiliateUrl: "https://oldmanemu4x4.com/products/bp51" },
  { id: "ironman-foam-cell", name: "Ironman 4x4 Foam Cell Suspension", category: "lift_kit", brand: "Ironman 4x4", priceUsd: "1620.00", laborHoursEst: "5.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a moderate 2-inch suspension lift with increased ground clearance", imageUrl: "https://ironman4x4.com/images/foam-cell.jpg", affiliateUrl: "https://ironman4x4.com/products/foam-cell" },
  { id: "rough-country-lift-kit", name: "Rough Country 2.5\" Lift Kit", category: "lift_kit", brand: "Rough Country", priceUsd: "980.00", laborHoursEst: "4.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 2.5-inch suspension lift with a slightly more aggressive stance", imageUrl: "https://roughcountry.com/images/lift-kit.jpg", affiliateUrl: "https://roughcountry.com/products/lift-kit" },
  { id: "bilstein-5100-shocks", name: "Bilstein 5100 Series Shocks", category: "lift_kit", brand: "Bilstein", priceUsd: "620.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "visible yellow-bodied performance shock absorbers at each corner", imageUrl: "https://bilstein.com/images/5100-series.jpg", affiliateUrl: "https://bilstein.com/products/5100-series" },
  { id: "arb-air-locker", name: "ARB Air Locker (Front)", category: "lift_kit", brand: "ARB", priceUsd: "890.00", laborHoursEst: "4.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "no visible exterior change (drivetrain upgrade)", imageUrl: "https://arb4x4.com/images/air-locker.jpg", affiliateUrl: "https://arb4x4.com/products/air-locker" },
  { id: "old-man-emu-heavy-springs", name: "OME Heavy Constant Load Front Springs", category: "lift_kit", brand: "Old Man Emu", priceUsd: "480.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "restored factory ride height at the front of the vehicle", imageUrl: "https://oldmanemu4x4.com/images/heavy-springs.jpg", affiliateUrl: "https://oldmanemu4x4.com/products/heavy-springs" },
  { id: "smittybilt-recovery-kit", name: "Smittybilt Tow & Recovery Kit", category: "lighting", brand: "Smittybilt", priceUsd: "95.00", laborHoursEst: "0.2", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a visible recovery strap and shackles hanging from the front recovery points", imageUrl: "https://smittybilt.com/images/recovery-kit.jpg", affiliateUrl: "https://smittybilt.com/products/recovery-kit" },
] as const;
```

26 parts across all 4 SOP categories, each with a concrete `aiPromptSnippet` written for direct use in the generation prompt (Task 10's `prompt` construction).

**`affiliateUrl` and `imageUrl` here are placeholder fixture data** — structurally
plausible (`https://arb4x4.com/products/...`) but not verified real product pages or
hosted images. They're fine to develop and demo against, but every one needs replacing
with a real, verified affiliate link and real hosted image before this ships to actual
visitors — fabricated URLs in a live "Buy" button is a correctness bug, not a cosmetic
one.

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/seed/parts.ts
git commit -m "feat(cars-4by4-builder): add hand-curated parts seed data with AI prompt snippets"
```

---

### Task 12: Seed runner script

**Files:**
- Create: `apps/cars-4by4-builder/scripts/seed.ts`
- Modify: `apps/cars-4by4-builder/package.json` (add `db:seed`, `tsx`)

- [ ] **Step 1: Create `scripts/seed.ts`**

```typescript
import { dbCars, parts } from "@smartekai/db";
import { seedParts } from "../src/seed/parts";

async function main() {
  console.log(`Seeding ${seedParts.length} parts...`);
  for (const part of seedParts) {
    await dbCars.insert(parts).values(part).onConflictDoUpdate({
      target: parts.id,
      set: part,
    });
  }
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the `db:seed` script and `tsx` devDependency**

In `apps/cars-4by4-builder/package.json`:

```json
    "db:seed": "tsx scripts/seed.ts",
```

```json
    "tsx": "^4.19.0",
```

- [ ] **Step 3: Install and run**

```bash
npm install
npm run db:seed --workspace=apps/cars-4by4-builder
```

Expected: `Seeding 26 parts...` / `Seed complete.` with no errors. (Requires Task 2's `packages/db` schema push to `DATABASE_NEONDB_SMARTEKAI` — run `DATABASE_URL="$DATABASE_NEONDB_SMARTEKAI" npx drizzle-kit push --config=drizzle.config.ts` from the repo root first if not already done.)

- [ ] **Step 4: Commit**

```bash
git add apps/cars-4by4-builder/scripts/seed.ts apps/cars-4by4-builder/package.json package-lock.json
git commit -m "feat(cars-4by4-builder): add db:seed runner script"
```

---

### Task 13: Step 1 — upgrade selection grid

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/queries.ts`
- Create: `apps/cars-4by4-builder/src/components/PartsSelectionGrid.tsx`
- Modify: `apps/cars-4by4-builder/src/routes/index.tsx`

- [ ] **Step 1: Create `src/lib/queries.ts`**

```typescript
import { createServerFn } from "@tanstack/react-start";
import { dbCars, parts } from "@smartekai/db";

export const getParts = createServerFn({ method: "GET" }).handler(async () => {
  return dbCars.select().from(parts);
});
```

- [ ] **Step 2: Create `src/components/PartsSelectionGrid.tsx`**

```typescript
import { useState } from "react";
import { Card, Button } from "@smartekai/ui";
import { cn } from "@/lib/utils";

type Part = {
  id: string;
  name: string;
  category: string;
  brand: string;
  priceUsd: string;
  imageUrl: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  front_bumper: "🛡️ Armor & Protection",
  wheels_tires: "🛞 Wheels & Tires",
  roof_tent: "⛺ Overlanding & Roof Gear",
  lighting: "💡 Off-Road Lighting & Extras",
  lift_kit: "🔧 Suspension & Lift",
};

export function PartsSelectionGrid({
  parts,
  selected,
  onChange,
}: {
  parts: Part[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categories = Array.from(new Set(parts.map((p) => p.category)));
  const visible = activeCategory ? parts.filter((p) => p.category === activeCategory) : parts;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={activeCategory === null ? "default" : "ghost"} onClick={() => setActiveCategory(null)}>
          All
        </Button>
        {categories.map((c) => (
          <Button key={c} size="sm" variant={activeCategory === c ? "default" : "ghost"} onClick={() => setActiveCategory(c)}>
            {CATEGORY_LABELS[c] ?? c}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {visible.map((part) => {
          const isSelected = selected.includes(part.id);
          return (
            <Card
              key={part.id}
              onClick={() => toggle(part.id)}
              className={cn("cursor-pointer p-3", isSelected && "ring-2 ring-primary")}
            >
              <p className="text-sm font-medium">{part.name}</p>
              <p className="text-xs text-muted-foreground">{part.brand}</p>
              <p className="mt-1 text-sm">${part.priceUsd}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `src/routes/index.tsx`** (replaces the Task 1 placeholder)

```typescript
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { PartsSelectionGrid } from "@/components/PartsSelectionGrid";
import { getParts } from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: async () => ({ parts: await getParts() }),
  component: Home,
});

function Home() {
  const { parts } = Route.useLoaderData();
  const [selected, setSelected] = useState<string[]>([]);
  const navigate = useNavigate();

  function handleContinue() {
    navigate({ to: "/upload", search: { parts: selected } });
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Step 1: Select Your Upgrades</h1>
      <div className="mt-4">
        <PartsSelectionGrid parts={parts} selected={selected} onChange={setSelected} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button disabled={selected.length === 0} onClick={handleContinue}>
          Continue ({selected.length} selected)
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
npm run lint --workspace=apps/cars-4by4-builder
```

Expected: both pass.

- [ ] **Step 5: Manual browser verification**

```bash
npm run dev --workspace=apps/cars-4by4-builder
```

Open `http://localhost:3002/`. Expected: 26 parts render across category filters, selecting cards highlights them, "Continue" is disabled until at least one is selected. Stop the dev server once confirmed. (`/upload` 404s until Task 14 — expected at this point.)

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/queries.ts apps/cars-4by4-builder/src/components/PartsSelectionGrid.tsx apps/cars-4by4-builder/src/routes/index.tsx
git commit -m "feat(cars-4by4-builder): add Step 1 upgrade selection grid"
```

---

### Task 14: Steps 2-4 — upload, validate, generate

**Files:**
- Create: `apps/cars-4by4-builder/src/components/PhotoDropzone.tsx`
- Create: `apps/cars-4by4-builder/src/components/Toast.tsx`
- Create: `apps/cars-4by4-builder/src/routes/upload.tsx`

- [ ] **Step 1: Create `src/components/Toast.tsx`** (`@smartekai/ui` has no `Toast`, per spec §2/§6)

```typescript
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
      {message}
      <button type="button" onClick={onDismiss} className="ml-3 underline">
        Dismiss
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/PhotoDropzone.tsx`**

```typescript
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function PhotoDropzone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelected(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex h-64 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 text-center",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Selected vehicle" className="h-full w-full object-contain" />
      ) : (
        <>
          <p className="font-medium">Drag & drop a photo of your 4x4</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Best results: 3/4 front-side angle or direct side profile, in daylight
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `src/routes/upload.tsx`**

```typescript
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { Toast } from "@/components/Toast";
import { generateBuild } from "@/lib/generate-build";

export const Route = createFileRoute("/upload")({
  validateSearch: (search: Record<string, unknown>): { parts: string[] } => ({
    parts: Array.isArray(search.parts) ? search.parts.map(String) : [],
  }),
  component: UploadStep,
});

function UploadStep() {
  const { parts } = Route.useSearch();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!file) return;
    setStatus("generating");
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("partIds", JSON.stringify(parts));

    const result = await generateBuild({ data: formData });
    if (result.status === "failed") {
      setError(result.validationError ?? "Something went wrong — try a different photo.");
      setStatus("error");
      return;
    }
    navigate({ to: "/builds/$sessionId", params: { sessionId: result.session!.id } });
  }

  if (status === "generating") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg">Generating your build…</p>
        <p className="text-sm text-muted-foreground">This can take up to 30 seconds.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Step 2: Upload Your Vehicle Photo</h1>
      <div className="mt-4">
        <PhotoDropzone onFileSelected={setFile} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button disabled={!file} onClick={handleGenerate}>
          Generate My Build
        </Button>
      </div>
      {status === "error" && error && <Toast message={error} onDismiss={() => setStatus("idle")} />}
    </main>
  );
}
```

- [ ] **Step 4: Regenerate routes and verify**

```bash
npm run generate-routes --workspace=apps/cars-4by4-builder
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 5: Manual verification against the real pipeline**

```bash
npm run dev --workspace=apps/cars-4by4-builder
```

Go through Step 1 → Step 2 with a real photo of an SUV/truck. Expected: "Generating…" for up to ~30s, then either navigation to `/builds/<id>` (Task 15 needed for that route to render — a 404 there is expected until then, but confirm the network tab shows a `completed` response from `generateBuild` with a `session.id`) or, with a non-vehicle photo, a toast with the rejection reason and no navigation.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/components/PhotoDropzone.tsx apps/cars-4by4-builder/src/components/Toast.tsx apps/cars-4by4-builder/src/routes/upload.tsx apps/cars-4by4-builder/src/routeTree.gen.ts
git commit -m "feat(cars-4by4-builder): add upload step wired to the generation pipeline"
```

---

## Phase 5: Report page

### Task 15: Before/after comparison slider

**Files:**
- Create: `apps/cars-4by4-builder/src/components/BeforeAfterSlider.tsx`

- [ ] **Step 1: Create `src/components/BeforeAfterSlider.tsx`** (local component — no comparison-slider library, per spec §6)

```typescript
import { useRef, useState } from "react";

export function BeforeAfterSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);

  function handleMove(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full select-none overflow-hidden rounded-md"
      onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <img src={afterUrl} alt="After" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 h-full overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeUrl} alt="Before" className="h-full w-full object-cover" style={{ width: `${100 / (position / 100 || 1)}%`, maxWidth: "none" }} />
      </div>
      <div
        className="absolute inset-y-0 w-1 cursor-ew-resize bg-white shadow-lg"
        style={{ left: `${position}%` }}
        onMouseDown={(e) => e.preventDefault()}
      />
    </div>
  );
}
```

The "before" image is clipped to `position`% width, then scaled back up by the inverse fraction so it still spans the full container width beneath the clip — a standard clip-reveal comparison technique.

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/components/BeforeAfterSlider.tsx
git commit -m "feat(cars-4by4-builder): add before/after comparison slider"
```

---

### Task 16: Fitment advisory notes (static, per-part)

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/advisories.ts`

- [ ] **Step 1: Create `src/lib/advisories.ts`** — per spec §7, static text keyed by category/difficulty, not a calculated model

```typescript
type Part = { category: string; fitmentDifficulty: string; name: string };

export type Advisory = { type: "warning" | "info"; message: string };

const CATEGORY_ADVISORIES: Record<string, string> = {
  front_bumper: "Adding front-mounted armor shifts weight forward — a heavy-duty front spring upgrade is commonly paired with this to restore ride height.",
  wheels_tires: "Larger tires may require a lift kit or wheel spacers to clear the fenders/cab mounts at full steering lock.",
  roof_tent: "Roof-mounted gear raises the center of gravity — drive conservatively at highway speed and in crosswinds.",
  lift_kit: "Suspension changes can affect factory alignment and headlight aim — a post-install alignment is recommended.",
};

export function getAdvisories(parts: Part[]): Advisory[] {
  const seenCategories = new Set<string>();
  const advisories: Advisory[] = [];

  for (const part of parts) {
    if (seenCategories.has(part.category)) continue;
    seenCategories.add(part.category);
    const message = CATEGORY_ADVISORIES[part.category];
    if (message) advisories.push({ type: "warning", message });
  }

  const customFab = parts.filter((p) => p.fitmentDifficulty === "Custom Fabrication");
  if (customFab.length > 0) {
    advisories.push({
      type: "info",
      message: `${customFab.map((p) => p.name).join(", ")} require${customFab.length === 1 ? "s" : ""} custom fabrication — budget extra shop time beyond the labor estimate.`,
    });
  }

  return advisories;
}
```

- [ ] **Step 2: Manual verification of the pure function**

```bash
npx tsx -e '
import { getAdvisories } from "./apps/cars-4by4-builder/src/lib/advisories.ts";
console.log(getAdvisories([
  { category: "front_bumper", fitmentDifficulty: "Minor Trimming", name: "ARB Summit Bull Bar" },
  { category: "wheels_tires", fitmentDifficulty: "Minor Trimming", name: "35\" Nitto Ridge Grapplers" },
  { category: "lighting", fitmentDifficulty: "Custom Fabrication", name: "Ironman 4x4 Snorkel" },
]));
'
```

Expected: 2 category warnings (front_bumper, wheels_tires — `lighting` has no entry in `CATEGORY_ADVISORIES`, so none for it) plus 1 info advisory naming the snorkel. If the output doesn't match, trace the category-lookup logic before proceeding.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/advisories.ts
git commit -m "feat(cars-4by4-builder): add static per-part fitment advisory notes"
```

---

### Task 17: `/builds/$sessionId` report route

**Files:**
- Create: `apps/cars-4by4-builder/src/routes/builds/$sessionId.tsx`
- Modify: `apps/cars-4by4-builder/src/lib/queries.ts` (add `getSession`)

- [ ] **Step 1: Add `getSession` to `src/lib/queries.ts`**

```typescript
import { eq, inArray } from "drizzle-orm";
import { dbCars, parts, upgradeSessions } from "@smartekai/db";

export const getSession = createServerFn({ method: "GET" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    const [session] = await dbCars.select().from(upgradeSessions).where(eq(upgradeSessions.id, sessionId));
    if (!session) throw new Error("Build not found");

    const sessionParts = session.selectedPartIds.length
      ? await dbCars.select().from(parts).where(inArray(parts.id, session.selectedPartIds))
      : [];

    return { session, parts: sessionParts };
  });
```

(Replace the existing `import { dbCars, parts } from "@smartekai/db";` at the top of the file with the combined import shown above, adding `upgradeSessions`.)

- [ ] **Step 2: Create `src/routes/builds/$sessionId.tsx`**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/lib/queries";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { getAdvisories } from "@/lib/advisories";

export const Route = createFileRoute("/builds/$sessionId")({
  loader: async ({ params }) => getSession({ data: params.sessionId }),
  head: ({ loaderData }) => ({
    meta: [
      { title: "My 4x4 Build" },
      { property: "og:image", content: loaderData?.session.transformedImageUrl ?? "" },
      { property: "og:title", content: "Check out my AI-generated 4x4 build" },
    ],
  }),
  component: BuildReport,
});

function BuildReport() {
  const { session, parts } = Route.useLoaderData();
  const advisories = getAdvisories(parts);
  const laborHours = parts.reduce((sum, p) => sum + Number(p.laborHoursEst), 0);
  const partsTotal = parts.reduce((sum, p) => sum + Number(p.priceUsd), 0);
  const laborCost = laborHours * 100;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Your AI-Generated Build</h1>

      {session.transformedImageUrl && (
        <div className="mt-4">
          <BeforeAfterSlider beforeUrl={session.originalImageUrl} afterUrl={session.transformedImageUrl} />
        </div>
      )}

      <section className="mt-6">
        <h2 className="font-medium">Itemized Quote</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Upgrade</th>
              <th className="py-1">Fitment</th>
              <th className="py-1 text-right">Labor</th>
              <th className="py-1 text-right">Price</th>
              <th className="py-1 text-right">Buy</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} className="border-b border-border">
                <td className="py-1">{part.name}</td>
                <td className="py-1">{part.fitmentDifficulty}</td>
                <td className="py-1 text-right">{part.laborHoursEst} hrs</td>
                <td className="py-1 text-right">${part.priceUsd}</td>
                <td className="py-1 text-right">
                  <a href={part.affiliateUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    View ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-col items-end text-sm">
          <span>Total Upgrades Cost: ${partsTotal.toFixed(2)}</span>
          <span>Estimated Installation ({laborHours} hrs @ $100/hr): ${laborCost.toFixed(2)}</span>
          <span className="font-semibold">Estimated Total Build: ${(partsTotal + laborCost).toFixed(2)}</span>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Fitment & Mechanical Advisory Notes</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {advisories.map((a, i) => (
            <li
              key={i}
              className={a.type === "warning" ? "rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive" : "rounded-md border border-border bg-muted p-2"}
            >
              {a.message}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
        >
          Share My Build
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Regenerate routes and verify**

```bash
npm run generate-routes --workspace=apps/cars-4by4-builder
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS. If `head`'s `loaderData` param shape doesn't match the installed `@tanstack/react-router` version's actual `head()` signature, check `node_modules/@tanstack/react-router/dist/esm/**/*.d.ts` for `RouteOptions["head"]`.

- [ ] **Step 4: Manual browser verification**

Complete the full flow (select parts → upload a real photo → wait for generation) and confirm the report page shows the before/after slider (drag it and confirm the split point follows the cursor), the itemized quote table with correct totals, advisory notes matching the selected categories, and that "Share My Build" copies the URL.

- [ ] **Step 5: Commit**

```bash
git add "apps/cars-4by4-builder/src/routes/builds/\$sessionId.tsx" apps/cars-4by4-builder/src/lib/queries.ts apps/cars-4by4-builder/src/routeTree.gen.ts
git commit -m "feat(cars-4by4-builder): add /builds/\$sessionId report route"
```

---

### Task 18: PDF export

**Files:**
- Create: `apps/cars-4by4-builder/src/components/BuildReportPdf.tsx`
- Modify: `apps/cars-4by4-builder/src/routes/builds/$sessionId.tsx`
- Modify: `apps/cars-4by4-builder/package.json`

- [ ] **Step 1: Add the dependency**

```json
    "@react-pdf/renderer": "^4.1.0",
```

```bash
npm install
```

- [ ] **Step 2: Create `src/components/BuildReportPdf.tsx`**

```typescript
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 18, marginBottom: 12 },
  image: { width: "100%", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#eee" },
  sectionTitle: { fontSize: 14, marginTop: 16, marginBottom: 8 },
});

type Part = { id: string; name: string; priceUsd: string; laborHoursEst: string };

export function BuildReportPdf({
  renderUrl,
  parts,
  advisories,
}: {
  renderUrl: string;
  parts: Part[];
  advisories: { message: string }[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Your AI-Generated 4x4 Build</Text>
        <Image src={renderUrl} style={styles.image} />

        <Text style={styles.sectionTitle}>Itemized Quote</Text>
        {parts.map((part) => (
          <View key={part.id} style={styles.row}>
            <Text>{part.name}</Text>
            <Text>${part.priceUsd} | {part.laborHoursEst} hrs</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Fitment Notes</Text>
        {advisories.map((a, i) => (
          <Text key={i} style={{ marginBottom: 6 }}>
            {a.message}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Add the download link to the report route**

In `src/routes/builds/$sessionId.tsx`, add imports:

```typescript
import { PDFDownloadLink } from "@react-pdf/renderer";
import { BuildReportPdf } from "@/components/BuildReportPdf";
```

Add below the advisory `<section>`:

```typescript
      {session.transformedImageUrl && (
        <div className="mt-4">
          <PDFDownloadLink
            document={<BuildReportPdf renderUrl={session.transformedImageUrl} parts={parts} advisories={advisories} />}
            fileName="4x4-build-quote.pdf"
          >
            {({ loading }) => (loading ? "Preparing PDF…" : "Download PDF Quote")}
          </PDFDownloadLink>
        </div>
      )}
```

- [ ] **Step 4: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
npm run build --workspace=apps/cars-4by4-builder
```

Expected: both pass — `build` in particular surfaces any SSR incompatibility from `@react-pdf/renderer` immediately, since `PDFDownloadLink` renders through this server-rendered route.

- [ ] **Step 5: Manual browser verification**

Open a build report, click "Download PDF Quote", confirm a PDF downloads showing the generated render image, part list, and advisory notes.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/components/BuildReportPdf.tsx "apps/cars-4by4-builder/src/routes/builds/\$sessionId.tsx" apps/cars-4by4-builder/package.json package-lock.json
git commit -m "feat(cars-4by4-builder): add PDF quote export"
```

---

## Final gate

- [ ] **Run the full repo gate**

```bash
./scripts/gate.sh
```

Expected: `gate: PASSED`.

- [ ] **Full manual click-through** (per `AGENTS.md`'s validation strategy — no automated test suite substitutes for this)

`/` → select several upgrades across categories → `/upload` → upload a real photo of an SUV/truck → wait through generation → land on `/builds/<id>` → confirm the before/after slider, itemized quote, advisory notes, PDF download, and "Share My Build" all work → paste an invalid photo (e.g. a sedan or a blurry image) through the same flow and confirm the toast rejection instead of a broken generation attempt.
