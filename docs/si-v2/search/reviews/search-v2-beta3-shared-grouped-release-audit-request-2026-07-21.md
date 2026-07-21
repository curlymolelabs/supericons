# Search v2 beta.3 grouped release revision 10 audit request

Date: 2026-07-21

Requested verdict: independent GO or findings for guarded deployment attempt 5. Do not deploy, merge, version, stage, or publish during this audit.

## Why revision 10 exists

Guarded attempt 4 deployed the additive v4 candidate RPC and `mcp-search-grouped` endpoint. Live routing passed, but the one-slot end-to-end samples were 3,693 ms, 3,064 ms, and 2,527 ms. The nearest-rank p95 was 3,693 ms against the unchanged 3,000 ms gate. Exact-ID and owner-checked rollback removed only the endpoint and database objects created by that run. Stable `mcp-search` was not changed.

The endpoint handler itself used 648.680 to 1,185.947 ms. Candidate search used 117.910 to 254.668 ms. The remaining controllable cost was the grouped response and its final hydration work.

A first proposal reduced each query variant from 10 candidates to 5 for a single requested choice. A production-data comparison rejected that proposal before deployment because candidate depths 5 through 8 changed the selected home icon. Revision 10 restores the original candidate pool.

The replacement fix changes transport only:

- Grouped `recommend_icons` requests set `candidate_only: true`.
- The shared endpoint preserves the original candidates, ranking, and public semantic profile.
- It omits final SVGs and ranking diagnostics that the MCP package does not use.
- It skips final catalog SVG and Material SVG reads.
- The MCP package restores non-Material SVGs from its pinned local icon index.
- Material SVG resolution continues through the existing bundled Material path.
- Stable search, direct `search_icons`, rate accounting, audit rows, and latency limits are unchanged.

## Complete commit chain since revision 8

1. `9192e872e` binds the independently approved revision 8 packet.
2. `db6c3813a` records the revision 8 audit handoff.
3. `194dfaf2e` implements the candidate-count proposal later rejected by production-data quality comparison.
4. `ff44f933e` preserves attempt 4 evidence and prepares fresh attempt 5 evidence paths.
5. `0dec9650f` binds the now-superseded revision 9 packet.
6. `03b0145f2` aligns the rollback simulator with the fresh attempt 5 evidence paths.
7. `6b9d04544371ce13bffafbb5441796dfbdb46b8c` restores the original candidate pool and implements candidate-only SVG transport with local hydration.
8. `6228fe3aa` binds packet revision 10.
9. The current documentation commit refreshes this audit request only.

## Exact packet identity

- Manifest: `docs/si-v2/search/reviews/search-v2-beta3-shared-grouped-release-manifest-2026-07-21.json`
- Manifest SHA-256: `700fcf3cd826ed5b91613eb4f59f194a8f2ca109ca0c62825fc72a5db2fb3edf`
- Packet revision: 10
- Deployment source revision: `6b9d04544371ce13bffafbb5441796dfbdb46b8c`
- Source tree: `675991f22eda3bcd035a0577d9118872c8fa2b2f`
- Stable route blob: `71e568f3014a3e07f7271801b4503080b7111ec7`
- Superseded revision 9 manifest: `6f211efd352abb242194c58a641e451c9ded80c5d0549c7fa4eccd5e2b335e6f`
- Source files: 39
- Packet files: 18

## Authorized mutation budget

The guarded runner authorizes:

- One additive `mcp-search-grouped` deployment.
- One conditional deletion after an exact function-ID match.
- One additive `si_search_icon_candidates_v4(jsonb,text,integer)` creation.
- One matching migration-history insert.
- One conditional database rollback after fingerprint and run-owner checks.
- Zero stable `mcp-search` deployments or deletions.
- Zero npm publications.

## Required independent checks

### 1. Attempt 4 evidence and current production state

- Confirm the attempt 4 endpoint ID was `47aab266-72f2-4e92-9c81-8cfee14a7ed1` and exact rollback removed it.
- Confirm v4 and its matching migration record were removed.
- Confirm stable `mcp-search` remains ID `ce1f7353-c5e7-4c8c-aeac-75d1f4df5a43`, version 40, active, and keyless.
- Confirm the grouped endpoint and v4 are absent before any new mutation.
- Confirm npm remains `beta` 0.4.19-beta.2 and `latest` 0.4.17.

### 2. Source and packet identity

- Recompute the manifest and every listed source and packet hash.
- Confirm source revision and source tree.
- Confirm the stable route blob equals `main`.
- Confirm no listed source file changed after `6b9d04544371ce13bffafbb5441796dfbdb46b8c`.

### 3. Candidate pool and quality preservation

- Confirm both grouped and individual recommendation paths use `Math.max(limitPerSlot * 5, 10)`.
- Confirm the rejected bounded-limit helper is absent.
- Reproduce English and Japanese 20-slot checks, repeated-slot deduplication, and grouped-versus-individual recommendation parity.
- Reproduce the 225-case fingerprint `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777` with clean fingerprint inputs.

### 4. Candidate-only transport

- Trace `recommend_icons` routing to the body-level `candidate_only: true` field.
- Confirm the field is part of the shared search contract and cannot vary silently between logical queries.
- Confirm candidate-only mode preserves ranked icon identity and the public semantic profile.
- Confirm it performs zero final SVG reads, one shared public semantic read, and omits SVG plus unused ranking diagnostics from the response.
- Confirm the fixture response shrinks from 14,357 to 4,641 JSON characters while preserving four logical results.
- Confirm ordinary full responses retain their prior SVG and semantic behavior.

### 5. Local SVG restoration

- Trace candidate rows through `createHostedIconHydrator` and all `buildHostedIcon` call sites.
- Confirm hosted SVGs remain preferred when present.
- Confirm outline and solid local SVGs resolve by exact library, ID, and style.
- Confirm the semantic profile survives hydration.
- Confirm Material rows without SVG remain eligible for bundled Material resolution.
- Confirm an unknown non-Material row without SVG is rejected instead of returning an unusable icon.
- Confirm `hosted-candidate-hydration.js` is included in the npm file list.

### 6. Release safety

- Rerun negative paths, four rollback scenarios, cross-worktree locks, abandoned-owner handling, Docker concurrency, production benchmark policy, and database ownership checks.
- Confirm the release runner uses the fresh attempt 5 evidence paths.
- Confirm no test can change real release evidence.
- Confirm stable-function mutations and npm publications remain zero in every simulation.

### 7. Live gate policy

- Confirm one-slot p95 remains at most 3,000 ms.
- Confirm 10-slot and 20-slot p95 limits remain 10,000 ms and 15,000 ms.
- Confirm the request timeout remains exactly 20,000 ms and zero timeouts are allowed.
- Confirm all actual routed samples count, worker classification remains diagnostic, and failed samples are written before assertions.
- Confirm query variants, candidate rows, final results, and response size are retained in live evidence.

## Reproduction commands

Run from the branch worktree:

```powershell
node scripts/verify-search-v2-beta3-grouped-packet.mjs --manifest-hash 700fcf3cd826ed5b91613eb4f59f194a8f2ca109ca0c62825fc72a5db2fb3edf
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-search-v2-beta3-grouped-release.ps1 -ExpectedManifest 700fcf3cd826ed5b91613eb4f59f194a8f2ca109ca0c62825fc72a5db2fb3edf
```

The second command omits `-ExecuteApprovedGroupedRelease`, so it is a no-mutation production preflight.

Focused commands:

```powershell
deno run --allow-read --allow-env scripts/verify-search-v2-shared-recommendation-pipeline.ts
node scripts/verify-hosted-candidate-hydration.mjs
node scripts/verify-hosted-search-grouped-client.mjs
node scripts/verify-recommend-icons-grouped-search.mjs
node scripts/verify-search-v2-phase1-parity.mjs
```

## Executor results to reproduce

- Full packet passed in 349.2 seconds with all committed safety harnesses.
- Authenticated production dry run returned `preflight_ok_no_mutation` in 75.4 seconds.
- Dry run found the grouped endpoint absent, v4 absent, its migration record absent, and stable search at version 40.
- Candidate-only fixture preserved ranked identity and semantics, performed zero final SVG reads, and retained one shared public semantic read.
- Candidate-only fixture response was 4,641 characters versus 14,357 for the full SVG-heavy response.
- Local hydration restored outline and solid SVGs, preserved hosted semantics, deferred Material hydration, and rejected an unknown non-Material row without SVG.
- The full 225-case fingerprint remained `3e529b41a8eb1d175f20c9da51788fea7e101a0eb51795e305ccdb5641729777` with clean inputs.
- No production deployment, database mutation, stable change, npm staging, or npm publication occurred while preparing revision 10.

## Release rule after audit

A full independent GO authorizes only guarded deployment attempt 5 for the additive v4 database function and `mcp-search-grouped` endpoint under manifest `700fcf3c...`. The unchanged live gate must pass or exact rollback must run automatically. Beta.3 packaging and npm publication remain separate later gates.
