# Motion Lab Agent Library: Implementation Audit v2

**Date:** April 11, 2026
**Scope:** Phase 2 in-progress - curation guide, dataset, and delivery sequence
**Method:** Direct file inspection of all newly produced deliverables
**Principle:** Every claim in the agent's report is verified against the actual files. No claim is accepted without a file citation.

---

## Files Inspected

| File | Claimed Status | Verified |
|---|---|---|
| `docs/plans/motion-lab-curation-guide.md` | Exists and active | Yes |
| `data/motion-lab-preset-metadata.json` | 80 records, v1 schema | Yes |
| `lib/motion-lab-workflow.js` | camelCase/snake_case gap still open | Yes (unchanged from v1 audit) |
| `docs/motion-lab-agent-guidance.md` | Not yet created | Confirmed absent |

---

## Curation Guide: Verified Complete

`docs/plans/motion-lab-curation-guide.md` is 305 lines and is the correct internal reference for Phase 2 curation.

Confirmed contents:

- **Closed vocabulary for `emotional_tone`:** 15 terms defined at lines 40-55. Rules for tag cardinality and term preference are explicit (e.g. "prefer `restrained` over `subtle` when the preset still reads intentional and visible").
- **Closed vocabulary for `recommended_contexts`:** 18 terms defined at lines 68-88. Rules correctly enforce interface intent over industry labels.
- **`avoid_for` rules:** Lines 99-115. Cardinality cap (0-4), anti-negation rule, and a clear "quietly omit" guidance for broadly usable presets.
- **Intensity calibration by group:** Lines 142-216. Per-group working ranges with rationale:
  - Motion: 40-80 (sustained comfort for looping presets)
  - Entrances: 50-100 (single-play, tolerates stronger peaks)
  - Exits: 50-100 (same reasoning as entrances)
  - Special: calibrate individually per preset character
- **Technical output notes rules:** Lines 230-256. Explicit good/bad examples. Boilerplate is explicitly prohibited.
- **Record writing workflow:** Lines 258-271. 10-step ordered process.
- **Review checklist:** Lines 273-283.

**Curation guide verdict: Complete and correctly formed. No gaps.**

---

## Dataset: Verified - Good Foundation with Four Specific Findings

The dataset is 3,591 lines across 80 records, structured with a top-level `version`, `groups`, and `presets` array. All four groups are represented. All fields from the v1 field set are present in every record inspected. The overall vocabulary compliance is high. Hard-rule fields are accurate. All intensity ranges appear to be preset-specific (none use the global 25-200 limits exactly).

**However, four specific problems were identified during cross-record inspection.**

---

### Finding 1: Copied Technical Notes Across Distinct Presets

This is the most significant finding. Several records share identical or near-identical `technical_output_notes` text where the presets are meaningfully different.

**Evidence:**

`bounce` (line 36-38):
> "Bounce moves the icon on the Y axis, so it reads best on icons with a clear outer silhouette rather than dense inner detail."
> "At higher intensity the rebound can feel toy-like, so keep it restrained in professional product UI."

`pop` (line 258-260):
> "Pop moves the icon on the Y axis, so it reads best on icons with a clear outer silhouette rather than dense inner detail."
> "At higher intensity the rebound can feel toy-like, so keep it restrained in professional product UI."

The first note is identical. The second note is identical. `bounce` and `pop` are different presets with different keyframe signatures: `bounce` has a multi-step lift-and-rebound arc, `pop` has a spring overshoot using a different cubic-bezier. An agent receiving identical technical notes for two different presets cannot distinguish their actual behavior constraints.

**Additional copied-note clusters found:**

- `tremor` and `flicker` share the same two notes word-for-word (lines 705-708 and 932-933). `tremor` vibrates on both axes with translate(). `flicker` animates opacity only. These are substantially different presets with different rendering requirements.
- `orbit` and `spin` share identical note 2 (lines 888-889 and 171-172). `orbit` moves in a tight circular path; `spin` rotates 360 degrees. Different behavior, same warning.
- `radar` and `beacon` share identical note 2 word-for-word (lines 1071 and 1116). `radar` uses scale and filter; `beacon` uses a multi-beat scale-and-filter pattern. Different character, same note.
- `squish` and `jelly` share identical note text (lines 977-980 and 392-395). `squish` compresses vertically; `jelly` oscillates with a multi-keyframe settle. Different mechanics, same description.
- `supernova` and `blackHole` share identical notes (lines 3433-3435 and 3479-3481). `supernova` bursts outward; `blackHole` collapses inward. These are opposite motions with the same operational note.
- `pageFlip` and `bookOpen` share identical note 2 (lines 3298-3299 and 3343-3344). Different enough in metaphor to warrant distinct notes.
- `spatial` and `infinity` share identical notes (lines 3253-3255 and 3210-3211). Different path behaviors, same description.

**Why this matters:** The curation guide explicitly prohibits boilerplate: "Avoid boilerplate. If a note could be copied into every record unchanged, it probably belongs in workflow guidance, not in a preset record." The copied notes violate this rule. An agent reading the dataset cannot distinguish between presets in these pairs from the technical notes alone.

**Action required:** Rewrite the note 1 and note 2 for each affected preset to describe that preset's actual behavior constraints specifically.

---

### Finding 2: `squish` Has the Wrong `visual_character` for the Wrong Preset

`squish` (line 981) has `visual_character: "soft gelatin wobble"`. This is the same value as `jelly` (line 396). `squish` compresses vertically (scale 1 → 1.15 → 1 → 0.85 → 1). It does not wobble. A gelatin wobble is a reasonable description for `jelly`. It is inaccurate for `squish`, which reads as a squash-and-stretch effect.

**Action required:** Change `squish` `visual_character` to something accurate, for example: `"vertical squash and stretch"`.

---

### Finding 3: `blackHole` and `supernova` Assigned Identical `emotional_tone` and `recommended_contexts`

`supernova` (lines 3438-3451): `emotional_tone: [celebratory, bold, dramatic]`, `recommended_contexts: [celebratory-ui, feature-highlight, success-confirmation]`

`blackHole` (lines 3483-3497): `emotional_tone: [celebratory, bold, dramatic]`, `recommended_contexts: [celebratory-ui, feature-highlight, success-confirmation]`

`supernova` bursts outward. `blackHole` collapses inward and resets. They have different easing, different keyframe arcs, and meaningfully different psychological character. `blackHole` collapsing to near-zero scale and re-emerging is not primarily celebratory - it is dramatic and transitional. Assigning it `celebratory` is a category judgment call at best, but giving it the same tone profile as an outward explosion is clearly a copy error rather than a curation decision.

**Action required:** Differentiate the `emotional_tone` and `recommended_contexts` for `blackHole` from `supernova`. Consider `dramatic`, `premium`, `precise` for tone, and `feature-highlight`, `attention-cue`, `success-confirmation` for contexts.

---

### Finding 4: `glitchOn` Technical Note 1 Incorrectly Cites Filter Effects

`glitchOn` (line 1426):
> "Glitch On relies on SVG filters or glow-like effects, so the host environment must preserve inline CSS and SVG filter rendering."

Looking at the actual `glitchOn` keyframes in `lib/motion-lab-presets.js` (lines 942-952): the preset uses only `translateX` and `opacity`. It has no filter effects. The note was written for a filter-based preset (such as `neonglow` or `sparkle`) and applied to `glitchOn` by category assumption rather than by inspecting the actual keyframes.

**Action required:** Replace the note with an accurate description of `glitchOn`'s actual behavior: the preset depends on rapid opacity shifts and lateral translate steps, so brief durations and controlled intensity keep the glitch legible rather than noisy.

---

## Dataset Verdict

The dataset is a strong first pass. Vocabulary compliance across all 80 records is high. All intensity ranges are preset-specific. Hard-rule fields are accurate and complete. The structural schema is correct.

**The four findings above are the only issues:**

| Finding | Severity | Records Affected | Action |
|---|---|---|---|
| 1. Copied technical notes across distinct presets | Medium | ~14 records in identified clusters | Rewrite notes to be preset-specific |
| 2. `squish` wrong `visual_character` | Low | 1 record | Update `visual_character` to `"vertical squash and stretch"` |
| 3. `blackHole` copy of `supernova` profile | Low | 1 record | Differentiate tone and contexts |
| 4. `glitchOn` filter note inaccuracy | Low | 1 record | Rewrite note based on actual keyframes |

None of these are blockers for the guidance document. The agent's self-assessment is accurate: the data foundation is done. These findings are cleanup items that improve the quality of the dataset before Phase 3 enrichment begins.

---

## Delivery Sequence: Confirmed Correct

The current sequence as reported is correct and follows the foundation-first principle:

| Step | Deliverable | Status |
|---|---|---|
| 1 | Curation guide | Complete |
| 2 | 80-preset metadata dataset | Complete (with 4 cleanup items) |
| 3 | Developer-facing guidance doc | Next |
| 4 | MCP snake_case cleanup | Next (parallel, code-only) |
| 5 | Phase 3 enriched MCP output | Not started (correct) |
| 6 | Phase 4 recommendation tooling | Not started (correct) |

**The guidance document is the correct next step.** The four dataset findings do not need to be resolved before writing the guidance doc. They can be resolved during or after the guidance doc pass since they affect individual record quality, not the overall vocabulary, structure, or calibration patterns. However, the affected records should be fixed before Phase 3 enrichment begins, so the enriched MCP output is not built on inaccurate source data.

---

## Phase 2 Completion Criteria

Phase 2 is complete when all three of the following are done:

1. `docs/plans/agent-metadata-schema.md` - Done
2. `data/motion-lab-preset-metadata.json` (80 records) - Done (4 cleanup items outstanding)
3. `docs/motion-lab-agent-guidance.md` - Not yet created

**Phase 2 is not yet complete. The guidance doc is the one remaining deliverable.**

---

## Sources Consulted

- `docs/plans/motion-lab-curation-guide.md` (full read)
- `data/motion-lab-preset-metadata.json` (full read, all groups)
- `lib/motion-lab-presets.js` (cross-referenced for `glitchOn` keyframe verification)
- `docs/plans/agent-metadata-schema.md` (reference)
- `docs/motion-lab-agent-library-implementation-audit.md` (prior audit)
