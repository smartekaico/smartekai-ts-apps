# 4x4 Visualizer & Build Planner (cars-4by4-builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/cars-4by4-builder`, a public TanStack Start configurator app where a visitor picks one of 3 vehicles, adds ARB/Ironman-style accessories, sees live weight/cost impact, and gets a generated safety/suspension build report — end to end, against placeholder 3D assets and a hand-curated parts catalog.

**Architecture:** New app on the existing TanStack Start pattern (mirrors `apps/medical-os`). New `vehicles`/`parts`/`builds` tables plus a minimal, app-scoped Better Auth table family (`carsUsers`/`carsSessions`/`carsAccounts`/`carsVerifications`) live in the shared `packages/db/src/schema.ts`, physically stored in a new dedicated `dbCars` connection (`DATABASE_NEONDB_SMARTEKAI`). The app runs its own Better Auth instance against that connection — separate from the shared legal/medical instance in `packages/auth`. State for the configurator lives in the URL via TanStack Router search params. 3D placeholders are procedural R3F primitives, not binary assets.

**Tech Stack:** TanStack Start (Vite + Nitro), React 19, `@tanstack/react-router`, Drizzle ORM + Neon (via `@smartekai/db`), Better Auth (own instance, anonymous + email/password), `@react-three/fiber` + `@react-three/drei`, `@smartekai/ui` (Button/Card/Input/Label only), Tailwind, `@react-pdf/renderer`.

**Validation strategy:** This repo has no test suite (`AGENTS.md`: "test: none"). Every task's verification step is `npm run type-check` / `npm run lint` / `npm run build` (what `scripts/gate.sh` runs) plus, where the change is user-visible, an explicit manual dev-server check. There is no TDD red/green cycle here — there's nothing to run red.

**Reference check:** Tasks 5, 6, and 20 use TanStack Start server-function/server-route APIs (`createServerFn`, `createServerFileRoute`, `getWebRequest`) that are new to this repo — `medical-os` doesn't use them yet. If `npm run type-check` in those tasks reports an import/signature mismatch, check `node_modules/@tanstack/react-start/dist/**/*.d.ts` for the actual exported names/signatures in the installed version before changing anything else.

**Inherited quirk:** `packages/db/src/schema.ts` is one file pushed to three separate physical databases (`dbLegal`, `dbMedical`, now `dbCars`) via `drizzle-kit push` with `DATABASE_URL` swapped per target — this plan follows that existing pattern rather than introducing per-app schema files. It means `db:push` against `DATABASE_NEONDB_SMARTEKAI` also creates the legal/medical tables (empty) in the cars database, and a future `db:push` against the legal/medical databases will also create `vehicles`/`parts`/`builds`/`cars_user`/etc. there (empty). This is not a regression this plan introduces — it's how `dbLegal`/`dbMedical` already work today.

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
- Modify: `package.json:16-21` (root — add `dev:cars` script)

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
    "@smartekai/db": "*",
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

This mirrors `apps/medical-os/package.json` exactly, minus `@smartekai/ai`/`@smartekai/marketing`/medical-specific radix packages, plus `better-auth` (this app builds its own instance, not `@smartekai/auth`) and `@smartekai/db`. Port `3002` avoids colliding with `legal-os` (3001) and `medical-os` (3000).

- [ ] **Step 2: Create `vite.config.ts`** (copy of `apps/medical-os/vite.config.ts`, `@smartekai/ai` removed from the `ssr.external` list since this app doesn't use it)

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

- [ ] **Step 3: Create `tsconfig.json`** (identical to `apps/medical-os/tsconfig.json`)

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

- [ ] **Step 4: Create `tailwind.config.js`** (same shadcn CSS-variable token set as `medical-os`)

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
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
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

- [ ] **Step 6: Create `eslint.config.js`** (identical to `medical-os`)

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

- [ ] **Step 8: Create `components.json`** (kept for parity with `medical-os`; this app consumes `@smartekai/ui` rather than generating local shadcn components, so `aliases` just needs to resolve)

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
      { title: "4x4 Build Planner" },
      {
        name: "description",
        content: "Configure your 4x4 build, see the weight/cost impact, and get a safety report.",
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

- [ ] **Step 12: Create `src/routes/index.tsx`** (placeholder landing page — replaced with the real configurator entry point in Task 15)

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <h1 className="text-2xl font-semibold">4x4 Build Planner — coming soon</h1>
    </main>
  );
}
```

- [ ] **Step 13: Create `src/styles.css`** (identical token set to `medical-os`)

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

In `package.json`, add alongside the existing `dev:legal`/`dev:medical` entries:

```json
    "dev:cars": "turbo run dev --filter=cars-4by4-builder --output-logs=full",
```

- [ ] **Step 15: Install and generate the route tree**

```bash
npm install
npm run generate-routes --workspace=apps/cars-4by4-builder
```

Expected: `apps/cars-4by4-builder/src/routeTree.gen.ts` is created (auto-generated — do not hand-edit it going forward).

- [ ] **Step 16: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
npm run lint --workspace=apps/cars-4by4-builder
npm run build --workspace=apps/cars-4by4-builder
```

Expected: all three pass. `build` produces `apps/cars-4by4-builder/.output/`.

- [ ] **Step 17: Commit**

```bash
git add apps/cars-4by4-builder package.json
git commit -m "feat(cars-4by4-builder): scaffold TanStack Start app shell"
```

---

### Task 2: Add `vehicles`/`parts`/`builds` + cars-scoped auth tables to `packages/db`

**Files:**
- Modify: `packages/db/src/schema.ts` (append new section at end of file, before the `relations` exports)

- [ ] **Step 1: Append the new tables**

Add to the end of `packages/db/src/schema.ts` (after the last `pgTable` export, before any `relations(...)` blocks — keep those grouped together as the file already does):

```typescript
// ============================================
// CARS 4X4 BUILDER TABLES (dedicated DB — see dbCars in client.ts)
// ============================================

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(), // "lc300" | "wrangler-jl" | "tacoma"
  name: text("name").notNull(),
  make: text("make").notNull(),
  baseWeightKg: integer("base_weight_kg").notNull(),
  maxGvmKg: integer("max_gvm_kg").notNull(),
  maxDynamicRoofKg: integer("max_dynamic_roof_kg").notNull(),
  baseModelUrl: text("base_model_url").notNull(), // "placeholder:<shape>" for now
});

export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  partNumber: text("part_number").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "front_bumper" | "winch" | "roof_rack" | "rooftop_tent" | "suspension" | "side_step"
  compatibleVehicleIds: text("compatible_vehicle_ids").array().notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  weightKg: integer("weight_kg").notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  proxy3dModelUrl: text("proxy_3d_model_url"), // "placeholder:<shape>" for now
  affiliateUrl: text("affiliate_url").notNull(),
});

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

export const builds = pgTable("builds", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => carsUsers.id), // nullable — anonymous by default
  vehicleId: text("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  selectedPartIds: text("selected_part_ids").array().notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  totalWeightKg: integer("total_weight_kg").notNull(),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

`numeric` needs to be added to the existing top-of-file import from `drizzle-orm/pg-core` — check whether it's already imported (the file's current import list is `pgTable, text, timestamp, boolean, integer, jsonb, customType, index, serial`; `numeric` is not in it).

- [ ] **Step 2: Add the missing `numeric` import**

At the top of `packages/db/src/schema.ts`, change:

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

- [ ] **Step 3: Build the package and verify**

```bash
npm run build --workspace=packages/db
npm run type-check --workspace=packages/db
```

Expected: both pass, `packages/db/dist/schema.js`/`.d.ts` now include the new exports.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema.ts
git commit -m "feat(db): add vehicles/parts/builds and cars-scoped auth tables"
```

---

### Task 3: Add the `dbCars` connection

**Files:**
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/index.ts:2`

- [ ] **Step 1: Add the `dbCars` export to `client.ts`**

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Support separate databases per application
const legalSql = neon(
  process.env.DATABASE_LEGAL_URL ?? process.env.DATABASE_URL!,
);
const medicalSql = neon(
  process.env.DATABASE_MEDICAL_URL ?? process.env.DATABASE_URL!,
);
const carsSql = neon(process.env.DATABASE_NEONDB_SMARTEKAI!);

// Default database (uses DATABASE_URL or DATABASE_LEGAL_URL for backward compatibility)
const sql = neon(process.env.DATABASE_URL ?? process.env.DATABASE_LEGAL_URL!);

export const db = drizzle({ client: sql, schema });

// Dedicated database connections
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

### Task 4: Wire `DATABASE_NEONDB_SMARTEKAI` through turbo

**Files:**
- Modify: `turbo.json:3-9`

- [ ] **Step 1: Add the env var to `globalEnv`**

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
    "DATABASE_NEONDB_SMARTEKAI"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", ".output/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    }
  }
}
```

- [ ] **Step 2: Confirm the var is present locally**

```bash
grep -q '^DATABASE_NEONDB_SMARTEKAI=' .env.local && echo "present" || echo "MISSING — add it before Task 7's db:push"
```

This worktree may not carry `.env.local` (it's untracked, worktrees don't copy untracked files) — if missing, copy the line from the main checkout's `.env.local` (not from git; it's `never touch`/gitignored) before Task 7.

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore: add DATABASE_NEONDB_SMARTEKAI to turbo globalEnv"
```

---

### Task 5: App's own Better Auth instance + auth client

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/auth.ts`
- Create: `apps/cars-4by4-builder/src/lib/auth-client.ts`
- Modify: `apps/cars-4by4-builder/package.json` (dependencies)

- [ ] **Step 1: Add the anonymous-plugin dependency check**

`better-auth` (already in `package.json` from Task 1) ships `anonymous` under `better-auth/plugins` and `anonymousClient` under `better-auth/client/plugins` — no new package needed.

- [ ] **Step 2: Create `src/lib/auth.ts`**

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

No `sendResetPassword`/`sendVerificationEmail` callbacks — email verification and password reset aren't in MVP scope (spec §4/§8), so they're simply not configured rather than stubbed.

- [ ] **Step 3: Create `src/lib/auth-client.ts`**

```typescript
import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient()],
});
```

- [ ] **Step 4: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS. If it fails on the `better-auth/plugins` or `drizzleAdapter` import shapes, cross-check against `packages/auth/src/index.ts`'s working usage of the same imports first — that file's version of `better-auth` (`^1.5.6`, matching this app's `package.json`) is the known-good reference.

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/auth.ts apps/cars-4by4-builder/src/lib/auth-client.ts
git commit -m "feat(cars-4by4-builder): add dedicated Better Auth instance (anonymous + email/password)"
```

---

### Task 6: Auth API server route

**Files:**
- Create: `apps/cars-4by4-builder/src/routes/api/auth/$.ts`

- [ ] **Step 1: Create the catch-all server route**

```typescript
import { createServerFileRoute } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const ServerRoute = createServerFileRoute().methods({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
```

- [ ] **Step 2: Regenerate the route tree and verify**

```bash
npm run generate-routes --workspace=apps/cars-4by4-builder
npm run type-check --workspace=apps/cars-4by4-builder
npm run build --workspace=apps/cars-4by4-builder
```

Expected: all pass. Per the plan header's "Reference check" — if `createServerFileRoute` doesn't exist in the installed `@tanstack/react-start` version, `tsc` will name the actual available export from `@tanstack/react-start/server`'s type defs; use that instead.

- [ ] **Step 3: Manual verification**

```bash
npm run dev --workspace=apps/cars-4by4-builder &
sleep 3
curl -i http://localhost:3002/api/auth/ok
kill %1
```

Expected: a JSON/HTTP response from Better Auth (not a 404) — confirms the route is wired, even though `/ok` isn't a real Better Auth endpoint (any non-404 response, typically a 400/404-shaped JSON body *from Better Auth itself*, confirms `auth.handler` is receiving the request).

- [ ] **Step 4: Commit**

```bash
git add apps/cars-4by4-builder/src/routes/api/auth apps/cars-4by4-builder/src/routeTree.gen.ts
git commit -m "feat(cars-4by4-builder): wire Better Auth catch-all API route"
```

---

### Task 7: Push schema to `DATABASE_NEONDB_SMARTEKAI`

**Files:** none (operational task)

- [ ] **Step 1: Push the schema**

```bash
DATABASE_URL="$DATABASE_NEONDB_SMARTEKAI" npx drizzle-kit push --config=drizzle.config.ts
```

Run from the repo root (`drizzle.config.ts` lives there and points `schema` at `packages/db/src/schema.ts`). Confirm interactively that Drizzle's diff only proposes *creates* (new database, nothing to conflict with).

- [ ] **Step 2: Verify the new tables exist**

```bash
DATABASE_URL="$DATABASE_NEONDB_SMARTEKAI" npx drizzle-kit studio --config=drizzle.config.ts
```

Open the printed local URL, confirm `vehicles`, `parts`, `builds`, `cars_user`, `cars_session`, `cars_account`, `cars_verification` all appear (alongside the inherited legal/medical tables — expected per the plan header's "Inherited quirk" note). Stop the studio process when done.

- [ ] **Step 3: No commit** — this is a database-state change, not a file change.

---

### Task 8: Dockerfile + full gate check

**Files:**
- Create: `apps/cars-4by4-builder/Dockerfile`

- [ ] **Step 1: Create the Dockerfile** (identical pattern to `apps/medical-os/Dockerfile`)

```dockerfile
FROM node:22-alpine AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune cars-4by4-builder --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=cars-4by4-builder

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/cars-4by4-builder/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

- [ ] **Step 2: Run the full repo gate**

```bash
./scripts/gate.sh
```

Expected: `gate: PASSED`. This is the actual full-repo validation this repo relies on — typecheck, lint, build, secret scan, forbidden-paths check, across every workspace including the new app.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/Dockerfile
git commit -m "feat(cars-4by4-builder): add Dockerfile for Dokploy deployment"
```

---

## Phase 2: 3D pipeline against placeholders

### Task 9: Install R3F/drei/three

**Files:**
- Modify: `apps/cars-4by4-builder/package.json`

- [ ] **Step 1: Add dependencies**

In `apps/cars-4by4-builder/package.json`'s `dependencies`:

```json
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^9.0.0",
    "three": "^0.169.0",
```

`@react-three/fiber` v8 only supports React 18 — this repo pins React 19.2.8 everywhere (including this app's own `package.json` from Task 1), so it must be the v9 major, which targets React 19.

And in `devDependencies`:

```json
    "@types/three": "^0.169.0",
```

- [ ] **Step 2: Install and verify**

```bash
npm install
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/package.json package-lock.json
git commit -m "chore(cars-4by4-builder): add react-three-fiber/drei/three"
```

---

### Task 10: Placeholder shape config

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/placeholder-shapes.ts`

- [ ] **Step 1: Create the shape-lookup module**

```typescript
export type PlaceholderShape = "box" | "cylinder" | "wedge" | "plate";

/**
 * vehicles.baseModelUrl / parts.proxy3dModelUrl store "placeholder:<shape>"
 * until real GLB assets exist (see spec §5). This maps that sentinel to a
 * primitive R3F shape + rough dimensions/color so the canvas has something
 * concrete to render per vehicle/part today.
 */
export function parsePlaceholderShape(modelUrl: string): PlaceholderShape {
  const [, shape] = modelUrl.split(":");
  if (shape === "box" || shape === "cylinder" || shape === "wedge" || shape === "plate") {
    return shape;
  }
  return "box";
}

export const VEHICLE_PLACEHOLDER_DIMENSIONS: Record<string, [number, number, number]> = {
  lc300: [2, 1.2, 4.8],
  "wrangler-jl": [1.9, 1.4, 4.3],
  tacoma: [1.9, 1.3, 5.2],
};

export const PART_PLACEHOLDER_COLOR: Record<PlaceholderShape, string> = {
  box: "#7c7c7c",
  cylinder: "#4a4a4a",
  wedge: "#5c6b73",
  plate: "#3d3d3d",
};
```

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/placeholder-shapes.ts
git commit -m "feat(cars-4by4-builder): add placeholder-shape lookup for 3D canvas"
```

---

### Task 11: `VehicleCanvas` component (client-only boundary)

**Files:**
- Create: `apps/cars-4by4-builder/src/components/VehicleCanvas.tsx`

- [ ] **Step 1: Create the canvas component**

```typescript
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  VEHICLE_PLACEHOLDER_DIMENSIONS,
  PART_PLACEHOLDER_COLOR,
  parsePlaceholderShape,
} from "@/lib/placeholder-shapes";

type CanvasPart = {
  id: string;
  modelUrl: string;
  category: string;
};

function VehicleMesh({ vehicleId }: { vehicleId: string }) {
  const dims = VEHICLE_PLACEHOLDER_DIMENSIONS[vehicleId] ?? [2, 1.2, 4.5];
  return (
    <mesh position={[0, dims[1] / 2, 0]}>
      <boxGeometry args={dims} />
      <meshStandardMaterial color="#9ca3af" />
    </mesh>
  );
}

function PartMesh({ part, index }: { part: CanvasPart; index: number }) {
  const shape = parsePlaceholderShape(part.modelUrl);
  const color = PART_PLACEHOLDER_COLOR[shape];
  const offsetX = (index - 1) * 0.6;
  return (
    <mesh position={[offsetX, 1.6, 2.2]}>
      {shape === "cylinder" ? (
        <cylinderGeometry args={[0.2, 0.2, 0.5, 12]} />
      ) : (
        <boxGeometry args={[0.4, 0.3, 0.3]} />
      )}
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Scene({ vehicleId, parts }: { vehicleId: string; parts: CanvasPart[] }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <VehicleMesh vehicleId={vehicleId} />
      {parts.map((part, i) => (
        <PartMesh key={part.id} part={part} index={i} />
      ))}
      <gridHelper args={[20, 20]} />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </>
  );
}

/**
 * WebGL/Canvas APIs don't exist during SSR — mounting only after the
 * component commits on the client avoids a hydration mismatch.
 */
export function VehicleCanvas({ vehicleId, parts }: { vehicleId: string; parts: CanvasPart[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">Loading 3D view…</div>;
  }

  return (
    <Canvas camera={{ position: [4, 3, 6], fov: 45 }} className="h-full w-full">
      <Scene vehicleId={vehicleId} parts={parts} />
    </Canvas>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
npm run lint --workspace=apps/cars-4by4-builder
```

Expected: both pass. (`meshStandardMaterial`/`boxGeometry`/etc. as JSX intrinsics are typed by `@react-three/fiber`'s global JSX namespace augmentation, pulled in automatically once the package is imported anywhere in the app — no extra type import needed.)

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/components/VehicleCanvas.tsx
git commit -m "feat(cars-4by4-builder): add VehicleCanvas with client-only R3F boundary"
```

---

### Task 12: Wire the canvas into a `/configurator` route stub

**Files:**
- Create: `apps/cars-4by4-builder/src/routes/configurator.tsx`

- [ ] **Step 1: Create a minimal route rendering the canvas with a hardcoded vehicle**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { VehicleCanvas } from "@/components/VehicleCanvas";

export const Route = createFileRoute("/configurator")({
  component: ConfiguratorStub,
});

function ConfiguratorStub() {
  return (
    <main className="h-screen w-full">
      <VehicleCanvas vehicleId="lc300" parts={[]} />
    </main>
  );
}
```

This is deliberately a stub — Task 15 replaces it with the real search-param-driven configurator. Its only purpose here is to prove the 3D pipeline renders end to end before the catalog/state work builds on top of it.

- [ ] **Step 2: Regenerate routes and verify**

```bash
npm run generate-routes --workspace=apps/cars-4by4-builder
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Manual browser verification**

```bash
npm run dev --workspace=apps/cars-4by4-builder
```

Open `http://localhost:3002/configurator`. Expected: a gray box (the placeholder vehicle) on a grid, orbit-controllable with the mouse, no console errors, no SSR hydration warning. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add apps/cars-4by4-builder/src/routes/configurator.tsx apps/cars-4by4-builder/src/routeTree.gen.ts
git commit -m "feat(cars-4by4-builder): wire VehicleCanvas into /configurator stub"
```

---

## Phase 3: Catalog & configurator

### Task 13: Seed data — vehicles and parts

**Files:**
- Create: `apps/cars-4by4-builder/src/seed/vehicles.ts`
- Create: `apps/cars-4by4-builder/src/seed/parts.ts`

- [ ] **Step 1: Create `src/seed/vehicles.ts`**

```typescript
export const seedVehicles = [
  {
    id: "lc300",
    name: "Toyota Land Cruiser LC300",
    make: "Toyota",
    baseWeightKg: 2630,
    maxGvmKg: 3280,
    maxDynamicRoofKg: 100,
    baseModelUrl: "placeholder:box",
  },
  {
    id: "wrangler-jl",
    name: "Jeep Wrangler (JL)",
    make: "Jeep",
    baseWeightKg: 1930,
    maxGvmKg: 2495,
    maxDynamicRoofKg: 90,
    baseModelUrl: "placeholder:box",
  },
  {
    id: "tacoma",
    name: "Toyota Tacoma (3rd Gen)",
    make: "Toyota",
    baseWeightKg: 1980,
    maxGvmKg: 2665,
    maxDynamicRoofKg: 80,
    baseModelUrl: "placeholder:box",
  },
] as const;
```

- [ ] **Step 2: Create `src/seed/parts.ts`** (26 hand-curated parts across the 3 vehicles, categories matching the schema's `category` field)

```typescript
export const seedParts = [
  // Front bumpers
  { id: "arb-summit-lc300", partNumber: "3423130", name: "ARB Summit Bull Bar", category: "front_bumper", compatibleVehicleIds: ["lc300"], priceUsd: "2450.00", weightKg: 85, laborHoursEst: "3.5", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://arb4x4.com/products/summit-bull-bar-lc300" },
  { id: "arb-stealth-jl", partNumber: "3448050", name: "ARB StealthBar", category: "front_bumper", compatibleVehicleIds: ["wrangler-jl"], priceUsd: "1890.00", weightKg: 38, laborHoursEst: "2.0", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://arb4x4.com/products/stealthbar-jl" },
  { id: "arb-prerunner-tacoma", partNumber: "3921540", name: "ARB Pre-Runner Bumper", category: "front_bumper", compatibleVehicleIds: ["tacoma"], priceUsd: "1650.00", weightKg: 45, laborHoursEst: "2.5", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://arb4x4.com/products/pre-runner-bumper-tacoma" },
  { id: "ironman-deluxe-lc300", partNumber: "IBAR-002", name: "Ironman 4x4 Deluxe Bull Bar", category: "front_bumper", compatibleVehicleIds: ["lc300"], priceUsd: "1980.00", weightKg: 78, laborHoursEst: "3.0", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://ironman4x4.com/products/deluxe-bull-bar-lc300" },

  // Winches & recovery
  { id: "warn-vr-evo-10s", partNumber: "103252", name: "Warn VR EVO 10-S Winch", category: "winch", compatibleVehicleIds: ["lc300", "wrangler-jl", "tacoma"], priceUsd: "1050.00", weightKg: 32, laborHoursEst: "2.0", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://warn.com/products/vr-evo-10-s" },
  { id: "arb-tow-recovery-kit", partNumber: "ARB2170", name: "ARB Tow & Recovery Kit", category: "winch", compatibleVehicleIds: ["lc300", "wrangler-jl", "tacoma"], priceUsd: "320.00", weightKg: 12, laborHoursEst: "0.5", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://arb4x4.com/products/tow-recovery-kit" },
  { id: "smittybilt-x20-comp", partNumber: "98820", name: "Smittybilt X20 Comp Winch", category: "winch", compatibleVehicleIds: ["wrangler-jl", "tacoma"], priceUsd: "680.00", weightKg: 29, laborHoursEst: "2.0", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://smittybilt.com/products/x20-comp-winch" },

  // Roof platforms & rooftop tents
  { id: "arb-base-rack-slimline", partNumber: "BASE39BK", name: "ARB Base Rack (Slimline)", category: "roof_rack", compatibleVehicleIds: ["lc300", "tacoma"], priceUsd: "1120.00", weightKg: 28, laborHoursEst: "1.5", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://arb4x4.com/products/base-rack-slimline" },
  { id: "front-runner-slimline-ii", partNumber: "FRSL001", name: "Front Runner Slimline II Rack", category: "roof_rack", compatibleVehicleIds: ["wrangler-jl"], priceUsd: "980.00", weightKg: 24, laborHoursEst: "1.5", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://frontrunneroutfitters.com/products/slimline-ii" },
  { id: "arb-esperance-tent", partNumber: "ARBESPTENT2", name: "ARB Esperance Rooftop Tent", category: "rooftop_tent", compatibleVehicleIds: ["lc300", "wrangler-jl", "tacoma"], priceUsd: "2100.00", weightKg: 56, laborHoursEst: "1.0", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://arb4x4.com/products/esperance-rooftop-tent" },
  { id: "ironman-hardshell-tent", partNumber: "ITENTHS01", name: "Ironman 4x4 Hardshell Rooftop Tent", category: "rooftop_tent", compatibleVehicleIds: ["lc300", "tacoma"], priceUsd: "2450.00", weightKg: 62, laborHoursEst: "1.0", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://ironman4x4.com/products/hardshell-rooftop-tent" },

  // Suspension
  { id: "ome-bp51-lc300", partNumber: "BP51-LC300", name: "Old Man Emu BP-51 Suspension Kit", category: "suspension", compatibleVehicleIds: ["lc300"], priceUsd: "3200.00", weightKg: 40, laborHoursEst: "6.0", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://oldmanemu4x4.com/products/bp-51-lc300" },
  { id: "ome-foamcell-jl", partNumber: "FCP-JL", name: "OME Foam Cell Pro Suspension", category: "suspension", compatibleVehicleIds: ["wrangler-jl"], priceUsd: "1850.00", weightKg: 32, laborHoursEst: "5.0", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://oldmanemu4x4.com/products/foam-cell-pro-jl" },
  { id: "ironman-foam-cell-tacoma", partNumber: "IFC-TAC01", name: "Ironman 4x4 Foam Cell Suspension", category: "suspension", compatibleVehicleIds: ["tacoma"], priceUsd: "1620.00", weightKg: 30, laborHoursEst: "5.0", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://ironman4x4.com/products/foam-cell-tacoma" },
  { id: "arb-old-man-emu-heavy-lc300", partNumber: "OME-HD-LC300", name: "OME Heavy Constant Load Front Springs", category: "suspension", compatibleVehicleIds: ["lc300"], priceUsd: "480.00", weightKg: 18, laborHoursEst: "2.0", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://oldmanemu4x4.com/products/heavy-constant-load-springs-lc300" },

  // Side steps / rock sliders
  { id: "arb-rock-sliders-lc300", partNumber: "RS-LC300", name: "ARB Rock Sliders", category: "side_step", compatibleVehicleIds: ["lc300"], priceUsd: "890.00", weightKg: 34, laborHoursEst: "2.0", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://arb4x4.com/products/rock-sliders-lc300" },
  { id: "smittybilt-src-sliders-jl", partNumber: "SRC-JL", name: "Smittybilt SRC Side Armor", category: "side_step", compatibleVehicleIds: ["wrangler-jl"], priceUsd: "620.00", weightKg: 28, laborHoursEst: "1.5", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://smittybilt.com/products/src-side-armor-jl" },
  { id: "n-fab-nerf-tacoma", partNumber: "NF-TAC01", name: "N-Fab Nerf Step Bars", category: "side_step", compatibleVehicleIds: ["tacoma"], priceUsd: "540.00", weightKg: 22, laborHoursEst: "1.5", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://nfabusa.com/products/nerf-step-bars-tacoma" },
  { id: "arb-rock-sliders-tacoma", partNumber: "RS-TAC01", name: "ARB Rock Sliders", category: "side_step", compatibleVehicleIds: ["tacoma"], priceUsd: "870.00", weightKg: 33, laborHoursEst: "2.0", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://arb4x4.com/products/rock-sliders-tacoma" },
  { id: "ironman-side-steps-jl", partNumber: "ISS-JL01", name: "Ironman 4x4 Side Steps", category: "side_step", compatibleVehicleIds: ["wrangler-jl"], priceUsd: "410.00", weightKg: 19, laborHoursEst: "1.0", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://ironman4x4.com/products/side-steps-jl" },

  // Additional cross-vehicle accessories to round out the catalog
  { id: "arb-awning-2500", partNumber: "AWN2500", name: "ARB 2500mm Awning", category: "roof_rack", compatibleVehicleIds: ["lc300", "wrangler-jl", "tacoma"], priceUsd: "620.00", weightKg: 15, laborHoursEst: "0.5", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://arb4x4.com/products/2500mm-awning" },
  { id: "arb-fridge-freezer-63qt", partNumber: "10801602", name: "ARB 63QT Fridge Freezer", category: "roof_rack", compatibleVehicleIds: ["lc300", "wrangler-jl", "tacoma"], priceUsd: "1180.00", weightKg: 30, laborHoursEst: "0.5", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://arb4x4.com/products/63qt-fridge-freezer" },
  { id: "ironman-snorkel-lc300", partNumber: "ISNK-LC300", name: "Ironman 4x4 Snorkel", category: "front_bumper", compatibleVehicleIds: ["lc300"], priceUsd: "310.00", weightKg: 4, laborHoursEst: "2.5", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://ironman4x4.com/products/snorkel-lc300" },
  { id: "arb-underbody-armor-tacoma", partNumber: "UBA-TAC01", name: "ARB Underbody Armor Kit", category: "front_bumper", compatibleVehicleIds: ["tacoma"], priceUsd: "540.00", weightKg: 25, laborHoursEst: "2.0", proxy3dModelUrl: "placeholder:plate", affiliateUrl: "https://arb4x4.com/products/underbody-armor-tacoma" },
  { id: "smittybilt-recovery-jack-base", partNumber: "SRB-01", name: "Smittybilt Recovery Jack Base", category: "winch", compatibleVehicleIds: ["lc300", "wrangler-jl", "tacoma"], priceUsd: "95.00", weightKg: 3, laborHoursEst: "0.2", proxy3dModelUrl: "placeholder:box", affiliateUrl: "https://smittybilt.com/products/recovery-jack-base" },
  { id: "arb-air-locker-front", partNumber: "RD108", name: "ARB Air Locker (Front)", category: "suspension", compatibleVehicleIds: ["lc300", "wrangler-jl", "tacoma"], priceUsd: "890.00", weightKg: 8, laborHoursEst: "4.0", proxy3dModelUrl: "placeholder:cylinder", affiliateUrl: "https://arb4x4.com/products/air-locker-front" },
] as const;
```

26 parts, all 3 vehicles represented across all 6 categories.

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/seed
git commit -m "feat(cars-4by4-builder): add hand-curated vehicle and parts seed data"
```

---

### Task 14: Seed runner script

**Files:**
- Create: `apps/cars-4by4-builder/scripts/seed.ts`
- Modify: `apps/cars-4by4-builder/package.json` (add `db:seed` script)

- [ ] **Step 1: Create `scripts/seed.ts`**

```typescript
import { dbCars, vehicles, parts } from "@smartekai/db";
import { seedVehicles } from "../src/seed/vehicles";
import { seedParts } from "../src/seed/parts";

async function main() {
  console.log(`Seeding ${seedVehicles.length} vehicles...`);
  for (const vehicle of seedVehicles) {
    await dbCars.insert(vehicles).values(vehicle).onConflictDoUpdate({
      target: vehicles.id,
      set: vehicle,
    });
  }

  console.log(`Seeding ${seedParts.length} parts...`);
  for (const part of seedParts) {
    await dbCars
      .insert(parts)
      .values({ ...part, compatibleVehicleIds: [...part.compatibleVehicleIds] })
      .onConflictDoUpdate({
        target: parts.id,
        set: { ...part, compatibleVehicleIds: [...part.compatibleVehicleIds] },
      });
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the `db:seed` script**

In `apps/cars-4by4-builder/package.json`'s `scripts`:

```json
    "db:seed": "tsx scripts/seed.ts",
```

Add `tsx` to `devDependencies`:

```json
    "tsx": "^4.19.0",
```

- [ ] **Step 3: Install and run**

```bash
npm install
npm run db:seed --workspace=apps/cars-4by4-builder
```

Expected: `Seeding 3 vehicles...` / `Seeding 26 parts...` / `Seed complete.` with no errors.

- [ ] **Step 4: Verify against the database**

```bash
DATABASE_URL="$DATABASE_NEONDB_SMARTEKAI" npx drizzle-kit studio --config=drizzle.config.ts
```

Confirm `vehicles` has 3 rows and `parts` has 26 rows. Stop the studio process.

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/scripts/seed.ts apps/cars-4by4-builder/package.json package-lock.json
git commit -m "feat(cars-4by4-builder): add db:seed runner script"
```

---

### Task 15: Configurator route with URL search-param state

**Files:**
- Modify: `apps/cars-4by4-builder/src/routes/configurator.tsx` (replace the Task 12 stub)
- Create: `apps/cars-4by4-builder/src/lib/queries.ts`

- [ ] **Step 1: Create `src/lib/queries.ts`** (server functions fetching catalog data)

```typescript
import { createServerFn } from "@tanstack/react-start";
import { dbCars, vehicles, parts } from "@smartekai/db";

export const getVehicles = createServerFn({ method: "GET" }).handler(async () => {
  return dbCars.select().from(vehicles);
});

export const getPartsForVehicle = createServerFn({ method: "GET" })
  .validator((vehicleId: string) => vehicleId)
  .handler(async ({ data: vehicleId }) => {
    const allParts = await dbCars.select().from(parts);
    return allParts.filter((p) => p.compatibleVehicleIds.includes(vehicleId));
  });
```

- [ ] **Step 2: Replace `src/routes/configurator.tsx`**

```typescript
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { VehicleCanvas } from "@/components/VehicleCanvas";
import { getVehicles, getPartsForVehicle } from "@/lib/queries";

type ConfiguratorSearch = {
  vehicle: string;
  parts: string[];
};

export const Route = createFileRoute("/configurator")({
  validateSearch: (search: Record<string, unknown>): ConfiguratorSearch => ({
    vehicle: typeof search.vehicle === "string" ? search.vehicle : "lc300",
    parts: Array.isArray(search.parts) ? search.parts.map(String) : [],
  }),
  loaderDeps: ({ search }) => ({ vehicle: search.vehicle }),
  loader: async ({ deps }) => {
    const [allVehicles, availableParts] = await Promise.all([
      getVehicles(),
      getPartsForVehicle({ data: deps.vehicle }),
    ]);
    return { allVehicles, availableParts };
  },
  component: Configurator,
});

function Configurator() {
  const { vehicle: vehicleId, parts: selectedPartIds } = Route.useSearch();
  const { allVehicles, availableParts } = Route.useLoaderData();
  const navigate = Route.useNavigate();

  const vehicle = allVehicles.find((v) => v.id === vehicleId) ?? allVehicles[0];
  const selectedParts = useMemo(
    () => availableParts.filter((p) => selectedPartIds.includes(p.id)),
    [availableParts, selectedPartIds],
  );

  function togglePart(partId: string) {
    const next = selectedPartIds.includes(partId)
      ? selectedPartIds.filter((id) => id !== partId)
      : [...selectedPartIds, partId];
    navigate({ search: (prev) => ({ ...prev, parts: next }) });
  }

  function selectVehicle(nextVehicleId: string) {
    navigate({ search: { vehicle: nextVehicleId, parts: [] } });
  }

  return (
    <main className="flex h-screen w-full">
      <div className="w-[70%]">
        <VehicleCanvas
          vehicleId={vehicle.id}
          parts={selectedParts.map((p) => ({ id: p.id, modelUrl: p.proxy3dModelUrl ?? "placeholder:box", category: p.category }))}
        />
      </div>
      <aside className="flex w-[30%] flex-col gap-4 overflow-y-auto border-l border-border p-4">
        <select
          className="rounded-md border border-input bg-background p-2"
          value={vehicle.id}
          onChange={(e) => selectVehicle(e.target.value)}
        >
          {allVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <ul className="flex flex-col gap-2">
          {availableParts.map((part) => (
            <li key={part.id} className="flex items-center justify-between rounded-md border border-border p-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPartIds.includes(part.id)}
                  onChange={() => togglePart(part.id)}
                />
                <span>{part.name}</span>
              </label>
              <span className="text-sm text-muted-foreground">
                ${part.priceUsd} · +{part.weightKg}kg
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
```

This is a functional first pass — Task 16 replaces the flat `<ul>` with a category-grouped panel and the mobile drawer, Task 17 adds the running-total bar. Keeping this task's scope to "state is correct and round-trips through the URL" first.

- [ ] **Step 3: Regenerate routes and verify**

```bash
npm run generate-routes --workspace=apps/cars-4by4-builder
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS. Per the plan header's "Reference check" — if `createServerFn`'s `.validator()`/`.handler()` shape doesn't match the installed version, check `node_modules/@tanstack/react-start/dist/esm/client/createServerFn.d.ts`.

- [ ] **Step 4: Manual browser verification**

```bash
npm run dev --workspace=apps/cars-4by4-builder
```

Open `http://localhost:3002/configurator`. Expected: vehicle dropdown works, checking a part adds it to the URL (`?vehicle=lc300&parts=arb-summit-lc300`), a matching box appears near the vehicle mesh, switching vehicles clears selected parts and resets the URL. Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/src/routes/configurator.tsx apps/cars-4by4-builder/src/lib/queries.ts apps/cars-4by4-builder/src/routeTree.gen.ts
git commit -m "feat(cars-4by4-builder): drive configurator state from URL search params"
```

---

### Task 16: Category-grouped parts panel + mobile drawer

**Files:**
- Create: `apps/cars-4by4-builder/src/components/PartsPanel.tsx`
- Create: `apps/cars-4by4-builder/src/components/MobileDrawer.tsx`
- Modify: `apps/cars-4by4-builder/src/routes/configurator.tsx`

- [ ] **Step 1: Create `src/components/PartsPanel.tsx`**

```typescript
import { useState } from "react";
import { Button } from "@smartekai/ui";
import { cn } from "@/lib/utils";

type Part = {
  id: string;
  name: string;
  category: string;
  priceUsd: string;
  weightKg: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  front_bumper: "Front Bumpers",
  winch: "Winches & Recovery",
  roof_rack: "Roof Platforms",
  rooftop_tent: "Rooftop Tents",
  suspension: "Suspension",
  side_step: "Side Steps",
};

export function PartsPanel({
  parts,
  selectedPartIds,
  onToggle,
}: {
  parts: Part[];
  selectedPartIds: string[];
  onToggle: (partId: string) => void;
}) {
  const categories = Array.from(new Set(parts.map((p) => p.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            size="sm"
            variant={category === activeCategory ? "default" : "ghost"}
            onClick={() => setActiveCategory(category)}
          >
            {CATEGORY_LABELS[category] ?? category}
          </Button>
        ))}
      </div>
      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {parts
          .filter((p) => p.category === activeCategory)
          .map((part) => {
            const selected = selectedPartIds.includes(part.id);
            return (
              <li key={part.id}>
                <button
                  type="button"
                  onClick={() => onToggle(part.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border p-2 text-left",
                    selected ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <span>{part.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${part.priceUsd} · +{part.weightKg}kg
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/MobileDrawer.tsx`** (local slide-over — `@smartekai/ui` has no `Sheet`, per spec §6)

```typescript
import { useEffect } from "react";
import { Button } from "@smartekai/ui";

export function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex w-[85%] max-w-sm flex-col bg-background p-4 shadow-xl">
        <div className="mb-2 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire both into `configurator.tsx`**

Replace the `<aside>` block in `Configurator()` (from Task 15) with:

```typescript
  const [drawerOpen, setDrawerOpen] = useState(false);

  const partsPanel = (
    <PartsPanel
      parts={availableParts}
      selectedPartIds={selectedPartIds}
      onToggle={togglePart}
    />
  );

  return (
    <main className="flex h-screen w-full">
      <div className="relative w-full md:w-[70%]">
        <VehicleCanvas
          vehicleId={vehicle.id}
          parts={selectedParts.map((p) => ({ id: p.id, modelUrl: p.proxy3dModelUrl ?? "placeholder:box", category: p.category }))}
        />
        <div className="absolute bottom-4 left-4 md:hidden">
          <Button onClick={() => setDrawerOpen(true)}>Parts ({selectedPartIds.length})</Button>
        </div>
      </div>
      <aside className="hidden w-[30%] flex-col gap-4 overflow-y-auto border-l border-border p-4 md:flex">
        <select
          className="rounded-md border border-input bg-background p-2"
          value={vehicle.id}
          onChange={(e) => selectVehicle(e.target.value)}
        >
          {allVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        {partsPanel}
      </aside>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {partsPanel}
      </MobileDrawer>
    </main>
  );
```

Add `useState` to the existing `useMemo` import from `"react"`, and add imports:

```typescript
import { useMemo, useState } from "react";
import { Button } from "@smartekai/ui";
import { PartsPanel } from "@/components/PartsPanel";
import { MobileDrawer } from "@/components/MobileDrawer";
```

Remove the now-superseded flat `<ul>` block from Task 15.

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

At desktop width: category buttons switch the visible parts list, selecting a part highlights it. Resize below `768px` (Tailwind's `md` breakpoint): the sidebar disappears, a "Parts (N)" button appears over the canvas, clicking it opens the drawer with the same category-filtered list, Escape and the backdrop both close it. Stop the dev server once confirmed.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/components/PartsPanel.tsx apps/cars-4by4-builder/src/components/MobileDrawer.tsx apps/cars-4by4-builder/src/routes/configurator.tsx
git commit -m "feat(cars-4by4-builder): category-grouped parts panel + mobile drawer"
```

---

### Task 17: Running total bar + live weight/cost calculation

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/build-totals.ts`
- Modify: `apps/cars-4by4-builder/src/routes/configurator.tsx`

- [ ] **Step 1: Create `src/lib/build-totals.ts`**

```typescript
type Part = { priceUsd: string; weightKg: number };
type Vehicle = { maxGvmKg: number };

export function calculateTotals(vehicle: Vehicle, selectedParts: Part[]) {
  const totalCost = selectedParts.reduce((sum, p) => sum + Number(p.priceUsd), 0);
  const totalWeightKg = selectedParts.reduce((sum, p) => sum + p.weightKg, 0);
  const payloadUsedPct = Math.round((totalWeightKg / vehicle.maxGvmKg) * 100);
  return { totalCost, totalWeightKg, payloadUsedPct };
}
```

- [ ] **Step 2: Quick manual verification of the pure function** (no test framework in this repo — this is the closest equivalent to a red/green check)

```bash
npx tsx -e '
import { calculateTotals } from "./apps/cars-4by4-builder/src/lib/build-totals.ts";
const result = calculateTotals({ maxGvmKg: 3280 }, [{ priceUsd: "2450.00", weightKg: 85 }, { priceUsd: "1050.00", weightKg: 32 }]);
console.log(result);
'
```

Expected output: `{ totalCost: 3500, totalWeightKg: 117, payloadUsedPct: 4 }` (117/3280 rounds to 4%). If the numbers don't match this hand-calculation, the function has a bug — fix before proceeding.

- [ ] **Step 3: Add the running-total bar to `configurator.tsx`**

Add the import:

```typescript
import { calculateTotals } from "@/lib/build-totals";
```

Inside `Configurator()`, after `selectedParts` is computed:

```typescript
  const totals = calculateTotals(vehicle, selectedParts);
```

Wrap the existing `return (<main>...)` block's children with a bottom bar — change the outer `<main>` to a flex column containing the existing row plus a new footer:

```typescript
  return (
    <div className="flex h-screen w-full flex-col">
      <main className="flex flex-1 overflow-hidden">
        {/* ...unchanged canvas + aside + drawer from Task 16... */}
      </main>
      <footer className="flex items-center justify-between border-t border-border bg-background p-3 text-sm">
        <span>Running Total: ${totals.totalCost.toFixed(2)}</span>
        <span>
          Payload Used: {totals.payloadUsedPct}%
          {totals.payloadUsedPct > 50 && <span className="ml-1 text-destructive">⚠</span>}
        </span>
      </footer>
    </div>
  );
```

- [ ] **Step 4: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 5: Manual browser verification**

Confirm the footer's running total and payload percentage update immediately as parts are toggled, and the warning mark appears once payload exceeds 50%.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/build-totals.ts apps/cars-4by4-builder/src/routes/configurator.tsx
git commit -m "feat(cars-4by4-builder): add live weight/cost running-total bar"
```

---

## Phase 4: Build report & recommendations

### Task 18: `generateRecommendations` pure function

**Files:**
- Create: `apps/cars-4by4-builder/src/lib/recommendations.ts`

- [ ] **Step 1: Create the rule-engine function** (unchanged from the SOP — spec §7 confirmed this section already fits)

```typescript
type Vehicle = { maxGvmKg: number; maxDynamicRoofKg: number };
type Part = { category: string; weightKg: number };

export type Recommendation = {
  type: "warning" | "danger" | "success";
  message: string;
};

export function generateRecommendations(vehicle: Vehicle, selectedParts: Part[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const frontWeight = selectedParts
    .filter((p) => ["front_bumper", "winch"].includes(p.category))
    .reduce((sum, p) => sum + p.weightKg, 0);

  const roofWeight = selectedParts
    .filter((p) => ["roof_rack", "rooftop_tent"].includes(p.category))
    .reduce((sum, p) => sum + p.weightKg, 0);

  const totalAdded = selectedParts.reduce((sum, p) => sum + p.weightKg, 0);

  if (frontWeight >= 70) {
    recommendations.push({
      type: "warning",
      message: `Front-end load increased by +${frontWeight}kg. Upgraded heavy-duty front coil springs are strongly advised to restore factory ride height and headlight alignment.`,
    });
  }

  if (roofWeight > vehicle.maxDynamicRoofKg * 0.85) {
    recommendations.push({
      type: "danger",
      message: `Roof load (${roofWeight}kg) is approaching maximum dynamic limit (${vehicle.maxDynamicRoofKg}kg). High center-of-gravity may increase body roll during off-camber maneuvers.`,
    });
  }

  const gvmPercentage = Math.round((totalAdded / vehicle.maxGvmKg) * 100);
  if (gvmPercentage > 50) {
    recommendations.push({
      type: "warning",
      message: `Accessories consume ${gvmPercentage}% of your remaining payload capacity before adding passengers, fuel, or cargo. Consider a certified GVM suspension upgrade.`,
    });
  }

  return recommendations;
}
```

- [ ] **Step 2: Manual verification of all three rules**

```bash
npx tsx -e '
import { generateRecommendations } from "./apps/cars-4by4-builder/src/lib/recommendations.ts";
const vehicle = { maxGvmKg: 3280, maxDynamicRoofKg: 100 };
const parts = [
  { category: "front_bumper", weightKg: 85 },
  { category: "winch", weightKg: 32 },
  { category: "roof_rack", weightKg: 28 },
  { category: "rooftop_tent", weightKg: 56 },
];
console.log(generateRecommendations(vehicle, parts));
'
```

Expected: 3 recommendations — frontWeight = 117 (≥70, warning), roofWeight = 84 (> 100*0.85=85? 84 is NOT > 85, so no danger this time — recompute: 84 > 85 is false, so the roof rule should NOT fire). If it fires, the filter/threshold logic has a bug — trace it against this hand-calculation before moving on. totalAdded = 201, gvmPercentage = round(201/3280*100) = 6% (not > 50%, no warning). So expected result with these exact inputs: **only the front-axle warning fires** — 1 recommendation, not 3. Verify the actual output matches this before proceeding.

- [ ] **Step 3: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/recommendations.ts
git commit -m "feat(cars-4by4-builder): add build recommendation rule engine"
```

---

### Task 19: `/builds/$buildId` report route

**Files:**
- Create: `apps/cars-4by4-builder/src/routes/builds/$buildId.tsx`
- Modify: `apps/cars-4by4-builder/src/lib/queries.ts` (add `getBuild`)

- [ ] **Step 1: Add `getBuild` to `src/lib/queries.ts`**

```typescript
import { eq, inArray } from "drizzle-orm";

export const getBuild = createServerFn({ method: "GET" })
  .validator((buildId: string) => buildId)
  .handler(async ({ data: buildId }) => {
    const [build] = await dbCars.select().from(builds).where(eq(builds.id, buildId));
    if (!build) throw new Error("Build not found");

    const [vehicle] = await dbCars.select().from(vehicles).where(eq(vehicles.id, build.vehicleId));
    const buildParts = build.selectedPartIds.length
      ? await dbCars.select().from(parts).where(inArray(parts.id, build.selectedPartIds))
      : [];

    return { build, vehicle, parts: buildParts };
  });
```

Add `builds` to the existing `@smartekai/db` import at the top of the file:

```typescript
import { dbCars, vehicles, parts, builds } from "@smartekai/db";
```

- [ ] **Step 2: Create `src/routes/builds/$buildId.tsx`**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { getBuild } from "@/lib/queries";
import { generateRecommendations } from "@/lib/recommendations";

export const Route = createFileRoute("/builds/$buildId")({
  loader: async ({ params }) => getBuild({ data: params.buildId }),
  component: BuildReport,
});

function BuildReport() {
  const { build, vehicle, parts } = Route.useLoaderData();
  const recommendations = generateRecommendations(vehicle, parts);
  const laborHours = parts.reduce((sum, p) => sum + Number(p.laborHoursEst), 0);
  const laborCost = laborHours * 100;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Final Build Report</h1>
      <p className="text-muted-foreground">{vehicle.name}</p>

      <section className="mt-6">
        <h2 className="font-medium">Itemization (BOM)</h2>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} className="border-b border-border">
                <td className="py-1">{part.name}</td>
                <td className="py-1 text-right">${part.priceUsd}</td>
                <td className="py-1 text-right">{part.weightKg} kg</td>
                <td className="py-1 text-right">{part.laborHoursEst} hrs</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-col items-end text-sm">
          <span>Subtotal Parts: ${build.totalCost}</span>
          <span>Total Added Weight: {build.totalWeightKg} kg</span>
          <span>Est. Labor ({laborHours} hrs @ $100/hr): ${laborCost.toFixed(2)}</span>
          <span className="font-semibold">
            Estimated Total: ${(Number(build.totalCost) + laborCost).toFixed(2)}
          </span>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Mechanical & Safety Recommendations</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {recommendations.map((rec, i) => (
            <li
              key={i}
              className={
                rec.type === "danger"
                  ? "rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive"
                  : "rounded-md border border-border bg-muted p-2"
              }
            >
              {rec.message}
            </li>
          ))}
          {recommendations.length === 0 && (
            <li className="text-muted-foreground">No safety concerns detected for this build.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Regenerate routes and verify**

```bash
npm run generate-routes --workspace=apps/cars-4by4-builder
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/cars-4by4-builder/src/routes/builds apps/cars-4by4-builder/src/lib/queries.ts apps/cars-4by4-builder/src/routeTree.gen.ts
git commit -m "feat(cars-4by4-builder): add /builds/\$buildId report route"
```

---

### Task 20: `saveBuild` server function

**Files:**
- Modify: `apps/cars-4by4-builder/src/lib/queries.ts` (add `saveBuild`)
- Modify: `apps/cars-4by4-builder/src/routes/configurator.tsx` (wire the "Save Build" action)

- [ ] **Step 1: Add `saveBuild` to `src/lib/queries.ts`**

```typescript
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const saveBuild = createServerFn({ method: "POST" })
  .validator((data: { vehicleId: string; partIds: string[]; totalCost: number; totalWeightKg: number }) => data)
  .handler(async ({ data }) => {
    const { headers } = getWebRequest();
    const session = await auth.api.getSession({ headers });

    const [inserted] = await dbCars
      .insert(builds)
      .values({
        id: crypto.randomUUID(),
        userId: session?.user.id ?? null,
        vehicleId: data.vehicleId,
        selectedPartIds: data.partIds,
        totalCost: data.totalCost.toFixed(2),
        totalWeightKg: data.totalWeightKg,
        isPublic: true,
      })
      .returning();

    return inserted;
  });
```

- [ ] **Step 2: Wire it into the configurator's footer**

In `configurator.tsx`, add the import:

```typescript
import { saveBuild } from "@/lib/queries";
import { useNavigate } from "@tanstack/react-router";
```

Inside `Configurator()`, add a handler and button:

```typescript
  const appNavigate = useNavigate();

  async function handleSave() {
    const result = await saveBuild({
      data: {
        vehicleId: vehicle.id,
        partIds: selectedPartIds,
        totalCost: totals.totalCost,
        totalWeightKg: totals.totalWeightKg,
      },
    });
    appNavigate({ to: "/builds/$buildId", params: { buildId: result.id } });
  }
```

Add a button to the `<footer>` from Task 17, alongside the existing totals:

```typescript
        <Button onClick={handleSave}>View Full Build Report</Button>
```

(Import `Button` from `@smartekai/ui` if not already imported in this file from Task 16.)

- [ ] **Step 3: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS. Per the plan header's "Reference check" — if `getWebRequest` isn't exported from `@tanstack/react-start/server` in the installed version, check that module's `.d.ts` for the actual name (likely candidates: `getWebRequest`, `getRequest`).

- [ ] **Step 4: Manual browser verification**

Select a vehicle and a few parts, click "View Full Build Report", confirm it navigates to `/builds/<uuid>` and the report shows the same parts/totals just configured.

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/queries.ts apps/cars-4by4-builder/src/routes/configurator.tsx
git commit -m "feat(cars-4by4-builder): save build and navigate to its report"
```

---

### Task 21: PDF export

**Files:**
- Create: `apps/cars-4by4-builder/src/components/BuildReportPdf.tsx`
- Modify: `apps/cars-4by4-builder/src/routes/builds/$buildId.tsx` (add download button)
- Modify: `apps/cars-4by4-builder/package.json` (add `@react-pdf/renderer`)

- [ ] **Step 1: Add the dependency**

In `dependencies`:

```json
    "@react-pdf/renderer": "^4.1.0",
```

```bash
npm install
```

- [ ] **Step 2: Create `src/components/BuildReportPdf.tsx`**

```typescript
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#555", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#eee" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  sectionTitle: { fontSize: 14, marginTop: 20, marginBottom: 8 },
});

type Part = { id: string; name: string; priceUsd: string; weightKg: number; laborHoursEst: string };
type Vehicle = { name: string };
type Recommendation = { type: string; message: string };

export function BuildReportPdf({
  vehicle,
  parts,
  totalCost,
  totalWeightKg,
  recommendations,
}: {
  vehicle: Vehicle;
  parts: Part[];
  totalCost: string;
  totalWeightKg: number;
  recommendations: Recommendation[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Final Build Report</Text>
        <Text style={styles.subtitle}>{vehicle.name}</Text>

        <Text style={styles.sectionTitle}>Itemization (BOM)</Text>
        {parts.map((part) => (
          <View key={part.id} style={styles.row}>
            <Text>{part.name}</Text>
            <Text>
              ${part.priceUsd} | {part.weightKg}kg | {part.laborHoursEst}hrs
            </Text>
          </View>
        ))}
        <View style={styles.totals}>
          <Text>Subtotal Parts: ${totalCost}</Text>
          <Text>Total Added Weight: {totalWeightKg}kg</Text>
        </View>

        <Text style={styles.sectionTitle}>Recommendations</Text>
        {recommendations.length === 0 && <Text>No safety concerns detected for this build.</Text>}
        {recommendations.map((rec, i) => (
          <Text key={i} style={{ marginBottom: 6 }}>
            [{rec.type.toUpperCase()}] {rec.message}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Add a download link to the report route**

In `src/routes/builds/$buildId.tsx`, add imports:

```typescript
import { PDFDownloadLink } from "@react-pdf/renderer";
import { BuildReportPdf } from "@/components/BuildReportPdf";
```

Add below the recommendations `<section>` in `BuildReport()`:

```typescript
      <div className="mt-6">
        <PDFDownloadLink
          document={
            <BuildReportPdf
              vehicle={vehicle}
              parts={parts}
              totalCost={build.totalCost}
              totalWeightKg={build.totalWeightKg}
              recommendations={recommendations}
            />
          }
          fileName={`${vehicle.name.replace(/\s+/g, "-").toLowerCase()}-build-report.pdf`}
        >
          {({ loading }) => (loading ? "Preparing PDF…" : "Download PDF Report")}
        </PDFDownloadLink>
      </div>
```

`PDFDownloadLink` renders client-side only — since this whole route already runs through a server-rendered loader, verify in Step 5 that it doesn't error during SSR (React PDF's renderer is browser/Node-canvas-dependent; if SSR throws, wrap this block in the same `mounted`-after-effect pattern used in `VehicleCanvas`, Task 11).

- [ ] **Step 4: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
npm run build --workspace=apps/cars-4by4-builder
```

Expected: both pass — `build` in particular will surface any SSR incompatibility from `@react-pdf/renderer` immediately.

- [ ] **Step 5: Manual browser verification**

Open a build report page, click "Download PDF Report", confirm a PDF downloads with the correct vehicle name, part list, and recommendations. If Step 4's build fails on `@react-pdf/renderer`, apply the client-only-mount wrapper noted in Step 3 and re-run Step 4.

- [ ] **Step 6: Commit**

```bash
git add apps/cars-4by4-builder/src/components/BuildReportPdf.tsx apps/cars-4by4-builder/src/routes/builds/\$buildId.tsx apps/cars-4by4-builder/package.json package-lock.json
git commit -m "feat(cars-4by4-builder): add PDF build report export"
```

---

### Task 22: Affiliate link-out

**Files:**
- Modify: `apps/cars-4by4-builder/src/routes/builds/$buildId.tsx`

- [ ] **Step 1: Add per-part affiliate links and an "Order All" section**

Add `affiliateUrl` to the `getBuild` server function's returned part shape — it's already selected via `dbCars.select().from(parts)` (no query change needed, the column is already on the table).

In the BOM table row (from Task 19), add a link cell:

```typescript
                <td className="py-1 text-right">
                  <a href={part.affiliateUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Buy
                  </a>
                </td>
```

Add a table header row above `<tbody>` reflecting the new column (Part / Price / Weight / Labor / Buy), and add an "Order All" block after the totals `<div>`:

```typescript
      <div className="mt-4 flex flex-wrap gap-2">
        {parts.map((part) => (
          <a
            key={part.id}
            href={part.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-2 py-1 text-sm text-primary underline"
          >
            {part.name} ↗
          </a>
        ))}
      </div>
```

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Manual browser verification**

Confirm each "Buy"/part link opens the correct `affiliateUrl` in a new tab.

- [ ] **Step 4: Commit**

```bash
git add "apps/cars-4by4-builder/src/routes/builds/\$buildId.tsx"
git commit -m "feat(cars-4by4-builder): add affiliate link-out on build report"
```

---

## Phase 5: Save/claim flow

### Task 23: Anonymous session bootstrap

**Files:**
- Modify: `apps/cars-4by4-builder/src/routes/__root.tsx`

- [ ] **Step 1: Sign in anonymously on first load if no session exists**

Add to `src/routes/__root.tsx`:

```typescript
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
```

Change `RootDocument` to bootstrap a session client-side:

```typescript
function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data) {
        authClient.signIn.anonymous();
      }
    });
  }, []);

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

Every visitor gets an anonymous `carsUsers` row + session on first page load, so `saveBuild` (Task 20) always has a `session.user.id` to attach even before the visitor explicitly signs up.

- [ ] **Step 2: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 3: Manual browser verification**

Open the app in a fresh incognito window, then check the cars database (`drizzle-kit studio` against `DATABASE_NEONDB_SMARTEKAI`) — confirm a new row appeared in `cars_user` with `is_anonymous = true` and a matching `cars_session` row.

- [ ] **Step 4: Commit**

```bash
git add apps/cars-4by4-builder/src/routes/__root.tsx
git commit -m "feat(cars-4by4-builder): bootstrap anonymous session on first load"
```

---

### Task 24: Save-and-claim UI

**Files:**
- Create: `apps/cars-4by4-builder/src/components/ClaimAccountForm.tsx`
- Modify: `apps/cars-4by4-builder/src/routes/builds/$buildId.tsx`

- [ ] **Step 1: Create `src/components/ClaimAccountForm.tsx`**

```typescript
import { useState } from "react";
import { Button, Input, Label } from "@smartekai/ui";
import { authClient } from "@/lib/auth-client";

export function ClaimAccountForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const { error } = await authClient.signUp.email({ email, password, name: email.split("@")[0] });
    setStatus(error ? "error" : "done");
  }

  if (status === "done") {
    return <p className="text-sm text-muted-foreground">Account created — this build is now linked to your account.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-sm">Save this build to your account:</p>
      <Label htmlFor="claim-email">Email</Label>
      <Input id="claim-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Label htmlFor="claim-password">Password</Label>
      <Input id="claim-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : "Create Account"}
      </Button>
      {status === "error" && <p className="text-sm text-destructive">Something went wrong — try again.</p>}
    </form>
  );
}
```

`authClient.signUp.email` upgrades the visitor's existing anonymous session in place (Better Auth's anonymous plugin links the anonymous user's data to the new credentialed account on sign-up) — the build row's `userId`, set during Task 20's `saveBuild` from that same anonymous session, stays valid with no extra linking step needed.

- [ ] **Step 2: Add it to the build report route**

In `src/routes/builds/$buildId.tsx`, import and render it near the top:

```typescript
import { ClaimAccountForm } from "@/components/ClaimAccountForm";
```

```typescript
      <div className="mt-4">
        <ClaimAccountForm />
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Save a build, land on its report, fill out the claim form with a test email/password, submit. Confirm `status` flips to "done" and a `cars_account` row with `providerId: "credential"` now exists for that user (via `drizzle-kit studio`).

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/src/components/ClaimAccountForm.tsx "apps/cars-4by4-builder/src/routes/builds/\$buildId.tsx"
git commit -m "feat(cars-4by4-builder): add save-and-claim account form"
```

---

### Task 25: `isPublic` toggle + share link

**Files:**
- Modify: `apps/cars-4by4-builder/src/lib/queries.ts` (add `setBuildVisibility`)
- Modify: `apps/cars-4by4-builder/src/routes/builds/$buildId.tsx`

- [ ] **Step 1: Add `setBuildVisibility` to `src/lib/queries.ts`**

```typescript
export const setBuildVisibility = createServerFn({ method: "POST" })
  .validator((data: { buildId: string; isPublic: boolean }) => data)
  .handler(async ({ data }) => {
    await dbCars.update(builds).set({ isPublic: data.isPublic }).where(eq(builds.id, data.buildId));
    return { ok: true };
  });
```

- [ ] **Step 2: Add the toggle and copy-link button to the report route**

In `src/routes/builds/$buildId.tsx`:

```typescript
import { useState } from "react";
import { setBuildVisibility } from "@/lib/queries";
```

Inside `BuildReport()`:

```typescript
  const [isPublic, setIsPublic] = useState(build.isPublic ?? true);
  const [copied, setCopied] = useState(false);

  async function togglePublic() {
    const next = !isPublic;
    setIsPublic(next);
    await setBuildVisibility({ data: { buildId: build.id, isPublic: next } });
  }

  function copyShareLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
```

Add UI near the top of the rendered output:

```typescript
      <div className="mt-2 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={togglePublic} />
          Public build
        </label>
        <Button size="sm" variant="outline" onClick={copyShareLink}>
          {copied ? "Copied!" : "Share Link"}
        </Button>
      </div>
```

(Import `Button` from `@smartekai/ui` if not already imported in this file.)

- [ ] **Step 3: Verify**

```bash
npm run type-check --workspace=apps/cars-4by4-builder
```

Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Toggle the checkbox, confirm `isPublic` flips in `drizzle-kit studio`. Click "Share Link", confirm the button reads "Copied!" briefly and the URL is on the clipboard (paste it somewhere to check).

- [ ] **Step 5: Commit**

```bash
git add apps/cars-4by4-builder/src/lib/queries.ts "apps/cars-4by4-builder/src/routes/builds/\$buildId.tsx"
git commit -m "feat(cars-4by4-builder): add build visibility toggle and share link"
```

---

## Final gate

- [ ] **Run the full repo gate one more time**

```bash
./scripts/gate.sh
```

Expected: `gate: PASSED`.

- [ ] **Full manual click-through** (per `AGENTS.md`'s validation strategy — no automated test suite substitutes for this)

Starting from `/`: land on the placeholder homepage → `/configurator` → pick each of the 3 vehicles in turn, add/remove parts, confirm the canvas and running total update → save a build → confirm the report page's BOM/recommendations/PDF download/affiliate links all work → claim the build with a test account → toggle visibility and copy the share link.
