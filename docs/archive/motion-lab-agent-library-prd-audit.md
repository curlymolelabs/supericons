# Motion Lab Agent Library PRD: Audit and Analysis

**Date:** April 11, 2026
**Input:** `docs/motion-lab-agent-library-prd.md`
**Method:** Socratic prompting + design thinking
**Verdict:** Solid first draft. Approved for Phase 0 implementation. Two gaps must be resolved before Phase 2 begins.

---

## Overall Verdict

This is a solid first PRD draft. It is well-structured, evidence-grounded, and avoids the two most common PRD failure modes:

- It does not over-promise (no "AI recommendation engine v1").
- It does not under-specify (functional requirements map to acceptance signals).

However, there are meaningful gaps and two structural weaknesses that must be addressed before this is approved for Phase 2 (metadata) implementation.

---

## What Works Well

### 1. The evidence inventory is doing real work

Most PRDs start with assertions. This one opens with checked facts pointing to actual audit documents. The distinction between "Checked Facts" and "Assumptions" is unusually honest - most PRDs conflate these. The problem statement is grounded rather than hypothesized.

### 2. The non-goals section is strong

Explicitly ruling out:

- redesigning the browser UI
- changing presets to fit MCP
- curating 20K free icons
- a general recommendation engine in v1

These are exactly the right things to decline. They are the four most likely scope creep paths and they are closed early. This shows design maturity.

### 3. The product principles are load-bearing, not decorative

"One preset library, two interfaces" and "Read-only agent access" make real engineering decisions: a shared module, no write paths through MCP. These principles will constrain implementation correctly.

### 4. The phased scope follows the right logical order

Foundation (Phase 0) before exposure (Phase 1) before guidance (Phase 2) before enrichment (Phase 3) before optional tooling (Phase 4). This is the correct sequence and matches the conclusions from both the analysis doc and the feasibility analysis.

---

## Gaps and Weaknesses

### Gap 1: Metadata schema is mentioned but not committed to

**Socratic question:** "If a developer starts building Phase 2 tomorrow, what exactly do they build?"

Requirement 4 lists the initial field set as prose bullet points with no:

- field names (what is the actual key?)
- data types (string? array? object with min/max?)
- cardinality (one emotional tone or an array?)
- example values for any field

The analysis document (`motion-lab-agent-library-analysis.md`) went further and showed an actual JSON struct with real field names. For example:

```json
"context_intensity_guidance": {
  "navigation-professional": { "min": 55, "max": 80, "default": 65 },
  "cta":                      { "min": 70, "max": 95, "default": 80 }
}
```

The PRD references the analysis doc as a source but does not pull that schema detail in. A developer implementing Phase 2 will define the schema ad hoc, and two developers might define it differently.

**Severity:** Medium

**Recommended fix:** Either promote the schema from the analysis doc into the PRD as a normative reference, or point explicitly to `docs/plans/agent-metadata-schema.md` as the schema source (noting that file needs to be created as the next deliverable after this PRD is approved). The schema document is listed in `agent-library-plan.md` as a deliverable but does not yet exist.

---

### Gap 2: Requirement 7 (parity safeguards) has no owner and no mechanism

**Socratic question:** "Who runs the parity test, and when? What does 'parity test for preset ids' look like in practice?"

Requirement 7 mentions:

- parity tests for preset ids
- parity checks for group membership
- versioned preset data

But there is no:

- specification of what "parity test" means (a CI/CD check? a manual audit? a script?)
- decision on where the shared preset source lives (this is Open Question 5, not answered in the requirements)
- versioning model for the shared preset source

The word "Examples" in Requirement 7 signals that these are advisory rather than mandatory. This is the requirement most likely to be skipped under delivery pressure. Parity safeguards only work if they are automated and run on every change.

**Impact:** Without an automated parity check, the browser and MCP will drift again. The problem this PRD exists to solve recurs in 6 months.

**Severity:** High

**Recommended fix:** Promote Requirement 7 to a hard acceptance criterion. The recommended mechanism is a lightweight CI check that compares `Array.from(browserPresets.keys())` against `Array.from(mcpPresets.keys())` and fails the build if they diverge. This should be called out explicitly as a required engineering deliverable in Phase 0, not a Phase 3 nice-to-have.

---

### Gap 3: The shared preset source architecture is undefined

**Socratic question:** "Where does the shared preset source actually live, and what is its format?"

Open Question 5 asks: "What is the best file/module location for the shared preset source so browser and MCP can consume it cleanly?"

This is not an open question to answer later. It is a prerequisite architectural decision that determines everything in Phase 0.

The audit confirmed:

- Browser source: `store.js` (currently owns preset definitions inline)
- MCP source: `lib/motion-lab-workflow.js` (separate, orphaned 12-preset registry)

The shared source needs to be:

- a new canonical file (e.g., `lib/presets/motion-lab-presets.js` or `data/motion-lab-presets.json`)
- imported by `store.js` (browser)
- imported by the MCP layer (replacing `lib/motion-lab-workflow.js`)
- read-only by design (no write API)

The PRD currently says "unification needs to happen without breaking the existing Motion Lab experience" but does not specify the architectural approach. That means Phase 0 engineering starts with an architectural design decision the PRD left open. That is a planning risk.

**Severity:** High

**Recommended fix:** Add a subsection under Constraints or Phase 0 scope that names the intended shared source format and proposed location. This does not need to prescribe exact line numbers - but "a shared module that browser and MCP both import from, located at X" should be stated as a recommendation pending final implementation decision.

---

### Gap 4: The developer feedback loop is described but not designed

**Socratic question:** "Requirement 5 says a developer can hand the guidance to an agent and get better motion choices. How do we know that worked? What does 'better' mean and who validates it?"

A supporting metric states:

> "Qualitative developer feedback that agent-selected presets feel more context-appropriate."

Qualitative feedback is a valid signal but it is not a collection mechanism. There is no:

- feedback surface (where does the developer provide this feedback?)
- minimum sample size before the metric is considered meaningful
- baseline to compare against ("better than what?")

This matters because Phase 4 (the optional recommendation tool) is gated on "the metadata layer proves useful." If no feedback mechanism exists, Phase 4 never passes its gate criteria.

**Severity:** Low-Medium

**Recommended fix:** Phase 2 or 3 should include a minimal stated feedback mechanism - even just noting that feedback will be tracked via developer community posts, support conversations, or a structured prompt example. Without a stated mechanism, "qualitative developer feedback" is hope, not a metric.

---

### Gap 5: The "false precision risk" is named but not mitigated in the requirements

**Socratic question:** "The PRD correctly flags that motion choices are partly taste-based. What does the product actually do to avoid overclaiming?"

Risk 4 (False Precision Risk) states:

> "The product should support good decisions, not pretend every decision is objectively correct."

But the functional requirements do not reflect this. Requirement 4 specifies `emotional_tone`, `recommended_contexts`, and `avoid_for` without distinguishing:

- how confident or provisional these labels are
- whether agents should signal uncertainty when picking from multiple valid candidates
- whether metadata fields represent technical constraints or editorial taste

There is a meaningful difference between:

- `avoid_for: ["destructive-actions"]` - a principled UX rule, defensible and stable
- `emotional_tone: ["playful"]` - editorial taste that could reasonably be disputed

If the schema treats both as equally authoritative, agents will exclude a "playful" preset from a professional fintech dashboard with the same confidence as excluding a write-tool from a read-only surface. One is a UX principle; the other is taste.

**Severity:** Medium

**Recommended fix:** The metadata schema should distinguish field confidence levels:

- **Constraint fields:** avoid-for by interaction type, trigger compatibility, duration limits (agents should treat as hard rules)
- **Editorial fields:** emotional tone, tone context suitability (agents should treat as guidance, not hard exclusions)

This distinction can live in the guidance prose document rather than requiring a schema change, but it must be stated explicitly. The PRD should acknowledge this category split so the metadata author knows which fields require defensible rationale and which require only editorial care.

---

## Structural Gap: No "Definition of Success" Narrative

Every strong PRD includes a brief concrete scenario that makes the goal tangible. The problem statement is clear. The requirements are clear. But there is no moment where a reader thinks "oh, that is what it will feel like when this works."

The analysis document from `motion-lab-agent-library-analysis.md` wrote this scenario out in full: the 8-icon fintech dashboard, 7 phases from context capture through targeted follow-up adjustment. That scenario is the best validation test for the PRD's requirements. The PRD should reference or summarize it.

**Recommended fix:** Add a "Definition of Success" or "Target Scenario" section after the Goals, using the 8-icon fintech dashboard scenario as a concrete anchor. This helps reviewers evaluate whether the requirements actually produce that outcome and gives engineers a mental model to work toward during implementation.

---

## What Is Structurally Complete (No Gaps Found)

| PRD dimension | Status |
|---|---|
| Problem statement | Referenced and verifiable |
| Target user and JTBD | Clearly stated |
| Non-goals | Appropriately bounded |
| Product principles | Load-bearing, not decorative |
| Functional requirements | 7 requirements, each with acceptance signal |
| Phased scope | Correct sequence |
| Risks | All four named risks are real and honest |
| Security requirements | Read-only agent access explicitly required |
| Success metrics | Primary, supporting, and guardrail metrics all present |

---

## Gap Summary Table

| Area | Gap | Severity | Recommended fix |
|---|---|---|---|
| Metadata schema | Field names, types, and examples not defined in PRD | Medium | Reference or promote schema from analysis doc; create `agent-metadata-schema.md` |
| Parity safeguards | No specified mechanism; listed as "examples" not requirements | **High** | Require automated CI parity check; make it a Phase 0 acceptance criterion |
| Shared preset architecture | Open Question 5 not resolved; required for Phase 0 | **High** | Name proposed module location and import pattern in constraints section |
| Developer feedback loop | "Qualitative feedback" with no stated collection mechanism | Low-Medium | State how feedback will be collected before Phase 4 gate can be applied |
| False precision | Constraint vs editorial fields not distinguished in requirements | Medium | Add field confidence categories to schema; document distinction in guidance prose |
| Success narrative | No concrete scenario anchoring the requirements | Low | Add fintech dashboard scenario as "Definition of Success" section |

---

## Bottom Line

This PRD is approved for Phase 0 implementation. Phase 0 is primarily an engineering task (replace the 12-preset registry, build the shared module) that the PRD specifies clearly enough to begin.

The two High-severity gaps are most consequential for Phase 2 (metadata schema) and Phase 3 (enriched MCP output). Before Phase 2 begins, two things must be resolved:

1. **Create `docs/plans/agent-metadata-schema.md`** with typed field definitions and at least one full example record. This is already listed as a planned deliverable in `agent-library-plan.md` but does not exist yet.

2. **Resolve the shared preset source architecture decision** - file location, format (JS module vs JSON), and import pattern for both browser and MCP. Write this down even briefly before Phase 0 engineering starts.

The PRD answers "what are we building?" cleanly. The two High gaps are the remaining open questions in "what exactly does it look like when we are done?"

---

## Sources Consulted

- `docs/motion-lab-agent-library-prd.md` (input document)
- `docs/motion-lab-single-source-of-truth-audit.md`
- `docs/motion-lab-agent-library-analysis.md`
- `docs/plans/agent-library-plan.md`
- `docs/plans/agent-library-feasibility.md`
