# Daily Search v2 beta monitor

Status: Active during the published Search v2 beta.

Schedule: Daily at 09:00, Asia/Singapore. Report `inactive` until the first eligible beta request starts the evidence window. End at beta closeout.

## Purpose

Watch the opt-in beta for failures that require attention before the weekly review. This routine is outside the live search path and cannot change user results.

## Instructions

1. Confirm that `@supericons/mcp@0.4.19-beta.2` remains published under `beta` and npm `latest` remains `0.4.17`. If beta.2 is not published yet, report `inactive` after completing package and local safety checks.
2. Read the beta.2 incident guardrails and verify the expected package version, local-first route, hosted fallback route, cohort rules, and stable production versions.
3. Report labeled controlled eligible `search_icons` attempts, qualifying-day progress, cohort shares, and distinct session groups without exposing hashes or personal data. Exclude unlabeled attempts from the controlled gate. Report organic use separately and never present scripted traffic as organic.
4. Report local eligible search p95 separately from hosted fallback and recommendation latency. The controlled gate requires local p95 at or below 500 ms.
5. Calculate local client errors separately from hosted fallback platform errors and search audit errors. Report the hosted audit capture ratio when hosted fallback traffic exists. Do not treat audit rows as the only error source.
6. Report results, clarification, zero, and error as separate outcomes. Clarification is not a zero result.
7. Verify usage deduplication, library-mode coverage, locale coverage, and Material capability truth from the latest evidence.
8. Recommend rollback review immediately if local eligible search p95 exceeds 500 ms, error rate exceeds 1 percent, any canary violation occurs, production versions change unexpectedly, or Material search loses truthful SVG delivery.
9. Report progress against 200 labeled controlled eligible `search_icons` attempts across at least 3 qualifying days, with at least 30 labeled attempts on each qualifying day. Also report progress toward 50 manually reviewed distinct query and mode combinations rerun on beta.2. Report organic adoption, session-group count, and traffic concentration as facts, not gates. Return a short owner digest with status, measured values, any threshold breach, and the exact next decision. Do not perform the decision.

## Boundaries

- Read-only access to hosted systems.
- No synthetic load test. Any approved smoke runs sequentially with concurrency 1.
- No deployment, publication, migration, database write, warm ping, automated invitation, or model-provider call.
- Never include credentials, raw queries tied to a session, session hashes, IP fragments, or private operational details.
