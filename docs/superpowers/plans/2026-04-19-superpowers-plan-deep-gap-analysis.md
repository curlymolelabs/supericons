# Superpowers Plan Deep Gap Analysis

Status: Audit complete  
Date: April 19, 2026  
Auditor: Antigravity  
Method: Multi-lens analysis (Systems Thinking, Technical Architecture, Competitive Strategy, Operational Reality, Business Model)

---

## Purpose

This is a second-pass audit of the four Superpowers plan documents, using different analytical lenses from the first audit. Every finding here is backed by codebase evidence gathered in this session. Only genuine gaps are reported.

Update note:

- the companion plan docs were updated after this audit to incorporate the verified fixes
- keep this file as the audit snapshot of what was missing before those updates

---

## Lens 1: Systems Thinking (Dependencies, Feedback Loops, Bottlenecks)

### Gap 1: The Plans Do Not Acknowledge That Premium Metadata Already Exists in a Rich Format

**Evidence:** `public/packs/manifest.json` (4,927 lines, 111KB) is a top-level object keyed by 8 collection slugs and already contains per-icon `purpose`, `tags`, and `category` fields for all 400 premium icons. The "Status & Feedback" collection alone has 50 icons, each with 4-5 tags and a purpose sentence.

**What the plans say:** The implementation plan (Task 14) says "Convert existing premium purpose, tags, and category into full registry records. Add depiction, evidence, confidence, and review-state fields." The rollout roadmap (Workstream C) says "Convert all 400 premium icons into the canonical SI Registry shape."

**The gap:** Neither document acknowledges that the existing manifest already satisfies approximately 60% of the v1 required fields (icon_id derivable from name+collection, source_library from collection slug, style = "animated", asset_kind = "animated-svg", label from name, purpose exists, category exists, semantic_tags from tags). The conversion is a field-mapping exercise, not a semantic authoring exercise. The plans frame it as harder than it actually is.

**Impact:** This understates how quickly Phase 1 can deliver a win. The premium normalization is likely a 2-4 hour scripted transform, not a multi-day effort.

---

### Gap 2: The Taxonomy Seed Is a Dead-End Architecture That the Plans Do Not Reconcile

**Evidence:** `lib/icon-taxonomy-seed.js` contains 150 hardcoded icon IDs across 3 categories (AI and Agents, Navigation and Wayfinding, Status and Feedback). Each entry has an `iconId`, `sourceLibrary`, `jobCategory`, `secondaryCategories`, and `rank`. This is a manually curated list with no connection to any semantic pipeline.

**What the plans say:** The implementation plan (Task 5) says "Keep 3 seeded categories for now" and "Ensure future refactors do not accidentally re-expand scope." The rollout roadmap mentions the taxonomy seed as an input to the tagging pipeline.

**The gap:** The taxonomy seed and the registry are two different data systems with overlapping scope and no reconciliation path. The seed assigns icons to categories by hardcoded ID lists. The registry assigns categories through metadata fields. When the registry exists, what happens to the seed?

There are three possibilities:
1. The seed becomes a read-only legacy input to the registry pipeline (dead data with ongoing maintenance cost).
2. The seed is replaced by registry projections (breaking the purpose-chip experiment that depends on it).
3. Both systems co-exist indefinitely (two sources of truth for category assignments).

None of these transitions are planned or discussed in any of the four documents.

**Impact:** Medium-high. If this is not resolved, the purpose-chip experiment and the registry will compete for category ownership.

---

### Gap 3: The 12-Tool MCP Is Under-Documented in the Plans

**Evidence:** `mcp/index.js` registers exactly 12 tools with `server.tool()`:

1. `search_icons`
2. `get_icon`
3. `list_libraries`
4. `list_motion_presets`
5. `get_motion_recipe`
6. `export_motion_css`
7. `export_animated_svg`
8. `animate_icon`
9. `inspect_converter_options`
10. `inspect_converter_input`
11. `convert_svg_to_png`
12. `convert_png_to_svg`

**What the plans say:** The implementation plan (Task 4) says "Align MCP version and tool count declarations." The registry PRD discusses MCP as a projection target. But no document describes which of the 12 existing tools would consume registry data, or how registry metadata would change tool responses.

**The gap:** The plans treat MCP as a monolithic consumer ("MCP should read from the registry"). But MCP has 12 tools with different data needs. `search_icons` needs semantic_tags and synonyms. `get_icon` could return purpose, use_when, avoid_when. `animate_icon` needs motion_family. None of this per-tool integration mapping exists.

**Impact:** Without this mapping, "integrate registry with MCP" is an unbounded task.

---

## Lens 2: Technical Architecture (Data Model Integrity, Migration Paths)

### Gap 4: The Spec's Example Record Creates a Namespace Collision Risk

**Evidence:** The spec's example record uses `icon_id: "si:agent-planning"`. The MCP's `search_icons` tool uses `id` (bare name like "heart") and `lib` (library name like "lucide") as separate fields. The taxonomy seed uses composite IDs like `material:smart_toy`.

**The gap:** Three different ID formats coexist:
- Registry: `si:agent-planning` (prefix:name)
- MCP tools: `{id: "heart", library: "lucide"}` (two fields)
- Taxonomy seed: `material:smart_toy` (library:name composite)

The spec defines `icon_id` as "globally unique" but does not specify the generation rule, the collision resolution strategy, or how existing MCP and taxonomy IDs map to registry IDs.

**Impact:** If the ID format is not locked before the first registry records ship, every downstream consumer that indexes by ID will need migration when the format changes.

**Suggestion:** Define the canonical ID format explicitly. The simplest option: `{source_library}:{source_name}` for aggregated icons, `si:{name}` for SI-native icons. Document the rule, not just examples.

---

### Gap 5: The "Projections" Architecture Has No Conflict Resolution Strategy

**Evidence:** The blueprint lists 9 projection targets. The spec says "The record should not be duplicated manually across these surfaces." But the current codebase already has manual duplication: `public/icon-index.json` is generated by `scripts/build-icons.js`, while `mcp/public/icon-index.json` is a copy in the MCP package `files` array.

**The gap:** When the registry generates a new `icon-index.json`, what happens if it conflicts with the existing build pipeline? The build uses `scripts/build-icons.js` to read from npm-installed icon packages. The registry generates from its own canonical records. These are two different data sources producing the same output artifact.

There is no described transition from "build-icons.js reads raw packages" to "build scripts read registry records." This is a dependency inversion that the plans acknowledge in spirit ("migrate consumers gradually") but do not map concretely.

**Impact:** High for the build pipeline. If registry projections and legacy build scripts produce different `icon-index.json` files, the product ships with contradictory data.

---

### Gap 6: Version Drift Is Worse Than the Plans State

**Evidence from this session:**
- Root `package.json` line 6: `"description": "SuperIcons: 60K+ free icons"`
- MCP `index.js` line 4: comment says `"Provides 3 tools"` (actually 12)
- MCP `index.js` line 493: `version: '0.3.0'`
- MCP `package.json` line 3: `version: "0.3.1"`
- MCP `SKILL.md` line 7: `"Gives AI agents access to 20,000+ SVG icons"`
- `index.html` line 8: title says `"20,000+ Free Icons"`
- `store.js` has at least 6 instances of `"20,000+"` hardcoded in HTML template strings
- `docs-pages.js` has at least 5 instances of `"20,000+"` in template strings

**What the plans say:** The implementation plan identifies "20,000+ vs 21,264 vs 60K+" and "MCP 3 tools vs 12" but frames this as a Task 4 fix.

**The gap:** The string `"20,000"` appears in 133+ audited repo instances. A search-and-replace is not safe because some instances are deliberate marketing copy ("20,000+") while others should show exact counts. The implementation plan's Task 4 says "Replace hardcoded counts where possible" but does not inventory the full blast radius.

**Suggestion:** Before writing any fix, create a complete inventory of every hardcoded count string, classify each as "marketing (keep rounded)" vs "product truth (use exact)" vs "technical (use generated fact)", and then apply fixes per classification. This is the missing step between "we know it drifts" and "we can safely fix it."

---

## Lens 3: Competitive Strategy (Moats, Market Timing, Lock-In)

### Gap 7: The Plans Do Not Define What "Winning" Looks Like Against Specific Competitors

**Evidence:** The registry PRD's analogies section references Simple Icons, Material Symbols, OpenAPI, and Design Tokens. But it does not analyze what those competitors actually offer today and where SI would be differentiated.

**The gap:** Simple Icons already ships structured JSON with `title`, `slug`, `hex`, `source`, `guidelines`, and `license` per icon. Material Symbols ships WOFF2 with axes metadata. Iconify.design ships a unified JSON API across 150+ icon sets with category filters.

The plans claim differentiation through "semantic purpose, usage guidance, confidence, and motion." But the plans never benchmark: "Simple Icons has X fields; we would have X+Y. Here is the Y that matters." Without this, the "moat" claim is aspirational, not grounded.

**Impact:** Low urgency, but important for positioning. If Iconify adds a `purpose` field tomorrow, the differentiation claim weakens. The plans should identify 2-3 fields that are genuinely unique to SI (candidates: `avoid_when`, `anti_pairs`, `confidence_score`, `motion_family`).

---

## Lens 4: Operational Reality (Team Capacity, Real Effort)

### Gap 8: The Plans Assume a Review Infrastructure That Does Not Exist

**Evidence:** The rollout roadmap defines confidence routing (auto-accept, batch review, deeper review) and cadence (nightly batch, weekly triage, monthly cleanup). The spec defines `review_state` values: `ai-suggested`, `human-reviewed`, `editor-approved`, `deprecated`.

**The gap:** There is no review UI, no review queue, no review CLI, and no review workflow in the codebase. The entire review infrastructure is green-field. The roadmap's "weekly editorial triage" assumes a reviewer can efficiently see, compare, approve, or reject records. That requires tooling.

Building a review queue is itself a product feature. It requires:
- A list view of pending records sorted by confidence
- Side-by-side comparison of proposed vs. current metadata
- Approve/reject/edit actions with audit trail
- Filtering by collection, confidence band, category

This is not mentioned in any task list.

**Impact:** Without review tooling, the "confidence-aware review workflow" from the roadmap's Phase 2 success criteria is unreachable. This is a hidden dependency that blocks the continuous semantic factory model.

**Suggestion:** Add a Task to the implementation plan: "Build a minimal review interface (CLI or admin page) that lets an editor view, approve, or reject batched semantic records." This does not need to be pretty, but it needs to exist before the review cadence can start.

---

### Gap 9: The Visual Inspection Pilot Has No Tool Selection or Cost Estimate

**Evidence:** The rollout roadmap says "Run a small pilot first" with 250 icons and lists success criteria, but does not specify which visual model to use, how to invoke it, or what the per-icon cost would be.

**The gap:** The likely hosted cost for a 250-icon pilot is low enough that it should not block the work, and a local open-source lane may be near-zero marginal cost if hardware is already available. But the plans never state even a basic budget guardrail or execution lane.

**Impact:** Low. The cost is small enough that it should not block the pilot. But stating the numbers removes ambiguity and prevents "we cannot afford it" objections.

---

## Lens 5: Business Model (Revenue Impact, Unit Economics)

### Gap 10: No Connection Between Registry Quality and Revenue Metrics

**Evidence:** The registry PRD's success metrics include "search satisfaction," "MCP usefulness," and "browse engagement." The premium manifest has 8 collections totaling 400 icons. The `store.js` pricing page offers Pro subscriptions and pack purchases.

**The gap:** None of the four documents draw a line from registry improvements to revenue. If the registry makes search better, does that increase free-to-paid conversion? If premium icons have richer metadata, does that justify a higher price? If MCP returns `avoid_when` guidance, does that reduce churn?

This is not a failure of the plans per se. They are correctly scoped as technical documents. But the absence of any revenue hypothesis means the registry investment cannot be justified to a stakeholder or investor.

**Impact:** Low urgency for a solo founder. Higher urgency if seeking investment or justifying engineering time against revenue-generating work.

---

## Summary of Genuine Gaps Found

| # | Gap | Lens | Severity |
|---|---|---|---|
| 1 | Premium manifest already has 60% of v1 fields (effort is overstated) | Systems | Medium |
| 2 | Taxonomy seed vs. registry reconciliation is unplanned | Systems | Medium-High |
| 3 | 12-tool MCP has no per-tool registry integration map | Systems | Medium |
| 4 | Three conflicting ID formats with no resolution rule | Architecture | High |
| 5 | No transition plan from build-icons.js to registry projections | Architecture | High |
| 6 | Hardcoded "20,000" appears 133+ times in the audited repo scan; blast radius not inventoried | Architecture | Medium |
| 7 | No competitive benchmarking of SI metadata vs. existing icon systems | Strategy | Low |
| 8 | Review infrastructure (queue, UI, workflow) is fully missing | Operations | High |
| 9 | Visual inspection pilot has no tool selection or cost estimate | Operations | Low |
| 10 | No revenue hypothesis connecting registry quality to business metrics | Business | Low |

---

## Recommendations (Only Where Action Is Needed)

### Must-fix before building (3 items)

1. **Lock the ID format.** Define `{source_library}:{source_name}` for aggregated icons, `si:{name}` for native. Add to the spec as a normative rule, not just an example.

2. **Map the build pipeline transition.** Before any registry projection work, document: "Here is how `scripts/build-icons.js` currently produces `icon-index.json`. Here is how registry projections will replace that. Here is the cutover plan." This prevents two sources of truth for the same artifact.

3. **Reconcile taxonomy seed with registry.** Add a decision to the implementation plan: either (a) registry replaces the seed and purpose chips read from registry projections, or (b) the seed is explicitly marked as a short-lived experiment that will be deprecated when registry categories exist. Do not leave both alive without a plan.

### Should-fix before Phase 2 (2 items)

4. **Build a minimal review interface.** Even a CLI that reads pending records and writes approved/rejected state is sufficient. Without this, the confidence routing model and review cadence are unexecutable.

5. **Inventory all hardcoded count strings.** Create a file listing every instance of "20,000", "21,264", "60K", "3 tools", "12 tools" with classification (marketing/product/technical) and intended source (generated fact vs. static copy).

### Nice-to-have (2 items)

6. **Acknowledge premium manifest richness in the plan.** Update the implementation plan's Task 14 to note: "The existing manifest already provides purpose, tags, and category. Normalization is primarily a field-mapping script, not a semantic authoring task."

7. **State visual inspection pilot budget and lanes.** Even a one-line note about a low single-digit dollar hosted budget plus an optional local open-source lane removes ambiguity.

---

## What Was NOT Found

To satisfy the user's instruction to "do nothing if there are none," these areas were examined and found to be adequately covered by the existing plans:

- **Security model** (public/private split is well-designed)
- **Progressive delivery** (phasing is sound)
- **Schema field design** (the 40+ fields are individually well-justified)
- **Guardrail philosophy** (the implementation plan's 4 guardrails are strong)
- **Governance model** (who proposes, who approves, what is reviewable)
- **Accessibility fields** (correct scope for v1)
- **Motion/dynamics fields** (future-proofing is appropriate)

These strengths were already noted in the first audit and remain valid.
