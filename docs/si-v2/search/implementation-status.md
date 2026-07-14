# SI Search Engine v2 implementation status

Last verified: 2026-07-14
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
| `P0` Governance and baseline | Complete for the approved fixed-suite scope | Official specification version 1.6; sanitized July 11 baseline; 225-case evaluation suite; approved legacy, SI-brand, and multilingual meaning reviews; deterministic-first decisions `D-021` and `D-022` | Traceability audit passed; all 225 cases have stable IDs; 219 cases are owner-reviewed and 6 are contract fixtures; revoked provider authorization fails closed before execution | Not applicable | Not applicable | Not applicable | `docs/si-v2/search/consolidation-traceability.md`; `docs/si-v2/search/reviews/multilingual-evaluation-owner-review-2026-07-12.md`; `references/verification/search-v2-deterministic-first-pivot-2026-07-12.md`; `references/verification/search-query-baseline-2026-07-11.md` |
| `P1` Shared deterministic understanding | Round-trip treatment was measured live; publication is blocked by recommendation latency and a workload mismatch | Search intent core, generated rules/graph, shared policy-aware query-frame modules, recommendation clarification, maintained ranking policy, ambiguity diversification, all 50 approved SI brand classifications, rejected-alias enforcement, final-fusion policy enforcement, strict/prefer/all modes, additive audit contract, safe stage timing with worker request order, additive SVG-free candidate RPCs, one-call ordered candidate retrieval, grouped recommendation search, logical-query rate-limit accounting, synchronous grouped audit writes, final-result SVG hydration, deterministic final tie-break, distinct family retrieval, isolated control/treatment endpoints, guarded SQL runners, and rollback plans | Clean parent and implementation worktrees both produce fingerprint `e610fce3...`; disposable PostgreSQL and live parity passed. The live treatment passed direct search at 1,647.287 ms p95 and localized search at 1,549.441 ms p95, but recommendation failed at 16,868.760 ms p95. The recommendation phase used eight query variants instead of the intended four. Stage logs were unavailable because the read-only Management API returned HTTP 403. | The changed `@supericons/mcp` 0.4.18-beta.0 package dry-run contains 38 expected files; not published | Migrations `20260712`, `20260713150000`, and `20260714120000` are deployed. Both isolated round-trip endpoints were deleted after measurement. Production functions remain unchanged. | Live parity passed with zero request errors. Treatment direct and localized search passed their limits. Treatment recommendation improved but remained 5.62 times its limit, under an eight-variant workload that does not satisfy the intended four-variant contract. | `references/verification/search-v2-roundtrip-latency-execution-2026-07-14.md`; `references/verification/search-v2-roundtrip-latency-summary-2026-07-14.json`; `references/verification/search-v2-roundtrip-reduction-local-2026-07-14.md` |
| `P2` Search projection | Partially implemented | Five-type semantic document generator, 75,560-document local output, additive `icon_search_semantic_documents` migration draft | Document determinism, registry compatibility, public safety, and 28-query seed passed July 1 | Not applicable | Not verified; saved record says migration was not deployed | Not verified | `references/verification/semantic-search-v2-phase-0-1-2026-07-01.md`; `supabase/migrations/20260701_semantic_search_v2_documents.sql` |
| `P3` Offline embeddings | Conditional and paused by `D-021`; external sample authorization revoked before execution | Provider-neutral planning, sample, adapters, response validation, executor, and replay ledger remain as inactive reference artifacts; no corpus embedding generation, sync adapter, or vector-storage migration | Revoked authorization is verified to fail before credentials, ledger creation, or network activity; no live provider response or retrieval quality was tested | Not applicable | Not verified | Not verified | `references/verification/search-v2-deterministic-first-pivot-2026-07-12.md`; `docs/si-v2/search/experiments/offline-embedding-sample-contract-2026-07-12.md`; `docs/si-v2/search/reviews/embedding-sample-authorization-request-2026-07-12.md` |
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
- `data/semantic-search-v2/embedding-sample-set.json`
- `lib/search-v2-embedding-provider.js`
- `lib/search-v2-embedding-sample.js`
- `scripts/plan-search-v2-embedding-sample.mjs`
- `scripts/verify-search-v2-embedding-sample.mjs`
- `data/semantic-search-v2/embedding-sample-authorization.json`
- `data/semantic-search-v2/embedding-sample-pricing.json`
- `lib/search-v2-embedding-executor.js`
- `lib/search-v2-embedding-ledger.js`
- `scripts/run-search-v2-embedding-sample.mjs`
- `scripts/verify-search-v2-embedding-executor.mjs`
- `docs/si-v2/search/experiments/offline-embedding-sample-contract-2026-07-12.md`

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

The fixed suite now contains 225 stable-ID cases. It includes 219 owner-reviewed cases and 6 contract fixtures. The multilingual meaning rules are owner-approved, while language assurance remains automated high confidence and not native reviewed. The multilingual tier covers CJK, Spanish, Brazilian Portuguese, German, Arabic, Hindi, Thai, Vietnamese, and mixed-script brand-plus-concept queries. Current in-memory verification generated 75,810 English documents from the current workspace inputs and did not replace the saved July 1 output artifact.

The legacy review approved 19 cases as written, adjusted 6 expectations, and replaced 3 translated placeholders with native-language fixtures. Low-level deterministic observation currently returns zero results for all four localized legacy queries, which remains an explicit multilingual retrieval gap rather than a reason to weaken the fixtures.

## Roadmap position

| phase | plain-language position |
| --- | --- |
| `P0` | Complete for the approved fixed-suite scope: all 225 cases are owner-reviewed or fixed contract fixtures. |
| `P1` | The next deterministic latency slice is locally verified: one ordered candidate RPC and one grouped recommendation request preserve results and controls. It is not deployed or measured live. |
| `P2` | Semantic document generation and a migration draft exist, but current input drift and deployment remain unresolved. |
| `P3` | Conditional and paused. The external sample was revoked before execution; no provider keys are needed. |
| `P4` | Conditional and paused. Vector retrieval, shadow comparison, and hybrid fusion are not implemented. |
| `P5` | Conditional and paused. MCP hybrid beta is not implemented or published. |
| `P6` | Conditional and paused. Web hybrid beta is not implemented or deployed. |
| `P7` | Review and admin foundations exist, but the full measured learning loop is not verified. |

For the deterministic-first scope, the read-only hosted migration inventory and beta-only reconciliation plan are complete. The additive measurement schema and first lightweight candidate RPC are deployed, but the isolated beta function was rolled back before npm publication because of live latency. The next batched RPC and paired isolated endpoints exist only locally. The hosted schema contains most historical objects but the hosted ledger remains incomplete, so normal `db push` remains prohibited. Optional semantic phases `P3` through `P6` are paused and are not current release requirements.

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

Reduce deterministic recommendation work before another MCP beta:

1. Use [`search-v2-roundtrip-latency-execution-2026-07-14.md`](../../../references/verification/search-v2-roundtrip-latency-execution-2026-07-14.md) as the controlling live record.
2. Make the English recommendation variant limit explicit and fixture-backed so the planned and measured workloads match.
3. Build one recommendation-specific deterministic pipeline that combines all query variants before retrieval and shares metadata, semantic, SVG, and audit work.
4. Record generated query counts plus every retry status and delay in the next local measurement client.
5. Arrange a permitted stage-log export before requesting another live measurement.
6. Keep production deployment and npm publication blocked until direct search, localized search, and recommendation all pass their limits with parity preserved.

Phases `P3` through `P6` remain paused until the owner accepts a new evidence-backed decision.

## Updating this ledger

Every status update must include:

- phase and artifact;
- lifecycle state changed;
- exact verification or deployment evidence;
- date and environment;
- residual limitation; and
- rollback evidence when deployment is involved.

Do not mark a phase complete because files exist, tests were planned, or a package version changed.
