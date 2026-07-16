# Search v2 Gate C complete-evidence correction

Date: 2026-07-16
Starting revision: `7c8df946305e6c5e06dad2ce0e42366f6381bc58`
Scope: local error evidence and release finalization only

## Verified defects

Independent review found two remaining release-safety defects after the first harness correction:

1. The measured error path completed the timing tracker but discarded its safe timing record before building the HTTP error response.
2. The PowerShell wrapper could report success after client latency and smoke checks without requiring the complete release evidence listed in the authorization manifest.

The original owner-pasted read-only SQL output was independently checked from task history. It reports 38 captured audit rows, one error, and a 5,303.9 ms p95. All six error-or-over-2,000-ms rows were first requests with worker ordinal 1 and module age 5 or 6 ms. This supports a cold-worker correlation but does not identify the slow internal stage. A private local copy is retained in the audit bridge and is not part of this commit.

## Correction

- Timing-enabled search and grouped-recommendation error responses now include the same public-safe `measurement_timing` record that the timing sink receives.
- Stable responses remain unchanged because timing is included only when the isolated measurement option is enabled.
- The hosted HTTP regression test now forces a candidate failure and verifies the structured error, candidate-search stage timing, and equality between the response timing and timing-sink record.
- Gate C now has separate `measure` and `finalize` phases.
- The measure phase can produce only `evidence_pending` and throws a controlled stop after its bounded requests finish, without closing the owner terminal session.
- The finalize phase requires existing search, localized, and smoke artifacts plus machine-readable platform, audit, production-function, and npm evidence.
- Finalization reruns recommendation byte parity and usage-dedupe checks.
- A behavioral evaluator checks every release requirement and is the only component allowed to return `status: ok`.
- Platform and audit request totals must match the hosted request count derived from the measurement artifacts. This prevents a smaller denominator from making capture or error rates look better.
- Relative and absolute evidence paths are resolved explicitly on Windows.

## Verification

The following checks passed on the corrected local tree:

| check | proof |
| --- | --- |
| Complete evidence behavior | `npm run verify:search-v2-search-only-beta-gate-c-evidence` passed a full PowerShell finalization fixture, a complete evidence set, and ten fail-closed cases |
| Runner contract | `npm run verify:search-v2-search-only-beta-gate-c-runner` confirmed the measure phase cannot report success and finalization requires complete evidence |
| Approval and missing-evidence guards | Direct PowerShell probes confirmed both guards fail before any live request |
| Timed HTTP error behavior | `npm run verify:search-v2-hosted-http-parity` returned `timed_error_response_includes_stage_evidence: true` |
| Incident guardrails | `npm run verify:search-v2-beta-incident-gates` returned `status: ok` |
| Tool routing and recommendation bytes | `npm run verify:search-v2-tool-scoped-beta` returned `recommendation_response_byte_parity: true` |
| Usage integrity | `npm run verify:mcp-usage-dedupe` returned `status: pass` |
| Fixed search suite | `npm run verify:search-v2-phase1-parity` passed 225 cases with fingerprint `ef293409...a76c8` and clean inputs |
| Shared recommendation | `npm run verify:search-v2-shared-recommendation-pipeline` returned exact response parity with one shared candidate call and timed failure-stage evidence |

No live request, deployment, publication, database mutation, monitoring activation, or model-provider call occurred during these checks.

## Remaining limit and next gate

This correction proves the local release gate now fails closed. It does not make the failed beta fast, recover the missing platform-stage logs, or authorize another live attempt.

Do not redeploy the unchanged beta. The next live attempt requires an implementation that is expected to pass with margin, a fresh manifest binding the evidence-collection method, independent review, and owner approval.
