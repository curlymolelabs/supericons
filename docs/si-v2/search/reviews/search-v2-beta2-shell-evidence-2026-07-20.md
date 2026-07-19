# Search v2 beta.2 shell evidence

Date: 2026-07-20

Status: implementation complete on the beta.2 shell branch. This is not a beta.2 release candidate.

## Implemented scope

- `search_icons` is described and initialized as the main icon tool on both the local stdio server and the hosted MCP server.
- Match responses include `image_url`, `markdown_image`, `suggested_response_markdown`, and `next_step`.
- Honest no-result responses include a stable code, a useful hint, `suggested_response_markdown`, and `next_step`. They do not include image fields.
- Hosted and local upstream failures return a compact suggested response and next step without fabricating icons.
- Daily allowance 429 responses preserve the status, tier, daily limit, reset time, retry delay, and structured details.
- Unsupported optional style, locale, and library-mode values are ignored with plain warnings. Numeric and boolean strings are accepted where suitable.
- `preview_icons` accepts arrays, one ref, or comma-separated refs. It renders up to 12 refs and reports `truncated_from`.
- Bare `run` recommendations now request a labeled choice between software execution and physical running. Task context resolves those meanings when it is sufficient.
- The package contains a fixture that proves the packaged query-frame and intent data load and produce concepts for `ai slop` and `agent tool call`.
- The package allowlist now includes the license, provenance, resilience, usage-attribution, and shell files already declared for publication.

## Verification results

The following checks passed against the source package in this branch:

- One-call contract: one match call and one no-result call, correct two-path behavior, server instructions, tool steering, input coercion, and a 15-ref preview truncated without a protocol error.
- Hosted server contract: match response, no-result response, long preview, server instructions, daily allowance 429 propagation, Material hydration, and usage attribution.
- Recommendation clarification: existing `hello` behavior, context narrowing, single-family behavior, bare `run` clarification, and two context-resolved `run` cases.
- Packaged query frame: required runtime files present, valid icon-index timestamp, non-empty meaning groups and positive concepts for two maintained semantic queries.
- Search regression checks: 225 evaluation queries, 75,840 semantic documents, 13 semantic smoke cases, query-frame shadow, intent graph, intent expansion, ranking policy, grouped recommendation parity, and the 150-case stdio route suite.
- Package checks: 64 expected files, 25,428,426 unpacked bytes, public-safety scan, preview PNG, clean install, local-first routing, hosted resilience, and usage deduplication.

## Deliberately deferred

- No `0.4.19-beta.2` tarball was built.
- The packaged icon index still reports `2026-06-28T06:24:19.035Z`. It must be refreshed and pinned in the release evidence after the remaining quality work merges.
- The exact 14-case matrix has not been run against beta.2 bytes because those bytes do not exist yet.
- Batch 2 relevance-floor and variant work, Batch 3 typo recovery, the quality branch merge, and the final exact-tarball checks remain release dependencies.

## Baseline maintenance findings

Two pre-existing checks need maintenance before the final release packet:

- `search-v2-beta-incident-guardrails-2026-07-16.json` still pins package version `0.4.19-beta.0`, while main already contains `0.4.19-beta.1`.
- The pinned GeoLite2 Country dataset is 32 days old on 2026-07-20, so the 30-day freshness check fails. The dependency, notices, lockfile, and verification assertion must be updated together.
