# Active Plan: Compound SaaS Core Reuse Migration

## Source of Truth
- `.agents/directives/sop_compund_saas_repo.md`
- `AGENTS.md`
- `ai-law-copilot/` (reference only — do not modify)

## Architecture Principle
Do not copy full product implementations into each app. Extract reusable business, AI, auth, billing, database, and UI/workspace logic into `packages/`. Keep `apps/legal-os` and `apps/medical-os` as thin product frontends.

## Current Task: Sync legal-os with canonical source
- [x] Audit differences between legal-os and ai-law-copilot
- [x] Sync package.json scripts (db:push, db:studio, security:report, check, type-check)
- [x] Sync tsconfig.json configuration
- [x] Update landing page with full ProductShowcase (replacing SharedMarketingSections)
- [x] Add full marketing sections (platform capabilities, industries, CTA)
- [x] Localize pricing features and button text (EN/AR)
- [x] Add DemoRequestModal to pricing section
- [x] Validate type-check passes
- [x] Validate build passes
- [x] Commit on branch `feat/sync-legal-os-from-canonical`

## Completed Packages
- [x] `packages/db` — Drizzle schema with legal, medical, auth, billing, KB, session tables
- [x] `packages/auth` — Better Auth configuration
- [x] `packages/billing` — Credit manager and weighted credit utilities
- [x] `packages/marketing` — DRY data-driven marketing sections (MarketingHeader, MarketingHero, PlatformValueSection, ProductShowcase, SecuritySection, MarketingFooter)
- [x] `packages/ui` — Foundational shadcn/base UI components
- [x] `packages/emails` — Email templates
- [x] `packages/ai` — AI/RAG modules (placeholder)

## App Status
- [x] `apps/legal-os` — Synced with canonical, full marketing pages with i18n (EN/AR)
- [ ] `apps/medical-os` — Basic shell, needs: demo/invite system, marketing pages
- [ ] `apps/voice-os` — Not created yet

## Next Step
Add DemoRequestModal, marketing pages, and team invitation system to `apps/medical-os`, then prepare Dokploy-compatible standalone outputs.

## Branch
`feat/sync-legal-os-from-canonical` (just committed)