# Supericons Agentic Icon Library Standard

Date: 2026-06-16

## Core Position

Supericons should not become just a folder of SVG files.

Supericons should become a standard way to describe, use, search, adapt, and trust icons in AI-native products.

Short version:

```text
Supericons = the icon library for agentic software.
```

This means Supericons should cover more than normal static icon libraries:

- Brand marks
- AI app logos
- Product marks
- Agent states
- Smart loaders
- Tool identities
- Capabilities
- Workflows
- Animated icons
- Stateful icons
- Future protocol-aware agentic UI icons

## Core Question

When a developer or agent asks for an icon, what should Supericons understand that normal icon libraries do not?

Supericons should understand:

- Intent
- Context
- State
- Brand relevance
- Source trust
- Visual style
- Implementation target
- Monetization tier

## Supericon Unit

A Supericon is not just one SVG file.

The working unit should be:

```text
Supericon = asset + metadata + variants + usage rules + quality status
```

The SVG is the body. The profile is the brain.

Example:

```text
example-icon/
  mono.svg
  color.svg
  profile.json
  preview-white.png
  preview-dark.png
```

## Icon Types

Not every asset should be forced into the same structure or review rule.

Initial asset types:

- `brand-logo`
- `product-mark`
- `wordmark`
- `generic-icon`
- `agent-state-icon`
- `smart-loader`
- `workflow-icon`
- `animated-icon`
- `system-symbol`

This matters because a brand logo, a workflow icon, and an agent-state icon have different obligations.

A brand logo should preserve identity.

An agent-state icon should make state, confidence, and action legible.

A smart loader can carry motion, meaning, and premium value.

## First Product Wedge

Publicly, the first useful product can be:

```text
Supericons Agentic AI Tools Pack
```

Internally, it should act as:

```text
Supericon Profile v0.1 testbed
```

This gives Supericons a practical library now, while preparing the structure for a larger agentic icon standard later.

## Current Batch Application

The current batch is:

```text
agentic-ai-tools-logos-001
```

This batch contains around 50 AI-related app, tool, infrastructure, model, and platform logo assets that are missing, outdated, or not sufficiently covered by existing icon libraries.

For this batch, the goal is not to make every logo look identical. The goal is to make every asset:

- Clean
- Searchable
- Reviewable
- Usable in product UI
- Trustworthy enough for human and agent use
- Ready for future standardization into the main Supericons library

This batch should begin as a draft library pack. Production registry promotion should happen only after the draft format and quality gates are stable.

Recommended draft output:

```text
output/supericons-library-drafts/agentic-ai-tools-logos-001/
  {slug}/
    mono.svg
    color.svg
    profile.json
    preview-white.png
    preview-dark.png
    preview-transparent.png
    README.md
```

Only include `color.svg` when it adds real value or preserves important brand meaning.

## Required Profile Fields

Each draft Supericon should have a profile with these practical fields:

- `schema_version`
- `id`
- `library`
- `pack`
- `name`
- `slug`
- `asset_type`
- `asset_role`
- `status`
- `review_status`
- `access_tier`
- `premium_candidate`
- `category`
- `aliases`
- `search_terms`
- `variants`
- `source`
- `geometry`
- `usage`
- `quality`
- `rights`
- `created`
- `updated`

Future agentic icons can add:

- `agent_state`
- `motion_meaning`
- `confidence_signal`
- `interaction_state`
- `protocol_mapping`

Do not add those fields prematurely to ordinary static brand-logo entries unless they have a clear use.

## Variant Rules

Default v0.1 variants:

- `mono.svg`: preferred default when possible
- `color.svg`: optional brand-color variant
- `preview-white.png`: required for visual review
- `preview-dark.png`: required for visual review
- `preview-transparent.png`: useful when the asset has transparency or currentColor behavior

Future variants:

- `animated.svg`
- `react.tsx`
- `figma.json`
- `motion.css`

## Quality Rules

Every draft Supericon should pass or explicitly document these checks:

- Recognizable at normal icon size
- Visible on white background
- Visible on dark background
- No accidental background tile
- No hidden white-on-white output
- No unwanted wordmark when the asset is meant to be a symbol
- No squeezed wordmark when the asset is meant to remain wide
- Reasonable viewBox
- Reasonable path count
- Source is recorded
- Review status is clear

Suggested status values:

- `draft`
- `needs_review`
- `approved`
- `rejected`
- `deprecated`
- `replaced`

## Source Trust

Source trust should be part of the product, not an afterthought.

Preferred source order:

1. Official brand, media, press, or asset page
2. Official homepage inline SVG or structured metadata
3. Official app icon, manifest icon, or repository asset
4. Official social profile image
5. User-approved screenshot fallback
6. Reviewed secondary logo source

Screenshot-derived sources can be used when they are the cleanest available compact mark, but they should remain `needs_review` until approved.

## Distribution Direction

Supericons should not only offer downloads.

It should eventually support:

- Copy SVG
- Copy React component
- Install icon pack
- Search via MCP
- Browse by theme
- Browse by agent state
- Export for Figma
- Export for shadcn-style apps

The strategic principle:

```text
Make Supericons easy for humans, and unusually easy for AI agents.
```

## Premium Direction

Premium should not mean randomly locking nice icons.

Free candidates:

- Common mono logos
- Basic static icons
- Common UI states

Premium candidates:

- Curated AI tool packs
- Animated smart loaders
- Agent state systems
- Style-matched icon families
- Figma-ready packs
- React components
- Commercial-ready bundles

The strongest premium product is not a single logo. It is a complete agentic UI visual system.

## Three-Layer Strategy

1. Supericons Library

Clean static icons and logos.

2. Supericon Profile

Metadata standard that makes each icon searchable, contextual, reviewable, and AI-readable.

3. Supericons Agentic Layer

Stateful, animated, and protocol-aware icons for AI products.

## Boundary

Do not overbuild protocol integration yet.

Design for AG-UI-style and agentic UI systems, but do not make the first pack depend on them.

First, build a useful Supericons Agentic AI Tools Pack.

Then, use that pack as the first real-world testbed for Supericon Profile v0.1.

