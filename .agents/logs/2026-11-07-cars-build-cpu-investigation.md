# 2026-11-07 — cars: /build CPU investigation (p50 13 ms > 10 ms)

## Trigger
CPU measurement (2026-11-07) showed `/build?vehicle=f150&step=parts` p50 = 13 ms
(was 5 ms on 2026-11-03), crossing the 10 ms threshold.

## Measurements
- `/build?vehicle=f150&step=parts`: p50 13 ms, p95 19 ms, wall 437 ms
- `/builds/f-150-overlander` (single build, ~6 parts): p50 10.5 ms, p95 53 ms
- `/builds/f-150-overlander/report` (~6 parts): p50 1 ms, p95 1 ms
- SSR HTML size for /build parts step: 39.6 KB, 14 img tags.

The report page (fewer parts, 3 ms) vs /build (24 parts in loader, 13 ms) points
at the configurator loader / parts grid as the cost.

## Cause
`getConfigurator` (src/lib/builds.ts) fetches ALL vehicles (7), ALL parts (24, full
rows incl. imageUrl/imageKind/vehicleIds), and ALL presets (21) on every request,
then SSR-renders the parts step for the selected vehicle (~12 PartCards with img
tags). The client only needs parts fitting the selected vehicle, but the loader
has no vehicle input (GET with no params), so it ships all 24.

## Proposed cheapest fix (not implemented — awaiting approval)
Make getConfigurator vehicle-aware: accept `vehicleId` (from route search params)
and filter parts server-side to those whose vehicleIds include it. Concretely:
  - `getConfigurator = createServerFn({method:"GET"}).validator(...)` or change the
    route loader to `loader: ({ search }) => getConfigurator({ data: search.vehicle })`.
  - Return only fitting parts (plus the selected vehicle's stock image). Presets
    filtered to that vehicle.
  - Expected effect: ~half the parts payload (24 → ~14 for trucks, ~12 for SUVs),
    fewer toPublicPart mappings, smaller SSR HTML, lower CPU. No schema change,
    no new deps, fully reversible.

Alternative (even cheaper, no loader change): drop `vehicleIds` from the SSR
payload by filtering in the route loader after getConfigurator — but the loader
still fetches all 24 rows. The server-side filter is the real win.

## Status
Proposed only. No code changed.
## Result (implemented)
- Deployed version `1ca845c8-af39-4c8c-bf5b-d8da40a740db`.
- CPU after fix: `/build?vehicle=f150&step=parts` p50 9.5 ms, p95 11 ms (was 13 / 19).
  Back under the 10 ms threshold. No further action.
