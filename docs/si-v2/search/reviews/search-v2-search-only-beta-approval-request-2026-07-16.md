# Search v2 search-only beta approval request

Date: 2026-07-16
Status: awaiting owner approval; this document does not authorize external action by itself
Manifest fingerprint: `bf59e6cfd4b73a8df654ce37ec293f399a43b024ee3f785fa98566e55621d734`

## Purpose

Release the faster deterministic search path to opt-in MCP beta users. Only `search_icons` uses the isolated beta endpoint. `recommend_icons` continues to use the stable endpoint with the same response bytes.

The beta includes the repaired Material library support. It does not add an AI agent, embeddings, a paid model call, or a new ranking system.

## Bound artifacts

| item | exact value |
| --- | --- |
| Implementation commit | `415f401b7a034690ab039b5245f77b01f1d4fab2` |
| Isolated beta endpoint | `mcp-search-v2-beta` |
| Beta cohort | `deterministic-v2-beta` |
| Migration | `20260714180000_search_v2_tool_latency_evidence.sql` |
| Migration SHA-256 | `d482408f156320fbbf518d6d66ac51ba1c1660321bacff9485f4e32a408fc3b5` |
| Guarded runner SHA-256 | `1e8701a416677fd88ec0af7ce3e6061e9b6d1214dad3839bdf8884e8705510eb` |
| Incident guardrails SHA-256 | `6be919eca3bf0ee46ca4d7cee6a4b3646804e7d4733eebf31c8c6cc9059d394a` |
| Package | `@supericons/mcp@0.4.19-beta.0` |
| npm tag | `beta` |
| Clean committed package | 44 files, SHA-256 `6bb6bda4563ba2edef60bc5ce053a1f8dc4d22ba274956a1231b5d9ce7965c1c` |
| Authorization manifest | `search-v2-search-only-beta-authorization-manifest-2026-07-16.json` |
| Manifest SHA-256 | `bf59e6cfd4b73a8df654ce37ec293f399a43b024ee3f785fa98566e55621d734` |

Text artifact hashes use UTF-8 text with line endings normalized to LF. The guarded PowerShell runner applies the same rule, so Windows line endings cannot falsely reject the approved SQL.

The npm archive is built from a temporary clean worktree at the implementation commit. The publication step must use that exact hash-verified archive, not repack the active worktree.

## Tool separation

The prerelease package routes:

- `search_icons` to `mcp-search-v2-beta`, with cohort `deterministic-v2-beta`;
- `recommend_icons` to stable `mcp-search`, with no beta cohort.

The package gate compares the full recommendation response bytes. Recommendation does not use the local shared treatment in this beta.

## Requested external actions

Approval authorizes only these mutations:

1. Apply migration `20260714180000` with the hash-pinned runner in one transaction.
2. If the SQL and fixed postflight pass, repair only migration-history version `20260714180000`.
3. Deploy commit `415f401b7a034690ab039b5245f77b01f1d4fab2` once to isolated function `mcp-search-v2-beta`.
4. Run the sequential Gate C checks and their standard audit rows.
5. Publish `@supericons/mcp@0.4.19-beta.0` once under npm tag `beta` while leaving `latest` at `0.4.17`.
6. Run a clean-install smoke against the published prerelease.
7. Keep the isolated endpoint for the bounded beta window unless a rollback condition requires deletion.

The owner may manually share reviewed, plain-language beta invitations. No automated message is authorized.

## Incident protection gates

The live Gate C smoke is sequential. It is not a load test. Before npm publication, the executor must confirm:

- platform function errors and search audit errors separately;
- at least 95 percent audit-row capture for eligible smoke requests;
- no more than 1 percent errors;
- usage-event dedupe still separates sessions and dedupes same-session retries;
- first-request and reused-worker latency are reported separately;
- Material is truthfully listed and returns exact outline and solid SVG; and
- production search functions and npm `latest` remain unchanged.

If platform error evidence or audit evidence cannot be read, Gate C is incomplete. The executor deletes the isolated endpoint and does not publish npm.

## Beta window and evidence

The seven-day clock starts with the first verified eligible `search_icons` request, not deployment. The beta aims for at least 200 eligible attempts across 20 session hashes. If it is underpowered after seven days, it may continue to 14 days. If it remains underpowered, the closeout must say so.

The closeout reports warm search p50 and p95, first requests, reused workers, complete MCP tool latency, platform errors, audit errors, audit capture, outcomes, locale and library modes, fixed-suite results, and an owner-reviewed relevance sample.

Warm search p95 must be at most 2,000 ms. The error rate must be at most 1 percent. First requests are never hidden inside warm averages.

## Required preflight

Before any mutation, authenticated read-only checks must verify:

- the isolated beta endpoint is absent or in the expected prerelease state;
- production `search-icons` and `mcp-search` versions are recorded and remain unchanged;
- migration `20260714180000` is not already recorded as applied, unless the executor stops for reconciliation;
- npm `latest` is still `0.4.17`; and
- npm version `0.4.19-beta.0` is not already published.

Read-only checks on 2026-07-16 found `search-icons` active at version 35, `mcp-search` active at version 38, `serve-material-snapshot` active at version 49, and no `mcp-search-v2-beta` endpoint. The npm registry reported `latest` at `0.4.17` and no published `0.4.19-beta.0`. The database migration ledger still requires the owner's database password during the execution preflight.

## Rollback

- SQL failure: the transaction rolls back, history repair does not run, and deployment stops.
- Repair failure after SQL success: verify the new objects, then retry only the exact repair. Do not rerun SQL by assumption.
- Gate C failure or missing evidence: delete the isolated endpoint and do not publish npm.
- Published-beta failure: deprecate the prerelease, stop invitations, delete the isolated endpoint, and keep `latest` unchanged.
- Measurement failure: record the evidence and close the beta. Do not change stable production functions.

Nullable evidence columns may remain after rollback because stable functions ignore them. Dropping them is not part of this approval.

## Excluded scope

This request does not authorize:

- any `recommend_icons` beta route;
- migration `20260714190000` or the shared recommendation treatment endpoint;
- production function deployment;
- normal `supabase db push`;
- repair of an older migration-history row;
- a production load test;
- changing npm `latest`;
- a scheduled warm ping;
- an automated public invitation;
- activation of either drafted monitoring routine;
- a model-provider call; or
- Netlify, Railway, or other site deployment.

## Approval wording

To authorize this exact search-only beta, reply:

> Approve Search v2 search-only beta manifest `bf59e6cfd4b73a8df654ce37ec293f399a43b024ee3f785fa98566e55621d734` with migration `20260714180000`, one deployment of `mcp-search-v2-beta`, and publication of `@supericons/mcp@0.4.19-beta.0` under the `beta` tag for the bounded beta window. `recommend_icons`, production functions, and npm `latest` must remain unchanged. No normal database push, older migration repair, production load test, scheduled warm ping, automated public invitation, monitoring activation, or model-provider call is authorized.
