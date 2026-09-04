# Medical OS: Next.js → TanStack Start Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Next.js with TanStack Start in `apps/medical-os`, keeping Turborepo unchanged, with zero behavior change to the app's routes/UI/API contracts.

**Architecture:** File-based TanStack Router routes under `apps/medical-os/src/routes/` replace the Next App Router tree under `src/app/`; the two Next API routes become TanStack Start server routes; Vite + Nitro (`node-server` preset) replace the Next build/runtime. `@smartekai/marketing`'s one `next/link` import is replaced with a plain `<a>` so it keeps working for both Legal OS (still on Next.js) and Medical OS.

**Tech Stack:** `@tanstack/react-router` 1.170.x, `@tanstack/react-start` 1.168.x, `nitro` 3.0.260610-beta (node-server preset), Vite 8.2.x, Tailwind CSS v3 (kept — not upgraded to the CLI's default v4), `@fontsource-variable/inter`, ESLint 9 (`@tanstack/eslint-config`), Turborepo (unchanged), Neon Postgres + Drizzle Kit (unchanged, untouched).

Spec: `docs/superpowers/specs/2026-09-01-medical-os-tanstack-start-migration-design.md`

---

## Before you start

All commands below run from the monorepo root (`/Users/ar/Desktop/Web Development/smartekai-saas`) unless a step says otherwise. Every "run type-check" step means:

```bash
npx turbo run type-check --filter=medical-os
```

Every "run dev smoke test" step means: start `npm run dev --workspace medical-os` in the background, `curl` the relevant path(s), then stop the dev server. The dev server runs on port 3000 (matches the app's current Next.js port).

**Key fact used throughout this plan (verified by actually building and running it):** TanStack Start's Nitro `node-server` build output (`.output/`) is fully self-contained — it runs with `node .output/server/index.mjs` and needs **no** `node_modules` at runtime. This was confirmed by copying only the `.output` directory to an empty folder and running the server successfully from there.

## File Structure

**Create:**
- `apps/medical-os/vite.config.ts`
- `apps/medical-os/tsr.config.json`
- `apps/medical-os/eslint.config.js`
- `apps/medical-os/.cta.json`
- `apps/medical-os/Dockerfile`
- `apps/medical-os/src/router.tsx`
- `apps/medical-os/src/styles.css` (moved from `src/app/globals.css`)
- `apps/medical-os/src/routes/__root.tsx`
- `apps/medical-os/src/routes/index.tsx`
- `apps/medical-os/src/routes/workspace/route.tsx`
- `apps/medical-os/src/routes/workspace/index.tsx`
- `apps/medical-os/src/routes/workspace/sessions/$id.tsx`
- `apps/medical-os/src/routes/api/generate-soap.ts`
- `apps/medical-os/src/routes/api/transcribe.ts`
- `apps/medical-os/src/routeTree.gen.ts` (auto-generated — you run a command, you don't hand-write it; committed to git, see note in Task 3)

**Modify:**
- `turbo.json` (build outputs)
- `.gitignore` (new TanStack Start build artifacts)
- `packages/marketing/src/index.tsx` (drop `next/link`)
- `packages/marketing/package.json` (drop `next` dependency)
- `apps/medical-os/package.json` (scripts + dependencies)
- `apps/medical-os/tsconfig.json` (drop Next-specific config)
- `apps/medical-os/tailwind.config.js` (content globs + font)
- `apps/medical-os/src/components/dashboard/MedicalSidebar.tsx` (`next/link`/`next/navigation` → TanStack Router / plain `<a>`)
- `apps/medical-os/src/components/dashboard/MedicalDashboard.tsx` (`next/link` → plain `<a>`)

**Delete (Task 9, after everything above is ported and verified):**
- `apps/medical-os/src/app/` (entire directory)
- `apps/medical-os/next.config.js`
- `apps/medical-os/next-env.d.ts`

---

### Task 1: Root monorepo config

**Files:**
- Modify: `turbo.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add TanStack Start's build output to `turbo.json`'s cached outputs**

In `turbo.json`, change the `build` task's `outputs`:

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "globalEnv": [
    "DATABASE_URL",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "GOOGLE_AI_API_KEY",
    "DEEPGRAM_API_KEY",
    "CRW_INTERNAL_URL"
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

Only the `outputs` array changed (added `.output/**`). Legal OS still needs `.next/**` — do not remove it.

- [ ] **Step 2: Add TanStack Start build artifacts to `.gitignore`**

Append a new section to `.gitignore` (after the existing `# next.js` block):

```
# tanstack start
.output/
.nitro/
.vinxi/
.tanstack/
```

Note these are **not** anchored with a leading `/` (unlike the existing `/.next/` entry), so they correctly ignore these directories at any depth, e.g. `apps/medical-os/.output/`. (The existing `/.next/` entry is anchored to the repo root and does NOT match `apps/medical-os/.next/` or `apps/legal-os/.next/` — this is a pre-existing repo issue, out of scope for this migration; don't fix it here, just don't repeat the mistake for the new tool.)

- [ ] **Step 3: Commit**

```bash
git add turbo.json .gitignore
git commit -m "chore: prep turborepo config for TanStack Start build output"
```

---

### Task 2: Fix `@smartekai/marketing`'s `next/link` dependency

**Files:**
- Modify: `packages/marketing/src/index.tsx`
- Modify: `packages/marketing/package.json`

This package is shared by both `legal-os` (staying on Next.js) and `medical-os` (migrating). A plain `<a>` tag works identically in both, so this fix is framework-neutral and doesn't need to wait for the rest of the migration.

- [ ] **Step 1: Remove the `next/link` import**

In `packages/marketing/src/index.tsx`, delete this line:

```tsx
import Link from "next/link";
```

- [ ] **Step 2: Replace every `<Link>` usage with a plain `<a>`**

All 8 usages in this file only use `href`, `className`, `children`, `key`, and (once) `onClick` — no Next-specific props — so this is a mechanical tag rename. Replace every opening `<Link` with `<a` and every closing `</Link>` with `</a>`. The `href` prop name does not change (a plain `<a>` uses `href` natively).

Verify no `<Link` or `</Link>` remain:

```bash
grep -n "<Link\|</Link>" packages/marketing/src/index.tsx
```

Expected: no output.

- [ ] **Step 3: Drop the `next` dependency**

In `packages/marketing/package.json`, remove this line from `dependencies`:

```json
    "next": "16.2.4",
```

- [ ] **Step 4: Verify Legal OS still type-checks with this change**

```bash
npx turbo run type-check --filter=legal-os --filter=@smartekai/marketing
```

Expected: PASS (no Next-specific `Link` props were used, so nothing breaks).

- [ ] **Step 5: Commit**

```bash
git add packages/marketing/src/index.tsx packages/marketing/package.json
git commit -m "fix(marketing): replace next/link with plain anchor tag

Makes the shared marketing package framework-neutral so it works for
both the Next.js legal-os app and the TanStack Start medical-os app."
```

---

### Task 3: Bootstrap the TanStack Start toolchain in Medical OS

**Files:**
- Create: `apps/medical-os/vite.config.ts`
- Create: `apps/medical-os/tsr.config.json`
- Create: `apps/medical-os/eslint.config.js`
- Create: `apps/medical-os/.cta.json`
- Create: `apps/medical-os/src/router.tsx`
- Create: `apps/medical-os/src/styles.css`
- Create: `apps/medical-os/src/routes/__root.tsx`
- Create: `apps/medical-os/src/routes/index.tsx`
- Create: `apps/medical-os/src/routeTree.gen.ts` (auto-generated, see Step 8)
- Modify: `apps/medical-os/package.json`
- Modify: `apps/medical-os/tsconfig.json`
- Modify: `apps/medical-os/tailwind.config.js`

This task stands up the whole toolchain and gets the root route (`/`) working end to end before touching `/workspace` or the API routes. **Do not delete `src/app/` or remove the `next` npm dependency yet** — those stay until Task 9, because `src/app/**` still imports `next/link`, `next/navigation`, and `next/server`, and removing the `next` package now would break `type-check` on files we haven't ported yet. The Next.js app becomes dead code (unreachable — Vite only scans `src/routes/`) the moment we swap the scripts in Step 3, but it must stay *typecheckable* until Task 9.

- [ ] **Step 1: Run the TanStack CLI into a scratch directory to confirm current tool versions**

This mirrors what was already done during planning — re-run it so the versions you install match what's verified in this plan (the CLI resolves to "latest" at install time, so pin the exact versions below rather than trusting `latest` in your own `package.json`):

```bash
npx --yes @tanstack/cli create medical-os-scratch \
  --framework react \
  --deployment nitro \
  --toolchain eslint \
  --no-examples \
  --no-git \
  --target-dir /tmp/medical-os-scratch
```

Expected: completes without error, produces `/tmp/medical-os-scratch/` with `package.json`, `vite.config.ts`, `tsr.config.json`, `eslint.config.js`, `.cta.json`, `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`. You will adapt (not copy verbatim) these into `apps/medical-os` in the steps below, because the scratch scaffold defaults to Tailwind v4 and includes a devtools/theme-toggle starter UI that Medical OS doesn't have today — this plan keeps Medical OS on its existing Tailwind v3 setup and drops the extra starter chrome to stay a pure framework swap.

- [ ] **Step 2: Create `apps/medical-os/.cta.json`**

```json
{
  "projectName": "medical-os",
  "mode": "file-router",
  "typescript": true,
  "tailwind": true,
  "packageManager": "npm",
  "git": false,
  "install": true,
  "intent": true,
  "addOnOptions": {},
  "projectPreset": "default",
  "includeExamples": false,
  "routerOnly": false,
  "version": 1,
  "framework": "react",
  "chosenAddOns": ["eslint", "nitro"]
}
```

This is the CLI's state file, kept alongside the app so future changes can go through `npx @tanstack/cli add` instead of hand-editing config.

- [ ] **Step 3: Update `apps/medical-os/package.json`**

Remove this line from `dependencies`:

```json
    "next": "16.2.4",
```

Add these to `dependencies` (keep everything else in `dependencies` exactly as it is, including `better-auth` and `drizzle-orm` which are currently unused — that's a pre-existing condition, not something this migration should touch):

```json
    "@tanstack/react-router": "^1.170.32",
    "@tanstack/react-start": "^1.168.49",
    "@fontsource-variable/inter": "^5.3.0",
    "nitro": "3.0.260610-beta",
```

(`nitro` is pinned exact, no `^`, because it's a beta prerelease version — semver caret ranges resolve unpredictably against prerelease tags.)

Add these to `devDependencies` (keep `@types/node`, `@types/react`, `autoprefixer`, `tailwindcss` exactly as they are — Tailwind stays on v3):

```json
    "@tanstack/router-cli": "^1.167.33",
    "@tanstack/eslint-config": "^0.4.0",
    "@vitejs/plugin-react": "^6.1.1",
    "eslint": "^9.39.5",
    "vite": "^8.2.2",
```

Change the `typescript` devDependency from `"^5.0.0"` to `"^6.0.3"`. This intentionally diverges from the rest of the monorepo (which stays on TypeScript 5) — `@tanstack/react-router`'s tooling resolved and built cleanly against TypeScript 6 during verification, and npm workspaces allow per-package version pins. Reconciling this is future work for whenever Legal OS migrates too, not a blocker here.

Update the `scripts` block:

```json
  "scripts": {
    "build": "vite build",
    "dev": "vite dev --port 3000",
    "start": "node .output/server/index.mjs",
    "generate-routes": "tsr generate",
    "lint": "eslint",
    "type-check": "tsc --noEmit"
  },
```

- [ ] **Step 4: Replace `apps/medical-os/tsconfig.json`**

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

Changes from the original: dropped `"plugins": [{"name": "next"}]` (Next's editor-only TS plugin) and the Next-specific `include` entries (`next-env.d.ts`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`). Added `"types": ["vite/client"]` — this is required for the `import appCss from "../styles.css?url"` pattern used in `__root.tsx` (Task 3, Step 7) to type-check; without it, `?url` imports have no ambient type declaration.

> **Correction (found during a 2026-09-02 validation pass, after `typescript` had already moved to `^6.0.3`): no `baseUrl`.** The version above originally included `"baseUrl": "."`, which now fails `tsc --noEmit` with `TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0` — this is a genuine TypeScript 6 behavior change, not a typo in this plan. Verified fix: drop `baseUrl` entirely. With `moduleResolution: "bundler"`, `paths` resolves relative to the tsconfig file's own directory without it — confirmed by editing the actual file, running `tsc --noEmit` clean, then reverting the test edit. The JSON block above already has `baseUrl` removed; if you're working from an older copy of this plan or from `git show` history, drop that line.

- [ ] **Step 5: Create `apps/medical-os/tsr.config.json`**

```json
{
  "target": "react"
}
```

- [ ] **Step 6: Create `apps/medical-os/eslint.config.js`**

```js
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
    ignores: ["eslint.config.js"],
  },
];
```

(Dropped the scratch scaffold's `pnpm/json-enforce-catalog` rule override — this repo uses npm workspaces, not pnpm, so that rule doesn't apply here.)

- [ ] **Step 7: Create `apps/medical-os/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [nitro(), tanstackStart(), viteReact()],
});
```

No Tailwind Vite plugin here — Tailwind v3 runs through the existing `postcss.config.js` (which Vite picks up automatically), not through `@tailwindcss/vite` (that's the v4-only plugin). No devtools plugin — Medical OS doesn't have a devtools/theme-toggle UI today and this migration isn't adding one.

- [ ] **Step 8: Move `globals.css` to `src/styles.css` and update the font**

Move the file:

```bash
git mv apps/medical-os/src/app/globals.css apps/medical-os/src/styles.css
```

Content stays the same (shadcn CSS variables, `@tailwind` directives) — no edits needed to this file's contents.

- [ ] **Step 9: Update `apps/medical-os/tailwind.config.js`**

Change the `content` array and add a `fontFamily` override:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
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

Removed `./src/app/**/*.{...}` and `./src/pages/**/*.{...}` (neither exists after this migration) and added `./src/routes/**/*.{...}`. Added `fontFamily.sans` so that applying Tailwind's `font-sans` utility class uses Inter (replacing `next/font/google`'s `Inter({ subsets: ["latin"] })`, which was applied via a generated class on `<body>`).

- [ ] **Step 10: Create `apps/medical-os/src/router.tsx`**

```tsx
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

- [ ] **Step 11: Create `apps/medical-os/src/routes/__root.tsx`**

```tsx
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import "@fontsource-variable/inter";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smartek AI Medical OS" },
      {
        name: "description",
        content: "AI-powered medical documentation platform",
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

This replaces `src/app/layout.tsx`'s `<html>`/`<body>` shell, `metadata` export (title/description), and `next/font/google` Inter loading. No Header/Footer/devtools/theme-toggle — the current app has none of those, so none are added here.

- [ ] **Step 12: Create `apps/medical-os/src/routes/index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import {
  MarketingFooter,
  MarketingHeader,
  MarketingHero,
  PlatformValueSection,
  ProductShowcase,
  SecuritySection,
} from "@smartekai/marketing";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader
        logoText="SmarTekAI Medical OS"
        ctaLabel="Open Medical Workspace"
        ctaHref="/workspace"
        loginHref="/workspace"
        loginLabel="Workspace"
      />
      <MarketingHero
        badge="Medical OS • Non-i18n product shell"
        title="Clinical documentation"
        highlight="powered by the shared core."
        description="Medical OS now uses the shared marketing package while staying a simple English-only app shell. The product app can focus on SOAP generation, transcription, and clinical workflows instead of duplicating platform UI."
        primaryCta={{ label: "Open Medical Workspace", href: "/workspace" }}
        secondaryCta={{ label: "View shared products", href: "#products" }}
      />
      <PlatformValueSection />
      <ProductShowcase initialProduct="medical" />
      <SecuritySection />
      <MarketingFooter
        logoText="SmarTekAI Medical OS"
        productLinks={[
          { label: "Medical Workspace", href: "/workspace" },
          { label: "SOAP Generation", href: "/api/generate-soap" },
          { label: "Transcription API", href: "/api/transcribe" },
        ]}
        companyLinks={[
          { label: "Platform", href: "#platform" },
          { label: "Products", href: "#products" },
          { label: "Security", href: "#security" },
        ]}
      />
    </main>
  );
}
```

This is a direct port of `src/app/page.tsx` — same JSX, wrapped in `createFileRoute("/")` instead of being a default-exported page component.

- [ ] **Step 13: Install dependencies and generate the route tree**

```bash
npm install
npm run generate-routes --workspace medical-os
```

Expected: `npm install` completes cleanly, and `apps/medical-os/src/routeTree.gen.ts` is created. Open it and confirm it contains a `'/'` route pointing at `./routes/index`.

`routeTree.gen.ts` is committed to git (not gitignored), even though it's auto-generated — this keeps `type-check` runnable from a fresh clone without requiring a build step first. Every later task that adds a route re-runs `generate-routes` and re-commits this file.

- [ ] **Step 14: Run dev smoke test**

```bash
npm run dev --workspace medical-os &
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
kill %1
```

Expected: `HTTP 200`.

- [ ] **Step 15: Run type-check**

```bash
npx turbo run type-check --filter=medical-os
```

Expected: PASS. (`src/app/**` still imports `next/*` — that's fine, `next` is still an installed dependency at this point.)

- [ ] **Step 16: Commit**

```bash
git add apps/medical-os/vite.config.ts apps/medical-os/tsr.config.json \
  apps/medical-os/eslint.config.js apps/medical-os/.cta.json \
  apps/medical-os/package.json apps/medical-os/tsconfig.json \
  apps/medical-os/tailwind.config.js apps/medical-os/src/router.tsx \
  apps/medical-os/src/styles.css apps/medical-os/src/routes/__root.tsx \
  apps/medical-os/src/routes/index.tsx apps/medical-os/src/routeTree.gen.ts \
  package-lock.json
git commit -m "feat(medical-os): bootstrap TanStack Start toolchain, port marketing home route"
```

---

### Task 4: Port the workspace dashboard (layout + index route)

**Files:**
- Create: `apps/medical-os/src/routes/workspace/route.tsx`
- Create: `apps/medical-os/src/routes/workspace/index.tsx`
- Modify: `apps/medical-os/src/components/dashboard/MedicalSidebar.tsx`
- Modify: `apps/medical-os/src/components/dashboard/MedicalDashboard.tsx`

`workspace/route.tsx` is a **layout route** — verified empirically during planning (built a real route tree with this exact structure and confirmed `/workspace` and `/workspace/sessions/$id` both resolved correctly). A file at `routes/workspace/route.tsx` creates a layout at `/workspace` that wraps child routes via `<Outlet />`; `routes/workspace/index.tsx` is the exact-match child rendered at `/workspace`.

Neither `MedicalSidebar.tsx` nor `MedicalDashboard.tsx` needs the `Link`/`to`/`params` API — all of their link targets work correctly as full-page navigations too (confirmed: `curl http://localhost:3000/workspace` in Task 3 was itself a full "cold" request, not a client-side transition, and it resolved correctly), so every `Link` becomes a plain `<a>`, exactly like the `@smartekai/marketing` fix in Task 2. Only `usePathname` needs a real hook replacement (no plain-HTML equivalent exists for "what's the current path").

- [ ] **Step 1: Create `apps/medical-os/src/routes/workspace/route.tsx`**

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MedicalSidebar } from "@/components/dashboard/MedicalSidebar";

export const Route = createFileRoute("/workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return (
    <SidebarProvider
      defaultOpen={true}
      className="h-svh w-full overflow-hidden"
      style={
        {
          "--sidebar-width": "256px",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <MedicalSidebar />
      <SidebarInset className="bg-[#F6F6F9] overflow-hidden flex flex-col min-w-0 relative">
        <main className="flex-1 overflow-y-auto relative min-w-0">
          <div className="h-full w-full mx-auto min-w-0">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

This is `src/app/workspace/layout.tsx` ported: same JSX, `{children}` becomes `<Outlet />` (TanStack Router's equivalent for "render the matched child route here"), and the `"use client"` directive is dropped (that's a Next.js Server/Client Components concept with no equivalent or requirement in TanStack Start — the CLI-generated example files never use it).

- [ ] **Step 2: Create `apps/medical-os/src/routes/workspace/index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { MedicalDashboard } from "@/components/dashboard/MedicalDashboard";

export const Route = createFileRoute("/workspace/")({
  component: MedicalDashboard,
});
```

This is `src/app/workspace/page.tsx` ported.

- [ ] **Step 3: Fix `MedicalSidebar.tsx`**

Replace the import line:

```tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
```

with:

```tsx
import { useRouterState } from "@tanstack/react-router";
```

Replace the hook call:

```tsx
const pathname = usePathname();
```

with:

```tsx
const pathname = useRouterState({ select: (state) => state.location.pathname });
```

Then replace every `<Link` with `<a` and every `</Link>` with `</a>` (all 4 usages in this file: the logo, the "New Session" quick action, and the two `.map()` loops). `href` prop names stay unchanged. Verify:

```bash
grep -n "<Link\|</Link>\|next/" apps/medical-os/src/components/dashboard/MedicalSidebar.tsx
```

Expected: no output.

- [ ] **Step 4: Fix `MedicalDashboard.tsx`**

Remove the import line:

```tsx
import Link from "next/link";
```

Replace every `<Link` with `<a` and every `</Link>` with `</a>` (5 usages: 3 stat-card links, 1 "View all sessions" link, 2 FAB links — 6 total, recount by grepping). `href` prop names stay unchanged. Verify:

```bash
grep -n "<Link\|</Link>\|next/" apps/medical-os/src/components/dashboard/MedicalDashboard.tsx
```

Expected: no output.

- [ ] **Step 5: Regenerate routes**

```bash
npm run generate-routes --workspace medical-os
```

Confirm `routeTree.gen.ts` now includes `/workspace` and `/workspace/`.

- [ ] **Step 6: Run dev smoke test**

```bash
npm run dev --workspace medical-os &
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/workspace
kill %1
```

Expected: `HTTP 200`.

- [ ] **Step 7: Run type-check**

```bash
npx turbo run type-check --filter=medical-os
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/medical-os/src/routes/workspace apps/medical-os/src/routeTree.gen.ts \
  apps/medical-os/src/components/dashboard/MedicalSidebar.tsx \
  apps/medical-os/src/components/dashboard/MedicalDashboard.tsx
git commit -m "feat(medical-os): port workspace dashboard route and sidebar"
```

---

### Task 5: Port the session detail route

**Files:**
- Create: `apps/medical-os/src/routes/workspace/sessions/$id.tsx`

`useParams`/`useRouter` from `next/navigation` have no plain-HTML equivalent — this file genuinely needs TanStack Router's real hooks: `Route.useParams()` (route-scoped, typed) and `useNavigate()` (confirmed against current TanStack Router docs during planning).

- [ ] **Step 1: Create `apps/medical-os/src/routes/workspace/sessions/$id.tsx`**

```tsx
import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SessionTabs, TabId } from "@/components/session/SessionTabs";
import { ChatWorkspace } from "@/components/session/ChatWorkspace";
import { SoapNoteEditor } from "@/components/session/SoapNoteEditor";
import { EventsPanel } from "@/components/session/EventsPanel";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Calendar,
  Clock,
  User,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/sessions/$id")({
  component: SessionPage,
});

interface SessionData {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  caseNumber: string;
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
  notesCount: number;
  eventsCount: number;
}

// Mock session data for demo
const mockSession: SessionData = {
  id: "",
  title: "Patient Consultation",
  clientName: "Ahmed Hassan",
  clientId: "client-001",
  caseNumber: "MC-2024-0042",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notesCount: 0,
  eventsCount: 0,
};

function SessionPage() {
  const navigate = useNavigate();
  const { id: sessionId } = Route.useParams();

  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Simulate fetching session data
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // In production, fetch from /api/medical/sessions/${sessionId}
        // For now, use mock data
        setSessionData({
          ...mockSession,
          id: sessionId,
        });
      } catch (err) {
        setError("Failed to load session. Please try again.");
        console.error("Session fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handleBack = () => {
    navigate({ to: "/workspace" });
  };

  const handleTranscriptionComplete = (transcription: string) => {
    // Switch to SOAP tab and pass transcription
    setActiveTab("soap");
    // The SoapNoteEditor will receive this via a callback or state
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "archived":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header Skeleton */}
        <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-md">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-bold text-lg text-slate-900">
                  Session Load Error
                </h3>
                <p className="text-sm text-slate-600">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <Loader2 className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <h3 className="font-bold text-lg">Session Not Found</h3>
            <Button onClick={handleBack} variant="outline" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Session Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white">
        {/* Top Row: Back Button + Title + Status */}
        <div className="flex items-center gap-4 p-4">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {sessionData.title}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider shrink-0",
                  getStatusColor(sessionData.status),
                )}
              >
                {sessionData.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{sessionData.clientName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-mono">{sessionData.caseNumber}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <VoiceRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              className="shrink-0"
            />
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-6 px-4 pb-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Created {formatDate(sessionData.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{sessionData.notesCount} Notes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{sessionData.eventsCount} Events</span>
          </div>
        </div>
      </div>

      {/* 3-Tab Interface */}
      <div className="flex-1 overflow-hidden">
        <SessionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          content={{
            chat: (
              <ChatWorkspace
                sessionId={sessionId}
                organizationId={sessionData.clientId}
              />
            ),
            soap: (
              <SoapNoteEditor
                sessionId={sessionId}
                onSave={(soapNote) => {
                  console.log("SOAP Note saved:", soapNote);
                }}
              />
            ),
            events: <EventsPanel sessionId={sessionId} />,
          }}
        />
      </div>
    </div>
  );
}
```

This is a direct port of `src/app/workspace/sessions/[id]/page.tsx`: `useRouter()` + `router.push("/workspace")` → `useNavigate()` + `navigate({ to: "/workspace" })`; `useParams<{id: string}>()` → `Route.useParams()`; the unused `SessionPageProps`/`params: Promise<{id: string}>` Next 15 async-params type (it was never actually read in the original — only the `useParams()` hook was used) is dropped since the route no longer takes that prop at all. `isRecording`/`setIsRecording` state is kept even though unused — it was already unused/dead in the original file, and this migration isn't the place to clean up unrelated pre-existing dead code.

- [ ] **Step 2: Regenerate routes**

```bash
npm run generate-routes --workspace medical-os
```

Confirm `routeTree.gen.ts` now includes `/workspace/sessions/$id`.

- [ ] **Step 3: Run dev smoke test**

```bash
npm run dev --workspace medical-os &
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/workspace/sessions/test-id
kill %1
```

Expected: `HTTP 200`.

- [ ] **Step 4: Run type-check**

```bash
npx turbo run type-check --filter=medical-os
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/medical-os/src/routes/workspace/sessions apps/medical-os/src/routeTree.gen.ts
git commit -m "feat(medical-os): port session detail route"
```

---

### Task 6: Port the two API routes as TanStack Start server routes

**Files:**
- Create: `apps/medical-os/src/routes/api/generate-soap.ts`
- Create: `apps/medical-os/src/routes/api/transcribe.ts`

Server route syntax below is copied from TanStack Start's current live documentation (`https://tanstack.com/start/latest/docs/framework/react/guide/server-routes`, fetched during planning): a route file gets a `server.handlers` object mapping HTTP methods to handler functions that receive `{ request }` and return a `Response`.

- [ ] **Step 1: Create `apps/medical-os/src/routes/api/generate-soap.ts`**

```ts
import { createFileRoute } from "@tanstack/react-router";
import { generateSoapNote } from "@smartekai/ai";

export const Route = createFileRoute("/api/generate-soap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { transcription } = await request.json();

          if (!transcription) {
            return Response.json(
              { error: "No transcription provided" },
              { status: 400 },
            );
          }

          const soap = await generateSoapNote(transcription);

          return Response.json({ success: true, soap });
        } catch (error) {
          console.error("SOAP generation error:", error);
          return Response.json(
            { error: "Failed to generate SOAP note" },
            { status: 500 },
          );
        }
      },
    },
  },
});
```

This is `src/app/api/generate-soap/route.ts` ported: `NextRequest`/`NextResponse.json()` → the raw `request: Request` handler argument and the standard `Response.json()` static method (Node 18+, available in the Nitro `node-server` runtime). Dropped `export const runtime = "nodejs"` and `export const maxDuration = 60` — those configure Next's serverless/edge function limits, which don't apply to a long-lived Node server process.

- [ ] **Step 2: Create `apps/medical-os/src/routes/api/transcribe.ts`**

```ts
import { createFileRoute } from "@tanstack/react-router";
import { transcribeMedicalAudio } from "@smartekai/ai";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const audioFile = formData.get("audio") as File;

          if (!audioFile) {
            return Response.json(
              { error: "No audio file provided" },
              { status: 400 },
            );
          }

          // Convert File to ArrayBuffer
          const arrayBuffer = await audioFile.arrayBuffer();

          // Determine content type from file
          const contentType = audioFile.type || "audio/webm";

          // Transcribe using Deepgram
          const result = await transcribeMedicalAudio(arrayBuffer, contentType);

          if (!result.success) {
            return Response.json(
              { error: "Transcription failed" },
              { status: 500 },
            );
          }

          return Response.json({
            success: true,
            transcription: result.transcription,
            language: result.language,
            confidence: result.confidence,
          });
        } catch (error) {
          console.error("Transcription API error:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
```

`VoiceRecorder.tsx` calls this via `fetch("/api/transcribe", { method: "POST", body: formData })` — that call site does not change; it's a relative URL fetch that resolves the same way regardless of framework.

- [ ] **Step 3: Regenerate routes**

```bash
npm run generate-routes --workspace medical-os
```

- [ ] **Step 4: Run dev smoke test (route matching only — full functional test needs real API keys, see Task 8)**

```bash
npm run dev --workspace medical-os &
sleep 3
curl -s -X POST http://localhost:3000/api/generate-soap \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP %{http_code}\n"
kill %1
```

Expected: `HTTP 400` with body `{"error":"No transcription provided"}` — this confirms the route matches and the handler runs (a 404 here would mean the route isn't registered).

- [ ] **Step 5: Run type-check**

```bash
npx turbo run type-check --filter=medical-os
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/medical-os/src/routes/api apps/medical-os/src/routeTree.gen.ts
git commit -m "feat(medical-os): port API routes to TanStack Start server routes"
```

---

### Task 7: Remove Next.js

**Files:**
- Delete: `apps/medical-os/src/app/`
- Delete: `apps/medical-os/next.config.js`
- Delete: `apps/medical-os/next-env.d.ts`
- Modify: `apps/medical-os/package.json`

Everything under `src/app/` has now been ported to `src/routes/`. This task removes the dead Next.js files and the `next` dependency itself.

- [ ] **Step 1: Delete the old Next.js app directory and config**

```bash
git rm -r apps/medical-os/src/app
git rm apps/medical-os/next.config.js
git rm apps/medical-os/next-env.d.ts
```

- [ ] **Step 2: Remove the `next` dependency**

Confirm it's already gone from `apps/medical-os/package.json` (it was removed in Task 3, Step 3 — this step is just a final check, not a new edit):

```bash
grep -n '"next"' apps/medical-os/package.json
```

Expected: no output.

- [ ] **Step 3: Full verification pass**

```bash
npx turbo run type-check --filter=medical-os
npx turbo run lint --filter=medical-os
npx turbo run build --filter=medical-os
```

Expected: all three PASS. The build should produce `apps/medical-os/.output/server/index.mjs`.

- [ ] **Step 4: Commit**

```bash
git add -A apps/medical-os
git commit -m "chore(medical-os): remove Next.js, migration to TanStack Start complete"
```

---

### Task 8: Dockerfile for Dokploy deployment

**Files:**
- Create: `apps/medical-os/Dockerfile`

There is no `Dockerfile` anywhere in this repo today — Dokploy is almost certainly auto-building Medical OS via Nixpacks' Next.js detection, which won't recognize TanStack Start the same way. This uses Turborepo's own recommended Docker pattern (`turbo prune`, confirmed via the installed `turborepo` skill's CLI reference) to build a minimal image.

**Manual follow-up required after this is merged and deployed once:** the actual Dokploy application's build/start configuration lives outside this repo and can't be verified from the codebase alone. Confirm the Dokploy app for Medical OS is set to build from this Dockerfile (or update its build settings to match) before relying on a production deploy.

- [ ] **Step 1: Create `apps/medical-os/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune medical-os --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=medical-os

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/medical-os/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

The final `runner` stage only copies the `.output` directory — verified during planning that this directory runs standalone with `node .output/server/index.mjs` and needs no `node_modules` at runtime (Nitro bundles the server code, including `@smartekai/ai`'s dependencies, into the output).

- [ ] **Step 2: Build and smoke-test the image locally**

```bash
docker build -f apps/medical-os/Dockerfile -t medical-os-tanstack-test .
docker run -d -p 3100:3000 --name medical-os-tanstack-test medical-os-tanstack-test
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3100/
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3100/workspace
docker stop medical-os-tanstack-test
docker rm medical-os-tanstack-test
```

Expected: both curls return `HTTP 200`.

**Note:** this container will not have `GOOGLE_AI_API_KEY`/`DEEPGRAM_API_KEY` set, so `/api/generate-soap` and `/api/transcribe` will fail if exercised here — that's expected and fine for this smoke test, which only confirms the server boots and serves pages. Full functional verification happens in Task 9 against the real dev server with real env vars.

- [ ] **Step 3: Commit**

```bash
git add apps/medical-os/Dockerfile
git commit -m "feat(medical-os): add Dockerfile for TanStack Start Nitro build"
```

---

### Task 9: Full manual verification

Per the approved spec, validation for this migration is manual (matches current repo-wide practice — there are no automated tests anywhere in this repo). This requires real `GOOGLE_AI_API_KEY` and `DEEPGRAM_API_KEY` values in `apps/medical-os/.env.local` (or wherever this repo's env vars are sourced from locally — check `.env.example` at the repo root).

- [ ] **Step 1: Start the dev server**

```bash
npm run dev --workspace medical-os
```

- [ ] **Step 2: Click through the golden path in a browser**

1. Open `http://localhost:3000/` — marketing home page loads, header/hero/product showcase/footer all render, no console errors.
2. Click "Open Medical Workspace" — navigates to `/workspace`, dashboard loads with stats cards and sidebar.
3. Click into a session (or navigate directly to `/workspace/sessions/test-id`) — session header, tabs (Chat / SOAP / Events), and the voice recorder render.
4. Use the voice recorder: record a short clip, stop recording — confirm it POSTs to `/api/transcribe`, gets a transcription back, and the UI shows "Transcription complete!".
5. In the SOAP tab, trigger SOAP generation from the transcription — confirm it POSTs to `/api/generate-soap` and a structured SOAP note comes back.
6. Check the browser console throughout — no errors.

- [ ] **Step 3: Stop the dev server, fix anything found, and commit any fixes**

If Step 2 surfaces a bug, fix it, re-run the affected step above, then:

```bash
git add -A apps/medical-os
git commit -m "fix(medical-os): <describe what was fixed>"
```

If nothing needed fixing, there's nothing to commit — this task's purpose was verification, not necessarily new code.

---

## Self-Review Notes

- **Spec coverage:** every section of the spec (scope, rollout as in-place branch work via Tasks 1–9, marketing Link fix, TanStack CLI scaffolding approach, routing/file mapping, server-routes-not-server-functions, deployment risk/Dockerfile, manual-only validation) has a corresponding task above.
- **Type consistency:** `Route.useParams()` in Task 5 returns `{ id: string }` matching the file name `$id.tsx`; `navigate({ to: "/workspace" })` in Task 5 matches the route id registered by `workspace/route.tsx` in Task 4; `SessionData`/`TabId`/component prop names are unchanged from the original files, so `ChatWorkspace`/`SoapNoteEditor`/`EventsPanel`/`SessionTabs` (not modified by this plan) continue to receive the same props they did before.
- **Deviations from the spec, both intentional and grounded in verification done while writing this plan:** Tailwind stays on v3 (spec assumed this but didn't call out that the CLI defaults to v4 — confirmed by actually running the CLI); TypeScript moves to `^6.0.3` for this package only (verified compatible by building successfully); `Link`/`to`/`params` are not used anywhere in Medical OS's own components — plain `<a>` is used uniformly instead, since every link target resolves correctly as a full-page navigation too (this is simpler than the spec implied and was confirmed by testing, not assumed).
