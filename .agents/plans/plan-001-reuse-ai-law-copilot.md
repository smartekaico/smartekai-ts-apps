# Plan: Reuse ai-law-copilot Implementation

## Task ID: PLAN-001 | Est. Cost: $0.00

### Objective:
Migrate and reuse the mature implementation of landing pages, auth, user management, billing, and dashboards from `ai-law-copilot` into the `smartekai-saas` monorepo structure.

### Steps:
1. **Core Package Migration (Orchestration)**
   - Migrate database schema from `ai-law-copilot/src/db/schema.ts` to `packages/db/src/schema.ts`.
   - Migrate Auth configuration from `ai-law-copilot/src/lib/auth.ts` to `packages/auth/src/index.ts`.
   - Migrate Billing/Credits logic from `ai-law-copilot/src/lib/credits` to `packages/billing/src`.
   - Migrate UI components from `ai-law-copilot/src/components/ui` to `packages/ui/src`.

2. **App-Level Integration (Execution)**
   - Port `ai-law-copilot/src/app/[locale]/(marketing)` to `apps/legal-os/src/app/[locale]/(marketing)`.
   - Port `ai-law-copilot/src/app/[locale]/(auth)` to `apps/legal-os/src/app/[locale]/(auth)`.
   - Port `ai-law-copilot/src/app/[locale]/dashboard` to `apps/legal-os/src/app/[locale]/dashboard`.
   - Repeat for `apps/medical-os` using relevant components.

3. **Refactoring for Multi-Tenancy**
   - Ensure all migrated queries use the `organizationId` filtering as per `smartekai-saas` rules.
   - Update imports to use workspace packages (e.g., `@smartekai/db`, `@smartekai/auth`).

### Affected Files:
- `packages/db/src/schema.ts` (Create/Update)
- `packages/auth/src/index.ts` (Update)
- `packages/billing/src/*` (Update)
- `packages/ui/src/*` (Create)
- `apps/legal-os/src/app/*` (Create/Update)

### Rollback:
- Revert changes in `smartekai-saas` using git. `ai-law-copilot` remains untouched.

### Open Questions:
- Should we use a shared `marketing` app or keep marketing pages within each OS app?
- Are there any specific environment variables in `ai-law-copilot` that need to be synchronized?
