# SI Search Engine v2 implementation status

Last verified: 2026-07-11
Authority: evidence ledger only; intended behavior lives in [`search-engine-v2.md`](search-engine-v2.md)

## Lifecycle definitions

| state | meaning |
| --- | --- |
| Implemented | The artifact exists in the current workspace and was inspected. |
| Locally verified | A named current-turn or saved verification directly exercised the artifact. |
| Packaged | A distributable/package build containing the artifact was verified. This does not mean published. |
| Deployed | A named deployment record proves the target environment received the change. |
| Observed live | A production check proves the deployed behavior is reachable and behaving as claimed. |

`Implemented`, `locally verified`, `packaged`, `deployed`, and `observed live` are independent. Blank or `Not verified` never means false; it means this ledger has no controlling evidence.

## Phase ledger

| phase | current state | implemented | locally verified | packaged | deployed | observed live | controlling evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `P0` Governance and baseline | In progress; traceability corrected, independently audited, and re-frozen; evaluation expansion open | Official documentation set; sanitized July 11 baseline; 28-query semantic evaluation seed | Structural traceability coverage, local links, artifact paths, semantic output counts, source checksum, and prohibited-metadata scan passed; destination meanings corrected July 11 and passed the independent semantic audit recorded in the traceability file; existing 28-query seed verified July 1 | Not applicable | Not applicable | Not applicable | `docs/si-v2/search/consolidation-traceability.md`; `references/verification/search-query-baseline-2026-07-11.md`; `references/verification/semantic-search-v2-phase-0-1-2026-07-01.md` |
| `P1` Shared deterministic understanding | Partially implemented | Search intent core, generated rules/graph, shared query-frame modules, opt-in `include_query_frame`, recommendation query-frame hooks | Intent graph, query-frame shadow, semantic smoke, hosted search, CJK, and package checks passed in saved July 1 verification | MCP package build was verified in the saved query-frame record; no publication proved | Not verified; saved record says no Supabase/Netlify deploy | Not verified | `references/verification/semantic-search-v2-intent-graph-phase-1-2026-07-01.md`; `references/verification/semantic-search-v2-query-frame-shadow-2026-07-01.md` |
| `P2` Search projection | Partially implemented | Five-type semantic document generator, 75,560-document local output, additive `icon_search_semantic_documents` migration draft | Document determinism, registry compatibility, public safety, and 28-query seed passed July 1 | Not applicable | Not verified; saved record says migration was not deployed | Not verified | `references/verification/semantic-search-v2-phase-0-1-2026-07-01.md`; `supabase/migrations/20260701_semantic_search_v2_documents.sql` |
| `P3` Offline embeddings | Not implemented | No embedding generation/sync artifact or embedding storage migration was verified | Not verified | Not applicable | Not verified | Not verified | Repository inventory on 2026-07-11; canonical requirement only |
| `P4` Shadow retrieval and fusion | Not implemented | Query-frame diagnostics exist, but no vector retrieval/fusion path was verified | Not verified | Not applicable | Not verified | Not verified | Query-frame shadow verification explicitly leaves default ranking unchanged |
| `P5` MCP-first hybrid beta | Not implemented | Existing MCP search/recommendation surfaces and preview support exist; hybrid vector ranking does not | Existing non-hybrid MCP/package checks exist; beta gates not run | Current package build history exists; v2 hybrid package not verified | Not verified | Not verified | `references/verification/semantic-search-v2-query-frame-shadow-2026-07-01.md`; canonical beta gates |
| `P6` Web hybrid beta | Not implemented | Existing web/hosted deterministic search exists; hybrid vector ranking does not | Existing hosted search checks exist; web beta gates not run | Not applicable | Not verified | Not verified | `references/verification/semantic-search-v2-phase-0-1-2026-07-01.md`; canonical beta gates |
| `P7` Reviewed learning loop | Foundation only | Existing query review fields/admin intelligence and gap-planning artifacts exist; the canonical taste-gated record/graph/Icons Lab loop is not verified | Admin query workbench verification exists separately; end-to-end v2 learning gate not run | Not applicable | Deployment state not verified | Not verified | `docs/supericons-admin-query-intelligence-workbench-plan-2026-06-12.md`; canonical `P7` gate |

## Verified workspace artifacts

### Query understanding and deterministic intent

- `lib/search-intent-core.js`
- `mcp/runtime/search-intent-core.js`
- `lib/search-query-frame.js`
- `mcp/runtime/search-query-frame.js`
- `data/search-intent-graph/intent-groups.json`
- `data/search-intent-graph/intent-fixtures.json`
- `lib/generated-search-intent-graph.js`
- `mcp/runtime/generated-search-intent-graph.js`
- `scripts/build-search-intent-graph.mjs`
- `scripts/verify-search-intent-graph.mjs`
- `scripts/verify-search-query-frame-shadow.mjs`

### Opt-in query-frame surfaces

- `supabase/functions/_shared/search-engine/handle-search-request.ts`
- `lib/search-engine-client.js`
- `mcp/hosted-search-client.js`
- `mcp/index.js`
- `mcp/remote-server.js`
- `mcp/recommend-icons.js`

Saved evidence states that default ranking and the default public response remain unchanged unless `include_query_frame` is requested.

### Search projection

- `data/semantic-search-v2/evaluation-set.json`
- `lib/semantic-search-documents.js`
- `scripts/build-semantic-search-documents.mjs`
- `scripts/verify-semantic-search-v2.mjs`
- `supabase/migrations/20260701_semantic_search_v2_documents.sql`
- `output/semantic-search-v2/semantic-documents.json`

Saved July 1 verification reports 28 evaluation queries, 75,560 documents, five document types, 11 libraries, and 41 skipped unresolved or duplicate-resolved registry rows.

### Current query evidence

- `references/verification/search-query-baseline-2026-07-11.md` is the public-safe controlling snapshot.
- The raw admin export remains private and is identified by checksum in that verification record.
- `output/search-zero-results-analysis-2026-07-11/analysis.sql` contains the aggregate calculations used to validate the snapshot.

## Deployment and publication state

The saved July 1 verification records explicitly report:

- no Netlify deployment;
- no Supabase deployment or catalog sync for the query-frame/semantic-v2 slices; and
- no npm publication.

This ledger does not infer current production deployment from file presence, package metadata, or a later version string. A current environment check is required before marking any v2 behavior deployed or observed live.

## Immediate next gate

Complete `P0` and the remaining `P1` contract work before enabling semantic ranking:

1. Expand the fixed evaluation suite toward the approved stratified target.
2. Define the downstream acceptance event and confidence thresholds.
3. Add library-mode fixtures and preserve backward-compatible strict behavior.
4. Add the reviewed July 11 regression seeds.
5. Verify shared query-frame behavior for `search_icons` and `recommend_icons` without changing public ranking.

Offline `P3` embedding implementation may proceed in parallel after its model/version/rollback contract is specified, but `P4` cannot exit before these gates pass.

## Updating this ledger

Every status update must include:

- phase and artifact;
- lifecycle state changed;
- exact verification or deployment evidence;
- date and environment;
- residual limitation; and
- rollback evidence when deployment is involved.

Do not mark a phase complete because files exist, tests were planned, or a package version changed.
