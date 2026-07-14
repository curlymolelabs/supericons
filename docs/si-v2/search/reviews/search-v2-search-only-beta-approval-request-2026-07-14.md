# Search v2 search-only beta approval request

Date: 2026-07-14
Status: awaiting owner approval; this document does not authorize external action by itself
Manifest fingerprint: `c2d76a1674f38e9c07c0ec7624d3c048c82ebb1e45f75e296e9e3bfc491adbc6`

## Purpose

Release the faster deterministic path to opt-in `search_icons` beta users without changing `recommend_icons` or any stable user. The beta gathers real first-request, reused-worker, hosted-search, and complete MCP tool latency evidence.

This beta does not add an AI agent, embeddings, a paid model call, or a new ranking system.

## Bound artifacts

| item | exact value |
| --- | --- |
| Implementation commit | `3bac7e87f03298dd184225af4d0ad40d5ea0cd98` |
| Isolated beta endpoint | `mcp-search-v2-beta` |
| Beta cohort | `deterministic-v2-beta` |
| Migration | `20260714180000_search_v2_tool_latency_evidence.sql` |
| Migration SHA-256 | `d482408f156320fbbf518d6d66ac51ba1c1660321bacff9485f4e32a408fc3b5` |
| Guarded runner SHA-256 | `d17cf9a35aecad6a5048f59a6267990f7da6f502e812de500c3103801a00d218` |
| Package | `@supericons/mcp@0.4.18-beta.0` |
| npm tag | `beta` |
| Clean committed package | 38 files, SHA-256 `7754183e61f8e5aca0b6d57eba06e8704ce70dd263a7acdd5558e47e166948db` |
| Authorization manifest | `search-v2-search-only-beta-authorization-manifest-2026-07-14.json` |
| Manifest SHA-256 | `c2d76a1674f38e9c07c0ec7624d3c048c82ebb1e45f75e296e9e3bfc491adbc6` |

The clean package was built from a temporary worktree at the bound commit. Uncommitted catalog and taxonomy files in the main workspace were excluded.

## Tool separation

The prerelease package routes:

- `search_icons` to `mcp-search-v2-beta`, with cohort `deterministic-v2-beta`;
- `recommend_icons` to stable `mcp-search`, with no beta cohort.

The local gate compares the complete recommendation response bytes between the stable and routed paths. It passes. Recommendation does not use the new shared treatment in this beta.

## Requested external actions

Approval authorizes only these mutations:

1. Apply migration `20260714180000` with the hash-pinned runner in one transaction.
2. If the SQL and fixed postflight pass, repair only migration-history version `20260714180000`.
3. Deploy commit `3bac7e87f03298dd184225af4d0ad40d5ea0cd98` once to isolated function `mcp-search-v2-beta`.
4. Run the fixed Gate C checks and their standard audit rows.
5. Publish `@supericons/mcp@0.4.18-beta.0` once under npm tag `beta` while leaving `latest` at `0.4.17`.
6. Run a clean-install smoke against the published prerelease.
7. Keep the endpoint for the bounded beta window, unless a rollback condition requires deletion.

The owner may manually share reviewed, plain-language beta invitations. No automated message or unreviewed public post is authorized.

## Beta window and evidence

The seven-day clock starts with the first verified eligible `search_icons` request, not deployment. The beta aims for at least 200 eligible attempts across 20 session hashes. If it is underpowered after seven days, it may continue to 14 days. If it remains underpowered, the closeout must say so.

The closeout reports:

- warm search p50 and p95;
- first-request and reused-worker latency separately;
- complete MCP tool latency separately from hosted-search latency;
- errors, zero results, and results as separate outcomes;
- locale and library mode cohorts;
- fixed-suite and matched-replay results; and
- an owner-reviewed relevance sample.

Search warm p95 must be at most 2,000 ms and the error rate at most 1 percent. First requests are reported separately and never hidden inside warm averages.

## Required preflight

The Supabase CLI read-only function check returned HTTP 401 while this packet was prepared. Before any mutation, the owner must sign in again and the executor must verify:

- the isolated beta endpoint is absent or in the expected pre-release state;
- production `search-icons` and `mcp-search` versions are recorded and remain unchanged throughout;
- npm `latest` is still `0.4.17`; and
- npm version `0.4.18-beta.0` is not already published.

The npm `latest` value was independently read as `0.4.17` on 2026-07-14. The Supabase function state is deliberately left unverified until reauthentication.

## Rollback

- SQL failure: the transaction rolls back, history repair does not run, and deployment stops.
- Repair failure after SQL success: verify the new objects, then retry only the exact repair. Do not rerun SQL by assumption.
- Gate C failure: delete the isolated endpoint and do not publish npm.
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
- changing npm `latest`;
- a scheduled warm ping;
- an automated public invitation;
- a model-provider call; or
- Netlify or other site deployment.

## Approval wording

To authorize this exact search-only beta, reply:

> Approve Search v2 search-only beta manifest `c2d76a1674f38e9c07c0ec7624d3c048c82ebb1e45f75e296e9e3bfc491adbc6` with migration `20260714180000`, one deployment of `mcp-search-v2-beta`, and publication of `@supericons/mcp@0.4.18-beta.0` under the `beta` tag for the bounded beta window. `recommend_icons`, production functions, and npm `latest` must remain unchanged. No normal database push, older migration repair, scheduled warm ping, automated public invitation, or model-provider call is authorized.
