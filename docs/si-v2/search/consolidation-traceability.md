# Search Engine v2 Consolidation Traceability

Status: re-frozen consolidation evidence
Initially frozen: 2026-07-11
Reference correction: 2026-07-11
Independent semantic audit: passed and recorded 2026-07-11 (see Independent audit record below)
Authority: non-normative; use [search-engine-v2.md](search-engine-v2.md) for current requirements and [decisions.md](decisions.md) for settled decisions.

Correction note: the first structural audit verified source-ID coverage, counts, file existence, and links, but did not verify the meaning of every destination pointer. This correction re-derived each destination against version 1.0 of `search-engine-v2.md`. The independent audit below completed the semantic review, and the file is re-frozen.

## Independent audit record

Performed 2026-07-11 by a second agent working from its own full read of specification version 1.0 and the four source documents. Scope and method:

- Forward check: all 252 rows read; every row's destination identifiers checked against the specification's final numbering. All 11 destination errors found in the first audit are confirmed fixed. Roughly 50 rows received deep verification, including every previously incorrect row.
- Source-atom fidelity: the corrected source texts for the G1 phases, G1-OQ-06, G3-DEC-06, and the G2 phases were checked against the source documents and match the sources' actual headings and wording.
- Reverse check: every `G-01` through `G-08`, `NG-01` through `NG-08`, `FR-01` through `FR-26`, and `OQ-01` through `OQ-08` was confirmed to have at least one historical ancestor row. The note that `D-001`, `D-002`, and `D-015` originate from the consolidation process itself is accurate.
- Counts independently recomputed: 39 (G1) + 75 (G2) + 51 (G3) + 87 (G4) = 252 atoms across 6 + 8 + 8 + 10 = 32 groups.
- Punctuation: zero U+2013 or U+2014 characters remain in the active consolidation files, the specification, the decision log, the status ledger, the baseline record, the proposal, the README, and AGENTS.md.
- The specification header remains version 1.0 and its requirement set is unchanged by the correction.

Verdict: the matrix is accurate as frozen evidence. Future requirement changes belong in the specification and decision log, not here.

This ledger shows how the four earlier search-document generations were handled. It exists to make omissions and deliberate changes reviewable without treating historical wording as current product authority.

## Source aliases

| Alias | Source |
|---|---|
| G1 | `docs/supericons-search-quality-implementation-plan-2026-06-29.md` |
| G2 | `docs/supericons-semantic-search-v2-prd-implementation-plan-2026-07-01.md` |
| G3 | `docs/supericons-semantic-search-v2-intent-graph-refinement-prd-2026-07-01.md` |
| G4 | `docs/si-v2/PRD-si-v2-search-engine.md` |

## Disposition meanings

- **Kept**: retained with substantially the same intent.
- **Merged**: combined with overlapping requirements or expressed at a different level.
- **Changed**: deliberately resolved differently; the decision record is cited.
- **Deferred**: valid work retained outside the first hybrid beta.
- **Dropped**: excluded with a stated reason.
- **Obsolete**: a historical implementation constraint that is no longer needed as a current requirement.
- **Open**: still requires a recorded decision or measured result.

Canonical references use `G-*`, `NG-*`, `FR-*`, `P*`, `OQ-*`, or `D-*` identifiers from the new source-of-truth set.

## G1: Search quality implementation plan

### Goals and non-goals

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G1-GO-01 | Improve long natural-language search without over-broad matching. | Kept | G-01; FR-02, FR-07 through FR-09, FR-21 |
| G1-GO-02 | Align web, hosted MCP, local MCP, and `recommend_icons`. | Kept | G-03; FR-02, FR-10 |
| G1-GO-03 | Keep search deterministic enough to test and debug. | Kept | Product principles; FR-02, FR-08, FR-09, FR-21, FR-22 |
| G1-GO-04 | Preserve exact brand/logo quality. | Kept | G-02; FR-03 |
| G1-GO-05 | Turn repeated misses into metadata or Icons Lab backlog work. | Kept | G-06; FR-16 through FR-20 |
| G1-NG-01 | Do not call a general LLM on every critical-path request. | Kept | NG-02 |
| G1-NG-02 | Do not let generic words become strong standalone fallbacks. | Kept | FR-02, FR-09, FR-21 |
| G1-NG-03 | Do not change pricing, affiliate links, or deployment flow. | Kept | NG-07; Constraints |
| G1-NG-04 | Do not create new icons in this implementation pass. | Kept | NG-06; FR-18; P7 may create reviewed briefs, not icons |
| G1-NG-05 | Do not expose private ranking, secrets, review notes, or process metadata. | Kept | NG-03; FR-25; D-007 |

### Functional requirements

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G1-FR-01 | Classify query shape before expansion. | Kept | FR-02; Query-frame contract |
| G1-FR-02 | Maintain a curated compound-phrase dictionary. | Merged | FR-02; P1 query-understanding inputs |
| G1-FR-03 | Build a ranked query-variant plan. | Kept | FR-02, FR-24 |
| G1-FR-04 | Suppress weak generic tokens during fallback. | Kept | FR-02, FR-09, FR-21 |
| G1-FR-05 | Preserve exact brand and logo matching. | Kept | FR-03 |
| G1-FR-06 | Share behavior across web and MCP. | Kept | FR-02 |
| G1-FR-07 | Align `recommend_icons` with shared interpretation. | Kept | FR-10 |
| G1-FR-08 | Classify search gaps. | Kept | FR-16 |
| G1-FR-09 | Produce reviewed Icons Lab backlog output. | Deferred | FR-18; P7 |
| G1-FR-10 | Turn real queries into regression fixtures. | Kept | FR-21 |
| G1-FR-11 | Keep diagnostics public-safe. | Kept | FR-13, FR-15, FR-25; D-006, D-007 |
| G1-FR-12 | Provide a maintainer review workflow. | Kept | FR-17 |

### Phases

| Source ID | Source phase | Disposition | Canonical destination or reason |
|---|---|---|---|
| G1-PH-01 | Build the foundation and real-query fixtures. | Kept | P0 and P1; FR-21 |
| G1-PH-02 | Build the intent dictionary and query-variant builder. | Kept | P1; FR-02 |
| G1-PH-03 | Align hosted web and MCP behavior. | Kept | P1; FR-02 |
| G1-PH-04 | Align local MCP and `recommend_icons`. | Kept | P1; FR-02, FR-10 |
| G1-PH-05 | Add gap classification and the Icons Lab bridge. | Deferred | P7; FR-16, FR-18 |
| G1-PH-06 | Add the review and release workflow. | Merged | P7; FR-17, FR-26 |

### Open questions

| Source ID | Question | Disposition | Canonical destination or resolution |
|---|---|---|---|
| G1-OQ-01 | Where should the reviewed search dictionary live? | Merged | FR-02 and existing source/runtime contracts; packaging remains an implementation detail |
| G1-OQ-02 | Should `gap_type` be public? | Changed | Public output is claim-safe and minimal; detailed diagnostics stay privileged; FR-15, FR-16, FR-25; D-007 |
| G1-OQ-03 | What score threshold defines weak results? | Open | OQ-04; calibrate from the fixed evaluation suite |
| G1-OQ-04 | Should recommendation use a separate interpreter? | Changed | Shared interpreter with surface-specific wrappers; FR-02, FR-10 |
| G1-OQ-05 | How much expansion fan-out is acceptable? | Open | OQ-01; FR-24 latency and candidate-budget guardrails |
| G1-OQ-06 | Which repeated gaps should become the first Icons Lab backlog items? | Deferred | FR-18 and P7; prioritization belongs to the reviewed learning loop |

### Metrics and gates

| Source ID | Atomic measure | Disposition | Canonical destination |
|---|---|---|---|
| G1-MET-01 | Lower the empty-result rate for long natural-language queries. | Kept | Primary and supporting metrics; G-01 |
| G1-MET-02 | Raise exact-match rate for AI tool/logo searches. | Kept | Primary metrics; G-02, FR-03 |
| G1-MET-03 | Reduce incorrect MCP narrowing to `simpleicons` when Supericons has the logo. | Kept | FR-03, FR-10, FR-11, FR-21; D-012 |
| G1-MET-04 | Convert more failed queries into metadata, intent, or Icons Lab actions. | Kept | Supporting metrics; FR-16 through FR-18 |
| G1-MET-05 | Avoid added noise for short exact searches. | Kept | Guardrails; FR-03, FR-21 |

## G2: Semantic Search v2 PRD and implementation plan

### Jobs, goals, and non-goals

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G2-JOB-01 | Find an icon from a natural-language concept. | Kept | Users and jobs; G-01 |
| G2-JOB-02 | Find a known icon by exact name or brand. | Kept | Users and jobs; G-02, FR-03 |
| G2-JOB-03 | Search in another language without manually translating to English. | Kept | Users and jobs; FR-23 |
| G2-JOB-04 | Let agents recommend by use case, meaning, and visual fit. | Kept | Users and jobs; G-01, G-03; FR-09, FR-10 |
| G2-JOB-05 | Return a useful fallback and create an Icons Lab opportunity when no icon fits. | Kept | Users and jobs; G-06; FR-12, FR-16, FR-18 |
| G2-JOB-06 | Give maintainers a repeatable failure-to-action decision process. | Kept | Users and jobs; G-06; FR-16, FR-17, FR-21 |
| G2-GO-01 | Improve long natural-language queries without adding short-query noise. | Kept | G-01 |
| G2-GO-02 | Align web, hosted MCP, local MCP, and `recommend_icons`. | Kept | G-03; FR-02, FR-10 |
| G2-GO-03 | Preserve exact quality for the Supericons logo set. | Kept | G-02; FR-03 |
| G2-GO-04 | Add vector retrieval using the Supabase-hosted architecture first. | Kept | G-01; FR-07; D-010 |
| G2-GO-05 | Add safer reranking that tests actual query fit. | Kept | G-01; FR-09 |
| G2-GO-06 | Support localized search through aliases, normalization, and embeddings. | Kept | G-01; FR-23; D-009 |
| G2-GO-07 | Turn weak and empty results into a measurable improvement loop. | Kept | G-06; FR-16 through FR-20 |
| G2-GO-08 | Preserve production behavior with flags, shadowing, rollback, and bounds. | Kept | G-07, G-08; FR-20, FR-22, FR-24, FR-26 |
| G2-NG-01 | Do not replace the existing web UI. | Kept | NG-01; FR-01 |
| G2-NG-02 | Do not create a separate semantic-search UI. | Kept | NG-01 |
| G2-NG-03 | Do not automate deployment or publication without approval. | Kept | FR-26; Constraints |
| G2-NG-04 | Do not move to Kubernetes in this iteration. | Obsolete | Historical infrastructure constraint; D-010 retains the relevant principle of limiting operational expansion |
| G2-NG-05 | Do not add a dedicated vector vendor unless pgvector fails gates. | Kept | NG-05; D-010; OQ-08 |
| G2-NG-06 | Do not call a general LLM on every critical-path request. | Kept | NG-02 |
| G2-NG-07 | Do not expose private data, secrets, review metadata, or hidden ranking. | Kept | NG-03; FR-25 |
| G2-NG-08 | Do not make public registry JSON the source of truth. | Merged | Authority and dependencies; G-04, FR-04 |
| G2-NG-09 | Do not hand-edit generated registry projections. | Merged | Authoritative dependencies and registry-maintenance contract; FR-04 |

### Functional requirements

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G2-FR-01 | Preserve current public APIs. | Kept | FR-01 |
| G2-FR-02 | Generate semantic documents from registry/catalog data. | Kept | FR-04, FR-05; D-003 |
| G2-FR-03 | Generate and sync embeddings only for changed content. | Kept | FR-06 |
| G2-FR-04 | Add bounded vector-candidate retrieval by library, locale, and type. | Kept | FR-07, FR-11, FR-23, FR-24; D-012 |
| G2-FR-05 | Merge lexical, registry, vector, and graph candidates in a shared flow. | Kept | FR-02, FR-08 |
| G2-FR-06 | Strengthen exact brand/logo matching. | Kept | FR-03 |
| G2-FR-07 | Add controlled meaning-graph expansion. | Kept | FR-08, FR-09; D-004 |
| G2-FR-08 | Add confidence and gap classification. | Kept | FR-12, FR-16 |
| G2-FR-09 | Align `recommend_icons` with the semantic candidate layer. | Kept | FR-10 |
| G2-FR-10 | Add labeled offline evaluation from real weak searches. | Kept | FR-21; D-008 |
| G2-FR-11 | Bound latency and cost drivers. | Kept | FR-24 |
| G2-FR-12 | Provide public-safe maintainer diagnostics. | Merged | FR-13, FR-15, FR-25; D-006, D-007 |

### Phases

| Source ID | Source phase | Disposition | Canonical destination or reason |
|---|---|---|---|
| G2-PH-00 | Freeze baseline, contracts, and evaluation set. | Kept | P0 |
| G2-PH-01 | Define and produce semantic documents. | Kept | P2 |
| G2-PH-02 | Generate and store embeddings offline. | Kept | P3 |
| G2-PH-03 | Add vector retrieval in shadow mode. | Kept | P4 |
| G2-PH-04 | Add deterministic fusion and reranking. | Kept | P4 |
| G2-PH-05 | Add the meaning graph. | Merged | P1 and P4; FR-08, FR-09; D-004 |
| G2-PH-06 | Align `recommend_icons` with search. | Changed | Shared interpretation starts in P1; MCP beta remains P5; D-014 |
| G2-PH-07 | Add the learning and review loop. | Deferred | P7 |
| G2-PH-08 | Run staged beta and production rollout. | Kept | P4 through P6; D-005 |

### Open questions

| Source ID | Question | Disposition | Canonical destination or resolution |
|---|---|---|---|
| G2-OQ-01 | Which embedding provider and model should be used? | Open | OQ-02 |
| G2-OQ-02 | What p95 latency budget is acceptable for web and MCP? | Open | OQ-01; FR-24 |
| G2-OQ-03 | Where should semantic diagnostics be visible? | Changed | Sanitized public opt-in versus privileged admin diagnostics; D-007 |
| G2-OQ-04 | Should reviews stay in `icon_query_reviews` or move to a richer queue? | Open | OQ-07; FR-17 |
| G2-OQ-05 | Which web events are useful and privacy-safe for relevance learning? | Open | OQ-03; FR-19, FR-20, FR-25 |
| G2-OQ-06 | Where should generated Icons Lab briefs live first? | Deferred | FR-18 and P7; storage location remains an implementation detail |
| G2-OQ-07 | How much localized alias generation should be automatic? | Changed | FR-23; D-009 and D-013 require evaluation and human approval before promotion |
| G2-OQ-08 | What evidence should trigger evaluation of a dedicated vector store? | Open | OQ-08; D-010; P4 benchmarks |

### Metrics, safety, and release gates

| Source ID | Atomic source intent | Disposition | Canonical destination |
|---|---|---|---|
| G2-MET-01 | Improve long-query relevance. | Kept | Primary metrics |
| G2-MET-02 | Preserve exact brand/name accuracy. | Kept | Primary metrics; G-02, FR-03 |
| G2-MET-03 | Improve MCP recommendation acceptance. | Kept | Primary metrics; OQ-03, FR-10, FR-19 |
| G2-MET-04 | Track empty-result rate by web versus MCP. | Kept | Supporting metrics |
| G2-MET-05 | Track low-confidence rate by query type. | Kept | Supporting metrics |
| G2-MET-06 | Track same-session query reformulation. | Kept | Supporting metrics |
| G2-MET-07 | Track time from search to copy/download. | Kept | Supporting metrics |
| G2-MET-08 | Track result click/copy/download rate. | Kept | Supporting metrics |
| G2-MET-09 | Track reviewed query clusters resolved per week. | Kept | Supporting metrics; FR-17 |
| G2-MET-10 | Guard p95 hosted-search latency. | Kept | Guardrails; FR-24 |
| G2-MET-11 | Guard Supabase function error rate. | Kept | Guardrails; FR-24 |
| G2-MET-12 | Guard rate-limit hit rate. | Kept | Guardrails; FR-24 |
| G2-MET-13 | Guard cost per 1,000 searches. | Kept | Guardrails; FR-24 |
| G2-MET-14 | Guard exact short-query regression rate. | Kept | Guardrails; FR-03, FR-21 |
| G2-MET-15 | Guard abuse/spam feedback rate. | Kept | Guardrails; FR-20 |
| G2-SAFE-01 | Keep schema changes additive until v2 is proven. | Kept | Constraints |
| G2-SAFE-02 | Keep the existing lexical candidate path available. | Kept | FR-22; D-011 |
| G2-SAFE-03 | Provide instant feature-flag fallback. | Kept | FR-22 |
| G2-SAFE-04 | Preserve CORS, rate-limit, and audit behavior in Edge changes. | Kept | FR-24; Constraints |
| G2-SAFE-05 | Keep secrets and internal metadata out of docs, generated files, packages, and logs. | Kept | FR-25; Constraints |
| G2-SAFE-06 | Require explicit approval for Netlify deployment. | Kept | FR-26; delivery constraint |
| G2-SAFE-07 | Require package verification and owner login before npm publication. | Kept | FR-26; delivery evidence gate |
| G2-SAFE-08 | Require owner approval and clean release guidance for Supabase deployment. | Kept | FR-26; delivery evidence gate |

## G3: Intent-graph refinement PRD

### Jobs, goals, and non-goals

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G3-JOB-01 | Resolve a vague phrase such as `ai slop` into relevant visual concepts. | Kept | G-01; FR-02 |
| G3-JOB-02 | Resolve adjectives such as `powerful` into useful icon concepts. | Kept | G-01; FR-02 |
| G3-JOB-03 | Parse long phrases into important objects, actions, domains, and avoid terms. | Kept | Query-frame contract; FR-02 |
| G3-JOB-04 | Preserve exact brand/name priority over broad semantic matches. | Kept | G-02; FR-03 |
| G3-JOB-05 | Return useful fallbacks and identify Icons Lab opportunities. | Kept | G-06; FR-12, FR-16, FR-18 |
| G3-GO-01 | Scale intent handling beyond one-off synonyms. | Kept | G-01; FR-02, FR-09 |
| G3-GO-02 | Align web, hosted MCP, local MCP, and `recommend_icons`. | Kept | G-03; FR-02, FR-10 |
| G3-GO-03 | Preserve fast public and agent search. | Kept | FR-24 |
| G3-GO-04 | Preserve exact logo and brand quality. | Kept | G-02; FR-03 |
| G3-GO-05 | Support localized phrases through the same intent graph where possible. | Kept | G-01; FR-23; D-009 |
| G3-GO-06 | Turn weak and empty results into review and Icons Lab workflows. | Kept | G-06; FR-16 through FR-20 |
| G3-NG-01 | Do not call a general LLM on every critical-path request. | Kept | NG-02 |
| G3-NG-02 | Do not ship model-proposed intent groups without human approval. | Kept | NG-04; FR-17; D-013 |
| G3-NG-03 | Do not replace the existing web UI. | Kept | NG-01; FR-01 |
| G3-NG-04 | Do not create a separate UI for this refinement. | Kept | NG-01 |
| G3-NG-05 | Do not deploy or publish automatically as part of the PRD. | Kept | FR-26; delivery constraint |
| G3-NG-06 | Do not move to Kubernetes for this refinement. | Obsolete | Historical infrastructure constraint; D-010 retains the relevant principle of limiting operational expansion |
| G3-NG-07 | Do not add a dedicated vector vendor unless pgvector fails gates. | Kept | NG-05; D-010; OQ-08 |
| G3-NG-08 | Do not expose private ranking, secrets, user data, or process metadata. | Kept | NG-03; FR-25 |

### Functional requirements

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G3-FR-01 | Define governed intent-source records. | Merged | FR-02, FR-17; D-013; query-understanding dependencies |
| G3-FR-02 | Build a deterministic query frame. | Kept | FR-02 |
| G3-FR-03 | Generate reviewed frame rules and vocabularies. | Kept | FR-02, FR-17; D-013 |
| G3-FR-04 | Retrieve against frame dimensions and semantic documents. | Kept | FR-07, FR-08 |
| G3-FR-05 | Fuse multiple frame and retrieval signals. | Kept | FR-08 |
| G3-FR-06 | Rerank with explicit intent-fit features. | Kept | FR-09 |
| G3-FR-07 | Produce confidence and gap classifications. | Kept | FR-12, FR-16 |
| G3-FR-08 | Use the same frame for recommendation. | Kept | FR-02, FR-10 |
| G3-FR-09 | Record and review frame-level learning signals. | Kept | FR-17, FR-19, FR-20 |
| G3-FR-10 | Return concise grounded match reasons. | Kept | FR-13, FR-15, FR-25 |
| G3-FR-11 | Make locale explicit in interpretation. | Kept | FR-23; D-009 |

### Phases and decisions

| Source ID | Source phase or decision | Disposition | Canonical destination or reason |
|---|---|---|---|
| G3-PH-01 | Establish intent sources and query-frame contract. | Kept | P1 |
| G3-PH-02 | Build deterministic query-frame parsing. | Kept | P1 |
| G3-PH-03 | Connect frames to semantic retrieval and reranking. | Kept | P4 |
| G3-PH-04 | Align recommendation and evaluation. | Merged | P0 and P1; FR-10, FR-21 |
| G3-PH-05 | Add review and learning workflows. | Deferred | P7 |
| G3-DEC-01 | Model-assisted generation requires human approval. | Kept | NG-04; D-013; FR-17 |
| G3-DEC-02 | Online latency assumptions must be measured. | Kept | OQ-01; FR-24; P4 and P5 gates |
| G3-DEC-03 | Vector retrieval is time- and flag-bounded. | Kept | FR-07, FR-22, FR-24 |
| G3-DEC-04 | Match reasons derive from evidence, not free text. | Kept | D-006; FR-13, FR-15 |
| G3-DEC-05 | Locale is part of intent interpretation. | Kept | D-009; FR-23 |
| G3-DEC-06 | Create private draft briefs for strong gaps, but require repeated evidence or approval before backlog promotion. | Kept | FR-18; D-013; P7 |

### Open questions and metrics

| Source ID | Atomic item | Disposition | Canonical destination or resolution |
|---|---|---|---|
| G3-OQ-01 | What private review workflow should govern assisted intent drafts? | Open | OQ-07; FR-17; D-013 |
| G3-OQ-02 | What measured production latency should become the p95 gate? | Open | OQ-01; FR-24 |
| G3-OQ-03 | Which localized phrases should be seeded first? | Deferred | FR-23 and D-009; phrase priority is an evaluation task, not the dedicated-vector-service question |
| G3-OQ-04 | What approval threshold promotes an Icons Lab draft into backlog? | Changed | FR-17, FR-18, and D-013 require owner approval; evidence thresholds remain part of P7 operation |
| G3-MET-01 | Reduce misses for tracked natural-language and adjective queries. | Kept | Primary and supporting metrics |
| G3-MET-02 | Improve or preserve top-8 recall across fixtures. | Merged | Primary metrics; FR-21 |
| G3-MET-03 | Keep exact brand/logo fixture pass rate at 100%. | Kept | Primary metrics; FR-03, FR-21 |
| G3-MET-04 | Return relevant results for named hard-query and localized fixtures. | Kept | Evaluation suite; FR-21, FR-23 |
| G3-MET-05 | Keep hosted latency within the approved target or the flag off. | Kept | Guardrails; FR-22, FR-24 |
| G3-MET-06 | Turn repeated weak queries into an explicit action class. | Kept | Supporting metrics; FR-16, FR-17 |

## G4: SI v2 search-engine PRD

### Goals and non-goals

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G4-GO-01 | Make search work by meaning, not only names and manual aliases. | Kept | G-01 |
| G4-GO-02 | Preserve exact quality for logos, IDs, brands, and known names. | Kept | G-02; FR-03 |
| G4-GO-03 | Use the SI v2 schema and registry as search-intelligence sources. | Kept | G-04; FR-04, FR-05 |
| G4-GO-04 | Share search intelligence across web, MCP, and future CLI surfaces. | Kept | G-03; FR-02 |
| G4-GO-05 | Return previews and public-safe explanations where supported. | Kept | G-05; FR-13 through FR-15, FR-25 |
| G4-GO-06 | Improve records through reviewed usage and miss evidence. | Kept | G-06; FR-16 through FR-20 |
| G4-GO-07 | Preserve deterministic fallback when semantic retrieval fails. | Kept | G-07; FR-22 |
| G4-GO-08 | Measure hosted MCP demand, client spread, abuse pressure, latency, and resource use. | Kept | G-08; FR-20, FR-24, FR-25 |
| G4-NG-01 | Do not replace the web search in one risky release. | Kept | NG-01; FR-01; P5 and P6 |
| G4-NG-02 | Do not make gated design intelligence publicly downloadable. | Kept | NG-03; FR-15, FR-25 |
| G4-NG-03 | Do not echo gated mind-map terms in public explanations or exports. | Kept | NG-03; FR-15, FR-25; D-006 |
| G4-NG-04 | Do not auto-promote raw feedback into public records. | Kept | NG-04; FR-17; D-013 |
| G4-NG-05 | Do not require a dedicated vector vendor for the first experiment. | Kept | NG-05; D-010 |
| G4-NG-06 | Do not generate explanations with an LLM on every request. | Kept | NG-02 |
| G4-NG-07 | Do not expose internal evidence, identifiers, secrets, or process metadata. | Kept | NG-03; FR-25 |
| G4-NG-08 | Do not treat liveness/scanner traffic as useful search demand. | Kept | NG-08; G-08; FR-20 |

### Wiring and mapping requirements

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G4-W-01 | Keep the same web search workflow while improving meaning relevance. | Kept | FR-01; NG-01 |
| G4-W-02 | Add confidence-aware result handling. | Kept | FR-12 |
| G4-W-03 | Connect weak results to gap and review workflows. | Kept | FR-16, FR-17, FR-20 |
| G4-W-04 | Use locale signals, localized terms, and semantic retrieval. | Kept | FR-23; D-009 |
| G4-M-01 | Use one shared search core for MCP and web. | Kept | FR-02, FR-10 |
| G4-M-02 | Return agent-ready public-safe explanations and confidence. | Kept | FR-12, FR-13, FR-15, FR-25 |
| G4-M-03 | Preserve MCP preview support. | Kept | FR-14; result contract |
| G4-M-04 | Keep full query-frame and rank diagnostics admin-only. | Changed | Sanitized public opt-in remains allowed; privileged diagnostics stay private; D-007 |
| G4-M-05 | Preserve exact brand/logo priority. | Kept | FR-03 |
| G4-M-06 | Capture aggregate-safe hosted MCP demand and cost evidence. | Kept | G-08; FR-20, FR-24, FR-25 |

### Socratic decisions

| Source ID | Atomic source decision | Disposition | Canonical destination or reason |
|---|---|---|---|
| G4-Q-01 | Semantic retrieval supplements rather than replaces deterministic search. | Kept | D-011; FR-22 |
| G4-Q-02 | Schema fields, generated documents, fixtures, and approved record updates are the main improvement path. | Kept | G-04; FR-04, FR-17, FR-21 |
| G4-Q-03 | Gated fields may influence ranking but may not be echoed publicly. | Kept | D-006; FR-15, FR-25 |
| G4-Q-04 | Use PostgreSQL plus pgvector for the first vector experiment. | Kept | D-010 |
| G4-Q-05 | Start localization with multilingual embeddings and locale dictionaries. | Kept | D-009; FR-23 |
| G4-Q-06 | Keep full `debug_intent` privileged; allow only scrubbed public hints. | Kept | D-007; FR-15, FR-25 |
| G4-Q-07 | Treat hosted MCP use as demand only after separating useful calls from scanners and heavy repetition. | Kept | NG-08; FR-20 |

### Functional requirements

| Source ID | Atomic source intent | Disposition | Canonical destination or reason |
|---|---|---|---|
| G4-F-01 | Generate public-safe search documents from SI v2 and registry records. | Kept | FR-04, FR-25 |
| G4-F-02 | Extend the existing five-type generator before adding types. | Kept | FR-05; D-003 |
| G4-F-03 | Generate embeddings offline or in controlled batches. | Kept | FR-06 |
| G4-F-04 | Add semantic candidate retrieval behind a flag. | Kept | FR-07, FR-22 |
| G4-F-05 | Merge exact, rule, and semantic candidates into one ranking. | Kept | FR-08, FR-09 |
| G4-F-06 | Preserve exact brand/logo/icon-ID priority. | Kept | FR-03 |
| G4-F-07 | Return public-safe explanations and preview URLs. | Kept | FR-13, FR-14, FR-15, FR-25 |
| G4-F-08 | Start multilingual search with embeddings and locale dictionaries. | Kept | FR-23; D-009 |
| G4-F-09 | Log empty, low, weak-confidence, and high-latency queries as admin evidence. | Kept | FR-16, FR-20, FR-24 |
| G4-F-10 | Provide admin-only query-frame and rank-signal diagnostics. | Kept | FR-25; D-007 |
| G4-F-11 | Fall back to deterministic search when semantic retrieval fails. | Kept | FR-22 |
| G4-F-12 | Keep gated design intelligence out of public responses. | Kept | FR-15, FR-25; D-006 |
| G4-F-13 | Add fixtures from real query packs before rollout. | Kept | FR-21 |
| G4-F-14 | Track aggregate-safe hosted MCP usage and attribution. | Kept | G-08; FR-20, FR-24, FR-25 |
| G4-F-15 | Separate liveness/scanner traffic from real tool calls. | Kept | NG-08; FR-20 |

### Phases

| Source ID | Source phase | Disposition | Canonical destination or reason |
|---|---|---|---|
| G4-PH-00 | Freeze contracts, baseline, and evaluation. | Kept | P0 |
| G4-PH-01 | Build the search projection. | Kept | P2 |
| G4-PH-02 | Add embeddings and vector retrieval. | Kept | P3 and P4 |
| G4-PH-03 | Run hybrid search in shadow mode. | Kept | P4 |
| G4-PH-04 | Run MCP beta. | Kept | P5; D-014 |
| G4-PH-05 | Run web beta. | Kept | P6 |
| G4-PH-06 | Add the admin learning loop. | Kept | P7; D-013 |

### Open questions

| Source ID | Question | Disposition | Canonical destination or resolution |
|---|---|---|---|
| G4-OQ-01 | What p95 latency is acceptable for web and MCP? | Open | OQ-01; FR-24 |
| G4-OQ-02 | Which embedding model and rebuild cost are acceptable? | Open | OQ-02 |
| G4-OQ-03 | What threshold should trigger MCP throttling, key nudges, or paid calls? | Open | OQ-05; FR-20, FR-24 |
| G4-OQ-04 | What minimum country/region attribution is useful when headers are absent? | Open | OQ-06; analytics definitions |
| G4-OQ-05 | Should weak results show fallbacks, ask a question, or offer Icons Lab? | Open | OQ-04; FR-12, FR-16, FR-18 |
| G4-OQ-06 | Should reviews edit records directly or require a separate approval screen? | Open | OQ-07; FR-17; D-013 |
| G4-OQ-07 | When should hosted MCP require keys or paid gated actions? | Open | OQ-05; outside first hybrid beta |

### Acceptance criteria and metrics

| Source ID | Atomic source intent | Disposition | Canonical destination |
|---|---|---|---|
| G4-AC-01 | Exact brand/logo queries remain rank 1. | Kept | FR-03, FR-21 |
| G4-AC-02 | Broad meaning queries return a useful family in the top 3. | Kept | FR-21 |
| G4-AC-03 | Long queries produce a query frame and useful fallbacks. | Kept | FR-02, FR-12, FR-21 |
| G4-AC-04 | MCP includes public library names, refs, reasons, and preview URLs. | Kept | FR-13, FR-14, FR-15, FR-25 |
| G4-AC-05 | MCP reporting estimates clients, concentration, tool mix, quality, latency, available country, and key share. | Kept | FR-20, FR-24, FR-25 |
| G4-AC-06 | Web search works with vector retrieval unavailable. | Kept | FR-22 |
| G4-AC-07 | No public artifact exposes gated or internal fields. | Kept | FR-15, FR-25; D-006 |
| G4-AC-08 | Admin can see evidence, weak matches, and suggested record improvements. | Kept | FR-16, FR-17, FR-20 |
| G4-AC-09 | Evaluation has an owner-scored fixed set plus a release smoke set. | Changed | Target expanded from 50 to 225 stratified queries; FR-21; D-008 |
| G4-MET-01 | Reduce empty-result rate. | Kept | Supporting metrics |
| G4-MET-02 | Reduce low-result rate. | Kept | Supporting metrics |
| G4-MET-03 | Improve human-rated top-3 usefulness. | Kept | Primary metrics |
| G4-MET-04 | Preserve exact brand/logo rank-1 accuracy. | Kept | Primary metrics; FR-03, FR-21 |
| G4-MET-05 | Increase accepted, fetched, previewed, or used MCP top results. | Kept | Primary metrics; OQ-03, FR-10, FR-19 |
| G4-MET-06 | Keep web and MCP p95 within approved thresholds. | Kept | Guardrails; OQ-01, FR-24 |
| G4-MET-07 | Track hosted MCP calls by tool, status, and client family. | Kept | Supporting metrics; FR-20 |
| G4-MET-08 | Track distinct anonymous client hashes by period. | Kept | Supporting metrics; FR-20, FR-25 |
| G4-MET-09 | Track call concentration among heavy anonymous clients. | Kept | Supporting metrics; FR-20 |
| G4-MET-10 | Track registered/API-key share without exposing keys. | Kept | Supporting metrics; FR-20, FR-25 |
| G4-MET-11 | Track high-latency query/tool share. | Kept | Supporting metrics; FR-20, FR-24 |
| G4-MET-12 | Track scanner/liveness ratio versus real tool calls. | Kept | Supporting metrics; NG-08, FR-20 |
| G4-MET-13 | Increase public-safe matched concepts. | Kept | Supporting metrics; FR-13, FR-15, FR-21 |
| G4-MET-14 | Increase reviews that improve records instead of one-off aliases. | Kept | Supporting metrics; FR-17 |
| G4-MET-15 | Increase preview use where MCP supports it. | Kept | Supporting metrics; FR-14, FR-19 |
| G4-MET-16 | Increase country coverage only when host/client headers supply it. | Kept | Supporting metrics; FR-20, FR-25 |

## Correction verification

Current-turn local verification on 2026-07-11 established:

- 252 source-prefixed atoms are present across the expected 32 source groups;
- every current `G-01` through `G-08`, `NG-01` through `NG-08`, `FR-01` through `FR-26`, and `OQ-01` through `OQ-08` has at least one historical destination;
- every destination identifier is within the valid range of the final specification or decision log;
- local Markdown links in the active consolidation set resolve; and
- the active instruction, decision, traceability, status, specification, index, proposal, and baseline files contain no U+2013 or U+2014 punctuation.

`D-001`, `D-002`, and `D-015` do not map to a single atom in the four historical plans. They were introduced by the consolidation process itself: authority separation, evidence-based lifecycle reporting, and sanitized analytics evidence. `D-005` and `D-012` now identify their phase-plan and library-behavior ancestry in the rows above.

These checks prove structural coverage and reverse reachability. Destination meanings were also re-derived row by row against specification version 1.0, but that semantic review remains pending an independent audit.

## Consolidation result

The corrected inventory contains every named functional requirement, phase, open question, goal, non-goal, and acceptance criterion identified from the four source generations. Items that changed have a destination or reason. Items not required for the first hybrid beta remain explicitly deferred, obsolete, or open in the official specification and implementation ledger.

This file is re-frozen following the independent semantic audit recorded above. Future requirement changes belong in `search-engine-v2.md`, new decisions belong in `decisions.md`, and implementation evidence belongs in `implementation-status.md`.
