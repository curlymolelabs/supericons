# P1-F Semantic MVS Rubric And Batch 03 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the semantic minimum viable standard into an approval rubric, then test that rubric on a new ambiguity-focused SVG-ready batch before approving any broader import set.

**Architecture:** Separate the quality standard from the batch itself. First define what counts as "good enough." Then select a batch that stresses that standard by using icons that are broad, context-sensitive, or likely to drift away from their seeded lane. Keep outputs separate from the approved import file until the rubric has been applied.

**Tech Stack:** Existing SI semantic spec, rollout roadmap, purpose-chip pilot artifacts, batch builder and contact-sheet scripts, JSON review outputs, Markdown and HTML planning docs.

---

## Why This Phase Exists

We now have:

- the registry scaffold
- the purpose-chip pilot
- two reviewed batches

What we still do not have is a stable rule for:

- what makes a reviewed record approvable
- what should stay as reviewed draft only
- when ambiguity is acceptable and when it is too risky

This phase closes that gap.

---

## Scope

This phase includes:

- defining the semantic MVS approval rubric
- selecting a new ambiguity-focused SVG-ready batch
- reviewing that batch using the rubric
- recording which records would pass, hold, or stay draft

This phase does not include:

- bulk promotion into the live approved import file
- full free-corpus scaling
- production UI changes

---

## New Files

- `docs/superpowers/plans/2026-04-20-si-semantic-mvs-approval-rubric.md`
- `docs/superpowers/plans/2026-04-20-si-semantic-mvs-approval-rubric.html`
- `docs/superpowers/plans/2026-04-20-p1f-semantic-mvs-rubric-and-batch-03-plan.md`
- `docs/superpowers/plans/2026-04-20-p1f-semantic-mvs-rubric-and-batch-03-plan.html`
- `data/si-registry/pilot/purpose-chip/semantic-mvs-rubric.json`
- `data/si-registry/pilot/purpose-chip/single-model-batch-03.json`
- `data/si-registry/pilot/purpose-chip/single-model-batch-03-reviewed-records.json`
- `data/si-registry/pilot/purpose-chip/single-model-batch-03-review-notes.md`
- `data/si-registry/generated/single-model-batch-03-contact-sheet.svg`
- `data/si-registry/generated/single-model-batch-03-contact-sheet.png`
- `data/si-registry/generated/single-model-batch-03-metrics.json`

---

## Task 1: Freeze the approval rubric

**Files:**

- Create: `docs/superpowers/plans/2026-04-20-si-semantic-mvs-approval-rubric.md`
- Create: `docs/superpowers/plans/2026-04-20-si-semantic-mvs-approval-rubric.html`
- Create: `data/si-registry/pilot/purpose-chip/semantic-mvs-rubric.json`

- [ ] Define the approval gates for identity, depiction, purpose, use guidance, avoidance guidance, tags, lane fit, and confidence.
- [ ] Define the allowed outcomes:
  - `approve_for_import`
  - `hold_for_editor_review`
  - `keep_as_reviewed_draft`
  - `rewrite_before_reconsidering`
- [ ] Make the rubric readable enough for both product judgment and future tooling.

---

## Task 2: Build an ambiguity-focused batch 03

**Files:**

- Modify: `scripts/build-purpose-chip-single-model-batch.mjs`
- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-03.json`

- [ ] Select 12 SVG-ready icons that are more ambiguous than batch 01 and batch 02.
- [ ] Bias the batch toward icons that are broad, context-sensitive, or likely to drift away from their seeded lane.
- [ ] Keep the batch balanced enough to compare status, AI, and system/developer meanings where useful.

---

## Task 3: Generate a contact sheet and review batch 03

**Files:**

- Create: `data/si-registry/generated/single-model-batch-03-contact-sheet.svg`
- Create: `data/si-registry/generated/single-model-batch-03-contact-sheet.png`
- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-03-reviewed-records.json`
- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-03-review-notes.md`

- [ ] Render the batch into a visual contact sheet.
- [ ] Review each icon against the new rubric.
- [ ] Record both the semantic recommendation and the approval outcome.
- [ ] Call out lane corrections explicitly where the seeded category is misleading.

---

## Task 4: Measure the batch and keep artifacts clean

**Files:**

- Create: `data/si-registry/generated/single-model-batch-03-metrics.json`

- [ ] Record wall-clock timing for the batch.
- [ ] Estimate visible token load using the existing estimator pattern.
- [ ] Keep metrics free of unnecessary internal model metadata.

---

## Success Criteria

P1-F is done when:

- the semantic approval rubric exists and is clear
- batch 03 exists and is ambiguity-focused
- batch 03 has reviewed outputs and notes
- approval outcomes are explicit
- metrics are recorded
- the build remains green

---

## Decision This Phase Must Support

At the end of P1-F we should be able to answer:

- what counts as approvable semantic quality
- which reviewed records are strong enough to move toward import
- whether the current review path is trustworthy enough to expand beyond narrow pilot slices
