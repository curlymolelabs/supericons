# Supericons Thematic Set System Blueprint

## Executive Summary

Supericons should evolve from an icon search product into a human-and-agent system for creating, adapting, previewing, exporting, and using themed icon sets.

The core positioning:

> Supericons is the visual meaning layer for agent-assisted software.

The practical product:

> A system that helps humans and AI agents create better themed icon sets faster, with meaning, style, motion, accessibility, and implementation guidance built in.

This blueprint defines the structure, workflows, data formats, browser experience, MCP experience, free-to-paid model, and implementation roadmap for that system.

## Why This Matters

AI coding agents are becoming better at building apps, but visual decisions are still weak. Agents often choose icons by filename, vague similarity, or generic UI convention. This produces:

- spinners for too many states
- generic sparkles for AI
- unclear agent workflow states
- inconsistent icon style across the same app
- missing accessibility labels
- motion that looks decorative instead of meaningful

Supericons can solve this by giving agents and humans a structured system:

```txt
user brief -> theme set -> icon meaning -> visual style -> state behavior -> exportable implementation
```

The opportunity is not merely to sell more icons. The opportunity is to make icons into reusable visual meaning systems that agents can use reliably.

## Product Thesis

The strongest Supericons product is not a generic library of individual icons.

The stronger product is:

```txt
Thematic icon sets with meaning, behavior, style adapters, accessibility, and export workflows.
```

Examples:

- AI Agent Status + Minimal Glass
- DevOps Incident States + Terminal Mono
- Dating Safety Signals + Soft Consumer
- News Trust Signals + Editorial Minimal
- Finance Risk Actions + Enterprise Flat

Each set should answer:

- What app is this for?
- What states or actions does it cover?
- What does each icon mean?
- When should each icon be used or avoided?
- How does the icon move?
- How does it adapt to common product styles?
- How does an agent use it in code?
- What is free and what requires payment?

## Product Layers

Supericons should have five layers.

### 1. Theme Set

The theme set is the product package.

It describes a practical use case, such as AI agent status, dating safety, or DevOps incident states.

The set includes:

- set id
- set name
- target app type
- target users
- included icons
- supported adapters
- free and paid contents
- examples
- license notes

### 2. Supericon Profile

The profile is the meaning contract for each icon.

It describes:

- what the icon means
- when to use it
- when not to use it
- what it is commonly confused with
- accessibility requirements
- file references

### 3. Visual DNA

Visual DNA is the design guardrail.

It tells a human or agent what must remain true about the icon across styles.

It should be short and practical, not a full design theory.

It includes:

- must include
- must avoid
- shape or silhouette notes
- size readability rules
- visual metaphor

### 4. Behavior

Behavior defines how the icon acts in an interface.

It includes:

- static state
- active state
- hover state
- reduced-motion state
- transition behavior
- motion meaning

Motion should communicate state, not decoration.

### 5. Style Adapter

The style adapter changes how the same meaning appears in a particular visual language.

Examples:

- minimal-glass
- shadcn-minimal
- dark-neon-grid
- terminal-mono
- enterprise-flat
- soft-consumer
- liquid-glass
- pixel-retro

The same icon meaning can be rendered differently by different adapters.

## Core Data Model

The data model should keep meaning, style, and behavior separate.

### Theme Set Schema

```json
{
  "id": "ai-agent-status",
  "name": "AI Agent Status",
  "version": "0.1.0",
  "summary": "State icons for AI agents that think, work, wait, fail, and recover.",
  "target_apps": ["AI dashboard", "coding agent", "automation tool", "assistant UI"],
  "target_users": ["developer", "designer", "AI coding agent"],
  "default_adapter": "minimal-glass",
  "supported_adapters": ["minimal-glass", "shadcn-minimal"],
  "free_icons": ["ai-thinking", "ai-working", "pending-approval"],
  "paid_icons": ["blocked", "retrying", "low-confidence", "risk-high", "connection-lost", "success", "error"],
  "examples": [
    "Agent run panel",
    "Approval flow",
    "Multi-agent dashboard"
  ],
  "license": {
    "free": "Free tier license terms",
    "paid": "Commercial license terms"
  }
}
```

### Supericon Profile Schema

```json
{
  "id": "pending-approval",
  "name": "Pending Approval",
  "set_id": "ai-agent-status",
  "meaning": "Progress is paused until a human reviews, approves, rejects, or changes the next step.",
  "use_when": "Use when the system needs a human decision before continuing.",
  "avoid_when": "Do not use for errors, blocked system states, generic waiting, or active work.",
  "not_instead_of": ["ai-thinking", "ai-working", "blocked"],
  "visual_dna": {
    "metaphor": "A stable decision point waiting for human input.",
    "must_include": ["clear pause or hold cue", "stable center", "decision boundary"],
    "must_avoid": ["error cross", "blocked sign", "generic spinner", "human face"]
  },
  "behavior": {
    "static": "Show stable decision mark.",
    "active": "Use a slow hold pulse to show waiting without implying failure.",
    "hover": "Slight emphasis only.",
    "reduced_motion": "Use the static decision mark with no animation.",
    "motion_meaning": "The system is waiting for a human decision."
  },
  "accessibility": {
    "role": "status",
    "label": "Pending approval",
    "live": "polite"
  },
  "files": {
    "svg": "icons/pending-approval.svg",
    "reduced_motion_svg": "icons/pending-approval-reduced.svg",
    "profile": "profiles/pending-approval.json"
  }
}
```

### Style Adapter Schema

```json
{
  "id": "minimal-glass",
  "name": "Minimal Glass",
  "intent": "Fit minimalist glassmorphism interfaces.",
  "surface": "dark translucent panel",
  "color": "single cool accent",
  "detail_level": "low",
  "motion": "subtle state-driven motion",
  "effects": ["soft glow", "low opacity", "light blur"],
  "avoid": ["many colors", "heavy gradients", "busy effects", "thick outlines"],
  "rendering_rules": {
    "size": [16, 20, 24, 32],
    "stroke": "thin or dot-based",
    "contrast": "must remain readable on dark glass surfaces",
    "animation": "allowed only when it reinforces state"
  }
}
```

### Behavior Schema

Behavior can live inside each profile for v1. If it becomes reusable, it can become a separate object later.

```json
{
  "id": "calm-pulse",
  "meaning": "Active but not urgent.",
  "states": {
    "static": "No motion.",
    "active": "Slow opacity or scale pulse.",
    "hover": "Slight emphasis.",
    "reduced_motion": "Static emphasis state."
  },
  "avoid": ["fast flashing", "large movement", "urgent shake"]
}
```

## Human Browser Product

The browser experience should become **Supericons Studio**.

It is for humans who want to create, review, customize, and export themed icon sets.

### Human Journey

```txt
1. Choose use case
2. Choose visual style
3. Choose included states
4. Preview generated set
5. Adjust color, motion, density, and shape direction
6. Review accessibility and reduced motion
7. Export SVG, React, Web Component, and JSON profiles
```

### Studio Screens

#### 1. Use Case Picker

Examples:

- AI Agent Status
- Coding Agent Workflow
- DevOps Incident States
- News Trust Signals
- Dating Safety Signals
- Finance Risk Actions

#### 2. Style Picker

Examples:

- Minimal Glass
- Shadcn Minimal
- Dark Neon Grid
- Terminal Mono
- Enterprise Flat
- Soft Consumer

#### 3. Set Builder

The user chooses states or actions.

Examples for AI Agent Status:

- thinking
- working
- pending approval
- blocked
- retrying
- low confidence
- risk high
- connection lost
- success
- error

#### 4. Live Preview

Show:

- grid preview
- real app mockup
- before/after comparison
- state timeline
- motion preview
- reduced-motion preview

#### 5. Profile Inspector

For each icon, show:

- meaning
- use when
- avoid when
- not instead of
- visual DNA
- behavior
- accessibility

#### 6. Export Panel

Export:

- SVG
- animated SVG
- reduced-motion SVG
- React snippet
- Web Component snippet
- JSON profile
- full set package

## Agent And MCP Product

The MCP experience is for agents.

The agent should not need to browse visually. It should call tools that return structured decisions and assets.

### Agent Journey

```txt
1. User asks agent to build an app
2. Agent extracts icon needs from the UI brief
3. Agent calls Supericons MCP
4. Supericons recommends a theme set and icons
5. Agent asks for profiles, adapters, snippets, or assets
6. Agent inserts icons into the app
7. Agent validates meaning, style, and accessibility
```

### Proposed MCP Tools

#### list_theme_sets

Returns available theme sets.

Use when an agent needs to discover what Supericons can provide.

#### get_theme_set

Returns one theme set with free and paid icon availability.

#### recommend_theme_set

Input:

```json
{
  "app_type": "AI dashboard",
  "style": "minimalist glassmorphism",
  "states": ["thinking", "working", "approval"]
}
```

Output:

```json
{
  "recommended_set": "ai-agent-status",
  "recommended_adapter": "minimal-glass",
  "free_icons": ["ai-thinking", "ai-working", "pending-approval"],
  "premium_icons": ["blocked", "retrying", "low-confidence"]
}
```

#### get_supericon_profile

Returns the profile for a specific icon.

#### list_style_adapters

Returns available adapters and their intended use.

#### compose_supericon

Combines an icon profile and style adapter into a suggested asset/snippet.

#### compose_supericon_set

Builds a full themed set response for a user brief.

#### validate_supericon_usage

Checks whether the selected icon fits the intended app state.

Example:

```json
{
  "icon": "ai-thinking",
  "intended_state": "agent is editing files"
}
```

Expected response:

```json
{
  "valid": false,
  "reason": "ai-thinking is for planning before action. Use ai-working for active execution."
}
```

## Codex Skill Or Plugin

Supericons can also be packaged as a Codex workflow.

The skill tells Codex how to use Supericons while building UI:

```txt
1. Read the user brief.
2. Extract icon slots and app states.
3. Ask Supericons MCP for theme set recommendations.
4. Select icons by meaning.
5. Apply style adapter.
6. Insert SVG or component snippets.
7. Check accessibility labels and reduced-motion fallbacks.
8. Explain the icon decisions briefly.
```

This gives users a free practical path:

```txt
Install Supericons MCP -> add Supericons Codex skill -> ask Codex to build UI with Supericons
```

## Free And Paid Model

The free product should create a fast aha moment.

The paid product should save serious production time.

### Free Tier

Free includes:

- semantic search for free icon libraries
- a small number of theme sets
- 3 to 5 free icons per set
- basic profiles
- 1 to 2 style adapters
- basic SVG export
- MCP recommendations
- Codex skill/plugin workflow

Free goal:

> Let users experience how Supericons helps agents choose better icons.

### Paid Tier

Paid includes:

- full themed icon sets
- advanced state variants
- animated SVGs
- reduced-motion variants
- React and Web Component exports
- premium style adapters
- brand customization
- private team sets
- hosted validation
- Motion Lab exports
- Converter workflows
- batch generation
- complete app icon system generation

Paid goal:

> Help users ship production-ready icon systems faster.

## First Theme Sets To Build

Build 10 to 20 theme sets, but start with the most practical and agent-relevant.

### Highest Priority Sets

1. AI Agent Status
2. Coding Agent Workflow
3. DevOps Incident States
4. SaaS Approval Workflow
5. Finance Risk Actions
6. News Trust Signals
7. Dating Safety Signals
8. Cybersecurity Alert States
9. Creator Publishing States
10. Healthcare Review States

### Additional Sets

11. Marketplace Order States
12. Education Learning Progress
13. Data Pipeline States
14. Customer Support Ticket States
15. Project Management Workflow
16. Onboarding And Verification
17. Cloud Infrastructure Health
18. Privacy And Permission States
19. Notification Priority Signals
20. Collaboration Presence States

## First Style Adapters To Build

Start with styles that users already ask agents to produce.

1. Minimal Glass
2. Shadcn Minimal
3. Dark Neon Grid
4. Terminal Mono
5. Enterprise Flat
6. Soft Consumer
7. Liquid Glass
8. Pixel Retro
9. Editorial Minimal
10. Premium Black

## First Vertical Slice

The first real product slice should be:

```txt
AI Agent Status + Minimal Glass
```

Free:

- ai-thinking
- ai-working
- pending-approval

Paid preview:

- blocked
- retrying
- low-confidence
- risk-high
- connection-lost
- success
- error

Browser:

- visual preview
- app mockup
- style adapter switch
- profile inspector
- export preview

MCP:

- recommend theme set
- get profile
- compose snippet
- validate usage

## Implementation Roadmap

### Phase 1: Format And Seed Data

Create:

```txt
data/supericons/theme-sets/
data/supericons/profiles/
data/supericons/adapters/
data/supericons/behaviors/
```

Add:

- AI Agent Status set
- 3 free profiles
- 2 adapters
- file references
- simple schema validation

### Phase 2: Browser Showcase

Add a site page:

```txt
Supericons for Agentic UI
```

Include:

- human journey
- agent journey
- demo preview
- before/after
- free set call to action
- paid full set preview
- MCP setup callout

### Phase 3: MCP Tools

Add:

- list_theme_sets
- get_theme_set
- get_supericon_profile
- list_style_adapters
- recommend_theme_set
- validate_supericon_usage

Start read-only. Do not generate files yet.

### Phase 4: Export Tools

Add:

- compose_supericon
- compose_supericon_set
- export React snippet
- export Web Component snippet
- export SVG bundle

### Phase 5: Studio Builder

Build browser tooling:

- choose set
- choose adapter
- customize color and motion
- preview in app mockups
- export package

### Phase 6: Paid Expansion

Add:

- full sets
- premium adapters
- brand adaptation
- team/private registries
- hosted validation
- batch export

## Quality Standard

Every theme set should pass these checks:

- Each icon has a clear meaning.
- Similar icons are clearly distinguished.
- Each icon has use and avoid rules.
- Each icon has an accessibility label.
- Motion communicates state.
- Reduced motion preserves meaning.
- Icons are readable at 16px and 24px.
- The free subset is useful by itself.
- The paid set provides obvious additional value.
- The MCP response is useful without visual browsing.

## Success Criteria

This direction is successful when:

- users can understand a theme set in under one minute
- agents can choose the correct icon for a described UI state
- developers can paste snippets into real UI
- designers can review meaning and visual DNA
- paid sets feel like a production accelerator, not a locked basic feature

## Strategic Moat

The moat is not the raw SVG.

The moat is:

- themed icon systems
- meaning profiles
- style adapters
- state behavior
- accessibility defaults
- MCP access
- agent workflows
- browser studio
- practical productized examples

Raw icons are easy to generate. Useful icon systems are harder.

## Recommended Next Action

Finalize the data format for:

- theme set
- profile
- adapter
- behavior

Then implement the first real slice:

```txt
AI Agent Status + Minimal Glass + Shadcn Minimal
```

Ship it in three places:

1. Browser showcase for humans.
2. MCP tools for agents.
3. Codex skill/plugin workflow for agentic builders.

This makes Supericons useful as both a product and an agent capability.
