# Cars 4x4 Builder — deployment spec (Dockerfile + Dokploy)

Date: 2026-10-13 · Status: proposed · Supersedes the "next spec" note in
`plans/active.md` Task 15 / `specs/2026-10-08-gallery-first-affiliate-mvp-design.md` §9.

## 1. Goal

Ship `apps/cars-4by4-builder` to the existing self-managed Dokploy VPS as **one
Dokploy application**, built from a repo-relative `Dockerfile` via
`turbo prune cars-4by4-builder --docker` — the same pattern as
`apps/medical-os` (AGENTS.md: one Dokploy application per app).

Public hostname: **`https://cars.smartekai.com`** (already the value hard-coded
in `src/lib/auth.ts` `trustedOrigins`).

## 2. App architecture (why the image looks the way it does)

- TanStack Start + **Nitro** (`vite build` → `.output/`), no Next.js. `npm run
  build` = `vite build`; `npm run start` = `node .output/server/index.mjs`.
- Verified from the real build: `.output/server/node_modules` contains only
  `tslib` — Nitro **bundles** the workspace packages (`@smartekai/{ai,db,storage,ui}`)
  and their deps into `.output/server/_chunks` + `_libs`, including the
  `better-auth` libs pulled in by `src/routes/api/auth/$.ts`. So `.output` is
  self-contained: the runner stage needs `.output` only, **no runtime
  `node_modules` and no `npm install` in the final image.** (This is exactly why
  the `medical-os` runner works.)
- `turbo prune cars-4by4-builder --docker` added exactly:
  `cars-4by4-builder`, `@smartekai/ai`, `@smartekai/db`, `@smartekai/storage`,
  `@smartekai/ui` (no `@smartekai/auth` — the app uses `better-auth` directly).
- `turbo.json` already declares `build.outputs = [".next/**", ".output/**",
  "dist/**"]` and lists every cars env var in `globalEnv` → **no turbo.json
  change needed.**
- Port: Nitro reads `NITRO_PORT` then `PORT`, default **3000** (the built server
  references both). Container listens on `PORT`, default 3000.

## 3. Dockerfile

`apps/cars-4by4-builder/Dockerfile` — four stages, mirroring `medical-os`:

1. **pruner** — `turbo prune cars-4by4-builder --docker` on the full context.
2. **installer** — `npm install` against `out/json/` (layer cache), then copy
   `out/full/`, then `turbo run build --filter=cars-4by4-builder` (which builds
   the four workspace deps first via `^build`).
3. **runner** — copy only `/app/apps/cars-4by4-builder/.output`, `EXPOSE 3000`,
   `CMD ["node", ".output/server/index.mjs"]`.

`NODE_ENV=production` + `PORT=3000` are set explicitly in the runner.

### Dokploy application settings

| Setting            | Value |
| ------------------ | ----- |
| Build type         | Dockerfile |
| Build context      | **repo root** (`.`), not the app dir — the Dockerfile does `COPY . .` then prunes |
| Dockerfile path    | `apps/cars-4by4-builder/Dockerfile` |
| Container port     | `3000` |
| Domain             | `cars.smartekai.com` (Traefik, Let's Encrypt, as for the other apps) |

## 4. Runtime environment variables

Dokploy injects these at runtime (the app reads `process.env` at call time; the
`vite.config.ts` `.env.local` loading is a dev convenience and is absent in the
image — that is fine, see §6).

**Required** (missing → crash or failed renders):

| Var | Source |
| --- | ------ |
| `DATABASE_NEONDB_SMARTEKAI` | `@smartekai/db/cars` `getDbCars()` — `requireEnv` |
| `GOOGLE_AI_API_KEY` | `@smartekai/ai` |
| `AWS_ENDPOINT_URL_S3` | `@smartekai/storage` — `requireEnv` |
| `AWS_REGION` | `@smartekai/storage` — `requireEnv` |
| `AWS_ACCESS_KEY_ID` | `@smartekai/storage` — `requireEnv` |
| `AWS_SECRET_ACCESS_KEY` | `@smartekai/storage` — `requireEnv` |

**Recommended:**

| Var | Purpose |
| --- | ------- |
| `PUBLIC_SITE_URL=https://cars.smartekai.com` | canonical URLs in `/sitemap.xml` |
| `BETTER_AUTH_URL=https://cars.smartekai.com` | `auth.ts` `baseURL`; also in `trustedOrigins` |
| `BETTER_AUTH_SECRET` | better-auth signing (auth is wired but unused; set it so `/api/auth/*` is production-correct) |

**Optional (have defaults):** `CARS_DAILY_RENDER_CAP` (default `200`),
`GOOGLE_AI_IMAGE_MODEL` (defaults in `@smartekai/ai`).

Not needed for cars (they belong to legal/medical): `DATABASE_URL`,
`DATABASE_LEGAL_URL`, `DATABASE_MEDICAL_URL`, `DEEPGRAM_API_KEY`,
`CRW_INTERNAL_URL`, `RESEND_API_KEY`.

## 5. Retention schedule (`npm run cleanup`)

`scripts/cleanup.ts` (retention §2: drafts >24h, non-curated >90d; preserves
`stock/` originals and click rows) is meant to run on a Dokploy schedule. Two
container realities must be handled first — **this is follow-up code, not part
of the app image:**

1. The runner image ships `.output` only, so it has neither `tsx` nor the
   `scripts/` or workspace sources. A schedule running `npm run cleanup`
   **inside the app container will fail.**
2. Every operational script hard-codes `--env-file=../../.env.local`
   (a dev convenience). `tsx --env-file` **errors if the file is missing**, and
   that file is gitignored / not in the image. So the scripts can't run as-is
   against Dokploy-injected env.

Recommended approach: add a **`cleanup:prod`** script (`tsx scripts/cleanup.ts`,
no `--env-file`; rely on injected `process.env`) and run it either

- as a Dokploy **schedule** on a small `jobs` build target that keeps the pruned
  repo + full `node_modules` (`FROM installer AS jobs`, `CMD ["npm","run","cleanup:prod"]`), or
- as a host cron (`docker run --env-file … <image> --target jobs`).

Either is fine; the `jobs` target is preferred because it reuses the same build
and env. Decision deferred to the implementation plan — recorded here so it
isn't lost.

## 6. Risks / open items

- **Unverified: no image build was run** — Docker is not installed on the dev
  machine. Verification done instead: `turbo prune cars-4by4-builder --docker`
  produces the expected 5-package set, `.output` is self-contained, and the
  Dockerfile is byte-for-byte the proven `medical-os` pattern with only the app
  name changed. **First real deploy should be treated as the verification.** If
  `vite build` in the container ever needs build-time env, the symptom is a build
  failure (runtime env is unaffected — externals read `process.env` at call
  time).
- **`cf-ipcountry` / Cloudflare proxying:** dropped — the region concept was
  removed in `specs/…-mvp-design.md` §10, so no Cloudflare header is needed.
  Plain Traefik TLS is enough.
- **Non-root hardening:** the image runs as root, same as `medical-os`. Out of
  scope here; add a `USER node` in a later pass if desired.
- **`db:push` hygiene:** unrelated to deploy, but note the cars Neon DB still
  carries stray legal/medical sequences (`cases_id_seq`) — see the execution log.
