# Search v2 local-first feasibility

Date: 2026-07-16

## Outcome

An English-only local-first `search_icons` beta is promising enough to prototype. A full local-first switch is not ready because the packaged local index returns zero results for 62 of 75 multilingual fixtures.

The safest split is:

- beta `search_icons` with no locale: evaluate the local deterministic path first;
- localized `search_icons`: keep the hosted path;
- `recommend_icons`: keep the stable hosted path;
- web search: unchanged.

No route changed during this evaluation.

## Measured results

### Local latency

The 225 fixed cases ran through the packaged local search on the current machine:

| Measurement | Result |
| --- | ---: |
| Per-case p50 | 29.234 ms |
| Per-case p95 | 219.260 ms |
| Maximum | 491.401 ms |
| Index load p95, 5 fresh processes | 124.927 ms |

This is local process time. It does not include MCP client overhead, but it also avoids hosted network, edge-worker, PostgREST, and database delay.

### Quality and policy

- The fixed 225-case fingerprint is `ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8`, matching the current recorded contract.
- The ranking-policy verification passed, including four `hello` interpretation families, the Swift ordering rule, and the Lovable brand/concept split.
- All 15 strict, preferred, and all-library cases passed.
- Recommendation clarification passed, but recommendation was not evaluated as a local-first route and remains out of scope.
- The packaged multilingual support smoke passed its focused checks.

The fixed fingerprint proves continuity with the existing deterministic local contract. It does not prove that every one of the 225 fixtures is a useful result, because the evaluation set intentionally includes known gaps and policy canaries.

### Multilingual limit

The locale-aware run returned zero results for 62 of 75 multilingual fixtures.

| Locale | Cases | Zero results |
| --- | ---: | ---: |
| zh-Hans | 8 | 6 |
| zh-Hant | 5 | 4 |
| ja | 6 | 5 |
| ko | 5 | 4 |
| es | 8 | 6 |
| pt-BR | 8 | 8 |
| de | 7 | 4 |
| ar | 7 | 7 |
| hi | 7 | 6 |
| th | 7 | 6 |
| vi | 7 | 6 |

This blocks a full local-first switch. The proposed English-only split prevents these multilingual gaps from being introduced into the beta route.

### Package size

An exact dry-run package comparison was performed in a temporary directory.

| Package | Packed | Unpacked | Files |
| --- | ---: | ---: | ---: |
| Current beta | 4,777,619 bytes | 24,002,529 bytes | 44 |
| With Material bundle and manifest | 6,099,917 bytes | 25,322,103 bytes | 46 |
| Increase | 1,322,298 bytes | 1,319,574 bytes | 2 |

Material results cannot move fully local until the package includes the validated 8,524-asset bundle. The added packed size is about 1.32 MB.

### Startup memory

Five fresh Node processes loaded both current icon indexes, then the Material asset bundle.

| Measurement | p95 increase |
| --- | ---: |
| Current indexes, RSS | 37,994,496 bytes |
| Material bundle, additional RSS | 14,077,952 bytes |
| Combined RSS | 51,662,848 bytes |
| Combined heap | 34,067,216 bytes |

This is acceptable for a desktop MCP process as a working assumption, but it needs a clean-install beta smoke on the supported Node versions before release.

### Freshness and telemetry

- Index updates require a new npm package release. A local-first client cannot see a newly added icon until it updates.
- The Material source revision is pinned in the bundle manifest.
- Existing `search_icons` telemetry is called after the search result regardless of whether hosted search or local fallback produced it. It is non-blocking and can be disabled by the user with the existing telemetry environment controls.
- Local search removes the costly hosted search computation, but the optional compact telemetry request remains unless disabled.

## Decision fork

Do not request another hosted A/B measurement yet. First build a dormant, beta-only English local-first prototype and verify it locally.

Required prototype gates:

1. Only `search_icons` on the beta version and without a locale uses local-first search.
2. Localized searches and every `recommend_icons` call retain their current hosted routes.
3. Material outline and solid results resolve from the packaged bundle with no asset network call.
4. The 225-case fingerprint, ranking policy, library modes, brand rules, ambiguity rules, and recommendation clarification stay green.
5. Complete MCP response checks cover ordinary SVG, Material outline, Material solid, empty results, query-frame output, and errors.
6. The package remains below 7 MB packed, local p95 remains below 500 ms on the fixed suite, and combined index plus Material RSS remains below 75 MB in the local benchmark.
7. Telemetry failure never delays or fails local search.

If this prototype passes, prepare a new npm beta approval packet without a Supabase search deployment. If it fails response quality or package limits, return to the auditor's same-window hosted A/B diagnostic.

## Reproduction

```powershell
node scripts/evaluate-search-v2-local-first-feasibility.mjs
npm run verify:search-v2-phase1-parity
npm run verify:search-ranking-policy
npm run verify:search-library-modes
npm run verify:recommend-icons-clarification
npm run verify:mcp-multilingual-support
```
