# Superpowers Plan Feasibility Audit

Status: Audit complete  
Date: April 19, 2026  
Auditor: Antigravity (IDEO Design Thinking and Product Developer Lens)

---

## Executive Summary

The four Superpowers plan documents represent a **coherent, well-structured strategic stack** for transforming Supericons from a useful icon search product into a durable semantic icon platform. The documents layer cleanly: a metadata specification (the "what"), a registry blueprint (the "system"), a rollout roadmap (the "how"), and an implementation plan (the "now").

**Overall feasibility: HIGH**, with specific risks in scope creep timing and operational cost that require mitigation.

| Document | Feasibility | Biggest Strength | Biggest Risk |
|---|---|---|---|
| SI Semantic Metadata v1 Spec | High | Honest evidence model; clear field rationale | Schema bloat before validation |
| SI Registry PRD and Blueprint | High | Registry-first architecture; public/private split | Over-design before shipping |
| SI Semantic Rollout Roadmap | Medium-High | Two-lane strategy; continuous factory model | Automation cost assumptions |
| Foundation Implementation Plan | High | Phased guardrails; dependency audit discipline | Long tail of extraction tasks |

---

## Methodology: IDEO Design Thinking Lens

This audit applies the five IDEO design thinking phases as evaluation criteria:

1. **Empathize**: Do the plans correctly identify who the users are and what they need?
2. **Define**: Is the problem framed clearly and narrowly enough to act on?
3. **Ideate**: Are the proposed solutions creative, differentiated, and well-justified?
4. **Prototype**: Is there a viable path to ship something small and learn?
5. **Test**: Are verification, feedback loops, and success criteria baked in?

Each document is assessed through all five lenses.

---

## Document 1: SI Semantic Metadata v1 Spec

### What It Is

A 1,006-line specification defining 40+ metadata fields organized across 7 groups (Identity, Visual Depiction, Semantics Core, Usage Guidance, Accessibility, Dynamics, Evidence and Governance). It establishes the canonical semantic contract for every icon in the SI system.

### Strengths (What Works Well)

**Empathize: Excellent user insight.**
The spec correctly identifies that source icons give developers only a name, an ID, and a visual shape, which is insufficient for confident selection. The gap between "finding an icon" and "knowing what it means" is real and well-articulated.

**Define: Honest truth model.**
The four-layer truth model (source identity, visual depiction, SI recommendation, evidence and trust) is the spec's strongest intellectual contribution. It avoids the trap of pretending objective semantic truth for crowdsourced assets. This is both epistemically honest and commercially strategic: it positions SI recommendations as editorial value, not crowd consensus.

**Ideate: The `avoid_when` and `anti_pairs` fields.**
Most icon systems only describe what an icon IS. This spec also describes what it is NOT, which is unusually thoughtful. The `avoid_when` field alone could become a major differentiator for agent-driven UIs that need to avoid ambiguity.

**Prototype: Minimum viable coverage is well-scoped.**
The required vs. optional field split (17 required, 18 optional) makes it possible to ship useful records without full field coverage. This is the correct progressive delivery approach.

### Risks and Improvement Suggestions

> [!WARNING]
> **Risk 1: Schema breadth before validation.**
> 40+ fields is a large surface for a v1 that has not yet been populated at scale. Every field that does not survive contact with real data creates tech debt.

**Suggestion:** Run a "schema stress test" before locking the spec. Take 50 diverse icons (including edge cases like abstract geometric shapes, culturally loaded symbols, and near-identical variants) and attempt to fill every required field. Identify which fields consistently produce low-value or ambiguous data. Any field that cannot be meaningfully populated for 80%+ of the test set should move to "optional" or "v2."

> [!IMPORTANT]
> **Risk 2: No versioning strategy for the schema itself.**
> The spec defines `version` for individual records but does not describe how the schema evolves. What happens when v2 adds fields? What happens if a field is renamed or removed? This is a silent breaking-change risk for any tooling built against the schema.

**Suggestion:** Add a `schema_version` field to every record and define a basic evolution policy (additive changes only in minor versions; breaking changes require major version bump). This costs almost nothing now and prevents painful migrations later.

> [!NOTE]
> **Risk 3: Controlled vocabularies are specified as "recommended values" but not enforced.**
> Fields like `category`, `intent`, `domain`, and `state` list examples but do not define closed sets. If automation generates the bulk of records, unconstrained vocabularies will drift quickly.

**Suggestion:** Ship v1 with a strict allowed-value list for all controlled-vocabulary fields. New values should require explicit editorial approval (as noted in the spec, but not formalized in a vocabulary registry file).

**Risk 4: Accessibility fields lack testing grounding.**
The `a11y_role`, `a11y_label`, `aria_live`, and `decorative_default` fields are smart inclusions, but the spec does not describe how these recommendations would be validated against actual screen reader behavior.

**Suggestion:** Add a note that accessibility recommendations should be validated with at least one screen reader (NVDA/VoiceOver) on a representative sample before publishing as "reviewed."

---

## Document 2: SI Registry PRD and Blueprint

### What It Is

A 452-line product requirements document that frames the registry as the canonical semantic operating system for Supericons. It covers users, goals, non-goals, architecture, governance, and public/private posture.

### Strengths (What Works Well)

**Empathize: Four clear user archetypes.**
The PRD identifies builders/designers, coding agents, Supericons itself, and future external adopters. This is the right hierarchy: real users first, internal product second, ecosystem aspirations third.

**Define: Non-goals are sharp.**
Explicitly stating that the registry is NOT a replacement for SVG rendering, NOT a promise of objective truth, NOT a multi-vendor standard on day one, NOT a launch blocker for 100% coverage, and NOT a reason to rewrite the app. These non-goals are more valuable than the goals because they prevent scope creep.

**Ideate: Registry-first beats DB-first argument.**
The reasoning for why repo-native records (with build projections into DB, JSON, SVG, MCP) are superior to a database-first approach is compelling and well-argued. This architectural decision alone prevents a class of reproducibility and drift bugs.

**Ideate: Public/private hybrid model.**
The split between open schema, open free records, open API, and private telemetry, ranking, entitlements, and commercial logic is strategically sound. It encourages ecosystem adoption while protecting monetization.

**Test: Success metrics are layered.**
Three tiers of success (launch-adjacent, foundation, strategic) with concrete outcomes prevent the "we will know it when we see it" failure mode.

### Risks and Improvement Suggestions

> [!WARNING]
> **Risk 1: Missing user validation loop.**
> The PRD identifies users but does not describe how user needs were or will be validated. Are builders actually asking for semantic metadata? Are coding agents performing better with structured icon meaning vs. keyword search?

**Suggestion:** Before investing heavily in registry infrastructure, run a lightweight validation:

- Interview or survey 5 to 10 active Supericons users about their icon selection pain points.
- A/B test MCP responses with vs. without semantic metadata to measure agent retrieval quality.
- Track whether purpose-chip engagement on the UI predicts registry value.

This is the "Empathize" phase that should precede a build of this scale.

> [!IMPORTANT]
> **Risk 2: Nine projection targets is a large integration surface.**
> The blueprint lists 9 distinct projection targets (public JSON, MCP JSON, two Supabase tables, private search manifests, SVG passports, si:// payloads, product facts, browse facets). Each projection is a maintenance contract.

**Suggestion:** Rank projections by value-at-launch vs. value-later. Ship only 2 to 3 projections in v1 (likely: public icon index, MCP JSON, product facts). Add others only when downstream consumers are ready to read from them.

> [!NOTE]
> **Risk 3: Ingestion pipeline described but not costed.**
> The 7-step ingestion pipeline (source ingest, lexical suggestion, visual inspection, contextual enrichment, confidence scoring, review routing, publish) assumes access to visual AI models, telemetry data, and editorial review capacity. None of these are costed.

**Suggestion:** Cost the pipeline before building it. Estimate: API calls per icon for visual inspection, editorial hours per review batch, CI/compute for nightly batches. If costs are <$50/month for the full corpus, proceed confidently. If >$200/month, the economics may not justify full automation at current scale.

---

## Document 3: SI Semantic Rollout Roadmap

### What It Is

A 511-line phased roadmap defining how the metadata spec and registry become an operational system. It covers workstreams, a visual inspection strategy, an autonomous tagging pipeline, confidence routing, 6 phases, and risk responses.

### Strengths (What Works Well)

**Define: Two-lane strategy is honest and practical.**
Separating the "broad but mixed-confidence" aggregated corpus from the "deep and gold-standard" native SI library is the right framing. It prevents the perfectionist trap of waiting for 21,264 icons to be fully reviewed before shipping.

**Ideate: Continuous semantic factory model.**
Positioning the tagging pipeline as a permanent system rather than a one-time batch is a strong operational decision. This is the difference between a "data cleanup project" (which always stalls) and a "semantic operations system" (which compounds).

**Prototype: Deliberate visual inspection pilot.**
The recommendation to pilot visual inspection on 250 icons (100 premium, 100 top free, 50 ambiguous) before committing to it as a continuous step is textbook lean methodology. The success criteria (useful depictions, acceptable human agreement, sustainable cost) are concrete and measurable.

**Test: Confidence routing model.**
The three-band routing system (auto-accept, batch review, deeper review) is a well-known pattern from ML ops applied to editorial content. It correctly preserves human judgment for the hard cases while letting automation handle the easy ones.

### Risks and Improvement Suggestions

> [!WARNING]
> **Risk 1: Phase timelines are vague.**
> Phase 1 is "next 2 to 4 weeks," Phase 2 is "4 to 8 weeks," Phase 3 is "post-launch," Phase 4 is "after the semantic record model is stable," Phase 5 is "once registry quality is strong enough." Anything past Phase 1 has no concrete timeline or trigger condition.

**Suggestion:** Replace vague timing with **exit criteria** for each phase. For example:

- Phase 1 exits when: registry scaffolding exists, product-facts generator passes CI, 400 premium icons are normalized.
- Phase 2 exits when: visual inspection pilot is complete, 300+ top free icons have high-confidence records, pipeline runs nightly.
- Phase 3 exits when: 5,000+ free icons have minimum viable coverage, review backlog is under 200 icons.

**Trigger-based phasing** is more honest than calendar-based phasing for a team of this size.

> [!IMPORTANT]
> **Risk 2: Eight workstreams for what appears to be a small team.**
> The roadmap defines 8 concurrent workstreams (Schema, Registry Foundation, Premium Normalization, Free Corpus Coverage, Visual Inspection, Editorial Review, Product Surface Adoption, Native SI Library). Without a team size or capacity model, this looks like parallel ambition.

**Suggestion:** Explicitly sequence workstreams. Recommend a "critical path" ordering:
1. A (Schema) and B (Registry Foundation) in parallel (these are prerequisites for everything else)
2. C (Premium Normalization) immediately after B
3. D (Free Corpus) and E (Visual Inspection) in parallel after C
4. F (Review Routing) after E pilot results
5. G (Product Surface Adoption) after stable projections from B
6. H (Native SI Library) as a rolling effort, not a workstream with a start date

> [!NOTE]
> **Risk 3: Operational cost model is absent.**
> The roadmap mentions "cheapest model or heuristic" and "nightly or scheduled batch" but never estimates actual costs. At 21,264 icons, even a cheap multimodal model at $0.01/image adds up to $212/run. Weekly editorial review needs human hours.

**Suggestion:** Add a lightweight cost model:
- Lexical pass: free (rule-based)
- Visual pass: $X per icon at Y model rate
- Confidence scoring: free (computed)
- Human review: Z hours per batch of 100
- CI/CD: infrastructure cost per month
This makes the "continuous factory" model real rather than aspirational.

**Risk 4: Metrics are comprehensive but untriaged.**
16 metrics across 4 categories is a strong measurement framework, but no metric is identified as the "north star" or the "one metric that matters."

**Suggestion:** Identify the single most important metric per phase:
- Phase 1: "Premium icons normalized to registry shape" (binary: done/not done)
- Phase 2: "Top free icon semantic coverage rate" (%)
- Phase 3: "Search satisfaction on semantically enriched queries" (qualitative or rated)

---

## Document 4: Supericons Foundation Main Implementation Plan

### What It Is

A 534-line execution plan covering immediate bug fixes (P0: packs heading, product facts drift, purpose-chip scope), safe refactoring (P1: large file audits, app shell extraction), and registry groundwork (P2: scaffolding, normalization, visual inspection pilot).

### Strengths (What Works Well)

**Define: Problem framing is concrete.**
The P0/P1 priority system with specific observed behaviors ("direct /?view=packs still shows All Icons in the main heading") is exactly right. These are not abstract requirements; they are bugs with URLs. This is the most executable of the four documents.

**Ideate: Guardrails before refactors.**
The four guardrails (no broad rewrite, dependency maps first, one boundary at a time, verification before confidence) are the strongest risk-management language in the entire document set. This is senior engineering discipline.

**Prototype: Execution order is well-sequenced.**
The 10-step recommended order (docs first, facts, heading fix, chips, facts replacement, audits, extractions, registry scaffolding, visual pilot, semantic rollout) is a correct dependency chain with early wins front-loaded.

**Test: Verification matrix is thorough.**
The regression matrix (homepage, packs, docs, collection detail, pricing, auth return, purchase success, MCP docs, purpose-chip state) covers real user journeys, not just code paths.

### Risks and Improvement Suggestions

> [!WARNING]
> **Risk 1: 17 tasks across 6 phases with no time estimates.**
> The plan identifies what to do and in what order, but never estimates how long each task takes. Without estimates, it is impossible to scope a sprint or know when the foundation work is "done."

**Suggestion:** Add rough T-shirt sizing (S/M/L/XL) to each task:
- Task 1 (land docs): S (1 hour)
- Task 2 (product facts): M (4 to 8 hours)
- Task 3 (heading fix): S (2 hours)
- Task 6 (main.js audit): M (4 hours)
- Task 12 (store route extraction): XL (multi-day, per slice)
This gives a rough sense of total effort and prevents underestimation.

> [!IMPORTANT]
> **Risk 2: Phase 3 (First Safe Extractions) is the highest-risk phase but has the least detail.**
> Task 12 ("Extract store route modules gradually") lists 5 extraction targets, each requiring dependency maps, route verification, startup verification, and re-audits. This is easily the largest chunk of work in the plan, but it is described in 15 lines.

**Suggestion:** Give Task 12 its own sub-plan. Each extraction (packs/collection, docs, pricing/legal, dashboard/API, tools) should have:
- Pre-extraction inventory checklist
- Expected output files
- Specific verification steps
- Rollback strategy if extraction introduces regressions

> [!NOTE]
> **Risk 3: The plan depends on artifacts that do not yet exist.**
> The plan references `data/product-facts.json`, `scripts/build-product-facts.mjs`, `scripts/verify-product-facts.mjs`, `data/si-registry/`, and `lib/shell-title-sync.js`. None of these files exist in the codebase today. This is fine for a plan, but it means Phase 0 is entirely green-field, which often takes longer than expected.

**Risk 4: No ownership or accountability model.**
The plan does not specify who executes which task, or whether tasks are human-driven, agent-driven, or automated. Given the agentic context (the plan's own header says "For agentic workers"), this should explicitly state which tasks are fully automatable vs. which require human judgment.

**Suggestion:** Tag each task with an execution mode:
- `[auto]`: Fully automatable by an agentic worker
- `[guided]`: Requires human decision points
- `[manual]`: Requires human-only execution (e.g., editorial review)

---

## Cross-Document Assessment

### Coherence Between Documents

The four documents tell a single coherent story: the spec defines the data model, the PRD defines the system, the roadmap defines the rollout, and the implementation plan defines the immediate work. There is minimal contradiction between them, which is impressive for a strategy-to-execution stack.

**One notable gap:** The rollout roadmap's 8 workstreams do not map 1:1 to the implementation plan's phases. The implementation plan covers Workstreams A, B, C, and part of D and E. Workstreams F, G, and H are not addressed in the implementation plan, suggesting they are intentionally deferred. This is fine, but should be stated explicitly.

### The IDEO "Desirability, Viability, Feasibility" Test

| Criterion | Rating | Rationale |
|---|---|---|
| **Desirability** (Do users want this?) | Medium-High | Builders want better icon selection. Agent-driven UIs are a growing market. The "honest semantics" framing is appealing. But no user validation data is cited. |
| **Viability** (Can the business sustain this?) | Medium | The public/private split is commercially sound. But the operational cost model is absent, and the team size is unclear. |
| **Feasibility** (Can this be built?) | High | The tech stack is known (Vite, JS, Supabase, JSON). The phasing is conservative. The guardrails are strong. The main risk is scope, not capability. |

### The "One Thing I Would Change" Test

If forced to change one thing across the entire document set, it would be this:

> **Add a "Definition of Done" for v1.**

None of the four documents clearly state: "When X, Y, and Z are true, the SI Semantic Metadata v1 and SI Registry v1 are DONE." Without this, there is a risk of perpetual refinement ("just one more field," "just one more workstream") that delays the crossover from planning to shipping.

Recommended Definition of Done for v1:

1. SI Semantic Metadata v1 schema is locked (no new required fields without major version bump).
2. 400 premium icons have full registry records with confidence scores.
3. 500+ top free icons have minimum viable registry records.
4. Product-facts generator passes CI and drives at least 2 product surfaces.
5. At least one projection (public icon index or MCP JSON) is generated from registry records.

When all five conditions are met, v1 is live and the team shifts to cadence-based improvement.

---

## Summary of All Recommendations

| # | Category | Recommendation | Urgency |
|---|---|---|---|
| 1 | Spec | Run a 50-icon "schema stress test" before locking the spec | High |
| 2 | Spec | Add `schema_version` field and evolution policy | High |
| 3 | Spec | Ship controlled vocabularies as strict allowed-value lists | Medium |
| 4 | Spec | Validate a11y recommendations with screen reader testing | Low |
| 5 | PRD | Run lightweight user validation (5 to 10 interviews or A/B test) | High |
| 6 | PRD | Rank the 9 projection targets; ship only 2 to 3 in v1 | Medium |
| 7 | PRD | Cost the ingestion pipeline before building it | Medium |
| 8 | Roadmap | Replace vague phase timelines with exit criteria | High |
| 9 | Roadmap | Sequence the 8 workstreams into a critical path | High |
| 10 | Roadmap | Add a lightweight cost model for the semantic factory | Medium |
| 11 | Roadmap | Identify one north-star metric per phase | Medium |
| 12 | Impl Plan | Add T-shirt sizing estimates to all 17 tasks | Medium |
| 13 | Impl Plan | Give Task 12 (store extraction) its own sub-plan | High |
| 14 | Impl Plan | Tag tasks with execution modes (auto/guided/manual) | Medium |
| 15 | Cross-doc | Define a clear "Definition of Done" for v1 | High |

---

## Final Verdict

This is a **strong, intellectually honest strategy-to-execution stack**. The documents demonstrate real product thinking: they separate truth from inference, prioritize launch discipline over perfection, and build guardrails against the most common failure modes (scope creep, rewrite impulse, drift).

The primary risks are not in the ideas but in the **operationalization**: undefined team capacity, absent cost models, vague phase transitions, and a large integration surface (9 projections, 8 workstreams) that could overwhelm a small team.

The single most impactful action to improve the entire plan set: **define exit criteria for each phase and a hard Definition of Done for v1.** This converts the strategy from "a direction we believe in" to "a milestone we can ship."

**Feasibility rating: 4 out of 5.** Would be 5 out of 5 with the exit criteria, cost model, and user validation added.
