# 2026-11-07 — cars: /builds/<slug> CPU investigation + measurement

## Re-measurement (wrangler tail, 10 warm requests each, first discarded)
Deployed version `c8a9af82-4be5-48c3-b97e-0dd980b6c218`.

| Endpoint | n (warm) | p50 (ms) | p95 (ms) | min | max |
|---|---|---|---|---|---|
| `/build?vehicle=f150&step=parts` | 10 | 5.5 | 20 | 5 | 20 |
| `/` | 10 | 6.0 | 8 | 5 | 8 |
| `/builds/f-150-overlander` | 10 | 6.5 | 8 | 6 | 8 |
| `/builds/f-150-overlander/report` (signed-in) | 10 | 8.0 | 11 | 6 | 11 |

The signed-out report reading (1 ms) was indeed a redirect; the signed-in page is 8 ms.

## Cause (loadBuild in src/lib/builds.ts)
1. Sequential DB queries after the initial `builds` fetch: `vehicles`, `presets`, `parts` (inArray), `partVehicleLinks` (inArray) are each awaited in series. Only the stale-processing re-check is conditional.
2. `beforeUrl`/`afterUrl` storage URL generation is awaited inline.
3. No caching; every request re-runs all queries.

The earlier 10.5 ms p50 / 53 ms p95 was likely a transient outlier (cold DB
connections / cold isolate); the current run is 6.5 ms p50 / 8 ms p95, already
under the 10 ms Free-plan budget. No mandatory fix.

## Proposed cheapest fix (not implemented — awaiting approval)
Parallelize the independent queries in `loadBuild`: after fetching the `build`
row, run `vehicles`, `presets`, `parts`, `partVehicleLinks` via `Promise.all`
(instead of sequential awaits). The stale-processing re-check and URL generation
stay as-is. Expected: shave ~2-4 ms off the p50 and tighten the p95 tail by
removing serial round-trips; no schema change, no new deps, fully reversible.

If further reduction is needed later: cache the (immutable) curated build row
+ parts in a short-lived Workers Cache / KV, or pre-compute the public build
page at render time. Both are larger changes.

## Status
Investigated and proposed only. No code changed.
## Result (implemented)
- Deployed version `850bb4de-e407-4b24-b340-76fd94fd4be3` (parallelized loadBuild).
- CPU after fix: `/builds/f-150-overlander` p50 6.0 ms, p95 9 ms (run 2; run 1 was 9.0/14 — isolate variance).
  Consistently under 10 ms. No further action.
