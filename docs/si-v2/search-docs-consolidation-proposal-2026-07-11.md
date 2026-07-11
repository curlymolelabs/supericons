# Search docs consolidation proposal

Date: 2026-07-11

Status: executed on 2026-07-11; retained as the consolidation design record

Result: the approved source-of-truth set is in [`search/`](search/). Current requirements are in [`search-engine-v2.md`](search/search-engine-v2.md), resolved choices are in [`decisions.md`](search/decisions.md), verified delivery state is in [`implementation-status.md`](search/implementation-status.md), and the frozen extraction ledger is in [`consolidation-traceability.md`](search/consolidation-traceability.md).

Goal: one source of truth for the v2 search engine so building can start now, MCP-first, without losing requirements scattered across four generations of docs.

---

## 1. Current state: four generations of search planning

| generation | doc | status |
|---|---|---|
| 1 | `docs/supericons-search-quality-implementation-plan-2026-06-29.md` | deterministic quality loop; partially implemented; current deployment state requires separate evidence |
| 2 | `docs/supericons-semantic-search-v2-prd-implementation-plan-2026-07-01.md` | hybrid + pgvector plan; evaluation seed, document builder, and migration draft implemented and locally verified; vector ranking not implemented |
| 3 | `docs/supericons-semantic-search-v2-intent-graph-refinement-prd-2026-07-01.md` | intent graph and opt-in query-frame diagnostics implemented and locally verified; not connected to default ranking by the cited evidence |
| 4 | `docs/si-v2/PRD-si-v2-search-engine.md` | latest schema-era design draft; no implementation is specifically verified against this document |

Adjacent docs that stay separate (referenced, never absorbed):

- `docs/si-v2/supericon-schema-v1.md` (record shape and tiers)
- `docs/si-v2/PRD-si-v2-blueprint.md` (rings, gates)
- `docs/registry/registry-projection-contract.md`, `semantic-registry-maintenance.md`, `supabase-registry-schema-design.md` (data-layer contracts)
- `docs/supericons-ai-logo-profile-search-prd-2026-06-26.md`, `docs/cjk-search-quality.md`, `docs/mcp-hosted-search-*.md` (narrower shipped concerns)

Problems: generations 2 and 4 propose conflicting document-type sets and conflicting phase plans; generation 4 does not cite generations 2-3 or their implemented artifacts; requirements exist in only one doc each (meaning graph, `recommend_icons`, gap taxonomy, Icons Lab bridge in gen 2; projection tiers, gated leakage rule, `why_it_fits` payload, taste-gate loop in gen 4).

---

## 2. Proposed organization

### Keep folders, add one subfolder. No renames.

`docs/si-v2/` is already the v2 program home and the README already establishes reading order. Renaming existing folders or moving old docs breaks relative asset links (the gen 2-3 docs embed images from `docs/assets/semantic-search-v2/`) and inbound references from other docs. So:

```text
docs/si-v2/
  README.md                       (update index)
  PRD-si-v2-blueprint.md          (unchanged)
  supericon-schema-v1.md          (unchanged, but fix the undefined `live` section in the kind matrix)
  v2-living-map-vision.md         (unchanged)
  design-record-schema-v1-proposal.md (unchanged)
  search/                         (NEW: the search source of truth)
    search-engine-v2.md           (canonical spec)
    decisions.md                  (decision log, append-only)
    implementation-status.md      (phase -> artifacts -> verification ledger)
    consolidation-traceability.md (frozen, non-normative consolidation evidence)
  search-docs-consolidation-proposal-2026-07-11.md (this file; retained as the design record)
```

### Supersede in place, do not move

Add a banner to the top of each superseded doc (generations 1-4 above):

```markdown
> SUPERSEDED 2026-07-XX by docs/si-v2/search/search-engine-v2.md.
> Kept for history. Do not extend this document.
```

Generation 4 (`PRD-si-v2-search-engine.md`) is also superseded by the new canonical spec; its content is the freshest input but it should not remain a second live spec. Update `docs/si-v2/README.md` reading order to point at `search/search-engine-v2.md` instead.

Old docs can move to `docs/archive/` in a later cleanup pass, together with their assets, once nothing links to them. Not required to start building.

### Why four files instead of one

- `search-engine-v2.md` changes rarely (architecture, data model, requirements, phase plan).
- `implementation-status.md` changes every build session; keeping it separate stops status churn from rewriting the spec.
- `decisions.md` records resolved contradictions with dates and reasons so future sessions do not relitigate them.
- `consolidation-traceability.md` is frozen audit evidence. It is not an authority and must not be edited to change requirements after consolidation.

Authority rule:

- `search-engine-v2.md` controls intended behavior.
- Verified code, deployment records, and production checks control what currently exists.
- `implementation-status.md` reports that evidence without defining future behavior.
- A decision is not active until `search-engine-v2.md` is updated in the same change.
- If a linked schema or registry contract conflicts with the search spec, that contract owns its field/data definition and the search spec owns how search consumes it; the conflict must be resolved explicitly rather than silently overridden.

---

## 3. What to extract into `search-engine-v2.md`

### From generation 2 (2026-07-01 implementation plan): the backbone

- Current-architecture summary with verified table/RPC/handler names
- Data model: `icon_search_semantic_documents` exactly as implemented; audit extension fields
- FR1-FR12 (renumber into one requirement list)
- Feature flag names (`SEARCH_SEMANTIC_V2_SHADOW`, `_ENABLED`, `_RERANKER_ENABLED`)
- Test plan, fixture queries, metrics (primary, supporting, guardrail)
- Production safety requirements and deploy-approval gates
- Phases as the base sequence (0-8), with 0-1 marked done

### From generation 3 (intent-graph refinement): the query layer

- Query frame spec and intent-graph data flow (implemented in the workspace and locally verified: `lib/search-query-frame.js`, `data/search-intent-graph/`)
- Online fast path vs offline learning loop split
- Implemented-files list into `implementation-status.md`

### From generation 4 (si-v2 PRD): the schema-era layer

- Public / gated / search projection model and the paid-leakage requirement, pinned as a concrete rule: gated-derived documents may influence retrieval and ranking, but explanation text (`matched_concepts`, `why_it_fits`) may only contain tokens from public fields or the user query
- MCP result payload shape: `icon_ref`, full library names, `why_it_fits`, `matched_concepts`, `use_when`, `avoid_when`, confidence
- `surface` parameter, public-safe opt-in `include_query_frame`, and separate admin-only `debug_intent`
- Admin taste-gate learning loop (reviews promote schema-field changes, not one-off aliases)
- Target-user framing (human, MCP agent, admin, future creator)
- Ring mapping: state explicitly which search phases belong to which blueprint ring and gate

### From generation 1 (search-quality plan): the review loop

- Failed-query review workflow and gap classification, merged with generation 2's gap taxonomy (`metadata_gap`, `intent_gap`, `relationship_gap`, `library_filter_gap`, `new_icon_gap`, `abuse_or_noise`)
- Icons Lab brief export shape (from gen 2 Phase 7)

---

## 4. Contradictions the consolidation must resolve (into `decisions.md`)

1. **Document types.** Adopt exactly the implemented set: `identity`, `meaning`, `visual`, `domain`, and `negative`. Locale remains a dimension on those documents. Localized aliases are source inputs that generate localized identity or meaning documents; a sixth document type requires a later decision and migration. Drop the gen 4 seven-type table (`action`, `relationship`, `locale`); action and relationship content folds into `meaning`/`domain` documents and graph edges.
2. **Meaning graph vs record mind-map.** Short term: the `icon_search_relationships` table (gen 2) seeded from known demand. Long term: edges generated from SI v2 record fields (`mindmap.associations`, `anti_associations`, `distinct_from`) as records adopt the schema. The table is the runtime shape; records become its source. Record the migration intent.
3. **One phase plan.** Merge the earlier phase plans into one sequence: baseline and library/recommendation contracts; shared query understanding; search projection; offline embeddings; shadow retrieval/fusion; MCP beta; web beta; feedback and Icons Lab loop. Embeddings may proceed offline in parallel, but public ranking waits for the baseline, exact-match, latency, and leakage gates. MCP endpoints ship first, matching the SI v2 blueprint.
4. **Gated explanation rule.** Public explanations may make claims only from public fields, public search documents, approved public templates, and the user's query. Gated fields may influence internal retrieval or scores but may not contribute facts, distinctive wording, quoted terms, or explanation reasons. Add gated sentinel fixtures that must never appear in public output.
5. **Evaluation set size.** Gen 2 specifies a 225-query target and 28 exist. Build a stratified fixed suite plus a rolling production-derived suite. Cover web/MCP, tool, library setting, locale, exact brand, UI concept, long query, and likely automation. Require owner-scored useful families and unacceptable results; do not treat raw audit frequency as relevance ground truth.
6. **Public diagnostics versus privileged debug.** Keep the implemented opt-in `include_query_frame` as a compact public-safe interpretation summary. Reserve `debug_intent` for privileged candidate lanes, scores, gated signals, and ranking details; omit it entirely from public hosted MCP.
7. **Locale strategy.** Keep locale as a document dimension. Evaluate a multilingual embedding model over current documents plus existing dictionaries against localized identity/meaning documents for proven high-value aliases. Do not select a production model or create a new document type until the evaluation evidence supports it. Per-locale full document generation remains deferred.

---

## 5. Requirement disposition table (the safety mechanism)

To guarantee nothing silently disappears, the consolidation must produce an appendix table listing every requirement/FR/phase/open-question from all four source docs with a disposition:

| source | item | disposition |
|---|---|---|
| gen 2 | FR7 meaning graph | merged (decision 2) |
| gen 4 | W2 confidence handling | merged |
| ... | ... | kept / merged / dropped (reason) |

A reviewing agent should verify this table against the source docs rather than re-reading prose diffs. Use source-prefixed identifiers such as `G1-FR1`, `G2-FR1`, `G3-FR1`, `G4-W1`, and `G4-M1`. Include requirement atoms hidden in goals, non-goals, data constraints, acceptance gates, metrics, security rules, and payload examples. Every row must link to a canonical requirement or decision; dropped items require a reason and owner approval. The matrix is dated, frozen, and non-normative after consolidation.

---

## 6. Suggested execution order

1. Approve this proposal (adjust folder/file names as desired).
2. Preserve a sanitized query baseline in `references/verification/search-query-baseline-2026-07-11.md`; keep the raw admin export private.
3. Consolidate: write `search/search-engine-v2.md`, `decisions.md`, `implementation-status.md`, plus frozen `consolidation-traceability.md`.
4. Add SUPERSEDED banners to generations 1-4; update `docs/si-v2/README.md`.
5. Independent review pass: check the traceability matrix for orphaned requirement atoms, verify lifecycle states against evidence, check internal links, and scan public outputs for gated/private data.
6. Fix the schema kind-matrix `live` section bug in `supericon-schema-v1.md` as a separate change.
7. Start building: finish the stratified baseline and shared query/recommendation contract, build embeddings offline, run shadow fusion, then ship an MCP-first beta behind flags.
