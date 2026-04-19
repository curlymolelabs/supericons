# Agent Feedback Positioning and Next-Steps Plan

Prepared: April 2026  
Purpose: Convert the first-hand agent selection feedback into concrete changes to Supericons positioning, design priorities, and near-term roadmap sequencing.

Inputs:
- `strategy/agent-icon-selection-feedback.md`
- `strategy/supericons-2027-vision-blueprint.md`
- `strategy/supericons-v1-v2-decision-roadmap-2026.md`
- `strategy/supericons-marketing-proposal-2026.md`

---

## Executive Takeaway

The agent feedback does not weaken the 2027 vision. It sharpens it.

The most important lesson is:

> Agents do not browse icons the way humans do. They pick the path of least resistance, use names they already know, and optimize for semantic certainty over visual exploration.

That means the Supericons opportunity is not:

- "build a prettier icon library"

It is:

- "become the default semantic icon reasoning layer for AI-built interfaces"

The implication is significant:

- the 2027 vision is still correct
- but the execution order must change
- friction removal, intent resolution, and vocabulary design now move ahead of broader marketplace promotion

---

## What The Feedback Changes

## 1. It upgrades "semantic search" from a feature to the product hook

The feedback shows that the current agent default is:

1. remember a known icon name from training data
2. type that name directly
3. skip visual evaluation
4. accept a mediocre result if it is fast

This means Supericons does not beat Material Symbols by offering a larger catalog or better taste alone.

Supericons wins when it lets an agent say:

- "waiting for human approval"
- "confidence low"
- "audit required"
- "agent initiated"

and get the right icon bundle without guessing a noun.

### Positioning consequence

Supericons should increasingly describe itself as:

**the semantic interface layer for icon selection in human and agent workflows**

not only:

**the UI polish layer for modern builders**

The "UI polish layer" framing still works for humans.  
But for agents, the sharper promise is:

**describe the intent, get the right visual element**

---

## 2. It validates the governance vocabulary gap as the highest-value wedge

The feedback is strongest where the agent failed:

- confidence levels
- human override
- authority markers
- audit required
- disclosure layers
- memory accessed
- reasoning chain
- waiting for human approval

These are not random misses.
They are the exact places where generic icon systems stop being sufficient.

### Product consequence

The governance packs in the 2027 blueprint are not speculative.
They are already validated by first-hand agent failure.

This makes the following roadmap order correct:

1. Agent Lifecycle
2. Trust and Authority
3. Risk and Consequences
4. Disclosure and Transparency

---

## 3. It proves that composability matters more than single glyphs

The feedback did not ask only for better individual icons.
It asked for:

- icon + state
- icon + confidence
- icon + authority
- icon + ring + animation + label

In other words, the agent was asking for a visual grammar system, even when it did not use that term directly.

### Design consequence

Pillar 5 in the 2027 vision is not an advanced add-on.
It is a direct answer to the agent workflow that already exists.

This means:

- authority-marker primitives
- confidence badges
- state rings
- risk overlays

should be treated as first-order design system objects, not later embellishments.

---

## 4. It shows that "zero setup friction" is itself a design requirement

The feedback explicitly says the agent chose Material Symbols because:

- one link tag
- known names
- no extra auth
- no tool round-trip

This is not merely a growth issue.
It is a product design truth:

**friction is part of the interface**

### Product consequence

Every Supericons surface should be designed against a path-of-least-resistance benchmark:

- can the agent use it without knowing icon names?
- can the agent use it in one call?
- can a human discover it without setup overhead?
- can a builder paste it directly into code?

This pushes us toward:

- better MCP defaults
- better docs examples
- GitHub kits with immediate copy-paste value
- semantic phrasebooks
- direct "describe what you need" entry points

---

## Revised Positioning

## Core product statement

**Supericons helps humans and coding agents select the right icon by intent, not by memorized icon names.**

## Human-facing positioning

**Supericons is the fastest way for modern builders to ship sharper interfaces with curated icons, packs, motion, and UI-ready exports.**

## Agent-facing positioning

**Supericons is the semantic icon interface for AI-built UI: describe the concept, state, or risk, and get the right visual element back.**

## Moat statement

The moat is no longer best framed as:

- "more icons"

It should be framed as:

- governance vocabulary
- semantic intent resolution
- composable icon grammar
- stateful motion
- dual-surface metadata
- agent-native delivery

---

## Revised Design Principles For The Vision

## 1. Design for semantic retrieval first

Every important icon must answer:

- what concept does this represent?
- what synonyms will an agent use for it?
- what context is it valid for?
- what contexts is it wrong for?

This is the practical meaning of dual-surface design.

## 2. Design for vocabulary gaps, not just catalog breadth

The most valuable icons are not more variants of common UI nouns.
They are the missing icons that generic libraries cannot express well:

- authority
- confidence
- human approval
- auditability
- memory/context access
- reasoning trace
- irreversible risk

## 3. Design primitives before overly polished full systems

The shortest route to usefulness is:

- base glyph
- confidence badge
- authority marker
- state ring
- risk stripe

This gets us to agent utility faster than trying to fully solve the 2027 visual system in one step.

## 4. Design docs for promptability

Agents need phrasebooks more than moodboards.

That means docs should include:

- "how to ask for this icon"
- "what phrases resolve to this concept"
- "when not to use this icon"
- "good alternative concepts"

This should exist in both:

- MCP docs
- GitHub kit READMEs

## 5. Design distribution assets that seed future training data

GitHub kits are not just growth assets.
They also create:

- searchable concept-language
- code examples
- README vocabulary
- public noun-to-concept associations

That helps agents know Supericons concepts over time, which chips away at Material's training-data advantage.

---

## What This Means For The Roadmap

## Immediate roadmap correction

The 2027 blueprint should still be kept as the north star.
But near-term execution should be reordered as follows:

1. Remove friction from the current human + MCP surfaces
2. Encode intent vocabulary into the corpus
3. Ship the first governance primitives and packs
4. Expose semantic resolution in MCP
5. Only then scale awareness and directory distribution aggressively

---

## Next-Steps Plan

## Phase A: Friction Removal and Semantic Foundations

Timeframe: next 2-4 weeks

### Goals

- make the current product easier for agents to adopt
- reduce dependence on pre-known icon names
- turn search intelligence into vocabulary intelligence

### Deliverables

1. **Fix the public MCP package path completely**
   - ensure the published `supericons-mcp` package includes the hosted gateway client and telemetry runtime files
   - verify the exact docs path: `npx -y supericons-mcp`
   - treat this as a release gate before broader promotion

2. **Publish an "agent phrasebook" layer**
   - create a docs page: "How to describe icons to agents"
   - include examples like:
     - `waiting for human approval`
     - `confidence low`
     - `audit required`
     - `agent initiated`
   - map these phrases to current or target icon concepts

3. **Add semantic metadata v0 to the highest-value icons**
   - start with the top 100-200 icons across:
     - AI
     - status
     - security
     - navigation
   - minimum fields:
     - `purpose`
     - `category`
     - `semantic_tags`
     - `recommended_context`
     - `avoid_for`

4. **Create a governance search backlog from real queries**
   - use `strategy/weekly-search-intelligence-triage.sql`
   - cluster unmet demand around:
     - confidence
     - authority
     - audit
     - approval
     - memory
     - trace

### Success criteria

- public MCP package works from docs-only install
- docs include agent-oriented request language
- first semantic metadata layer exists on a meaningful subset
- search backlog is being translated into governance concepts

---

## Phase B: Governance Vocabulary MVP

Timeframe: next 4-8 weeks

### Goals

- ship the first unmistakably agent-native visual vocabulary
- prove that Supericons solves problems generic libraries do not

### Deliverables

1. **Ship Agent Lifecycle collection first**
   - idle
   - observing
   - planning
   - executing
   - waiting
   - blocked
   - uncertain
   - done
   - error

2. **Design the first grammar primitives**
   - confidence badge
   - authority marker
   - state ring
   - waiting-for-human marker

3. **Ship GitHub-ready free kits as discovery wedges**
   - `status-feedback`
   - `navigation-menus`
   - `ecommerce`
   - optionally `ai-agentic` as the bridge to governance packs

4. **Standardize pack packaging**
   - README
   - preview/demo
   - usage-map
   - framework usage examples
   - explicit Supericons upgrade path

### Success criteria

- at least one governance-oriented collection is public and legible
- GitHub kits are actually package-quality, not just folders of SVGs
- README language reinforces semantic and agent-native positioning

---

## Phase C: Semantic Resolution MVP

Timeframe: next 8-12 weeks

### Goals

- let agents ask for concepts instead of memorized icon names
- make Supericons clearly better than generic icon recall

### Deliverables

1. **Ship `request_semantic_icon` MVP**
   - input: intent, context, state, risk, tone
   - output: icon choice + metadata + usage guidance

2. **Publish governance taxonomy**
   - state
   - authority
   - confidence
   - disclosure
   - consequence

3. **Expand semantic metadata coverage**
   - governance icons: 100% coverage
   - top free icons: prioritized backfill

4. **Add selection rationale to responses**
   - why this icon
   - what alternatives were rejected
   - when not to use it

### Success criteria

- agents can describe a need and get a usable result in one call
- semantic retrieval outperforms raw keyword guessing on governance concepts
- Supericons feels categorically different from a plain SVG library

---

## Phase D: Stateful and Composable System

Timeframe: after semantic MVP proves demand

### Goals

- turn semantic icon resolution into deployable UI elements

### Deliverables

1. `get_stateful_icon`
2. `get_icon_grammar`
3. state-to-preset mapping layer for Motion Lab
4. composable bundles:
   - base glyph
   - state treatment
   - confidence
   - authority
   - risk

### Success criteria

- the agent can request a full stateful visual bundle, not just a glyph
- Supericons starts to behave like an interface grammar, not just an icon catalog

---

## What We Should Say Publicly Now

We should not market the whole 2027 vision as if it already exists.

We should say:

- Supericons helps builders and coding agents find the right icon faster
- Supericons is building the visual vocabulary for agentic software
- Supericons already supports semantic search, packs, motion, and MCP workflows
- the next frontier is governance and semantic icon selection

This keeps the story ambitious but honest.

---

## Final Recommendation

The agent feedback should change our emphasis more than our destination.

The destination remains:

- the visual language layer for human-AI collaboration

But the next build sequence should be:

1. zero-friction adoption
2. semantic metadata
3. governance vocabulary
4. semantic MCP resolution
5. composable stateful grammar
6. wider distribution and standard-setting

The lesson is simple:

**The future will not be won by the library with the prettiest static icons. It will be won by the system that makes the right visual decision easiest for both humans and agents.**
