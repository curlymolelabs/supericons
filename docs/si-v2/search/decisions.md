# SI Search Engine v2 decision log

Status: append-only history with a current-decision index
Established: 2026-07-11

## Authority rule

This log explains accepted, rejected, and superseded choices. It does not override [`search-engine-v2.md`](search-engine-v2.md). A decision becomes active only when the canonical specification is updated in the same change.

Do not delete or rewrite historical entries. A later decision may supersede an earlier one by ID and must update the current-decision index.

## Current decisions

| ID | decision | status | spec area |
| --- | --- | --- | --- |
| `D-001` | Three complementary authority lanes plus frozen traceability | Accepted | Authority and change policy |
| `D-002` | Evidence-based implementation lifecycle states | Accepted | Implementation status |
| `D-003` | Exactly five semantic document types; locale is a dimension | Accepted | Data contract |
| `D-004` | Runtime relationship table sourced increasingly from SI v2 records | Accepted | Relationships |
| `D-005` | One phase plan with baseline/recommendation alignment before public fusion | Accepted | Rollout |
| `D-006` | Public claim-provenance rule and gated sentinel tests | Accepted | Leakage protection |
| `D-007` | Public `include_query_frame` and privileged `debug_intent` are separate contracts | Accepted | Diagnostics |
| `D-008` | Fixed stratified evaluation target plus rolling production suite | Accepted | Evaluation |
| `D-009` | Evaluate multilingual retrieval before expanding localized documents | Accepted | Localization |
| `D-010` | Supabase/Postgres with pgvector is the first vector experiment | Accepted | Infrastructure |
| `D-011` | Exact/rule retrieval remains available and exact identities outrank fuzzy matches | Accepted | Retrieval |
| `D-012` | Explicit strict/prefer/all library modes with backward-compatible default | Accepted | Library behavior |
| `D-013` | Admin review is the taste gate; raw demand does not auto-edit records | Accepted | Learning loop |
| `D-014` | MCP-first beta after shadow gates | Accepted | Rollout |
| `D-015` | Raw query export remains private; repository evidence is sanitized | Accepted | Evidence/privacy |
| `D-016` | Ambiguous search diversifies; recommendation narrows with context or asks for clarification | Accepted | Query understanding and result behavior |
| `D-017` | Brand priority requires the appropriate identity match class and intent | Accepted | Retrieval and reranking |
| `D-018` | Owner-approved evidence governs brand-term classification changes | Accepted | Retrieval governance |
| `D-019` | Proactively classify the bounded SI brand set; classify external brands when collision evidence appears | Accepted | Retrieval governance |
| `D-020` | Separate multilingual meaning approval, language assurance, and native review; use hard, locale, and aggregate embedding gates | Accepted | Evaluation governance |
| `D-021` | Ship and measure deterministic MCP search before reconsidering semantic retrieval; no paid model call in the default free request path | Accepted | Architecture and rollout |
| `D-022` | Reduce deterministic hosted round trips while preserving query provenance, rate limits, audit rows, and public response parity | Accepted | Performance and controls |
| `D-023` | Gate beta release by tool and reject measurement workloads that do not match legal public inputs | Accepted | Rollout and measurement |
| `D-024` | Keep expressive related icons visible behind conventional symbols and approved identities unless the query directly names their meaning | Accepted | Retrieval and reranking |
| `D-025` | Use packaged local search only for eligible English MCP beta queries while stable hosting serves localized, recommendation, and web requests | Accepted | Architecture and rollout |
| `D-026` | Let agents execute audited release work autonomously and involve the owner only for access, money, default-user changes, or material risk | Accepted | Release governance |
| `D-027` | Keep living search intelligence private while licensing, marking, and minifying staged public engine artifacts | Accepted | Public bundle boundary |
| `D-028` | Keep local search keyless while giving hosted search measured anonymous, registered, and paid allowances | Accepted | Access, cost, telemetry, and public/private product boundary |
| `D-029` | Make MCP telemetry venue follow the client entry point | Accepted | Measurement and dashboard attribution |
| `D-030` | Ratify measured hosted allowance thresholds and replace the organic beta gate with controlled evidence | Accepted | Access policy and promotion gating |
| `D-031` | Support 20 recommendation slots and return agent-readable recovery messages | Accepted | MCP recommendation and preview behavior |
| `D-032` | Run Railway recommendations from the in-process index with one controlled hosted fallback | Accepted | Hosted MCP architecture and performance |
| `D-033` | Promote one deterministic Search v2 release across hosted MCP, stable npm, and web | Accepted | Surface alignment and stable release |
| `D-034` | Expand broad meaning coverage through reviewed deterministic groups and measured language priorities | Accepted | Meaning coverage and localization |
| `D-035` | Put stable Search v2 in evidence-driven maintenance mode and keep adaptive retrieval paused | Accepted | Maintenance, measurement, and future architecture |
| `D-036` | Restore hosted-primary retrieval for hosted search while keeping local-first recommendations | Accepted | Hosted search incident repair |
| `D-037` | Close the hosted search incident with explicit fusion, trusted test labeling, and an immutable local package repair | Accepted | Incident closure and surface parity |
| `D-038` | Count one final product outcome per search episode and keep internal attempts diagnostic | Accepted | Telemetry identity and dashboard measurement |

## Decision records

### D-001: Authority lanes

Date: 2026-07-11
Status: Accepted

Decision:

- `search-engine-v2.md` owns intended behavior and requirements.
- `decisions.md` owns rationale and history.
- `implementation-status.md` owns verified lifecycle state.
- `consolidation-traceability.md` is frozen, non-normative evidence.

Reason: a frequently updated status ledger or append-only history must not become a second specification.

### D-002: Evidence-based lifecycle states

Date: 2026-07-11
Status: Accepted

Decision: status is reported separately as implemented, locally verified, packaged, deployed, and observed live. A broader term such as `live`, `shipped`, or `done` is not used without the exact supporting state.

Reason: the July verification records prove local work but explicitly do not prove Supabase/Netlify deployment or npm publication.

### D-003: Five semantic document types

Date: 2026-07-11
Status: Accepted

Decision: the initial runtime set is exactly `identity`, `meaning`, `visual`, `domain`, and `negative`. Locale is a column/dimension. Localized aliases feed localized identity or meaning documents.

Rejected alternatives:

- A sixth `localized_aliases` type without a migration.
- Parallel `action`, `relationship`, or `locale` types before evaluation proves the five-type model insufficient.

Reason: the implemented generator and migration already agree on the five types. Relationships belong primarily in the runtime graph; actions can be represented in meaning/domain content.

### D-004: Relationship graph and SI v2 records

Date: 2026-07-11
Status: Accepted

Decision: `icon_search_relationships` is the bounded runtime graph. Initial edges are curated from known demand. As SI v2 records adopt approved associations, anti-associations, and `distinct_from` fields, generated edges use those records as their maintained source.

Reason: this preserves a performant runtime shape without creating a permanently separate meaning authority.

### D-005: One rollout plan

Date: 2026-07-11
Status: Accepted

Decision: use phases `P0` through `P7` from the canonical specification. Finish the baseline, library contract, and shared recommendation/query contract before public hybrid fusion. Offline embedding work may overlap those phases.

Reason: the July 11 bounded snapshot concentrates observed zero-result attempts in `recommend_icons` and library-scoped traffic, while the architecture independently requires a reliable baseline before semantic rollout.

### D-006: Gated-field explanation safety

Date: 2026-07-11
Status: Accepted

Decision: public explanation claims must derive from public fields, public documents, the submitted query, or approved public templates. Gated fields may influence internal retrieval or ranking but may not contribute public facts, distinctive wording, or reasons. CI uses distinctive gated sentinel fixtures.

Rejected alternative: literal output-token allowlisting. It blocks ordinary connective prose while failing to catch paraphrased gated facts.

### D-007: Public and privileged diagnostics

Date: 2026-07-11
Status: Accepted

Decision:

- `include_query_frame` remains an opt-in public-safe interpretation summary.
- `debug_intent` is privileged and may include internal lanes, scores, candidates, and gated signals.
- Public hosted MCP omits `debug_intent` entirely.

Reason: the public-safe query-frame capability is implemented in the workspace and must not be confused with privileged ranking diagnostics.

### D-008: Evaluation suites

Date: 2026-07-11
Status: Accepted

Decision: target a 225-query fixed, owner-reviewed suite plus a rolling production-derived suite and a smaller release smoke subset. Stratify by surface, tool, library mode, locale, query class, and likely automation. Every case defines useful families and unacceptable results.

Reason: raw frequency is not relevance ground truth, and the current bounded snapshot is heavily weighted toward hosted MCP.

### D-009: Locale strategy

Date: 2026-07-11
Status: Accepted

Decision: keep locale as a document dimension. Compare multilingual embedding retrieval over current documents/dictionaries with localized identity/meaning documents for proven high-value aliases. Defer per-locale document expansion and production model choice until evaluation.

Reason: thirteen full locale projections would create rebuild and QA cost before their benefit is established.

### D-010: First vector backend

Date: 2026-07-11
Status: Accepted

Decision: evaluate Supabase/Postgres with pgvector first. Move to a dedicated vector service only after pgvector fails an explicit quality, filtering, latency, reliability, scale, or cost gate.

Reason: it minimizes operational expansion for the current corpus and hosted architecture.

### D-011: Hybrid, not replacement

Date: 2026-07-11
Status: Accepted

Decision: semantic retrieval is an additional candidate lane. Exact identity and approved deterministic behavior remain available and exact brand/icon identity outranks fuzzy similarity.

Reason: vector similarity can be plausible but wrong when identity matters, and the semantic lane must fail safely.

### D-012: Library modes

Date: 2026-07-11
Status: Accepted

Decision: the target contract supports `strict`, `prefer`, and `all`. Existing callers without a mode keep current strict behavior until an API-compatible migration is approved.

Reason: the query baseline shows selected-library dead ends for concepts that succeed elsewhere, but silently crossing a user-mandated library would also be incorrect.

### D-013: Taste-gated learning

Date: 2026-07-11
Status: Accepted

Decision: usage and search gaps create proposals. Maintainer approval decides whether a record, alias, intent group, graph edge, ranking rule, library behavior, or Icons Lab brief changes. One-off hidden aliases are emergency exceptions and require fixtures.

Reason: automated raw demand is noisy and should not become public meaning without review.

### D-014: MCP-first beta

Date: 2026-07-11
Status: Accepted

Decision: after offline and shadow gates pass, enable hybrid ranking for an approved MCP cohort before the default-off web beta.

Reason: the SI v2 blueprint establishes MCP-first Ring 2 delivery, and agents do not require a new UI surface.

### D-015: Sanitized analytics evidence

Date: 2026-07-11
Status: Accepted

Decision: raw admin query exports remain in private analytics storage. Repository evidence contains aggregate counts, reviewed generic queries, limitations, source metadata, and a checksum only.

Reason: raw packs include hashed identifiers, context URLs, account attributes, and unreviewed evidence that should not enter a potentially public repository.

### D-016: Surface-specific ambiguous-query behavior

Date: 2026-07-11
Status: Accepted

Decision: list-style search diversifies an ambiguous short query across approved interpretation families. When at least three relevant families exist, the top eight should cover at least three without adding weak filler. Recommendation uses task and slot context to narrow first. If the meaning remains unclear, it returns labeled interpretation options and `needs_clarification` instead of a confident guess.

Reason: broad words such as `hello` can mean a gesture, friendly face, message, spoken greeting, or written greeting. One forced meaning hides useful options, while unconditional diversification can make a recommendation indecisive. Surface-specific handling preserves both discovery and decisiveness.

### D-017: Generic brand-intent gating

Date: 2026-07-11
Status: Accepted

Decision: brand matches are classified as distinctive exact, ambiguous exact, or prefix/substring. Distinctive exact identity keeps priority. Ambiguous common-word identity requires context or shares the result set with concept interpretations. Prefix or substring matches cannot take top rank without an approved brand-intent signal.

Reason: a bare concept such as `hello` must not become a HelloFresh search merely because the brand contains the query. The same rule must protect other concept and brand collisions without creating one-query ranking patches.

### D-018: Brand-term classification governance

Date: 2026-07-12
Status: Accepted

Decision: engineering or admin review may propose a brand-term addition or reclassification, and the owner approves it in `data/search-intent-graph/ranking-policy.json`. Each change requires a stable collision or identity fixture plus approved registry identity evidence or sanitized search evidence. Exact identity canaries must continue to pass. Usage frequency alone cannot add or reclassify a brand term.

Reason: FR-28 depends on maintained coverage as new brand and common-word collisions appear. A clear evidence rule lets coverage grow without allowing raw demand or hidden aliases to edit meaning automatically.

Specification change: version 1.2 adds the brand-classification maintenance rule and resolves `OQ-09`.

Superseded decisions: none.

### D-019: Bounded brand-classification scope

Date: 2026-07-12
Status: Accepted

Decision: proactively review the 50 owner-controlled SI brand-logo records and explicitly approve ambiguous terms and aliases in the maintained ranking policy. Unclassified brand-logo candidates retain the current distinctive exact fallback, while the generic prefix/substring gate applies automatically. External brand catalogs are not manually classified in full; a term is added reactively when stable identity or collision evidence justifies it. Registry aliases are review inputs and do not become brand-ranking aliases automatically.

Reason: owner-controlled SI brands are a small, high-priority set where common-word collisions can be prevented before embeddings amplify them. Manually classifying thousands of external brands would create an unbounded taxonomy project with little evidence of value.

Alternatives rejected or deferred: a separate brand-classification system; manual classification of every external brand; automatic promotion of every registry alias.

Specification change: version 1.3 adds `FR-29` and the bounded brand-maintenance rule.

Superseded decisions: none.

### D-020: Multilingual assurance and embedding gates

Date: 2026-07-12
Status: Accepted

Decision: multilingual fixtures record meaning approval, language assurance, and native-language review separately. Lack of native review is disclosed and does not become a false owner-language claim. An embedding candidate must pass every exact-identity, blocked-alias, and safety fixture. Each reviewed locale with at least five semantic cases may fail at most one case, and the aggregate reviewed multilingual pass rate must be at least 90 percent.

Reason: the fixed suite includes languages the owner does not speak, and small locale groups make percentage-only rules unstable. Separate assurance labels preserve honest evidence, while zero-tolerance safety gates and bounded semantic misses prevent aggregate scores from hiding a weak locale.

Alternatives rejected or deferred: marking automated language checks as native review; using one aggregate score without locale gates; setting confidence-score cutoffs before provider evidence exists.

Specification change: version 1.4 adds `FR-30` and the multilingual embedding evaluation gate.

Superseded decisions: none.

### D-021: Deterministic-first MCP search and paused provider work

Date: 2026-07-12
Status: Accepted

Decision: revoke the approved external embedding sample before execution. Package and measure the deterministic search behavior through a controlled MCP beta before reconsidering semantic retrieval. The default free web and MCP request path must not call an AI agent, general-purpose language model, or metered third-party embedding API. AI may assist offline with reviewed search maintenance. Any future local or external model experiment begins with an owner-approved shortlist and an explicit cost, resource, abuse-protection, and rollback boundary.

Reason: the deterministic engine is implemented locally but has not been packaged, deployed, or measured as the new default. Adding provider accounts and per-request model exposure before that evidence would create setup burden, variable-cost risk, abuse risk, and a harder rollback path without proving a material quality advantage. The owner also requires model-provider choices to be reviewed before engineering treats them as candidates.

Alternatives rejected or deferred: running the already-approved Voyage, Gemini, and OpenAI sample now; calling an agent for each search; placing a paid embedding API in the default free MCP request path. A pinned local encoder or a bounded external experiment remains deferred until deterministic evidence justifies it.

Specification change: version 1.5 adds `G-09`, `NG-09`, `FR-31`, `FR-32`, the deterministic MCP beta gate, and the conditional pause on phases `P3` through `P6`.

Superseded decisions: none. `D-010`, `D-014`, and `D-020` remain conditional future controls if semantic retrieval is later re-approved.

### D-022: Deterministic round-trip reduction with preserved controls

Date: 2026-07-14
Status: Accepted

Decision: reduce hosted search latency through two bounded deterministic paths. First, send the generated candidate-query array through one database function while retaining each row's query text and position. Second, allow one recommendation request to carry all resolved logical searches. The grouped request reserves one existing rate-limit unit for every logical query, and every logical search keeps its synchronous audit write. Clarification is evaluated before retrieval and sends no search queries. Production functions remain unchanged until a separate deployment approval and live parity gate.

Measurement records worker request order and module age at handler entry without calling that value module-load time. Safety failures stop an internal run. A latency miss records evidence and blocks publication, but it does not prevent later approved diagnostic phases from identifying the slow stage.

Reason: live measurement showed that removing candidate SVG data greatly reduced payload size, but candidate database work still dominated warm search and a one-slot recommendation still performed multiple concurrent full search pipelines. Fewer deterministic round trips target the measured causes without adding a model call, variable provider cost, or a new ranking system. Keeping audit writes synchronous preserves the current rate limiter, which counts those rows.

Alternatives rejected or deferred: backgrounding audit writes before the rate limiter has an independent counter; treating the 14-variant ceiling as a fixed query count; scheduled warm pings; moving search to a new host before reducing known round trips; changing matching or ranking in the same measurement slice.

Specification change: version 1.6 adds `FR-33`, `FR-34`, `FR-35`, and the deterministic round-trip parity and control rules.

Superseded decisions: none.

### D-023: Tool-scoped beta gates and workload-valid latency evidence

Date: 2026-07-14
Status: Accepted

Decision: allow `search_icons` and `recommend_icons` to enter an opt-in prerelease beta independently. A search-only beta routes `search_icons` to the isolated v2 endpoint while `recommend_icons` keeps the stable endpoint, stable cohort, and exact public response behavior. English recommendation omits locale and uses at most four reviewed query variants. Only supported non-English locales may use the localized limit of eight. Every measurement must prove that its public inputs are legal and that its generated workload matches the approved manifest before deployment.

Latency evidence separates total MCP tool duration from individual hosted-search duration. The beta search audit persists public-safe worker state, request order, and module age so cold and reused-worker results can be compared without relying on function-log access. Logical recommendation queries continue to consume their existing rate-limit units and retain one audit row per logical query, although those rows may be written through one synchronous bulk database call.

Reason: the latest live treatment passed the direct and localized warm-search limits, while recommendation remained too slow under a measurement workload that incorrectly passed `locale: 'en'` and generated eight queries instead of the approved four. The same run proved that package-wide beta routing and function logs are too coarse for an independent search release and for reliable end-to-end tool measurement.

Alternatives rejected or deferred: publishing both tools behind one package-wide route; treating `en` as a localized public input; replacing per-query audit rows with one recommendation row before rate limiting has an independent counter; calling the latest direct-search phase sample a cold request; automatically switching recommendation to the local index without a separate quality, size, startup, memory, freshness, and telemetry evaluation.

Specification change: version 1.7 adds `FR-36`, `FR-37`, and `FR-38`.

Superseded decisions: none. `D-022` remains active for the deterministic round-trip controls.

### D-024: Expressive icons as related fallback results

Date: 2026-07-16
Status: Accepted

Decision: use approved icon metadata to identify expressive results such as meme, humor, or trending-culture concepts. When an expressive icon is only broadly related to the query, keep it eligible but rank conventional symbols and approved identities first. When the query directly matches the expressive icon's name or an approved synonym, do not apply the fallback penalty. The rule is data-driven and generic. Fixtures may name a reviewed collision, but ranking code must not contain a query-specific exception.

Reason: original and playful Supericons should broaden useful results without displacing the symbols or identities most users expect first. `si:person-launched` is genuinely related to speed and momentum, so excluding it from `swift` would contradict its approved record. Ranking it below conventional speed symbols and Swift identities preserves both relevance and the library's character.

Alternatives rejected or deferred: excluding expressive icons from broad related searches; allowing a newly added expressive result to displace conventional symbols by default; adding a `swift`-specific ranking patch.

Specification change: version 1.8 adds `FR-39` and the expressive-fallback ordering rule.

Superseded decisions: none.

### D-025: English local-first MCP search beta

Date: 2026-07-16
Status: Accepted

Decision: the opt-in MCP prerelease may run `search_icons` from its packaged deterministic index and public synonym map only when the request has no locale and contains ASCII text. A request with a locale or non-ASCII text keeps the stable hosted search path. `recommend_icons` and web search also remain on their stable paths. Material outline and solid SVGs are included in the package so eligible Material searches need no asset request. The public beta response identifies the local runtime and the packaged index generation date.

The local beta records one non-blocking tool-outcome telemetry attempt for each eligible call. This tool-level outcome insert does not use the hosted request deduplication key, so beta checks must verify the one-call, one-outcome behavior directly. A telemetry failure must not delay or fail a local search. Local-versus-hosted result differences are reported for information during the beta. Before any later hosted web or recommendation gate, a bounded live attribution check must identify the remaining hosted cost.

Reason: the fixed 225-case suite kept its approved fingerprint on the packaged local path, with local p95 below 500 ms, combined measured memory below 75 MB, and a package below 7 MB. The same local index returned zero for 62 of 75 multilingual cases, so a full local switch would regress localized search. Keeping localized search and recommendation on stable hosting captures the measured English search advantage without claiming unsupported multilingual or recommendation quality.

Alternatives rejected or deferred: another hosted beta deployment before trying the already-packaged local path; routing localized or non-ASCII queries locally; moving recommendation or web search locally without their own gates; dropping the hosted attribution question; treating the earlier hosted request dedupe fix as proof of local tool-outcome completeness.

Specification change: version 1.9 adds `FR-40` and the local-first prerelease boundary.

Superseded decisions: the isolated-endpoint route in `D-023` is replaced for this search-only beta. Its tool independence, legal-workload, and evidence rules remain active. The hosted work in `D-022` and `D-023` remains required evidence before a later hosted surface gate.

### D-026: Delegated release judgment with preserved safeguards

Date: 2026-07-17
Status: Accepted

Decision: agents own the judgment about when to involve the owner. A bounded deployment or publication may proceed after independent audit without a repeated approval ceremony when it stays within an accepted product and risk decision. The owner is involved only when physical access, credentials, or money are required, or when a decision genuinely changes the default user experience or carries material risk the owner would clearly want to weigh. Agents decide whether regenerated fingerprints and equivalent safety corrections preserve the accepted decision.

Independent audit, evidence records, mutation limits, and rollback controls remain mandatory. These safeguards enable autonomous action and do not create a substitute approval ceremony.

Reason: repeated owner approval of equivalent, already-reviewed release packets adds delay without improving the product or risk decision. The owner should spend attention on access and consequential choices, while agents use the audit and evidence system to handle routine release judgment.

Alternatives rejected or deferred: removing independent review or rollback controls; asking the owner to approve every refreshed fingerprint; treating all external actions as automatically owner-gated; letting agents make unreviewed default-user or material-risk changes.

Specification change: version 1.10 revises `FR-26` and the deployment/publication constraints.

### D-027: Protected living intelligence and marked public artifacts

Status: Accepted

Decision: The deterministic engine data already distributed to clients remains public. Usage-derived ranking weights, query-behavior signals, community curation data, contributor reputation data, and paid design intelligence stay server-side. Public npm and web artifacts carry explicit terms and private-record-bound copying-detection markers. Generated modules are minified only in staged public artifacts so maintained sources remain readable.

Reason: The free static library and deterministic engine support adoption, while learned ecosystem intelligence is the compounding asset. Client-delivered bytes cannot be made impossible to copy, so the practical controls are a deliberate public boundary, legal terms, detection evidence, and friction.

Rejected alternatives:

- Removing icon or SI data from the free package, because that conflicts with the distribution strategy.
- Treating minification as secrecy, because a determined copier can reverse it.
- Committing copying-detection identities or listing them in public verification code, because that would make them easy to remove.
- Applying protection transforms directly to maintained source files, because that would reduce reviewability without improving the released boundary.

Specification change: version 1.11 adds `FR-41` and `FR-42`.

Superseded decisions: the explicit-owner-approval portions of earlier rollout decisions and plans are replaced by this owner-involvement boundary. Their technical gates, evidence requirements, mutation limits, and rollback rules remain active.

### D-028: Public local core and tiered hosted allowances

Date: 2026-07-18
Status: Accepted

Decision:

- Static icons and eligible local-first search stay free and keyless. Local-only execution uses the user's device and is not artificially metered by making every search contact Supericons.
- The public npm package is a versioned snapshot of the deterministic engine and public icon data. It is not the complete living service.
- Local telemetry is best-effort, disclosed, and optional. Product reporting must never describe it as complete usage measurement because it can be disabled, blocked, unavailable, or removed from a fork.
- Anonymous hosted search keeps a generous keyless allowance. A registered free account receives a higher hosted allowance. Paid accounts receive the highest fair-use allowance plus their existing entitlements.
- Hosted allowance enforcement applies consistently at both hosted entry points: the Railway MCP service and the shared Supabase search gateway used by installed-package fallbacks.
- Exact thresholds come from measured client and cost distributions. The initial anonymous target is at or above measured legitimate p99 usage, subject to cost and abuse evidence. No threshold is guessed from a single cohort or anecdote.
- Enforcement stays off until free key issuance works, the higher registered allowance is real, and the limit response promises only benefits that are already live. Personal analytics may be advertised only after usage deduplication and the account dashboard are verified.
- A limit response states the reset time, retry guidance, signup path, and higher registered allowance. It does not pressure an anonymous user to buy Pro.
- Usage-derived ranking weights, query-behavior signals, community curation, contributor reputation, and paid design intelligence remain private under `VC-3`.

Reason: local execution does not consume Supericons server compute and cannot be honestly secured through a client-side meter. Hosted execution does create shared cost and can support reliable identity, freshness, recommendations, localized search, and account value. This policy preserves low-friction adoption while creating a measured path from anonymous use to a useful free account and paid services.

Rejected alternatives:

- Requiring an API key before the first free MCP search, because it adds a universal setup dependency before registration provides compensating value.
- Pretending local package usage can be completely tracked or enforced, because public client code and offline execution make that claim false.
- Unlimited anonymous hosted compute without measured controls, because it exposes shared infrastructure to unbounded cost and abuse.
- Metering local execution through a mandatory network call, because it would weaken speed, privacy, offline use, and reliability while remaining removable from public code.
- Treating the public package as the full business, because fresh data, account features, hosted recommendations, localized service, and protected living intelligence remain service-side value.

Deferred:

- Exact anonymous, registered, and paid thresholds, pending the measured distribution and cost artifact.
- Personal analytics copy in the limit response, pending verified usage deduplication and the account dashboard.
- Any paid or x402 action beyond the existing entitlement system, pending separate product evidence and owner decision.

Specification change: version 1.12 adds `G-10`, `NG-10`, `FR-43`, and `FR-44`, updates the constraints and risks, and resolves `OQ-05`.

### D-029: MCP telemetry venue follows the client entry point

Date: 2026-07-18
Status: Accepted

Decision: classify calls from the installed npm MCP server as `local_mcp`, including calls that use hosted search as a fallback. Classify calls to the remote MCP service as `hosted_mcp`. Record genuine user activity as `production` even when it belongs to a beta cohort. Keep beta cohort, package version, client family, and execution route as separate evidence instead of overloading venue or environment.

Reason: the local-first prerelease used `hosted_mcp` and `preview` as beta labels. This hid genuine local npm user searches from the dashboard default view and made the venue selector describe an experiment rather than the client surface. The corrected fields answer separate questions: where the user connected, whether the call was real user activity, which package and cohort ran, and whether the search used a local or hosted execution path.

Alternatives rejected or deferred: keeping beta traffic under Hosted MCP; requiring the dashboard to include preview traffic to find real user calls; treating a hosted fallback as a hosted client; inferring the local client product from unvalidated free-form identifiers.

Specification change: version 1.13 adds `FR-45`.

Superseded decisions: the channel rule in the deterministic MCP beta measurement plan is replaced by this decision. The beta eligibility, cohort, privacy, and one-call outcome rules remain active.

### D-030: Ratified allowance thresholds and controlled-evidence promotion gate

Date: 2026-07-20
Status: Accepted

Decision:

- The hosted allowance thresholds deferred by `D-028` are ratified: anonymous keyless 300 hosted logical searches per client per UTC day; registered free accounts, including pack-only purchasers, 1,500 per account per UTC day; active Pro subscriptions 5,000 per account per UTC day under fair use; 120 requests per minute burst for all tiers; local npm search unlimited and keyless. Enforcement remains off until every precondition in the measurement artifact passes, and the thresholds are revalidated on a fresh 30-day window before enforcement is enabled.
- The 200-organic-attempt pre-promotion minimum is replaced by a controlled-evidence gate: 200 correctly labeled controlled eligible `search_icons` attempts across at least three qualifying days, where a qualifying day contains at least 30 labeled eligible attempts, at least 50 manually reviewed distinct query and mode combinations rerun against the promotion candidate bytes, the full 225-case deterministic suite green, error rate at or below 1 percent, local p95 below 500 ms, no canary violations, and verified venue rollback. Organic adoption is a reported post-release metric, never a promotion prerequisite, and labeled or scripted traffic is never reported as organic.

Evidence: `docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md` (measured distribution, direct exceedance counts, grain definitions, enforcement preconditions), reproduced independently three times with consistent values; owner direction of 2026-07-20 recorded in `docs/si-v2/search/search-v2-execution-prd-2026-07-20.md`.

Alternatives rejected or deferred: waiting for organic adoption that the known-inaccurate public docs and unpromoted engine themselves suppress; counting unlabeled scripted traffic toward the window; per-key registered allowances that multiply across keys.

Superseded decisions: the founder validation window minimums recorded in the beta1 publication approval request are superseded as promotion prerequisites.

Specification change: none in this change set; the execution PRD is the controlling plan and the status ledger is updated in the same commit.

### D-031: Twenty-slot recommendation and agent-readable recovery

Date: 2026-07-20
Status: Accepted

Decision: `recommend_icons` accepts up to 20 UI slots in one call on local and hosted MCP. The implementation deduplicates identical generated searches, groups up to 40 distinct logical queries within the endpoint limit of 96, and charges once per distinct logical query under existing rate and audit rules. Grouped search uses an additive endpoint and never replaces the stable individual endpoint. If grouped mode is unavailable, rolled back, malformed, or returns invalid JSON, the client retries each distinct search individually once. Grouped and stable requests use separate resilience state so a grouped failure cannot block the stable fallback. An existing custom individual endpoint stays individual unless a grouped endpoint is explicitly configured. Individual and grouped results use the same local fallback, but hosted 4xx responses remain visible errors. Grouped mode fails closed when tier enforcement is enabled until D-030 account identity and race-safe accounting are complete. Correctable input problems return structured plain-language guidance. `preview_icons` keeps its 12-icon inline rendering bound, but requests above that bound are clamped with a warning and retain up to 24 accepted refs in the browser preview.

Reason: a real OpenCode call requested 16 recommendation slots and was rejected by the former 12-slot schema. A retry with 12 slots then took almost one minute because recommendation variants were sent through separate hosted calls. The same session requested a 13-icon preview and received another bare parameter rejection even though the intended safe behavior was truncation. The corrected contract supports normal agent workloads without weakening the existing inline image, rate-limit, or query-fanout bounds.

The prerelease latency gate is below the fixed 20-second client timeout: actual routed end-to-end p95 at or below 3 seconds for 1 slot, 10 seconds for 10 slots, and 15 seconds for 20 slots, with zero client timeouts in the approved workload. Worker state is recorded for every sample, but the gate evaluates all routed samples because production evidence showed that Supabase may start a new worker for every request. The exact candidate bytes must also pass one supported non-English 20-slot case.

Alternatives rejected or deferred: increasing only the schema maximum while keeping separate hosted calls; replacing the stable production function; silently truncating recommendation slots; allowing grouped requests while allowance enforcement uses a race-prone counter; increasing the inline contact sheet beyond 12; returning raw Zod or MCP parameter messages for recoverable user inputs.

Superseded decisions: the A-7 sequencing rule is superseded only for this bounded user-visible recommendation reliability repair. Railway local-first remains the next engineering workstream after beta.3 is safe.

Specification change: version 1.15 expands `FR-46` and adds `FR-47`.

### D-032: Railway local-first recommendations

Date: 2026-07-21
Status: Accepted

Decision: stop the Supabase grouped recommendation release after guarded attempt 5 missed the unchanged one-slot latency gate and rolled back cleanly. The Railway hosted MCP service runs `recommend_icons` from its in-process icon index, synonym data, semantic records, and deterministic recommendation engine by default. A successful local recommendation makes zero Supabase search calls. An honest local zero-result also stays local. If the local engine throws, one stable hosted search request may provide a shared emergency candidate pool for the whole recommendation call. The service records the execution mode in the response and best-effort telemetry. An environment switch may temporarily restore the previous hosted route during rollback.

The Railway path uses a bounded token candidate index and a 512-entry least-recently-used query cache. The candidate index reduces full-corpus scans while the deterministic recommendation layer still applies slot intent, semantic scoring, clarification, distinctness, and public result shaping. Local execution is not charged against hosted search allowances.

Evidence: guarded Supabase attempt 5 recorded one-slot samples of 3,743, 2,924, and 2,821 ms, then removed the additive endpoint and v4 database function without changing stable search. The focused Railway verifier starts the real HTTP MCP server and proves a fresh 20-slot English call below 3 seconds, a 20-slot Japanese call below 3 seconds, repeated 20-slot p95 below 500 ms, all requested slots resolved, zero hosted search requests, telemetry route attribution, clarification behavior, exact style reporting, honest local zero-results, and one hosted request after an injected local failure. The fixed 225-case fingerprint remains unchanged.

Alternatives rejected or deferred: a sixth Supabase deployment attempt; weakening the three-second one-slot gate; silently treating local zero-results as infrastructure failures; one hosted fallback call per generated query; removing telemetry; publishing beta.3 before the Railway route has its own deployment and live checks.

Superseded decisions: `D-025` is superseded for Railway `recommend_icons`; its npm `search_icons` eligibility boundary remains active. `D-031` remains active for the 20-slot, clarification, error, preview, and latency contracts, but its grouped Supabase route is no longer the Railway release path.

Specification change: version 1.16 adds `FR-48` and updates the hosted MCP rollout boundary.

### D-033: Synchronized deterministic Search v2 release

Date: 2026-07-22
Status: Accepted

Decision: promote the verified deterministic Search v2 engine as one stable release across the Railway hosted MCP service, the npm `latest` package, and the public web search. Both MCP tools run from the packaged local engine by default on Railway and in the stable npm package. Railway keeps the existing bounded hosted fallback for local engine exceptions. Web search uses a public Railway endpoint that returns ranked public icon IDs and route information, while SVG rendering continues from the existing public web bundle.

The release uses one stable package version and one reviewed source revision. Railway health, npm metadata, website release evidence, and public documentation identify that release. Each venue still has a separate live verification and rollback target. A failed venue gate stops later mutations but does not require rolling back a surface that already passed unless the failure reveals a shared product defect.

Reason: the earlier beta sequence left hosted recommendations, hosted search, local npm search, npm recommendations, and web search on different execution routes. The resulting version labels and behavior were confusing even though the underlying quality work was compatible. The synchronized release removes that drift while keeping protected ranking inputs and usage-derived intelligence out of public package and browser artifacts.

Evidence required: the fixed 225-case fingerprint, a clean-installed stdio route test across every maintained locale, real HTTP tests for hosted search and recommendations, browser-safe payload checks, browser interaction tests in English and Japanese, VC-3 and VC-4 public-boundary checks, exact package inspection, and live post-release probes for Railway, npm, and web.

Alternatives rejected or deferred: leaving npm `latest` on 0.4.17 while hosted MCP uses newer behavior; keeping web on the older Supabase route; publishing protected server ranking data to the browser; changing all surfaces without independent rollback targets.

Superseded decisions: `D-025` remains historical prerelease policy and is superseded for the stable package and web promotion. `D-032` remains active for Railway fallback and recommendation behavior. `D-030` remains active and hosted daily allowance enforcement stays off until its prerequisites pass.

Specification change: version 1.17 adds `FR-49` and the synchronized deterministic surface contract.

### D-034: Broad deterministic meaning coverage

Date: 2026-07-22
Status: Accepted

Decision: expand Search v2 through reviewed meaning groups instead of promising a literal match for every possible word. A meaning group may translate a broad word such as `amazing` into several conventional icon concepts, while exact icon identities and technical terms keep priority. The same public-safe graph supports English and 11 maintained locales. Localized graph matches take priority over older translation fallbacks when both apply. Matching uses word boundaries and reviewed word forms, never arbitrary substrings. Unsupported or nonsensical text returns an honest empty result instead of unrelated filler.

Language work follows measured request volume and zero-result rate. Simplified Chinese, Portuguese, Japanese, Korean, German, Spanish, and Arabic receive the highest initial attention based on the reviewed 30-day hosted sample. Traditional Chinese, Hindi, Vietnamese, and Thai remain in the maintained regression suite even where the observed sample is smaller. Future additions use production zero-result clusters, common vocabulary, and failures from the fixed suite rather than unbounded dictionary expansion.

Evidence required: the exact candidate passes the fixed 225-case suite, at least 244 English meaning checks, at least 612 localized meaning checks across all 11 maintained locales, 638 established multilingual fixtures, honest no-result fixtures, public-boundary checks, and the local p95 requirement from `D-030`. Changed fixed-suite rankings receive a case-level review before release.

Alternatives rejected or deferred: returning a generic icon for every input; arbitrary substring matching; sending free searches to a general-purpose model; claiming complete natural-language coverage; expanding every language equally without traffic or failure evidence.

Superseded decisions: none. `D-033` remains the release synchronization rule, and `D-030` remains the performance and promotion boundary.

Specification change: version 1.18 adds `FR-50` and the broad deterministic meaning-coverage contract.

### D-035: Search maintenance mode and adaptive restart gate

Date: 2026-07-22
Status: Accepted

Decision: version 0.4.20 closes the active Search v2 coverage push and becomes the deterministic maintenance baseline. Normal product development moves back to the controlling SI v2 roadmap. Search remains monitored and may receive small reviewed meaning, ranking, localization, or metadata corrections when production evidence shows a repeated useful gap. Unbounded dictionary expansion is not a maintenance strategy.

The next bounded search experiment, when scheduled, is an agent-cooperative zero-result contract and a privacy-safe recovery scorecard. The contract may add suggested visual queries, a recommended tool, a single-retry limit, and a clear next step. The scorecard must distinguish genuine top-level agent queries from internal recommendation variants, icon lookups, scripted checks, noise, and unsupported text. It measures whether the same session recovers within the next two tool calls, how long recovery takes, which client and locale are involved, and whether reviewed samples show wrong confident results. This work is not a prerequisite for the released 0.4.20 baseline and is not yet implemented.

Embedding phases `P3` through `P6`, a request-time query encoder, and an internal LLM or agent fallback remain paused. They resume only through a new accepted decision after the recovery scorecard shows a persistent meaningful gap that guided deterministic retries do not close. Any proposal must compare deterministic suggestions, caller-agent reformulation, compact multilingual retrieval, and a bounded model-assisted reformulator against the same evidence set. It must define privacy, latency, cost, abuse, caching, evaluation, and rollback boundaries before implementation.

Reason: exhaustive phrase storage is not the limiting factor. The larger risks are maintenance burden, ambiguous mappings, ranking collisions, duplicated reasoning when the caller is already an agent, and a new variable-cost network dependency. The stable release already supplies deterministic local-first search, context-aware recommendation, clarification, structured errors, broad English meanings, and maintained multilingual coverage. Evidence should now decide whether another search architecture is justified.

Evidence required for reconsideration: a bounded recovery report with stable denominators and known telemetry limits; a reviewed sample of unresolved meaningful queries; session-level recovery results; client and locale segmentation; false-relevance review; and an explicit comparison showing why the existing deterministic and caller-agent paths are insufficient.

Alternatives rejected or deferred: continuing manual coverage as a primary workstream; promising an icon for every possible word; starting embeddings merely because the release is complete; adding a DeepSeek or other model call to every search; surprising the local npm package with a new network dependency; relying on one capable agent session as proof that every client recovers.

Superseded decisions: none. `D-021` remains active and is reaffirmed. `D-034` governs deterministic coverage maintenance. `D-033` governs synchronized releases.

Specification change: version 1.19 adds `FR-51` and the evidence-driven maintenance and adaptive-restart boundary.

### D-036: Hosted search route repair

Date: 2026-07-23
Status: Accepted

Decision: the Railway hosted MCP `search_icons` tool and public `/search-icons` endpoint use the established hosted variant engine as their primary retrieval path. The packaged local engine runs only after the hosted engine returns a valid no-result. Hosted dependency errors remain visible. `recommend_icons` keeps the local-first route accepted in `D-032`.

The response and telemetry use `hosted` when the hosted engine answers and `local_fallback` when the packaged engine recovers a valid hosted zero. The public endpoint continues to omit SVG and protected semantic data. The MCP URL, tool names, inputs, npm package version, website, and submitted ChatGPT app configuration do not change.

Reason: live version 0.4.20 traffic showed a severe multiword false-zero regression after the packaged fallback ranker replaced the hosted variant pipeline. Confirmed failures included `hard hat construction worker`, `network proximity graph nodes`, `tow truck`, and `verification audit shield check`. The web app appeared healthier because its browser layer retained local query-variant results after a Railway zero. Route and fingerprint gates proved surface consistency but did not compare real agent-style product behavior.

Evidence required: the exact candidate and live deployment pass judged multiword relevance, forbidden-result, multilingual, strict-library, honest no-result, MCP-to-public-HTTP parity, browser-safe payload, agent-readable error, preview, recommendation, latency, and fixed 225-case checks. A failed live product case restores the prior Railway deployment. No npm or Netlify mutation is part of this repair.

Alternatives rejected or deferred: adding one synonym per failed phrase; returning broad unrelated filler; hiding hosted dependency failures behind local results; changing recommendation routing during the incident; publishing a replacement npm version before hosted recovery is proven.

Superseded decisions: `D-033` is superseded only where it requires Railway `search_icons` to use the packaged local engine first. Its npm, web-data, versioning, and independent rollback rules remain active. `D-032` remains active for Railway recommendations.

Specification change: version 1.20 adds `FR-52` and the hosted search repair boundary.

### D-037: Hosted search incident closure and local package repair

Date: 2026-07-23
Status: Accepted

Decision: hosted search requires the hosted variant engine to return successfully before any result is accepted. Packaged local retrieval may run concurrently, then contribute reviewed candidates to a `hosted_fused` response or recover a valid hosted no-result as `local_fallback`. A hosted network or server error remains an error and cannot be converted into a local success.

Live release checks use a signed, time-bounded controlled-run marker. Only a verified marker receives the test classification, so release probes do not contaminate normal search measurements. The local npm repair ships as immutable successor version 0.4.21 because npm does not permit replacing published 0.4.20 bytes. The hosted MCP address, tool names, website configuration, and submitted ChatGPT app configuration remain unchanged.

Reason: the first hosted route repair removed the severe multiword false zeros but still hid hosted failures inside a lower routing layer, reported the wrong route, and admitted live probes into normal telemetry. Broader testing also found weak ranking and localized misses. One bounded incident closure fixed those contract failures and applied the same reviewed query understanding to hosted and local package search.

Evidence required: the exact source and package archive pass forced hosted-error propagation, route attribution, controlled-marker authentication, 225 fixed cases, public-boundary checks, exact package inspection, clean-installed stdio parity, and a judged product matrix covering the confirmed English, Spanish, Japanese, and Portuguese failures. The live Railway deployment must pass the same HTTP and MCP matrix with ordered-reference parity and retain honest no-results.

Alternatives rejected or deferred: silently using local results during hosted failure; trusting a user-agent string as a test marker; rewriting published npm 0.4.20 bytes; changing the MCP URL or resubmitting the ChatGPT app; treating every nonzero response as relevant.

Superseded decisions: `D-036` remains active for hosted-primary search and local-first recommendations. This decision narrows its route-label contract by adding `hosted_fused` and authorizes the immutable npm successor that the first emergency repair deferred.

Specification change: version 1.21 expands `FR-52` and adds `FR-53`.

### D-038: Final search outcomes and episode identity

Date: 2026-07-24
Status: Accepted

Decision: search telemetry uses three identity levels. A `recovery_chain_id` may connect more than one real product action. An `episode_id` identifies one committed website search or one MCP tool call. An `attempt_id` identifies internal local, hosted, translated, fallback, retry, or diagnostic work inside one episode.

Each eligible episode produces at most one final top-level outcome. The browser search coordinator owns the meaning of the final website result because it knows the merged result shown to the person. A trusted server validates and stores that result. Hosted and Local MCP keep one final tool outcome per tool call. Internal attempts remain linked diagnostics and never enter headline search totals, channel-adoption totals, or the true-zero denominator.

The client entry point continues to determine channel under `D-029`. Website episodes use `web`, remote MCP tool calls use `hosted_mcp`, and installed stdio package calls use `local_mcp`, even when they share search services or use fallback routes. `search_request_audit` keeps the allowance unit accepted by `D-030` and does not become the final-outcome ledger.

The website input debounce remains 150 ms, the countable-search idle interval remains 2,500 ms, and the website fetch keeps its current network behavior. A 20-second observation deadline may record an incomplete diagnostic but cannot abort search, freeze results, or create a top-level zero. Superseded and incomplete website episodes are not KPI outcomes. Telemetry failure remains non-blocking.

Historical browser snapshots are incomplete before the verified Web cutover. Stable Local MCP coverage is incomplete before the verified Local MCP cutover because the existing database function suppresses some stable searches. No exact historical backfill is allowed. Reports crossing either cutover must show a warning.

The future recovery experiment accepted by `D-035` must use a distinct `episode_id` for every tool call, an `attempt_id` for internal work, and a `recovery_chain_id` only to connect later product actions. Recovery measurement cannot collapse an initial miss and a later retry into one ordinary search count.

Reason: production evidence showed a successful website search represented by a premature browser snapshot, a hosted zero, and a successful translated retry, while the dashboard omitted ordinary browser search rows and could present the internal zero as the product outcome. The same audit found stable Local MCP outcomes suppressed. These defects prevent trustworthy channel totals and zero rates without proving a Search v2 ranking failure.

Evidence required: additive schema and rollback checks; deterministic website, Hosted MCP, and Local MCP episode tests; one final event per eligible episode; linked internal attempts; unchanged search responses, ordered icon references, timing constants, and result fingerprints; unchanged `search_request_audit` row counts and allowance cost; server-controlled trusted classifications; dashboard and export parity; and verified independent Web and Local MCP cutover timestamps.

Alternatives rejected or deferred: treating hosted attempts as website outcomes; promoting legacy browser snapshots to final events; deduplicating by query text and time; manufacturing a historical backfill; changing Search v2 ranking or website timeouts; silently republishing an existing npm version; and using the allowance ledger as the KPI ledger.

Superseded decisions: none. `D-029`, `D-030`, `D-035`, `D-036`, and `D-037` remain active. This decision enforces their channel, allowance, maintenance, and serving boundaries.

Specification change: version 1.22 adds `FR-54` and the final-outcome telemetry contract.

### D-039: Icon popularity inputs and ordering

Date: 2026-07-25. Status: Ratified by the owner.

Decision: the public All Icons ranking counts only confirmed takes as use, meaning copy, download, and fetch. Preview and search-result exposure are explicitly not use. Icons with no use evidence are ordered alphabetically grouped by library, and the interface shows a visible divider at the point where evidence-backed ranking stops.

Evidence: `icon_scores` held 162 rows against 21,000+ icons on 2026-07-25, all stamped 2026-04-18, so coverage is under 1% and will remain sparse. Ranking the unevidenced tail by any use-derived score would fabricate an ordering. The 2026-07-25 production audit found 87% of queries are unique, so query frequency is noise while confirmed icon takes aggregate densely.

Alternatives rejected: counting previews or search appearances as use, which would let icons become popular by appearing rather than being chosen; retaining the April snapshot order for the unevidenced tail, which mixes stale and fresh scores; owner hand-curation of roughly 19,800 icons.

Superseded decisions: none.

Specification change: recorded against `docs/supericons-cross-channel-icon-popularity-prd-2026-07-25.md`, which carries these as build inputs.

### D-040: Popularity population must be stated

Date: 2026-07-25. Status: Ratified by the owner.

Decision: any public popularity surface states the population it represents rather than implying universal popularity.

Evidence: the 2026-07-25 production audit found 607 of 629 hosted identities, 96.5%, arrive through a single client. "Most used" therefore currently means "most used by ChatGPT users." Presenting it as general popularity would breach VC-6.

Superseded decisions: none.

### D-041: Traffic classification is evidence-gated before build

Date: 2026-07-25. Status: Ratified by the owner.

Decision: no probe-detection machinery is built until the existing `traffic_class` distribution is measured. If signed controlled-run labelling already separates most non-organic traffic, the build is skipped. Classification never rests on estimated-identity count alone, requires at least two independent supporting signals, and preserves a reported `unknown` class.

Evidence: `classifyMcpTraffic` (`mcp/usage-event-detail.js:36`) already labels every event and already treats the cryptographically verified controlled-run marker as authoritative. The originating hypothesis, that six estimated identities on one rare query implied six users, was disproved by audit: that row carried 4 IP hashes, 5 user agents, 4 client families, and 3 countries within four hours. Identities are client or network configurations, not people.

Alternatives rejected: building detection unconditionally; forcing every row into a binary organic or probe classification.

Superseded decisions: none.

Specification change: `docs/supericons-t1-traffic-classification-rules-2026-07-25.md`.

### D-042: Demand Inbox is restored

Date: 2026-07-25. Status: Ratified by the owner.

Decision: the Demand Inbox is restored from git into the v2 dashboard as its own small task, rather than rebuilt fresh or deferred into the later Gap Report.

Evidence: it was removed unintentionally on 2026-07-17 in commit `5f84df33a`, a dashboard rebuild that deleted 6,861 lines, and not by any product decision. Its value is demonstrated: a user request surfaced through it led to shipped Cybertruck icons. The prior implementation remains recoverable at `5f84df33a^`.

Alternatives rejected: rebuilding fresh at higher cost; deferring into the Gap Report, which would remove the demand view for months.

Superseded decisions: none.

### D-043: Channel diversification becomes a tracked track

Date: 2026-07-25. Status: Ratified by the owner.

Decision: channel diversification is a tracked workstream on the roadmap rather than informal effort.

Evidence: the 2026-07-25 production audit measured 96.5% of hosted identities arriving through one directory listing. This concentration does not depend on identity precision, unlike any conversion measure. A ranking or policy change in that single catalog would remove most current traffic. The track requires no engineering hours and therefore does not compete with the build queue.

Alternatives rejected: continuing informally, which has worked but keeps slipping out of every plan.

Superseded decisions: none.

## Adding or superseding a decision

Every new entry must include:

- stable ID;
- date and status;
- decision statement;
- evidence or rationale;
- alternatives rejected or deferred when material;
- decisions superseded, if any; and
- the canonical specification change made in the same commit/change set.
