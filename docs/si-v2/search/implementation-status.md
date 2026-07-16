# SI Search Engine v2 implementation status

Last verified: 2026-07-16
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
| `P1` Shared deterministic understanding | Current main contains the reviewed Search v2 and Material integration. The first hosted search-only beta failed Gate C, was rolled back, and was not published. A replacement English local-first MCP prototype is implemented on the preparation branch. Its initial package audit found that the real stdio route applied intent expansion twice and differed from the approved helper contract on 51 of 150 eligible cases. The generic correction and permanent installed-route gate are independently approved. The publication packet now uses npm private staging because the owner account uses a browser security key rather than a six-digit authenticator code. | Existing deterministic intelligence plus a beta-version and request-scoped local `search_icons` route; stable hosted fallback for localized, non-ASCII, and recommendation calls; packaged public synonym map and Material outline and solid SVGs; public local-runtime and index-date diagnostics; non-blocking tool-outcome telemetry; a clean-installed stdio route gate covering all 150 eligible cases | The clean 225-case fingerprint remains `ef293409...a76c8`. The corrected clean-installed stdio route reproduces every approved ordered result reference across 150 eligible cases, with route fingerprint `7a56bd23...32184`, on both executor and independent auditor runs. Focused route checks still prove eligible English and Material searches skip hosted search, fallbacks keep stable routing without a beta cohort, one outcome attempt is made for an eligible local call, and telemetry failure does not fail search. The earlier hosted Gate C failure remains recorded at 7,151.057 ms search p95 and one error among 38 captured requests. | The exact archive contains 47 files, includes the public synonym map and 8,524-asset Material bundle, reproduces the fixed 225-case helper fingerprint and the 150-case stdio route fingerprint, and resolves both Material styles from that bundle. The package is not published or staged. The revised packet binds the exact archive, one private staged upload, staged-archive download and smoke, browser security-key approval, one-use post-approval finalization with terminal success or rollback, published-package smoke, and a one-use 50-case informational comparison. | Migration `20260714180000` remains deployed from the failed hosted beta. The isolated beta endpoint was deleted. The local-first prototype needs no new function or migration. | The replacement prototype has not been observed live. Stable Railway MCP and Supabase function evidence is unchanged from the prior closeout. | `references/verification/search-v2-local-first-feasibility-2026-07-16.md`; `references/verification/search-v2-local-first-beta-prototype-2026-07-16.md`; `references/verification/search-v2-local-first-stdio-route-parity-2026-07-16.md`; `references/verification/search-v2-search-only-beta-gate-c-execution-2026-07-16.md` |
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
| npm registry | Read-only registry verification reports `latest` at `0.4.17`. |
| Supabase database and Storage | Saved Material release records report the two Material migrations, 8,524 private asset rows, and 8,524 Storage objects. Current live state was not queried in the integration. |
| Supabase functions | Authenticated read-only verification reports snapshot version 49, stable search version 38, and web search version 35 active. |
| Search v2 beta | Manifest `bf59e6cf...1d734` was executed. Hosted Gate C failed, the endpoint was deleted, and `0.4.19-beta.0` was not published. npm `latest` remains `0.4.17`. The first local-first publication draft was stopped after a package-route parity gap was found. The correction and permanent stdio route gate are independently approved. Two later direct publication attempts stopped before creating the version, first on expected-absence handling and then because the npm account uses browser security-key 2FA rather than an authenticator code. The revised packet uses one private npm staged upload, downloads and verifies the staged archive before browser approval, protects the staging allowance with an atomic local receipt, and binds a one-use post-approval finalizer with terminal success or rollback plus a one-use hosted-comparison allowance. No staged upload has occurred. The corrected beta requires no endpoint or migration. The earlier Gate C harness corrections remain useful only if a later hosted measurement is reviewed. |

The complete four-surface map and its evidence limits are recorded in `references/verification/search-v2-material-integration-2026-07-16.md`. The later main reconciliation and case-level fingerprint changes are recorded in `references/verification/search-v2-main-reintegration-2026-07-16.md`.

## Immediate next gate

1. Independently audit the finalization replay correction, one-use comparison allowance, and refreshed bound manifest.
2. Stage the exact archive once, download it from npm's private staging area, verify its SHA-256, and run the full installed-package smoke.
3. Ask the owner only to approve the verified stage on npmjs.com with the account security key.
4. Verify the published prerelease, keep npm `latest`, Supabase functions, database schema, Railway, and web search unchanged, then run at most 50 sequential sanitized stable-hosted comparison requests with no retries.
5. Keep hosted attribution as required evidence before any later hosted web or recommendation gate.
6. Keep the exact hosted slow stage unresolved until the saved platform timing logs are recovered or a future independently reviewed hosted attribution run is combined with a web or recommendation gate.
7. Leave both drafted monitoring routines inactive until their scope and cost are reviewed under `FR-26`.

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
