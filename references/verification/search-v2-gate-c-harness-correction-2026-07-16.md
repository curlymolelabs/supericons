# Search v2 Gate C harness correction

Date: 2026-07-16
Starting revision: `06bf169edc`
Scope: local measurement and release-stop tooling only

Status: superseded by `search-v2-gate-c-complete-evidence-correction-2026-07-16.md`. Independent review found that this first correction still dropped timing data from measured error responses and could report success before every release requirement was checked.

## Reason for the correction

The failed search-only beta run exposed two gaps in the local Gate C tooling:

1. The endpoint returned a public-safe `measurement_timing` object, but the client discarded it.
2. A combined PowerShell command continued to the localized measurement after the search command failed because the native exit code was not checked.

The hosted audit rows independently showed 38 captured requests, one error, and a 5,303.9 ms p95. All six error-or-over-2,000-ms rows were first requests on newly started workers. This is a correlation, not proof of which internal stage caused the delay.

## Local changes

- The measurement client now retains the allowed stage durations, worker state, worker request ordinal, safe row counts, approximate payload sizes, structured error code, and retryable label.
- Localized searches now retain evidence for every hosted attempt, including deterministic retry attempts.
- Search and localized artifacts now summarize first-request, reused-worker, and unknown-worker samples separately.
- The live smoke mode now checks Material outline and solid availability and the invalid-library-mode response.
- A guarded PowerShell runner now executes search, localized search, and smoke checks in order and stops after the first failed native command or breached limit.
- The guarded runner contains no deploy, publish, database-mutation, or model-provider command.

## Verification run

The following checks passed locally:

| check | proof |
| --- | --- |
| JavaScript syntax | `node --check` passed for the measurement and verification scripts |
| Harness regression check | `npm run verify:search-v2-search-only-beta-gate-c-runner` returned `status: ok` |
| Missing-approval guard | Running the PowerShell wrapper without `-ExecuteApprovedGateC` failed before any request |
| Incident guardrails | `npm run verify:search-v2-beta-incident-gates` returned `status: ok` |
| Tool routing | `npm run verify:search-v2-tool-scoped-beta` returned `status: ok` |
| Search response parity | `npm run verify:search-v2-phase1-parity` passed 225 cases with fingerprint `ef293409...a76c8` |

No live endpoint existed during these checks. No hosted request, deployment, publication, database mutation, monitoring activation, or model-provider call occurred.

## Evidence limit

This correction proves that the local harness retains the expected safe fields and fails closed by construction. It does not prove live stage timing because the isolated endpoint was already deleted. The exact cause of the July 16 latency failure remains unresolved.

## Next gate

1. Independently review the failed execution record and this harness correction.
2. Recover the existing platform timing logs for the failed run if they are still available, using the time window recorded in the execution report.
3. If those logs are unavailable, do not redeploy the unchanged build merely to collect them. First prepare an evidence-backed implementation expected to meet the limits with margin.
4. Any later live attempt requires a new manifest, audit, and owner approval.
