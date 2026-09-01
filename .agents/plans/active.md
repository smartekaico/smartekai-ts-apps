# Active Plan: Medical OS — Next.js → TanStack Start Migration

## Scope
Replace Next.js with TanStack Start in `apps/medical-os`, keeping Turborepo unchanged, with zero behavior change to routes/UI/API contracts. Swap `apps/medical-os` App Router → TanStack Start (React Router file-based routing, Vite + Nitro build), fix `packages/marketing`'s `next/link`, add like-for-like Nitro build output support in `turbo.json`, and add a Dockerfile for Dokploy.

## Plan
`.agents/plans/2026-09-01-medical-os-tanstack-start-migration.md`

Spec: `.agents/specs/2026-09-01-medical-os-tanstack-start-migration-design.md`

## Branch
`feat/medical-os-tanstack-start-migration` (clean state, created from `main`)

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
