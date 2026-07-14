# Search v2 round-trip latency approval request

Date: 2026-07-14
Status: awaiting owner approval; this document does not authorize external action by itself
Manifest fingerprint: `d0ebaabd2ccb439755ad5bd53d44faa1ba0c8ab08acd96ed52e92d6bf07937c8`

## Purpose

Measure whether fewer deterministic database and network round trips bring both search and recommendation under their current latency limits.

The treatment does not add AI, embeddings, fuzzy model output, or a paid provider. It keeps the current matching, ranking, SVG hydration, rate limiting, and audit behavior.

## Bound artifacts

| item | exact value |
| --- | --- |
| Implementation commit | `8ba345fa9` |
| Control endpoint | `mcp-search-v2-control` |
| Treatment endpoint | `mcp-search-v2-treatment` |
| New migration | `20260714120000_search_v2_batched_candidates.sql` |
| Migration SHA-256 | `f965c0b354a8d2e31be8791ac5b2041838be6bc8a2b40a97735f90d27f81cded` |
| Authorization manifest | `docs/si-v2/search/reviews/search-v2-roundtrip-latency-authorization-manifest-2026-07-14.json` |
| Manifest SHA-256 | `d0ebaabd2ccb439755ad5bd53d44faa1ba0c8ab08acd96ed52e92d6bf07937c8` |
| Measurement runner | `scripts/run-search-v2-roundtrip-latency-measurement.mjs` |
| Measurement runner SHA-256 | `bba4cf618fc5c6b01bd162492790bb67495e4a9942d37905b4a790d6fbbe3a11` |
| Clean committed 225-case fingerprint | `e610fce301e92bef374fca076526ef07f0fe2f31b8d63a933cca399266593e76` |

The control uses the current lightweight candidate function and separate recommendation searches. The treatment uses one ordered candidate-array function and one grouped recommendation request.

The implementation commit and its parent produce the same 225-case fingerprint when each is checked in a temporary clean worktree. Uncommitted catalog and taxonomy files in the main working tree are excluded from this proof.

## Requested external actions

Approval authorizes only these mutations:

1. Apply migration `20260714120000` through the hash-pinned runner, in one transaction.
2. If SQL succeeds, repair only migration-history version `20260714120000`.
3. Deploy commit `8ba345fa9` once to `mcp-search-v2-control`.
4. Deploy commit `8ba345fa9` once to `mcp-search-v2-treatment`.
5. Delete both isolated endpoints after measurement or immediately after a safety stop.

The fixed measurement requests write their normal synchronous search audit rows. Approval includes only those measurement-generated audit rows.

The request authorizes no normal `supabase db push`, older migration repair, production function deployment, npm action, Netlify action, model-provider call, scheduled warm ping, public invitation, or public beta.

## Measurement design

Both endpoints stay deployed for one short measurement window. Requests alternate between control and treatment so network or platform drift is less likely to look like a code improvement.

The fixed work is:

- five parity cases, repeated three times per endpoint;
- one separate first search and 25 warm searches per endpoint;
- one separate first localized search and five warm localized searches per endpoint;
- one separate first recommendation and 20 warm recommendations per endpoint; and
- a public-safe stage-log export after the request window.

The one-slot recommendation must show four logical and actual HTTP requests on control, and one logical and actual HTTP request on treatment when no retry occurs. Any retry is reported rather than hidden. The public recommendation result must remain equal.

## Safety stops and performance gates

These safety failures stop the run and trigger immediate endpoint deletion:

- response parity differs;
- a production function version or npm tag changes;
- logs or artifacts contain credentials or private data;
- an unapproved call or mutation occurs; or
- either endpoint differs from the approved implementation commit.

Latency and error limits are publication gates, not early diagnostic stops. If a surface misses its limit, finish the remaining safe diagnostic phases, block publication, record the failed surface, and delete both endpoints at closeout.

Limits remain:

- direct hosted search warm p95 at or below 2,000 ms;
- localized MCP search warm p95 at or below 2,000 ms;
- one-slot recommendation warm p95 at or below 3,000 ms; and
- error rate at or below 1 percent.

Every first request is reported separately. It is not hidden inside a warm average.

## Timing evidence

Safe stage records must include:

- control or treatment;
- first or reused worker plus request order;
- module age at handler entry;
- total and per-stage duration;
- query-variant and candidate counts;
- candidate payload sizes; and
- final response size.

Module age is not labeled as module-load time. Logs must not include raw queries, icon IDs, SVG content, credentials, session hashes, or IP hashes.

## Rollback

- SQL failure: the transaction rolls back, no history repair runs, and neither endpoint deploys.
- History repair failure after SQL success: verify the function and retry only the exact repair. Do not rerun SQL by assumption.
- Safety failure: delete both endpoints immediately.
- Performance failure: finish safe diagnostics, delete both endpoints, and keep publication blocked.
- Successful measurement: delete both endpoints. Public beta and npm still require a separate approval.

## Approval wording

To authorize this exact measurement, reply:

> Approve Search v2 round-trip latency manifest `d0ebaabd2ccb439755ad5bd53d44faa1ba0c8ab08acd96ed52e92d6bf07937c8` with migration `20260714120000`, one deployment each of `mcp-search-v2-control` and `mcp-search-v2-treatment`, the fixed internal measurements and their standard audit rows, and deletion of both isolated endpoints. No production function deployment, normal database push, older migration repair, npm publication, scheduled warm ping, public invitation, or model-provider call is authorized.
