# Railway local-first recommendation contract

Date: 2026-07-21
Status: implemented and locally verified, not deployed
Authority: `D-032`, `FR-47`, and `FR-48`

## Purpose

The Railway MCP server already keeps the public icon index and deterministic search engine in memory. `recommend_icons` now uses that local data first instead of waiting for a Supabase search function for every generated query.

## Request behavior

- The existing public `recommend_icons` input and output contract stays compatible.
- One call accepts up to 20 named UI slots.
- English and supported non-English requests use the same in-process recommendation engine.
- A successful local request makes zero Supabase search calls.
- An honest local no-result makes zero Supabase search calls.
- If the local engine throws, the entire recommendation call may make one request to the stable hosted search route. It must not make one hosted request per generated query.
- Ambiguous slots still return labeled clarification choices without search calls.
- The response reports `search_runtime.mode` as `local_first`, `hosted_fallback`, or `hosted`.

## Performance behavior

The service builds a token candidate index at startup and keeps up to 512 recent query results in memory. These controls reduce repeated full-index scans without changing the shared deterministic ranking data.

Local verification on 2026-07-21 started the real HTTP MCP server and measured:

| case | measured duration |
| --- | ---: |
| Fresh English 20 slots | 1,622.1 ms |
| Fresh Japanese 20 slots | 1,058.7 ms |
| Repeated English 20-slot p95 | 53.7 ms |

The same run resolved every requested slot and made zero hosted search requests. These are local measurements, not production claims.

## Telemetry and allowances

The user response does not wait for the telemetry write. Best-effort telemetry records the execution mode so the admin dashboard can distinguish Railway local execution from hosted fallback. Local execution is not charged against hosted search allowances. A hosted fallback remains subject to the hosted allowance contract.

## Health and rollback

`GET /health` reports whether Railway local-first recommendation is enabled, the index date and counts, candidate-index size, and current cache size. Setting `SUPERICONS_RAILWAY_LOCAL_FIRST=off` restores the previous hosted recommendation route for emergency rollback. A code rollback to the prior Railway deploy remains the main release rollback.

## Required checks before deployment

1. `node scripts/verify-railway-local-first-recommendations.mjs`
2. `node scripts/verify-hosted-candidate-hydration.mjs`
3. `node scripts/verify-material-railway-server-contract.mjs`
4. `node scripts/verify-mcp-agent-friendly-errors.mjs`
5. `node scripts/verify-search-v2-one-call-contract.mjs --package-root mcp`
6. `node scripts/verify-recommend-icons-clarification.mjs`
7. `node scripts/verify-search-v2-phase1-parity.mjs`

After deployment, repeat the 1, 10, 20, Japanese 20-slot, clarification, health, telemetry, and zero-hosted-call checks against the live Railway endpoint. Roll back if any public contract fails or the existing `FR-47` latency limits are missed.
