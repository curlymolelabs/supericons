# Search v2 Gate C workload completeness correction

Date: 2026-07-16
Starting revision: `17e1a7f0d55d78c0402aaad088d333f3f9a417eb`
Scope: local measurement-artifact validation only

Status: sample-presence and summary validation passed independent review. The fixed search-case identity rule was added later in `search-v2-gate-c-case-identity-correction-2026-07-16.md` after independent probes showed that 25 samples from one case could still satisfy the total count.

## Verified defect

Independent probes confirmed that strictly typed live evidence could still pass without the actual measurement samples. Null worker-state summaries, missing first requests, empty warm arrays, and missing smoke samples were accepted when summary values and live request counts were adjusted to agree.

This was a material release-signoff gap. It did not affect search results or any hosted system.

## Fixed workload contract

The evaluator now binds finalization to the fixed Gate C runner workload:

- one direct search first request;
- 25 direct warm search samples;
- one localized first sample with two hosted attempts;
- five localized warm samples with two hosted attempts each;
- Material outline and solid smoke samples;
- one invalid-request smoke sample;
- 41 hosted requests in total.

## Cross-checks

- Every required first, warm, localized, and smoke sample must be present as a non-null object.
- Every direct and hosted sample must carry a typed outcome, status, duration, and public-safe timing record.
- Worker-state summaries must contain non-null `first_request`, `reused_worker`, and `unknown` groups.
- Worker summary counts must match the states and outcomes in the underlying samples.
- Warm summary sample, success, error, error-rate, p50, p95, and maximum values must match the warm arrays.
- Localized hosted-request totals and per-search counts must match the hosted attempts.
- Material smoke results must include SVG for every result, match the requested style, and come from Material.
- The invalid-request smoke must return HTTP 400 with `invalid_library_mode`.
- The derived sample total must equal the fixed 41-request runner contract and the bound live evidence.

## Verification

`npm run verify:search-v2-search-only-beta-gate-c-evidence` passed the real PowerShell finalization fixture and all 32 fail-closed cases. The added cases reject null worker groups, missing first requests, empty search or localized warm arrays, missing smoke samples, inconsistent summary totals or latency values, and inconsistent hosted-request counts.

The full local release-gate set was rerun after this change. No live request, deployment, publication, hosted mutation, database mutation, monitoring activation, or model-provider call occurred.

## Next gate

Independently audit this narrow workload-completeness correction and rerun the local release gates. Do not deploy or publish. Any later live attempt still requires a faster implementation, fresh manifest, audit, and owner approval.
