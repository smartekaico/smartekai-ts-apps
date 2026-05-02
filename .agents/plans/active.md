# Active Plan: Compound SaaS Core Reuse Migration

## Source of Truth
- `.agents/directives/sop_compund_saas_repo.md`
- `AGENTS.md`

## Architecture Principle
Do not copy full product implementations into each app. Extract reusable business, AI, auth, billing, database, and UI/workspace logic into `packages/`. Keep `apps/legal-os` and `apps/medical-os` as thin product frontends.

## Current Task: Core Engine Extraction from `ai-law-copilot`
- [x] Audit existing Legal OS APIs and Medical OS AI implementation.
- [x] Instantiate `.agents/` execution structure.
- [x] Align migration plan with compound SaaS SOP.
- [x] Initialize shared `packages/db` schema with legal, medical, auth, billing, KB, and session tables.
- [x] Initialize shared `packages/auth` with reusable Better Auth configuration.
- [x] Initialize shared `packages/billing` credit manager and weighted credit utilities.
- [~] Initialize shared `packages/ui` with foundational shadcn/base UI components.
- [x] Initialize shared `packages/marketing` with DRY data-driven marketing sections.
- [x] Wire Medical OS landing page to shared `packages/marketing` primitives.
- [x] Wire Legal OS landing value/showcase/security sections to shared `packages/marketing` primitives while keeping localized app-specific hero/pricing.
- [x] Preserve app-local imports until shared packages are complete and validated.
- [x] Validate shared packages and app builds after dependency normalization.
- [ ] Extract reusable AI/RAG modules into `packages/ai` with product/organization filtering.
- [ ] Add `productId`/entitlement isolation to KB/RAG flows where missing.
- [ ] Prepare Dokploy-compatible app outputs (`output: 'standalone'`) after package validation.

## Next Step
Continue extracting AI/RAG modules into `packages/ai` with `organizationId` + `productId` isolation, then prepare Dokploy-compatible standalone app outputs.
