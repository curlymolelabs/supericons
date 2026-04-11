# Motion Lab Agent Library: PRD and Schema Audit (v3)

**Date:** April 11, 2026
**Inputs:**
- `docs/motion-lab-agent-library-prd.md` (third revision, 398 lines)
- `docs/plans/agent-metadata-schema.md` (new document, 344 lines)
**Prior audits:** `prd-audit.md` (v1), `prd-audit-v2.md` (v2)
**Method:** Line-by-line verification of claimed changes + full schema document audit
**Verdict:** PRD is done. Schema is structurally sound with two issues in the example record that must be corrected before curation begins.

---

## Part 1: Verifying the Four Claimed PRD Changes

### Claim 1: v1 covers all 80 presets with lighter metadata

**Verified.** Phase 2 (line 271) now reads:

> "curate light metadata for all 80 Motion Lab presets in v1, with deeper metadata added iteratively after launch."

The "full preset set or a validated rollout subset if needed" wording is gone. The commit is clean and unambiguous.

### Claim 2: Requirement 5 uses a small internal scenario set

**Verified.** Line 214:

> "a developer can provide the guidance to an agent and improve preset selection quality across a small internal scenario set, compared with bare preset names alone."

The baseline is now explicit ("compared with bare preset names alone") and the evaluation mechanism is named ("small internal scenario set"). This is the correct weight for PRD level.

### Claim 3: Requirement 6 explicitly ties output decisions to `export_compatibility`

**Verified.** Line 230:

> "an agent can produce output and rationale using supported parameters only, including consulting the preset's `export_compatibility` metadata where available."

The loop between the metadata definition (Requirement 4) and the workflow requirement (Requirement 6) is closed.

### Claim 4: Old Open Question 5 removed

**Verified.** The Open Questions section now has three questions instead of five. The underlying concern was correctly migrated to the schema document's curation threshold section rather than discarded.

**All four claimed changes verified. The PRD accurately represents what was described.**

---

## Part 2: PRD Residual Issue

### Open Question 2 is now answered by the schema document

The question at line 376 reads:

> "Which metadata fields belong in machine-readable output versus prose-only guidance?"

The schema document answers this directly. It defines the curation threshold for editorial fields, classifies all fields as hard-rule or editorial, marks required fields for v1, and specifies the Phase 1 vs Phase 2 MCP rollout. Open Question 2 is a resolved question, not an open one.

Leaving a resolved question as "open" is the same class of drift the project was built to prevent.

**Severity:** Low

**Recommended fix:** Replace the question with a one-line note pointing to `docs/plans/agent-metadata-schema.md` as the document that resolved it. Or close it entirely since the schema doc is already listed in the Recommended Delivery Order.

---

## Part 3: Schema Document Audit

The schema document is well-constructed. The structure (purpose, v1 coverage decision, field classes, curation threshold, minimum requirements, field definitions table, example record, validation rules, MCP rollout) is the right sequence and the right level of detail.

### What Is Strong

**Curation threshold (lines 64-72):**
The most important section in the document and it is done correctly. Five criteria that are defensible, non-circular, and actionable:

1. Phrased as guidance, not an objective claim
2. Helps choose between presets in a real interface context
3. Can be defended in internal product review
4. Does not conflict with the current Motion Lab browser experience
5. Supported by at least one internal usage scenario, docs example, or pairing rationale

The "if it does not meet this threshold, it stays in prose only" boundary is clearly stated.

**Field definitions table (lines 125-146):**
The right columns: type, required in v1, class, description. The `Required in v1` column makes the v1 minimum unambiguous. This is the format a developer actually needs to implement against.

**`export_compatibility` field spec (lines 184-199):**
The recommended shape is correctly designed:

```json
{
  "css": true,
  "animated_svg": true,
  "notes": []
}
```

Naming the three MCP export tools (`export_motion_css`, `export_animated_svg`, `animate_icon`) inside the field definition creates a direct link from schema to implementation.

**MCP rollout split (lines 312-335):**
Phase 1 returns breadth (7 fields), Phase 2 adds the editorial decision layer. This prevents the schema from becoming all-or-nothing on day one and avoids creating a partial-support tier within the library.

---

### Issue 1: `export_compatibility` table row does not reference the recommended shape

**Location:** Field definitions table, line 136.

The table lists `export_compatibility` as type `object`. A reader consulting only the table would not know the expected keys (`css`, `animated_svg`, `notes`). The full shape is defined in the field spec section further down the document, but the table does not point to it.

**Impact:** Documentation completeness gap. Not a correctness issue, but a usability issue for curators who consult the table as their primary reference.

**Severity:** Low

**Recommended fix:** Add a `notes` column entry to the table row for `export_compatibility`, or add a parenthetical reference: "See field spec for recommended key shape." Alternatively, expand the type column to show the shape inline: `{ css: bool, animated_svg: bool, notes: string[] }`.

---

### Issue 2: `technical_output_notes` in the example record is generic boilerplate, not preset-specific

**Location:** Example record, lines 265-268.

```json
"technical_output_notes": [
  "Use supported trigger values only.",
  "Respect intensity and duration ranges when building exports."
]
```

These two strings apply to every preset, not specifically to `sweep`. They describe general tool usage rules, not implementation or export constraints unique to this preset.

The purpose of `technical_output_notes` is to carry constraints an agent must know that are specific to this preset. For `sweep`, a real note would be something like:

> "CSS output uses `stroke-dashoffset` animation. Ensure the target icon has visible stroke paths for best results."

The current example teaches curators that generic boilerplate is acceptable output for this field. If curators follow this example, all 80 records will have identical `technical_output_notes` that carry no decision value. The field will exist in the schema, be populated in every record, and be useless to agents.

**Severity:** Medium - affects curation quality across all 80 records if not corrected before curation begins.

**Recommended fix:** Replace the boilerplate notes in the `sweep` example with a real preset-specific technical constraint. Add a brief note in the field spec clarifying: "This field should contain constraints specific to this preset's implementation or export behavior. Generic tool usage rules should not be repeated here."

---

### Issue 3: `intensity_range_percent` in the example record uses global tool limits, not preset-specific safe range

**Location:** Example record, lines 256-259.

```json
"intensity_range_percent": {
  "min": 25,
  "max": 200
}
```

These are the global MCP tool limits (the tool accepts intensity from 25 to 200). That is not what this field is meant to carry. The field description in the table (line 135) says "Recommended safe intensity range" - meaning the range within which this specific preset produces good results, not the full range the export tool accepts.

For `sweep`, the recommended safe intensity range based on prior analysis is approximately 40-80%. At above 80% it loses its deliberate, restrained character and begins to feel aggressive. At below 40% it becomes imperceptible on many icon designs.

Using 25-200 as the example value teaches curators to set every preset to the same global tool range. This makes the field indistinguishable from a global tool spec and provides no decision value to agents. An agent filtering presets by intensity range would get no differentiation between presets because every record would show 25-200.

This is the most significant issue in the schema document. It needs correction before curation begins.

**Severity:** High within the schema document - makes `intensity_range_percent` a useless field across all 80 records if the example is followed.

**Recommended fix:**

1. Update the example record to use a realistic preset-specific range: `{ "min": 40, "max": 80 }` for `sweep`.
2. Add a clarifying note in the `intensity_range_percent` field spec: "This field describes the intensity range within which this preset produces good results for most contexts. It is not the full parameter range the export tool accepts globally (25-200). Curators should test or reason about the specific preset's behavior to determine appropriate min and max values."

---

## Summary Table

| Item | Status | Notes |
|---|---|---|
| PRD change 1: all 80 presets committed | Verified | Clean, unambiguous |
| PRD change 2: Req 5 acceptance signal | Verified | Correct weight, baseline explicit |
| PRD change 3: Req 6 `export_compatibility` link | Verified | Loop correctly closed |
| PRD change 4: Open Question 5 removed | Verified | Concern migrated to schema doc |
| PRD Open Question 2 | Low - residual | Answered by schema doc; should be closed or pointed there |
| Schema: curation threshold | Strong | Well-structured, defensible, correctly placed |
| Schema: field definitions table | Strong | Right format, v1 minimum unambiguous |
| Schema: MCP rollout split | Strong | Correct breadth-first approach |
| Schema: `export_compatibility` table row | Low | Does not reference recommended shape; usability gap for curators |
| Schema: `technical_output_notes` example | **Medium** | Generic boilerplate instead of preset-specific constraint; misleads curators |
| Schema: `intensity_range_percent` example | **High** | Uses global tool range (25-200) instead of preset-specific safe range; makes field useless if followed |

---

## Conclusion

**PRD:** Done. No blocking issues remain. Status can be moved from "Draft for review" to "Approved."

**Schema document:** Structurally sound. Two issues in the example record (Issues 2 and 3) need correction before curation begins against it. The example record is the reference curators will follow across all 80 presets - if the example shows boilerplate `technical_output_notes` and global-limits `intensity_range_percent`, those patterns will propagate silently into every record. The corrections are small but must happen before curation starts.

**Recommended immediate next steps:**
1. Correct the `technical_output_notes` example in `agent-metadata-schema.md` to use a preset-specific technical constraint
2. Correct the `intensity_range_percent` example to use a preset-specific safe range with a clarifying note in the field spec
3. Close PRD Open Question 2 with a pointer to the schema document
4. Begin Phase 0 engineering (shared preset module at `lib/motion-lab-presets.js`, parity CI check)

---

## Sources Consulted

- `docs/motion-lab-agent-library-prd.md` (v3 revision, this audit's primary input)
- `docs/plans/agent-metadata-schema.md` (new document, this audit's secondary input)
- `docs/motion-lab-agent-library-prd-audit-v2.md` (prior audit, used as diff baseline)
- `docs/motion-lab-agent-library-analysis.md`
