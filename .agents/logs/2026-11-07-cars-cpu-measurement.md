# 2026-11-07 — cars: CPU measurement (wrangler tail, 10 warm requests each)

Method: wrangler tail (JSON), 11 requests per endpoint, first (cold) discarded,
p50/p95 over the 10 warm. Deployed version `c8a9af82-4be5-48c3-b97e-0dd980b6c218`.

| Endpoint | n (warm) | p50 (ms) | p95 (ms) | min | max |
|---|---|---|---|---|---|
| `/build?vehicle=f150&step=parts` | 10 | 5.0 | 9 | 4 | 9 |
| `/` | 10 | 5.5 | 7 | 5 | 7 |
| `/builds/f-150-overlander` | 10 | 10.5 | 53 | 5 | 53 |
| `/builds/f-150-overlander/report` | 10 | 1.0 | 1 | 0 | 1 |

## Conclusion
`/build` (5 ms) and `/` (5.5 ms) are both under the 10 ms threshold, so no
investigation/fix is required by the rule. The public build page (`/builds/...`)
sits at p50 10.5 ms with a p95 outlier of 53 ms — worth watching but not in
scope of this measurement (rule covers `/build` and `/` only). If it becomes a
problem, likely candidates: the build page loader (`getBuild`) fetching parts
+ links, or the 3D preview's SSR placeholder; profile before changing.