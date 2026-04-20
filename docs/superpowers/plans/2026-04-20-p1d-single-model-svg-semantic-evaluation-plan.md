# P1-D Single-Model SVG Semantic Evaluation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evaluate whether one stronger single-model pass is good enough to perform the first real semantic review pass for SVG-ready purpose-chip icons without needing a split-model setup.

**Architecture:** Use the existing purpose-chip pilot artifacts as the source of truth, select a balanced SVG-ready batch, review that batch with one strong model using the agreed SI evidence workflow, and save the reviewed outputs separately from the live registry import path. Record wall-clock time and a clear token estimate for the visible batch payloads.

**Tech Stack:** Existing SI Registry pilot JSON files, vanilla JavaScript scripts, local SVG payloads from `visual-review-inputs.json`, Markdown/HTML plan docs, optional local token-estimation helper.

---

## Scope

This plan covers:

- selecting a balanced SVG-ready evaluation batch
- reviewing that batch with one strong model using the SI metadata workflow
- producing reviewed semantic records and review notes
- measuring elapsed wall-clock time
- estimating visible prompt/output tokens for the batch payload

This plan does not cover:

- the `75` metadata-only Material icons
- automatic promotion into the live registry
- background automation or cron execution
- full `150` icon review in one pass

---

## File Structure

### New plan and result files

- `docs/superpowers/plans/2026-04-20-p1d-single-model-svg-semantic-evaluation-plan.md`
- `docs/superpowers/plans/2026-04-20-p1d-single-model-svg-semantic-evaluation-plan.html`
- `data/si-registry/pilot/purpose-chip/single-model-batch-01.json`
- `data/si-registry/pilot/purpose-chip/single-model-batch-01-reviewed-records.json`
- `data/si-registry/pilot/purpose-chip/single-model-batch-01-review-notes.md`
- `data/si-registry/generated/single-model-batch-01-metrics.json`

### New or updated helper files

- `scripts/build-purpose-chip-single-model-batch.mjs`
- `scripts/estimate-purpose-chip-batch-tokens.mjs`

---

## Task 1: Freeze a balanced SVG-ready batch

**Files:**

- Create: `scripts/build-purpose-chip-single-model-batch.mjs`
- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-01.json`

- [ ] Build batch 01 from `visual-review-inputs.json`, `candidate-records.json`, and `review-queue.json`.
- [ ] Keep the batch SVG-ready only.
- [ ] Include a balanced mix of:
  - `ai-agent-workflows`
  - `status-feedback`
  - `ready_for_editor_review`
  - `needs_visual_review`
- [ ] Keep the batch intentionally small enough for one strong-model review pass.

---

## Task 2: Review the batch using the agreed SI evidence workflow

**Files:**

- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-01-reviewed-records.json`
- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-01-review-notes.md`

- [ ] For each icon, review:
  - source identity
  - lexical draft
  - visual depiction
  - ambiguity
  - likely confusion risks
  - SI recommended purpose
  - `use_when`
  - `avoid_when`
  - `semantic_tags`
  - `synonyms`
  - `evidence_sources`
  - `confidence_score`
  - `review_state`
- [ ] Keep the review separate from live registry imports.
- [ ] Use the review notes file to capture why changed records changed.

---

## Task 3: Measure elapsed time and visible token load

**Files:**

- Create: `scripts/estimate-purpose-chip-batch-tokens.mjs`
- Create: `data/si-registry/generated/single-model-batch-01-metrics.json`

- [ ] Record wall-clock start and finish times for the end-to-end evaluation slice.
- [ ] Estimate visible prompt tokens from the batch payload plus the review instructions.
- [ ] Estimate visible output tokens from the reviewed records and review notes.
- [ ] Clearly label the token values as visible-payload estimates, not hidden reasoning-token counts.

---

## Success Criteria

P1-D batch 01 is done when:

- a balanced SVG-ready batch file exists
- reviewed semantic outputs exist for the batch
- review notes explain the major semantic corrections
- elapsed wall-clock time is recorded
- visible token estimates are recorded
- the output is good enough to judge whether one strong model is a better operational path than a split-model setup

---

## Decision This Batch Must Support

At the end of batch 01 we should be able to answer:

- Does one stronger single-model pass produce semantics that meet the current minimum viable standard?
- Is the quality gain large enough that we should prefer one main model now, at least until scale makes cost optimization necessary?
