# SI Search Engine v2 implementation status

Last verified: 2026-07-22
Authority: evidence ledger only; intended behavior lives in [`search-engine-v2.md`](search-engine-v2.md)

## Synchronized stable release

Source revision `5a701234a9dfac2ea1145d4b3221c03ed1bbf43e` implements the `D-033` surface alignment as version `0.4.19`. Railway and the public website are deployed and observed live. npm publication is prepared and verified but is blocked only by an expired local registry login.

| surface | verified candidate behavior | remaining boundary |
| --- | --- | --- |
| Stable npm MCP | Exact protected archive SHA-256 `4f885b38...352e9` and npm shasum `3ad1938a...1db6` contain 67 files. A clean install routes all 225 maintained cases through the packaged deterministic engine. Search and recommendations are local-first for every maintained locale. The approved fixed-suite fingerprint remains `3e529b41...9777`, and the all-locale stdio route fingerprint is `533a3ec6...c2e9`. | Run `npm login`, publish the exact prepared archive as `0.4.19` to `latest`, then verify the registry identity and a clean registry install. npm remains unchanged at `latest` 0.4.17 and `beta` 0.4.19-beta.2. |
| Railway hosted MCP | Deployment `94e801e0-abeb-4738-9897-00da2471e245` is live. Health reports version 0.4.19 and local-first search and recommendations. Live English and Japanese public search passed. Hosted MCP search returned `material:dropdown` in 287.6 ms, and the approved 20-slot recommendation resolved in 700.8 ms with zero hosted search calls. | Observe normal traffic. Rollback is redeploying pinned source `49581b676` from prior deployment `ff667522-5e54-426d-b737-04a415e0b59e`. |
| Public web search | Netlify deploy `6a5fa79b7d04082d57641c1f` is live. Browser checks confirmed English and Japanese searches call `https://mcp.supericons.dev/search-icons`, render the expected results, and produce no console errors. Keyless copy, client tabs, license, provenance bytes, and private release markers passed remotely. | Observe normal traffic. Remote preview persistence automation did not complete within its bounded run, but the unchanged preview path passed in the exact local artifact. Rollback is Netlify deploy `6a5d3d4c1967b6dadfb1104d`. |
| Public boundaries | The exact protected website tree `3819ab7b...16bb` and exact protected npm archive pass VC-3 and VC-4 checks. The published website repeats those checks remotely. | Repeat registry checks after npm publication. |

## Active recommendation reliability candidate

The current local candidate implements `D-031`, `FR-46`, and `FR-47` without changing the package metadata version:

| artifact | lifecycle state | proof | remaining boundary |
| --- | --- | --- | --- |
| Local and hosted `recommend_icons` contract | Implemented and locally verified | `scripts/verify-mcp-agent-friendly-errors.mjs` accepts 20 slots on both MCP transports, returns structured guidance for 21 slots and missing task text, preserves a hosted 429 reset of 43,200 seconds, and proves local fallback after grouped empty results. `scripts/verify-recommend-icons-grouped-search.mjs` proves parity, a 40-query upper bound, and two distinct searches for 20 repeated slots. | No new npm version is assigned or published. The live `FR-47` latency workload is not run. |
| Grouped hosted compatibility | Implemented and locally verified | `scripts/verify-hosted-search-grouped-client.mjs` retries invalid JSON and malformed successful responses, proves rollback and custom-route compatibility, and proves concurrent grouped failures cannot open the stable fallback circuit. `scripts/verify-mcp-agent-friendly-errors.mjs` proves local fallback does not hide a hosted 429. `scripts/verify-search-v2-grouped-http-request.ts` rejects `null` and malformed JSON, converts malformed subresponses to 502, fails closed when tier enforcement is on, and pins pre-expanded grouped queries. The production-sized v4 benchmark returned the same 80 rows as v3 and measured 30.371 ms p95 versus 1,000.473 ms for v3. | Three guarded attempts rolled back cleanly after latency gates blocked. The additive endpoint and v4 RPC are absent. The indexed v4 fix needs a fresh release packet and independent review. |
| Stable Supabase MCP route | Source restored and hash-verified against main | `supabase/functions/mcp-search/index.ts` has Git blob `71e568f3014a3e07f7271801b4503080b7111ec7`, equal to main `4a96175c6`. Grouped behavior lives in `supabase/functions/mcp-search-grouped/index.ts`. | Do not deploy the stable function as part of beta.3. |
| `preview_icons` over-limit behavior | Implemented, locally verified, and clean-install verified | `scripts/verify-search-v2-one-call-contract.mjs` sends 15 refs with limit 13, receives a successful inline result capped at 12, and confirms all 15 accepted refs remain in `preview_url`. | Not published or deployed. |
| Public 20-slot documentation | Implemented, generated, built, and locally verified | `scripts/verify-recommend-icons-doc-limits.mjs` checks all 12 maintained, web, and MCP catalogs. `verify:i18n-catalogs`, `verify:localized-docs-bodies`, `verify:docs-site-render`, and the production Vite build pass. | The documentation changes are not deployed. |
| Railway local-first recommendation | Implemented, locally verified, deployed, and observed live | `scripts/verify-railway-local-first-recommendations.mjs` starts the real HTTP MCP server and resolves 1, 10, and 20-slot English calls plus a Japanese 20-slot call with zero hosted search requests. The final local gate measured fresh English 20 slots at 1,622.1 ms, Japanese 20 slots at 1,058.7 ms, and repeated English 20-slot p95 at 53.7 ms. Railway deployment `ff667522-5e54-426d-b737-04a415e0b59e` is active at `mcp.supericons.dev`. The live verifier measured 523.0 ms for 1 slot, 2,288.3 ms for 10 slots, 2,250.1 ms for 20 slots, 1,760.5 ms for Japanese 20 slots, and 415.0 ms repeated 20-slot p95. Production telemetry recorded 11 recent recommendation events as `hosted_mcp`, `local_first`, and `ok`. The 225-case fingerprint remains `3e529b41...9777`. | The one-day traffic error and latency observation is still open. The prior Railway deployment `3745b7da-abd8-4f7d-8c53-5406c9f205ac` remains the rollback target. No npm version was published and no Supabase search function was deployed. |

The historical Material production-surface guard remains red on both main `4a96175c6` and this candidate: actual aggregate `f52be4b6...` versus recorded `050db70c...`. This confirms cumulative stable-function source drift already existed before this repair. Beta.3 therefore uses an additive endpoint and must not deploy `mcp-search`.

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

## Access policy state

| item | verified state |
| --- | --- |
| Local-first access | The beta package allows eligible local search without an API key. The search runs from packaged data and makes a non-blocking tool-outcome telemetry attempt. |
| Local telemetry | The package honors `SUPERICONS_DISABLE_TELEMETRY`, `SUPERICONS_TELEMETRY`, and `DO_NOT_TRACK`. Telemetry is best-effort and must not be treated as a complete denominator. |
| Hosted access | The shared Supabase limiter currently uses an IP hash and a default 120 requests per minute. Dormant tiered daily allowances are implemented in `rate-limit.ts` and wired into the search and shared recommendation handlers, gated by `SEARCH_ENGINE_TIER_ENFORCEMENT` which defaults to off. The dormant counter meters every tier per client hash; this does not satisfy the `D-030` per-account identity for registered and Pro tiers, and account aggregation therefore blocks enforcement. Implemented and locally verified (deno check, behavioral tests, route-level pipeline test), not deployed. |
| Tier policy | Ratified by `D-030` on 2026-07-20: anonymous 300 per client per UTC day; registered free including pack-only purchasers 1,500 per account; Pro 5,000 per account; 120 per minute burst; local search unlimited and keyless. The `CP-07` measurement artifact `docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md` records the measured basis and enforcement preconditions. Public fair-use copy was drafted in all 12 locales and removed from the maintained docs sources per `A-3`: the numbers publish only when enforcement and free-key issuance are live (draft preserved at commit `eb5d6878c`). Enforcement remains off pending the recorded preconditions. |
| Free account benefit | Self-service free keys, a higher registered hosted allowance, and personal usage analytics are not verified as live by this ledger. |

## Immediate next gate

1. Follow the controlling execution order in `search-v2-execution-prd-2026-07-20.md` (workstreams, adopted decisions `A-1` through `A-8`, and sequencing). The 2026-07-18 completion PRD remains authoritative for requirement IDs only.
2. The promotion window follows `D-030`: 200 correctly labeled controlled eligible attempts across at least three qualifying days plus the quality, error, latency, canary, and rollback conditions. Organic adoption is reported separately and is not a gate. Labeled counting requires the 0.4.19-beta.2 labeling support; the 30 earlier unlabeled events are quality evidence only.
3. Report relevance, zeros, errors, telemetry coverage limits, traffic concentration, and remaining deterministic gaps against the closeout scorecard. Local package telemetry remains best-effort and cannot supply a complete denominator.
4. Measure the current hosted database and recommendation path with a separately bounded workload before choosing further recommendation or database changes.
5. Keep hosted tier enforcement disabled until the `FR-43` readiness conditions pass: measured thresholds, working self-service free keys, one two-ingress contract, and copy that promises only live benefits.
6. Promote npm, Railway, Supabase, and web behavior separately. Each venue retains its own compatibility, performance, public-boundary, and rollback gate.

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
