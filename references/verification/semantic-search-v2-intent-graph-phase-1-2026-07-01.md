# Semantic Search v2 Intent Graph Phase 1 Verification

Date: 2026-07-01

## Scope

This verification covers the local Phase 1 implementation for the Supericons intent graph refinement. The slice adds a source intent graph, fixtures, generated runtime outputs, and a query-frame builder for web/hosted and MCP runtime surfaces.

This slice does not wire intent graph frames into production ranking, hosted candidate fusion, Netlify deployment, npm publish, or Supabase deployment.

## Changed Files Checked

- `data/search-intent-graph/intent-groups.json`
- `data/search-intent-graph/intent-fixtures.json`
- `scripts/build-search-intent-graph.mjs`
- `scripts/verify-search-intent-graph.mjs`
- `lib/search-query-frame.js`
- `lib/generated-search-intent-graph.js`
- `mcp/runtime/search-query-frame.js`
- `mcp/runtime/generated-search-intent-graph.js`
- `package.json`
- `mcp/package.json`
- `scripts/verify-motion-lab-mcp-package.mjs`
- `docs/supericons-semantic-search-v2-intent-graph-refinement-prd-2026-07-01.md`

## Implementation Summary

- Added 9 MVP intent groups covering negative AI quality, power/performance, security/privacy, speed/latency, quality/polish, error states, vision scanning, agentic workflow, and dream/mystical symbols.
- Added 12 fixtures covering `ai slop`, `low quality ai`, `powerful`, `strong`, `secure checkout`, `premium dashboard`, `license plate recognition camera scan car`, `dream interpretation moon star eye mystical`, `agent tool call`, localized examples, and `xai logo`.
- Added `buildSearchQueryFrame` for structured query frames without changing current search ranking.
- Added generated intent graph files for both `lib` and `mcp/runtime`.
- Added package whitelist entries so the MCP package includes the new runtime graph files.

## Gap Audit Follow-Up

Additional audit on 2026-07-01 found two concrete gaps and fixed both:

- Some `avoid_concepts` were written as conditional English guidance, for example `when` or `unless` clauses. These were normalized into atomic concepts such as `slow motion`, `generic ai logo`, and `dreamstime`, or removed when the condition could suppress a useful icon concept later.
- `scripts/verify-search-intent-graph.mjs` imported the generated runtime before checking generated file existence. The verifier now checks for the generated web and MCP files first, then imports the query-frame builder only when those files exist.

The verifier now fails if future `avoid_concepts` use conditional `when` or `unless` wording.

## Verified Query Frames

Local sample checks confirmed:

- `ai slop` maps to `ai_low_quality_output`, with `abstract_metaphor`, `quality_negative`, and `ai_domain` intent types plus warning, trash, bot-off, and cleanup concepts.
- `powerful` maps to `power_strength_performance`, with power, bolt, zap, rocket, gauge, flame, shield, and dumbbell concepts.
- `license plate recognition camera scan car` maps to `vision_scan_detection`, with camera, scan, car, object/action/device fields, and avoid concepts for dinner plate, shopping cart, legal license, certificate, and food dish.
- `xai logo` maps to `brand_logo` intent and does not match generic AI intent groups.

## Verification Results

| Check | Result | Evidence |
| --- | --- | --- |
| Intent graph build | Passed | `npm run build:search-intent-graph` returned `build-search-intent-graph: ok (9 groups, 238 phrases)`. |
| Intent graph verification | Passed | `npm run verify:search-intent-graph` returned `ok (9 groups, 12 fixtures)`. |
| JavaScript syntax checks | Passed | `node --check` passed for `scripts/build-search-intent-graph.mjs`, `scripts/verify-search-intent-graph.mjs`, `lib/search-query-frame.js`, and `mcp/runtime/search-query-frame.js`. |
| Runtime sync check | Passed | SHA-256 hashes matched for generated graph files and query-frame runtime files across `lib` and `mcp/runtime`. |
| Search intent dictionary | Passed | `npm run verify:search-intent-dictionary` returned `ok`. |
| Search intent expansion | Passed | `npm run verify:search-intent-expansion` returned `ok`. |
| Web/CJK search | Passed | `npm run verify:web-cjk-search` returned `ok`. |
| Semantic Search v2 smoke | Passed | `npm run verify:semantic-search-v2-smoke` returned status `ok` across 13 smoke cases. |
| Hosted search engine | Passed | `npm run verify:hosted-search-engine` returned `ok`. |
| Search query fixtures | Passed | `npm run verify:search-query-fixtures` returned pass lines for all configured fixtures. |
| Semantic Search v2 documents | Passed | `npm run verify:semantic-search-v2` returned status `ok`, 28 evaluation queries, 75,560 semantic documents, and 41 skipped rows. |
| MCP package verification | Passed | `npm --prefix mcp run verify:package` verified 33 files and 2,259,972 bytes unpacked. |
| Public safety scan | Passed | `node scripts/verify-public-safety.mjs --verbose` completed successfully for the root package surface, and `npm --prefix mcp run verify:public-safety` scanned 33 MCP package files. |
| Targeted sensitive scan | Passed with expected verifier literals | The targeted scan found only denylist terms inside `scripts/verify-search-intent-graph.mjs`, where those strings intentionally define forbidden field-name patterns. No credential values or private operational metadata were found in the new source graph, generated graph, query-frame runtime, package changes, or PRD. |

## Gap Audit Verification

The follow-up audit also verified:

- `npm run verify:search-intent-graph` returned `verify-search-intent-graph: ok (9 groups, 12 fixtures)`.
- Query-frame samples for `secure checkout page`, `slow response`, `agent tool call`, `dream interpretation moon star eye mystical`, and `license plate recognition camera scan car` matched the expected groups and returned atomic avoid concepts only.
- `Select-String` over `data/search-intent-graph/intent-groups.json` found no remaining `when` or `unless` terms.
- Generated web and MCP graph files both contain the normalized concepts `slow motion`, `generic ai logo`, and `dreamstime`.

## Residual Risk

- The intent graph is not yet connected to production ranking, so users will not see `ai slop` ranking improvements until a later feature-flagged candidate-fusion slice.
- Localized examples are only an MVP seed. Long-tail localized phrase quality still depends on later embedding and feedback-loop work.
- The graph is currently deterministic and curated; model-assisted draft generation is not implemented in this slice.

## Next Step

Implement Phase 2: wire `buildSearchQueryFrame` into the existing intent-variant planning path in shadow/diagnostic mode only, then verify that web, hosted MCP, local MCP, and `recommend_icons` can observe the same query frame without changing user-visible ranking.
