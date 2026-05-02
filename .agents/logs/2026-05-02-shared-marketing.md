# Shared Marketing Extraction

## Scope
Implemented the first DRY shared marketing package for the compound SaaS architecture.

## Changes
- Created `packages/marketing` as a workspace package.
- Added reusable, data-driven marketing sections:
  - `MarketingHeader`
  - `MarketingHero`
  - `PlatformValueSection`
  - `ProductShowcase`
  - `SecuritySection`
  - `MarketingFooter`
- Refactored package internals around shared `MarketingCard`, `CardGrid`, `Section`, `NavLinks`, and product data instead of copy-pasted section markup.
- Wired `apps/medical-os/src/app/page.tsx` to use `@smartekai/marketing` while keeping Medical OS non-i18n.
- Added `@smartekai/marketing` to Medical OS dependencies and Turbopack transpilation.

## Validation
- `npm run type-check` passed.
- `BETTER_AUTH_SECRET=local-validation-secret-minimum-32-chars RESEND_API_KEY=re_dummy_key npm run build` passed.

## Notes
- Legal OS still has mature localized marketing components in-app. They should be migrated incrementally to shared package APIs to avoid destabilizing the current Legal OS surface.
- `tsconfig.json` remains parseable by TypeScript as JSONC; avoid relying on it for strict JSON tooling until normalized.
