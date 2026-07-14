# Material emergency mcp-search rollback

Date: 2026-07-15

Status: Executed. Production restored on version 38 after a transient first-probe failure.

## Incident

Production `mcp-search` version 37 returns HTTP 500 `search_service_unavailable` for normal Lucide strict, all-library, Material outline, and Material solid requests. Packet 5S is blocked.

## Authorized rollback

Redeploy only `mcp-search` from the verified pre-Material source checkpoint `02b2c22ea8a76decee92d83c853ca6cf33899e6c`, keep `verify_jwt=false`, then run Lucide strict, all-mode, and legacy Material probes. No database, migration, storage, Railway, npm, beta, or other function change is authorized.

## Pinned state

- Authorized active version: 37
- Authorized active bundle SHA-256: `3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01`
- Target source revision: `02b2c22ea8a76decee92d83c853ca6cf33899e6c`
- Recorded version 36 bundle SHA-256: `3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5`
- Target surface: 13 files from the retained successful version 36 deployment transcript
- Target surface aggregate SHA-256: `1ed6085d7610a89231e02751d3545b0552bc578cf7d5144733d5240863f444e6`
- Deno check: passed from the isolated target worktree
- Rollback fingerprint: `351707fca47f090f601e1d9864b5a51b4663f908c051a9d126c01ae8a3b831d9`

## Target surface hashes

| File | Normalized SHA-256 |
| --- | --- |
| `supabase/functions/mcp-search/index.ts` | `1431d9ee81e6475e98306b31f516b986162fc8149c52d55036f94022986667bd` |
| `supabase/functions/_shared/search-engine/handle-search-request.ts` | `e074a122b5d0de9973ea0209106da48f07bf74f6633a75968740544a301c1622` |
| `lib/search-query-frame.js` | `7278bed98ba2b4baae2c06b28f55320eb7a3dc8140d389aa4832734523a3c249` |
| `lib/generated-search-intent-graph.js` | `de417e0722021fce6a1a8bc12ceb62c4903473cd581478957a0413b6a7674c90` |
| `lib/search-intent-core.js` | `9e90b860024214bfc5adc1c5e0b36a0cf1bb223ff093083a9eb5df7034011c5c` |
| `lib/generated-search-intent-rules.js` | `876c6f2ed69580e32e5059d422961761d8d31cd9dc05bc99d9a048e6131e39ef` |
| `supabase/functions/_shared/search-engine/types.ts` | `5035ce460228219bec7796ebd46266b7fa4137a0d3bcfcd12fc2b3b4c13e3f41` |
| `supabase/functions/_shared/search-engine/rate-limit.ts` | `9f9707af508d2f3a1456a8d4cc2b097f5d629fd5fe7b127403681cd5009851e3` |
| `supabase/functions/_shared/search-engine/rank.ts` | `51e340739693219255e1fc0918cc5affcf470a41c90930be474d8d0b31eb253d` |
| `lib/hosted-search-core.js` | `f6b6230d837940fea95dd9a5bb25ba772e365f26059a11ef46443baeb9b23225` |
| `lib/cjk-search-core.js` | `9b2d0935e2f5f060aabb215a261e33f695e886f3e9e03eb67faae7d538fb1a3e` |
| `supabase/functions/_shared/search-engine/normalize.ts` | `27e5601d37195fe14c5a1da6e58e85e28480e80afe1e94ba42b551a0f96e491d` |
| `supabase/functions/_shared/search-engine/catalog.ts` | `265eeea824895ac4bb81b8b0d607dbef43db9e3c2578972e01b40e97458faabc` |

## Fingerprinted text

The fingerprint is SHA-256 over this exact UTF-8 text with LF line endings and one trailing LF:

```text
packet=material_emergency_mcp_search_rollback
authorized_active_version=37
authorized_active_bundle_sha256=3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01
target_source_revision=02b2c22ea8a76decee92d83c853ca6cf33899e6c
target_recorded_v36_bundle_sha256=3416251449e61cd0c96abfaa0fd8fc1b4c15f572b40aec295c7f5c6efa97d5d5
target_surface_module_count=13
target_surface_aggregate_sha256=1ed6085d7610a89231e02751d3545b0552bc578cf7d5144733d5240863f444e6
project_ref=kcjmkakdhsqplvasgkjv
function_name=mcp-search
verify_jwt=false
deployments_authorized=1
postdeploy_probes=lucide_strict,all_mode,legacy_material
migration_change_authorized=false
database_change_authorized=false
storage_change_authorized=false
railway_deploy_authorized=false
npm_publication_authorized=false
beta_change_authorized=false
other_function_change_authorized=false
```

## Stop conditions

Stop before deployment if the active version, active bundle hash, target revision, target surface hash, clean-worktree state, Deno check, or JWT setting differs. After deployment, stop if Lucide strict or all-mode does not return HTTP 200 with results, or if legacy Material behavior differs from the pre-Material state.

## Execution result

The predeployment checks confirmed that production was still on version 37 with bundle SHA-256 `3ab7d0b18b8b48d123c851c3896fb62ea23c42a39b94c094b735b29caf1eac01` and `verify_jwt=false`. The authorized source checkpoint and 13-file surface also matched the pinned values above.

The isolated checkpoint was deployed as `mcp-search` version 38. Supabase reported:

- Active version: 38
- Active bundle SHA-256: `90c21f737fa5ac3a1162e8ba527b94c97555e9bd93c94afd4845a66298f570ce`
- JWT verification: false
- Function changed: `mcp-search` only

The freshly built version 38 bundle does not have the recorded historical version 36 bundle hash. Supabase does not provide a direct version rollback operation, so this action rebuilt and redeployed the pinned source checkpoint as a new function version.

## Restoration probes

The first valid Lucide strict probe against version 38 returned HTTP 500 `search_service_unavailable` after about 17.8 seconds. This failed the first postdeployment stop condition. The all-mode and legacy Material probes were not continued as release evidence after that failure.

Two earlier attempts are excluded from the result:

- A three-probe Node process exceeded its 120-second command timeout without producing retained results.
- A curl request returned HTTP 200 for an empty query because PowerShell quoting produced an invalid request body. It was not a valid restoration probe.

## Current production state

The first valid postdeployment probe failed, so the original stop decision was correct with the evidence available at that time. A later independent probe set established that version 38 had become healthy. The rollback deployment restored the pre-Material serving behavior after a transient first-probe failure. No database, migration, storage, Railway, npm, beta, or other function change was made.

## Warm restoration verification

At `2026-07-15T00:30:55+08:00`, production metadata still reported active `mcp-search` version 38, bundle SHA-256 `90c21f737fa5ac3a1162e8ba527b94c97555e9bd93c94afd4845a66298f570ce`, and `verify_jwt=false`. Six sequential production requests then produced:

| Probe | HTTP | Duration | Results | Valid SVGs |
| --- | ---: | ---: | ---: | ---: |
| Lucide strict `calendar`, first | 200 | 4,178.7 ms | 5 | 5 |
| Lucide strict `calendar`, second | 200 | 1,198.8 ms | 5 | 5 |
| All-mode `settings` | 200 | 3,166.7 ms | 10 | 9 |
| All-mode `cog` | 200 | 1,797.1 ms | 10 | 10 |
| Legacy Material outline `settings` | 200 | 1,857.9 ms | 5 | 0 |
| Legacy Material solid `settings` | 200 | 1,413.2 ms | 0 | 0 |

The result matches the known pre-Material capability state. Normal Lucide search works. All-mode returns the requested row count, although Material still consumes one `settings` slot without a deliverable SVG. Material outline rows remain rankable without SVG, and Material solid remains empty.

## Remaining diagnosis

The failed first version 38 probe is consistent with deployment warm-up or another transient runtime condition, but the available evidence does not prove a cold-start root cause. The first later Lucide request took 4.2 seconds and the immediate repeat took 1.2 seconds, which supports a warm-up effect without establishing that it caused the earlier HTTP 500.

The persistent version 37 outage remains specific to that deployed code or its runtime interaction. The previously suggested missing `si_search_icon_candidates_v3` dependency does not match the pinned checkpoint's default request path, which uses the existing `si_search_icon_candidates` RPC. Version 37 function logs are still required to identify the exact exception.

An impact count from `search_request_audit` alone may undercount failed requests. The handler suppresses secondary audit-write failures while returning the primary error, so any database failure that also prevents the audit insert will leave no audit row. Edge request logs should be the primary source for total HTTP 500 requests in the outage window, with audit rows used as supporting evidence.

## Retained impact aggregates

The owner exported the full non-success invocation query for `2026-07-14T15:30:00Z` through `2026-07-14T16:35:00Z`. The export contains 144 unique Edge log rows, which is below its raised 1,000-row limit and therefore removes the earlier 100-row dashboard cap for this filter. Its SHA-256 is `a3e6b799dd2ed6923cba6a622bfdb972e616386371416bc25f84103ed11c5d70`.

| Version | HTTP status | Rows | First event, Singapore time | Last event, Singapore time |
| ---: | ---: | ---: | --- | --- |
| 37 | 500 | 127 | 2026-07-15 00:06:56 | 2026-07-15 00:17:58 |
| 37 | 546 | 2 | 2026-07-15 00:17:55 | 2026-07-15 00:18:09 |
| 38 | 500 | 15 | 2026-07-15 00:18:30 | 2026-07-15 00:19:45 |

The 127 version 37 HTTP 500 rows have a 3,744 ms median, 35,531 ms p95, and 140,657 ms maximum execution time. The mixed fast and slow distribution does not support one uniform 18-second timeout explanation. The two HTTP 546 rows each ran for about 150 seconds. The 15 version 38 transition failures have a 37,950 ms median, 92,215 ms p95, and 93,840 ms maximum.

The companion audit query produced 19 successfully recorded error rows. Its SHA-256 is `e268798adc02767ad9b5ea644feba1c57bd8dd576ed0bf81aa72a722217a9b53`. Eleven were production hosted MCP requests classified as ChatGPT: nine `recommend_icons` and two `get_icon`. Four were `local_web` with local environment, three were the emergency rollback probe, and one was classified as an internal test. These are request attempts, not unique users. The production ChatGPT group may include verification traffic, so it is evidence of user-facing-channel impact but not a verified organic-user count.

The 19 audit rows versus 144 Edge failure rows confirms material audit undercount during the incident. Every recorded audit error has a null `error_code`, which is consistent with the handler's compatibility fallback stripping enriched audit columns when an enriched insert encounters a missing-column response. This observation does not identify the primary search failure.

## Postgres failure evidence

The owner exported 93 Postgres error rows for the incident window. The export has SHA-256 `66e24ca8256973b90bf4d70bd5af3cf870069d3c7787d6e5bf2b3f8820794ceb` and contains:

- 91 `canceling statement due to statement timeout` errors;
- one later duplicate-key error on `mcp_usage_events_dedupe_key_idx`, outside the search outage diagnosis;
- one parallel-worker termination caused by an administrator command.

The statement timeouts run from `2026-07-15 00:10:21` through `00:19:42` Singapore time. An expanded `00:19:30` event identifies the timed-out statement as the PostgREST wrapper around `public.si_search_icon_candidates(p_query, p_library, p_limit)`.

Edge failures began at `00:06:56`, before the first retained Postgres timeout. Nine version 37 HTTP 500 rows occurred in this early interval, with a 2,865 ms median and 6,157 ms maximum execution time. The remaining 135 non-success Edge rows overlap or follow the Postgres timeout interval and have a much longer tail, up to about 150 seconds.

This localizes the immediate database failure to candidate-search statement timeouts. It disproves the missing-RPC hypothesis because the RPC was found and executed. It does not yet establish why the RPC became slow or overloaded. The retained query text uses bound parameters, so the failing query and library values are not present in the Postgres export.

## Local recommendation concurrency correction

The stable version 37 deployment did not group one complete `recommend_icons` operation into one `mcp-search` request. The exact control revision `02b2c22ea8a76decee92d83c853ca6cf33899e6c` and treatment revision `425d8c2873e244988ed93ade18396e0f5c688f5e` both use the hosted MCP's separate `searchIconsForQuery` path. Stable `mcp-search` accepts one search per POST in both revisions.

The reproducible local analysis is `scripts/analyze-material-incident-concurrency.mjs`. Its retained result is `references/verification/material-incident-concurrency-analysis-2026-07-15.json`.

Both revisions allow two recommendation slots to search concurrently and one query per slot at a time. Each individual search then runs its candidate variants concurrently. Across the three retained recommendation-shaped scenarios:

| Scenario | Control search requests | Treatment search requests | Control peak candidate statements | Treatment peak candidate statements |
| --- | ---: | ---: | ---: | ---: |
| Packet 3R one-slot task | 8 | 4 | 9 | 9 |
| Four-slot navigation | 32 | 16 | 20 | 13 |
| Twelve-slot structural sample | 96 | 48 | 20 | 20 |

The treatment reduced the generated recommendation search requests in all three scenarios and did not increase the observed candidate-statement peak. Its theoretical per-recommendation ceiling is higher, 28 candidate statements instead of 20, because a treatment search may create up to 14 candidate variants while two searches overlap. None of the retained scenarios reached that treatment ceiling.

This disproves the grouped-v37 incident theory and provides no evidence that recommendation concurrency increased in the retained samples. It does not make the existing pattern cheap: two overlapping searches can still produce 20 concurrent candidate statements on the production path.

## Packet 3R baseline validity correction

The Packet 3R recommendation artifact is invalid for latency comparison. All 21 samples were marked successful, but none returned a recommendation or clarification, and all had the same response hash. The runner sent a grouped envelope to stable `mcp-search`, which returned its ordinary single-search response. The grouped client rejected the missing `responses` envelope, `recommendIconsForTask` converted the failure to empty result groups, and the measurement runner treated the remaining payload as success.

The direct-search artifact also lacks semantic gates. Its 25 warm samples contain 10 deterministic zero-result samples and only four response hashes. Some behavior is explainable from the pre-Material state, including the known SVG-less Material row and the strict Bootstrap inventory zero. The `combobox-bootstrap-prefer` zero had no encoded expectation. The measured 3,337.062 ms warm p95 also already exceeds the proposed 2,000 ms treatment ceiling. The artifact remains evidence of what the old runner measured, but it is not sufficient to bind the recovery latency contract.

Future baseline measurement must:

1. use the real separate per-query recommendation transport used by Railway;
2. accept a recommendation sample only when it returns a recommendation or an explicit clarification;
3. require a grouped request to receive a grouped `responses` envelope;
4. reject a run when every sample has the same response hash;
5. declare the expected outcome for every zero-result search case; and
6. set any absolute latency ceiling from fresh, semantically valid evidence.

The SQL-first database diagnostic remains independent of these invalid baselines. The actual production remeasurement creates audit traffic and requires a separate owner-approved packet.
