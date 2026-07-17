# Search v2 local-first beta prototype verification

Date: 2026-07-16
Status: locally verified, not published
Environment: Windows, Node.js 24, clean local package and process tests

## Outcome

The package-only Search v2 prototype passes its local release gates. Eligible English-like `search_icons` calls run from the packaged deterministic index. Localized and non-ASCII searches and every `recommend_icons` call keep the stable hosted route. No Supabase function, database, npm registry, or other serving system changed during this work.

This result supports independent review and a new publication-only approval packet. It does not authorize publication.

## Route contract

| Request | Route | Beta cohort |
| --- | --- | --- |
| `search_icons`, no locale, ASCII query | Packaged local index | `deterministic-v2-beta` on tool-outcome telemetry |
| `search_icons`, locale present | Stable `mcp-search` | None |
| `search_icons`, non-ASCII query without locale | Stable `mcp-search` | None |
| `recommend_icons` | Stable `mcp-search` | None |
| Web search | Unchanged | Not applicable |

The local response reports `search_runtime.mode: local_first` and the packaged icon-index generation time. The tested snapshot date is `2026-06-28T06:24:19.035Z`.

## Focused behavior verification

`npm run verify:search-v2-local-first-beta` passed with these checked outcomes:

- English and Material searches made no hosted search call.
- Material outline and solid SVGs came from the packaged 8,524-asset bundle and made no asset request.
- Localized, non-ASCII, and recommendation calls used the stable hosted route without a beta cohort.
- Successful, zero-result, query-frame, invalid-request, and telemetry-failure responses were exercised.
- One eligible local call produced one tool-outcome telemetry attempt.
- A failed telemetry request did not fail or block the local search result.
- The npm prepublish command includes this focused gate.

The focused verifier was introduced before the route implementation and initially failed on the missing Material package files and hosted-call expectations. It passed only after the package and route changes were present.

## Fixed quality and resource gates

The current feasibility rerun reported:

| Gate | Verified result | Limit |
| --- | ---: | ---: |
| Fixed cases | 225 | 225 |
| Fixed fingerprint | `ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8` | Must match |
| Local per-case p95 | 202.295 ms | Below 500 ms |
| Maximum local case | 407.962 ms | Informational |
| Fresh-process index-load p95 | 105.519 ms | Informational |
| Combined index and Material RSS p95 | 52,469,760 bytes | Below 75 MB |
| Packed package | 6,108,615 bytes, 47 files | Below 7 MB |
| Material assets | 8,524 | Exact |

The same run returned zero for 62 of 75 multilingual fixtures. That result is why localized and non-ASCII queries remain hosted.

## English zero-result review

The local evaluator returned zero for 18 of 150 no-locale fixtures. The case IDs were cross-checked against the evaluation set:

| Classification | Count | Cases and meaning |
| --- | ---: | --- |
| Recorded missing-icon or library gaps | 7 | Six long-query cases explicitly marked `new_icon_gap` or `library_gap`, plus the cross-surface license-plate case that exercises the same known gap |
| Brand safety canaries | 6 | Bare blocked aliases where returning no unsafe brand substitution is acceptable |
| Recommendation-only fixtures | 2 | Slot fixtures included in the shared 225-case evaluator but outside the local `search_icons` release scope |
| Unresolved generic search gaps | 3 | `software license document`, `dinner plate`, and `legal permit` |

The 18 zeros therefore do not represent 18 new beta regressions. Three are genuine generic deterministic gaps that should remain visible in closeout review. The fixed fingerprint proves the prototype did not change these outcomes.

## Telemetry rule

Local beta scorecard rows come from `si_log_mcp_search_outcome_v2` in `mcp_usage_events`, not from the hosted `search_request_audit` path. The tool-outcome insert does not carry the hosted request `dedupe_key`. The release rule is therefore checked directly: each eligible tool call reaches one results, zero, or error outcome attempt. Repeated user calls remain separate attempts.

Telemetry is non-blocking and may be disabled by the user through existing environment controls. A disabled client cannot count toward the measured beta sample, so coverage and missing-telemetry limits must be reported honestly.

## Package and safety checks

- `npm run prepublishOnly` passed after the package allowlist was updated for the two Material files.
- The prepublish gate scans 47 packed files for public safety.
- `npm audit --json` in `mcp/` reported zero vulnerabilities across 120 dependencies.
- `npm run verify:search-v2-deterministic-mcp-default` reported zero external model-provider calls across the default search path.
- The root workspace audit separately reported seven current advisories in repository and build tooling. They are not present in the MCP package lockfile, but they remain a separate maintenance item.

## Other verified regressions

- 225-case phase-one parity passed with the fixed fingerprint.
- Ranking policy passed, including four `hello` families, Swift ordering, and Lovable brand/concept sharing.
- All 15 strict, prefer, and all library-mode fixtures passed.
- Recommendation clarification passed and remains hosted.
- Intent-graph, query-frame, and focused multilingual package checks passed.
- A clean installed tarball served 4,262 Material IDs in both outline and solid styles from the packaged bundle.
- A clean installed tarball reproduced the fixed 225-case fingerprint after the public synonym map was added to the package. The gate first failed with fingerprint `c3de65c331774b74e6ab3b4a07c070217a9c0cc8c6871d50603b2442a8215b32` while that file was missing.

## Known limits

- This is a local prototype. Real user traffic has not exercised it.
- The packaged icon index is a point-in-time snapshot and requires a new package release for updates.
- Local rankings do not use private hosted-only ranking signals. The beta closeout must report informational local-versus-hosted top-result divergence on a bounded sanitized sample.
- Hosted latency attribution remains unresolved and is required before a later hosted web or recommendation gate.
- `recommend_icons`, localized search, non-ASCII search, and web search are not local-first in this release.

## Reproduction

```powershell
npm run verify:search-v2-local-first-beta
npm run verify:search-v2-phase1-parity
npm run verify:search-ranking-policy
npm run verify:search-library-modes
npm run verify:recommend-icons-clarification
npm run verify:mcp-multilingual-support
npm run verify:material-railway-asset-bundle
npm run verify:material-mcp-package
node scripts/verify-material-mcp-clean-install.mjs
npm run verify:search-v2-tool-scoped-beta
npm run verify:search-v2-tool-scoped-package
npm run verify:search-v2-deterministic-mcp-default
node scripts/evaluate-search-v2-local-first-feasibility.mjs
Set-Location mcp
npm run prepublishOnly
npm audit --json
```
