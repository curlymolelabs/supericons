# Search v2 deterministic round-trip reduction, local verification

Date: 2026-07-14
Scope: local implementation and disposable PostgreSQL only
External systems changed: none

## Outcome

The local treatment path now supports:

- one ordered array candidate RPC for all generated query variants;
- query-variant text and position on every returned candidate;
- one grouped hosted request for all resolved searches in a recommendation;
- one existing rate-limit unit and one synchronous audit write for every logical grouped search;
- clarification before retrieval, with zero search calls for unresolved meanings;
- worker request order and module age at handler entry in public-safe timing records; and
- separate isolated control and treatment function entry points for a later matched measurement.

The current production candidate functions, production function entry points, and published package routing remain unchanged by this local work.

## Test-first record

The first focused runs failed for the expected missing behavior:

- the batched migration file did not exist;
- the candidate-retrieval helper did not exist;
- recommendation ignored the grouped callback and made separate searches; and
- the grouped HTTP handler did not exist.

After implementation, the same focused checks passed.

## Verified checks

| check | result | proof |
| --- | --- | --- |
| Batched SQL structure and privilege boundary | Pass | `npm run verify:search-v2-batched-candidates` |
| Batched retrieval uses one RPC and rejects bad provenance | Pass | `npm run verify:search-v2-batched-candidate-retrieval` |
| PostgreSQL 17 parity, duplicate positions, preflight, postflight, and rollback | Pass | `npm run verify:search-v2-batched-candidates-smoke` |
| Hash-pinned hosted SQL runner, hidden password, and exact history version | Pass | `npm run verify:search-v2-batched-hosted-runner` |
| Grouped HTTP request order, bounded concurrency, rate-limit cost, and synchronous audit writes | Pass | `npm run verify:search-v2-grouped-http-request` |
| Grouped MCP client uses one HTTP request | Pass | `npm run verify:hosted-search-grouped-client` |
| Recommendation uses one grouped callback, preserves exact results, and keeps clarification at zero retrieval | Pass | `npm run verify:recommend-icons-grouped-search` |
| Full HTTP status, headers, body bytes, SVG values, semantic field order, and errors | Pass, 5 cases on both lightweight and batched paths | `npm run verify:search-v2-hosted-http-parity` |
| Timing output is public-safe and cannot change responses | Pass | `npm run verify:search-v2-stage-timing` |
| Fixed search suite and committed fingerprint continuity | Pass, 225 cases, clean parent and implementation fingerprints both `e610fce301e92bef374fca076526ef07f0fe2f31b8d63a933cca399266593e76` | `npm run verify:search-v2-roundtrip-latency-packet` |
| Working-tree fingerprint source diagnostics | Pass, the verifier reports its source revision and dirty search inputs | `npm run verify:search-v2-phase1-parity` |
| Recommendation clarification | Pass | `npm run verify:recommend-icons-clarification` |
| Ranking policy and library modes | Pass | `npm run verify:search-ranking-policy`; `npm run verify:search-library-modes` |
| Default request path has no model-provider call | Pass | `npm run verify:search-v2-deterministic-mcp-default` |
| Evaluation target and stable IDs | Pass, 225 cases and 225 stable IDs | `npm run verify:semantic-search-v2` |
| Deno type checking for shared handlers and both isolated endpoints | Pass | `deno check` on the four changed TypeScript entry points |
| MCP package contents after the local slice | Pass, 38 files in dry-run package, not published | `npm pack --dry-run --json --ignore-scripts` in `mcp` |

## Database safety

Migration `20260714120000_search_v2_batched_candidates.sql` is additive. Its SHA-256 is `f965c0b354a8d2e31be8791ac5b2041838be6bc8a2b40a97735f90d27f81cded`.

The guarded runner:

- refuses to run without its approval switch;
- checks the exact migration hash;
- applies the one file in a transaction;
- runs fixed hosted parity checks;
- repairs only migration version `20260714120000` after SQL success;
- never runs normal `supabase db push`; and
- removes password environment variables in a `finally` block.

The hosted migration ledger remains incomplete. Normal `supabase db push` remains prohibited.

## Fingerprint source correction

The earlier `564464d5...` and `1f142d55...` values were produced from different combinations of uncommitted taxonomy and generated icon-index files. They do not describe the committed before-and-after implementation pair. The clean parent commit `aad99541b` and clean implementation commit `8ba345fa9` both produce `e610fce3...`.

The full reproduction matrix and the one changed working-tree case are recorded in [`search-v2-fingerprint-source-correction-2026-07-14.md`](search-v2-fingerprint-source-correction-2026-07-14.md).

## What is not verified

- The new RPC is not deployed.
- The isolated control and treatment functions are not deployed.
- No live search, localized search, or recommendation measurement used this path.
- No npm package was published.
- No claim is made that the new path meets the live latency ceilings.

The next external step requires a separate fingerprint-bound owner approval for the one SQL file, two isolated function deployments, read-only matched measurements, and endpoint deletion. Production functions and npm publication remain outside that approval.
