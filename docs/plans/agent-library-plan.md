# Supericons Agent Library Plan

## Goal

Create an agent-facing decision layer for Supericons so AI coding agents can choose better icons and animations, not just retrieve them.

This sits above raw MCP tool access:

- MCP tools answer: what can I fetch?
- The agent library answers: what should I choose, and why?

## Why This Matters

Humans browse visually.
Agents usually do not.

Without an agent library, agents rely on:

- naming matches
- training priors
- generic UI conventions
- internet research

That often produces something usable, but not consistently tasteful, product-aware, or context-aware.

## Product Thesis

Supericons should support two interfaces:

### 1. Human interface

- visual browsing
- side-by-side comparison
- interactive customization
- animation preview

### 2. Agent interface

- semantic selection
- style-aware recommendation
- context-aware filtering
- prompt-ready output

## What To Build

### 1. Agent icon selection guide

A docs section for agents and developers that explains how to choose icons by:

- UI intent
- semantic meaning
- tone
- style
- placement context

### 2. Agent motion selection guide

A parallel guide for Motion Lab presets:

- what emotional signal each preset gives
- where it fits
- where it should not be used
- how strong or subtle it feels

### 3. Structured agent metadata layer

Machine-friendly data for icons and motion presets.

For icons, include:

- `id`
- `library`
- `label`
- `aliases`
- `semantic_tags`
- `ui_contexts`
- `tone_tags`
- `style_traits`
- `free_or_premium`
- `related_icons`
- `avoid_for`
- `best_for`

For motion presets, include:

- `preset`
- `category`
- `aliases`
- `emotional_tone`
- `interaction_type`
- `intensity_level`
- `recommended_contexts`
- `avoid_for`
- `best_for`
- `output_notes`

### 4. Prompt-ready recipes

A set of agent-facing prompt patterns such as:

- choose 3 icons for a secure login flow
- pick a subtle success animation for a settings save state
- return one conservative option and one expressive option
- suggest icons for a SaaS analytics sidebar
- recommend a motion preset for a premium but restrained CTA

### 5. MCP exposure strategy

Decide how agents should access this layer:

- docs only
- downloadable JSON or Markdown
- MCP tool output enrichment
- dedicated MCP tool such as `recommend_icons` or `describe_preset`

## Recommended Build Order

### 1. Define the schema

Lock the metadata model for icons and motion presets.

### 2. Build a small v1 dataset

Start with:

- top UI intents
- most-used icon categories
- all current Motion Lab presets

### 3. Write the human-readable agent guides

These should explain how to think, not just what fields exist.

### 4. Create prompt recipes

Make them short, reusable, and practical.

### 5. Decide whether to expose through MCP

Do this after the metadata model proves useful.

## Suggested V1 Scope

Start small and high-value.

### Icon contexts

- authentication
- navigation
- settings
- analytics
- commerce
- communication
- files and upload
- alerts and status

### Tone tags

- neutral
- friendly
- premium
- enterprise
- playful
- technical
- urgent
- calm

### Motion contexts

- hover affordance
- loading
- success confirmation
- attention cue
- onboarding
- feature highlight

## Deliverables

### 1. `docs/plans/agent-library-prd.md`

Defines the product and scope.

### 2. `docs/plans/agent-metadata-schema.md`

Defines the structured fields.

### 3. `docs/plans/agent-icon-selection-guide.md`

Explains icon decision logic.

### 4. `docs/plans/agent-motion-selection-guide.md`

Explains animation decision logic.

### 5. `docs/plans/agent-prompt-recipes.md`

Reusable prompt patterns.

### 6. Optional later

- `data/agent-icon-metadata.json`
- `data/agent-motion-metadata.json`

## Questions To Give Other Agents

Ask other agents to challenge these areas:

- what metadata is actually useful to agents
- what is too subjective to encode
- whether this should stay in docs or become a product feature
- whether recommendation should remain prompt-based or become an MCP tool
- what the smallest useful v1 is

## Recommendation

Start with a PRD and metadata schema first.

That will make the idea concrete enough for other agents to review and improve before any implementation decisions are made.
