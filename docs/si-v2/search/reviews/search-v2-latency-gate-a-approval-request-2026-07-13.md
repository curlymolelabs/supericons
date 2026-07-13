# Search v2 latency measurement approval request

Date: 2026-07-13
Status: awaiting owner approval; no external action is authorized by this document alone
Manifest fingerprint: `fcdfaeef7f19af49536438ca1518655813fcffd103866d352cdb792c6821bb25`

## Purpose

Measure whether removing SVG content from candidate RPC responses fixes hosted search latency, and determine whether recommendation remains slow because it performs several hosted searches.

This is an internal measurement. It is not a public beta, production rollout, or npm release.

## Bound artifacts

| item | exact value |
| --- | --- |
| Isolated endpoint | `mcp-search-v2-beta` |
| Control commit | `ba7f7ea18` |
| Treatment commit | `cacd283cb` |
| Migration version | `20260713150000` |
| Migration SHA-256 | `8ad558920ae3565bd26fe3706a1ba8ef0e8c3b2ac9ddafce9f7b15e995ede42e` |
| Authorization manifest | `docs/si-v2/search/reviews/search-v2-latency-gate-a-authorization-manifest-2026-07-13.json` |
| Manifest SHA-256 | `fcdfaeef7f19af49536438ca1518655813fcffd103866d352cdb792c6821bb25` |

The control and treatment commits differ only in the isolated beta endpoint flags. Both use the same shared handler, stage timing, payload estimate, response mapping, and audit behavior.

## Local Gate A evidence

- Complete handler-level HTTP parity passed for five cases: SVG result, null-SVG result, empty query, invalid request, and candidate failure.
- Control and treatment returned identical status, headers, and raw JSON response bytes in the local handler integration test.
- The 225-case deterministic suite kept fingerprint `564464d5da3416a956ff6d900ee1ccf09f3fa491b2b72e7bff3de75c273e08b2`.
- The additive migration, preflight, postflight, old/new candidate comparison, permission checks, and rollback passed in disposable PostgreSQL 17.
- The guarded runner is pinned to the migration hash, applies one SQL transaction, and repairs only version `20260713150000` after postflight passes.
- The timing output contains a control or treatment label, stage durations, counts, SVG character totals, and approximate candidate payload characters. It does not contain query text, icon IDs, SVG content, credentials, session hashes, or IP hashes.
- The default and beta search paths make zero external model-provider calls.

The handler integration uses a controlled local data gateway. Live Supabase response parity, latency, and stage timing remain unverified until this measurement is approved and run.

## Requested external actions

Approval authorizes only these actions:

1. Apply the exact migration with `scripts/apply-search-v2-lightweight-candidates-hosted.ps1 -ExecuteApprovedLatencyGateA`.
2. Repair only migration history version `20260713150000` after SQL and postflight pass.
3. Use clean temporary worktrees for control commit `ba7f7ea18` and treatment commit `cacd283cb`.
4. Deploy the control commit to `mcp-search-v2-beta` for the search measurement.
5. Immediately deploy the treatment commit to the same endpoint for the matched search measurement.
6. Deploy control and treatment once more, in that order, for separately measured first-request and warm recommendation runs.
7. Delete `mcp-search-v2-beta` after measurement, or immediately after a rollback trigger.
8. Run read-only checks before and after to prove stable `search-icons`, `mcp-search`, and npm `latest` did not change.

Maximum function deployments: four. Production function deployments: zero.

## Measurement rules

### Search

- Five fixed queries from the authorization manifest.
- One first request after each deployment, reported separately.
- Twenty-five warm requests per variant, using five repetitions of the same ordered query set.
- Same client, region, request bodies, ordering, and short time window for control and treatment.

### Recommendation

- Task: `Choose an icon for application settings.`
- Slot: `cog`.
- One first recommendation after each deployment, reported separately.
- Twenty warm recommendations per variant.
- Count the hosted searches used by each recommendation and report the full recommendation duration.

### Required limits

- Treatment hosted-search p95 at or below 2,000 ms.
- Treatment one-slot recommendation p95 at or below 3,000 ms.
- Error rate at or below 1 percent.
- First requests reported individually. Two consecutive first-request checks above the relevant limit fail the measurement.
- Treatment candidate SVG characters equal zero.
- Treatment approximate candidate payload is lower than control for matched SVG-result queries.
- Stable production function versions remain unchanged.

If search passes and recommendation fails, no npm publication occurs. The next work is recommendation fan-out, not broad search projection work by default.

## Rollback and stop rules

Stop immediately if response parity changes, a stable production function changes, private data appears in logs, an unapproved external call occurs, or two consecutive latency checks exceed a limit.

- SQL failure: the single transaction rolls back and migration history is not repaired.
- SQL success with repair failure: do not rerun SQL; verify the function and retry only the exact repair.
- Measurement failure: delete the isolated endpoint. The additive RPC may remain unused for separate review.
- Parity or security failure: stop before further measurement and record the failure.

The following remain prohibited: normal `supabase db push`, older migration-history repair, production function deployment, npm publication or tag changes, Netlify deployment, model-provider calls, user invitations, and public beta messages.

## Decision after measurement

- Candidate stage remains dominant: consider projection, index, or batching work.
- Recommendation remains dominant: reduce serialized recommendation searches or create one combined request.
- Rate-limit, account, audit, network, or hosting stage dominates: fix that stage instead.
- Both limits pass: prepare a separate public-beta approval request. Do not publish automatically.

## Approval wording

To authorize this exact internal measurement, reply:

> Approve Search v2 latency measurement manifest `fcdfaeef7f19af49536438ca1518655813fcffd103866d352cdb792c6821bb25` with the external actions and limits listed in the approval request. No npm publication or production function deployment is authorized.
