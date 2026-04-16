# Motion Lab Agent Library PRD

Date: April 11, 2026
Status: Approved
Owner: Supericons

## Title

Motion Lab Agent Library

## Problem Statement

Motion Lab currently serves two kinds of users:

- humans using the browser UI to explore, preview, and export animations
- AI agents using MCP tools to retrieve preset information and generate outputs

Today those two interfaces do not point to the same preset source.

Evidence from the code audit shows:

- the browser Motion Lab experience exposes 80 presets in 4 groups
- the MCP Motion Lab tools expose a separate 12-preset registry
- the 12-preset MCP registry was introduced later as a separate implementation rather than being derived from the browser preset set

This creates three product problems:

1. **Product inconsistency**
Humans and agents are not using the same Motion Lab library.

2. **Decision-quality gap for agents**
Agents can retrieve preset names, but they do not have enough structured guidance to choose the right preset, trigger, intensity, or use case confidently.

3. **Trust and maintenance risk**
Two preset sources create copy drift, feature drift, and unnecessary confusion about what Motion Lab actually is.

This matters now because Motion Lab is becoming part of the AI workflow through MCP. If the product intends to support both humans and agents well, the preset source and the decision layer must be aligned before more docs, metadata, or recommendation features are built on top.

## Evidence Inventory

### Checked Facts

- `docs/motion-lab-single-source-of-truth-audit.md` confirms a real split between the browser preset source and the MCP preset source.
- `docs/motion-lab-agent-library-analysis.md` confirms that the best long-term model is one preset library with two interfaces: visual exploration for humans and structured decision support for agents.
- `docs/plans/agent-library-feasibility.md` confirms the agent decision layer is feasible and strategically differentiated, especially for motion.
- The current MCP tool surface in `mcp/index.js` is read and generate oriented. It does not expose preset-mutation tools.

### Assumptions

- The browser 80-preset system is the right foundation because it is the richer and more tested Motion Lab experience.
- The highest near-term value comes from Motion Lab, where Supericons controls the asset set and can curate metadata responsibly.
- A shared preset source can remain safe if it is exposed to agents as read-only data through MCP.

### Open Product Questions

- Should every browser preset become available through MCP immediately, or should rollout happen in batches after validation?
- How much of the decision layer should ship first as prose guidance versus structured metadata?
- Should recommendation stay as guidance and filtering only, or eventually become a higher-level MCP tool?

## Target User

### Primary User

AI coding agents working on behalf of developers who want to select and export Motion Lab animations that fit the product context, not just any animation that happens to match by name.

### Secondary User

Developers using AI agents who want:

- better default motion choices
- consistent motion across a UI
- a clear explanation of why a preset was chosen
- fewer manual trial-and-error loops in the browser

### Job To Be Done

When building or refining an interface, help the agent choose the right Motion Lab preset, trigger, intensity, and export path for the task, using the same Motion Lab library humans already trust in the browser.

### User Constraints

- Agents cannot rely on visual preview the way humans do.
- Developers do not want to micromanage every animation choice.
- Motion decisions are subjective, so the system needs guardrails and rationale.
- Shared preset data must not become easier to corrupt just because it is exposed to agents.

## Goals

### User Outcome Goals

- Give agents access to the same Motion Lab preset library humans use.
- Help agents make better preset choices using structured guidance, not just preset names.
- Let agents explain their choices in human-readable language.

### Business Outcome Goals

- Strengthen Supericons as the best AI-native icon and motion workflow.
- Increase the usefulness of Motion Lab in agent-led development flows.
- Create a differentiated motion decision layer that competitors do not currently provide.

### Risk Reduction Goals

- Remove preset drift between browser and MCP.
- Reduce confusing or inaccurate documentation about Motion Lab presets.
- Keep the shared preset source read-only from agent-facing interfaces.

## Definition Of Success

Success looks like this:

A developer asks an AI coding agent to add hover animations to the icons in a professional fintech dashboard. The agent uses the same 80 Motion Lab presets available in the browser, filters them by trigger compatibility and context, applies restrained intensity guidance, exports supported output, and returns both the result and a short rationale for each choice.

When this works well:

- the agent is choosing from the real Motion Lab library, not a reduced or invented subset
- the agent can explain why `sweep` fits a settings icon better than `bounce`
- the agent respects technical limits such as supported triggers and export types
- the browser and MCP describe the same preset groups and ids
- the developer still has room to override taste, but the starting point is strong and consistent

## Non-Goals

This PRD does not include:

- redesigning the existing human Motion Lab browser UI
- changing the motion presets themselves just to fit MCP
- curating semantic metadata for the full 20,000+ free icon library
- building a general-purpose AI recommendation engine across all Supericons products in the first release
- exposing write or admin operations through MCP for Motion Lab presets

## Product Principles

1. **One preset library, two interfaces**
Humans and agents should use the same Motion Lab preset set. The interaction model can differ, but the preset truth should not.

2. **Read-only agent access**
Agents should be able to inspect, filter, describe, and export from the shared preset source. They should not be able to edit the preset source through MCP.

3. **Progressive intelligence**
Start with shared preset access and guidance. Add richer metadata and recommendation only after the foundation is aligned.

4. **Human-tested first**
The browser Motion Lab experience remains the primary product reference for what Motion Lab contains and how it should feel.

## Functional Requirements

### Requirement 1: Shared preset source

Motion Lab must use one shared preset source for browser and MCP access.

- User job supported: use the same Motion Lab library across human and agent workflows
- Business goal supported: product consistency and trust
- Acceptance signal: browser UI and MCP return the same preset ids and category groupings

### Requirement 2: Read-only MCP preset access

MCP must expose the shared preset source as read-only preset data and generation capabilities.

- User job supported: inspect and use Motion Lab safely through AI tools
- Business goal supported: enable agent workflows without adding mutation risk
- Acceptance signal: MCP offers list, describe, and export/generate flows only; no preset-write operations exist

### Requirement 3: Full Motion Lab preset coverage in MCP

The MCP Motion Lab preset list must reflect the full browser preset set, not a separate subset.

- User job supported: choose from the real product surface
- Business goal supported: reduce drift and strengthen feature value
- Acceptance signal: `list_motion_presets()` exposes all browser-supported presets and groups

### Requirement 4: Motion preset metadata layer

Each preset must support structured descriptive metadata that helps agents choose well without visual preview.

This metadata must be defined in `docs/plans/agent-metadata-schema.md` before Phase 2 implementation begins. That schema document must include:

- field names
- data types
- allowed value shapes
- at least one full example record

The metadata model should separate **hard-rule fields** from **editorial guidance fields**.

Hard-rule fields should include:

- preset id
- label
- group
- short description
- supported triggers
- duration guidance
- intensity guidance
- export compatibility
- technical output notes

Editorial guidance fields should include:

- emotional tone
- recommended contexts
- avoid-for contexts
- pairing notes

Agents should treat hard-rule fields as operational constraints. Agents should treat editorial guidance fields as informed recommendations, not absolute truth.

- User job supported: choose the right preset for context and brand tone
- Business goal supported: differentiated AI workflow value
- Acceptance signal: agents can filter preset candidates using hard-rule fields and reason about tradeoffs using editorial guidance fields without relying on bare names alone

### Requirement 5: Human-readable guidance

Motion Lab must include prose guidance for developers and agents that explains how to choose presets by context, tone, and interaction goal.

- User job supported: improve motion decisions immediately, even before richer tooling is complete
- Business goal supported: fast path to value with low implementation risk
- Acceptance signal: a developer can provide the guidance to an agent and improve preset selection quality across a small internal scenario set, compared with bare preset names alone

### Requirement 6: Export-aligned agent workflow

Agents must be able to move from preset selection to usable Motion Lab output without inventing unsupported behavior.

This means the agent-facing surface should clearly describe:

- available triggers
- supported export types
- when CSS export is the better fit
- when animated SVG is the better fit
- intensity and duration limits where relevant

- User job supported: go from selection to output reliably
- Business goal supported: usable end-to-end workflow, not just discovery
- Acceptance signal: an agent can produce output and rationale using supported parameters only, including consulting the preset's `export_compatibility` metadata where available

### Requirement 7: Parity safeguards

The product must include safeguards that keep browser and MCP preset access aligned over time.

Phase 0 must include an automated parity check in CI that compares preset ids and group membership between the browser-consumed and MCP-consumed views of the shared preset source. If they diverge, the build must fail.

Phase 0 should also include:

- parity tests for preset ids
- parity tests for group membership
- versioned preset data
- docs derived from the shared preset source where possible

- User job supported: trust that Motion Lab behaves consistently
- Business goal supported: lower maintenance cost and fewer regressions
- Acceptance signal: preset drift is caught automatically before release rather than discovered later in docs or product behavior

## Phased Scope

### Phase 0: Foundation alignment

- replace the separate 12-preset MCP registry
- create one shared preset module for Motion Lab at a shared location such as `lib/motion-lab-presets.js`
- move the current browser-tested preset definitions into that shared module without changing the browser experience
- make browser and MCP read from that shared module
- keep agent access read-only
- add automated parity checks for preset ids and group membership
- record the shared import pattern in engineering notes so future Motion Lab changes do not reintroduce a second preset source

### Phase 1: Shared preset exposure

- expose the full browser preset library through MCP
- return group, base descriptive data, and export compatibility for all presets
- align docs with the real Motion Lab preset count and groups

### Phase 2: Motion decision guidance

- create and approve `docs/plans/agent-metadata-schema.md`
- publish Motion Lab agent guidance in docs
- curate light metadata for all 80 Motion Lab presets in v1, with deeper metadata added iteratively after launch
- classify metadata fields as hard rules or editorial guidance

### Phase 3: Enriched MCP preset data

- return richer metadata in `list_motion_presets()`
- add preset detail or recipe enrichment where helpful
- support rationale-ready agent outputs

### Phase 4: Optional higher-level assistance

- evaluate a recommendation-oriented MCP tool only after the metadata layer proves useful
- possible examples:
  - `recommend_motion_preset`
  - `describe_motion_context`

## Constraints

### Product Constraints

- The working human Motion Lab experience should not be degraded or rewritten just to fit agent access.
- The decision layer must avoid overclaiming certainty for subjective motion choices.

### Technical Constraints

- The current browser preset source lives in `store.js`, while MCP uses `lib/motion-lab-workflow.js`.
- Unification needs to happen without breaking the existing Motion Lab experience.
- The MCP surface should remain read-only with respect to preset definitions.
- The shared preset source should move into a dedicated shared module, with browser and MCP importing from that module rather than maintaining separate inline definitions.

### Editorial Constraints

- Metadata fields such as emotional tone and avoid-for guidance require careful curation.
- The team should avoid inventing guidance that cannot be defended in product review.

## Success Metrics

### Primary Metric

- Percentage of Motion Lab presets available through MCP that match the browser preset set exactly

Target:

- 100% parity between browser and MCP preset ids after Phase 1

### Supporting Metrics

- percentage of presets with complete metadata fields
- percentage of agent motion exports using supported parameters only
- qualitative developer feedback that agent-selected presets feel more context-appropriate
- reduction in docs inconsistencies about Motion Lab preset counts and groups

### Feedback Collection

Before any recommendation-style MCP tool is approved, the team should collect directional feedback through:

- structured internal prompt evaluations against a small set of repeatable scenarios
- developer feedback from docs examples and implementation reviews
- support or community notes where developers compare agent-selected presets with manual browser choices

### Guardrail Metrics

- no regression in browser Motion Lab behavior during unification
- no MCP capability that allows editing preset definitions
- no mismatch between docs-stated preset groups and actual preset groups

## Risks And Dependencies

### Risks

1. **Curation quality risk**
Poor metadata could make agents more confidently wrong rather than more helpful.

2. **Implementation risk**
Moving the shared preset source out of the current browser implementation could accidentally break the working Motion Lab UI if handled carelessly.

3. **Scope risk**
Trying to solve shared source, metadata, recommendation, and full agent tooling all at once could slow delivery and lower quality.

4. **False precision risk**
Motion is partly taste-based. The product should support good decisions, not pretend every decision is objectively correct.

### Dependencies

- shared preset source design
- Motion Lab preset review and grouping validation
- docs updates after unification
- product decision on whether recommendation should remain a guide or later become a tool

## Security And Integrity Requirements

Because the shared preset source will support both humans and agents, integrity matters.

The product must ensure:

- agents can read preset data but not write preset definitions through MCP
- preset data changes remain controlled through the normal code and release workflow
- premium export rules remain enforced separately from preset visibility
- exposing richer preset metadata does not expose private admin controls or mutation paths

This project is about shared truth, not shared write power.

## Open Questions

1. Should Phase 1 expose all preset detail fields immediately, or start with a smaller base shape and expand in Phase 2?
2. Should recommendation remain guidance-led until enough feedback exists to justify a dedicated MCP tool?

## Recommended Delivery Order

1. Build the shared preset source and remove the separate MCP registry.
2. Expose the full preset set through MCP in read-only form.
3. Align Motion Lab docs to the shared preset set.
4. Metadata schema defined and approved in `docs/plans/agent-metadata-schema.md`.
5. Publish Motion Lab agent guidance.
6. Add richer metadata to MCP outputs.
7. Consider recommendation tooling only after the above proves useful.

## Sources Used

- `docs/motion-lab-single-source-of-truth-audit.md`
- `docs/motion-lab-agent-library-analysis.md`
- `docs/plans/agent-library-plan.md`
- `docs/plans/agent-library-feasibility.md`
- `mcp/index.js`
- `lib/motion-lab-workflow.js`
- `store.js`
