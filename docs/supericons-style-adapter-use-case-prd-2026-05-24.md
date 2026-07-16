# Supericons Style Adapter Use-Case Test PRD

## Summary

This PRD defines a practical test for Supericons: can an AI agent use Supericons to satisfy a normal product design brief such as "build a shadcn-style web app with minimalist glassmorphism"?

The test should show Supericons as a useful visual meaning layer, not as an abstract schema. The user-facing promise is simple: Supericons helps builders choose the right icon meaning, adapt it to the requested visual style, and render it with accessibility and motion rules already considered.

## Problem

Icon libraries usually provide image files. They do not reliably tell an AI agent:

- which icon meaning fits the interface state
- when not to use a similar-looking icon
- how the icon should adapt to a product style
- how motion should communicate meaning
- what accessibility label and reduced-motion behavior are needed

This creates a practical problem for AI-assisted UI building. A user may ask for a polished app with a specific design direction, but the agent may still choose generic spinners, sparkles, robot faces, or mismatched icons.

## Target User

Primary users:

- Developers building AI apps, SaaS tools, dashboards, and internal tools.
- Designers creating stateful icon systems for product interfaces.
- AI coding agents that need structured guidance for icon selection and rendering.

Secondary users:

- Accessibility reviewers.
- Design system maintainers.
- Indie builders who want polished UI faster.

## Core Use Case

A user asks:

```txt
Build a minimalist glassmorphism AI dashboard using shadcn and Supericons.
Show the agent status clearly while it thinks, works, waits for approval, and completes.
```

Supericons should help the agent:

1. Identify the needed interface states.
2. Select icons by meaning, not by filename alone.
3. Apply a style adapter that matches minimalist glassmorphism.
4. Render icons that remain readable at common UI sizes.
5. Provide accessibility labels and reduced-motion guidance.
6. Explain why each icon was selected.

## Product Goal

Build a standalone demo artifact that proves the workflow:

```txt
user brief -> Supericons interpretation -> meaning match -> style adapter -> rendered icon -> validation -> implementation snippet
```

The demo should make the value obvious in less than 30 seconds.

## Non-Goals

- Do not build a full icon marketplace.
- Do not build the complete 12-icon Genesis set.
- Do not build a production React package yet.
- Do not depend on external libraries.
- Do not claim the system can perfectly generate production icons without review.
- Do not make the schema larger than needed for this use-case test.

## Proposed Test Artifact

Create a standalone artifact:

```txt
output/supericons-use-case-shadcn-glass-agent-status/
```

The artifact should include:

- `demo.html`
- `styles.css`
- icon SVG files
- Supericon profile JSON files
- style adapter JSON files
- `README.md`

The demo should use embedded or local files only.

## Initial Icon Scope

Start with three Supericons:

- `ai-thinking`
- `ai-working`
- `pending-approval`

These three are intentionally close in meaning. The test is useful only if the demo makes their differences clear.

Optional later expansion:

- `success`
- `blocked`
- `error`
- `risk-high`

## Required Demo Sections

### 1. User Brief

Show the original prompt in plain language:

```txt
Build a minimalist glassmorphism AI dashboard using shadcn and Supericons.
```

### 2. Supericons Interpretation

Show how Supericons interprets the brief:

- UI style: shadcn-inspired
- visual direction: minimalist glassmorphism
- mode: dark, sleek, calm
- icon style: minimal glass
- motion: subtle and meaningful
- default icon size: 24px

### 3. Meaning Match

Map app states to Supericons:

| App State | Supericon | Why |
| --- | --- | --- |
| Agent is planning | `ai-thinking` | The agent is reasoning before acting. |
| Agent is executing | `ai-working` | The agent is actively doing work. |
| Human decision needed | `pending-approval` | Progress is paused until a person decides. |

### 4. Style Adapter

Show a `minimal-glass` adapter that explains how the selected icons should look:

- one accent color
- dark translucent surface
- simple geometry
- subtle glow
- low visual noise
- calm motion
- no busy gradients
- no robot faces or generic sparkles

### 5. Rendered Product Mockup

Show a realistic glassmorphism dashboard panel:

- agent run title
- current status
- active Supericon
- short status explanation
- timeline of state changes

The mockup should feel like something a builder could immediately reuse.

### 6. Before And After

Before:

- every state uses a generic spinner or vague icon

After:

- each state has a distinct Supericon with meaning and usage rules

### 7. Implementation Snippet

Show simple implementation examples:

```jsx
<SuperIcon name="ai-thinking" adapter="minimal-glass" size={24} motion="active" />
```

```html
<super-icon name="ai-thinking" adapter="minimal-glass" size="24" motion="active"></super-icon>
```

These snippets are illustrative for the test. They do not need to be backed by a production package yet.

### 8. Validation Checklist

Show whether the output passes:

- meaning is correct
- style matches the brief
- icon is readable at 24px
- icon avoids known wrong metaphors
- motion communicates state
- reduced motion preserves meaning
- accessibility label is present

## Profile Structure For The Test

Each Supericon profile should include only fields needed by the use case:

```json
{
  "id": "ai-thinking",
  "name": "AI Thinking",
  "meaning": "An AI agent is reasoning, planning, or deciding its next step.",
  "use_when": "Use when an AI agent is deliberating before acting or answering.",
  "avoid_when": "Do not use for generic loading, active execution, approval waits, or errors.",
  "not_instead_of": ["loading-ring", "ai-working", "pending-approval"],
  "visual_invariants": {
    "must_include": ["compact dot field", "calm center", "subtle thought motion"],
    "must_avoid": ["robot face", "brain", "generic spinner"]
  },
  "accessibility": {
    "role": "status",
    "label": "AI thinking",
    "live": "polite"
  },
  "files": {
    "svg": "icons/ai-thinking.svg",
    "reduced_motion_svg": "icons/ai-thinking-reduced.svg"
  }
}
```

## Style Adapter Structure For The Test

The adapter should be separate from the icon profile:

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
  "avoid": ["many colors", "heavy gradients", "busy effects", "thick outlines"]
}
```

## Success Metrics

The test succeeds if:

- A viewer understands the Supericons value within 30 seconds.
- The three icon meanings are clearly different.
- The minimal-glass style feels consistent across all icons.
- The demo shows how an agent can move from a user brief to a rendered icon.
- The profiles remain small enough to maintain.
- The demo makes Supericons feel useful for real app building, not just documentation.

## Risks

- The demo may look like a design concept instead of a practical tool.
- The style adapter may become too vague to guide actual rendering.
- Glassmorphism can reduce legibility if blur and glow are overused.
- Similar agent states may still feel visually too close.
- The schema could grow too large if every visual preference becomes a field.

## Open Questions

- Should the first implementation visually mimic shadcn conventions closely, or simply be compatible with a shadcn-style app?
- Should style adapters output finished SVG variants, CSS variables, or both?
- Should the demo include only one active state at a time, or a full multi-step state timeline?
- Should generated icons be allowed in the first test, or should all assets be curated manually?

## Recommendation

Build the first test as a curated standalone demo with three icons and one style adapter. Avoid live generation in this phase. The goal is to prove the workflow and visual clarity first:

```txt
brief -> meaning -> adapter -> render -> validate
```

Once this works, Supericons can add more adapters, more use-case kits, and eventually agent-facing tools that compose or generate icons from profiles.
