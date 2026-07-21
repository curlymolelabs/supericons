# Search v2 beta.3 indexed grouped release revision 7 audit request

Date: 2026-07-21

State: prepared for independent audit. No grouped endpoint, v4 database function, beta.3 package, or npm publication is present.

## Bound identity

- Pinned deployment source: `bca4f502f07f93a518da0601e85100bb4f90795d`
- Pinned source tree: `481922e0ef4602461664db4ba0390b1de1059e10`
- Resource-ownership repair: `9fb778411`
- Superseded revision 6 binding: `65d2dba79`
- Revision 7 nested-harness correction: `bafa2f52a`
- Manifest SHA-256: `920c06c47ea1204ca5034750945dfd4c72ac8d761d37114bfb9c77c9fcd46f8b`
- Migration SHA-256: `f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6`
- Stable route blob: `71e568f3014a3e07f7271801b4503080b7111ec7`

The manifest binds 37 source files and 16 packet files. The stable `mcp-search` route remains byte-identical to main and has zero authorized deployments or deletions.

## Revision 5 audit findings and corrections

### Shared release ownership

The writable production benchmark now acquires `search-v2-beta3-shared-grouped` before its first production state read and holds it through its final state read. A committed fixture pre-holds that lock and proves the benchmark exits before making any management API request.

The release runner, rollback simulator, benchmark, and lock fixtures pass the actual long-running caller PID into lock acquisition. Lock records use schema version 2. The lock manager can list locks and can clean up an abandoned lock only when all of these conditions hold:

1. The requested run ID exactly matches the recorded owner.
2. The lock uses schema version 2.
3. The actual owner PID is no longer alive.
4. The configured minimum age has elapsed.
5. The owner record remains byte-identical immediately before removal.

Cleanup refuses live owners. Older lock records with short-lived helper PIDs cannot use automated cleanup.

Release apply, release rollback, and the production benchmark also use the same PostgreSQL transaction advisory lock, `supericons:search-v2:shared-candidate-rpc-v4`. This extends mutual exclusion beyond local Git worktrees.

### Run-owned Docker verification

The migration smoke test requires a running Docker server and pulls `postgres:17-alpine` only when the image is absent. Every run uses a unique container name and a run-owner label, captures the exact 64-character container ID, and uses that ID for readiness, SQL, logs, and cleanup. Cleanup verifies the ID and owner label before deletion.

The readiness loop records container state and includes container logs if PostgreSQL exits or does not become ready within 60 seconds. A committed concurrency fixture runs two smoke tests simultaneously, proves their run IDs, names, and container IDs differ, and verifies that both run-owned containers are removed.

## Revision 6 integration failure

Revision 6 placed the new benchmark-lock and Docker-concurrency fixtures in the unconditional packet section. A rollback simulation starts a nested packet while its simulated release holds the release lock, so the nested benchmark-lock fixture correctly refused acquisition. The top-level packet failed before rollback evidence was created.

Revision 7 moves both new concurrency fixtures into the existing top-level-only safety section. Nested release simulations continue to run the non-recursive source, database, Docker smoke, routing, and error checks. After the failed revision 6 run, direct inspection found zero release locks, zero run-owned Docker containers, zero release processes, and no Git changes.

## Verified revision 7 results

### Full packet

Command:

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash 920c06c47ea1204ca5034750945dfd4c72ac8d761d37114bfb9c77c9fcd46f8b
```

Result: passed in 351.6 seconds with 37 source files, 16 packet files, all committed safety harnesses passed, stable route unchanged, and the bounded mutation budget intact.

### Production-sized benchmark

Command:

```powershell
node scripts/verify-search-v2-shared-candidate-rpc-production-benchmark.mjs --expected-migration-hash f22d209938aaafa685e4f1ab074b8e9d3802de503a91d9d3d24b2c05ef207ae6
```

Observed result:

- Indexed v4 samples: 106.564 ms, 22.313 ms, 22.119 ms
- Indexed v4 p95: 106.564 ms
- v3 samples: 1,436.069 ms, 998.299 ms, 1,000.642 ms
- v3 p95: 1,436.069 ms
- Speedup: 13.48 times
- Exact result parity: passed
- v4 and migration record absent before and after: passed
- Shared local release lock: acquired and released
- Database advisory lock: applied inside the benchmark transaction

### Authenticated no-mutation dry run

Command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-search-v2-beta3-grouped-release.ps1 -ExpectedManifest 920c06c47ea1204ca5034750945dfd4c72ac8d761d37114bfb9c77c9fcd46f8b
```

Result: `preflight_ok_no_mutation`. Read-only production state showed the grouped endpoint absent, v4 absent, its migration record absent, and stable `mcp-search` active at version 40. All authorized mutation counts were zero.

## Required independent checks

1. Reproduce the benchmark-lock fixture and confirm a pre-held release lock results in zero management API requests.
2. Verify the release runner and benchmark record their actual caller PIDs. Confirm stale cleanup refuses a live owner and cleans only an exact dead schema-version-2 owner.
3. Trace the database advisory lock through apply, rollback, and benchmark SQL.
4. Run the Docker concurrency fixture. Confirm unique names, exact-ID and label ownership, readiness diagnostics, and zero remaining owned containers.
5. Reproduce the full packet, production benchmark, preflight, and authenticated no-mutation dry run using the commands above.
6. Confirm the packet's top-level-only concurrency boundary prevents recursive lock tests without skipping non-recursive source or database checks.
7. Confirm production remains unchanged and that no release lock, workspace, container, or fresh release evidence remains.

## Verdict boundary

A full GO authorizes only the bounded attempt 4 deployment of the additive `mcp-search-grouped` endpoint and v4 shared candidate function. It does not authorize stable search changes, beta.3 packaging, npm staging, npm publication, or venue promotion.
