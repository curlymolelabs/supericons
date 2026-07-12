# SI Search Engine v2 implementation status

Last verified: 2026-07-12
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
| `P0` Governance and baseline | Fixed-suite size reached; multilingual language scoring and threshold decisions remain | Official specification version 1.3; sanitized July 11 baseline; 225-case evaluation suite; approved 28-case legacy review and 50-SI-brand classification records | Traceability audit passed; all 225 cases have stable IDs; 148 cases are owner-reviewed, 6 are contract fixtures, and 71 multilingual candidates await language scoring | Not applicable | Not applicable | Not applicable | `docs/si-v2/search/consolidation-traceability.md`; `docs/si-v2/search/reviews/legacy-evaluation-owner-review-2026-07-12.md`; `docs/si-v2/search/reviews/si-brand-classification-owner-review-2026-07-12.md`; `references/verification/search-v2-brand-activation-and-evaluation-target-2026-07-12.md`; `references/verification/search-query-baseline-2026-07-11.md` |
| `P1` Shared deterministic understanding | Approved deterministic scope is locally complete; release thresholds remain open | Search intent core, generated rules/graph, shared policy-aware query-frame modules, recommendation clarification, maintained ranking policy, ambiguity diversification, all 50 approved SI brand classifications, rejected-alias enforcement, final-fusion policy enforcement, and explicit strict/prefer/all search modes in local and hosted MCP code | All 50 explicit SI logo searches rank the expected identity first; 16 approved ambiguous SI records use concept sharing where useful families exist; all 17 rejected aliases use the shared penalty and do not rank the SI brand first | Earlier MCP package build was verified in the saved query-frame record; this brand activation was not packaged or published | Not deployed | Not observed live | `references/verification/search-v2-brand-activation-and-evaluation-target-2026-07-12.md`; `references/verification/search-v2-brand-and-runner-foundation-2026-07-12.md`; `references/verification/semantic-search-v2-query-frame-shadow-2026-07-01.md`; `references/verification/search-library-modes-2026-07-12.md`; `references/verification/search-query-frame-clarification-2026-07-12.md` |
| `P2` Search projection | Partially implemented | Five-type semantic document generator, 75,560-document local output, additive `icon_search_semantic_documents` migration draft | Document determinism, registry compatibility, public safety, and 28-query seed passed July 1 | Not applicable | Not verified; saved record says migration was not deployed | Not verified | `references/verification/semantic-search-v2-phase-0-1-2026-07-01.md`; `supabase/migrations/20260701_semantic_search_v2_documents.sql` |
| `P3` Offline embeddings | Planning foundation implemented; provider execution and storage not started | Provider-neutral candidate config, pure work-plan module, and no-network `plan` and `dry-run` CLI modes; no embedding generation/sync adapter or storage migration | Full plan and one-candidate dry run passed for 75,810 English documents; deterministic fingerprint, dimensions, selection, batches, and fail-closed modes verified; no provider API or vector behavior tested | Not applicable | Not verified | Not verified | `docs/si-v2/search/experiments/offline-embedding-runner-contract-2026-07-12.md`; `references/verification/search-v2-brand-and-runner-foundation-2026-07-12.md`; `docs/si-v2/search/experiments/offline-embedding-contract-2026-07-12.md`; `docs/si-v2/search/experiments/embedding-candidate-shortlist-2026-07-12.md` |
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
- `data/search-intent-graph/ranking-policy.json`
- `lib/search-ranking-policy.js`
- `mcp/runtime/search-ranking-policy.js`
- `scripts/build-search-ranking-policy.mjs`
- `scripts/verify-search-ranking-policy.mjs`
- `scripts/verify-search-library-modes.mjs`
- `scripts/verify-recommend-icons-clarification.mjs`
- `scripts/verify-search-brand-classification-review.mjs`

### Offline embedding planning

- `data/semantic-search-v2/embedding-candidates.json`
- `lib/search-v2-embedding-plan.js`
- `scripts/search-v2-embedding-runner.mjs`
- `scripts/verify-search-v2-embedding-runner.mjs`
- `docs/si-v2/search/experiments/offline-embedding-runner-contract-2026-07-12.md`

### Opt-in query-frame surfaces

- `supabase/functions/_shared/search-engine/handle-search-request.ts`
- `lib/search-engine-client.js`
- `mcp/hosted-search-client.js`
- `mcp/index.js`
- `mcp/remote-server.js`
- `mcp/recommend-icons.js`

Query-frame diagnostics remain opt-in. Public recommendation responses can now carry `needs_clarification`, `clarification_slots`, and labeled interpretation options without exposing internal scores. The additive library-mode contract defaults to strict, preserving existing library-filter selection behavior when callers omit the new input.

### Search projection

- `data/semantic-search-v2/evaluation-set.json`
- `lib/semantic-search-documents.js`
- `scripts/build-semantic-search-documents.mjs`
- `scripts/verify-semantic-search-v2.mjs`
- `supabase/migrations/20260701_semantic_search_v2_documents.sql`
- `output/semantic-search-v2/semantic-documents.json`

Saved July 1 verification reports 28 evaluation queries, 75,560 documents, five document types, 11 libraries, and 41 skipped unresolved or duplicate-resolved registry rows.

The fixed candidate suite now contains 225 stable-ID cases. It includes 148 owner-reviewed cases, 6 contract fixtures, and 71 multilingual candidates awaiting language scoring. The multilingual tier covers CJK, Spanish, Brazilian Portuguese, German, Arabic, Hindi, Thai, Vietnamese, and mixed-script brand-plus-concept queries. Current in-memory verification generated 75,810 English documents from the current workspace inputs and did not replace the saved July 1 output artifact.

The legacy review approved 19 cases as written, adjusted 6 expectations, and replaced 3 translated placeholders with native-language fixtures. Low-level deterministic observation currently returns zero results for all four localized legacy queries, which remains an explicit multilingual retrieval gap rather than a reason to weaken the fixtures.

## Roadmap position

| phase | plain-language position |
| --- | --- |
| `P0` | The 225-case fixed-suite size is reached. Language scoring for 71 multilingual candidates and threshold decisions remain. |
| `P1` | The approved deterministic behavior and bounded 50-brand policy are locally tested. Nothing from this batch is deployed. |
| `P2` | Semantic document generation and a migration draft exist, but current input drift and deployment remain unresolved. |
| `P3` | Plan and dry-run foundations exist. Provider calls, embedding storage, sample execution, and rollback execution are not implemented. |
| `P4` | Vector retrieval, shadow comparison, and hybrid fusion are not implemented. |
| `P5` | MCP hybrid beta is not implemented or published. |
| `P6` | Web hybrid beta is not implemented or deployed. |
| `P7` | Review and admin foundations exist, but the full measured learning loop is not verified. |

This is past initial planning and deterministic foundation work, but it is not halfway to a shipped v2. The largest delivery path, `P3` through `P6`, remains ahead.

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

Complete the remaining evaluation and measurement gates before enabling semantic ranking:

1. Score the 71 multilingual candidates, including native phrasing and dictionary checks for the CJK tier.
2. Decide whether the Google comparison keeps `gemini-embedding-001` or moves to the newer `gemini-embedding-2` before any provider call.
3. Define the downstream acceptance event, confidence thresholds, and per-locale regression limit.
4. Keep provider calls, paid execution, and baseline capture blocked until those gates pass.

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
