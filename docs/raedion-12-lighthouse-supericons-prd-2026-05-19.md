# Raedion 12 Lighthouse Supericons PRD

Date: 2026-05-19

## Working Title

Raedion Signal Set: 12 Lighthouse Supericons For Agentic Software

## Positioning

Supericons is the visual meaning layer for agentic software.

The Raedion Signal Set is the first proof: 12 animated, accessible, semantic icons that help an agentic AI OS or harness show what the system, agent, or workflow is doing.

These are not generic icons. They are visual state objects. Each icon includes:

- a visible form
- a state meaning
- a motion rule
- a reduced-motion version
- an accessibility label
- use-when guidance
- avoid-when guidance
- agent-readable profile data

## Source Basis

Local references:

- `docs/research-icon-trends-2026.md`
- `docs/research-icon-trends-2026.html`
- `docs/icon-design-guidelines.md`
- `docs/icon-design-guidelines.html`
- `docs/supericons-state-kit-v1-prd.html`
- `docs/supericons-manifesto.html`
- `docs/supericons-agentic-protocol-integration-proposal-2026-05-19.md`

External visual inspiration:

- Dot Matrix loaders: https://dotmatrix.zzzzshawn.cloud/

Observed inspiration from Dot Matrix:

- dot-grid loading language
- neon motion
- orbiting particles
- scanning sweeps
- pulse ladders
- rings, rails, arcs, glyph clusters, and matrix-like rhythm

Supericons should not copy these loaders. The inspiration is the kinetic language: compact geometry, rhythmic dots, neon traces, and dark-mode drama. Supericons must add meaning, state, usage guidance, accessibility, and agent-safe selection.

## Problem

Agentic software needs to show new states that old icon libraries do not clearly define:

- an AI is thinking
- an AI is actively working
- an AI is uncertain
- a workflow is blocked
- human approval is required
- a risky action needs attention
- a task is retrying
- a connection or dependency failed

Today, developers often use generic spinners, warning triangles, robot icons, or random AI sparkles. These are visually familiar but semantically weak. They do not explain what is happening, when the icon is correct, what accessible text should say, or what icon should be used instead.

Raedion needs a visual state language that feels premium, dark-native, technical, and alive.

## Target Users

Primary users:

- AI coding agents choosing UI elements
- developers building Raedion and other agentic systems
- developers building AI-native products, dashboards, and harnesses

Secondary users:

- product designers creating agentic UI patterns
- design system maintainers
- no-code and AI app builders
- teams building workflow automation, approval flows, monitoring, and AI operations dashboards

End beneficiaries:

- users who need to understand what an agent or system is doing without reading a paragraph
- users who rely on screen readers or reduced-motion settings

## Who Would Pay

Likely buyers:

- indie AI product builders
- SaaS teams building agent dashboards
- developer tool startups
- AI automation platforms
- no-code AI app builders
- teams building approval, monitoring, workflow, or AI operations products

They do not pay for 12 icons alone. They pay for a ready-made visual state language:

- polished animated SVGs
- React/Web Component delivery
- semantic profiles
- accessibility defaults
- MCP-ready metadata
- usage guidance
- dark-mode product quality

## Product Goal

Design and build 12 lighthouse Supericons that prove this thesis:

An icon can be more than a picture. It can be a reusable visual meaning object for agentic software.

The 12 icons should be good enough to:

- use inside Raedion immediately
- show as a marketing demo for Supericons
- become the seed of State Kit v1
- power the first `search_state_icons` MCP demo
- convince developers that Supericons is not just another icon pack

## The 12 Lighthouse Icons

| ID | Human Name | Core Meaning |
| --- | --- | --- |
| `loading-ring` | Loading Ring | System is working and completion time is unknown |
| `success` | Success | Task completed correctly |
| `error` | Error | Task failed and needs attention |
| `warning` | Warning | There is a recoverable issue or caution |
| `blocked` | Blocked | Work cannot continue in the current state |
| `pending-approval` | Pending Approval | A human decision is required |
| `retrying` | Retrying | System failed or stalled and is trying again |
| `ai-thinking` | AI Thinking | AI is generating or reasoning |
| `ai-working` | AI Working | Agent is actively executing steps |
| `ai-low-confidence` | AI Low Confidence | AI output or action is uncertain |
| `risk-high` | High Risk | Action is dangerous, sensitive, or needs review |
| `connection-lost` | Connection Lost | Network, tool, service, or dependency is unavailable |

## Why These 12

These 12 cover the minimum useful state language for an agentic OS:

- progress
- completion
- failure
- caution
- blocked execution
- human handoff
- recovery
- AI reasoning
- AI execution
- AI uncertainty
- risk
- dependency failure

Together they let Raedion show the lifecycle of an agentic task from request to completion:

```text
ai-thinking -> ai-working -> loading-ring -> pending-approval -> risk-high -> success
```

Or the failure path:

```text
ai-working -> connection-lost -> retrying -> error
```

## Visual Direction

### Theme

Raedion default theme is dark, sleek, and black. The icons should feel like they belong inside an agentic AI OS/harness:

- black glass
- luminous vector lines
- subtle dot matrix fields
- neon but restrained
- technical, not playful
- premium, not cartoonish
- readable at 24px
- impressive at 32px and 48px

### Style Name

Suggested style name:

```text
Raedion Matrix Signal
```

### Visual Ingredients

Use a hybrid of:

- clean outline geometry
- duotone accents
- dot-matrix particles
- scanning traces
- orbital nodes
- glow halos
- state-specific motion

Avoid:

- generic sparkle AI icons
- mascot faces
- emoji-like expressions
- noisy 3D
- heavy gradients that blur at small sizes
- motion that is beautiful but meaningless

## Design System Rules

### Canvas

Primary design canvas:

```text
32 x 32
```

Functional export canvas:

```text
24 x 24
```

Reason:

- 32px gives room for impressive Raedion OS visuals.
- 24px keeps compatibility with app UI, menus, tables, and status rows.
- The same concept must simplify down cleanly.

### Live Area

```text
24px export: use 20 x 20 live area with 2px padding
32px source: use 26 x 26 live area with 3px padding
```

### Stroke

```text
24px: 1.75px to 2px
32px: 2px to 2.25px
```

Use round caps for motion traces. Use slightly sharper corners only for technical or risk states.

### Color Tokens

Default dark background:

```text
raedion-bg: #05070A
raedion-panel: #0B0F14
raedion-line: #D6E3F5
raedion-muted: #6B7280
```

Signal colors:

```text
cyan: #22D3EE
blue: #60A5FA
violet: #A78BFA
green: #34D399
amber: #FBBF24
red: #F87171
magenta: #F472B6
```

Use color as a signal, but never as the only signal. Shape and motion must also distinguish states.

### Motion Rules

Motion must communicate meaning:

- loading: continuous but calm loop
- success: draw and settle
- error: short interruption, then stillness
- warning: attention pulse, not panic
- blocked: constrained or stopped motion
- approval: waiting rhythm
- retrying: restart rhythm
- AI thinking: expanding thought field
- AI working: directed activity
- low confidence: unstable shimmer
- high risk: controlled urgent beacon
- connection lost: broken signal

Maximum default animation duration:

```text
900ms to 1800ms per loop
```

Reduced motion:

- no spinning
- no fast pulsing
- no sweeping motion
- use static form, opacity shift, or a single settled state

## Icon Design Specs

### 1. loading-ring

Purpose:

Show that the system is working and completion time is unknown.

Visual form:

- incomplete circular ring
- two small matrix dots riding the arc
- faint inner core dot
- no warning color

Motion:

- calm clockwise orbit
- dot trail fades behind the leading point
- reduced motion shows static ring with one highlighted arc

Raedion feel:

Like a reactor ring quietly tracking an active process.

Use when:

- system is processing
- user should wait
- no specific user action is required

Avoid when:

- use `pending-approval` if a human must act
- use `retrying` if the system is trying again after failure
- use `loading-bar` later if progress percentage is known

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Loading",
  "aria_live": "polite"
}
```

### 2. success

Purpose:

Show that a task completed correctly.

Visual form:

- checkmark inside a faint matrix ring
- ring resolves into four small corner dots
- green signal accent

Motion:

- checkmark draws once
- ring compresses into a stable glow
- reduced motion shows completed checkmark

Raedion feel:

Like a completed system verification.

Use when:

- task finished successfully
- approval passed
- deployment completed

Avoid when:

- use `verified` later for identity or trust verification
- use `saved` later for autosave

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Complete",
  "aria_live": "polite"
}
```

### 3. error

Purpose:

Show that a task failed and needs attention.

Visual form:

- broken ring
- sharp X or split diagonal cross
- two red fault pixels offset from the core

Motion:

- ring fractures
- X snaps in
- one short horizontal shake, then still
- reduced motion shows static broken ring and X

Raedion feel:

Like a system fault, not a cartoon error.

Use when:

- operation failed
- user needs to inspect or resolve the problem

Avoid when:

- use `warning` for recoverable caution
- use `connection-lost` for network or dependency failure
- use `retrying` if the system is already trying again

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Error",
  "aria_live": "assertive"
}
```

### 4. warning

Purpose:

Show caution without implying total failure.

Visual form:

- triangular signal frame
- center vertical mark
- small amber dot at each triangle point

Motion:

- slow amber edge pulse
- center mark fades in and out gently
- reduced motion shows filled amber center mark

Raedion feel:

Like a console warning that asks for attention but not panic.

Use when:

- something may need action
- issue is recoverable
- user should proceed carefully

Avoid when:

- use `risk-high` for dangerous or sensitive actions
- use `error` for hard failure
- use `ai-low-confidence` for model uncertainty

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Warning",
  "aria_live": "polite"
}
```

### 5. blocked

Purpose:

Show that work cannot continue in the current state.

Visual form:

- square gate or bracketed stop field
- central horizontal barrier
- motion trace stops at the barrier

Motion:

- one dot moves toward the gate and halts
- gate emits a subtle boundary pulse
- reduced motion shows stopped dot at barrier

Raedion feel:

Like an execution gate denying passage.

Use when:

- workflow is blocked
- permission or dependency prevents progress
- user must remove a blocker before continuing

Avoid when:

- use `pending-approval` if the blocker is specifically human approval
- use `connection-lost` if the blocker is network or service loss
- use `warning` if work can still continue

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Blocked",
  "aria_live": "polite"
}
```

### 6. pending-approval

Purpose:

Show that the system is waiting for a human decision.

Visual form:

- small human approval node above a paused process line
- clock-like partial ring
- amber/cyan split signal

Motion:

- slow breathing ring
- process line remains paused
- one approval dot glows at a steady interval
- reduced motion shows static paused line and approval node

Raedion feel:

Like an agent paused at a human checkpoint.

Use when:

- human approval is required
- agent cannot continue until user decides
- action is waiting in an approval queue

Avoid when:

- use `loading-ring` if the system is still working automatically
- use `risk-high` if the main message is danger
- use `blocked` if approval is not the reason work stopped

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Waiting for approval",
  "aria_live": "polite"
}
```

### 7. retrying

Purpose:

Show that the system is trying again after failure, timeout, or interruption.

Visual form:

- circular arrow made from segmented matrix dots
- small break in the loop
- blue/cyan with amber recovery accent

Motion:

- loop restarts with a visible reset point
- acceleration at the start, calm at the end
- reduced motion shows circular arrow with highlighted restart dot

Raedion feel:

Like an automated recovery cycle.

Use when:

- failed request is being retried
- connection is being reattempted
- task is attempting recovery

Avoid when:

- use `loading-ring` for normal first-time progress
- use `error` when no retry is happening
- use `connection-lost` when offline or disconnected

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Retrying",
  "aria_live": "polite"
}
```

### 8. ai-thinking

Purpose:

Show that AI is reasoning, generating, planning, or composing.

Visual form:

- central neural seed dot
- three expanding thought nodes
- faint matrix field behind it

Motion:

- dots expand outward and fade
- rhythm should feel cognitive, not busy
- reduced motion shows three settled nodes around the seed

Raedion feel:

Like a quiet inference field forming.

Use when:

- AI is generating a response
- agent is planning
- model is reasoning before action

Avoid when:

- use `ai-working` when the agent is executing tools or steps
- use `loading-ring` for non-AI system progress
- use `ai-low-confidence` if uncertainty is the main message

Accessibility:

```json
{
  "role": "status",
  "aria_label": "AI is thinking",
  "aria_live": "polite"
}
```

### 9. ai-working

Purpose:

Show that an AI agent is actively executing a task.

Visual form:

- agent core node
- orbiting tool nodes
- directional trace path
- cyan/violet signal

Motion:

- one node orbits while another advances along a path
- motion is directional, not idle
- reduced motion shows orbit nodes at three positions

Raedion feel:

Like an autonomous system executing a multi-step plan.

Use when:

- agent is calling tools
- agent is editing, searching, compiling, or acting
- multiple steps are underway

Avoid when:

- use `ai-thinking` for reasoning without execution
- use `pending-approval` if the agent is waiting for the user
- use `blocked` if the agent cannot continue

Accessibility:

```json
{
  "role": "status",
  "aria_label": "AI is working",
  "aria_live": "polite"
}
```

### 10. ai-low-confidence

Purpose:

Show that AI output or action is uncertain and should be checked.

Visual form:

- agent core with broken halo
- offset question node
- amber/violet split signal

Motion:

- halo flickers slightly out of phase
- question node shifts by one pixel then settles
- reduced motion shows broken halo and question node

Raedion feel:

Like a model confidence signal, not a generic question mark.

Use when:

- AI result may be uncertain
- agent recommendation needs review
- model confidence is low or unknown

Avoid when:

- use `warning` for non-AI caution
- use `risk-high` for dangerous action
- use `error` for confirmed failure

Accessibility:

```json
{
  "role": "status",
  "aria_label": "AI confidence is low",
  "aria_live": "polite"
}
```

### 11. risk-high

Purpose:

Show that an action is sensitive, dangerous, irreversible, or needs careful review.

Visual form:

- shield or diamond warning frame
- red core node
- outer containment ring
- tiny lock or exclamation mark as secondary cue

Motion:

- controlled red beacon pulse
- containment ring tightens once
- no frantic flashing
- reduced motion shows red core and containment ring

Raedion feel:

Like a high-stakes execution warning.

Use when:

- action can cause loss, exposure, financial impact, or irreversible change
- human review is strongly recommended
- agent is about to perform a sensitive operation

Avoid when:

- use `warning` for ordinary caution
- use `pending-approval` when the main issue is waiting for approval
- use `blocked` when action cannot proceed at all

Accessibility:

```json
{
  "role": "status",
  "aria_label": "High risk",
  "aria_live": "assertive"
}
```

### 12. connection-lost

Purpose:

Show that a network, tool, service, or dependency is unavailable.

Visual form:

- broken signal arc
- missing matrix column
- disconnected node pair

Motion:

- signal tries to bridge and fails
- one arc blinks out
- reduced motion shows broken arc and separated nodes

Raedion feel:

Like a severed link in the agent harness.

Use when:

- network connection is lost
- agent tool is unavailable
- remote service or dependency cannot be reached

Avoid when:

- use `error` for general failure
- use `retrying` if reconnect attempt is active
- use `blocked` for permission or workflow blockers

Accessibility:

```json
{
  "role": "status",
  "aria_label": "Connection lost",
  "aria_live": "assertive"
}
```

## Profile Schema Additions

For these 12, use the State Kit profile schema but add Raedion-specific display metadata:

```json
{
  "id": "ai-working",
  "name": "AI Working",
  "collection": "raedion-signal-set",
  "release_priority": "lighthouse",
  "theme_fit": ["dark", "black", "agentic-os", "developer-tool"],
  "semantic": {
    "base_object": "agent",
    "state": "working",
    "risk_level": "none",
    "confidence": "high",
    "urgency": "neutral",
    "reversible": true
  },
  "motion": {
    "type": "orbit-trace",
    "duration_ms": 1400,
    "easing": "ease-in-out",
    "communicates": "an AI agent is actively executing a multi-step task"
  },
  "accessibility": {
    "role": "status",
    "aria_label": "AI is working",
    "aria_live": "polite",
    "reduced_motion": "ai-working-reduced"
  },
  "guidance": {
    "use_when": [
      "An AI agent is executing tools or workflow steps"
    ],
    "avoid_when": [
      "Use ai-thinking when the AI is reasoning but not executing",
      "Use pending-approval when the agent is waiting for human input"
    ],
    "example_contexts": [
      "Agent running a task plan",
      "AI coding tool applying changes",
      "Automation agent executing tool calls"
    ]
  }
}
```

Keep `release_priority` outside `semantic`. It is product planning metadata, not user-facing meaning.

## Delivery Requirements

Each icon must ship as:

```text
animated SVG
static SVG
reduced-motion SVG
React component
Web Component support
semantic profile JSON
demo card
MCP searchable record
```

## Demo Requirements

Build a dark Raedion demo page that feels like an agentic OS console.

Demo sections:

1. **Signal Grid**
   Show all 12 icons animated on a black panel.

2. **Task Timeline**
   Show an agentic workflow:

   ```text
   ai-thinking -> ai-working -> pending-approval -> risk-high -> success
   ```

3. **Failure Path**
   Show:

   ```text
   ai-working -> connection-lost -> retrying -> error
   ```

4. **Profile Inspector**
   Selecting an icon shows:

   - meaning
   - use_when
   - avoid_when
   - ARIA label
   - motion meaning
   - React snippet
   - MCP response preview

5. **Reduced Motion Toggle**
   Simulates reduced-motion behavior for every icon.

6. **Copy Snippets**
   Provide React and Web Component snippets.

## Implementation Plan

### Phase 1: Art Direction Lock

Deliverables:

- one-page visual direction board
- color tokens
- motion tokens
- 32px source grid
- 24px export grid
- first 4 concept sketches

First 4 icons:

```text
loading-ring
pending-approval
ai-working
risk-high
```

These define the full range:

- neutral progress
- human handoff
- agent execution
- high-stakes warning

Exit criteria:

- the four icons feel like one family
- each remains readable at 24px
- each looks impressive at 32px and 48px
- each has a profile draft
- motion communicates meaning

### Phase 2: Lighthouse Set Completion

Deliverables:

- remaining 8 icons
- animated SVGs
- static SVGs
- reduced-motion SVGs
- profile JSON for all 12

Exit criteria:

- no two icons communicate the same state
- every avoid_when names a better alternative
- every icon has a unique silhouette
- no icon relies on color alone

### Phase 3: Component Delivery

Deliverables:

- React components
- Web Component renderer
- profile index
- MCP-ready search index

Exit criteria:

- each component accepts `size`, `color`, `label`, and `className`
- default color is `currentColor`
- ARIA label comes from profile unless overridden
- reduced-motion preference is respected

### Phase 4: Raedion Demo

Deliverables:

- dark demo page
- signal grid
- task timeline
- failure path
- profile inspector
- reduced-motion toggle
- copy snippets

Exit criteria:

- a developer understands the value in 30 seconds
- the demo looks native to a sleek black AI OS
- the icons feel premium enough to market

### Phase 5: MCP Proof

Deliverables:

- `search_state_icons` fixture set
- 12-icon MCP index
- deterministic match tests

Test queries:

```text
"AI is planning the next step" -> ai-thinking
"agent is executing tool calls" -> ai-working
"payment needs human approval" -> pending-approval
"high risk irreversible action" -> risk-high
"network disconnected" -> connection-lost
"system failed and is trying again" -> retrying
```

Exit criteria:

- tool never invents IDs
- tool returns a reason
- tool returns accessibility label
- tool returns a paste-ready snippet

## Success Metrics

Design success:

- 12/12 icons are readable at 24px on black
- 12/12 icons have distinct silhouettes
- 12/12 icons have meaningful motion
- 12/12 icons have reduced-motion variants
- 12/12 icons pass contrast review in default Raedion dark mode

Semantic success:

- 12/12 profiles include specific use_when and avoid_when guidance
- every avoid_when names a concrete alternative
- MCP fixture tests return expected icons
- an agent can recommend the right icon for common state prompts

Product success:

- a developer can understand the set in under 30 seconds
- Raedion can use the icons in real task flows
- the demo is strong enough for a launch video
- at least 5 target users say they would use the set in an AI app or dashboard
- at least 1 buyer or serious purchase signal emerges from sharing the demo

## Risks

### Risk: Too Pretty, Not Useful

Mitigation:

Every icon must pass the meaning test:

```text
Can a user understand the state without reading text?
Can an agent choose it from a profile?
Can a developer know when not to use it?
```

### Risk: Dot-Matrix Inspiration Becomes Copying

Mitigation:

Use dot-matrix as a motion and texture influence only. Supericons must add distinct silhouettes, semantic profiles, accessibility, and agent-state meaning.

### Risk: Motion Overload

Mitigation:

Limit motion speed, avoid constant flashing, provide reduced-motion variants, and reserve urgent pulse for high-risk or error states.

### Risk: Small-Size Failure

Mitigation:

Design at 32px, test at 24px and 16px, remove decorative particles when they reduce clarity.

### Risk: Too Raedion-Specific

Mitigation:

Keep the source set Raedion-native, but structure profiles and components so the same icons can become State Kit v1 with theme tokens later.

## Open Questions

1. Should Raedion use `raedion-*` IDs or generic State Kit IDs?

   Recommendation: use generic IDs in the product, with Raedion theme metadata.

2. Should the icons be line-only or duotone?

   Recommendation: duotone line icons with tiny matrix fills and controlled glow. Pure line icons may not feel epic enough for Raedion.

3. Should the first delivery be HTML demo or component package?

   Recommendation: demo first. The demo proves desire and gives us the visual QA surface.

4. Should these be branded as Raedion icons or Supericons State Kit?

   Recommendation: internally design for Raedion, externally describe as the first Supericons lighthouse set for agentic software.

## Final Recommendation

Build the 12 lighthouse icons as a dark-native, motion-rich, semantic signal system for Raedion.

They should feel like a premium AI OS status language:

```text
not spinners
not status badges
not decorative AI sparkles
but visual signals that know what they mean
```

If these 12 work, they become the design seed for State Kit v1 and the clearest demonstration of Supericons as the visual meaning layer for agentic software.

