# @smartekai/crw

Zero-dependency CRW (Firecrawl-compatible) client for the smartekai platform.
Talks to the internal CRW stack (`crw-eqimab-crw-1:3000` on Dokploy's
`dokploy-network`, publicly `crw.smartekai.com`).

## Install

```sh
npm install @smartekai/crw
```

Workspace packages use `"@smartekai/crw": "*"` and resolve via the root
`tsconfig.json` path alias (`@smartekai/crw` → `packages/crw/src`).

## Environment

| Var | Description | Default |
| --- | --- | --- |
| `CRW_INTERNAL_URL` | Base URL (no trailing slash) | `http://crw-eqimab-crw-1:3000` |
| `CRW_API_KEY` | Bearer token; **required** since CRW auth is enabled | — |

- **Deployed (Docker):** keep the default internal URL so calls stay on
  `dokploy-network`; set `CRW_API_KEY`.
- **Local dev:** set `CRW_INTERNAL_URL=https://crw.smartekai.com` and
  `CRW_API_KEY=<token>` — localhost cannot resolve the Docker-internal hostname.
- Without `CRW_API_KEY` the client sends no `Authorization` header and CRW
  returns `401 Missing Authorization header`.

Copy both vars into the app's `.env.local` / Dokploy env (root
`.env.example` already lists them).

## Usage (Next.js route handler)

```ts
import { crwSearch, crwScrape } from "@smartekai/crw";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const results = await crwSearch(query, { limit: 10 });
  const doc = await crwScrape("https://example.com");
  return NextResponse.json({ results, markdown: doc.markdown });
}
```

### API

- `getCrwBaseUrl(): string` — resolved base URL (env or default).
- `crwSearch(query, params?): Promise<SearchResult[]>` — `POST /v1/search`.
  Params: `limit` (≤20), `lang`, `sources`.
- `crwScrape(url, params?): Promise<ScrapeResult>` — `POST /v1/scrape`; result
  has `.markdown`.

All calls run through Node's global `fetch` — no runtime dependencies.

## Verification

```sh
# within the monorepo
npx turbo run type-check       # 8/8 packages
npm run build -w @smartekai/crw   # rebuild dist
```