# 2026-08-09 — CRW wiring: Hermes + @smartekai/crw bearer auth

Branch: `feat/crw-client` (commits `53294fe`, `500a906`)

## Done
- Generated CRW bearer token, set `CRW_AUTH__API_KEYS` in CRW compose, redeployed
  (`crw-stack`, app `crw-eqimab`, alias `crw`). Verified publicly: no token → 401
  `Missing Authorization header`; with token → results; `/health` stays open.
- Hermes compose (`g-yXqlKuMkM6yWgsBKjm1`): `hermes` service joined `dokploy-network`
  (external) + env `CRW_API_URL=http://crw:3000`, `CRW_API_KEY=crw_live_...`.
  Redeploy `smdqNjeesOYc7yRZQjdOf` ok; container `hermes` on `dokploy-network`.
- `@smartekai/crw` client now sends `Authorization: Bearer $CRW_API_KEY` when present
  (`packages/crw/src/client.ts`), base URL from `CRW_INTERNAL_URL` default
  `http://crw-eqimab-crw-1:3000`. Dist rebuilt. `turbo type-check` 8/8.

## Non-applicable
- The only deployed Dokploy app (`smartekai-smarteakaiapp-axrrre`) is the legacy
  `ai-law-copilot` repo — it does not use `@smartekai/crw`, and `legal-os` is NOT
  deployed. No Dokploy env to set for legal-os; `CRW_API_KEY` applies when deployed.

## Remaining (observability, no action needed)
- Hermes picks up `CRW_API_URL`/`CRW_API_KEY` already; confirm the agent surfaces the
  CRW tool to prompts/`gateway run` output if the blog flow needs an explicit binding.