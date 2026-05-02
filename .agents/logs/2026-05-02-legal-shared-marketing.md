# Legal OS Shared Marketing Wiring — 2026-05-02

## Decision
Legal OS now reuses `packages/marketing` for landing-page platform value, product showcase, and security sections while keeping app-local localized hero, pricing, header, footer, demo modal, and analytics wrappers.

## Files changed
- `packages/marketing/src/index.tsx`
- `apps/legal-os/src/components/marketing/SharedMarketingSections.tsx`
- `apps/legal-os/src/app/[locale]/(marketing)/page.tsx`
- `apps/legal-os/package.json`
- `apps/legal-os/next.config.js`
- `.agents/plans/active.md`
- `.agents/docs/pr-description.md`

## Validation
- `npm install --package-lock-only` completed.
- `npm run type-check` passed.
- `BETTER_AUTH_SECRET=local-build-placeholder-secret-32-chars npm run build` passed.
- `npm audit --audit-level=high` found no high/critical advisories; 24 moderate advisories remain.

## Blockers / notes
- `npm run lint` is currently blocked by missing `eslint` resolution in package lint scripts, starting at `@smartekai/billing`.
- No `.git` metadata is discoverable from this workspace, so branch and git diff/status checks are unavailable.
