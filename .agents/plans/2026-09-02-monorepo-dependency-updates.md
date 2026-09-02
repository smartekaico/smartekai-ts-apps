# Monorepo Dependency Updates — Triage

**Not yet executed.** `npm outdated --workspaces` was run on 2026-09-02 while the
`feat/medical-os-tanstack-start-migration` branch had live, uncommitted state in
the shared working directory. No `npm install`/`npm update`/`package.json` edits
were made — running installs against a shared `node_modules` tree while another
session has uncommitted dependency changes in flight risks corrupting its state.
**Do not run any command in this file until that branch's work is committed or
that session is confirmed idle.**

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
- `@swc/helpers`, `@upstash/redis`, `autoprefixer`, `crawlee`/`@crawlee/cheerio`,
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
5. **`lucide-react` 0.x → 1.x** — three separate installs (legal-os, marketing,
   ui packages) at three different 0.x versions already (0.577.0, 0.577.0,
   0.454.0) — reconcile to one version as part of this bump, not before.
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
