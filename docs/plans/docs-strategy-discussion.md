# Docs Page Strategic Design Discussion
**Date:** 10 April 2026
**Format:** Socratic design thinking session
**Status:** Decision reached - see conclusion

---

## Context

Two design questions were raised about the Supericons docs page (`/?view=docs`):

1. Are the hero pill chips redundant given the left sidebar exists?
2. Is "Supericons Docs" the right title when the page is almost entirely about MCP?

These led to a deeper strategic question: should Supericons build a full developer docs site, and if so, what is the right sequencing?

---

## Question 1: Hero pill chips vs. left sidebar

### The pills in question
`20,000+ free icons` | `8 MCP tools` | `Premium collection access` | `Motion Lab MCP for Pro` | `Converter MCP for Pro`

### Socratic reasoning

**What job does each element do?**
- Sidebar: navigation - gets you somewhere (active choice)
- Hero pills: orientation - tells you what exists before you decide where to go (ambient awareness)

These serve different cognitive stages and are therefore not redundant. A first-time visitor's eye hits the hero before they parse the sidebar. Pills answer "what can I configure with this?" in 2 seconds. The sidebar assumes the user already knows what they want.

**Does the sidebar make the pills redundant?**
No. Think of it as: pills are the movie trailer, the sidebar is the chapter list. You need both for different users at different moments.

**What happens if you remove the pills?**
The eye lands on the hero text, then jumps directly to the sidebar trying to figure out "what is all this?" - that is harder cognitive work. You also lose the first-impression signal that conveys scale and breadth.

**Are 5 pills the right amount and the right content?**
This is worth questioning. The current pills mix value statements with feature labels inconsistently:
- "20,000+ free icons" = value statement (strong)
- "8 MCP tools" = feature inventory (weak - "8" means nothing without context)
- "Motion Lab MCP for Pro" = feature label (opaque without context)

A better use of pills at hero level is to communicate **value categories**, not a feature inventory.

### Verdict on pills
**Keep them.** The redundancy with the sidebar is acceptable because they serve a different cognitive function. However, refine the copy so all pills communicate value, not just feature names.

---

## Question 2: Is "Supericons Docs" the right title?

### The problem
The docs page is currently an MCP setup and configuration hub. The content is almost entirely: how to connect Supericons to Claude Code, Codex, and Cursor. A user arriving at "Supericons Docs" expecting guidance on Motion Lab, Converter, or icon customization finds nothing.

**The title creates a promise the content does not yet deliver.**

### What type of product is Supericons?

This is the fork in the road:

| Direction | Implication |
|---|---|
| "Supericons is primarily an MCP tool for developers" | MCP is the whole story. Rename the page "MCP Setup" or "Developer Setup." Motion Lab, Converter, icon browsing = UI that speaks for itself. No docs needed. |
| "Supericons is a full design-to-code icon platform" | Docs should cover icon search, Motion Lab workflow, Converter workflow, premium collections, and MCP. MCP is one powerful feature but not the entire product. |

### What does "intuitive = no docs needed" actually mean?

The principle of progressive disclosure is real: you do not document what is self-discoverable. The icon browse panel and customize controls are labeled and intuitive - no docs needed.

But these are not self-evident:
- Motion Lab has named presets, trigger types, duration parameters, intensity scaling, and two distinct output formats (CSS and animated SVG). Getting this wrong wastes time.
- The Converter has 6 `traceClass` options, two `qualityMode` values, two `uiMode` values, and their interactions are non-obvious. A user picking the wrong combination gets poor output.
- The MCP has 11 tools with specific input schemas, parameter constraints, and Pro-gating logic.

**Rule:** If the user could waste 10+ minutes getting it wrong from the UI alone, it needs docs.

---

## Question 3: Do we have the content for a full docs site? Is it necessary?

### Content audit

**Surface A: MCP Tools (already partially written)**

| Tool | Complexity | Docs status |
|---|---|---|
| `search_icons` | Low | Covered in setup guides |
| `get_icon` | Low | Covered |
| `list_libraries` | Trivial | Not needed |
| `animate_icon` | Medium | Partially covered |
| `export_animated_svg` | Medium | Not covered |
| `export_motion_css` | Medium | Not covered - CSS output format is non-obvious |
| `convert_svg_to_png` | Low-medium | Not covered |
| `convert_png_to_svg` | High | Not covered - 6 traceClass modes are opaque |
| `list_motion_presets` | Trivial | Not needed |
| `get_motion_recipe` | Low | Not covered |
| `inspect_converter_options` | Low | Not needed |

**Surface B: Motion Lab (Pro)**
All content is documentable and partially exists in MCP tool schemas:
- Preset names and behaviors
- Trigger types (loop, hover, click) and their behavioral differences
- Duration + intensity ranges and defaults
- CSS output class structure
- Animated SVG output format and how to embed

**Surface C: Converter (Pro)**
All content is documentable:
- PNG to SVG workflow
- `traceClass` options - 6 named classes, each with a semantic meaning (this alone justifies a table-format doc page)
- `qualityMode` (exact vs. compact)
- `uiMode` (logo vs. icon)
- When to use which combination - genuinely non-obvious

**Surface D: Free icon browsing + customize panel**
Nothing here needs docs. The UI is self-describing. Skip.

**Surface E: Account + API keys**
One short reference page. Already partially covered in client guides.

### Is the content sufficient for a full docs site?

Yes. Mapping it out:

```
Supericons Docs
│
├── Getting started
│   └── What is Supericons MCP?
│
├── MCP setup
│   ├── Claude Code
│   ├── Codex (CLI + IDE extension)
│   └── Cursor
│
├── MCP tools reference
│   ├── search_icons
│   ├── get_icon
│   ├── animate_icon
│   ├── export_animated_svg
│   ├── export_motion_css
│   ├── convert_svg_to_png
│   └── convert_png_to_svg
│
├── Motion Lab (Pro)
│   ├── Presets reference
│   ├── Trigger types
│   ├── CSS output guide
│   └── Animated SVG output guide
│
├── Converter (Pro)
│   ├── PNG to SVG
│   ├── SVG to PNG
│   └── traceClass reference
│
└── Account + API keys
    ├── Pro subscription
    └── API key management
```

**~18 pages.** Enough to justify a real docs site. Not bloated. Not speculative.

### Is it necessary?

Apply the "fail without docs" test:

| User + Task | Fails without docs? |
|---|---|
| Developer adding MCP to Claude Code | Yes - already documented |
| Developer calling `convert_png_to_svg` without knowing traceClass | Yes - 6 modes, no UI preview available |
| Pro user integrating animated SVG into a React or Next.js project | Yes - CSS output format is non-obvious |
| Pro user using Motion Lab customize panel for the first time | Probably not - labeled UI |
| Anyone browsing free icons | No |

**Verdict: Yes, docs are necessary for MCP-heavy and Pro workflows.** Not necessary for the free tier UI. This is revenue-protective: Pro users who cannot figure out traceClass or Motion Lab CSS output churn. Docs reduce churn for paid features.

Additional signal: pages like `/docs/motion-lab/presets` and `/docs/mcp/cursor` are high-intent SEO targets that do not exist yet.

---

## Question 4: Should it be a full dev-docs architecture?

### Two architecture models compared

| Model | Description | Cost | Limitation |
|---|---|---|---|
| **A (Current)** | Single page, sidebar nav within page | Already shipped | Breaks down past 10 items; not URL-addressable; no search |
| **B (Full docs site)** | Persistent left sidebar, URL routing, top nav stays, ~18 pages modeled on developers.openai.com or docs.cursor.com | Medium-high build sprint | Requires content, routing, and sidebar architecture |

### What the full architecture looks like

- Persistent left sidebar with collapsible sections
- Top nav bar maintained (links to App, Pricing, API Keys, main site)
- Each page is URL-routed: `/docs`, `/docs/mcp`, `/docs/mcp/claude-code`, `/docs/motion-lab/presets`
- Optional: in-page search across all docs content
- The existing client guide cards (Claude Code, Codex, Cursor) become full sub-pages, not card views

The sidebar replaces the current in-page section nav. The top bar stays untouched. This is the same pattern as docs.cursor.com, code.claude.com/docs, and developers.openai.com.

---

## Socratic reasoning: A, B, or C?

Three options were on the table:
- **(A)** Fix the title/framing only. Keep everything else as-is.
- **(B)** Build the full docs site. Skip the interim patch.
- **(C)** Patch the live gap immediately, plan the full build in parallel.

### Testing A alone

What improves: honesty. The title matches the content. No more overpromising.

What does not improve: nothing about the product improves. Pro users still have no reference. The docs surface is still thin. A is damage control, not strategy.

### Testing B alone

What improves: everything - eventually. Pro users get reference docs. Trust and SEO both improve.

What is the risk: the live page remains misleading during the full build sprint. That sprint is days or weeks, not hours. You are paying a trust debt in production while building the solution. The fix for the immediate problem (a single sentence of honest framing) takes 30 minutes. There is no reason to withhold it while building.

### Testing C

C patches the live problem immediately (honest title, honest scope note) and starts building the correct long-term solution in parallel. It separates two concerns that should not be coupled.

**Does C cost anything extra compared to A alone?** No. A is a few words of copy. It exists inside C anyway.

**Does C cost anything extra compared to B alone?** Negligibly. 30 minutes to patch the live page is noise relative to a full docs sprint.

**Is there any scenario where C is worse than either A or B alone?** Only if you believe stating "Motion Lab docs coming soon" creates unwanted pressure. That is a planning discipline question, not a design question - and the pressure of a commitment is healthy.

### Underlying principle

The principle of honest interfaces: a product that describes itself accurately at every stage of maturity builds more trust than one that overpromises and delivers late. The patch is the honest interface for today. The full docs site is the honest interface for the future.

---

## Conclusion

**The answer is C.**

The logic:
1. The current state misleads users today. That harm can be fixed in minutes. Fix it.
2. The correct long-term state requires a sprint. It cannot be fixed in minutes. Plan it.
3. These two facts are orthogonal. Coupling them - waiting for B before fixing A - causes unnecessary ongoing harm during the build window for no gain.
4. C is not compromise. It is correct sequencing.

---

## Decision record

| Decision | Action | Timeline |
|---|---|---|
| Hero pills | Keep them. Refine copy to communicate value, not feature labels. | Next copy pass |
| Page title | Change from "Supericons Docs" to something scoped. Add honest "coming soon" framing for Motion Lab and Converter docs. | Immediate (Track 1) |
| Full docs architecture | Plan as a proper feature sprint. ~18 pages. URL-routed. Persistent sidebar. Top nav retained. | Next sprint (Track 2) |
| Docs content source | Much of it is extractable from existing MCP tool schemas and client guide content already written. | Sprint planning |
| Free tier UI | No docs needed. Self-describing. | No action |

---

## Open question for next session

What should the interim title be while the full docs site is being built?

Options:
- "MCP Setup" (narrow, accurate to current content)
- "Developer Docs" (forward-looking, honest if scoped with a note)
- "Supericons Docs" + subtitle "MCP integration guides" (keeps brand name, narrows scope)
