# Donation and charity local search parity repair

Date: 2026-08-04

Source baseline: `69f6d39a02f5ce950be5b976387851efc8f5b846`

Package baseline: `@supericons/mcp` 0.4.27

## Problem

Local MCP returned an honest zero for `donation` and `charity donation heart`, while the website and Hosted MCP could return relevant hand-heart icons. The relevant icons were already present in the public package. The local search aliases did not connect the donation and charity meanings to those icons.

This was a local semantic coverage gap. It was not a missing-icon problem, a hosted routing failure, or a reason to lower the global relevance threshold.

## Bounded repair

The public semantic alias map now links the reviewed donation and charity meanings to four existing icons:

- `lucide:hand-heart`
- `phosphor:hand-heart`
- `mingcute:hand_heart_line`
- `mingcute:heart_hand_line`

The public and MCP alias files remain byte-identical. No protected hosted intelligence, icon catalog content, telemetry code, database code, tool schema, or hosted URL changed.

## Verified behavior

Before the repair:

- `donation`, Local MCP: zero results
- `charity donation heart`, Local MCP: zero results
- `hand heart`, Local MCP: relevant results

After the repair, the shared pipeline and actual Local MCP stdio surface return these reviewed results for both core queries:

1. `lucide:hand-heart`
2. `phosphor:hand-heart`
3. `mingcute:hand_heart_line`
4. `mingcute:heart_hand_line`

Strict Lucide and Phosphor searches stay inside the requested library. The controls `donation receipt`, `charity event`, `heart rate`, `blood donation`, and `giving feedback` keep their original meanings. `florblequux donationless` remains an honest zero.

## Verification

The following commands passed against the changed worktree:

- `npm run verify:search-donation-charity-parity`: 13 of 13 shared-pipeline cases and 13 of 13 Local MCP cases passed.
- `node scripts/verify-search-v2-surface-equivalence-baseline.mjs`: 47 of 47 cases passed.
- `node scripts/verify-search-v2-browser-equivalence.mjs`: 47 of 47 cases passed.
- `node scripts/verify-search-v2-phase1-parity.mjs`: 225 of 225 cases passed.
- `node scripts/compare-search-v2-fingerprint-cases.mjs --baseline-root=<clean-main> --current-root=.`: 225 cases compared, zero changed cases.
- Main fingerprint stayed `df8a55dafa58e32ba1b7ea9e1933387c9bb1c7f5ef587a758567cd36e86b2357`.
- Locale-route fingerprint stayed `c924440e54573024cf8570769d9f46e2e360adb3b3f90f857f3507b5f6d69874`.
- `node scripts/verify-search-v2-hosted-route-repair.mjs`: hosted-primary routing, valid-zero fallback, hosted error visibility, concurrency, and recommendation scope passed.
- `node scripts/verify-search-agent-library-recovery.mjs`: passed.
- `node scripts/verify-search-language-query-repair.mjs`: passed.
- `node scripts/verify-search-v2-assessment-checklist-recall.mjs`: passed.
- `node scripts/verify-search-query-fixtures.mjs`: 8 of 8 cases passed.
- `node scripts/verify-search-v2-vocabulary-gaps.mjs`: 31 of 31 cases passed.
- `node scripts/verify-search-intent-graph.mjs`: 71 groups and 27 fixtures passed.
- `node scripts/verify-search-v2-protected-public-artifacts.mjs`: public-package and web protections passed.
- `node scripts/verify-search-v2-semantic-latency.mjs`, run alone: cold first call 642.4 ms and p95 485.2 ms, within the 1,000 ms cold and 500 ms p95 limits.
- `npm ci` at the repository root and under `mcp`: zero known vulnerabilities reported.

## Release impact

This source repair must be included in a later npm and website artifact to reach Local MCP users and the website's local search path. Hosted MCP already answered the reported queries correctly, so this repair does not require a hosted routing redesign. Any release should use the normal exact-artifact audit and rollback process.

No deployment or publication was performed as part of this repair.
