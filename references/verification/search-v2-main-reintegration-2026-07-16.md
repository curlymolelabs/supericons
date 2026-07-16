# Search v2 main reintegration verification

Date: 2026-07-16

Status: Locally verified and ready for approval. No deployment, database mutation, npm publication, or model-provider call was performed.

## Scope

This record covers the reintegration of the reviewed Search v2 and Material branch with the ten commits that reached `main` after the first integration review.

Pinned inputs and commits:

- Earlier reviewed integration: `7c0880d68c702900cb0aa19f25f00262ac98f823`
- Current main input: `5c5faef9af38c23ce5997e84b51c19d88c9283a8`
- Main merge commit on the integration branch: `3ae9f5eae6dd9752ce552f51de54e7274697cbb8`
- Worktree-policy input: `306ac9e83fc44a2e6759fa0ed24876ec7edb16eb`
- Worktree-policy merge commit: `368560bffb2c4fc0de610834e8ddba6775d2a6db`
- Expressive-fallback behavior commit: `d8e80fb2bcbbd4302863c45f75f5ea95e639dfcb`
- Speed-family retrieval correction: `725bad00a83cd0dfeb598b4c0200b32cc9beed92`
- Integration branch: `codex/search-v2-material-integration-20260716`

The merge was performed and verified on the integration branch. Main was not changed.

## Safety and overlap checks

The complete state of each of the ten new main commits was scanned before integration for high-confidence credential values and sensitive local paths. No credential value or sensitive path was found.

Eleven files were changed by both the earlier integration and the new main range:

- one registry source file, `supericons-concepts.json`
- three generated registry previews
- one generated registry summary
- two icon indexes
- four public or packaged registry outputs

The merged source preserves the new taxonomy icons and the public-safe `prompt bypass attempt` wording. Generated outputs were rebuilt from the merged source rather than resolved by choosing one branch's generated file. Registry verification reports 106 SI icons and 21,427 total icons in both public indexes.

## Search behavior change

The newly committed `si:person-launched` record is approved for speed and momentum meanings and is also marked as meme, humor, and trending-culture content. The owner confirmed that it should remain visible for broad `swift` searches, but below conventional speed symbols and Swift identities.

Version 1.8 and decision `D-024` add a general expressive-fallback rule:

- approved expressive metadata comes from maintained policy data
- a broad related match receives a fixed fallback penalty
- conventional symbols and approved identities rank first
- the expressive icon remains eligible
- a direct name or approved-synonym query removes the fallback penalty
- ranking code contains no `swift`-specific exception

The local and hosted ranking helpers use the same policy. The hosted reranker retains the internal penalty through final candidate fusion without adding it to the public result fields.

The reviewed `swift` top eight are now:

1. `material:speed`
2. `iconoir:fast-arrow-down`
3. `material:auto_awesome_motion`
4. `iconoir:fast-arrow-down-square`
5. `iconoir:apple-swift`
6. `tabler:brand-swift`
7. `simpleicons:swift`
8. `si:person-launched`

Direct searches remain strong: `person launched` and `takeoff` rank `si:person-launched` first, while `yeet` keeps it in the top three.

The speed family now uses `fast arrow` rather than the overly broad `fast` retrieval phrase. This prevents the word fragment in `breakfast` from entering the `swift` and `bolt` result sets while keeping real fast-arrow symbols. The fixed suite records `material:breakfast_dining` as prohibited for both cases. No query-specific ranking branch or icon-specific exclusion was added.

## Fingerprint reconciliation

The clean 225-case fingerprint is now:

`ef2934097555867d1695e9861f35c346132f6c33ec9899c602635ce12aba76c8`

The clean run reports `fingerprint_inputs_clean: true` and no dirty fingerprint inputs.

An exact case-by-case comparison against the earlier reviewed integration found three changed cases and 222 unchanged cases.

### `brand-gate-swift`

The earlier catalog did not contain `si:person-launched`. The reintegrated catalog adds it as a reviewed related result. The generic expressive-fallback rule places it at rank 8, after conventional speed results and three Swift identities.

The maintained speed retrieval phrase also removes `material:breakfast_dining`, which previously entered through the `fast` word fragment. `iconoir:fast-arrow-down-square` takes the vacated conventional-result position.

### `si-brand-logo-factory-ai`

The reintegrated catalog adds `si:robot-arm` at rank 2. Exact `si:factory-ai` remains rank 1, and the remaining results continue to cover factory concepts. This is an expected result of the newly committed icon data, not a ranking-code exception.

### `si-brand-concept-bolt`

The maintained speed retrieval phrase removes `material:breakfast_dining` from the ambiguous `bolt` result set. `iconoir:fast-arrow-down` replaces it, while lightning, electrical-power, and speed interpretations remain present.

No other fixed-suite case changed.

## Verification results

The following checks passed on the reintegrated tree:

- 225-case semantic suite with 219 owner-reviewed cases and 6 contract fixtures
- clean deterministic fingerprint and case-level comparison
- ranking policy, expressive ordering, direct expressive queries, brand gating, and interpretation diversity
- strict, prefer, and all library modes
- recommendation clarification, grouped search, and shared-pipeline result parity
- query-frame shadow and deterministic default-path checks, with zero external model-provider calls
- hosted engine, deterministic ties, full HTTP byte parity, result hydration, grouped request, stage timing, and batched retrieval
- Material contract, 8,524-asset bundle, serving, Railway hydration, package inventory, clean install, hosted authorization, and capability truth
- registry projections and source-boundary checks
- MCP package public-safety scan
- Deno checks for the snapshot, stable MCP search, beta search, and web search functions
- usage-event deduplication and incident-concurrency analysis
- disposable PostgreSQL 17 checks for the Material assets, batched candidates, and shared recommendation migrations, with `hosted_systems_touched: false`
- changed-file whitespace and U+2013/U+2014 punctuation scans

The fingerprint cleanliness check now includes the maintained ranking-policy source and both generated runtime copies. This closes a verification gap where a generated policy edit could affect the fingerprint without appearing in the dirty-input report.

Two stale verifier expectations were corrected:

1. The deterministic-default verifier now accepts specification version 1.8 or newer and requires `FR-39` and `D-024`.
2. The hosted-registry fixture now expects the public label `server stack`, which the registry builder has included in normalized synonyms since 2026-07-01.

One disposable PostgreSQL startup failed while multiple Docker-heavy groups ran concurrently. The same batched-candidate smoke test passed when rerun alone, followed by the shared-recommendation migration smoke. This was local test-environment contention, not a SQL or product failure.

The old tool-scoped package verifier was not treated as a current integration gate because it intentionally requires `0.4.18-beta.0`. The source package is correctly still stable `0.4.18`. The separate tool-routing contract passed, and the package verifier must be updated and run when the fresh beta version is cut.

## Remaining release gates

- Independent approval of this narrow reintegration record
- Fast-forward main to the approved integration state
- Resolve or explicitly accept the inherited `hono` and `qs` advisories before publication or production code deployment
- Recut the search-only beta with a new version, manifest fingerprint, Material checks, concurrency limits, usage-dedupe checks, and cold-request reporting
- Keep `recommend_icons` on the stable endpoint until its corrected hosted workload passes its separate latency gate

The scheduled maintenance monitor remains a beta-launch task. It is not part of this integration and will stay outside the live request path.
