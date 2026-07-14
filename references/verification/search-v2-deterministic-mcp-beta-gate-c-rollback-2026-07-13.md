# Search v2 deterministic MCP beta Gate C rollback

Date: 2026-07-13
Status: rolled back before npm publication

## Outcome

The isolated deterministic beta function was deployed and returned correct search behavior, but live latency crossed the agreed rollback limit in two consecutive checks. The isolated function was deleted immediately. The npm prerelease was not published, and existing web and MCP search functions remained on their saved versions.

## Scope reached

- The additive beta measurement schema remained deployed from Gate B.
- The isolated `mcp-search-v2-beta` function reached active version 1.
- No stable production function was deployed or replaced.
- No npm package or tag changed.
- No model-provider call was made.

## Behavior checks before rollback

| check | result | evidence |
| --- | --- | --- |
| Search | Passed | `settings` returned five results. |
| Recommendation | Passed for behavior | A settings task resolved to `tabler:settings-cog`. |
| Clarification | Passed for behavior | An unclear `hello` slot returned four labeled meanings, no guessed icon, and no numeric score. |
| Localized query | Passed through the package path | Simplified Chinese settings expanded to an English settings query and returned five results. |
| Invalid request | Passed | An unsupported library mode returned HTTP 400. |

The recommendation and clarification checks used the packaged recommendation code. Recommendation searches used the isolated hosted path and were marked as internal tests. Clarification completed before retrieval because the meaning remained unclear. The npm package itself was not published.

## Live latency evidence

Latency was measured from the client through the hosted function and database path.

| check | samples | HTTP 200 | p95 | maximum | verdict |
| --- | ---: | ---: | ---: | ---: | --- |
| Initial live batch | 12 | 12 | 7,023 ms | 7,023 ms | Failed the 2,000 ms limit |
| Consecutive check 1 | 10 | 10 | 4,551 ms | 4,551 ms | Failed the 2,000 ms limit |
| Consecutive check 2 | 10 | 10 | 1,349 ms | 1,349 ms | Passed after warmup |

The first two checks failed consecutively. The written Gate C rule requires immediate rollback after two consecutive p95 checks above 2,000 ms, even if a later warm check recovers.

One full recommendation check took 40,831 ms on its first run and 7,641 ms on a warm repeat. This is not directly comparable to a single hosted search because recommendation runs several search variants, but it confirms that current end-to-end recommendation latency needs focused work before another beta.

## Rollback execution

1. Publication stopped before `npm publish`.
2. The isolated `mcp-search-v2-beta` function was deleted.
3. The additive beta audit columns and function were left in place, as required by the rollback plan.
4. The hosted migration ledger entry for `20260712` was left unchanged.
5. The production web and MCP search endpoints were checked after deletion.

## Verified state after rollback

| item | verified state |
| --- | --- |
| `search-icons` | Active, version 35, returned HTTP 200 with three results |
| `mcp-search` | Active, version 36, returned HTTP 200 with three results |

Correction recorded 2026-07-14: the original table reported both production function versions one version low. The retained 2026-07-05 paired deployment transcript and the functions' shared production update timestamp establish `search-icons` version 35 and `mcp-search` version 36.
| `mcp-search-v2-beta` | Absent from the hosted function list |
| npm `latest` | `0.4.17` |
| npm beta prerelease | Not published in this execution |

The post-rollback production checks were functional but also slow: 5,292 ms for web search and 3,068 ms for MCP search in the two single-request checks. This suggests that at least part of the latency is shared hosted or database behavior, not an isolated beta routing defect. This is an inference from the observed timing, not a confirmed root cause.

## Remaining work before another beta

1. Profile hosted search time by stage: function startup, rate-limit lookup, query variants, database candidate calls, registry fetch, audit write, and client network time.
2. Define a repeatable live latency check with a stated warmup rule and a sample size large enough to distinguish cold starts from steady traffic.
3. Reduce recommendation fan-out or request time so common recommendations do not take several seconds.
4. Run a new local Gate A after any code or policy change.
5. Request a new deployment approval before redeploying the isolated function or publishing a prerelease.

Normal `db push` remains prohibited because the older hosted migration ledger is incomplete.
