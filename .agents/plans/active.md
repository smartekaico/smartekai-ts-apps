# Active Plan: Medical OS — Next.js → TanStack Start Migration

## Scope
Replace Next.js with TanStack Start in `apps/medical-os`, keeping Turborepo unchanged, with zero behavior change to routes/UI/API contracts. Swap `apps/medical-os` App Router → TanStack Start (React Router file-based routing, Vite + Nitro build), fix `packages/marketing`'s `next/link`, add like-for-like Nitro build output support in `turbo.json`, and add a Dockerfile for Dokploy.

## Plan
`.agents/plans/2026-09-01-medical-os-tanstack-start-migration.md`

Spec: `.agents/specs/2026-09-01-medical-os-tanstack-start-migration-design.md`

## Branch
`feat/medical-os-tanstack-start-migration` — Tasks 1–9 implemented and verified
(commits `e054e68..4841a23`), merged into `main`.

## Follow-up executed 2026-09-02
`.agents/plans/2026-09-02-monorepo-dependency-updates.md` — safe same-major bumps,
unused-dep removals, phantom-dep declarations — executed on
`chore/dependency-updates` (gates green vs pre-existing lint baseline; both apps
retested). Major-version bumps (ai SDK v7, biome v2, lucide 1.x, etc.) remain
deferred — each needs its own scoped plan.

## Source of Truth
The implementation plan file is the source of truth for task-by-task steps. See its 9 tasks:
1. Root monorepo config (turbo.json outputs add `.output/**`, .gitignore)
2. Fix `@smartekai/marketing` `next/link` → plain `<a>`, drop `next` dep
3. Bootstrap TanStack Start toolchain (vite.config, tsr.config, eslint, .cta.json, router.tsx, routes/__root, routes/index, package.json, tsconfig, tailwind config)
4. Port workspace dashboard (workspace/route.tsx layout, workspace/index.tsx, MedicalSidebar, MedicalDashboard)
5. Port session detail route (`$id.tsx`)
6. Port the two API routes as server routes (api/generate-soap.ts, api/transcribe.ts)
7. Remove Next.js (delete src/app/, next.config.js, next-env.d.ts; full verification)
8. Dockerfile for Dokploy (turbo prune pattern)
9. Full manual verification (real API keys, browser golden path)

## Execution Method
superpowers:subagent-driven-development — fresh implementer subagent per task, then spec-compliance review then code-quality review.

## Key Decisions
- Tailwind stays on v3 (PostCSS) — NOT upgraded to CLI default v4
- TypeScript `^6.0.3` for medical-os package only
- API routes stay as HTTP server routes (raw `server.handlers`), NOT `createServerFn` RPC
- Plain `<a>` used uniformly in Medical OS components (no TanStack `Link`/`to`/`params` needed)
- `routeTree.gen.ts` committed to git
- `.output/` is self-contained (verified): `node .output/server/index.mjs`

## Current work (2026-09-02): shared landing + SOAP access — `feat/shared-landing-and-soap-access`
Approved scope (plan-mode, user "go" with defaults):
1. `@smartekai/marketing`: new config-driven `MarketingLandingPage` (+
   `MarketingSiteConfig` type). Composes existing sections — their markup stays
   untouched (legal-os renders them live). New component only: composition +
   light polish (reveal, accent theming via config).
2. medical-os home → config object + `<MarketingLandingPage>`; footer "SOAP
   Generation" link → `/workspace/notes` (was raw API URL).
3. medical-os: new `/workspace/notes` route — standalone SoapNoteEditor, no
   persistence (copy/download only).
4. medical-os: hide dead nav (Sessions/Clients/Appointments/Settings, Add
   Client); keep Dashboard / SOAP Notes / New Session; point dashboard "SOAP
   Notes" stat card to /workspace/notes; drop phantom /api/medical/* fetches.
5. Gates: turbo type-check/lint/build medical-os (+marketing dep), dev
   click-through incl. real SOAP generation on the new page.
Deferred (agreed): legal-os adoption of MarketingLandingPage = separate follow-up
(i18n/SEO/RTL surface); real note persistence/auth = separate project.
(`chore/dependency-updates` branch: dep triage committed there, unmerged.)

