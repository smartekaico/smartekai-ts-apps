# Medical OS: Next.js → TanStack Start Migration (Pilot)

## Context

This monorepo (Turborepo + npm workspaces) runs two Next.js 16 / React 19 apps
(`apps/legal-os`, `apps/medical-os`) sharing packages under `packages/*`. The
goal is to move off Next.js to TanStack Start for performance / bundle size /
dev server speed, without changing the Turborepo stack.

The full migration spans 3+ independent pieces of work:

1. **This spec: Medical OS pilot migration** (small surface area — no i18n,
   no auth wiring, 2 API routes)
2. Legal OS migration (large — `next-intl` i18n, 41 API routes, 13 server
   actions) — **separate future spec, out of scope here**
3. Any further shared-package adjustments needed once Legal OS's larger
   Next.js surface area is tackled — **out of scope here**

Medical OS goes first as the pilot to prove the framework-swap pattern
(routing, server routes, build/deploy) before applying it to the much larger
Legal OS.

## Non-goals

- No change to `packages/auth` (Better Auth, staying on Neon Postgres — no
  Neon Auth / Stack Auth switch was requested or is planned).
- No change to `packages/db` (Neon Postgres + Drizzle Kit stays exactly as
  is), `packages/billing`, `packages/ai`, `packages/ui`, `packages/emails`,
  `packages/crw`. None of these import anything Next.js-specific today.
- No change to `apps/legal-os`.
- No new automated test infrastructure — validation for this migration is
  manual (matches current repo-wide practice; there are no tests anywhere
  in the repo today).
- No refactor of `VoiceRecorder`'s calling convention — API routes are kept
  as HTTP handlers, not converted to TanStack Start server functions (RPC
  style), to keep this a framework swap rather than a feature rewrite.

## Scope

- `apps/medical-os` — full framework swap from Next.js App Router to
  TanStack Start (React Router file-based routing, Vite build).
- `packages/marketing/src/index.tsx` — one-line fix: replace
  `import Link from "next/link"` with a plain `<a>` tag, and drop `next`
  from its `package.json` dependencies. This is shared by both apps, but a
  plain anchor tag works identically in Next.js (legal-os keeps working,
  just without client-side prefetch on those specific marketing links) and
  TanStack Start (medical-os). Rejected alternative: a pluggable
  `Link`-component prop/context — more "correct" long term, but adds an
  abstraction to a single-file, 213-line package for a problem (losing
  prefetch on marketing nav links) that doesn't matter in practice.
- `turbo.json` — add TanStack Start's build output path alongside the
  existing `.next/**` (not replacing it, since Legal OS still needs it).
  Exact task/output wiring follows the installed `turborepo` skill
  (`.agents/skills/turborepo`) rather than being hand-guessed here.

## Rollout & validation

- **Rollout:** in-place on a new feature branch inside `apps/medical-os`
  (matches how this repo already works — branch per feature). No parallel
  app directory.
- **Validation:** manual only — `turbo run type-check --filter=medical-os`,
  `turbo run lint --filter=medical-os`, `turbo run build --filter=medical-os`,
  then `npm run dev:medical` and click through: marketing home page →
  `/workspace` dashboard → open a session → record voice → transcribe →
  generate SOAP note, watching for console errors at each step.

## Scaffolding approach: TanStack CLI

Implementation scaffolds via the current, non-deprecated TanStack CLI
(`@tanstack/cli`; the older `create-tanstack` package now prints a
deprecation warning pointing to this one) rather than hand-writing Vite
config from scratch:

1. Run into a **scratch directory first** (not directly into
   `apps/medical-os`), to inspect generated files/deps/env/hooks before
   touching real code:
   ```sh
   npx @tanstack/cli create <scratch-name> \
     --framework react \
     --deployment nitro \
     --toolchain eslint \
     --no-git
   ```
   - `--deployment nitro`: the CLI's own add-on catalog describes this as
     "Generic Nitro adapter (deploy to any Node-compatible host)" — matches
     Dokploy's plain-Node-process deployment model. (`vercel`, `cloudflare`,
     `netlify`, `railway`, `render` are the other options and all assume
     those specific platforms.)
   - `--toolchain eslint`: matches Medical OS's current `next lint`
     (ESLint), not Biome (which Legal OS uses).
   - No `drizzle`, `better-auth`, or `shadcn` add-ons — Medical OS already
     gets those via `@smartekai/db` and its existing hand-copied shadcn
     components; the CLI's versions would create duplicate/conflicting
     setups.
2. Diff the generated `vite.config.ts`, `package.json`, route-file
   conventions, and env handling against Medical OS's current setup, then
   port Medical OS's actual routes/components/API logic into the new
   structure (see routing map below).
3. Keep the generated **`.cta.json`** committed alongside
   `apps/medical-os` — the CLI's state file, enabling future
   `npx @tanstack/cli add` calls instead of hand-editing config.

## Routing & file mapping

| Current (Next.js App Router) | New (TanStack Start) |
|---|---|
| `app/layout.tsx` | `routes/__root.tsx` |
| `app/page.tsx` (marketing home) | `routes/index.tsx` |
| `app/workspace/page.tsx` | `routes/workspace/index.tsx` |
| `app/workspace/sessions/[id]/page.tsx` | `routes/workspace/sessions/$id.tsx` |
| `app/api/generate-soap/route.ts` | `routes/api/generate-soap.ts` |
| `app/api/transcribe/route.ts` | `routes/api/transcribe.ts` |
| `components/`, `hooks/` | unchanged — plain React, no framework coupling |

API routes are kept as server-route files (HTTP method handlers), a
near-1:1 rename of the existing `route.ts` handlers — internal logic
(calls into `@smartekai/ai`, Deepgram, Gemini) doesn't change, and
`VoiceRecorder`'s `fetch()` calls don't change either.

## Other framework-specific replacements

- `next/font/google` (`Inter`, used in `app/layout.tsx`) → `@fontsource/inter`
  (self-hosted font package, standard for Vite apps).
- No `next/image` usage in Medical OS today (confirmed by grep) — nothing
  to replace.
- No `NEXT_PUBLIC_*` env vars in Medical OS today (confirmed by grep) — no
  env var renaming needed.
- `next.config.js`'s `transpilePackages`/`serverExternalPackages` are
  dropped entirely — Vite consumes the workspace packages' built `dist/`
  output via normal Node module resolution, no special config needed.

## Deployment risk (flagged, not fully resolved here)

There is no `Dockerfile` anywhere in this repo today, meaning Dokploy is
almost certainly auto-building Medical OS via Nixpacks' Next.js detection.
Nixpacks will not auto-detect TanStack Start the same way. This spec adds
an explicit `Dockerfile` for `apps/medical-os` (Node server running the
Nitro build output) so the deploy step isn't guessing — but the actual
Dokploy application's build/start configuration lives outside this repo and
can't be verified from the codebase alone. **Manual follow-up required
after merge:** confirm/update the Dokploy app's build settings to use the
new Dockerfile (or the equivalent build/start commands) before relying on
a deploy.

## Out of scope / explicitly deferred

- Legal OS migration (separate future spec).
- Any auth provider change (Better Auth stays; no Neon Auth switch).
- Introducing automated tests.
- Converting API routes to TanStack Start server functions.
