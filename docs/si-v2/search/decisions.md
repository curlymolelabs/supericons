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

## Adding or superseding a decision

Every new entry must include:

- stable ID;
- date and status;
- decision statement;
- evidence or rationale;
- alternatives rejected or deferred when material;
- decisions superseded, if any; and
- the canonical specification change made in the same commit/change set.
