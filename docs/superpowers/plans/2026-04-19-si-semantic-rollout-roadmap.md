# SI Semantic Rollout Roadmap

Status: Living roadmap  
Date: April 19, 2026  
Owner: Supericons

## Purpose

Define the long-term rollout path for turning the SI Semantic Metadata v1 framework into a real operational system across free icons, premium icons, MCP, search, UI, export, and future native Supericons assets.

This roadmap is intentionally progressive. It assumes:

- we start with a narrow but durable foundation
- we automate aggressively where repetition exists
- we escalate only where ambiguity or quality demands it
- we keep compounding rather than waiting for “perfect”

---

## North Star

Create a semantic system where every Supericons-powered icon can eventually answer:

- what am I
- what do I depict
- what do I mean
- when should I be used
- when should I be avoided
- how trustworthy is this recommendation
- can I express motion, state, or interaction

---

## Strategic Truth

The rollout has two different quality lanes.

### Lane A: Aggregated icon corpus

Goal:

- broad useful semantic coverage across the `21,264` free icons and premium icon records

Reality:

- coverage will begin as mixed-confidence
- automation and sampling are essential

### Lane B: Native SI icon system

Goal:

- full qualitative assessment
- deeper semantics
- stronger usage guidance
- motion/state/programmable semantics first

Reality:

- this becomes the highest-quality semantic tier
- this is where long-term differentiation is strongest

This two-lane strategy lets Supericons stay practical now and differentiated over time.

---

## Product Principles

### 1. Do not wait for total manual review

Manual review of all `21,264` icons before launch is too slow and too expensive.

### 2. Do not trust pure lexical inference alone

Search improvements prove retrieval value, but retrieval is not final semantic truth.

### 3. Add visual inspection where it compounds quality

Visual review matters most for:

- ambiguous icons
- high-traffic icons
- native SI icons
- sampled QA audits

### 4. Use automation as a permanent system, not a one-time batch

The goal is not one giant tagging sprint. The goal is a continuous semantic factory.

### 5. Use stronger review only where the economics justify it

Cheap automation should do the bulk work. Higher-cost review should handle exceptions, novel cases, and quality gates.

---

## Workstreams

## Workstream A: Schema and Controlled Vocabularies

Objective:

- finalize SI Semantic Metadata v1
- define controlled vocabularies for category, intent, domain, state, and review state

Why this matters:

- no stable schema means every other workstream drifts

## Workstream B: Registry Foundation

Objective:

- create the repo-native canonical registry record layer
- generate projections from one source

Why this matters:

- this is the backbone for search, MCP, UI, docs, and export

## Workstream C: Premium Metadata Normalization

Objective:

- convert all `400` premium icons into the canonical SI Registry shape

Why this matters:

- volume is small
- semantic value is high
- premium records are the fastest place to establish quality

## Workstream D: Free Corpus Progressive Coverage

Objective:

- progressively tag all free icons with minimum viable SI semantic metadata

Why this matters:

- this closes the biggest gap between current search power and future semantic truth

## Workstream E: Visual Inspection Pipeline

Objective:

- add a multimodal visual-inspection step to the semantic-tagging workflow

Why this matters:

- names and ids are not enough for final semantic quality

## Workstream F: Editorial Review and Confidence Routing

Objective:

- route records by confidence and importance

Why this matters:

- not every record deserves the same review budget

Minimum tooling needed:

- pending queue
- current-versus-proposed comparison
- approve, reject, and edit actions
- audit trail
- confidence and category filters

A CLI is enough for the first version. A full admin UI can come later.

## Workstream G: Product Surface Adoption

Objective:

- use registry projections in:
  - search
  - MCP
  - browse facets
  - docs
  - exports

Why this matters:

- the registry only matters if the product actually reads from it

Adoption order:

1. `search_icons`
2. `get_icon`
3. library facts and counts
4. browse facets
5. docs and exports
6. motion-tool semantic alignment where it adds value

## Workstream H: Native SI Library

Objective:

- build SI-native icons as the most semantically complete and highest-trust tier

Why this matters:

- this is where full qualitative assessment and deeper differentiation live

---

## Visual Inspection Strategy

The user’s suggestion is directionally right: icon images are relatively simple compared with natural images, so visual inspection should be cheaper and more automatable than general image understanding.

The key is to use visual models in the right role.

### Recommended role for visual inspection

Visual inspection should answer:

- what does this icon visually depict
- what motifs are present
- how ambiguous is it
- what could it be confused with

Visual inspection should not be the sole authority for:

- final recommended purpose
- final `use_when`
- final `avoid_when`

### Recommended pilot

Run a small pilot first.

Pilot slice:

- 100 premium icons
- 100 top free icons
- 50 deliberately ambiguous icons

For each icon, compare:

- lexical inference
- visual inference
- current pack/context signals
- final reviewed recommendation

Success criteria:

- useful depiction summaries
- useful ambiguity ratings
- acceptable agreement with human review
- low enough cost to run continuously

### Long-term operating model

1. Cheap lexical pass
2. Cheap visual pass
3. Merge pass
4. Confidence score
5. Human review only when needed

This is where a continuous workflow or cron job becomes valuable.

---

## Autonomous Semantic Tagging Workflow

The semantic rollout should become a continuous system.

## Inputs

- source icon identity
- source name and id
- source library
- premium pack metadata
- current alias maps
- taxonomy seed as a short-term bootstrap input only
- search telemetry
- visual inspection output

## Pipeline

1. Ingest icon
2. Generate lexical suggestions
3. Generate visual depiction suggestions
4. Merge contextual signals
5. Produce draft SI semantic record
6. Validate schema and controlled vocab
7. Assign confidence
8. Route to:
   - auto-accept
   - queued review
   - escalation
9. Publish registry record
10. Regenerate projections

## Cadence

- nightly or scheduled local/CI batch for new or unreviewed icons
- weekly editorial triage for low-confidence/high-value records
- monthly vocabulary cleanup and quality audit

## Pilot lanes and budget guardrails

The visual pilot should test at least two lanes:

1. a low-cost hosted multimodal lane
2. a local or open-source multimodal lane if setup friction is reasonable

Budget guidance:

- a 250-icon pilot should stay within a low single-digit dollar budget on hosted low-resolution vision calls
- a local open-source lane can be near-zero marginal cost if the hardware is already available
- exact vendor pricing should be checked at execution time because it changes

Success criteria:

- depiction quality improves over lexical-only tagging
- ambiguity detection improves over lexical-only tagging
- operational friction stays low enough for continuous use

## Efficiency model

Recommended principle:

- cheapest model or heuristic that produces acceptable first-pass quality
- stronger models only for disagreement, ambiguity, or sensitive icons

This keeps costs low and throughput high.

---

## Confidence Routing Model

### High confidence

Traits:

- clear lexical signal
- clear visual depiction
- strong pack or domain context
- low ambiguity

Action:

- auto-accept into draft active state or light-touch review

### Medium confidence

Traits:

- decent lexical or visual evidence
- some ambiguity
- acceptable but not strong context

Action:

- queue for batch review

### Low confidence

Traits:

- weak or conflicting evidence
- high ambiguity
- risky semantic assignment

Action:

- require deeper review or defer stronger claims

## Taxonomy seed transition rule

The current 3-chip seed is a temporary browse aid, not the long-term owner of semantic categories.

Rule:

- keep the seed for the current `All Icons` browse experiment
- do not expand it into a second full metadata system
- when registry-backed facets are ready, switch browse facets to registry projections in one cutover

---

## Phased Rollout

## Phase 0: Lock the Meaning System

Target:

- immediate

Outcomes:

- SI Semantic Metadata v1 is finalized
- SI Registry product posture is finalized
- one living roadmap exists

## Phase 1: Build the Foundation

Target:

- next 2 to 4 weeks

Outcomes:

- repo-native registry foundation exists
- product facts generator exists
- premium records are normalized into the canonical shape
- count/version drift is reduced

## Phase 2: Prove the Semantic Factory

Target:

- next 4 to 8 weeks

Outcomes:

- tagging pipeline runs continuously
- 200 to 500 top free icons receive high-value semantic records
- visual inspection pilot is measured
- confidence routing works

## Phase 3: Expand Coverage Without Losing Quality

Target:

- post-launch

Outcomes:

- thousands of free icons receive minimum viable semantic coverage
- ambiguous sets are sampled and audited
- review backlog is manageable

## Phase 4: Productize the Registry

Target:

- after the semantic record model is stable

Outcomes:

- public registry API for free/open records
- self-describing SVG passport export
- compact `si://` format support
- browse facets pull from registry projections

## Phase 5: Unlock the Higher-Level Product

Target:

- once registry quality is strong enough

Outcomes:

- `request_semantic_icon`
- richer MCP explanations
- motion-aware semantic records
- native SI icon grammar and programmable icon behavior

---

## Native SI Library Strategy

The native SI library should be treated as the gold semantic tier.

For SI-native icons:

- write records intentionally, not just infer them
- require visual review
- require richer `use_when` and `avoid_when`
- add motion/state semantics earlier
- use them as exemplars for the broader registry

This is the part of the roadmap that should carry the strongest qualitative standard.

---

## Metrics

### Coverage metrics

- percent of icons with minimum viable semantic records
- percent of icons with reviewed records
- percent of premium icons normalized

### Quality metrics

- human agreement rate on sampled records
- ambiguity rate
- revision rate after review
- false-positive semantic assignment rate

### Product metrics

- search satisfaction on semantically enriched queries
- MCP usefulness for technical or intent-driven searches
- browse engagement with future registry-backed facets
- free-to-paid conversion on premium-intent searches
- API key activation after MCP setup exposure
- premium collection attach rate where richer semantics are shown

### Operational metrics

- pipeline throughput
- average review backlog
- cost per 1,000 records processed

### Business hypotheses to watch

- richer search meaning should improve conversion on high-intent searches
- richer MCP explanations should improve retained technical usage
- richer premium semantics should improve merchandising and perceived value

---

## Risks and Responses

### Risk: automation floods the registry with shallow semantics

Response:

- require evidence and confidence
- keep review state explicit

### Risk: visual models over-interpret icons

Response:

- use visual models for depiction and ambiguity, not final purpose alone

### Risk: the long tail never gets finished

Response:

- run the workflow continuously
- tie improvement to weekly cadence
- keep quality tiering explicit

### Risk: the roadmap becomes too visionary again

Response:

- keep the registry tied to current product surfaces
- let each phase earn the next one

---

## Final Recommendation

Treat semantic rollout as an operating system, not a project.

The right long-term move is not:

- manually tag everything once

The right long-term move is:

- finalize the schema
- build the registry
- automate the pipeline
- use visual inspection where it genuinely improves quality
- review the important and ambiguous slices
- progressively cover the corpus
- let product surfaces compound the value

That is how Supericons can move from “good semantic search” to “a real semantic icon system” without stalling launch momentum.
