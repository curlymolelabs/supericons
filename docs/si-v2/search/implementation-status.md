# SI Search Engine v2 implementation status

Last verified: 2026-07-18
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
| `P0` Governance and baseline | Complete for the approved fixed-suite scope | Official specification version 1.9; sanitized July 11 baseline; 225-case evaluation suite; approved legacy, SI-brand, multilingual meaning, expressive-fallback, and local-first beta rules; deterministic-first decisions `D-021` through `D-025` | Traceability audit passed; all 225 cases have stable IDs; 219 cases are owner-reviewed and 6 are contract fixtures; revoked provider authorization fails closed before execution | Not applicable | Not applicable | Not applicable | `docs/si-v2/search/consolidation-traceability.md`; `docs/si-v2/search/reviews/multilingual-evaluation-owner-review-2026-07-12.md`; `references/verification/search-v2-deterministic-first-pivot-2026-07-12.md`; `references/verification/search-query-baseline-2026-07-11.md` |
| `P1` Shared deterministic understanding | Current main contains the reviewed Search v2 and Material integration. The first hosted search-only beta failed Gate C and was rolled back. The protected English local-first MCP prerelease is published under npm tag `beta`, while `latest` remains unchanged. MCP preview links now persist on the production web grid. | Existing deterministic intelligence plus a beta-version and request-scoped local `search_icons` route; stable hosted fallback for localized, non-ASCII, and recommendation calls; packaged public synonym map and Material outline and solid SVGs; public local-runtime and index-date diagnostics; non-blocking tool-outcome telemetry; a clean-installed stdio route gate covering all 150 eligible cases; sticky explicit-list and query preview state on the web grid | The clean 225-case fingerprint remains `ef293409...a76c8`. The corrected clean-installed stdio route reproduces every approved ordered result reference across 150 eligible cases, with route fingerprint `7a56bd23...32184`. Focused route checks prove eligible English and Material searches skip hosted search, fallbacks keep stable routing without a beta cohort, one outcome attempt is made for an eligible local call, and telemetry failure does not fail search. The live web checks prove preview state survives delayed popularity, locale, and authentication updates. | The protected prerelease is published as `@supericons/mcp@0.4.19-beta.1`. A read-only registry check on July 18 confirmed `beta` at `0.4.19-beta.1` and `latest` at `0.4.17`. | Migration `20260714180000` remains deployed from the failed hosted beta. The isolated beta endpoint was deleted. The local-first prerelease needs no new function or migration. Netlify deploy `6a5a62e4382d02608226d0f7` carries the preview persistence fix. | Public npm registry identity is verified. The production web grid passed the five preview persistence checks on the deployed bytes. Real eligible user traffic has not yet established the beta evidence window. | `references/verification/search-v2-local-first-beta-publication-2026-07-17.md`; `references/verification/search-v2-web-preview-persistence-release-2026-07-18.md`; `references/verification/search-v2-local-first-beta-prototype-2026-07-16.md`; `references/verification/search-v2-local-first-stdio-route-parity-2026-07-16.md`; `references/verification/search-v2-search-only-beta-gate-c-execution-2026-07-16.md` |
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
| `P1` | Search-only beta routing and measurable cold/reused-worker evidence are locally verified. Recommendation remains stable. A separate one-slot shared recommendation treatment preserves results and controls locally but has no live latency evidence. |
| `P2` | Semantic document generation and a migration draft exist, but current input drift and deployment remain unresolved. |
| `P3` | Conditional and paused. The external sample was revoked before execution; no provider keys are needed. |
| `P4` | Conditional and paused. Vector retrieval, shadow comparison, and hybrid fusion are not implemented. |
| `P5` | Conditional and paused. MCP hybrid beta is not implemented or published. |
| `P6` | Conditional and paused. Web hybrid beta is not implemented or deployed. |
| `P7` | Review and admin foundations exist, but the full measured learning loop is not verified. |

For the deterministic-first scope, the read-only hosted migration inventory and beta-only reconciliation plan are complete. The earlier additive measurement schema, lightweight candidates, and batched candidates are deployed, but all isolated measurement functions were deleted after their runs. Tool-scoped latency evidence and the shared recommendation function exist only locally. The hosted schema contains most historical objects but the hosted ledger remains incomplete, so normal `db push` remains prohibited. Optional semantic phases `P3` through `P6` are paused and are not current release requirements.

### Current query evidence

- `references/verification/search-query-baseline-2026-07-11.md` is the public-safe controlling snapshot.
- The raw admin export remains private and is identified by checksum in that verification record.
- `output/search-zero-results-analysis-2026-07-11/analysis.sql` contains the aggregate calculations used to validate the snapshot.

## Deployment and publication state

| surface | current evidence |
| --- | --- |
| Integration source | Main contains the reviewed Search v2, Material, taxonomy, and expressive-fallback integration through `ed3dcdea7`. The local-first beta preparation branch binds corrected implementation commit `b06bba157`. |
| Railway hosted MCP | Live health reports MCP version `0.4.18` and 8,524 Material assets. |
| npm registry | Read-only registry verification on July 18 reports `latest` at `0.4.17` and `beta` at `0.4.19-beta.1`. The registry reports shasum `56a195e6cda061171838278c18e131cce077d9b3` for beta.1. |
| Web grid | Netlify production deploy `6a5a62e4382d02608226d0f7` is ready at `supericons.dev`. Explicit and query MCP previews remain stable across delayed popularity, locale, and authentication updates. The verified rollback target is `6a4c656b9a68bd1909b8ba2c`. |
| Supabase database and Storage | Saved Material release records report the two Material migrations, 8,524 private asset rows, and 8,524 Storage objects. Current live state was not queried in the integration. |
| Supabase functions | Authenticated read-only verification reports snapshot version 49, stable search version 38, and web search version 35 active. |
| Search v2 beta | The protected local-first prerelease is public as `@supericons/mcp@0.4.19-beta.1` under tag `beta`. A read-only registry check on July 18 confirmed npm `latest` remains `0.4.17`. The production web grid separately carries the preview persistence fix, so MCP preview links no longer reset to the full grid after delayed page updates. No endpoint, migration, database, Railway, or production function changed for either release. |

The complete four-surface map and its evidence limits are recorded in `references/verification/search-v2-material-integration-2026-07-16.md`. The later main reconciliation and case-level fingerprint changes are recorded in `references/verification/search-v2-main-reintegration-2026-07-16.md`.

## Immediate next gate

1. Run the active read-only beta monitor and weekly maintenance audit without changing the request path.
2. Manually share the reviewed opt-in invitation. Do not automate public messages.
3. Start the beta clock only from the first verified eligible user request, then require at least 3 complete days plus the minimum sample and green or resolved daily monitoring.
4. Report relevance, zeros, errors, telemetry coverage, traffic concentration, and remaining deterministic gaps against the closeout scorecard.
5. Extend to 14 days if the sample remains below 200 eligible attempts or 20 session groups, then report underpowered if the target is still unmet.
6. Keep hosted attribution unresolved until a future separately bounded hosted measurement is justified.

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
