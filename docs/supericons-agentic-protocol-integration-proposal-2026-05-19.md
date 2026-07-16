# Supericons Agentic Protocol Integration Proposal

Date: 2026-05-19

## Summary

Supericons should complement the emerging agentic software stack instead of trying to replace it.

The clean positioning is:

```text
MCP = agents ask tools and data sources for help
A2A = agents coordinate with other agents
AG-UI = agents connect to user-facing app interfaces
Supericons = agents choose and render the right visual meaning
```

Supericons can become the visual meaning layer for agentic software: the place an agent, developer, or interface calls when it needs the right icon, motion, accessibility label, usage guidance, and visual state.

## Core Idea

Agentic apps need more than chat messages. They need visible status, progress, uncertainty, risk, approval, failure, recovery, and handoff signals.

AG-UI can help render agent-driven interfaces.
MCP can let agents call tools.
A2A can let agents communicate with each other.

Supericons can provide the missing visual judgment:

```text
What visual signal should represent this state?
What should it mean?
How should it move?
What should the accessible label say?
When is this icon wrong?
What should be used instead?
```

This keeps Supericons focused. It does not become another agent framework. It becomes the visual semantics layer those frameworks need.

## Recommended Stack

```text
Agent needs to show meaning to a human
        |
        v
MCP calls Supericons for the right visual signal
        |
        v
Supericons returns icon, profile, motion, ARIA, usage, alternatives
        |
        v
AG-UI renders it inside the application experience
        |
        v
A2A later lets other agents delegate visual judgment to Supericons
```

## Build Order

### 1. Build State Kit v1 First

State Kit v1 is the foundation. It should prove the product before Supericons tries to become a protocol or platform.

Create:

```text
premium/state-kit-v1/
  profiles/index.json
  icons/
  react/
  web-components/
  demo/
  generated/
```

Each icon should include:

```json
{
  "id": "pending-approval",
  "semantic": {
    "state": "waiting_for_human",
    "risk_level": "medium",
    "confidence": "high"
  },
  "accessibility": {
    "role": "status",
    "aria_label": "Waiting for approval",
    "aria_live": "polite"
  },
  "motion": {
    "type": "breathe",
    "communicates": "the system is paused until a human acts"
  },
  "guidance": {
    "use_when": [
      "A human must approve before work continues"
    ],
    "avoid_when": [
      "Use loading-ring when the system is still working by itself"
    ]
  }
}
```

The first version should start with a smaller proof set before expanding to the full 50 icons.

Recommended lighthouse set:

```text
loading-ring
success
error
warning
blocked
pending-approval
retrying
ai-thinking
ai-working
ai-low-confidence
risk-high
connection-lost
```

These 12 icons are enough to prove the Supericons thesis: icons are not only images; they are meaningful visual states.

### 2. Add One MCP Tool

Start with one reliable tool:

```text
search_state_icons
```

Input:

```json
{
  "query": "high risk payment waiting for human approval",
  "context": "fintech approval flow",
  "format": "react"
}
```

Output:

```json
{
  "icon_id": "pending-approval",
  "aria_label": "Waiting for approval",
  "usage_snippet": "<PendingApproval label=\"Waiting for approval\" />",
  "match_reason": "Human approval is required; loading-ring would incorrectly imply the system is still working.",
  "profile": {},
  "alternatives": [
    {
      "icon_id": "risk-high",
      "reason": "Use when the main message is danger or review risk, not waiting."
    }
  ]
}
```

This is the most important bridge. It lets agents use Supericons before any AG-UI or A2A work exists.

Rules for the MCP tool:

- Search only real State Kit profiles.
- Never invent icon IDs.
- Always return a reason.
- Always include accessibility guidance.
- Return conservative alternatives.
- Prefer deterministic results over creative variation.

### 3. Build Renderers

Ship each icon in three ways:

```text
Raw SVG
React component
Web Component
```

React example:

```tsx
<Supericon name="pending-approval" label="Waiting for approval" />
```

Web Component example:

```html
<si-icon name="pending-approval" label="Waiting for approval"></si-icon>
```

This lets Supericons work in normal apps, AG-UI apps, and agent-generated UI.

### 4. Build An AG-UI Demo

Create one showcase app or demo flow:

```text
Agent handles payment review flow
Agent calls Supericons through MCP
Supericons returns the visual signal
AG-UI-style frontend renders status cards
User sees clear state, risk, and next action
```

The demo should show:

```text
AI thinking
payment processing
human approval needed
high risk
success
failure and retrying
```

The demo message:

```text
AG-UI handles the agent interface.
Supericons gives the agent visual judgment.
```

This should become a marketing video and developer example.

### 5. Add A2A Later

Do not start with A2A. It is a powerful future layer, but not the first product.

Later, Supericons can become a specialist agent:

```text
Supericons Visual Judgment Agent
```

Other agents can ask:

```text
Review this workflow and choose the right visual states.
```

The Supericons agent returns:

```text
icon choices
ARIA labels
motion rules
usage reasons
alternatives
```

That is the agent-to-agent version of Supericons.

## MVP Slice

The first complete build should be:

```text
12 lighthouse icons
12 complete semantic profiles
animated SVG, static SVG, reduced-motion SVG
React renderer
Web Component renderer
search_state_icons MCP tool
one AG-UI-style demo page
verification scripts
```

This is enough to prove:

- agents can request icons by intent
- Supericons can return the right icon and reasoning
- the output can be rendered in real interfaces
- accessibility can be included by default
- motion can communicate meaning, not decoration

## What Not To Build Yet

Do not build these first:

```text
A2A agent
Forge
Studio
marketplace
full protocol
registry v2
50 icons before the first 12 are excellent
custom animation editor
multi-framework packages beyond React and Web Component
```

These are future moves. The first job is to make one small slice undeniable.

## Relationship To Existing Registry

Use the existing semantic registry as the broad discovery layer, but do not force State Kit profiles into the old shape.

Recommended model:

```text
State Kit rich profile
  -> product source of truth

Adapter
  -> maps State Kit profile into current registry-compatible summary

Existing semantic registry
  -> searchable public/MCP summary
```

This avoids a premature registry rewrite while still letting the State Kit teach the future registry what it needs to become.

## Strategic Positioning

Use:

```text
Supericons is the visual meaning layer for agentic software.
```

Developer-friendly version:

```text
Supericons helps agents choose and render the right visual signal.
```

Longer version:

```text
Supericons gives AI agents, developers, and interfaces a shared way to choose icons with meaning, motion, accessibility, and usage guidance built in.
```

## Reference Links

- AG-UI introduction: https://docs.ag-ui.com/introduction
- CopilotKit: https://www.copilotkit.ai/
- MCP introduction: https://modelcontextprotocol.io/introduction
- A2A protocol: https://a2a-protocol.org/latest/

## Final Recommendation

The path is:

```text
State Kit -> MCP -> Renderer -> AG-UI demo -> A2A agent later
```

That gives Supericons a real place in the agentic stack without trying to become the whole stack.

