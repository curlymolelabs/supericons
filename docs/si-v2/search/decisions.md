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

## Adding or superseding a decision

Every new entry must include:

- stable ID;
- date and status;
- decision statement;
- evidence or rationale;
- alternatives rejected or deferred when material;
- decisions superseded, if any; and
- the canonical specification change made in the same commit/change set.
