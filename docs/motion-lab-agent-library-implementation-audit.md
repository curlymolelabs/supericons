# Motion Lab Agent Library: Implementation Audit and Delivery Plan

**Date:** April 11, 2026
**Scope:** Phase 0, Phase 1, and Phase 2 in-progress
**Method:** Direct code inspection of all implementation files
**Principle:** Foundation first. No documentation that describes an incomplete system. No code that emits unresolved contracts. Each phase must be complete and clean before the next begins.

---

## Files Inspected

| File | Role |
|---|---|
| `lib/motion-lab-presets.js` | Shared preset source (new, Phase 0) |
| `lib/motion-lab-workflow.js` | MCP export layer (refactored, Phase 0 and Phase 1) |
| `scripts/verify-motion-lab-preset-parity.mjs` | Parity enforcement (new, Phase 0) |
| `package.json` | Build pipeline (updated, Phase 0) |
| `docs/plans/agent-metadata-schema.md` | Schema definition (new, Phase 2 prerequisite) |

---

## Phase 0: Complete

### What was verified in code

**Shared preset source (`lib/motion-lab-presets.js`):**
One file now owns all preset data. Exports confirmed:

- `MOTION_LAB_PRESET_GROUPS` - group structure with ordered preset items
- `MOTION_LAB_PRESETS` - keyframe and easing definitions for all 80 presets
- `MOTION_LAB_PRESET_IDS` - ordered flat list derived from groups then ungrouped remainder
- `MOTION_LAB_PRESET_METADATA` - computed label, group, description per preset
- `getMotionLabPresetMeta(presetId)` - single-preset lookup
- `listMotionLabPresetMeta()` - full list lookup

**Preset count:** 80 confirmed across 4 groups:

| Group | Count |
|---|---|
| Motion | 25 |
| Entrances | 15 |
| Exits | 15 |
| Special | 25 |
| **Total** | **80** |

**MCP layer import (`lib/motion-lab-workflow.js`, lines 1-5):**
Confirmed. Imports directly from `./motion-lab-presets.js`. The orphaned 12-preset registry is gone.

**Parity check (`scripts/verify-motion-lab-preset-parity.mjs`):**
Confirmed and well-implemented. The script:

- Parses `store.js` browser DOM structure via regex to extract live preset buttons
- Compares groups by key, label, and item ordering against `MOTION_LAB_PRESET_GROUPS`
- Checks for duplicate ids in both the browser DOM and the shared source
- Compares full ordered id arrays with an exact `join('|')` match
- Exits with code 1 on any mismatch

**Parity wired into build (`package.json`, line 16):**
Confirmed. The `build` script runs `verify:motion-lab-presets` as part of the pipeline before `vite build`. Preset drift now fails the production build automatically.

**Phase 0 verdict: Complete. All PRD requirements met.**

---

## Phase 1: Effectively Complete - One Cleanup Required Before Phase 3

### What was verified in code

**`listMotionLabPresets()` (`lib/motion-lab-workflow.js`, lines 126-154):**
Returns a rich object per preset sourced from `MOTION_LAB_PRESET_IDS`. Fields returned: id, label, group, description, supported triggers, default duration, intensity range, and export compatibility. PRD Phase 1 acceptance signal met: `list_motion_presets()` now exposes all browser-supported presets and groups.

**Phase 1 verdict: PRD acceptance signal met.**

### One cleanup required before Phase 3 begins

The `listMotionLabPresets()` response and `buildMotionLabRecipe()` both emit duplicate keys for the same values, one camelCase and one snake_case:

```js
supportedTriggers,
supported_triggers: supportedTriggers,   // duplicate

intensityRange,
intensity_range_percent: intensityRange, // duplicate

exportCompatibility,
export_compatibility: exportCompatibility, // duplicate
```

**Why this must be resolved before Phase 3:**

The `agent-metadata-schema.md` defines field names in snake_case as the canonical agent-facing contract. Phase 3 will add more enriched metadata fields to the MCP output. If the camelCase/snake_case duplication pattern is not cleaned before Phase 3, every new field added in Phase 3 will inherit the same ambiguity, doubling the response payload on every subsequent addition.

Agents reading MCP output for decision-making will inconsistently use one or the other key depending on training. The schema is the contract. The MCP output must match it exactly.

**Fix:** Remove all camelCase duplicate keys. Emit snake_case only, matching the schema. If any downstream consumer depends on camelCase keys, document that as a named compatibility concern, not a silent double-emit.

**When to fix:** Before Phase 3. Not required for Phase 2 curation or guidance work since those are docs-only.

### One placeholder to carry forward into Phase 2 metadata curation

The `intensityRange` in `listMotionLabPresets()` is hardcoded as `{ min: 25, max: 200, default: 100 }` for every preset. This is the global tool parameter range, not a preset-specific safe range. The schema document (`agent-metadata-schema.md`, lines 217-223) explicitly states this distinction and corrects the example record to use a realistic preset-specific range.

This is acceptable as a Phase 1 placeholder because per-preset intensity ranges cannot be populated until the metadata curation pass happens. The Phase 2 curation pass must replace these global-limit placeholders with real preset-calibrated ranges for all 80 presets.

---

## Phase 2: Correct Sequencing Before Continuing

Phase 2 in the PRD has three deliverables:

1. Create and approve `docs/plans/agent-metadata-schema.md`
2. Publish Motion Lab agent guidance document
3. Curate light metadata for all 80 presets

Deliverable 1 is complete. Deliverables 2 and 3 remain.

The question is: which comes next, the curation pass or the guidance document?

### Why curation must come before the guidance document

The guidance document is a developer-facing and agent-facing reference. Its value is in giving concrete, specific advice about which presets to use in which contexts. That advice depends on whether it is drawn from actual curated data or invented examples.

If the guidance document is written before curation:

- Every specific recommendation in the document will be based on the author's immediate judgment at the time of writing, not on the consistently curated dataset
- When the curation pass produces 80 records, the guidance document will need to be partially rewritten to align with the vocabulary choices made during curation (emotional tone tags, context labels, intensity ranges)
- There is no guarantee the guidance doc and the metadata records will agree on terminology

If the guidance document is written after curation:

- The patterns in the 80 records surface the principles naturally. The document describes what the data actually shows rather than asserting principles in advance
- Real preset examples can be cited accurately ("for restrained professional interfaces, compare `sweep`, `glide`, and `breathe`") because those records exist and are consistent
- The vocabulary is already locked. There is no rewrite needed after curation

**The guidance document depends on the curated dataset. The curated dataset does not depend on the guidance document.** Foundation first.

### Why curation itself needs a short pre-curation step

Starting curation across 80 records without a shared vocabulary reference will produce inconsistent records. The schema defines field structure but not bounded allowed values for editorial fields. Specifically:

- `emotional_tone` has example tags but no bounded set. Two curators might use `restrained` and `subtle` for the same quality.
- `recommended_contexts` has examples but no defined taxonomy. One record might say `fintech` and another might say `professional-sidebar`. These need to align.
- Intensity range calibration varies by group. Motion presets loop continuously so sustained ranges matter. Entrance and Exit presets play once so they can handle more aggressive values. Without a shared calibration principle, the 80 intensity ranges will not form a coherent set.

A short internal curation guide (not the developer guidance doc) resolves this before curation begins. It is the internal reference for curators, not the external reference for developers and agents.

---

## Prioritized Delivery Sequence

The following sequence applies the foundation-first principle at every step. Nothing begins until its dependency is complete. Nothing is documented before the system it describes is built.

### Step 1: Curation guide (internal, Phase 2 prerequisite)

**What it is:** A short internal document (not the developer-facing guidance doc) that defines:

- Bounded vocabulary for `emotional_tone` tags (a closed set, approximately 12-15 terms)
- Bounded vocabulary for `recommended_contexts` (a closed set, approximately 15-20 terms)
- Bounded vocabulary for `avoid_for` (aligned with the contexts set, with cardinality guidance: no more than 4 per preset, do not negate your own recommended_contexts)
- Intensity range calibration principles per group:
  - Motion presets (loop continuously): calibrate for sustained visual comfort, typically 40-80%
  - Entrance presets (play once on appearance): can tolerate higher peaks, typically 50-100%
  - Exit presets (play once on removal): match entrance group range generally
  - Special presets (authored individually): calibrate individually per preset character
- A rule for `technical_output_notes`: must be preset-specific, not generic tool guidance

**Dependency:** Schema document (done).
**Output:** `docs/plans/motion-lab-curation-guide.md`
**Why first:** Every curation decision downstream depends on this vocabulary being locked.

---

### Step 2: 80-preset metadata curation pass (Phase 2 core deliverable)

**What it is:** 80 JSON records conforming to the v1 minimum field set defined in `agent-metadata-schema.md`. Every preset receives:

- All required hard-rule fields (preset id, label, group, description, supported triggers, duration guidance, intensity range, export compatibility, technical output notes)
- All required editorial guidance fields (visual character, emotional tone, recommended contexts, avoid for)

**Dependency:** Curation guide (Step 1).
**Output:** A curated dataset file, for example `data/motion-lab-preset-metadata.json`
**Why second:** The guidance document and Phase 3 MCP enrichment both depend on this data existing. It is the foundation for everything that follows.

---

### Step 3: Developer-facing guidance document (Phase 2 final deliverable)

**What it is:** The prose document that developers hand to an AI agent to improve preset selection quality immediately, without waiting for richer MCP tooling. Based on the patterns found in the 80 curated records.

Contents:

- How Motion Lab presets are grouped and what each group is suited for
- How to interpret emotional tone tags and context labels
- How to choose between trigger modes for different interface patterns
- When to use CSS export vs animated SVG export
- How to set intensity for different product contexts
- Worked examples using real preset records from the dataset

**Dependency:** 80-preset curation pass (Step 2).
**Output:** `docs/motion-lab-agent-guidance.md`
**Why third:** This document describes the curated system. It cannot be accurate or stable before the system it describes is complete.

---

### Step 4: MCP schema cleanup (Phase 1 completion, code)

**What it is:** Remove camelCase duplicate keys from `listMotionLabPresets()` and `buildMotionLabRecipe()` in `lib/motion-lab-workflow.js`. Emit snake_case only, matching `agent-metadata-schema.md`.

**Dependency:** Must be done before Phase 3. Can be done in parallel with Steps 1-3 since it is a code change with no docs dependency.
**Output:** Updated `lib/motion-lab-workflow.js`

---

### Step 5: Phase 3 - Enriched MCP output

**What it is:** Return richer metadata in `list_motion_presets()` including visual character, emotional tone, recommended contexts, avoid for, and export compatibility from the curated dataset. Support rationale-ready agent outputs.

**Dependency:** Curated dataset (Step 2) and MCP schema cleanup (Step 4).
**Why fifth:** MCP can only return accurate per-preset metadata after the curation pass exists. Wiring placeholder data into Phase 3 output would recreate the same problem the project was built to solve.

---

### Step 6: Phase 4 - Optional recommendation tooling

**What it is:** Evaluate whether a recommendation-oriented MCP tool (`recommend_motion_preset`, `describe_motion_context`) is warranted, based on developer feedback collected after Phase 3 ships.

**Dependency:** Phase 3 MCP enrichment, developer feedback collection.
**Why last:** The PRD correctly reserves this as optional. No tool until the metadata layer proves useful in practice.

---

## Delivery Summary

| Step | Deliverable | Type | Dependency | Phase |
|---|---|---|---|---|
| 1 | `motion-lab-curation-guide.md` | Internal docs | Schema done | Phase 2 |
| 2 | `motion-lab-preset-metadata.json` | Data | Step 1 | Phase 2 |
| 3 | `motion-lab-agent-guidance.md` | Developer docs | Step 2 | Phase 2 |
| 4 | MCP key convention cleanup | Code | None (parallel) | Phase 1 completion |
| 5 | Enriched MCP preset output | Code | Steps 2 + 4 | Phase 3 |
| 6 | Optional recommendation tooling | Code + docs | Phase 3 + feedback | Phase 4 |

**Nothing in this sequence is half-built.** Each step is complete when its named output is done and its dependency chain is satisfied. No step produces a document that describes a system not yet built. No step produces code that emits contracts not yet defined.

---

## Sources Consulted

- `lib/motion-lab-presets.js`
- `lib/motion-lab-workflow.js`
- `scripts/verify-motion-lab-preset-parity.mjs`
- `package.json`
- `docs/motion-lab-agent-library-prd.md`
- `docs/plans/agent-metadata-schema.md`
- Prior audits: `prd-audit.md`, `prd-audit-v2.md`, `prd-audit-v3.md`
