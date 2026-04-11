# Motion Lab Phase 4 Recommendation Evaluation Plan

Date: April 11, 2026
Status: Active
Depends on:
- `docs/motion-lab-agent-library-prd.md`
- `docs/plans/agent-metadata-schema.md`
- `docs/plans/motion-lab-curation-guide.md`
- `docs/motion-lab-agent-guidance.md`
- `data/motion-lab-preset-metadata.json`

## Problem Statement

Motion Lab now gives agents:

- the full 80-preset library
- shared preset groups with the browser experience
- enriched metadata through MCP
- a guidance document developers can hand to agents

That foundation may already be enough for many workflows.

The next product question is whether Supericons should stop at rich metadata and guidance, or add a higher-level recommendation layer that actively suggests presets for a stated interface goal.

This phase exists to answer that question deliberately before building another MCP tool.

## Target User

### Primary user

AI coding agents working on behalf of developers who want a good first motion choice without manually filtering the full Motion Lab preset set every time.

### Secondary user

Developers reviewing agent output who want:

- stronger default motion choices
- less prompt micromanagement
- rationale they can trust

## Goals

### User goals

- reduce the effort required to choose a Motion Lab preset for a common UI task
- improve the quality and consistency of first-pass motion choices
- preserve developer override and judgment

### Product goals

- determine whether the current metadata layer already delivers enough value
- avoid building a recommendation tool that adds complexity without real lift
- define the smallest useful higher-level assistance if Phase 4 is justified

## Non-Goals

This phase does not include:

- automatic mutation of preset definitions
- replacing the browser Motion Lab picker
- full freeform generative motion design
- recommendation tooling for the broader icon library
- exposing subjective taste judgments as hard rules

## Current State

The current system already provides:

- one shared Motion Lab preset source
- enriched `list_motion_presets`
- enriched `get_motion_recipe`
- guidance on groups, tone, triggers, intensity, and export choice

Phase 4 should only proceed if recommendation logic clearly improves on that baseline.

## Evaluation Question

Should Supericons add a recommendation-oriented Motion Lab MCP layer now, or should the product remain metadata-led until more evidence exists?

The deeper architecture question is:

- is a new MCP recommendation tool actually needed
- or is the current combination of metadata and guidance already the right recommendation system for agents

## Candidate Phase 4 Shapes

### Option A: No new MCP tool yet

Keep the current system:

- `list_motion_presets`
- `get_motion_recipe`
- enriched metadata
- guidance docs

When to choose this:

- agents already make strong choices with light prompting
- developers are comfortable with filter-then-pick workflows
- recommendation logic would mostly duplicate the guidance document

Baseline pass bar:

- Option A passes if it produces an appropriate preset choice with acceptable rationale in two or fewer clarification rounds for at least four of the six evaluation scenarios.
- For the negative scenario, Option A passes only if it correctly recommends avoiding Motion Lab, or explicitly minimizing motion, rather than forcing a decorative preset choice.

### Option B: Add `recommend_motion_preset`

Possible input shape:

- `goal`
- `context`
- `trigger`
- `tone`
- `export_target`
- optional `constraints`

Possible output shape:

- 1 to 3 recommended presets
- short rationale per preset
- notes on tradeoffs
- suggested intensity and duration starting values

When to choose this:

- developers repeatedly ask agents for the best preset for a stated UI goal
- the same scenario patterns recur often enough to justify a helper
- metadata alone still leaves too much trial and error

### Option C: Add `describe_motion_context`

This would be a lighter bridge tool that turns a plain-language goal into filtering guidance rather than a direct preset recommendation.

Possible output:

- likely groups
- likely contexts
- tone tags to prefer
- tags to avoid

When to choose this:

- the product needs more guidance than raw metadata
- but direct recommendation still feels too opinionated
- agents in the scenario tests consistently fail to apply the guidance document well enough on their own
- the failure appears to come from structured access needs, not from missing metadata

## Recommendation

Start by evaluating Option A against Option B.

Option C is only worth pursuing if:

- direct recommendation still feels too early
- metadata-only usage is consistently too weak
- the weakness comes from structured access needs rather than simply weak prompting
- the guidance document proves too heavy or too hard for agents to apply reliably in-context

## Smallest Useful Phase 4

If Phase 4 is approved, the smallest useful v1 is:

- one tool: `recommend_motion_preset`
- a narrow scenario set
- no hidden ranking magic
- recommendation output grounded in existing metadata fields

The tool should recommend from the existing preset dataset, not invent new logic or a second decision system.

## Evaluation Method

Run a small internal scenario set and compare two modes:

1. metadata-only flow
   - `list_motion_presets`
   - `get_motion_recipe`
   - guidance doc
2. recommendation flow
   - candidate `recommend_motion_preset`

For Option C, run a third comparison only if the Option A baseline shows a real guidance-application gap.

Run each scenario at least three times with the same prompt in each mode.

Consistency should be measured by whether the same preset group, or the same do-not-animate conclusion for the negative case, appears in at least two of the three runs.

The question is not whether recommendation can return something plausible.

The question is:

- does recommendation materially improve choice quality, speed, or rationale compared with the current Phase 3 system
- does it improve the result enough to justify another product surface to maintain

## Internal Scenario Set

Use repeatable scenarios that reflect real product use:

1. Professional dashboard hover state
Need: restrained hover motion for sidebar icons in a fintech or analytics UI.

2. Security or authentication interaction
Need: motion for login, identity, or verification without looking playful.

3. Success and celebration
Need: a stronger but still tasteful success or highlight moment.

4. Ambient loading or empty state
Need: loop-safe motion that remains comfortable over time.

5. Premium feature highlight
Need: showpiece motion for a standout product surface.

6. Accessibility-sensitive settings surface
Need: determine whether Motion Lab should be avoided entirely, or reduced to the lightest possible motion, in a settings panel where extra movement may be distracting or harmful.

## Evaluation Criteria

For each scenario, compare:

- first-pass preset quality
- rationale quality
- number of clarification rounds before a usable answer
- number of manual filters or follow-up narrowing steps applied before a usable answer
- need for manual correction
- consistency across repeated runs

## Success Metrics

Phase 4 should be approved only if recommendation shows a clear improvement in at least two of these:

- fewer manual correction cycles
- stronger rationale quality
- better consistency across repeated runs
- fewer clarification rounds or manual filtering steps for developers

Recommendation should not be approved if it mainly restates what the guidance doc and metadata already make possible.

## Guardrails

- recommendation must only suggest presets from the shared Motion Lab source
- recommendation output must remain explainable from current metadata
- no recommendation should override hard-rule constraints such as supported triggers or export compatibility
- recommendation must stay read-only

## Risks

### Product risk

The tool could look impressive while adding little practical value.

### UX risk

Developers may mistake recommendation for objective truth in a subjective area.

### Maintenance risk

A recommendation layer can drift from the dataset if its logic is not clearly grounded in current fields.

## Decision Gate

At the end of evaluation, make one of three calls:

1. `Do not build now`
The current metadata-and-guidance system is strong enough, and agents can already reason effectively over the enriched Motion Lab metadata without a new MCP recommendation tool.

2. `Build a narrow v1`
Recommendation clearly improves real workflows and should ship as one focused MCP tool.

3. `Delay and observe`
The signal is mixed; keep collecting internal usage examples before committing.

## Recommended Next Step

Run the six-scenario internal evaluation set first using the current Phase 3 system as the baseline.

Only draft a `recommend_motion_preset` contract after that comparison shows a clear advantage over the existing metadata-led workflow.
