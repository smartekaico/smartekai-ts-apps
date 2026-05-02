<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# SmartEkai Legal OS — Agent Guide

## Start Protocol

At the start of every task:

1. Read `.agent/plans/active.md` — current task state
2. Read `.agent/rules/CRITICAL.md` — Antigravity Protocol
3. Read your agent rule in `.agent/rules/` (if applicable)
4. Read relevant skills in `.agent/skills/` before writing code

## Developer Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push schema changes to Neon
npm run db:studio    # Open Drizzle Studio
```

**Note:** No test suite currently exists (`npm test` not configured).

## Architecture

### Route Groups
- `src/app/[locale]/(marketing)/` — Public marketing pages
- `src/app/[locale]/dashboard/` — Authenticated SaaS product
- `src/app/[locale]/(auth)/` — Login/signup flows
- `src/app/api/` — API routes (legal, medical, admin, cron)

### Locale Routing
- All pages under `[locale]` — supports `en` and `ar`
- **Default: `en`** (English)
- RTL handled via `next-intl` + `dir={locale === 'ar' ? 'rtl' : 'ltr'}`

## Critical Conventions

### RTL Support
Use **logical CSS properties only** — never `left`/`right`:
- `ps-*` (padding-start), `pe-*` (padding-end)
- `ms-*` (margin-start), `me-*` (margin-end)
- `start`, `end` for positioning

### Multi-Tenant Data Isolation
Every table and query MUST:
1. Include `organizationId` column
2. Filter by `organizationId` — never return cross-org data
3. Import `db` from `@/db` (uses Neon Pool connection)

### Authentication
Two options:
- Helper: `getAuthenticatedSession()` from `@/lib/auth-utils`
- Direct: `auth.api.getSession({ headers: await headers() })`

Always extract `activeOrganizationId` from session, never from query params.

### AI Configuration
- **LLM:** Gemini Flash 2.5 via AI Studio API (`@ai-sdk/google`)
- **Embeddings:** Gemini `textEmbeddingModel('gemini-embedding-2-preview')` (768-dim)
- Use `createGoogleGenerativeAI()` for LLM calls
- Set `runtime = 'nodejs'` and `maxDuration = 60` on all AI routes

### Credits System
- FIFO bucket-based in `src/lib/credits/credit-manager.ts`
- Always consume credits BEFORE AI calls
- Use `consumeCredits(orgId, amount, toolName)` helper

### PostHog Analytics
- Client: `posthog-js` via `@/components/providers/PostHogProvider`
- Server: `posthog-node` via `@/lib/posthog-server`

### Document Parsing
- Use `@llamaindex/liteparse` for PDF/DOCX extraction
- Custom retrieval in `src/lib/kb/retrieve.ts`

## Quality Gate

Before any PR:
1. `npm run build` — must pass
2. `npx tsc --noEmit` — types clean
3. `npm run lint` — no errors
4. `trivy fs --severity HIGH,CRITICAL .` — no vulnerabilities
5. Verify `NEXT_PUBLIC_*` vars contain only non-sensitive values
6. Check `organizationId` filtering on all queries

## Key Files

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Drizzle schema — all tables + pgvector |
| `src/db/index.ts` | Database connection (Neon Pool) |
| `src/lib/auth.ts` | Better Auth configuration |
| `src/lib/auth-utils.ts` | Auth helpers (`getAuthenticatedSession`) |
| `src/lib/auth-client.ts` | Client-side auth hooks |
| `src/lib/ai/model-utils.ts` | AI model configuration |
| `src/lib/kb/embed.ts` | Embedding generation (Gemini) |
| `src/lib/kb/retrieve.ts` | RAG retrieval logic |
| `src/lib/credits/credit-manager.ts` | Credit consumption |
| `src/i18n/routing.ts` | Locale routing config |
| `src/messages/en.json` | English translations |
| `src/messages/ar.json` | Arabic translations |
| `next.config.ts` | Next.js config + redirects |
| `drizzle.config.ts` | Drizzle Kit configuration |

## Dependencies

- **Framework:** Next.js 16.2.1 + React 19
- **Styling:** Tailwind CSS v4 + tw-animate-css + shadcn v4 (base-nova style)
- **Database:** Drizzle ORM + Neon Postgres + pgvector (768-dim)
- **Auth:** Better Auth + organization plugin
- **i18n:** next-intl (EN/AR, default: EN)
- **AI:** Vercel AI SDK + Gemini (LLM + embeddings)
- **Deployment:** Dokploy (Docker)
