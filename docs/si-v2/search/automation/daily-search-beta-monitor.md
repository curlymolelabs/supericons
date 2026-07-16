# Daily Search v2 beta monitor

Status: Ready for read-only activation during the published Search v2 beta.

Schedule: Daily at 09:00, Asia/Singapore. Report `inactive` until the first eligible beta request starts the evidence window. End at beta closeout.

## Purpose

Watch the opt-in beta for failures that require attention before the weekly review. This routine is outside the live search path and cannot change user results.

## Instructions

1. Confirm that `@supericons/mcp@0.4.19-beta.0` remains published under `beta` and npm `latest` remains `0.4.17`. If no eligible beta request has started the evidence window, report `inactive` after completing public package and local safety checks.
2. Read the approved beta manifest and verify the expected package version, endpoint, cohort, and stable production versions.
3. Report eligible attempts and distinct session groups without exposing hashes or personal data.
4. Report first-request and reused-worker latency separately. Never hide first requests inside a warm average.
5. Calculate errors from platform function evidence and from search audit rows separately. Report the audit capture ratio. Do not treat audit rows as the only error source.
6. Report results, clarification, zero, and error as separate outcomes. Clarification is not a zero result.
7. Verify usage deduplication, library-mode coverage, locale coverage, and Material capability truth from the latest evidence.
8. Recommend rollback review immediately if warm search p95 exceeds 2,000 ms, either error rate exceeds 1 percent, eligible audit capture falls below 95 percent, production versions change unexpectedly, or Material search loses truthful SVG delivery.
9. Report progress against 200 eligible attempts, 20 session groups, 3 complete days, and green or resolved daily monitoring. Return a short owner digest with status, measured values, any threshold breach, and the exact next decision. Do not perform the decision.

## Boundaries

- Read-only access to hosted systems.
- No synthetic load test. Any approved smoke runs sequentially with concurrency 1.
- No deployment, publication, migration, database write, warm ping, automated invitation, or model-provider call.
- Never include credentials, raw queries tied to a session, session hashes, IP fragments, or private operational details.
