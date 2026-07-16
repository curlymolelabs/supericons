# Supericons Programmable Visual Language Concept

Date: 2026-05-16

## Purpose

This note consolidates the current discussion around a possible next Supericons concept: icons as programmable visual objects, not only static files.

It is meant as a clean handoff document for deeper creative exploration. It should be treated as a concept seed, not a finished product plan.

## Starting Point

Supericons already has a strong practical foundation:

- searchable icon records
- semantic metadata
- MCP access for AI coding agents
- Motion Lab
- SVG and export workflows
- localized site and docs polish

The current registry shape is already useful. A typical record looks like this:

```json
{
  "icon_id": "iconoir:sofa",
  "source_library": "iconoir",
  "source_name": "sofa",
  "label": "Sofa",
  "depicts": "Sofa line drawing showing couch shape for seating or living spaces.",
  "semantic_tags": ["sofa", "line drawing", "outline", "object"],
  "synonyms": ["Sofa", "sofa", "Sofa icon", "sofa symbol"],
  "use_when": "Use when the interface needs sofa as the concrete object, tool, place, activity, or concept.",
  "avoid_when": "Do not use when another object, action, or specialized sofa icon communicates the meaning more clearly."
}
```

That is an expanded semantic registry. It describes a finished icon object.

The new question is bigger:

**Can Supericons become a system for creating, composing, translating, animating, and explaining visual meaning?**

## Core Insight

SVG is not just an image format. It is structured visual code.

Because SVG is text-based and vector-based, it can be:

- parsed
- edited
- recolored
- composed
- animated
- morphed
- converted
- explained
- regenerated in different styles
- bound to live app state

PNG and JPEG are mostly fixed outputs. SVG behaves more like source material.

That makes icons a natural bridge between design assets, code, and AI-assisted interfaces.

## What We Are Not Saying

This concept is not simply:

- another icon pack
- another animation library
- another metadata schema
- a copy of Anime.js
- a new programming language for its own sake
- a replacement for JSON
- a standards project before there is a working product

The useful direction is subtler:

**Supericons can define how visual meaning is described, composed, rendered, animated, and used by humans and AI agents.**

## Anime.js As Inspiration

Anime.js is useful as a reference because it shows how a focused JavaScript engine can make a complex visual domain feel simple.

Verified from the Anime.js site and GitHub repository:

- Anime.js presents itself as an all-in-one JavaScript animation engine.
- It has a simple API that works across CSS properties, SVG, DOM attributes, and JavaScript objects.
- Its documentation is organized as a broad toolbox: animation, timelines, animatable objects, draggable behavior, scope, scroll, SVG, text, utilities, easings, WAAPI, and engine controls.
- Its SVG utilities include shape morphing, line drawing, and motion paths.
- It uses JavaScript as the control layer. It does not invent a separate new programming language.

The lesson for Supericons is not to mirror Anime.js.

The lesson is:

**A small API can make a deep visual system feel approachable.**

Anime.js makes motion programmable.

Supericons could make visual meaning programmable.

## Better Framing

Avoid names that sound like paperwork:

- AIPS
- Supericons Grammar
- Icon Protocol Specification
- Semantic Visual Metadata Framework

The stronger brand move is to let the umbrella name carry the concept:

**Supericons**

Then use smaller supporting words only when needed:

- **Supericon**: one programmable visual object
- **Signal**: a Supericon with live state or context
- **Profile**: the machine-readable record
- **Passport**: the public-friendly idea of meaning traveling with the icon
- **Motion**: movement tied to meaning or state
- **Compose**: combining parts into one visual signal
- **Kit**: a packaged product set

Possible public framing:

> A Supericon is an icon that can describe itself, respond to state, and help humans or AI agents understand what it means.

## JSON Versus A New Language

JSON is still the best practical format for storage, APIs, builds, MCP responses, and compatibility.

But JSON is not always the best authoring surface.

JSON is good for:

- durable records
- validation
- APIs
- generated files
- search indexes
- MCP payloads
- framework-neutral data exchange

A more expressive layer may be useful for:

- authoring visual signals
- composing icon parts
- writing readable examples
- defining default rules
- describing state transitions
- generating multiple outputs

The recommendation is:

**Do not replace JSON. Build a simple Supericons API first. Let any shorthand language emerge later only if repeated patterns prove it is needed.**

## Language-Agnostic Direction

Supericons should be language-agnostic in concept, but JavaScript-first in implementation.

That means the same visual meaning should work through:

- HTML attributes
- JavaScript
- React props
- Svelte props
- Vue props
- Web Components
- JSON
- MCP tool calls
- future CLI commands

All of these should compile or resolve to the same shared meaning model.

Example shared model:

```json
{
  "base": "database",
  "actor": "agent",
  "state": "working",
  "risk": "caution",
  "confidence": "medium"
}
```

From that, Supericons could output:

- SVG
- CSS
- Anime.js timeline
- React component
- Svelte component
- Vue component
- Web Component
- MCP response
- PNG fallback
- accessibility label
- explanation text

## Possible API Shapes

### HTML

```html
<super-icon
  name="database"
  actor="agent"
  state="working"
  risk="caution"
  confidence="medium">
</super-icon>
```

### JavaScript

```js
import { signal } from 'supericons';

signal('database', {
  actor: 'agent',
  state: 'working',
  risk: 'caution',
  confidence: 'medium'
});
```

### React

```jsx
<SuperIcon
  name="database"
  actor="agent"
  state="working"
  risk="caution"
  confidence="medium"
/>
```

### MCP

```json
{
  "tool": "compose_visual_signal",
  "base": "database",
  "actor": "agent",
  "state": "working",
  "risk": "caution",
  "confidence": "medium"
}
```

## Possible Package Structure

Avoid `icons.js` as the main name. It is funny and memorable, but too generic and too narrow.

Better package direction:

```text
supericons
@supericons/core
@supericons/motion
@supericons/react
@supericons/svelte
@supericons/vue
@supericons/web-component
@supericons/anime
```

The core should not depend on Anime.js. Anime.js can be an optional adapter for richer motion.

## Supericons As A Signal Engine

One useful way to frame the product:

**Supericons is a signal engine for visual meaning.**

This means a visual can encode:

- what object is involved
- who is acting
- what state it is in
- whether the action is risky
- how confident the system is
- whether human approval is needed
- what motion should communicate
- what label a screen reader should announce
- why the visual was chosen

Example:

```js
signal('payment', {
  actor: 'agent',
  state: 'needsApproval',
  risk: 'high',
  motion: 'slowPulse',
  label: 'Payment needs human approval'
});
```

This should not only return a payment icon. It should return a complete visual signal.

## Meaning Timelines

Anime.js has timelines for motion.

Supericons could have meaning timelines for stateful visual communication.

Example:

```js
supericons.timeline('agent-task')
  .state('planning')
  .then('working')
  .then('needsApproval')
  .then('complete');
```

Each state maps to a different visual treatment:

| State | Possible visual behavior |
|---|---|
| planning | soft breathing motion |
| working | path tracing or orbit |
| needs approval | amber ring plus approval marker |
| blocked | red ring plus shake or static warning |
| complete | green settle motion |

This creates visual state choreography.

The key is that motion should mean something. It should not be decoration only.

## Icon Passport

The Icon Passport is the portable meaning layer.

It can be stored as JSON, embedded in SVG, or served through an API.

It can include:

- icon identity
- source library
- source name
- meaning
- depicts text
- tags
- synonyms
- use cases
- avoid rules
- accessibility label
- states
- motion rules
- related icons
- source and license notes
- agent selection guidance

Example:

```json
{
  "id": "supericons:signal:database-agent-risk",
  "meaning": "An AI agent is working with stored data.",
  "use_when": [
    "showing active database work",
    "flagging agent-managed data changes"
  ],
  "avoid_when": [
    "the data is only being viewed",
    "the action is unrelated to storage"
  ],
  "states": {
    "idle": { "motion": "none", "label": "Database idle" },
    "working": { "motion": "pulse", "label": "AI is changing data" },
    "blocked": { "motion": "shake", "label": "Data action is blocked" }
  },
  "pairs_with": ["risk-badge", "approval-ring", "audit-link"],
  "agent_guidance": "Use this when a software agent affects database state.",
  "accessibility_label": "AI-managed database action"
}
```

## Product Surfaces To Explore

### 1. Supericons Playground

A visual playground where the user changes:

- base icon
- actor
- state
- risk
- confidence
- motion
- surface

The page instantly shows:

- rendered icon
- generated SVG
- CSS
- React snippet
- MCP request
- accessibility label
- explanation

### 2. Signal Composer

A focused tool that creates one composed visual signal from structured intent.

Example user input:

```text
AI agent is changing a production database with medium confidence and caution risk.
```

Possible output:

- database base icon
- agent marker
- caution ring
- medium confidence badge
- pulse motion
- label: "AI agent is changing stored data"

### 3. State Timeline Builder

A timeline builder for product states.

Example:

```text
agent task: idle -> planning -> working -> approval -> complete
```

Output:

- animated sequence
- static fallback
- state map
- CSS or Anime.js timeline
- component snippet

### 4. Icon Passport Viewer

A simple viewer that explains an icon:

- what it means
- when to use it
- when not to use it
- related icons
- supported states
- supported motion
- agent guidance

### 5. MCP Signal Tool

An MCP tool for agents:

```text
compose_visual_signal
```

It should accept intent and return practical assets:

- icon recommendation
- composed SVG
- motion recipe
- framework snippet
- explanation
- accessibility label
- fallback options

### 6. Motion Lab v2

Motion Lab can evolve from preset animation into state-driven motion.

Instead of:

```text
make this icon bounce
```

The workflow becomes:

```text
this icon means blocked approval in a high-risk flow
```

Supericons chooses a motion pattern that matches the meaning.

## Near-Term Product Path

Recommended first build sequence:

1. **Profile format**
   Define a compact JSON profile for one class of icons.

2. **One grammar pack**
   Choose a narrow pack such as AI agent status, trust and approval, or risk and consequence.

3. **One composer demo**
   Let users change base, state, risk, actor, and confidence.

4. **One Web Component**
   Ship a simple `<super-icon>` element that renders from the profile.

5. **One MCP tool**
   Let coding agents request visual signals by intent.

6. **Optional Anime.js adapter**
   Add advanced motion output for demos and premium workflows.

## Why This Could Be A Moat

AI can generate good icons and illustrations.

That weakens the moat of static artwork.

But AI still needs:

- structured meaning
- taste rules
- usage context
- composition logic
- accessibility behavior
- consistent state systems
- reliable defaults
- productized examples
- workflow integration

Supericons can compete on the system around the visual, not just the visual itself.

The defensible layer is:

**meaning + structure + taste + state + motion + agent workflow.**

## Risks

### Risk 1: Too Abstract

If this is presented as a protocol or standard too early, it may feel like theory.

Mitigation:

Build a working demo first.

### Risk 2: Too Much Scope

Trying to support every icon, framework, and motion behavior at once will slow the product down.

Mitigation:

Start with one narrow use case.

### Risk 3: Too Developer-Heavy

If the concept only appears as code, non-technical users may not understand it.

Mitigation:

Use visual playgrounds and before/after examples.

### Risk 4: Too Dependent On One Motion Library

Anime.js is a strong inspiration, but Supericons should not depend entirely on it.

Mitigation:

Use plain SVG and CSS as the base output. Add Anime.js as an optional adapter.

## Naming Guidance

Use **Supericons** as the umbrella.

Avoid introducing too many named sub-systems at once.

Recommended vocabulary:

- Supericon
- Signal
- Profile
- Passport
- Motion
- Compose
- Kit

Avoid:

- AIPS
- Supericons Grammar
- icons.js
- broad protocol claims before a working product exists

## Suggested Creative Expansion Prompt

Use this prompt with a more creative agent:

```text
Expand the Supericons programmable visual language concept into a bold product vision.

Do not frame it as a copy of Anime.js or Google Translate. Use Anime.js only as inspiration for how a small API can make a deep visual system feel approachable.

Core idea:
Supericons can evolve from an icon search and MCP tool into a programmable visual meaning system. A Supericon is not only an SVG. It can carry meaning, state, motion, accessibility, usage rules, and agent guidance.

Explore:
- Supericons as a signal engine for visual meaning
- Icon Passport as the portable profile
- Signals as stateful composed icons
- Motion tied to meaning, not decoration
- JavaScript-first but language-agnostic design
- Web Components and MCP as universal bridges
- optional Anime.js adapter for advanced motion
- one practical MVP path
- wild future product demos
- examples of APIs, UI playgrounds, and agent workflows

Keep the language plain, vivid, and product-minded. Push the imagination, but keep the first product wedge practical.
```

## Final Thought

The strongest version of this idea is not that Supericons invents a new programming language.

The stronger idea is:

**Supericons becomes the layer that turns icon meaning into usable visual behavior across apps, agents, components, and motion systems.**
