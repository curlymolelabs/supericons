# Search v2 beta.3 indexed grouped release audit request

Date: 2026-07-21

State: source fix and packet locally prepared; production endpoint and v4 RPC absent; no beta.3 package built or published

## Scope

Audit two commits:

1. `bca4f502f07f93a518da0601e85100bb4f90795d` fixes the measured candidate retrieval bottleneck and changes the latency gate to count all actual routed samples while retaining worker classification.
2. `6e028215f6adf2b88496ce95b6c0f0b8151fb1d4` binds packet revision 5 to the source fix and fresh one-use evidence paths.

The pinned deployment source is `bca4f502f07f93a518da0601e85100bb4f90795d`. The stable `mcp-search` source remains byte-identical to main and is outside the mutation budget.

## Attempt 3 result to reproduce

Attempt 3 passed direct grouped HTTP and MCP routing, then blocked on one-slot latency. Six samples ranged from 5,933 to 6,238 ms. Every sample reported `first_request`, request ordinal 1, and module age under 7 ms. Candidate retrieval took 5,137 to 5,291 ms.

The rollback evidence records:

- matching expected and observed endpoint ID `2c6a5a63-f944-4b87-818a-59068b36936a`;
- endpoint status `removed`;
- shared candidate RPC status `removed`;
- `stable_function_mutated: false`.

Read-only production checks after rollback found stable `mcp-search` active at version 40, `mcp-search-grouped` absent, v3 present, v4 absent, migration record absent, npm `beta` at `0.4.19-beta.2`, and npm `latest` at `0.4.17`.

## Source repair

The repair has two bounded parts:

1. Recommendation already sends prepared search variants. The additive grouped route now sets `expandCandidateQueryVariants: false`, so the shared handler sends one candidate query group for each incoming logical query instead of expanding every prepared variant again. Direct search and the stable route keep their existing expansion behavior.
2. The undeployed v4 SQL now collects candidate IDs through the indexed catalog and public registry search documents plus the smaller private manifest scan. It calculates the same scores only for those candidate IDs. The old single `OR` across all three sources forced a scan-shaped plan.

The disposable PostgreSQL fixture proves v3 and v4 exact result parity, ordered provenance, library filtering, idempotent creation, and isolated rollback.

## Production-sized benchmark

The benchmark creates and drops v4 inside one transaction and leaves no v4 function or migration record. It uses the exact four one-slot recommendation queries and compares full v3 and v4 result rows.

Command:

```powershell
node scripts/verify-search-v2-shared-candidate-rpc-production-benchmark.mjs --expected-migration-hash f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6
```

Observed result on 2026-07-21:

- indexed v4 samples: 30.371 ms, 21.964 ms, 22.234 ms;
- indexed v4 p95: 30.371 ms;
- v3 samples: 1,000.473 ms, 988.625 ms, 992.930 ms;
- v3 p95: 1,000.473 ms;
- p95 speedup: 32.94 times;
- exact result parity: passed, 80 rows;
- v4 and migration record absent before and after: passed.

Reproduce this benchmark independently. Confirm its transaction drops v4 before commit and that a fresh read-only preflight still finds v4 and its migration record absent.

## Latency contract correction

The prior gate required reused-worker samples, but production supplied a new worker for every request. Packet revision 5 evaluates all actual routed samples against the unchanged limits:

- 1 slot p95 at or below 3,000 ms;
- 10 slots p95 at or below 10,000 ms;
- 20 slots p95 at or below 15,000 ms;
- one Japanese 20-slot case at or below 15,000 ms;
- hard timeout exactly 20,000 ms;
- zero timeouts.

Every sample still records worker state, request ordinal, module age, handler time, candidate time, and audit time. The fixture proves that an all-first-request cohort can pass, a mixed cohort is classified, and slow samples remain in blocked evidence.

## Bound packet

- Manifest: `docs/si-v2/search/reviews/search-v2-beta3-shared-grouped-release-manifest-2026-07-21.json`
- Manifest SHA-256: `e8eb2cd8e0295ea92f6f4d9adf85b09bdc2f53b37f8523fd6c7592b94b6cbffd`
- Source revision: `bca4f502f07f93a518da0601e85100bb4f90795d`
- Source tree: `481922e0ef4602461664db4ba0390b1de1059e10`
- Migration raw SHA-256: `f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6`
- Superseded manifest SHA-256: `1b4bf6193cf67c7b5a13d32e2d1b733ffac031024004058e1ae63c4045ce6e4f`

Authorized release mutations remain bounded to one additive grouped endpoint deployment, one v4 function creation, one matching migration-history insert, and exact-ID plus owner-checked rollback. Stable function deployments and npm publications remain zero.

Fresh production evidence paths use the `search-v2-beta3-indexed-*` prefix. Prior attempt evidence is preserved and cannot satisfy the new runner.

## Required audit commands

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash e8eb2cd8e0295ea92f6f4d9adf85b09bdc2f53b37f8523fd6c7592b94b6cbffd

node scripts/verify-search-v2-shared-candidate-rpc-production-benchmark.mjs --expected-migration-hash f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6

node scripts/manage-search-v2-shared-candidate-rpc.mjs --action preflight --project-ref kcjmkakdhsqplvasgkjv --expected-migration-hash f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-search-v2-beta3-grouped-release.ps1 -ExpectedManifest e8eb2cd8e0295ea92f6f4d9adf85b09bdc2f53b37f8523fd6c7592b94b6cbffd
```

The final command is a no-mutation dry run because it omits `-ExecuteApprovedGroupedRelease`.

## Audit checklist

1. Trace the prepared-query flag from `mcp-search-grouped/index.ts` to the candidate RPC payload and prove the maximum 40-query workload sends exactly 40 candidate groups.
2. Compare revised v4 with v3 at row level. Verify catalog and registry full-text matches use their existing indexed documents and private aliases remain covered.
3. Reproduce the 32.94 times benchmark result within its fail-closed limits: v4 p95 at most 500 ms, at least 3 times faster than v3, exact rows, and no persistent v4 state.
4. Verify the actual-routed p95 gate counts all samples and does not require worker reuse. Confirm slow samples stay in evidence before assertions run.
5. Rerun all rollback, dual-tar, database ownership, negative-path, and concurrent-lock fixtures.
6. Confirm packet revision 5 has fresh evidence paths and cannot overwrite attempt 3 evidence.
7. Confirm the stable function and npm are outside the mutation budget.
8. Confirm production remains unchanged before execution.

## Verdict boundary

A full GO authorizes only the guarded attempt 4 v4 database and `mcp-search-grouped` deployment. It does not authorize beta.3 packaging, npm staging, npm publication, stable function changes, or venue promotion.
