# Legal OS: Shared-Package Consolidation + Next.js → TanStack Start Migration

Status: **PAUSED 2026-10-15** by the user, mid-way through writing the
implementation plan (no plan file written, no legal-os code changed).
Design approved 2026-10-14. Read "Findings while planning" below before
resuming — several of them change the steps in Part A.

## Context

`apps/legal-os` is the last Next.js app in the monorepo (Next 16.4, App Router,
`next-intl`). `apps/medical-os` (pilot, see
`.agents/medical/specs/2026-09-01-medical-os-tanstack-start-migration-design.md`)
and `apps/cars-4by4-builder` already run on TanStack Start + Vite + Nitro.

Two facts shape this design:

1. **legal-os barely uses the shared packages.** It imports only
   `@smartekai/crw` and `@smartekai/marketing`. Auth, DB/schema, credits,
   emails, UI primitives and AI provider calls all live in local copies, with
   direct SDK imports (`drizzle-orm` ×61, `ai` ×13, `@ai-sdk/*` ×9,
   `better-auth/*` ×9, `resend`, `@upstash/*`, `@neondatabase/serverless`).
   This violates two AGENTS.md invariants: DB access stays inside
   `packages/db`; apps never call a provider SDK directly.
2. **The Next.js surface is large:** 51 pages, 6 layouts, 41 API routes,
   13 `"use server"` files, `next/headers` ×70, `next/navigation` ×34,
   `next-intl` ~70 call sites (57 `getTranslations`, 40 `setRequestLocale`),
   17 `generateMetadata`/`metadata` exports, `next/image` ×8, and
   `src/proxy.ts` (locale routing + dashboard/admin cookie gate).

Decisions already made with the user:

- legal-os in this monorepo is canonical; `ai-law-copilot` is not synced
  from any more, so the migration has no fork/sync cost.
- legal-os is **pre-launch**: no URL, SEO or session continuity constraints.
- Done = **full parity** — every page and API route behaves as today. Dead code
  found on the way is listed, not deleted.

## Goals

- **Part A:** every shared service legal-os uses lives in `packages/*`; the app
  keeps only legal domain logic (prompts, tools, intent detection, UI, routes).
- **Part B:** legal-os runs on TanStack Start with the same structure as
  medical-os, and `next` / `next-intl` are gone from the repo.

## Non-goals

- No feature changes, no UX changes, no new tests infrastructure (repo has none;
  validation is gate + manual, as everywhere else).
- legal-os keeps **Biome** as its linter (no switch to `@tanstack/eslint-config`
  in this work).
- No TypeScript 7 (blocked: `typescript-eslint` supports `<6.1`, TS 7 has no JS
  compiler API — verified 2026-10-14).
- PostHog server client, Telegram alerts and audit logging stay app-local until
  a second app needs them (the "extract when a second app duplicates" rule —
  see memory `project_future-shared-packages`).
- No `db:push` / migration against the live legal DB without explicit approval
  at that step.

## Part A — Consolidate shared services (runs on Next.js)

Framework-neutral, so each step is verified against a working legal-os before
any framework change. Each step is its own branch (`chore/legal-<scope>`),
merged when its gate passes. Order follows the dependency graph:

| # | legal-os local | → package | Notes |
|---|---|---|---|
| A1 | `src/db/schema.ts` (29 tables), `lib/db.ts`, drizzle config | `@smartekai/db` (`dbLegal`) | Highest risk. Column-level diff local vs package schema first; tables seen only locally: `audit_logs`, `case_analyses`, `credit_buckets`, `kb_categories`, `kb_jurisdictions` (re-verify `account`/`session`/`member`). Source of truth = live legal DB via read-only `drizzle-kit pull`. Loose SQL/migration scripts in `src/db/` (`*.sql`, `targeted_migration.ts`, `update_functions.ts`, seeds) are inventoried and archived, not re-run. |
| A2 | all app-side DB queries (61 `drizzle-orm` imports, incl. `lib/kb/store.ts`, `retrieve.ts`) | `@smartekai/db` query modules | `organizationId` filter on every query; KB/RAG queries also `productId`. App calls typed functions, never `drizzle-orm`. |
| A3 | `lib/auth.ts`, `auth-utils.ts`, `auth-client.ts`, `mail.ts` | `@smartekai/auth` | Copies differ by ~127 lines — merge into the single shared instance (AGENTS.md). Removing `better-auth/next-js` also unblocks Part B. Better Auth 1.7.7 schema columns already fixed in all three schemas and both DBs (2026-10-15, `48e6439`); the merge must keep them. Three instances exist today (`packages/auth`, legal-os local, cars) — cars keeps its own (separate DB, anonymous plugin); legal-os's merges into `packages/auth`. |
| A4 | `lib/credits/*` | `@smartekai/billing` | Near-identical; reconcile, delete local. |
| A5 | `src/emails/*` (8) | `@smartekai/emails` (has 3) | Add the 5 missing templates (`AdminAlert`, `AdminCreditRequest`, `CreditExpiry`, `DemoApproved`, `UserCreditRequestConfirmed`); dedupe the 3 shared. |
| A6 | provider calls in `lib/ai/*`, `lib/embeddings.ts`, `lib/kb/embed.ts`, `lib/kb/generate.ts` | `@smartekai/ai` | Only `ai` / `@ai-sdk/*` calls move (chat, generate, embed, model selection). Prompts, tools, intent detector stay in the app. `@ai-sdk/react` (client hook) stays in the app. |
| A7 | `lib/redis.ts` rate limiter + `apps/cars-4by4-builder/src/server/rate-limit.ts` | new `@smartekai/ratelimit` | Interface = cars' `tryConsume(rules: {key,limit,windowMs}[]): Promise<boolean>` (all-or-nothing across rules). Backend: Upstash sliding window when `UPSTASH_REDIS_REST_URL/TOKEN` set, in-memory otherwise. legal-os's `isEnterpriseActive()` is a feature flag — stays in the app. |
| A8 | `components/ui/*` (23 shadcn, Tailwind 4) | `@smartekai/ui` (5) | **Gated** on moving medical-os, cars-4by4-builder and `packages/ui` to Tailwind 4 first (compatibility confirmed 2026-10-14: `@tailwindcss/vite` supports Vite 8; add `@source` for workspace packages). Then `ui` has one Tailwind major and one `tailwind-merge` (3.x). |

Part A exit check: `grep` of `apps/legal-os/src` finds no imports of
`drizzle-orm*`, `@neondatabase/serverless`, `ai`, `@ai-sdk/google|openai`,
`better-auth` (server side), `resend`, `@upstash/*`.

## Part B — Migrate to TanStack Start (in place, incremental)

Approach chosen over a parallel `apps/legal-os-start` (duplicate Dokploy app,
rename churn, no benefit pre-launch) and a big-bang port (nothing runs for days).

### Target layout

```
apps/legal-os/
  vite.config.ts          nitro() + tanstackStart() + viteReact(); env-loading shim
                          (as medical-os); ssr.external: @llamaindex/liteparse,
                          mammoth, pdf-parse-fork, word-extractor (replaces
                          serverExternalPackages)
  src/routes/
    __root.tsx            <html lang dir>, providers (PostHog, Toaster), CSS
    index.tsx             "/" → redirect /ar   (replaces proxy.ts locale step)
    $locale/route.tsx     locale ∈ {ar, en} else notFound; load messages;
                          <IntlProvider>; sets dir="rtl" for ar
    $locale/(marketing)/… 18 pages + layout (blog reads content/blog/*.md)
    $locale/login, forgot-password, reset-password, invite,
    $locale/(auth)/accept-team-invite
    $locale/dashboard/route.tsx    beforeLoad: auth.api.getSession() →
                                   redirect /$locale/login?callbackUrl=…
    $locale/dashboard/(workspace)/…  22 pages
    $locale/dashboard/(admin)/…      7 pages (+ admin role check in beforeLoad)
    api/…                 41 server routes, same URL paths as today
  src/server/             13 former "use server" files → createServerFn modules
  src/lib/i18n.ts         locales/defaultLocale, getT(locale) via use-intl
                          createTranslator, locale-aware Link/useNavigate
  src/lib/request.ts      getRequestHeaders()/getCookie() adapters for next/headers
```

### Mapping

| Next.js | TanStack Start |
|---|---|
| `next-intl` client (`useTranslations`, `useLocale`) | `use-intl` — same API and message JSON; call sites unchanged |
| `next-intl/server` `getTranslations` / `setRequestLocale` / `getMessages` | `getT(locale)` in loaders/`head()`; locale from `$locale` param (setRequestLocale deleted) |
| `next-intl` `Link`/`redirect`/`usePathname`/`useRouter` | TanStack `Link`/`redirect`/`useLocation`/`useNavigate` with `locale` param |
| `src/proxy.ts` | `/` redirect + `$locale` validation + dashboard `beforeLoad` (real session check, stricter than today's cookie-presence check) |
| `app/api/**/route.ts` | `src/routes/api/**` server routes (`server.handlers`), 1:1 |
| `"use server"` actions | `createServerFn` (callers: `fn(x)` → `fn({ data: x })`) |
| `next/headers` `headers()` / `cookies()` | `src/lib/request.ts` over `@tanstack/react-start/server` |
| `generateMetadata` / `metadata` | route `head()` |
| `next/image` | `<img>` (remote: images.unsplash.com, avatars.githubusercontent.com) |
| `next/link`, `next/navigation` | `@tanstack/react-router` |
| `revalidatePath` / `redirect()` | `router.invalidate()` / `throw redirect()` |
| `@svgr/webpack` turbopack rule | dropped — no `.svg` component imports exist |

### Phases

Each phase ends with legal-os building and the phase's routes clicked through.

1. **Shell** — tooling swap (Vite/Start/Nitro, `start: node .output/server/index.mjs`),
   `__root`, `$locale` + i18n, `lib/request.ts`, `api/auth/$` (Better Auth
   handler), login / forgot-password / reset-password. `src/app/` excluded
   from `tsconfig` and deleted route by route as each is ported.
2. **API routes (41)** in batches: `legal/*` (25) → `admin/*` (9) →
   `auth/callback`, `org`, `team`, `search`, `parse-document`, `cron/purge`.
3. **Server functions** — the 13 action files and their callers.
4. **Marketing (18 pages)** incl. blog and `head()` metadata.
5. **Dashboard** — workspace (22), then admin (7).
6. **Cleanup** — delete `src/app/`, `src/proxy.ts`, `next.config.js`,
   `next-env.d.ts`; remove `next`, `next-intl`, `@svgr/webpack`; legal-os
   Dockerfile → Nitro `.output` runner (as medical-os); `turbo.json` build
   outputs drop `.next/**`; AGENTS.md "Apps" line updated (all apps TanStack
   Start).

## Validation

- **Every step/phase:** `npx turbo run type-check build --filter=legal-os...`;
  legal-os lint must not exceed the 2026-10-14 baseline (173 Biome errors).
  `./scripts/gate.sh` secret scan + forbidden-paths must pass.
- **Part A click-through (fixed checklist):** magic-link login, org switch,
  create case, KB upload + RAG query (ar and en), credit deduction, team invite
  email.
- **Part B:** each phase repeats the checklist for the routes it ported, checks
  both `dir` values, and curls each ported API route comparing status + response
  shape against `main`. Phase 2 OCRs a real scanned PDF (liteparse
  `ocrLanguage: "ara+eng"`).

## Risks

| Risk | Mitigation |
|---|---|
| Schema drift local ↔ package ↔ live DB (A1) | Read-only `drizzle-kit pull` is the source of truth; every difference is an ask-first item; no automatic push. |
| Two diverged auth configs (A3) | Diff behaviourally (plugins, hooks, email callbacks) before merging; one instance shared by all apps. |
| `packages/ui` serving two Tailwind majors (A8) | A8 blocked until the TanStack apps are on Tailwind 4. |
| RTL / default-locale regressions | `ar` default + `dir` checked every Part B phase. |
| Native/CJS doc parsers under Nitro | `ssr.external`; real-file OCR check in phase 2. |
| SSR icon hydration mismatch (seen in medical-os) | Same `ssr.noExternal: ["lucide-react"]` setting. |

## Deliverables

- This spec.
- Implementation plan: `.agents/legal/plans/active.md` (Part A then Part B,
  task by task), written with the `writing-plans` skill.

## Findings while planning (2026-10-15)

Recorded when the work was paused. Decisions marked **(user)** were made
then and supersede the matching text above.

1. **Schema merge is a non-issue.** A three-way column diff (legal-os
   `src/db/schema.ts` vs `packages/db/src/schema.ts` vs live DB
   `information_schema`) found every legal table identical in name, type and
   nullability. Export names match too (the package is a superset: it adds
   the medical tables and relations). A1 reduces to an import switch. The
   earlier "tables only in legal-os" list was a grep artifact.
2. **A2 scope (user): client + schema only.** Match cars/medical — legal-os
   imports the DB client and tables from `@smartekai/db` and keeps writing
   Drizzle queries in-app. The 66-file query move is dropped. By the same
   rule, A6 moves provider construction (`createOpenAI` /
   `createGoogleGenerativeAI`, the `providers` map in `lib/ai/model-utils.ts`,
   embedding models) into `@smartekai/ai`; the `ai` core (`streamText`, `tool`,
   `UIMessage`) stays usable in the app.
3. **Legal DB (user): `neondb` via `DATABASE_URL`, unchanged.** Locally
   `DATABASE_URL` and `DATABASE_NEONDB_SMARTEKAI` (cars) are the **same**
   database (`ep-win…/neondb`), which is why it also holds `cars_*`,
   `builds`, `parts`, `vehicles`. `DATABASE_LEGAL_URL` points to a different
   DB (`ep-hol…/ai-law-copilot`) — so legal-os must **not** be switched to
   `@smartekai/db`'s `dbLegal`, which reads `DATABASE_LEGAL_URL` first.
   Production (Dokploy) env not checked.
4. **`@smartekai/db` has no transaction-capable client.** It exports only
   `neon-http` clients; legal-os deliberately uses `neon-serverless` (Pool)
   for ACID credit accounting. Part A must add a pooled client on
   `DATABASE_URL` and expose the Pool for the raw parameterized
   `pool.query(text, params)` calls in `lib/kb/retrieve.ts`, `lib/kb/store.ts`,
   `lib/audit.ts` and `src/scripts/*`.
5. **Latent bug: `@smartekai/billing` would throw on first use.** Its
   `addCreditsToOrg` / `consumeCredits` call `db.transaction()` on the
   `neon-http` client ("No transactions support in neon-http driver").
   Nothing consumes the package yet. Fix with finding 4.
6. **Billing would double-log.** Billing's `consumeCredits` inserts its own
   `CREDITS_CONSUMED` audit row; legal-os's `draft`, `kb/upload`, `chat` and
   `contracts/generate` routes already log. When A4 lands, make the package
   match legal-os (no built-in audit insert) — it has no other consumers.
7. **Auth merge (A3) details.** Configs are near-identical. Differences to
   reconcile: `trustedOrigins` (legal has `https://smartekai.com:3000`, package
   has the `legal.`/`medical.` subdomains — take the union); user
   `additionalFields` `firmName`, `subscriptionTier` exist only in legal-os;
   legal-os's `getBaseUrl`/`getPublicUrl` (`lib/utils.ts`, honours
   `PUBLIC_APP_URL`, production fallback `https://smartekai.com`) are more
   complete than the package's and should replace them; package `mail.ts`
   lacks legal-os's `"re_dummy_key"` fallback (resend 6 throws on a missing
   key). `auth-utils.ts` (uses `next/headers`) and `auth-client.ts` stay in the
   app. `better-auth/next-js` is only used in `app/api/auth/[...all]/route.ts`.
8. **Emails (A5).** The 3 shared templates are byte-identical (whitespace
   aside); 5 legal-only templates move. Templates have both named and default
   exports; switch legal-os's default imports to named imports from
   `@smartekai/emails`.
9. **Env names differ between apps.** legal-os reads `GEMINI_API_KEY`
   (fallback `GOOGLE_API_KEY`); `@smartekai/ai` reads `GOOGLE_AI_API_KEY`.
   Moved provider code must keep legal-os's names (or both set) for parity.
10. **Rate limit (A7).** legal-os uses one rule (`ratelimit_chat_${orgId}`,
    5/min sliding) and returns `limit`/`remaining`/`reset` as
    `X-RateLimit-*` headers, so the shared result must carry those fields,
    not just a boolean. legal-os's `redis` client and `isEnterpriseActive()`
    (used by `api/admin/debug/upstash`) stay app-local.
11. **Better Auth columns** already fixed in all three schemas and both DBs
    (`48e6439`); three auth instances exist (`packages/auth`, legal-os local,
    cars). cars keeps its own.

