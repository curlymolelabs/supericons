# Search query baseline verification

Date: 2026-07-11

Status: sanitized, bounded evidence snapshot

## Purpose

This record preserves the public-safe findings used to sequence SI Search Engine v2 work. It is evidence for prioritization, not a complete measure of production relevance or human demand.

The raw admin export is intentionally not stored in this repository. It contains hashed visitor and API-key identifiers, request metadata, context URLs, account attributes, and raw evidence rows. This verification record excludes those fields.

## Source

- Source system: Supericons admin API query analysis pack
- Exported at: `2026-07-11T06:02:48.837Z`
- Export schema: `supericons_query_analysis_pack`, schema version 2
- Admin filters: live environment, all channels, seven-day window
- Raw export SHA-256: `20EEF2A7F45C68D55738BE69370FE14009137ECE2380913E2F4B9B9A7410FFAC`
- Raw export retention: private local analytics input; not a repository artifact
- Reproducible aggregate calculations: `output/search-zero-results-analysis-2026-07-11/analysis.sql`

## Coverage and limitations

- Summary population: 2,196 query records.
- Detailed export: 2,000 bounded query rows.
- Evidence sample: 500 latest rows.
- Detailed rows contain 4,045 attempts.
- The evidence sample is not a complete event history.
- Issue categories overlap and must not be summed as mutually exclusive outcomes.
- Detailed traffic is predominantly associated with hosted MCP; only 42 detailed attempts occur on rows that include web. Channel arrays can overlap, so these are not mutually exclusive channel totals.
- The evidence sample contains one copy signal, so result-count success is not the same as user acceptance.
- All detailed rows carry a library setting, including the `all` setting. The export cannot provide a no-setting baseline.
- Concentrated request patterns may include automation, repeated agent work, or tests. The export does not prove which.

## Headline findings

| measure | value | interpretation |
| --- | ---: | --- |
| Reported zero-result query records | 534 of 2,196 (24.3%) | Summary-level query-record rate |
| Detailed zero-result attempts | 1,069 of 4,045 (26.4%) | Attempt-level rate in the bounded detail |
| Detailed successful attempts | 2,337 | Result-count classification, not confirmed acceptance |
| Detailed successful signals | 1 | Outcome telemetry is too sparse for relevance conclusions |
| Attempts on rows associated with hosted MCP | 4,007 of 4,045 (99.1%) | Findings mainly describe hosted MCP traffic |
| Attempts on rows associated with web | 42 | Too small to estimate web-wide impact |

## Tool-associated row outcomes

Each exported query row can list more than one tool, while its attempt counts are aggregated at the row level. The table therefore repeats a row's totals for every tool listed on that row. Tool rows overlap and must not be summed or treated as exclusive per-tool attribution.

| associated tool | row-level attempts | row-level zero-result attempts | zero-result rate | row-level successful attempts |
| --- | ---: | ---: | ---: | ---: |
| `recommend_icons` | 3,270 | 984 | 30.1% | 1,761 |
| `search_icons` | 254 | 23 | 9.1% | 129 |
| `get_icon` | 403 | 17 | 4.2% | 273 |

Rows associated with `recommend_icons` contain 984 of the 1,069 detailed zero-result attempts. Because tool arrays overlap, this is a broad sequencing signal for shared query understanding and recommendation alignment, not proof of exclusive tool attribution or cause. The traffic mix and acceptance telemetry are also incomplete.

## Library-setting outcomes

Libraries with at least 30 detailed attempts are shown below.

| library setting | attempts | zero-result attempts | zero-result rate | successful attempts |
| --- | ---: | ---: | ---: | ---: |
| Bootstrap | 32 | 23 | 71.9% | 5 |
| Phosphor | 1,129 | 525 | 46.5% | 405 |
| Iconoir | 109 | 41 | 37.6% | 38 |
| Lucide | 1,871 | 345 | 18.4% | 1,195 |
| All libraries | 375 | 55 | 14.7% | 299 |
| Material | 75 | 11 | 14.7% | 56 |
| Tabler | 362 | 51 | 14.1% | 283 |
| MingCute | 60 | 8 | 13.3% | 44 |

Small library samples must not be compared as though they have equal confidence. The repeated pattern that matters for planning is that some ordinary concepts succeed under `all` or one library and fail under another. Search v2 therefore needs an explicit strict-library versus cross-library fallback contract and library-aware evaluation fixtures.

## Reviewed public-safe regression seeds

The following generic concepts were reviewed as safe to retain as regression seeds:

- `cog`
- `respond` and `reply`
- `combobox`, `dropdown`, `select`, `chooser`, and `picker`
- `magnifier`
- `alarm`, `alert`, and `bell`

These terms must not automatically become global aliases. Each fixture should state the expected icon family, library behavior, confidence, and unacceptable results.

## Decision implication

The evidence supports this sequence:

1. Establish a stratified evaluation baseline and define library-filter behavior.
2. Align query-frame behavior across search and `recommend_icons`.
3. Build embeddings offline while deterministic and recommendation work proceeds.
4. Evaluate vector retrieval and candidate fusion in shadow mode.
5. Enable an MCP-first beta only after quality, latency, exact-match, and leakage gates pass.

The architecture does not depend on this seven-day snapshot. Future snapshots may change priority within the phase plan without changing the canonical search contracts.

## Public-safety review

This record contains aggregate counts and reviewed generic query terms only. It omits hash prefixes, request IDs, deduplication IDs, context URLs, account data, geography, raw evidence text, unreviewed user queries, and private prompts.
