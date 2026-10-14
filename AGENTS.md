# AGENTS.md

What's true about **this repo**. How to work a task is in the `lean-build` skill; don't restate it here.

`ln -sf AGENTS.md CLAUDE.md`

## Commands

```
install:    npm install
build:      npm run build            # turbo run build (all apps/packages)
dev:        npm run dev              # turbo run dev — or dev:cars / dev:legal / dev:medical for one app
typecheck:  npm run type-check       # turbo run type-check
lint:       npm run lint             # turbo run lint
test:       none — no test suite exists in this repo yet
gate:       ./scripts/gate.sh
```

Per-app extras: `apps/legal-os` also has `db:push` / `db:studio` (Drizzle) and
`security:report` (Trivy scan). `packages/db` has `db:generate` / `db:push`.

## Never touch

`apps/*/.next/`, `apps/*/dist/` · lockfiles (edit `package.json`, run
`npm install`) · applied Drizzle migrations · `.agents/skills/` · CI config
(none exists yet).

## Invariants

Rules an agent can't infer from the file it's editing.

- Every query filters by `organizationId`; knowledge-base/RAG queries also
  filter by `productId` — the multi-tenant isolation boundary.
- DB access stays inside `packages/db`. Third-party APIs (Deepgram, Gemini,
  CRW) stay behind their package's thin client (`@smartekai/ai`,
  `@smartekai/crw`) — apps never call a provider SDK directly.
- Types are generated from `packages/db`'s Drizzle schema. Never hand-write a
  row type.
- Auth is Better Auth (`@smartekai/auth`) against Neon Postgres — not Neon's
  own Auth product. One shared instance (org plugin) across both apps.
- Parameterized queries only — Drizzle handles this; never drop to raw
  string-interpolated SQL.
- Branch naming: `feat/{scope}`, `fix/{scope}`, `chore/{scope}`,
  `docs/{scope}`. Never commit to `main` directly.

## Ask first (repo-specific)

Beyond the skill's defaults:

- Merging a branch into `main` (no remote today — treat it as if there will
  be one)
- Scope expansion beyond the active plan in `.agents/plans/active.md`

## This repo

- **Apps** (Turborepo + npm workspaces, React 19): `apps/medical-os` and
  `apps/cars-4by4-builder` run on TanStack Start (Vite + Nitro);
  `apps/legal-os` is still Next.js 16 — a migration to TanStack Start is
  designed in `.agents/legal/specs/` but **paused**; don't start it unasked.
- **Shared packages** (`packages/*`): `db` (Neon Postgres + Drizzle, separate
  legal/medical databases; cars has its own via `@smartekai/db/cars`), `auth` (Better Auth, org plugin, multi-tenant),
  `billing` (FIFO credit ledger), `ai` (Deepgram transcription + Gemini
  SOAP/RAG), `crw` (Firecrawl-compatible search/scrape client), `marketing`
  (shared landing sections, framework-neutral — plain `<a>` tags, not
  `next/link`), `ui` (shadcn/Radix primitives), `emails` (React Email
  templates), `storage` (S3-compatible Neon Object Storage client).
- **No test suite, no CI.** `scripts/gate.sh` runs typecheck/lint/build plus a
  secret scan and a forbidden-paths check; there's no test step to run yet and
  no CI wiring to call it automatically. Validation is otherwise manual: the
  gate, plus a real click-through of the changed flow.
- **Deployment:** Dokploy on a self-managed VPS, no remote git configured
  from this machine. One Dokploy application per app, built via
  `turbo prune <app> --docker` + a per-app `Dockerfile`.
- **Plans, specs, and SOPs live under `.agents/<app>/`**, not `docs/` — one
  folder per app (`.agents/medical/`, `.agents/legal/`), plus
  `.agents/monorepo/` for cross-cutting work that spans apps or touches shared
  `packages/*`. Each has `plans/`, `specs/`, and `sops/`: `plans/active.md` is
  that app's current work state, other `plans/`/`specs/` files are
  point-in-time design docs and implementation plans kept for history, and
  `sops/` holds standing reference material (e.g. platform docs a user pastes
  in) relevant to that app. The `superpowers` skills default to
  `docs/superpowers/...` — redirect them to `.agents/<app>/specs/`/
  `.agents/<app>/plans/` explicitly at invocation time (their own documented
  override mechanism; not automatic).
- **Logs** (`.agents/logs/*.md`): one file per notable decision, root cause,
  or troubleshooting session.
