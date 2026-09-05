# Shared Marketing Hub (apps/www) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/www`, a new TanStack Start app serving as the single public home page plus one feature page per product (Medical OS live, 4by4 Builder coming-soon), each linking out to that product's own login/signup.

**Architecture:** File-based TanStack Router routes (`/`, `/products/$slug`) driven by a single typed product config (`src/data/products.ts`). Visual system implements `DESIGN.md`'s Apple-style tokens fresh via Tailwind v4's CSS `@theme` (new to this repo — medical-os deliberately stayed on Tailwind v3), local to this app only.

**Tech Stack:** `@tanstack/react-router`/`react-start` 1.170.x/1.168.x, `nitro` 3.0.260610-beta, Vite 8.2.x, Tailwind CSS v4 (`@tailwindcss/vite`), `@fontsource-variable/inter`, ESLint 9, TypeScript 6.0.3, Turborepo (no root config changes needed — see Task 1).

Spec: `.agents/www/specs/2026-09-06-shared-marketing-hub-design.md`

---

## Before you start

All commands run from the monorepo root
(`/Users/ar/Desktop/Web Development/smartekai-saas`) unless noted. Every
"run type-check"/"run lint"/"run build" step means:

```bash
npx turbo run type-check --filter=www
npx turbo run lint --filter=www
npx turbo run build --filter=www
```

Every "run dev smoke test" means: start `npm run dev --workspace www` in the
background, `curl` the path, then stop it. Dev server runs on **port 3002**
(medical-os uses 3000, legal-os uses 3001 — pick a free port so all three can
run concurrently).

**On copy:** the headline/feature/description text in this plan is a
functional first draft grounded in what these products actually do (Medical
OS's real SOAP-note feature from `packages/ai`; 4by4 Builder's real feature
set from `.agents/4by4-builder/sops/sop.md`) — it is not final marketing
copy. Per the spec and `WORKFLOW.MD`'s "copy needs its own spec" principle,
treat it as a placeholder that renders correctly and reads honestly, not as
copy that's been through a dedicated content review. Swap it later without
touching structure.

## File Structure

**Create:**
- `apps/www/package.json`, `vite.config.ts`, `tsconfig.json`, `tsr.config.json`, `eslint.config.js`, `.cta.json`, `.env.example`
- `apps/www/Dockerfile`
- `apps/www/src/router.tsx`, `src/styles.css`, `src/routeTree.gen.ts` (auto-generated, committed — see Task 1)
- `apps/www/src/data/products.ts`
- `apps/www/src/components/Button.tsx`, `Header.tsx`, `Footer.tsx`, `ProductTile.tsx`
- `apps/www/src/routes/__root.tsx`, `routes/index.tsx`, `routes/products/$slug.tsx`

**Modify:** none — root `package.json` workspaces glob (`apps/*`) and
`turbo.json`'s build outputs (`.output/**`, already added during the
medical-os migration) already cover a new app with no changes.

---

### Task 1: Bootstrap the apps/www toolchain

**Files:**
- Create: `apps/www/package.json`, `vite.config.ts`, `tsconfig.json`, `tsr.config.json`, `eslint.config.js`, `.cta.json`
- Create: `apps/www/src/router.tsx`, `src/styles.css`, `src/routes/__root.tsx`, `src/routes/index.tsx` (minimal placeholder, replaced in Task 6)

- [ ] **Step 1: Confirm current tool versions with the TanStack CLI**

Re-run the same check used for the medical-os migration, since versions can
drift:

```bash
npx --yes @tanstack/cli create www-scratch \
  --framework react \
  --deployment nitro \
  --toolchain eslint \
  --no-examples \
  --no-git \
  --target-dir /tmp/www-scratch
```

Expected: completes without error. If any resolved version differs from
what's pinned below (check `/tmp/www-scratch/package.json`), use the new
version instead of the one in this plan — then delete the scratch dir
(`rm -rf /tmp/www-scratch`).

- [ ] **Step 2: Create `apps/www/package.json`**

```json
{
  "name": "www",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3002",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "generate-routes": "tsr generate",
    "lint": "eslint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@fontsource-variable/inter": "^5.3.0",
    "@tailwindcss/vite": "^4.3.3",
    "@tanstack/react-router": "^1.170.32",
    "@tanstack/react-start": "^1.168.49",
    "nitro": "3.0.260610-beta",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@tanstack/eslint-config": "^0.4.0",
    "@tanstack/router-cli": "^1.167.33",
    "@types/node": "^22.10.2",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.1.1",
    "eslint": "^9.39.5",
    "typescript": "^6.0.3",
    "vite": "^8.2.2"
  }
}
```

`nitro` is pinned exact (no `^`) — it's a beta prerelease, and caret ranges
resolve unpredictably against those (same reasoning as the medical-os plan).

- [ ] **Step 3: Create `apps/www/.cta.json`**

```json
{
  "projectName": "www",
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

- [ ] **Step 4: Create `apps/www/tsr.config.json`**

```json
{
  "target": "react"
}
```

- [ ] **Step 5: Create `apps/www/eslint.config.js`**

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

- [ ] **Step 6: Create `apps/www/tsconfig.json`**

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

No `baseUrl` — confirmed during the medical-os migration that TypeScript 6
makes it a hard error (`TS5101`) and it's unnecessary with
`moduleResolution: "bundler"`.

- [ ] **Step 7: Create `apps/www/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [nitro(), tailwindcss(), tanstackStart(), viteReact()],
});
```

Unlike medical-os (Tailwind v3 via `postcss.config.js`), this app is
greenfield with no existing CSS to preserve, so it uses the CLI's actual
default: Tailwind v4 via the `@tailwindcss/vite` plugin. No devtools plugin —
consistent with the no-devtools choice made for medical-os.

- [ ] **Step 8: Create `apps/www/src/router.tsx`**

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

- [ ] **Step 9: Create `apps/www/src/styles.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary: #0066cc;
  --color-primary-focus: #0071e3;
  --color-primary-on-dark: #2997ff;
  --color-ink: #1d1d1f;
  --color-body-on-dark: #ffffff;
  --color-body-muted: #cccccc;
  --color-ink-muted-80: #333333;
  --color-ink-muted-48: #7a7a7a;
  --color-divider-soft: #f0f0f0;
  --color-hairline: #e0e0e0;
  --color-canvas: #ffffff;
  --color-canvas-parchment: #f5f5f7;
  --color-surface-pearl: #fafafc;
  --color-surface-tile-1: #272729;
  --color-surface-tile-2: #2a2a2c;
  --color-surface-tile-3: #252527;
  --color-surface-black: #000000;
  --color-surface-chip-translucent: #d2d2d7;

  --font-display: "Inter Variable", system-ui, -apple-system, sans-serif;
  --font-text: "Inter Variable", system-ui, -apple-system, sans-serif;

  --radius-xs: 5px;
  --radius-sm: 8px;
  --radius-md: 11px;
  --radius-lg: 18px;
  --radius-pill: 9999px;

  --spacing-section: 80px;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-text);
  color: var(--color-ink);
  background-color: var(--color-canvas);
  -webkit-font-smoothing: antialiased;
}
```

Token values copied directly from `DESIGN.md`'s `colors`/`rounded`/`spacing`
YAML frontmatter. Tailwind v4's `@theme` block auto-generates utilities from
these namespaces: `--color-*` → `bg-primary`/`text-primary`/etc.,
`--radius-*` → `rounded-pill`/`rounded-lg`/etc., `--font-*` →
`font-display`/`font-text`, `--spacing-*` → `p-section`/`py-section`/etc.
No separate `tailwind.config.js` — v4 is CSS-config-first.

- [ ] **Step 10: Create a placeholder `apps/www/src/routes/__root.tsx`**

```tsx
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import "@fontsource-variable/inter";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SmarTekAI" },
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
      <body className="font-text">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

This is intentionally minimal (no header/footer yet) — Task 5 replaces it
once `Header`/`Footer` exist. Keeping it minimal here means Step 12's smoke
test only depends on what's already been built.

- [ ] **Step 11: Create a placeholder `apps/www/src/routes/index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => <main className="p-8">apps/www placeholder</main>,
});
```

Task 6 replaces this with the real home page.

- [ ] **Step 12: Install dependencies and generate the route tree**

```bash
npm install
npm run generate-routes --workspace www
```

Expected: `npm install` completes cleanly; `apps/www/src/routeTree.gen.ts` is
created containing a `'/'` route.

- [ ] **Step 13: Run dev smoke test**

```bash
npm run dev --workspace www &
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3002/
kill %1
```

Expected: `HTTP 200`.

- [ ] **Step 14: Run type-check**

```bash
npx turbo run type-check --filter=www
```

Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add apps/www/package.json apps/www/.cta.json apps/www/tsr.config.json \
  apps/www/eslint.config.js apps/www/tsconfig.json apps/www/vite.config.ts \
  apps/www/src/router.tsx apps/www/src/styles.css \
  apps/www/src/routes/__root.tsx apps/www/src/routes/index.tsx \
  apps/www/src/routeTree.gen.ts package-lock.json
git commit -m "feat(www): bootstrap TanStack Start toolchain with Tailwind v4"
```

---

### Task 2: Product data model

**Files:**
- Create: `apps/www/src/data/products.ts`

- [ ] **Step 1: Create `apps/www/src/data/products.ts`**

```ts
export type ProductStatus = "live" | "coming-soon";

export interface ProductFeature {
  title: string;
  description: string;
}

export interface ProductEntry {
  slug: "medical-os" | "4by4-builder";
  name: string;
  tagline: string;
  description: string;
  features: ProductFeature[];
  status: ProductStatus;
  loginUrl?: string;
  signupUrl?: string;
}

const medicalAppUrl = import.meta.env.VITE_MEDICAL_APP_URL as
  | string
  | undefined;

export const products: ProductEntry[] = [
  {
    slug: "medical-os",
    name: "Medical OS",
    tagline: "Clinical documentation, done in minutes.",
    description:
      "Record a consultation, get a structured SOAP note back — built for clinicians who'd rather talk to their patient than type.",
    features: [
      {
        title: "Voice to SOAP note",
        description:
          "Record or upload audio and get a structured Subjective / Objective / Assessment / Plan note back.",
      },
      {
        title: "Built on Gemini",
        description:
          "Clinical-grade summarization tuned for medical terminology and structure.",
      },
      {
        title: "Your workspace, your data",
        description:
          "Every session lives in your own workspace, isolated per organization.",
      },
    ],
    status: "live",
    loginUrl: medicalAppUrl ? `${medicalAppUrl}/workspace` : undefined,
    signupUrl: medicalAppUrl ? `${medicalAppUrl}/workspace` : undefined,
  },
  {
    slug: "4by4-builder",
    name: "4x4 Builder",
    tagline: "Configure your build. Know before you buy.",
    description:
      "A 3D configurator for off-road builds — pick your parts, watch weight and cost add up, and catch problems before they're bolted on.",
    features: [
      {
        title: "3D configurator",
        description:
          "See every accessory rendered on your actual vehicle before you buy it.",
      },
      {
        title: "Weight & cost, live",
        description:
          "Every part you add updates your running total and payload budget in real time.",
      },
      {
        title: "Safety recommendations",
        description:
          "Flags front-axle load, roof capacity, and GVM issues before they become a problem.",
      },
    ],
    status: "coming-soon",
  },
];

export function getProductBySlug(
  slug: string,
): ProductEntry | undefined {
  return products.find((product) => product.slug === slug);
}
```

Medical OS's features are drawn from `packages/ai`'s actual
`generateSoapNote`/`transcribeMedicalAudio` functions and the multi-tenant
`organizationId` isolation already documented in `AGENTS.md` §"Invariants".
4x4 Builder's features are drawn from
`.agents/4by4-builder/sops/sop.md` (3D configurator via React Three Fiber,
the weight/cost `generateRecommendations` rule engine). `medicalAppUrl` is
`undefined` until `VITE_MEDICAL_APP_URL` is set (Task 4 covers that) — every
consumer of `loginUrl`/`signupUrl` must handle the `undefined` case, which
the components in Task 3 already do via `href ?? "#"`.

- [ ] **Step 2: Run type-check**

```bash
npx turbo run type-check --filter=www
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/www/src/data/products.ts
git commit -m "feat(www): add product data model"
```

---

### Task 3: Shared visual components

**Files:**
- Create: `apps/www/src/components/Button.tsx`, `Header.tsx`, `Footer.tsx`, `ProductTile.tsx`

- [ ] **Step 1: Create `apps/www/src/components/Button.tsx`**

```tsx
import type { ReactNode } from "react";

interface ButtonPrimaryProps {
  href: string;
  children: ReactNode;
  disabled?: boolean;
}

export function ButtonPrimary({ href, children, disabled }: ButtonPrimaryProps) {
  if (disabled) {
    return (
      <span className="inline-block cursor-not-allowed rounded-pill bg-ink-muted-48 px-[22px] py-[11px] font-text text-[17px] text-white opacity-60">
        {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="inline-block rounded-pill bg-primary px-[22px] py-[11px] font-text text-[17px] text-white transition-transform hover:bg-primary-focus active:scale-95"
    >
      {children}
    </a>
  );
}

export function ButtonSecondaryPill({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-block rounded-pill border border-primary px-[22px] py-[11px] font-text text-[17px] text-primary transition-transform active:scale-95"
    >
      {children}
    </a>
  );
}
```

Matches `DESIGN.md`'s `button-primary`/`button-secondary-pill` component
specs: pill radius, Action Blue fill, `scale(0.95)` active state (the one
system-wide micro-interaction the design doc calls out).

- [ ] **Step 2: Create `apps/www/src/components/Header.tsx`**

```tsx
import { Link } from "@tanstack/react-router";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-11 items-center justify-between bg-surface-black px-6 text-body-on-dark">
      <Link to="/" className="text-[12px] font-semibold tracking-tight">
        SmarTekAI
      </Link>
      <nav className="flex items-center gap-5 text-[12px] tracking-[-0.12px]">
        <Link
          to="/products/$slug"
          params={{ slug: "medical-os" }}
          className="hover:opacity-80"
        >
          Medical OS
        </Link>
        <Link
          to="/products/$slug"
          params={{ slug: "4by4-builder" }}
          className="hover:opacity-80"
        >
          4x4 Builder
        </Link>
      </nav>
    </header>
  );
}
```

Matches `DESIGN.md`'s `global-nav`: black background, 44px height (`h-11` =
44px in Tailwind's default scale), `nav-link` typography (12px).

- [ ] **Step 3: Create `apps/www/src/components/Footer.tsx`**

```tsx
export function Footer() {
  return (
    <footer className="bg-canvas-parchment px-6 py-16 text-ink-muted-80">
      <div className="mx-auto max-w-[1440px]">
        <p className="text-[14px] font-semibold uppercase tracking-wide text-ink-muted-48">
          Products
        </p>
        <ul className="mt-2 text-[17px] leading-[2.41]">
          <li>
            <a
              href="/products/medical-os"
              className="hover:text-primary"
            >
              Medical OS
            </a>
          </li>
          <li>
            <a
              href="/products/4by4-builder"
              className="hover:text-primary"
            >
              4x4 Builder
            </a>
          </li>
        </ul>
      </div>
      <p className="mx-auto mt-12 max-w-[1440px] text-[12px] text-ink-muted-48">
        © {new Date().getFullYear()} SmarTekAI. All rights reserved.
      </p>
    </footer>
  );
}
```

Matches `DESIGN.md`'s `footer` spec: parchment background, `dense-link`
typography (17px / 2.41 line-height — the relaxed leading the design doc
calls out for scannable link columns), `fine-print` for the legal row.

- [ ] **Step 4: Create `apps/www/src/components/ProductTile.tsx`**

```tsx
import type { ReactNode } from "react";
import { ButtonPrimary, ButtonSecondaryPill } from "./Button";

type TileVariant = "light" | "dark" | "parchment";

const variantClasses: Record<TileVariant, string> = {
  light: "bg-canvas text-ink",
  dark: "bg-surface-tile-1 text-body-on-dark",
  parchment: "bg-canvas-parchment text-ink",
};

interface ProductTileCta {
  label: string;
  href: string;
  disabled?: boolean;
}

interface ProductTileProps {
  variant: TileVariant;
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta: ProductTileCta;
  secondaryCta?: ProductTileCta;
  media?: ReactNode;
}

export function ProductTile({
  variant,
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  media,
}: ProductTileProps) {
  return (
    <section className={`px-6 py-section ${variantClasses[variant]}`}>
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-6 text-center">
        {eyebrow ? (
          <p className="text-[21px] font-semibold tracking-[0.231px]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-[40px] font-semibold leading-[1.1]">
          {title}
        </h2>
        <p className="max-w-[640px] text-[28px] font-normal leading-[1.14] tracking-[0.196px] opacity-90">
          {description}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <ButtonPrimary href={primaryCta.href} disabled={primaryCta.disabled}>
            {primaryCta.label}
          </ButtonPrimary>
          {secondaryCta ? (
            <ButtonSecondaryPill href={secondaryCta.href}>
              {secondaryCta.label}
            </ButtonSecondaryPill>
          ) : null}
        </div>
        {media ? <div className="mt-8 w-full">{media}</div> : null}
      </div>
    </section>
  );
}
```

Matches `DESIGN.md`'s `product-tile-light`/`product-tile-dark`/
`product-tile-parchment`: full-bleed (`rounded.none`), `{spacing.section}`
(80px) vertical padding, `display-lg` (40px/600) title, `lead` (28px/400)
description, centered stack, two-pill CTA row.

- [ ] **Step 5: Run type-check and lint**

```bash
npx turbo run type-check --filter=www
npx turbo run lint --filter=www
```

Expected: both PASS. (These components aren't wired into any route yet, so
this only checks they compile standalone.)

- [ ] **Step 6: Commit**

```bash
git add apps/www/src/components
git commit -m "feat(www): add Button, Header, Footer, ProductTile components"
```

---

### Task 4: Env vars

**Files:**
- Create: `apps/www/.env.example`

- [ ] **Step 1: Create `apps/www/.env.example`**

```
# apps/www links out to each live product's login/signup rather than hosting
# auth itself. Set this to wherever medical-os is actually running/deployed.
# Not needed for coming-soon products (4x4 Builder has none yet).
VITE_MEDICAL_APP_URL="http://localhost:3000"
```

- [ ] **Step 2: Add the same value to your local `apps/www/.env.local`** (gitignored, not committed)

```bash
echo 'VITE_MEDICAL_APP_URL="http://localhost:3000"' > apps/www/.env.local
```

- [ ] **Step 3: Commit**

```bash
git add apps/www/.env.example
git commit -m "chore(www): document VITE_MEDICAL_APP_URL"
```

---

### Task 5: Wire Header/Footer into the root route

**Files:**
- Modify: `apps/www/src/routes/__root.tsx`

- [ ] **Step 1: Replace `apps/www/src/routes/__root.tsx`**

```tsx
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import "@fontsource-variable/inter";
import appCss from "../styles.css?url";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SmarTekAI — one platform, many products" },
      {
        name: "description",
        content:
          "Medical OS, 4x4 Builder, and more — AI-powered products built on one reusable core.",
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
      <body className="font-text">
        <Header />
        {children}
        <Footer />
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run dev smoke test**

```bash
npm run dev --workspace www &
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3002/
kill %1
```

Expected: `HTTP 200`.

- [ ] **Step 3: Run type-check**

```bash
npx turbo run type-check --filter=www
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/routes/__root.tsx
git commit -m "feat(www): wire Header/Footer into root layout"
```

---

### Task 6: Home route

**Files:**
- Modify: `apps/www/src/routes/index.tsx`

- [ ] **Step 1: Replace `apps/www/src/routes/index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { ProductTile } from "../components/ProductTile";
import { products } from "../data/products";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <section className="bg-canvas px-6 py-section text-center">
        <div className="mx-auto max-w-[980px]">
          <p className="text-[21px] font-semibold tracking-[0.231px] text-ink-muted-48">
            SmarTekAI
          </p>
          <h1 className="mt-3 font-display text-[56px] font-semibold leading-[1.07] tracking-[-0.28px]">
            One platform.
            <br />
            Many products.
          </h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[17px] leading-[1.47] tracking-[-0.374px] text-ink-muted-80">
            AI-powered products built on the same reusable core — pick the
            one built for what you do.
          </p>
        </div>
      </section>

      {products.map((product, index) => (
        <ProductTile
          key={product.slug}
          variant={index % 2 === 0 ? "dark" : "parchment"}
          eyebrow={product.name}
          title={product.tagline}
          description={product.description}
          primaryCta={
            product.status === "live"
              ? {
                  label: `Open ${product.name}`,
                  href: product.loginUrl ?? "#",
                }
              : { label: "Coming soon", href: "#", disabled: true }
          }
          secondaryCta={{
            label: "Learn more",
            href: `/products/${product.slug}`,
          }}
        />
      ))}
    </main>
  );
}
```

- [ ] **Step 2: Regenerate routes, run dev smoke test**

```bash
npm run generate-routes --workspace www
npm run dev --workspace www &
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3002/
kill %1
```

Expected: `HTTP 200`. Open `http://localhost:3002/` in a browser and confirm
the hero, both product tiles (Medical OS dark tile, 4x4 Builder parchment
tile with a disabled "Coming soon" button), and footer render.

- [ ] **Step 3: Run type-check**

```bash
npx turbo run type-check --filter=www
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/www/src/routes/index.tsx apps/www/src/routeTree.gen.ts
git commit -m "feat(www): build home page with product showcase"
```

---

### Task 7: Product detail route

**Files:**
- Create: `apps/www/src/routes/products/$slug.tsx`

A single dynamic route serves every product — adding Legal OS later (per the
spec's deferred scope) means adding a `ProductEntry` to
`src/data/products.ts`, not a new route file.

- [ ] **Step 1: Create `apps/www/src/routes/products/$slug.tsx`**

```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProductTile } from "../../components/ProductTile";
import { getProductBySlug } from "../../data/products";

export const Route = createFileRoute("/products/$slug")({
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug);
    if (!product) {
      throw notFound();
    }
    return product;
  },
  component: ProductPage,
});

function ProductPage() {
  const product = Route.useLoaderData();

  return (
    <main>
      <ProductTile
        variant="dark"
        eyebrow={product.name}
        title={product.tagline}
        description={product.description}
        primaryCta={
          product.status === "live"
            ? { label: `Open ${product.name}`, href: product.loginUrl ?? "#" }
            : { label: "Coming soon", href: "#", disabled: true }
        }
      />
      <section className="bg-canvas px-6 py-section">
        <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-3">
          {product.features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-hairline bg-canvas p-6"
            >
              <h3 className="text-[17px] font-semibold tracking-[-0.374px]">
                {feature.title}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-ink-muted-80">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      {product.status === "live" ? (
        <ProductTile
          variant="parchment"
          title="Ready to get started?"
          description={`Sign up or log in to ${product.name}.`}
          primaryCta={{ label: "Sign up", href: product.signupUrl ?? "#" }}
          secondaryCta={{ label: "Log in", href: product.loginUrl ?? "#" }}
        />
      ) : null}
    </main>
  );
}
```

The feature grid uses `store-utility-card`-style treatment from
`DESIGN.md` (`{rounded.lg}` 18px, `{colors.hairline}` 1px border,
`{spacing.lg}` 24px padding) rather than a full-bleed tile, since three
short feature blurbs read better as cards than as three more full-viewport
sections.

- [ ] **Step 2: Regenerate routes**

```bash
npm run generate-routes --workspace www
```

Confirm `apps/www/src/routeTree.gen.ts` now includes `/products/$slug`.

- [ ] **Step 3: Run dev smoke test — both a live and a coming-soon product, and the 404 case**

```bash
npm run dev --workspace www &
sleep 3
echo "medical-os (live):"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3002/products/medical-os
echo "4by4-builder (coming-soon):"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3002/products/4by4-builder
echo "unknown slug (expect 404):"
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3002/products/does-not-exist
kill %1
```

Expected: `HTTP 200`, `HTTP 200`, `HTTP 404`. Open
`http://localhost:3002/products/medical-os` in a browser and confirm the
feature cards render and both "Sign up"/"Log in" buttons point at
`http://localhost:3000/workspace` (from `.env.local`'s
`VITE_MEDICAL_APP_URL`). Open `/products/4by4-builder` and confirm the CTA
reads "Coming soon" and isn't clickable.

- [ ] **Step 4: Run type-check and lint**

```bash
npx turbo run type-check --filter=www
npx turbo run lint --filter=www
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/www/src/routes/products apps/www/src/routeTree.gen.ts
git commit -m "feat(www): add dynamic product detail route"
```

---

### Task 8: Dockerfile for Dokploy deployment

**Files:**
- Create: `apps/www/Dockerfile`

Same `turbo prune` pattern already proven for medical-os. `turbo prune`
matches on the `package.json` **name** field (`"www"`, set in Task 1), not
the directory name.

- [ ] **Step 1: Create `apps/www/Dockerfile`**

```dockerfile
FROM node:22-alpine AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune www --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=www

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/www/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

Note the container's internal port is `3000` (Nitro's default when no `PORT`
env var is set), not the dev-only `3002` — that dev port only exists to
avoid clashing with medical-os locally; in its own container there's no
clash to avoid. Dokploy's own port mapping controls what's exposed
externally, same as medical-os's Dockerfile.

- [ ] **Step 2: Build and smoke-test the image locally (if Docker is available)**

```bash
docker build -f apps/www/Dockerfile -t www-test .
docker run -d -p 3200:3000 -e VITE_MEDICAL_APP_URL=https://medical.example.com --name www-test www-test
sleep 3
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3200/
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3200/products/medical-os
docker stop www-test
docker rm www-test
```

Expected: both `HTTP 200`. If Docker isn't installed in your environment,
skip this step and note it — the underlying `.output/server/index.mjs`
artifact was already confirmed self-contained and working during the
medical-os migration and by Task 7's dev smoke test.

**Manual follow-up required after this is merged and deployed once:** create
a new Dokploy application for `apps/www` (it doesn't exist yet, unlike
medical-os which had an existing-but-misconfigured one) and set
`VITE_MEDICAL_APP_URL` to medical-os's real deployed URL there.

- [ ] **Step 3: Commit**

```bash
git add apps/www/Dockerfile
git commit -m "feat(www): add Dockerfile for Dokploy deployment"
```

---

### Task 9: Full manual verification

- [ ] **Step 1: Full gate**

```bash
./scripts/gate.sh
```

Expected: PASS. (This runs repo-wide, not just `--filter=www` — confirms
adding `apps/www` didn't break anything else in the monorepo.)

- [ ] **Step 2: Click through the golden path in a browser**

```bash
npm run dev --workspace www
```

1. Open `http://localhost:3002/` — hero renders, both product tiles render
   (Medical OS dark, 4x4 Builder parchment with disabled CTA), footer
   renders, no console errors.
2. Click "Learn more" under Medical OS → lands on
   `/products/medical-os`, feature cards render, "Sign up"/"Log in" link to
   `VITE_MEDICAL_APP_URL` (confirm the link target in devtools, don't need
   to complete a real login).
3. Click "Learn more" under 4x4 Builder → lands on
   `/products/4by4-builder`, feature cards render, CTA reads "Coming soon"
   and is not a clickable link.
4. Resize to a phone width (≤ 419px per `DESIGN.md`'s breakpoint table) and
   confirm the hero and tiles stack to single-column without horizontal
   scroll.

- [ ] **Step 3: Fix anything found, then commit**

```bash
git add -A apps/www
git commit -m "fix(www): <describe what was fixed>"
```

If nothing needed fixing, there's nothing to commit here.

---

## Self-Review Notes

- **Spec coverage:** new dedicated TanStack Start app (Task 1) · English-only, no i18n added (no task adds it) · Medical OS live + 4x4 Builder coming-soon, Legal OS excluded (Task 2's `ProductEntry` slug union has no `"legal-os"`) · separate login per app via env-var URLs, no SSO (Task 2 + Task 4) · Apple-style visual system local to `apps/www` (Task 1 Step 9, Task 3) · copy explicitly flagged as first-draft, not a content-spec deliverable (front matter) · deployment via the proven turbo-prune Dockerfile pattern (Task 8).
- **Type consistency:** `ProductEntry`/`ProductStatus`/`ProductFeature` defined once in Task 2, imported (never redefined) in Tasks 6 and 7. `getProductBySlug` (Task 2) is the only lookup function — Task 7's loader calls it by that exact name. `ProductTileCta`/`ProductTileProps` (Task 3) match the shape both Task 6 and Task 7 pass in (`label`, `href`, `disabled?`).
- **Placeholder scan:** no TBD/TODO markers. The copy is real, complete sentences (flagged as first-draft in front matter, not left blank) sourced from actual product behavior already in the codebase/SOP, not invented from nothing.
