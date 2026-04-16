# Motion Lab Phase 2 Curation Implementation Plan

Date: April 11, 2026
Status: Ready to execute
Depends on:
- `docs/motion-lab-agent-library-prd.md`
- `docs/plans/agent-metadata-schema.md`
- `docs/motion-lab-agent-library-implementation-audit.md`

## Goal

Complete the first real Phase 2 prerequisite for the Motion Lab agent library: lock the internal curation rules before anyone starts filling metadata records for the 80 presets.

This pass is intentionally narrow. It does not curate the 80 presets yet, and it does not change the MCP response contract. It creates the internal guide that keeps the upcoming curation pass consistent.

## Why this comes next

The schema already defines field structure, but it does not yet lock the working vocabulary or calibration rules curators need for consistent record quality.

Without a curation guide, the 80-record pass would drift on:

- `emotional_tone` wording
- `recommended_contexts` wording
- `avoid_for` wording
- per-group intensity calibration
- preset-specific `technical_output_notes`

The implementation audit correctly identified this as the next step that unlocks the rest of Phase 2.

## Scope

This step includes:

1. Writing the internal curation guide
2. Locking bounded vocabulary for editorial fields
3. Locking group-by-group intensity calibration rules
4. Defining quality rules for preset-specific technical notes
5. Adding a clear curation workflow and review checklist
6. Updating small documentation housekeeping where the current status is already settled

This step does not include:

- curating the 80 preset records yet
- publishing the developer-facing Motion Lab agent guidance doc yet
- changing MCP output field naming yet
- adding enriched metadata to `list_motion_presets()` yet

## Deliverables

### Deliverable 1

`docs/plans/motion-lab-curation-guide.md`

This guide should include:

- closed `emotional_tone` vocabulary
- closed `recommended_contexts` vocabulary
- rules for `avoid_for`
- rules for `visual_character`
- intensity calibration guidance by Motion Lab group
- rules for `technical_output_notes`
- record-writing workflow
- review checklist

### Deliverable 2

Small docs housekeeping updates that reflect already-settled state, where helpful.

## Execution Sequence

### Step 1

Review the PRD, schema, and implementation audit together.

Purpose:
- keep the guide aligned with the approved phase order
- avoid inventing fields or rules that the schema does not support

### Step 2

Define the closed vocabulary sets.

Purpose:
- keep metadata records consistent
- prevent duplicate meanings under different words

### Step 3

Define intensity calibration guidance by preset group.

Purpose:
- stop curators from copying global tool limits into preset-level guidance
- keep loop presets, one-shot presets, and special presets calibrated differently

### Step 4

Define the writing rules for preset-specific technical notes.

Purpose:
- prevent boilerplate notes from creeping into all records
- keep operational notes actually useful to agents

### Step 5

Define the curation workflow and review checklist.

Purpose:
- make the later 80-record pass repeatable
- reduce inconsistent judgment between curators

### Step 6

Run a light consistency check on the updated docs.

Purpose:
- confirm the new guide matches the approved PRD and schema direction

## Acceptance Standard

This step is complete when:

- the curation guide exists and is clear enough for a curator to use immediately
- editorial fields have bounded vocabulary where needed
- intensity guidance is group-sensitive instead of relying on global tool limits
- `technical_output_notes` rules clearly require preset-specific content
- the guide makes the next 80-record curation pass easier rather than more subjective

## What follows after this

After this guide is in place, the next sequence should be:

1. create the 80-preset metadata dataset
2. write the developer-facing Motion Lab agent guidance doc from that dataset
3. clean the MCP key convention before Phase 3 enrichment begins
