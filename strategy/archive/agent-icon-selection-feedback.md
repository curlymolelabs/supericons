# How Agents Select Icons: First-Hand Feedback

**Source**: Documented from the agent that built `supericons-2027-vision-blueprint.html`
**Date**: April 2026
**Purpose**: Raw, unfiltered intelligence to inform Supericons product development

---

## The Core Finding

> When building a rich HTML document, I used **Google Material Symbols** via CDN -- not the Supericons MCP server -- because the CDN had zero setup friction and I already knew icon names from training data. **Agents take the path of least resistance.** This single observation should drive every priority decision in the Supericons 2027 roadmap.

---

## Step-by-Step: My Actual Decision Process

### Step 1: Library selection

I did not evaluate icon libraries. I defaulted to Material Symbols because:

- One `<link>` tag, no configuration
- Icon names are in my training data, so I can use them without a tool call
- No API key, no MCP session, no network round-trip

**Implication**: To displace Material Symbols as the agent default, Supericons must offer something Material cannot: semantic intent resolution. "Find me the right icon for this concept" beats "I type a name I already know."

---

### Step 2: Per-icon reasoning

I matched icons by nearest-noun keyword, not visual browsing. I never "saw" any icons.

| Concept | Icon used | My reasoning | Quality |
|---|---|---|---|
| Governance Collections | `shield` (filled) | "Protection, trust, governance" | Acceptable |
| Stateful Animation | `animation` | Literal keyword match | Good |
| MCP Semantic Protocol | `hub` | "Connected network, protocol, API" | Acceptable |
| Dual-Surface Design | `layers` | "Two surfaces = layers" | Good |
| Icon Grammar | `auto_awesome` | "Composition, magic, assembly" | Poor - I was guessing |
| Multimodal System | `devices` | "Multiple surfaces = multiple devices" | Acceptable |
| Agent state: executing | `sync` | "Spinning arrows = processing" | Good |
| Agent state: blocked | `block` | Literal match | Good |
| Agent state: planning | `schema` | "Planning = building a graph" | Acceptable |
| Agent state: uncertain | `help_outline` | "Question = uncertainty" | Poor |
| Roadmap phases | `looks_one` to `looks_5` | Numbered sequence placeholders | Functional only |

---

### Step 3: Where I failed and why

**1. "Icon Grammar" got `auto_awesome` (the sparkle icon).**
There is no icon for "composable visual primitives." I picked the sparkle because it vaguely suggests AI-assisted assembly. I knew it was wrong. No better option existed.

**2. Confidence levels have no visual vocabulary.**
"Confidence: high" vs "confidence: medium" vs "confidence: low" -- no icon in any library represents these states. I had to fall back to text labels.

**3. Agent-initiated vs human-initiated actions.**
No icon for "this action was taken by the AI" vs "this was taken by the human." I used text strings ("agent", "human") inline. A dedicated authority-marker icon primitive would have been far better.

**4. Disclosure stack layers (L1-L6).**
I used generic proxies: `mail`, `label`, `info`, `psychology`, `route`, `description`. None of them actually mean "explanation layer" or "audit trace." They are the closest available nouns. The real icons do not exist yet.

**5. The "waiting for human approval" state.**
I used `hourglass_top`. It communicates "time passing" but not "the agent needs YOU specifically to act." These are meaningfully different and should be different icons.

---

## What This Reveals for Supericons Product Development

### Finding 1: Agents select by semantic keyword, not visual browsing

I never opened a browser to look at icons. I typed names. The most important field in your dual-surface metadata is therefore `semantic_tags[]` -- specifically **intent synonyms**, not just visual descriptors.

**Bad tag**: `"looks like a shield"`
**Good tag**: `"governance"`, `"protection"`, `"trust-confirmed"`, `"verified"`, `"authority"`

---

### Finding 2: The governance vocabulary gap is real and I felt it acutely

For traditional UI concepts (save, delete, search, settings), I had an instant keyword match with 100% confidence.

For agentic concepts, I was forced to approximate:

| Agentic concept | What I needed | What I used | Gap |
|---|---|---|---|
| Agent confidence level | Gradient/badge indicator | No icon, skipped | Critical |
| Human override | Authority marker glyph | Text label | Critical |
| Disclosure layer | Progressive stack indicator | Generic info icon | High |
| Memory accessed | Memory/context icon | No good match, skipped | High |
| Audit required | Formal audit badge | No icon, skipped | High |
| Reasoning chain | Chain/trace icon | `route` (wrong metaphor) | Medium |

**Every gap above is a premium collection opportunity.**

---

### Finding 3: I needed composable elements, not atomic glyphs

For the stateful icon demo, I needed: icon + colored ring animation + state label. I built this manually in CSS using `@keyframes`, custom properties, and border tricks. It took significant CSS work.

If `get_icon_grammar({ base: "shield", state: "executing", confidence: "high" })` had returned a pre-composed, ready-to-use SVG bundle, I would have used it and saved significant effort. This is the entire value proposition of Pillar 5.

---

### Finding 4: The ideal agent workflow does not exist yet

**What I actually did (friction-heavy, result: mediocre icon choices):**
```
1. Think of a concept
2. Recall a Material Symbols name from training
3. Type it as a string
4. Hope it looks right without seeing it
```

**What I wish existed (low friction, result: semantically correct icons):**
```
request_semantic_icon({
  intent: "represent_governance_concept",
  concept: "trust_and_authority",
  context: "strategy_document",
  style: "filled",
  state: "confirmed"
})
// Returns: exact SVG + CSS + a11y metadata, no guessing required
```

---

### Finding 5: Pre-knowledge of icon names is the current moat Material Symbols has

Material Symbols names appear extensively in code examples, documentation, and tutorials across the web. This is why they are in my training data. Supericons can close this gap two ways:

1. **MCP as the interface**: Agents do not need to know icon names if they can describe intent
2. **Synonyms that map agent concepts to icon IDs**: "waiting_for_approval" resolves to the right Supericons ID even if the agent does not know the name

---

## Action Items for the Supericons Team

| Priority | Action | Pillar |
|---|---|---|
| P0 | Ship the Agent Lifecycle Collection first (9 states, instant clarity) | 1 |
| P0 | Add intent-based synonyms to icon-index.json immediately (not names, purposes) | 4 |
| P1 | Build `request_semantic_icon` MCP tool: the single biggest unlock for agent adoption | 3 |
| P1 | Design authority-marker and confidence-badge primitives | 5 |
| P2 | Publish governance icon taxonomy so agents can discover what exists | 3 |
| P2 | Add section to docs: "How to describe icons to agents" | All |

---

## Can Agents Design Icons? An Honest Self-Assessment

### What I can do

**1. Write SVG markup directly.**
My training data includes thousands of icon SVGs. I understand stroke widths, viewBox conventions, path construction, and visual balance. I can produce simple, clean line icons (Lucide/Feather style) by hand-coding `<path>` elements. Quality ceiling: functional, correct, but not visually impressive. I can hit Feather Icons quality for simple geometric shapes. I cannot match a human designer's nuance for complex, branded, or stylistically unique icons.

**2. Generate raster icon concepts.**
Using image generation tools, I can produce icon-like images as concept mockups or inspiration boards. These are raster PNGs, not production SVGs. They need to be traced/redrawn to be usable.

**3. CSS-animate icons.**
This is where I am strongest. Given an SVG, I can write sophisticated CSS animations: hover effects, state transitions, micro-interactions, keyframe choreography. The premium collection pipeline already proves this capability.

### What I cannot do

**1. Match human visual taste and aesthetic judgment.**
I have no way to evaluate visual balance, negative space harmony, or whether an icon "feels right" the way a trained designer does. I optimize for correctness and convention, not beauty.

**2. Create pixel-perfect production icons at scale.**
A 50-icon collection with consistent stroke weight, optical alignment, corner radius, and visual density requires iteration-by-iteration refinement. I can approximate the first draft, but the polish loop needs human eyes.

**3. Understand brand personality through icons.**
"Make icons that feel playful but professional" -- I can translate this to parameters (round corners, thicker stroke, softer angles), but I am applying rules, not feeling the brand.

**4. Judge from a human taste profile.**
If a user says "I like minimalist Japanese-inspired design," I can adjust parameters (thinner strokes, more whitespace, geometric reduction), but I am pattern-matching against training data, not developing aesthetic empathy.

### Capability Matrix

| Task | Agent capability | Human required? |
|---|---|---|
| Select the right icon for a concept | Medium (keyword matching) | No, if semantic tags exist |
| Write clean SVG for simple shapes | High | No |
| Create visually impressive, unique icons | Low | Yes |
| Animate icons with CSS | High | No |
| Compose icon + state + badge | Medium (needs grammar system) | No, if composable system exists |
| Judge aesthetic quality | Very low | Yes |
| Maintain consistency across a collection | Low without reference | Yes, for quality control |

### The Strategic Implication

Agents are not going to replace icon designers. But agents will be the primary **consumers** of icon libraries, selecting and assembling icons into UIs at scale. The value chain is:

1. **Human designers** create the visual vocabulary (this is Supericons' core product)
2. **Agents** select, compose, and deploy those icons into apps (this is where MCP + semantic tags + grammar matter)

The moat is not that agents can make icons. It is that agents **cannot make good icons**, so they need a library. And whichever library makes it easiest for agents to find and use the right icon wins the market. That is Supericons.

---

## Closing Observation

The essay `Icons_Past_Present_Future.md` describes the governance iconography gap theoretically. Building `supericons-2027-vision-blueprint.html` proved it empirically. Every icon approximation I made in that document is a Supericons collection waiting to be built.

The agent that builds the next version of this document -- with a fully operational Supericons MCP semantic protocol -- should be able to say: "I need a trust-confirmed icon for a governance dashboard" and receive the exact right visual element in one call. That is the product.
