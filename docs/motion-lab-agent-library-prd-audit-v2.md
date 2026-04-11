# Motion Lab Agent Library PRD: Revised PRD Audit (v2)

**Date:** April 11, 2026
**Input:** `docs/motion-lab-agent-library-prd.md` (revised, 400 lines)
**Prior audit:** `docs/motion-lab-agent-library-prd-audit.md`
**Method:** Socratic prompting + design thinking, second pass
**Verdict:** All five original gaps resolved. Four second-order issues remain, one of which is a Phase 2 blocker.

---

## What the Revision Fixed

The revision addressed all five gaps from the first audit. The following is a precise accounting of what changed and whether the fix is adequate.

### Gap 1: Metadata schema undefined - Resolved

Requirement 4 now includes a hard gate:

> "This metadata must be defined in `docs/plans/agent-metadata-schema.md` before Phase 2 implementation begins. That schema document must include: field names, data types, allowed value shapes, at least one full example record."

The hard-rule vs editorial guidance field split is now explicit and placed directly in the requirement. Agents are told how to treat each class of field. This is the correct fix in the correct location.

### Gap 2: Parity safeguards advisory not mandatory - Resolved

Requirement 7 now states:

> "Phase 0 must include an automated parity check in CI that compares preset ids and group membership between the browser-consumed and MCP-consumed views of the shared preset source. If they diverge, the build must fail."

"Must" appears twice and "fail" appears explicitly. This is a genuine hard requirement now, not an advisory example list.

### Gap 3: Shared preset architecture undefined - Resolved at planning level

Phase 0 now names a proposed location: `lib/motion-lab-presets.js`. The Technical Constraints section states the shared module approach. The remaining detail (exact module shape, exports, import pattern) is appropriately left for Phase 0 engineering rather than the PRD.

### Gap 4: Developer feedback loop undesigned - Resolved

The new "Feedback Collection" subsection names three concrete mechanisms:

- structured internal prompt evaluations against repeatable scenarios
- developer feedback from docs examples and implementation reviews
- support or community notes comparing agent-selected presets with manual browser choices

This is proportionate to the product stage and gives Phase 4's gate an actual collection mechanism.

### Gap 5: False precision not mitigated in requirements - Resolved

Requirement 4 now separates hard-rule fields from editorial guidance fields, names which fields go in each category, and states:

> "Agents should treat hard-rule fields as operational constraints. Agents should treat editorial guidance fields as informed recommendations, not absolute truth."

This distinction is in the requirement itself, not only in a risk paragraph. Correct placement.

### Structural gap: No success narrative - Resolved

The "Definition of Success" section is now present and concrete. It includes the fintech dashboard scenario and states what success looks and feels like at the product level.

---

## What Still Has Room for Improvement

The revision closed all five original gaps. The following are second-order issues that become visible now that the document is more mature.

---

### Issue 1: Open Question 5 is already answerable from within the PRD

**Revised Open Question 5:**

> "Which editorial guidance fields are strong enough for machine-readable output, and which should stay prose-only until they are better validated?"

**Socratic question:** "If Requirement 4 already classified fields into hard-rule and editorial categories, why is this still an open question?"

What Open Question 5 is actually asking is: within the editorial guidance fields (emotional tone, recommended contexts, avoid-for, pairing notes), which ones are validated enough to machine-encode in v1? That is a curation decision, not an architectural one. It cannot be answered at PRD level but it can be assigned as a deliverable.

**Severity:** Low

**Recommended fix:** Close this as an open question. Promote it to a Phase 2 deliverable: "The `agent-metadata-schema.md` document must define a curation threshold that editorial fields must meet to qualify for machine-readable encoding in v1." That gives Phase 2 a concrete gate rather than a floating open question.

---

### Issue 2: The "validated rollout subset" in Phase 2 has no selection criteria

**Phase 2 states:**

> "curate metadata for the full preset set or a validated rollout subset if needed"

**Socratic question:** "If you ship a subset, how do you decide which presets are in it? And what happens to the presets that are not included?"

Without criteria, "a validated rollout subset" becomes a way to defer work indefinitely. An agent encountering presets with no metadata in Phase 3 falls back to bare name matching for those presets - exactly the behavior this library is designed to replace. Partial coverage creates a two-tier experience where some presets are well-supported and others are invisible to agent decision-making.

**Severity:** Medium (Phase 2 blocker if left unresolved)

**Recommended fix:** Either commit to all 80 presets with light metadata (breadth over depth for v1, recommended), or define explicit subset criteria such as: "The rollout subset is defined as presets with at least one confirmed use in Supericons documentation or example content." Without criteria, the subset decision will be made arbitrarily under delivery pressure.

---

### Issue 3: Requirement 5 acceptance signal is not verifiable

**Requirement 5 acceptance signal:**

> "A developer can hand the guidance to an agent and get better motion choices than with bare preset names."

**Socratic question:** "Better than what? Compared to which baseline? When? Evaluated by whom?"

"Better" is not testable without a reference point. An acceptance signal should be passable or failble by a reviewer who was not involved in writing it. As written, the signal passes automatically because no one can fail it.

**Severity:** Low-Medium

**Recommended fix:** Sharpen the signal to something verifiable: "A developer can provide the guidance document to an agent and, on at least 3 of 5 structured test scenarios defined in Phase 2, the agent selects a preset that passes an internal product review for context-appropriateness." This is still qualitative at the evaluation level but it has a pass/fail shape.

---

### Issue 4: `export_compatibility` field defined in Requirement 4 is not referenced in Requirement 6

Requirement 4's hard-rule fields now include `export_compatibility`. Requirement 6 covers the export-aligned agent workflow. The two requirements do not cross-reference each other, and Requirement 6's acceptance signal does not mention checking `export_compatibility` from the metadata.

This creates a gap where:

- Requirement 4 says the metadata will have export compatibility information
- Requirement 6 says agents should reach output without inventing unsupported behavior
- Nothing says agents should consult `export_compatibility` to make that determination

If an agent does not know to consult `export_compatibility` before choosing CSS vs animated SVG, the field exists but is not wired into the workflow it was designed to support.

**Severity:** Low

**Recommended fix:** Add one line to Requirement 6's acceptance signal: "...including consulting the preset's `export_compatibility` metadata field where available." This closes the loop between the metadata definition and the workflow requirement that should consume it.

---

## Issue Summary Table

| Issue | Severity | Phase impact | Recommended fix |
|---|---|---|---|
| Open Question 5 already answerable inside PRD | Low | Phase 2 | Promote to a Phase 2 schema deliverable; close as open question |
| "Validated rollout subset" has no selection criteria | **Medium** | Phase 2 blocker | Commit to 80 presets with light metadata, or define explicit subset criteria |
| Requirement 5 acceptance signal not verifiable | Low-Medium | Phase 2 | Define the test scenario count and evaluation method |
| `export_compatibility` not referenced in Requirement 6 | Low | Phase 3 | Add one sentence to Req 6 acceptance signal |

---

## Conclusion

The revision was a genuine and thorough improvement. All five gaps from the first audit are resolved. The PRD is now substantially stronger and is unambiguously ready for Phase 0 implementation.

The one remaining issue that matters before Phase 2 begins is Issue 2: the "validated rollout subset" needs selection criteria or a commitment to full 80-preset coverage. Leaving this undefined means Phase 2 will either drift into partial coverage without knowing it, or trigger a scope debate mid-delivery.

The highest-value next action is creating `docs/plans/agent-metadata-schema.md`. Phase 2 now formally depends on it as a hard gate in Requirement 4. The schema document should resolve both the field typing (from Requirement 4) and the editorial field curation threshold (from the promoted Open Question 5).

---

## Sources Consulted

- `docs/motion-lab-agent-library-prd.md` (revised, this audit's input)
- `docs/motion-lab-agent-library-prd-audit.md` (first audit, used as diff baseline)
- `docs/motion-lab-agent-library-analysis.md`
- `docs/plans/agent-library-feasibility.md`
