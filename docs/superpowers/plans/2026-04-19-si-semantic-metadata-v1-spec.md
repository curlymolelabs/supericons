# SI Semantic Metadata v1

Status: Draft for alignment  
Date: April 19, 2026  
Owner: Supericons

## Purpose

Define the canonical semantic metadata framework for every icon in the SI Registry.

This document answers one core question:

**How do we decide what an icon is meant for when the source icon usually gives us only a name, an id, and a visual shape?**

The answer is:

- the source library gives us identity and hints
- the icon image gives us visual evidence
- search behavior gives us retrieval evidence
- SI publishes an editorial recommendation
- every recommendation carries evidence, confidence, and review state

This is an intentionally honest model. We are not claiming objective truth for every icon. We are creating a durable, reviewable SI judgment system that humans and agents can trust.

---

## Foundational Position

### What an open-source icon actually gives us

Most open-source icons do not come with a full semantic contract. They usually give us:

- a source name
- a source id
- a source library
- a rendered visual form

That is enough to render the icon, but not enough to fully answer:

- what this icon most responsibly means
- when it should be used
- when it should not be used
- whether it is ambiguous
- what other icons it pairs with
- whether it can later become motion-capable or stateful

### What SI adds

SI adds an editorial semantic layer on top of the source asset.

That semantic layer must distinguish between four kinds of truth:

1. **Source identity**
   What the source library calls the icon and where it came from.

2. **Visual depiction**
   What the icon appears to depict when we look at it.

3. **SI recommended purpose**
   What SI recommends using the icon for in product and agent-built interfaces.

4. **Evidence and trust**
   Why SI believes that recommendation and how confident we are.

This distinction is the foundation of the framework.

---

## Design Principles

### 1. Registry first

The SI Registry record is the canonical source of truth. Everything else is a projection:

- public icon index
- MCP responses
- hosted search tables
- SVG embedded passport metadata
- compact `si://` payload
- browse filters
- docs copy

### 2. Honest semantics

The framework should never pretend that source names alone equal final truth.

Instead, every semantic record should make clear:

- what was inherited
- what was inferred
- what was recommended
- what was reviewed

### 3. Stable schema, progressive coverage

The field model should stabilize early. Coverage can grow over time.

### 4. Human-readable and machine-readable

A builder should be able to read a record and understand it. An agent should be able to parse it without guessing.

### 5. Designed for future motion and programmability

The framework must support static icons today and richer motion, state, and programmable behavior later.

---

## What an SI Registry Record Must Answer

Every icon record should answer these questions:

1. What icon is this?
2. What does it visually depict?
3. What does SI recommend using it for?
4. When should it be used?
5. When should it be avoided?
6. How strong is the supporting evidence?
7. How reviewed and trustworthy is the record?
8. Can it support motion, state, or programmable behavior?

---

## Metadata Groups

## 1. Identity

Identity fields define the asset itself and its origin.

### `icon_id`

Definition: The globally unique SI identifier for the icon record.

Why it exists:

- gives every icon a stable handle
- allows all projections to point to the same object
- supports linking, versioning, and deduplication

Examples:

- `lucide:shield-check`
- `material:account_tree`
- `si:agent-planning`

Generation rule:

- aggregated icons must use `{source_library}:{source_name}`
- SI-native icons must use `si:{name}`
- MCP payloads that still expose separate `id` and `library` fields must derive the same registry key from those two fields
- taxonomy-seed entries that already use `library:name` format should map directly into the same rule

### `source_library`

Definition: The original library or family this icon comes from.

Why it exists:

- preserves provenance
- supports grouping and trust decisions
- separates aggregated icons from SI-native icons

Examples:

- `lucide`
- `material`
- `tabler`
- `supericons-premium`

### `source_name`

Definition: The original human-facing name from the source library, if one exists.

Why it exists:

- useful for fallback search
- useful for audits and migration
- useful when SI label differs from source naming

Example:

- `shield-check`

### `style`

Definition: The visual style variant of the icon.

Why it exists:

- many icons have outline and solid variants
- future motion-capable variants will need style distinction

Examples:

- `outline`
- `solid`
- `filled`
- `duotone`
- `animated`

### `asset_kind`

Definition: The technical form of the icon asset.

Why it exists:

- rendering and export behavior differ by asset type
- helps downstream systems know what transformations are valid

Examples:

- `svg`
- `font-glyph`
- `animated-svg`
- `composite`

### `collection_id`

Definition: The SI collection, pack, or family this icon belongs to.

Why it exists:

- supports merchandising
- supports browse groupings
- supports quality tiers and ownership logic

Examples:

- `free.core.navigation`
- `premium.ai-agentic`
- `premium.status-feedback`

### `is_premium`

Definition: Whether the icon belongs to a premium or entitlement-gated surface.

Why it exists:

- required for pricing and entitlement logic
- useful for roadmap segmentation

Values:

- `true`
- `false`

## 2. Visual Depiction

Visual depiction fields describe what the icon appears to show, before we assign final SI usage guidance.

### `depicts`

Definition: A short plain-language description of what the icon visually depicts.

Why it exists:

- separates raw depiction from editorial recommendation
- reduces over-claiming
- useful for visual QA and multimodal review

Examples:

- `shield with checkmark`
- `robot head`
- `branching node tree`

### `visual_motifs`

Definition: Key visual elements or motifs that appear in the icon.

Why it exists:

- helps explain why an icon matched
- helps similarity search and qualitative review

Examples:

- `shield`
- `checkmark`
- `node graph`
- `sparkle`

### `visual_ambiguity`

Definition: A qualitative rating of how visually ambiguous the icon is without surrounding text.

Why it exists:

- some icons are semantically obvious
- others are highly context-dependent

Recommended values:

- `low`
- `medium`
- `high`

### `visual_confusion_notes`

Definition: Notes about what this icon may be confused with.

Why it exists:

- guides `avoid_when`
- useful for human review and future linting

Example:

- `May be confused with generic AI branding rather than planning state.`

## 3. Semantics Core

These fields define SI's recommended semantic interpretation.

### `label`

Definition: The plain-language label SI wants humans and agents to use for the icon.

Why it exists:

- source labels are often inconsistent
- SI needs a stable human-facing term

Examples:

- `Agent Planning`
- `Verified Shield`
- `Branching Workflow`

### `purpose`

Definition: A one-line description of what this icon is intended to communicate.

Why it exists:

- this is the most important semantic field
- it is the anchor used by UI, search, docs, and MCP

Good example:

- `Show that an AI agent is currently planning its next step.`

Bad example:

- `Brain icon`

### `category`

Definition: The primary semantic bucket for the icon.

Why it exists:

- supports browse, grouping, and consistency
- gives a stable high-level taxonomy

Examples:

- `navigation`
- `status`
- `security`
- `commerce`
- `agent-lifecycle`

### `semantic_tags`

Definition: Canonical concept tags associated with the icon.

Why it exists:

- improves retrieval
- supports future intent-based selection
- helps normalize search language

Examples:

- `planning`
- `trust`
- `warning`
- `approval`
- `retrieval`

### `synonyms`

Definition: Alternate user or agent phrases that may be used when searching for the icon.

Why it exists:

- many correct queries do not match the icon label
- useful for search and ranking

Examples:

- `hallucination`
- `ai drift`
- `self hosted`
- `vector db`

### `state`

Definition: The specific state represented by the icon, if the icon is stateful.

Why it exists:

- many icons do not just show an object; they show a condition
- future motion/state systems need this distinction

Examples:

- `idle`
- `planning`
- `running`
- `blocked`
- `warning`

### `intent`

Definition: The communication job the icon performs in a UI.

Why it exists:

- two icons can share a category but serve different UI intentions
- supports agent-driven icon selection

Examples:

- `inform`
- `warn`
- `confirm`
- `navigate`
- `authorize`

### `domain`

Definition: The product or workflow domain where the icon most naturally belongs.

Why it exists:

- distinguishes general meaning from contextual meaning
- helps avoid over-generalizing niche icons

Examples:

- `ai-agents`
- `saas`
- `security`
- `media`
- `commerce`

## 4. Usage Guidance

These fields express editorial judgment.

### `use_when`

Definition: A concise description of the situations where this icon is a good choice.

Why it exists:

- meaning without usage guidance still leads to bad icon selection

Example:

- `Use when the system is reasoning before taking an action.`

### `avoid_when`

Definition: A concise description of when this icon should not be used.

Why it exists:

- helps prevent misleading or noisy UI
- forces SI to be explicit about ambiguity

Example:

- `Do not use for generic AI branding, settings, or completed work.`

### `pairs_with`

Definition: Icons or UI primitives that commonly work well with this icon.

Why it exists:

- many real systems use icon composition
- useful for future grammar and motion systems

Examples:

- `progress-ring`
- `confidence-badge`
- `authority-marker`

### `anti_pairs`

Definition: Pairings that usually create semantic conflict or confusion.

Why it exists:

- prevents contradictory icon systems

Example:

- `success-check`

### `recommended_context`

Definition: The UI surfaces where this icon is especially effective.

Why it exists:

- some icons work in a status row but not in top-level navigation
- helps contextual recommendation

Examples:

- `agent dashboard`
- `activity timeline`
- `status chip`
- `empty state`

### `confidence_notes`

Definition: Notes about nuance, ambiguity, or constraints in the recommendation.

Why it exists:

- semantics are not always binary
- helps future reviewers understand why a record is not fully certain

## 5. Accessibility

Accessibility fields make semantics usable beyond visuals.

### `a11y_role`

Definition: The recommended accessibility role for the icon.

Why it exists:

- supports consistent downstream rendering

Examples:

- `img`
- `status`
- `presentation`

### `a11y_label`

Definition: The recommended accessible label.

Why it exists:

- gives agents and UIs a safe default

Example:

- `Agent is planning`

### `aria_live`

Definition: The recommended live-region behavior if the icon reflects changing state.

Why it exists:

- important for dynamic status indicators

Values:

- `off`
- `polite`
- `assertive`

### `decorative_default`

Definition: Whether the icon should default to decorative treatment when used without explicit semantic meaning.

Why it exists:

- prevents over-announcing repeated or purely decorative icons

Values:

- `true`
- `false`

## 6. Dynamics

These fields prepare SI for motion, interaction, and programmable icon behavior.

### `supports_motion`

Definition: Whether the icon has a meaningful motion-capable form.

Why it exists:

- not every icon should animate
- helps bridge static search and Motion Lab futures

Values:

- `true`
- `false`

### `motion_family`

Definition: The motion behavior family that best fits the icon.

Why it exists:

- motion should communicate meaning, not just decorate

Examples:

- `pulse`
- `rotate`
- `draw`
- `shake`
- `flow`

### `interactive_capabilities`

Definition: Interaction modes the icon can meaningfully support.

Why it exists:

- some icons are better as toggles, progress indicators, or state transitions

Examples:

- `hover`
- `toggle`
- `progress`
- `state-transition`

### `programmable_props`

Definition: Named properties that can be driven by code.

Why it exists:

- this is the bridge toward icons as programmable UI objects

Examples:

- `progressValue`
- `confidenceLevel`
- `statusLevel`
- `activeState`

## 7. Evidence and Governance

These fields express trust, maturity, and provenance.

### `evidence_sources`

Definition: The sources used to support the semantic recommendation.

Why it exists:

- semantics should be explainable
- supports automated and human review

Examples:

- `source-name`
- `source-library-context`
- `visual-inspection`
- `search-telemetry`
- `premium-pack-manifest`
- `editorial-review`

### `evidence_summary`

Definition: A short explanation of why SI recommends this purpose.

Why it exists:

- useful for review and debugging
- useful for future `request_semantic_icon` explanations

### `confidence_score`

Definition: Numeric confidence in the SI recommendation.

Why it exists:

- lets us scale coverage without pretending all records are equally strong
- helps route records into auto-accept, human-review, or escalation lanes

Format:

- decimal from `0.00` to `1.00`

### `confidence_band`

Definition: Human-friendly confidence grouping.

Why it exists:

- easier for ops and editorial triage

Recommended values:

- `low`
- `medium`
- `high`

### `review_state`

Definition: The current quality-control state of the record.

Why it exists:

- separates machine suggestion from approved truth

Recommended values:

- `ai-suggested`
- `human-reviewed`
- `editor-approved`
- `deprecated`

### `status`

Definition: Lifecycle state of the registry record.

Why it exists:

- supports maintenance, deprecation, and rollout

Recommended values:

- `draft`
- `active`
- `deprecated`

### `generated_by`

Definition: The tool, workflow, or model that created the current draft metadata.

Why it exists:

- useful for auditability
- useful for improving the automation pipeline

### `reviewed_by`

Definition: The person or process that reviewed the record.

Why it exists:

- needed for trust and accountability

### `version`

Definition: The record version for this icon metadata entry.

Why it exists:

- supports evolution and change tracking

### `registry_url`

Definition: The canonical URL of the live registry entry.

Why it exists:

- supports future self-describing exports
- enables public verification and sync

---

## Minimum Viable Coverage Rules

## Required for every icon in v1 minimum coverage

- `icon_id`
- `source_library`
- `source_name`
- `style`
- `asset_kind`
- `label`
- `depicts`
- `purpose`
- `category`
- `semantic_tags`
- `use_when`
- `avoid_when`
- `evidence_sources`
- `confidence_score`
- `review_state`
- `status`
- `version`

## Optional for enriched coverage

- `visual_motifs`
- `visual_ambiguity`
- `visual_confusion_notes`
- `synonyms`
- `state`
- `intent`
- `domain`
- `pairs_with`
- `anti_pairs`
- `recommended_context`
- `confidence_notes`
- `a11y_*`
- `supports_motion`
- `motion_family`
- `interactive_capabilities`
- `programmable_props`
- `evidence_summary`
- `generated_by`
- `reviewed_by`
- `registry_url`

---

## Controlled Vocabularies

Wherever possible, these fields should use controlled vocabularies:

- `category`
- `intent`
- `domain`
- `state`
- `motion_family`
- `review_state`
- `status`

Why this matters:

- freeform fields become noisy quickly
- controlled vocabularies create consistency across search, UI, MCP, and docs
- they let us scale automation without uncontrolled drift

Rule:

- the SI Registry spec owns the allowed values
- records may only introduce new controlled values through explicit review

---

## How We Decide Purpose

### Who decides?

SI decides.

More precisely:

- source libraries provide raw material
- automation proposes
- visual inspection reviews depiction
- telemetry improves retrieval confidence
- SI editorial logic publishes the recommendation

### What is enough evidence?

No single signal is enough on its own.

#### Name and id

Good for:

- first-pass inference
- lexical retrieval
- provenance

Not enough for:

- final recommended purpose
- `avoid_when`
- ambiguity assessment

#### Synonyms and search hits

Good for:

- proving retrieval relevance
- identifying user language
- ranking improvements

Not enough for:

- final semantic truth

#### Visual inspection

Good for:

- understanding depiction
- finding ambiguity
- catching misleading names

Not enough for:

- final UI recommendation without context

#### Editorial recommendation

Needed for:

- final `purpose`
- final `use_when`
- final `avoid_when`

This is why the framework carries evidence and confidence instead of pretending certainty.

---

## Recommended Tagging Workflow

1. Ingest source identity.
2. Generate lexical semantic suggestions from names, ids, and aliases.
3. Run visual inspection to describe depiction and ambiguity.
4. Merge contextual hints from pack membership, telemetry, and sibling icons.
5. Produce a draft SI recommendation.
6. Assign confidence.
7. Route low-confidence or high-value records to review.
8. Publish a registry record.

---

## Example Record

```json
{
  "icon_id": "si:agent-planning",
  "source_library": "supericons-premium",
  "source_name": "agent-planning",
  "style": "animated",
  "asset_kind": "animated-svg",
  "collection_id": "premium.ai-agentic",
  "is_premium": true,

  "depicts": "robot head with a focused planning motif",
  "visual_motifs": ["robot", "spark", "focus"],
  "visual_ambiguity": "medium",
  "visual_confusion_notes": "Could be read as generic AI without nearby text.",

  "label": "Agent Planning",
  "purpose": "Show that an AI agent is currently planning its next step.",
  "category": "agent-lifecycle",
  "semantic_tags": ["planning", "reasoning", "deliberation", "pre-execution"],
  "synonyms": ["thinking agent", "agent reasoning", "planning state"],
  "state": "planning",
  "intent": "inform",
  "domain": "ai-agents",

  "use_when": "Use when the system is reasoning before taking action.",
  "avoid_when": "Do not use for generic AI branding, settings, or completed work.",
  "pairs_with": ["confidence-badge", "progress-ring"],
  "anti_pairs": ["success-check"],
  "recommended_context": ["agent dashboards", "activity timeline", "status chip"],
  "confidence_notes": "Best when paired with nearby text in high-stakes workflows.",

  "a11y_role": "status",
  "a11y_label": "Agent is planning",
  "aria_live": "polite",
  "decorative_default": false,

  "supports_motion": true,
  "motion_family": "pulse",
  "interactive_capabilities": ["hover", "state-transition"],
  "programmable_props": ["confidenceLevel"],

  "evidence_sources": ["source-name", "visual-inspection", "premium-pack-manifest", "editorial-review"],
  "evidence_summary": "Name, pack context, and visual reading all support a planning-state recommendation.",
  "confidence_score": 0.89,
  "confidence_band": "high",
  "review_state": "editor-approved",
  "status": "active",
  "generated_by": "si-bulk-tagger-v1",
  "reviewed_by": "curlymolelabs-editorial",
  "version": "1.0.0",
  "registry_url": "https://supericons.dev/registry/icons/si:agent-planning"
}
```

---

## Projections

The canonical registry record should drive:

- public icon indexes
- MCP tool responses
- hosted search manifest rows
- hosted search feature inputs
- SVG passport embedding
- compact `si://` transport
- browse chips and future semantic filters
- docs explanations and usage notes

The record should not be duplicated manually across these surfaces.

Projection compatibility rule:

- if two surfaces refer to the same icon, they must resolve to the same `icon_id`
- projection-specific payload shapes are allowed, but the registry ID rule is not

---

## Final Recommendation

Adopt SI Semantic Metadata v1 as the permanent semantic contract for Supericons.

The most important product decision in this spec is not the tag list. It is the truth model:

- source identity is not the same thing as semantic purpose
- visual depiction is not the same thing as editorial recommendation
- search success is evidence, not ground truth
- confidence and review state are first-class fields, not afterthoughts

That gives SI a framework strong enough to scale across aggregated icons, premium packs, native Supericons assets, search, MCP, and future motion systems without pretending certainty where certainty does not exist.
