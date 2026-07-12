# Search v2 offline embedding experiment contract

Date: 2026-07-12

Status: approved through sample planning; provider calls remain separately gated

Authority: experiment protocol only. [`search-engine-v2.md`](../search-engine-v2.md) remains the product and technical specification. This document does not select a provider or model and does not authorize deployment.

Current candidate research: [`embedding-candidate-shortlist-2026-07-12.md`](embedding-candidate-shortlist-2026-07-12.md).

## Problem statement

The deterministic search layer now handles approved meanings, ambiguous terms, brand collisions, and library behavior, but it cannot reliably retrieve icons for every long, unfamiliar, or multilingual query. Search v2 needs an embedding model that improves those cases without weakening exact matches, exposing private data, increasing latency beyond an approved budget, or making rollback difficult.

The model choice is unresolved in `OQ-02`. It must be decided through a repeatable multilingual quality, latency, cost, and rebuild experiment.

## Target user

The primary user is a person or agent searching for an icon by meaning, task, or UI slot rather than by an exact library name. The user needs useful results quickly and needs an honest fallback when semantic retrieval is unavailable or uncertain.

## Goals

- Select one embedding configuration using measured search quality, multilingual usefulness, latency, cost, and operational safety.
- Verify that embeddings can be generated incrementally from the five approved semantic document types.
- Prove that an embedding version can be disabled and removed without deleting source documents or breaking deterministic search.
- Produce evidence that is sufficient to resolve `OQ-02` before P4 shadow ranking begins.
- Add locale counts to the next sanitized search analytics export so multilingual evaluation priorities can be adjusted with real demand evidence.

## Non-goals

- Do not change public ranking during this experiment.
- Do not deploy a vector lane, publish an MCP package, or enable a feature flag for users.
- Do not replace exact, lexical, maintained-intent, brand, or library policy lanes.
- Do not introduce a sixth semantic document type.
- Do not create thirteen full localized document projections without measured evidence.
- Do not use raw private prompts, IP addresses, user-agent strings, API keys, or private notes as embedding input or public evidence.

## Candidate configurations

Test at least three currently supported multilingual embedding configurations:

1. A retrieval-focused multilingual model intended to maximize quality.
2. A smaller multilingual model intended to reduce latency and cost.
3. A second provider or meaningfully different model family to reduce single-provider bias.

For every candidate, record:

- provider and exact model identifier;
- vector dimensions and any supported dimension reduction;
- normalization and distance function;
- maximum input length and truncation rule;
- batch limits and retry behavior;
- regional or data-handling constraints;
- price basis, full rebuild estimate, and incremental update estimate; and
- deprecation or version-pinning policy.

Candidate names must be verified against current official provider documentation immediately before the experiment. The largest vector is not assumed to be the best configuration.

## Evaluation set

### Core set

Use the fixed owner-reviewed suite plus a clearly separated rolling production-derived set. Model selection cannot be final while the core suite still contains unreviewed expected results.

The experiment report must give results for each query class, surface, tool, library mode, and locale rather than only one overall score.

### Multilingual tiers

Build and owner-review these tiers before selecting a model:

| tier | locales | required coverage |
| --- | --- | --- |
| CJK dictionary ground truth | `zh-Hans`, `zh-Hant`, `ja`, `ko` | Native queries mapped to approved concepts using current public dictionaries; include short nouns, actions, UI slots, and long concepts. |
| European language retrieval | `es`, `pt`, `de` | Native queries, regional wording where relevant, accents, compounds, and word-order variation. Portuguese cases must identify the intended locale. |
| Complex-script retrieval | `ar`, `hi`, `th`, `vi` | Native-script queries, spacing or token-boundary variation, and common UI concepts. |
| Mixed-script and identity | Applicable locales | Brand plus native concept, Latin product name plus local UI term, digits, punctuation, and transliterated input. |

Each locale tier must contain:

- exact identity canaries;
- common UI concepts;
- long or compound concepts;
- negative-meaning separation;
- a recommendation task and slot; and
- at least one honest low-confidence or gap case.

The three English placeholder translations in the legacy suite must be replaced with real native queries before they count toward multilingual quality.

## Functional requirements

### ER-01: deterministic document input

Embed only the approved generated semantic documents. Each vector must link to the document ID, document type, locale, content hash, provider/model identifier, embedding version, and creation or update time.

Acceptance signal: two runs over unchanged inputs produce the same embedding work plan and schedule zero unchanged documents for re-embedding.

### ER-02: isolated version storage

Store embedding versions separately from source documents. Two candidate versions must be able to coexist during comparison.

Acceptance signal: activating, deactivating, or deleting a candidate version does not alter semantic source documents.

### ER-03: bounded generation

Batching, retries, concurrency, truncation, and failure records must be explicit and repeatable.

Acceptance signal: an interrupted batch resumes without duplicating completed work and produces a reconciled success, skip, and failure count.

### ER-04: offline retrieval comparison

Compare deterministic-only, vector-only, and deterministic-plus-vector candidate results without changing served ranking.

Acceptance signal: every evaluated result records candidate source, rank, document type, locale, and model version in a private local experiment artifact. Public evidence contains only safe aggregates and approved examples.

### ER-05: policy boundary

All future vector candidates must pass through the same final policy boundary used by current lexical and intent candidates.

Acceptance signal: a synthetic vector candidate carrying an avoid-listed reference cannot bypass policy filtering or claim top rank.

### ER-06: failure and rollback

Timeout, provider error, malformed vector, missing version, and disabled semantic-lane cases must return deterministic results.

Acceptance signal: failure injection proves the request completes through deterministic fallback, and the active embedding version can be rolled back without deleting source documents.

### ER-07: locale evidence

The next sanitized analytics export must include aggregate query counts by locale, surface, tool, and library mode, including an explicit unknown-locale bucket.

Acceptance signal: locale totals reconcile with the overall sanitized query denominator, and sparse or unknown attribution remains visible.

### ER-08: locale-aware generic instructions

Handle common icon-search instructions and filler phrases by locale during deterministic query backoff and multilingual evaluation. Examples include `icono de`, `ícone de`, `图标`, `アイコン`, and `아이콘`. Suppression must be phrase-aware or context-aware so a translated word with real concept meaning is not removed blindly.

Acceptance signal: approved native queries keep their intended concept terms after backoff; generic instruction wording does not create zero results or dominate semantic similarity; and paired fixtures prove both suppression and preservation behavior.

## Success metrics

### Primary quality metrics

- Useful-family success in the top 3, reported overall and by evaluation tier.
- Exact approved identity canaries at rank 1.
- Negative or prohibited family appearance in the top 3.
- Honest low-confidence or gap behavior when no candidate reaches the approved relevance floor.

### Supporting metrics

- Mean reciprocal rank for cases with a preferred family.
- Useful-family coverage in the top 8 for intentionally diversified searches.
- Recommendation resolution or clarification outcome by query class.
- Full rebuild duration, changed-document rebuild duration, skipped unchanged documents, and failed documents.
- Query embedding latency by candidate and locale tier.
- Estimated cost per 1,000 query embeddings, full rebuild, and one-percent document refresh.
- Vector storage size and candidate fan-out.

### Guardrails

- Exact canaries must not regress.
- Blocked-alias and safety fixtures must have zero failures.
- Every reviewed locale with at least five cases may have at most one semantic failure.
- The aggregate reviewed multilingual pass rate must be at least 90 percent.
- No prohibited result may gain rank because it arrived from the vector lane.
- No locale tier may be hidden inside an overall average.
- Deterministic fallback must continue to work when vector retrieval is disabled, slow, invalid, or unavailable.
- No private or gated text may enter public evidence or embedding inputs.

## Selection rule

A winning configuration must:

1. preserve every approved exact rank-1 canary;
2. pass every blocked-alias and safety fixture;
3. pass all but at most one reviewed semantic case in every locale with at least five cases;
4. pass at least 90 percent of reviewed multilingual cases overall;
5. improve or hold useful-family top-3 quality overall;
6. improve at least one long-query or multilingual tier without a material regression in another tier;
7. pass policy-boundary, incremental-sync, failure-injection, and rollback checks;
8. fit the approved latency and cost budgets once `OQ-01` and the cost ceiling are resolved; and
9. have no unresolved public-safety or provider data-handling blocker.

If no candidate meets every rule, keep deterministic search as the served path and record the experiment as inconclusive. Do not select the least-bad candidate merely to advance the roadmap.

## Experiment sequence

1. Complete owner review of the 28 legacy evaluation cases. Completed 2026-07-12.
2. Replace the three translated placeholder queries with native-language fixtures. Completed 2026-07-12.
3. Expand and owner-review the multilingual tiers.
   Include paired localized filler-phrase fixtures and shorter concept-only controls for Spanish, Brazilian Portuguese, CJK, and complex-script tiers.
4. Verify current candidate models and prices from official provider documentation. Initial shortlist completed 2026-07-12; recheck required before paid execution.
5. Freeze the experiment inputs and record document and locale counts.
6. Generate candidate embeddings offline with separate versions.
7. Run deterministic, vector-only, and hybrid offline comparisons.
8. Run incremental update, interruption, failure-injection, policy-boundary, and rollback checks.
9. Publish a public-safe comparison report and retain detailed local evidence privately.
10. Record the selected configuration through an accepted decision and update the specification in the same change.

## Risks and dependencies

| risk or dependency | response |
| --- | --- |
| Owner review remains the evaluation bottleneck | Use the compact 28-case packet first, then review new multilingual cases in small batches. |
| Model catalogs or prices change | Verify official provider documentation immediately before execution and record the date. |
| Larger vectors improve benchmarks but increase cost | Compare dimension options and choose on measured end-to-end value. |
| English-heavy averages hide locale failure | Require per-tier reporting and prevent overall averages from satisfying a failed tier. |
| Vector candidates bypass current safety rules | Enforce and test the shared final policy boundary before P4. |
| Embedding inputs contain private text | Restrict inputs to approved public-safe semantic documents and scan exported evidence. |
| Full rebuild is too slow or expensive | Measure full and incremental rebuilds before model selection. |
| Provider failure affects served search | Keep the semantic lane independently disableable with deterministic fallback. |

## Open Questions

These questions require owner confirmation before the model-selection experiment can produce a final decision:

- What p95 query-embedding latency budget applies to hosted MCP, web, and local MCP?
- What full-rebuild and per-1,000-search cost ceilings are acceptable?
- Should native-speaker review become mandatory before public rollout, or remain a post-beta quality loop when meaning approval and language assurance are already recorded?
- Should Brazilian Portuguese be the first Portuguese ground-truth locale, with other variants added only when demand evidence supports them?

## Done criteria

This contract is ready to execute when:

- the owner approves the experiment scope and selection rule;
- legacy expected results are owner-reviewed, completed 2026-07-12;
- native multilingual fixtures replace the translated placeholders, completed 2026-07-12;
- multilingual fixtures record owner meaning approval, language assurance, and native-review state separately;
- current candidate models and provider constraints are verified;
- latency and cost ceilings are recorded; and
- the offline runner, versioned storage change, and rollback plan have implementation tasks.
