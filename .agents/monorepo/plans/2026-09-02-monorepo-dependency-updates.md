# Monorepo Dependency Updates — Triage

**Executed 2026-09-02 on `chore/dependency-updates`:** safe same-major bumps
(`npm update` + exact-pin bumps react/react-dom 19.2.5→19.2.8, next 16.2.4→16.3.4,
@base-ui/react 1.4.1→1.7.0 resolved), unused-dep removals, and phantom-dep
declarations all landed. Gates: type-check + build green repo-wide; lint failures
identical to pre-update baseline (6 pre-existing: ai/auth/billing/crw/db `eslint
--ext` scripts + legal-os biome a11y). Retest: medical-os dev+prod all routes 200,
real Gemini SOAP call OK, console clean; legal-os dev+prod `/en` 200 (one dev-only
`<html>` font-class hydration notice, absent in production). Major bumps 1–7
below remain deferred; `tsx` borderline item remains undecided; knip sweep not
run.

## Safe now: same-major-version bumps (patch/minor, `npm update` respects existing caret ranges)

These won't change any `package.json` version pin — `npm update` (or `npm install`
after confirming the lockfile) just resolves to a newer version already allowed by
the existing `^`/range. Low risk, no code changes expected, but still run
`type-check`/`lint`/`build` per app afterward (§4 of `AGENTS.md`) before trusting it.

- `react` 19.2.5 → 19.2.8, `react-dom` 19.2.5 → 19.2.8 (all apps/packages)
- `@types/react`, `@types/react-dom`, `@types/node` — patch bumps
- `@radix-ui/react-progress`, `@radix-ui/react-scroll-area`, `@radix-ui/react-tabs`,
  `@radix-ui/react-slot` — minor bumps (medical-os, ui package)
- `@base-ui/react` 1.4.1 → 1.7.0 (legal-os, ui package — already permitted by
  existing range, just needs installing)
- `@tailwindcss/postcss`, `tailwindcss` 4.2.x → 4.3.x (legal-os — same major, v4)
- `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit` 3.22 → 3.31 (legal-os)
- `@swc/helpers`, `@upstash/redis`, `autoprefixer`, `@crawlee/cheerio`,
  `date-fns`, `mammoth`, `next-intl`, `pg`, `posthog-js`, `posthog-node`, `sonner`,
  `next` 16.2.4 → 16.3.4 (legal-os — same major)

Suggested command once it's safe: `npm update` at the repo root, then
`npx turbo run type-check && npx turbo run lint && npx turbo run build` and a
manual click-through of both apps.

## Defer: major-version bumps — each needs its own scoped plan

Per your call: no bundling. Each of these is an independent breaking-change
surface; bundling them would make a failing `build`/`type-check` impossible to
attribute to one cause. Suggested priority, most call-site-invasive first:

1. **`ai` (Vercel AI SDK) 6.x → 7.x** — used in `packages/ai`, `legal-os`,
   `medical-os`. AI SDK major versions have historically changed core APIs
   (`streamText`/`generateText` signatures, provider registration). Needs its own
   spec: audit every `packages/ai/src` call site first.
2. **`@ai-sdk/google` 1.x/3.x → 4.x, `@ai-sdk/openai` 3.x → 4.x, `@ai-sdk/react`
   3.x → 4.x** — tied to the `ai` core bump above; do these together, after #1's
   plan is scoped, since they're provider packages for the same SDK.
3. **`@deepgram/sdk` 4.x → 5.x** — used in `packages/ai` transcription and
   directly by `medical-os`. Check changelog for the transcription API shape
   before touching `transcribeMedicalAudio`.
4. **`@biomejs/biome` 1.x → 2.x** — legal-os's lint/format tool. Config format
   changed between Biome major versions; expect to regenerate `biome.json`.
5. **`lucide-react` 0.x → 1.x** — legal-os and marketing packages, at two
   different 0.x versions already (0.577.0, 0.577.0) — reconcile to one version
   as part of this bump, not before. (`packages/ui`'s own `lucide-react` is
   unused — see below — remove it there rather than bumping it.)
6. **`@llamaindex/liteparse` 1.x → 2.x** — legal-os document parsing
   (`serverExternalPackages` in `next.config.js` — check that config still needs
   updating for the new major).
7. **`tailwind-merge` 2.x → 3.x, `react-day-picker` 9.x → 10.x, `nanoid` 5.x →
   6.x** — lower blast radius (few call sites each), but still their own PRs so a
   regression is traceable to one bump.

## Not touched at all

`@types/node` 20.x → 26.x and `resend` 4.x/6.x → 6.25 "latest" columns show gaps
far beyond the installed major — these track Node LTS / provider API versions
respectively and shouldn't be jumped opportunistically. Revisit when there's an
actual reason (Node runtime upgrade, a `resend` feature need).

## Unused dependencies — confirmed by hand, safe to remove once it's safe to touch `package.json`

Ran `npx depcheck` per app/package, then verified every single result with a
direct `grep` for actual usage — depcheck has real false-positive classes (see
below), so nothing here is taken on its word alone.

**Genuinely unused — remove from `dependencies`/`devDependencies`:**

- `packages/ai`: `drizzle-orm` (no import anywhere in `src`)
- `packages/ui`: `lucide-react` (no import), `tailwindcss-animate` (no
  `tailwind.config.js` in this package or any consuming app references it as a
  plugin)
- `apps/medical-os`: `better-auth`, `drizzle-orm`, `zod` (no imports at all —
  `better-auth`/`drizzle-orm` were already known-unused from an earlier session;
  `zod` is new); `@ai-sdk/google`, `@deepgram/sdk`, `ai` (never imported
  directly — medical-os only calls `generateSoapNote`/`transcribeMedicalAudio`
  from `@smartekai/ai`, which already declares these as its own dependencies)
- `apps/legal-os`: `@smartekai/ui` (no import — legal-os has its own local
  `components/ui/*`, doesn't consume the shared package), `@react-email/tailwind`
  (no import), `crawlee` (the umbrella package — only the `@crawlee/cheerio`
  sub-package is actually imported, in `src/app/api/admin/scrape/route.ts`; keep
  `@crawlee/cheerio`, drop bare `crawlee`)

**Depcheck false positives — confirmed real usage, do NOT remove:**

- `@types/node` (every package) — ambient global types (`process`, `Buffer`);
  no import statement exists for these by design. Confirmed `packages/ai`
  actually uses `process.`/`Buffer.` without importing `@types/node`.
- `autoprefixer`, `tailwindcss` (medical-os) — referenced by string name in
  `postcss.config.js`, not a JS import.
- `tailwindcss`, `@tailwindcss/postcss` (legal-os) — Tailwind v4's CSS-first
  pipeline; confirmed `@import "tailwindcss";` in `globals.css`, wired through
  Next's automatic Tailwind v4 detection (no `postcss.config.js` needed).
- `@biomejs/biome` (legal-os) — invoked via `npx @biomejs/biome` in the `lint`/
  `format` package.json scripts, not imported.
- `tw-animate-css` (legal-os) — imported via CSS `@import`, not a JS import;
  depcheck only scans JS/TS.
- `next` flagged "missing" in `packages/marketing` — stale; confirmed zero
  `next` references anywhere in that package's current source or `package.json`.

**Borderline — needs a decision, don't auto-remove:**

- `tsx` (legal-os devDependency) — not referenced in any `package.json` script,
  but `apps/legal-os/src/scripts/` has 5 standalone maintenance scripts
  (`update-hybrid-search.ts`, `fix-kb-search.ts`, `ensure-procedures-cat.ts`,
  `test-rag.ts`, `migrate-credits.ts`) that look like they're meant to be run
  via `npx tsx <script>`, undocumented. Either add a `package.json` script that
  documents the intended invocation, or confirm these scripts are stale and
  remove both them and `tsx` together.

**Phantom dependencies — the inverse problem, higher priority than plain unused:**

These are imported in source but **not declared** in that package's own
`package.json` — they currently resolve only because npm workspace hoisting
happens to put them in the shared root `node_modules`. This is fragile: a
different install order, a `npm dedupe`, or removing the dependency from
whichever package *does* declare it would silently break these apps with no
warning until someone runs `install`/`build` fresh.

- `apps/medical-os` imports `@base-ui/react` in `components/ui/{sheet,tooltip,
  input}.tsx` but doesn't declare it — add it to `dependencies`.
- `apps/legal-os` imports `nanoid` directly in 16 files (`lib/audit.ts`,
  `lib/kb/store.ts`, `lib/credits/credit-manager.ts`, several `api/*/route.ts`
  and `actions/*.ts` files) but doesn't declare it — it's currently only present
  because `packages/billing` depends on it. Add it to legal-os's own
  `dependencies`.
- `apps/legal-os` imports `@radix-ui/react-slot` in `components/ui/{breadcrumb,
  sidebar,button}.tsx` but doesn't declare it — add it explicitly.

## Unused code

Not audited yet beyond what's already visible: `isRecording`/`setIsRecording`
in the ported Medical OS session page is known dead state (noted in the
TanStack migration plan; deliberately left alone there since it predates this
migration and isn't this migration's job to clean up).

A real sweep needs a proper unused-exports/unused-files tool, not manual
grepping — `knip` is the current standard for this (checks unused files,
exports, and dependencies together, understands npm workspaces natively,
successor to the now-unmaintained `ts-prune`). Run it per-workspace once the
repo is idle:

```bash
npx knip
```

This is its own follow-up pass, not bundled into this dependency triage —
knip's dead-code findings need the same "verify before trusting" treatment as
depcheck's did above (barrel-file re-exports and dynamically-referenced
components are common false positives), and untangling them will take real
review time per finding, not a mechanical removal.
