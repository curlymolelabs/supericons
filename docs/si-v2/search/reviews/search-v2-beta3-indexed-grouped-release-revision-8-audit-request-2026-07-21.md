# Search v2 beta.3 indexed grouped release revision 8 audit request

Date: 2026-07-21

State: prepared for independent audit. No grouped endpoint, v4 database function, beta.3 package, or npm publication is present.

## Bound identity

- Pinned deployment source: `bca4f502f07f93a518da0601e85100bb4f90795d`
- Pinned source tree: `481922e0ef4602461664db4ba0390b1de1059e10`
- Benchmark cohort correction: `8fb1add9d`
- Revision 8 manifest binding: `9192e872e`
- Manifest SHA-256: `33c5127de87ea08bb59f43c0da36bda1a7db4cb27f19228cf9ba90015c119a50`
- Migration SHA-256: `f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6`
- Stable route blob: `71e568f3014a3e07f7271801b4503080b7111ec7`

The manifest binds 37 source files and 18 packet files. Deployment source is unchanged from revision 7. Stable `mcp-search` remains byte-identical to main and has zero authorized deployments or deletions.

## Revision 7 finding

An independent revision 7 benchmark observed an indexed v4 first run at 1,349.7 ms, followed immediately by a 31.51 ms repeat. The three-sample benchmark treated the slowest of three values as p95 and asserted a packet-level 500 ms limit before printing its structured samples. The accepted D-031 and FR-47 contract does not define a 500 ms database first-call limit. It defines actual routed end-to-end p95 of at most 3,000 ms for one slot, with all live samples counted.

Revision 8 corrects the measurement contract without changing SQL, the endpoint, or any user-facing latency threshold.

## Corrected benchmark contract

Each implementation now receives 21 samples in one transaction:

1. One separately recorded first call after function creation.
2. Twenty warm follow-up samples.

The production microbenchmark has two hard gates:

- Indexed v4 20-sample warm p95 at or below 500 ms.
- Indexed v4 warm p95 at least 3 times faster than the v3 warm p95.

The first call is never removed or reclassified as warm. It is printed with all other samples and remains governed by the unchanged actual routed end-to-end one-slot p95 limit of 3,000 ms in the guarded live deployment gate.

The benchmark constructs and prints its complete structured summary before threshold assertions. A failed warm latency or speedup gate therefore preserves every v4 and v3 sample, cohort classification, observed threshold, production-state result, and ownership identifier.

## Regression protection

`scripts/verify-search-v2-shared-candidate-rpc-benchmark-policy.mjs` proves:

- A 1,349.7 ms first call is preserved separately from 20 healthy warm samples.
- A warm regression to 700 ms blocks.
- A speedup of only 1.25 times blocks.
- A blocked summary is emitted before the assertion.
- The first-call release gate remains the actual routed end-to-end 3,000 ms contract.

The full packet runs this fixture in top-level and nested verification paths.

## Verified revision 8 results

### Full packet

Command:

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash 33c5127de87ea08bb59f43c0da36bda1a7db4cb27f19228cf9ba90015c119a50
```

Result: passed in 382.5 seconds with 37 source files, 18 packet files, all committed safety harnesses passed, stable route unchanged, and the bounded mutation budget intact.

### Production-sized benchmark

Command:

```powershell
node scripts/verify-search-v2-shared-candidate-rpc-production-benchmark.mjs --expected-migration-hash f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6
```

Observed result:

- Indexed v4 first call: 1,867.333 ms
- Indexed v4 warm p95 across 20 samples: 23.666 ms
- Indexed v4 warm maximum: 24.133 ms
- v3 first call: 1,397.384 ms
- v3 warm p95 across 20 samples: 1,007.833 ms
- Warm speedup: 42.59 times
- Exact result parity: passed
- v4 and migration record absent before and after: passed
- Shared local release lock and database transaction advisory lock: passed

The 1,867.333 ms first call is intentionally included here. It is not used to present a flattering warm number as first-call behavior. The guarded deployment must still pass the actual routed one-slot p95 limit of 3,000 ms or roll back.

### Authenticated no-mutation dry run

Command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-search-v2-beta3-grouped-release.ps1 -ExpectedManifest 33c5127de87ea08bb59f43c0da36bda1a7db4cb27f19228cf9ba90015c119a50
```

Result: `preflight_ok_no_mutation`. Read-only production state showed the grouped endpoint absent, v4 absent, its migration record absent, and stable `mcp-search` active at version 40. All authorized mutation counts were zero.

## Required independent checks

1. Verify the 21-sample SQL loop and exact first-call versus 20-sample warm split.
2. Run the deterministic policy fixture and confirm failed summaries precede assertions.
3. Confirm warm p95 at most 500 ms and warm speedup at least 3 times remain hard microbenchmark gates.
4. Confirm the first call is preserved and the authoritative D-031 and FR-47 end-to-end one-slot limit remains 3,000 ms with all live samples counted.
5. Reproduce the full packet, production benchmark, authenticated dry run, and final production-state checks.
6. Confirm revision 8 changes no deployment source, stable route, npm artifact, database migration, or endpoint behavior.
7. Confirm zero release locks, workspaces, owned Docker containers, fresh release evidence, and Git changes remain after verification.

## Verdict boundary

A full GO authorizes only the bounded attempt 4 deployment of the additive `mcp-search-grouped` endpoint and v4 shared candidate function. The live deployment must pass the unchanged actual routed end-to-end gates or roll back automatically. This audit does not authorize stable search changes, beta.3 packaging, npm staging, npm publication, or venue promotion.
