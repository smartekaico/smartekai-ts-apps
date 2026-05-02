# PR Description: Compound SaaS Shared-Core Migration

## Summary
- Normalized workspace dependencies after extracting Legal OS into the Turborepo shell.
- Fixed Next.js 16/Turbopack monorepo root configuration for Legal OS and Medical OS.
- Wired Legal OS with the `next-intl` plugin after migration.
- Externalized Node document parser packages from Legal OS server bundling.
- Added missing localized marketing copy required by static builds.
- Extended `packages/marketing` so shared platform/security sections accept localized app-provided content.
- Wired the Legal OS landing value, product showcase, and security sections through shared `packages/marketing` primitives.
- Added Legal OS workspace dependency/transpilation wiring for `@smartekai/marketing` and `@smartekai/ui`.
- Preserved no-secret policy by using local build-time env placeholders only during validation.

## Validation
- `npm install --package-lock-only` completed successfully.
- `npm run type-check` passed.
- `BETTER_AUTH_SECRET=local-build-placeholder-secret-32-chars npm run build` passed.
- `npm audit --audit-level=high` found no high/critical vulnerabilities; 24 moderate advisories remain and require planned dependency upgrades because fixes include breaking changes.
- `npm run lint` is blocked by existing workspace lint tooling because `eslint` is not installed/resolved for package lint scripts.

## Notes
- `package-lock.json` was checked with `npm install --package-lock-only` after adding Legal OS workspace package references.
- Snapshots were created under `.agents/snapshots/` before source/config edits.
- The repository directory currently has no discoverable `.git` metadata, so branch/diff commands are unavailable in this workspace.
- Next step is extracting Legal OS KB/RAG modules into `packages/ai` with `organizationId` and `productId` isolation.
