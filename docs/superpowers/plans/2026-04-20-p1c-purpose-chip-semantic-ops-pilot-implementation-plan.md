# P1-C Purpose-Chip Semantic Ops Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first automation, visual-inspection, and review pilot for the `150` icons already curated under the purpose pill chip experiment: `AI & Agents`, `Navigation & Wayfinding`, and `Status & Feedback`.

**Architecture:** Use the existing purpose-chip seed as the bounded pilot scope instead of opening up the whole free corpus. The pipeline should create a worklist, generate semantic candidate drafts, attach visual-review inputs, score confidence, and place records into a review queue. Only explicitly approved records should move into the registry import path. Candidate outputs and review artifacts should stay separate from the live public registry until approved. If a lighter first-pass reviewer is useful, keep it limited to simple visual confirmation and reserve stronger review for low-confidence or conflicting cases only.

**Tech Stack:** Vite SPA, vanilla JavaScript modules, existing `lib/icon-taxonomy-seed.js`, existing SI Registry helpers and build scripts, JSON/JSONL worklists, Node scripts, icon SVG data from `public/icon-index.json`, optional multimodal model hooks deferred behind file-based inputs.

---

## Roadmap Recap

### P1-A

Status: done

- registry source tree exists
- ID rules exist
- hybrid visibility model exists

### P1-B

Status: done

- all premium icons normalize into registry records
- free pilot records exist
- registry build and verification are green

### P1-C

Status: this plan

- bounded automation pilot
- visual-inspection preparation and outputs
- review workflow for approval before registry import

### P2 later

Status: after this pilot

- scale the pipeline beyond the 150 purpose-chip icons
- decide provider/runtime strategy for autonomous tagging
- grow approved records into the broader free corpus

---

## Pilot Scope

This plan is intentionally limited to the current purpose pill chip categories already defined in `lib/icon-taxonomy-seed.js`:

- `AI & Agents` — `50` icons
- `Navigation & Wayfinding` — `50` icons
- `Status & Feedback` — `50` icons

Total pilot size:

- `150` curated free icons

This scope is valuable because:

- the icons are already intentionally curated
- the categories are already visible in product thinking
- the set is large enough to test the pipeline
- the set is small enough to review without drowning

---

## Main Product Questions This Pilot Must Answer

1. Can we generate useful semantic candidate records from a bounded curated set?
2. When does visual inspection improve quality beyond name-based inference?
3. Which icons can be auto-approved, and which need human review?
4. What confidence threshold is safe enough for registry import?
5. What artifacts do we need so this becomes a repeatable system instead of a one-off batch?

---

## Decisions Locked By This Plan

### 1. The pilot scope is the current purpose-chip seed only

Do not widen the pilot beyond the `150` curated icons in this phase.

### 2. Candidate records do not become live registry records automatically

This phase should create:

- worklists
- candidate drafts
- visual-review artifacts
- review queues
- approved-record imports

Only approved records should join the live free registry import path.

### 3. Existing purpose-chip browse behavior does not change in this phase

The current product experiment stays as-is. P1-C improves the semantic data pipeline behind it.

### 4. Visual inspection is a quality input, not the sole authority

Visual inspection should help answer:

- what the icon actually depicts
- whether the source name and visual meaning align
- where ambiguity is high

It should not alone decide the final recommended purpose.

### 5. Review roles stay separated in the pilot

Use:

- a lighter first-pass reviewer for visual inspection and structured ambiguity scoring when useful
- deterministic rules for lexical prefill before any model call
- stronger review only for escalations, not the whole batch

This keeps the pilot fast and cheap while still preserving a path for deeper judgment where needed.

### 6. The pilot should prefer boringly clear process over ambitious scale

This phase should optimize for:

- auditability
- reviewability
- repeatability

not for maximum throughput.

---

## Scope

This plan includes:

- a worklist for the 150 purpose-chip icons
- deterministic lexical prefill for candidate fields
- visual-review input preparation
- visual-review preparation and review routing rules for the pilot
- confidence scoring and review routing
- approved-record import files for reviewed outcomes
- verification for batch counts and queue integrity

This plan does not include:

- full free-corpus tagging
- autonomous background cron jobs
- provider-specific multimodal API integration in production
- UI changes to the purpose chip filter
- public registry cutover for unreviewed candidates

---

## File Structure

### New data files

- `data/si-registry/source-maps/purpose-chip-category-map.json`
  - maps the three purpose-chip lanes to SI registry defaults such as category, domain, and intent
- `data/si-registry/pilot/purpose-chip/worklist.json`
  - the authoritative 150-icon pilot worklist built from `lib/icon-taxonomy-seed.js`
- `data/si-registry/pilot/purpose-chip/candidate-records.json`
  - generated semantic candidate drafts for the pilot set
- `data/si-registry/pilot/purpose-chip/visual-review-inputs.json`
  - the icons and metadata prepared for visual inspection
- `data/si-registry/pilot/purpose-chip/review-queue.json`
  - review items grouped by queue outcome
- `data/si-registry/pilot/purpose-chip/approved-records.json`
  - reviewed records approved for import into the registry

### New generated files

- `data/si-registry/generated/purpose-chip-pilot-summary.json`
  - counts by lane, confidence band, and review status

### New code files

- `lib/si-registry/purpose-chip-pilot.js`
  - helpers for turning the taxonomy seed into a pilot worklist
- `lib/si-registry/semantic-prefill.js`
  - lexical inference and default field generation for candidate records
- `lib/si-registry/review-routing.js`
  - confidence scoring and queue assignment rules
- `lib/si-registry/visual-review-prep.js`
  - prepares visual-review payloads from icon index data

### New scripts

- `scripts/build-purpose-chip-pilot.mjs`
  - builds the worklist, candidates, visual inputs, review queue, and approved import file
- `scripts/verify-purpose-chip-pilot.mjs`
  - verifies counts, queue rules, and approved import integrity

### Files to modify

- `package.json`
  - add pilot build and verify scripts
- `data/si-registry/registry-manifest.json`
  - optionally add the approved purpose-chip import file as a live registry record group once the pilot is approved
- `scripts/build-si-registry-projections.mjs`
  - only if approved-record import becomes part of the registry build in this phase

---

## Task 1: Freeze the 150-icon pilot worklist

**Files:**

- Create: `data/si-registry/source-maps/purpose-chip-category-map.json`
- Create: `lib/si-registry/purpose-chip-pilot.js`
- Create: `scripts/build-purpose-chip-pilot.mjs`

- [ ] Build the pilot worklist directly from `JOB_ICON_TAXONOMY_SEED` in `lib/icon-taxonomy-seed.js`.
- [ ] Preserve for each worklist item:
  - `icon_id`
  - `source_library`
  - `purpose_chip_category_id`
  - `purpose_chip_category_label`
  - `rank`
  - `secondary_categories`
- [ ] Write `data/si-registry/pilot/purpose-chip/worklist.json`.
- [ ] Verify the worklist count is exactly:
  - `50` AI & Agents
  - `50` Navigation & Wayfinding
  - `50` Status & Feedback

**Guardrail:** Do not manually hand-edit the pilot list. It should be generated from the source seed so the pilot stays tied to the product experiment.

---

## Task 2: Add category mapping defaults for the three lanes

**Files:**

- Create: `data/si-registry/source-maps/purpose-chip-category-map.json`
- Modify: `scripts/build-purpose-chip-pilot.mjs`

- [ ] Define one mapping entry per lane:
  - `ai-agent-workflows`
  - `navigation-wayfinding`
  - `status-feedback`
- [ ] For each lane, define defaults such as:
  - SI registry `category`
  - `domain`
  - `intent`
  - default `use_when` framing
  - default `avoid_when` framing
- [ ] Keep the mapping file readable enough that it doubles as editorial policy for this pilot.

---

## Task 3: Build lexical semantic prefill for candidate drafts

**Files:**

- Create: `lib/si-registry/semantic-prefill.js`
- Modify: `scripts/build-purpose-chip-pilot.mjs`

- [ ] Generate candidate semantic drafts using:
  - icon id
  - source library
  - source name
  - purpose-chip lane defaults
  - existing free pilot record patterns where useful
- [ ] Candidate drafts should include:
  - `icon_id`
  - `label`
  - `purpose`
  - `category`
  - `semantic_tags`
  - `use_when`
  - `avoid_when`
- `access_tier`
- `projection_policy`
- `confidence`
- [ ] Write `data/si-registry/pilot/purpose-chip/candidate-records.json`.

**Guardrail:** Candidate drafts are not approved records yet, and they should stay free of unnecessary internal workflow metadata.

---

## Task 4: Prepare visual-review inputs

**Files:**

- Create: `lib/si-registry/visual-review-prep.js`
- Modify: `scripts/build-purpose-chip-pilot.mjs`

- [ ] Pull the matching icon records from `public/icon-index.json`.
- [ ] For each pilot icon, prepare a visual-review input that includes:
  - `icon_id`
  - source SVG or renderable icon payload
  - source name
  - current candidate purpose
  - current candidate category
  - current confidence
- [ ] Write `data/si-registry/pilot/purpose-chip/visual-review-inputs.json`.

**Guardrail:** This phase prepares the visual-review input surface. It does not need to wire a specific model provider yet.

---

## Task 5: Route candidates into review queues

**Files:**

- Create: `lib/si-registry/review-routing.js`
- Modify: `scripts/build-purpose-chip-pilot.mjs`

- [ ] Define confidence bands such as:
  - `high_confidence`
  - `needs_review`
  - `ambiguous`
- [ ] Route candidate records into queue outcomes such as:
  - `ready_for_editor_review`
  - `needs_visual_review`
  - `escalate_to_stronger_review`
  - `blocked_for_manual_judgment`
- [ ] Write `data/si-registry/pilot/purpose-chip/review-queue.json`.

**Recommended rule:** Even high-confidence records should still land in an editor-review lane in this first pilot. No fully automatic promotion yet. Stronger model review should be reserved for items that conflict with lexical prefill or score as ambiguous.

---

## Task 6: Build the approved-record import path

**Files:**

- Create: `data/si-registry/pilot/purpose-chip/approved-records.json`
- Modify: `scripts/build-purpose-chip-pilot.mjs`
- Optional modify: `data/si-registry/registry-manifest.json`

- [ ] Write an approved-record file format that matches the live free registry shape.
- [ ] Start with zero or a tiny hand-approved sample in the file so the import path is real.
- [ ] Keep this file separate from candidates and review queues.
- [ ] If the approved import file is added to the registry manifest in this phase, make sure only approved records flow into the live registry build.

**Guardrail:** Never point the live registry import at raw candidate drafts.

---

## Task 7: Add verification for the pilot

**Files:**

- Create: `scripts/verify-purpose-chip-pilot.mjs`
- Modify: `package.json`

- [ ] Verify the worklist has exactly `150` records.
- [ ] Verify the lane counts are `50/50/50`.
- [ ] Verify every candidate draft belongs to one of the three purpose-chip lanes.
- [ ] Verify every review-queue item points to a candidate record.
- [ ] Verify visual-review inputs stay free of unnecessary internal model metadata.
- [ ] Verify approved records are a subset of candidate records and use valid registry shape fields.
- [ ] Verify protected or private-only fields do not leak into any public-safe approved import output.
- [ ] Add package scripts:
  - `build:purpose-chip-pilot`
  - `verify:purpose-chip-pilot`

---

## Task 8: Generate summary outputs and keep the full build green

**Files:**

- Create: `data/si-registry/generated/purpose-chip-pilot-summary.json`
- Modify: `scripts/build-purpose-chip-pilot.mjs`
- Optional modify: `package.json`

- [ ] Write a summary output containing:
  - lane counts
  - confidence band counts
  - review queue counts
  - approved record count
- [ ] Run:
  - `node scripts/build-purpose-chip-pilot.mjs`
  - `node scripts/verify-purpose-chip-pilot.mjs`
  - `npm run build`
- [ ] Keep the broader product build green.

---

## Success Criteria

P1-C is done when:

- the 150-icon purpose-chip worklist exists and is generated from the source seed
- candidate semantic drafts exist for all 150 icons
- visual-review inputs exist for all 150 icons
- review queue outputs exist with explicit confidence-based routing
- approved records have a clean import path separate from candidates
- pilot verification passes
- full build stays green

---

## What This Pilot Should Teach Us

By the end of this phase, we should know:

- which of the three lanes are easiest to prefill accurately
- where visual inspection changes the outcome meaningfully
- how many records remain ambiguous even in a curated seed
- what confidence thresholds feel realistic for later scale-up

---

## Next Step After This Plan

If this pilot is clean and useful, the next phase should be:

1. run the first real candidate batch for the 150 purpose-chip icons
2. manually review a sample across all three lanes
3. refine the confidence routing rules
4. decide whether to scale the same system to more free icons or to deepen the purpose-chip approved set first
