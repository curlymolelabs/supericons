# P2-A Semantic Automation Scale-Up Plan

## Goal

Turn the now-proven SI semantic workflow into a repeatable automation pipeline that can cover more icons faster without lowering the quality bar established in the first `150`-icon rollout.

## Why this is the right next step

The first purpose-chip rollout proved the important things:

- the SI semantic record shape works
- the approval rubric is usable
- visual confirmation improves confidence
- semantic-aware retrieval improves agent usefulness
- approved records can move into the live registry path

What is no longer needed:

- proving the idea from scratch again

What is needed now:

- scaling the same formula safely

## North Star For This Phase

Build a semantic automation system that can:

1. generate strong first-pass SI semantic drafts
2. send only the risky or ambiguous records to review
3. promote approved records into the registry cleanly
4. improve search and tool usefulness as coverage expands

## Scope

This phase is about safe scale-up, not full-corpus completion.

Included:

- automated first-pass draft generation
- automated routing into `approve`, `hold`, `draft`, or `review`
- staged imports into the SI Registry
- batch reports and verification
- quality sampling and rollback rules

Not included:

- fully autonomous approval of the entire corpus
- replacing the review rubric
- expanding native SI icon semantics and motion/state rules
- public API productization work beyond current registry projections

## Starting Point

Current proven state:

- first purpose-chip rollout completed: `150` icons
- `129` approved
- `13` hold
- `8` reviewed drafts
- `135` public free semantic records in the registry
- semantic search benchmark already shows a strong lift over baseline

This means the next automation step should focus on larger coverage, not more proof-of-concept work.

## Main Decision

The automation system should not treat every icon equally.

Use three lanes:

### Lane 1: Safe auto-stage

For records with:

- strong source-name signal
- strong lexical match
- already-known category patterns
- low ambiguity

Action:

- generate first-pass draft
- route to light review or batch approval queue

### Lane 2: Guided review

For records with:

- decent draft quality
- moderate ambiguity
- close semantic neighbors
- context sensitivity

Action:

- generate draft
- route to editor or visual review batch

### Lane 3: Caution lane

For records with:

- weak naming
- conflicting meanings
- broad metaphorical shapes
- high user-risk if mis-tagged

Action:

- do not auto-promote
- require tighter review or leave unapproved

## Automation Pipeline

### Stage 1: Intake

Input sources:

- free icon source identity
- source name
- source library
- current alias and taxonomy helpers
- existing approved records
- search and retrieval data where available
- visual payload availability

Output:

- normalized intake item

### Stage 2: Draft generation

Create a first-pass SI semantic draft with:

- `label`
- `purpose`
- `category`
- `semantic_tags`
- `synonyms`
- `use_when`
- `avoid_when`
- `depicts`
- `intent`
- `domain`
- `evidence`
- draft `confidence`

Output:

- staged semantic record

### Stage 3: Quality checks

Run checks for:

- schema completeness
- controlled vocabulary validity
- duplicate or colliding IDs
- unsafe public fields
- suspiciously generic wording
- semantic mismatch with already-approved near-equivalents

Output:

- valid staged record or rejected batch item

### Stage 4: Routing

Every record must be routed into one of:

- `ready_for_batch_review`
- `needs_visual_review`
- `needs_editor_review`
- `hold_for_later`

No record should go straight from first-pass generation to public approval without passing the current approval rules.

### Stage 5: Promotion

Approved records move into:

- `approved-records.json`
- registry free-record projections
- search-supporting semantic outputs

### Stage 6: Reporting

Every automation run should emit:

- how many records were staged
- how many went to each queue
- how many passed
- how many were held
- quality notes and failures

## Library-By-Library Operating Order

The rollout should now move library by library instead of mixing libraries in one large pool.

Recommended order:

1. MingCute
2. Simple Icons
3. Lucide
4. Tabler
5. Phosphor
6. Heroicons
7. Bootstrap
8. Iconoir
9. Ionicons
10. Material Symbols

Why this order works:

- each library has its own naming habits and semantic patterns
- quality issues become easier to spot when the batch comes from one family
- rollback stays small if one library behaves badly
- results are easier to compare and measure by library

### Important exception

`Simple Icons` should still be processed second, but with a separate brand/logo-oriented semantic template rather than the same generic UI semantic template used for the other libraries.

## First Automation Target

Do not jump to all `21,264` free icons yet.

Use the next safe expansion slice:

### Batch 1: MingCute batch 01

Target:

- first `200` to `300` MingCute icons

Selection preference:

1. strong source names
2. obvious UI-action or state icons
3. icons close to already-approved semantic patterns
4. avoid the most metaphorical or decorative shapes in the first pass

Why:

- big enough to test scale
- small enough to inspect if quality slips
- library-specific enough to tune the automation playbook cleanly

### Batch 2: Remaining MingCute

Target:

- next controlled MingCute slice after batch 01 quality is confirmed

### Batch 3: Simple Icons

Target:

- separate logo and brand-semantic pipeline

## Quality Rules

Automation is only acceptable if it keeps the minimum viable standard.

Each promoted record should still meet these rules:

- the meaning is understandable by a human
- the wording is specific enough to be useful
- the tags match the meaning, not just the icon name
- `use_when` and `avoid_when` help reject near-miss icons
- evidence is present
- the record does not expose internal process details

## Model Orchestration

The lower-cost model should only be used where repetition is high and the risk of failure is easy to catch.

### Lower-cost model responsibilities

- first-pass draft generation
- low-risk synonym suggestions
- low-risk tag suggestions
- queue preparation
- batch formatting

### Main review model responsibilities

- library-specific playbook definition
- approval and hold rules
- sampling and spot-check review
- ambiguous records
- conflict resolution with already-approved records
- final promotion decisions

### Rule

No lower-cost model output should move into approved registry records without the existing approval gates and main-model review logic.

## Hold And Rollback Rules

Stop the batch and review the pipeline if any of these happen:

- approval quality clearly drops on spot checks
- many records repeat generic wording
- categories drift in obvious ways
- search usefulness stops improving
- too many records land in hold because the draft quality is poor

Rollback rule:

- staged records can be discarded
- only approved records should move into the main public registry path

## Verification

Every automation run must finish with:

- schema verification
- approval-record verification
- scale-up verification
- registry projection verification
- build pass

Recommended extra checks per batch:

- spot-check sample of approved records
- benchmark a fixed set of semantic search prompts
- compare search improvement before and after import

## Files To Add

- `scripts/build-semantic-automation-batch.mjs`
- `scripts/verify-semantic-automation-batch.mjs`
- `data/si-registry/automation/`
- `data/si-registry/generated/semantic-automation-summary.json`
- `docs/superpowers/plans/2026-04-20-p2a-semantic-automation-scale-up-plan.md`

## Likely Supporting Updates

- `package.json`
- `lib/si-registry/`
- `scripts/build-si-registry-projections.mjs`
- `scripts/evaluate-agent-semantic-usefulness.mjs`

## Phase Breakdown

### Phase 1: Build the automation scaffolding

- create batch builder
- create routing logic
- create summary outputs
- add verification script
- create library-order configuration
- create MingCute-specific batch selector

### Phase 2: Run the first larger batch

- stage `200` to `300` MingCute icons
- review outputs
- import only the records that pass the standard

### Phase 3: Measure product effect

- rerun the usefulness benchmark
- compare coverage and search lift
- inspect approval quality on a sample

### Phase 4: Decide the operating cadence

If quality holds:

- move to scheduled recurring runs
- finish MingCute
- then move to Simple Icons with the brand/logo template
- then continue down the library order

If quality slips:

- narrow the intake slice
- tighten routing
- improve draft generation before widening again

## Success Criteria

This phase is successful if:

- the next automation batch runs end to end
- approved records grow meaningfully without obvious quality loss
- the hold queue stays manageable
- the search benchmark stays flat or improves
- the workflow feels repeatable instead of hand-crafted

## Final Recommendation

The next step should not be “tag everything.”

The next step should be:

- automate the proven process
- keep the quality gates
- expand in controlled batches
- measure the effect after each import

That is the safest way to turn the first successful rollout into a real semantic operating system for Supericons.
