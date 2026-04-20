# P1-E Material SVG Path And Batch 02 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the purpose-chip pilot so Material icons can participate in real visual review, then build and review a stronger batch 02 that includes Navigation and Material-backed AI icons.

**Architecture:** Add a pilot-safe Material SVG resolution path inside the visual-review preparation layer, regenerate the purpose-chip pilot with richer visual payloads, and then freeze a second single-model batch that intentionally covers newly unlocked Material icons. Keep all reviewed outputs separate from live registry imports.

**Tech Stack:** Existing purpose-chip pilot JSON files, `public/material-export-manifest.json`, local `public/material-export/` assets, vanilla JavaScript build scripts, SI Registry pilot helpers, Markdown/HTML plan docs.

---

## Scope

This plan includes:

- resolving as many purpose-chip Material icons as possible to real SVG payloads
- updating pilot summaries after the richer visual payload pass
- freezing a more representative batch 02
- reviewing batch 02 with the same single-model path used in batch 01
- recording time and visible token estimates for batch 02

This plan does not include:

- changing the live registry import path
- tagging all 150 icons in one go
- introducing provider-specific API code

---

## Task 1: Add a Material SVG resolver for the purpose-chip pilot

**Files:**

- Modify: `lib/si-registry/visual-review-prep.js`
- Modify: `scripts/build-purpose-chip-pilot.mjs`
- Modify: `scripts/verify-purpose-chip-pilot.mjs`

- [ ] Read `public/material-export-manifest.json` and local `public/material-export/` assets.
- [ ] Resolve local SVG content for Material icons when an owned export exists.
- [ ] Mark each visual payload with a more precise status:
  - `svg_available`
  - `svg_available_local_material`
  - `metadata_only`
- [ ] Keep the resolver safe and deterministic. No network fetches during the normal pilot build.

---

## Task 2: Add a purpose-chip Material SVG coverage report

**Files:**

- Modify: `scripts/build-purpose-chip-pilot.mjs`
- Modify: `data/si-registry/generated/purpose-chip-pilot-summary.json` (generated)

- [ ] Add summary fields that show:
  - how many Material icons now have SVG payloads
  - how many still remain metadata-only
  - how Navigation changes after the resolver lands

---

## Task 3: Freeze batch 02 from the improved SVG-ready set

**Files:**

- Modify: `scripts/build-purpose-chip-single-model-batch.mjs`
- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-02.json`

- [ ] Build batch 02 from the regenerated pilot artifacts.
- [ ] Make batch 02 intentionally different from batch 01.
- [ ] Include newly unlocked Material icons from:
  - `navigation-wayfinding`
  - `ai-agent-workflows`
- [ ] Keep the batch small enough for one strong-model review pass.

---

## Task 4: Review batch 02 with the single-model path

**Files:**

- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-02-reviewed-records.json`
- Create: `data/si-registry/pilot/purpose-chip/single-model-batch-02-review-notes.md`

- [ ] Review batch 02 using the same evidence workflow as batch 01.
- [ ] Focus especially on whether newly unlocked Material icons hold up visually.
- [ ] Save reviewed outputs separately from the live registry.

---

## Task 5: Record timing and visible token estimates for batch 02

**Files:**

- Modify: `scripts/estimate-purpose-chip-batch-tokens.mjs`
- Create: `data/si-registry/generated/single-model-batch-02-metrics.json`

- [ ] Extend the estimator so it can target batch 02.
- [ ] Record start, finish, elapsed time, and visible token estimates for batch 02.

---

## Success Criteria

P1-E is done when:

- the pilot can resolve more Material icons to real SVG payloads
- the purpose-chip summary reflects the improved visual coverage
- batch 02 exists and includes newly unlocked Material icons
- reviewed outputs exist for batch 02
- timing and visible token estimates exist for batch 02

---

## Decision This Phase Must Support

At the end of P1-E we should be able to answer:

- does one strong-model path still look good when the batch includes Material icons and navigation-like shapes
- how much of the current metadata-only gap can be fixed with local assets alone
