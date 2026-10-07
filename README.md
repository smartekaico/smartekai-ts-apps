# SmartekAI SaaS Monorepo

# Stack Setup

Turborepo · TanStack Start · shadcn/ui · Better Auth · Neon + Drizzle · payments · Resend

**Always scaffold with the current CLI.** These tools change their command surface faster than any doc keeps up — TanStack Start, Neon, and Better Auth all renamed commands in 2026. Run the CLI's own `create`/`init` rather than hand-assembling config from a tutorial: it generates the structure the maintainers currently recommend, which is also what the models have seen most of. Check the version in `package.json` before trusting any command below.

---

## Structure

```
apps/
  web/                    # TanStack Start — routes, server functions
packages/
  ui/                     # shadcn components, shared
  db/                     # Drizzle schema, client, migrations
  auth/                   # Better Auth server + client
  payments/               # Stripe client, webhook handlers
  email/                  # Resend + templates
  config/                 # env schema, shared constants
  eslint-config/
  typescript-config/
turbo.json
pnpm-workspace.yaml
```

**Why packages, not `apps/web/lib`:** the second app (admin panel, marketing site, worker) is when this pays off — and by then extracting is painful. Also each package builds and caches independently in Turborepo.

**Dependency direction is one-way:** `web → auth → db`, `web → payments → db`. Never `db → auth`. A cycle here breaks Turborepo's caching and is the most common monorepo mistake.

---

## 1. Scaffold

The shadcn CLI does the most work — <cite index="25-1">running init with the `--monorepo` flag offers a TanStack Start template and creates a project with `web` and `ui` workspaces plus Turborepo as the build system</cite>.

```bash
npx shadcn@latest init --monorepo   # select TanStack Start
```

Alternative — scaffold the app first, wire the monorepo manually. Note the old commands are gone: <cite index="4-1">`create-tsrouter-app` and `create-start-app` are deprecated in favor of `npx @tanstack/cli create`</cite>.

```bash
npx @tanstack/cli create my-app
```

<cite index="8-1">Useful flags: `--package-manager`, `--add-ons`, `--toolchain`, `--deployment`, `--router-only` for an SPA without SSR, `-y` to skip prompts.</cite>

Adding components later — run from the app directory:

```bash
cd apps/web && npx shadcn@latest add button
```

<cite index="25-1">The CLI installs the component under `packages/ui` and updates import paths in `apps/web`. Composite blocks split correctly — `add login-01` puts button, label, input and card in `packages/ui` and the login form in the app.</cite>

<cite index="28-1">Every workspace needs its own `components.json`.</cite>

---

## 2. Database — `packages/db`

Set up Neon with its CLI first — <cite index="5-1">the npm package is now `neon` rather than `neonctl` (same binary, `neonctl` still works as an alias)</cite>:

```bash
npm i -g neon@latest && neon auth
neon init          # OAuth, API key, MCP server, editor extension, agent skills
neon link          # bind this directory to a project, writes .neon
```

<cite index="5-1">`neon init` is the one-shot onboarding; use `mcp` or `skills` alone if you only need one piece. The core local loop is `neon link`, `neon checkout <branch>` to create or pin a branch (env pull runs by default), and `neon env pull` to refresh Neon-managed vars into `.env`.</cite> <cite index="9-1">Every command takes `--output json`, and `NEON_API_KEY` authenticates non-interactively</cite> — <cite index="5-1">`neon link --agent` gives non-interactive JSON mode</cite>. That's what makes it usable from cron and CI.

Then the ORM:

```bash
pnpm add drizzle-orm @neondatabase/serverless --filter @repo/db
pnpm add -D drizzle-kit --filter @repo/db
```

<cite index="34-1">Client:</cite>

```ts
// packages/db/src/client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

<cite index="32-1">Driver choice: `neon-http` is faster for single non-interactive queries; use `neon-serverless` (WebSockets) when you need interactive transactions. In Node you must also install `ws` and pass it in config.</cite>

```ts
// packages/db/drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

```bash
pnpm --filter @repo/db exec drizzle-kit generate   # write migration
pnpm --filter @repo/db exec drizzle-kit migrate    # apply
pnpm --filter @repo/db exec drizzle-kit studio     # inspect
```

Use `push` for local prototyping only. Once anything real is in the database, `generate` + `migrate` — you want the migration in git.

---

## 3. Auth — `packages/auth`

```bash
pnpm add better-auth --filter @repo/auth
```

<cite index="19-1">Configure the Drizzle adapter:</cite>

```ts
// packages/auth/src/server.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@repo/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
});
```

Generate the schema, then migrate with Drizzle:

```bash
npx @better-auth/cli@latest generate --config packages/auth/src/server.ts
pnpm --filter @repo/db exec drizzle-kit generate
pnpm --filter @repo/db exec drizzle-kit migrate
```

<cite index="20-1">Better Auth's own `migrate` command only works with the built-in Kysely adapter — with Drizzle you apply the schema through your ORM.</cite>

Three things to check against current docs, because they're mid-transition:

- **Adapter import.** Stable docs use `better-auth/adapters/drizzle`; newer docs reference a separate `@better-auth/drizzle-adapter` package. Confirm which your installed version wants.
- **CLI name.** <cite index="15-1">The v1.8 beta renames the CLI to `npx auth@latest generate`.</cite>
- **Table naming.** <cite index="19-1">The adapter expects schema names to match table names — if you pluralize (`users` not `user`), pass an explicit schema map or set `usePlural: true`.</cite>

<cite index="14-1">If you enable `experimental.joins`, make sure your Drizzle schema defines the necessary relations</cite> — otherwise session lookups silently stay on the slow path.

---

## 4. Payments — `packages/payments`

Provider-agnostic by design. Stripe, Paddle, Lemon Squeezy, Polar, or a local processor — the package exposes your own interface and the provider sits behind it:

```ts
// packages/payments/src/index.ts
export interface PaymentProvider {
  createCheckout(input: { userId: string; priceId: string }): Promise<{ url: string }>;
  cancelSubscription(id: string): Promise<void>;
  parseWebhook(raw: string, sig: string): Promise<PaymentEvent>;
}
```

One adapter file per provider; the app imports the interface, never the SDK. Swapping providers then touches one file instead of every call site — which matters more here than anywhere else in the stack, since pricing and availability change and merchant-of-record providers (Paddle, Lemon Squeezy) handle VAT that Stripe leaves to you. Relevant if you're selling from Kuwait into the EU.

**Webhook rules, whichever provider:**

- **Verify the signature against the raw body.** A parsed body always fails.
- **Idempotent handlers.** Every provider retries; store the event ID and skip duplicates.
- **Return 200 fast**, queue the work. Slow handlers get retried while still running.
- Keep the SDK server-side only; export typed functions, never the raw client.

---

## 5. Email — `packages/email`

```bash
pnpm add resend --filter @repo/email
pnpm add -D react-email --filter @repo/email
```

Templates as React components in `packages/email/src/templates`. Export one `send*` function per email so callers never touch the Resend client directly — that's what makes the provider swappable later.

---

## 6. Env — `packages/config`

One validated schema, imported everywhere. Fail at boot, not at first request:

```ts
import { z } from 'zod';

export const env = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  RESEND_API_KEY: z.string().startsWith('re_'),
}).parse(process.env);
```

Declare every var in `turbo.json` under `env` for the tasks that read them, or Turborepo will serve a cached build that was made with different values.

---

## 7. Turborepo

```jsonc
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".output/**", "dist/**"],
      "env": ["DATABASE_URL", "STRIPE_SECRET_KEY", "RESEND_API_KEY"]
    },
    "dev": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "db:migrate": { "cache": false }
  }
}
```

`^build` means dependencies build first. `cache: false` on anything with side effects — migrations especially.

```bash
pnpm dev                          # everything
pnpm dev --filter web             # one app + its deps
pnpm build --filter web...        # app and everything it depends on
```

---

## Order to build

1. Scaffold + `packages/config` — env validated first, so nothing else fails mysteriously
2. `packages/db` — schema and one migration
3. `packages/auth` — generate, migrate, verify login works
4. `packages/ui` — components as you need them, not upfront
5. `packages/payments` — webhooks last, they're the fiddliest
6. `packages/email`

Auth before payments: Stripe customers reference users, and building it the other way means a migration to add the foreign key.

---

## Gate + AGENTS.md

## gate.sh

Runs on every change, zero model calls. Fail fast, print the real error.

```bash
#!/usr/bin/env bash
# scripts/gate.sh
set -euo pipefail

pnpm lint
pnpm typecheck
pnpm test
pnpm build

# secrets
if git diff --cached -U0 | grep -nE '(sk_live|whsec_|re_[A-Za-z0-9]{16}|postgres://[^ ]*:[^ ]*@)'; then
  echo "FAIL: possible secret in diff"; exit 1
fi

# domain assertions — add as drift appears
if git diff --cached --name-only | grep -q '^packages/db/'; then
  grep -rlE "org_id\s*=\s*['\"]" packages/db/src && { echo "FAIL: literal tenant id"; exit 1; }
fi

echo "gate: pass"
```

Wire it to a pre-commit hook and to CI. Same script both places — that's what makes it runtime-independent.

**Claude Code hooks:** configure in `settings.json`. Exit code 2 blocks; **exit 1 is treated as non-blocking and the action proceeds**, so a gate that exits 1 on failure enforces nothing. Keep the hook one line calling this script.

**Other runtimes:** confirm whether hooks can block or only observe, and which exit code blocks. If a runtime can't block, enforce at the git layer — pre-commit, pre-push, server-side branch rules.

## Domain assertions

Add one each time the same mistake recurs. Grep-level is enough:

- every route file imports the shared gate
- no tenant/org ID literal in a query
- data-layer files carry the server-only marker
- no hand-written model types outside generated output
- no permission check outside the permissions module

Each assertion you add lets you delete a rule from `AGENTS.md`. A lint rule fires every time; a sentence in a prompt fires most of the time.

## AGENTS.md

Copy the standard file into the repo root, then:

```bash
ln -sf AGENTS.md CLAUDE.md
```

Fill §1 with the commands from `package.json` (including `gate`), and §14 with invariants an agent can't infer from a single file — dependency direction, migration rule, where shared services live.

Delete from §14 as `gate.sh` starts enforcing each item.

A monorepo containing Legal and Medical AI applications with shared packages.

## Project Structure

```
smartekai-saas/
├── apps/
│   ├── legal-os/       # Legal AI application
│   └── medical-os/     # Medical AI application
├── packages/
│   ├── auth/           # Better Auth configuration
│   ├── db/             # Database schema and client
│   ├── billing/        # Credit management
│   ├── ai/             # AI utilities (transcription, SOAP generation)
│   └── ui/             # Shared UI components
├── drizzle/            # Database migrations
└── turbo.json          # Turborepo configuration
```

## Packages

### @smartekai/db
- Neon Postgres connection with pgvector
- Complete schema for legal and medical use cases
- Tables: users, organizations, patients, encounters, soap_notes, case_analyses, etc.
- Supports separate databases for legal and medical

### @smartekai/auth
- Better Auth with organization plugin
- Multi-tenant support with industry roles (LEGAL, MEDICAL, MIXED, ADMIN)

### @smartekai/billing
- FIFO bucket-based credit system
- Credit consumption with audit logging

### @smartekai/ai
- Deepgram medical transcription (nova-3-medical model)
- Gemini 2.5 Flash SOAP note generation

## Development

```bash
# Install dependencies
npm install

# Run both apps
npm run dev

# Run specific app
npm run dev:legal
npm run dev:medical

# Database migrations
cd packages/db && npm run db:push
```

## Environment Variables

### Required

- `DATABASE_LEGAL_URL` - Neon Postgres connection string for Legal OS
- `DATABASE_MEDICAL_URL` - Neon Postgres connection string for Medical OS

### Optional (for backward compatibility)

- `DATABASE_URL` - Falls back to legal database if `DATABASE_LEGAL_URL` not set

### Other Required Variables

- `BETTER_AUTH_URL` - Application URL
- `BETTER_AUTH_SECRET` - Auth secret key
- `GOOGLE_AI_API_KEY` - Google AI Studio API key
- `DEEPGRAM_API_KEY` - Deepgram API key
- `NEXT_PUBLIC_APP_URL` - Public application URL
