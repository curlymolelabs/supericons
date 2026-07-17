# Supericons Style Adapter Use-Case Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone use-case demo showing how Supericons helps an agent satisfy a realistic UI brief: shadcn-style, minimalist, glassmorphism, and agent status icons.

**Architecture:** Create one isolated output folder with local HTML, CSS, SVG, JSON profiles, JSON style adapters, and a README. The demo should prove the workflow from user brief to meaning match to style adaptation to rendered UI.

**Tech Stack:** Standalone HTML, CSS, inline JavaScript, local SVG, local JSON. No external dependencies.

---

## Source PRD

Use this PRD as the source of truth:

```txt
docs/supericons-style-adapter-use-case-prd-2026-05-24.md
```

## Target Folder

Create this new folder:

```txt
output/supericons-use-case-shadcn-glass-agent-status/
```

If the folder already exists, stop and ask before overwriting.

## File Structure

Create:

```txt
output/supericons-use-case-shadcn-glass-agent-status/
├─ demo.html
├─ styles.css
├─ README.md
├─ adapters/
│  └─ minimal-glass.json
├─ profiles/
│  ├─ ai-thinking.json
│  ├─ ai-working.json
│  └─ pending-approval.json
└─ icons/
   ├─ ai-thinking.svg
   ├─ ai-thinking-reduced.svg
   ├─ ai-working.svg
   ├─ ai-working-reduced.svg
   ├─ pending-approval.svg
   └─ pending-approval-reduced.svg
```

## Design Direction

The artifact should feel like a realistic app-building demo, not an icon library page.

Visual direction:

- dark interface
- translucent glass panels
- restrained blur
- one cool accent color
- clean shadcn-inspired spacing and hierarchy
- no heavy gradients
- no noisy glow
- readable 24px icons
- minimal, practical, product-like

## Task 1: Create The Output Folder

**Files:**

- Create: `output/supericons-use-case-shadcn-glass-agent-status/`

- [ ] Check whether the target folder exists.

Run:

```powershell
Test-Path output/supericons-use-case-shadcn-glass-agent-status
```

Expected:

```txt
False
```

- [ ] If the result is `True`, stop and ask before overwriting.

- [ ] If the result is `False`, create the folder and subfolders.

Create:

```txt
adapters/
profiles/
icons/
```

## Task 2: Create The Minimal Glass Style Adapter

**Files:**

- Create: `output/supericons-use-case-shadcn-glass-agent-status/adapters/minimal-glass.json`

- [ ] Create the adapter JSON.

Content:

```json
{
  "id": "minimal-glass",
  "name": "Minimal Glass",
  "intent": "Fit minimalist glassmorphism interfaces.",
  "surface": "dark translucent panel",
  "color": "single cool accent",
  "detail_level": "low",
  "motion": "subtle state-driven motion",
  "effects": [
    "soft glow",
    "low opacity",
    "light blur"
  ],
  "avoid": [
    "many colors",
    "heavy gradients",
    "busy effects",
    "thick outlines",
    "decorative shine"
  ],
  "validation": [
    "Icon remains readable at 24px.",
    "Icon uses one accent color.",
    "Motion communicates state rather than decoration.",
    "Reduced-motion version preserves meaning."
  ]
}
```

## Task 3: Create The Three Supericon Profiles

**Files:**

- Create: `profiles/ai-thinking.json`
- Create: `profiles/ai-working.json`
- Create: `profiles/pending-approval.json`

- [ ] Create `ai-thinking.json`.

Use the current `ai-thinking` pilot as the base, but align field names with this use-case test.

Required meaning:

```txt
An AI agent is reasoning, planning, or deciding its next step.
```

- [ ] Create `ai-working.json`.

Required meaning:

```txt
An AI agent is actively executing work, calling tools, editing, or applying changes.
```

Use when:

```txt
Use when the agent is performing an action after deciding what to do.
```

Avoid when:

```txt
Do not use when the agent is only thinking, waiting for approval, blocked, or finished.
```

- [ ] Create `pending-approval.json`.

Required meaning:

```txt
Progress is paused until a human reviews, approves, rejects, or changes the next step.
```

Use when:

```txt
Use when the system needs a human decision before continuing.
```

Avoid when:

```txt
Do not use for errors, blocked system states, generic waiting, or active work.
```

Each profile must include:

```json
{
  "id": "",
  "name": "",
  "meaning": "",
  "use_when": "",
  "avoid_when": "",
  "not_instead_of": [],
  "visual_invariants": {
    "must_include": [],
    "must_avoid": []
  },
  "accessibility": {
    "role": "status",
    "label": "",
    "live": "polite"
  },
  "files": {
    "svg": "",
    "reduced_motion_svg": ""
  }
}
```

## Task 4: Create The Six SVG Files

**Files:**

- Create: `icons/ai-thinking.svg`
- Create: `icons/ai-thinking-reduced.svg`
- Create: `icons/ai-working.svg`
- Create: `icons/ai-working-reduced.svg`
- Create: `icons/pending-approval.svg`
- Create: `icons/pending-approval-reduced.svg`

- [ ] Use a 24x24 SVG viewBox for each icon.

- [ ] Use one accent color through `currentColor`.

- [ ] Keep each icon readable at 24px.

- [ ] Make motion state-driven:

```txt
ai-thinking: calm pulse across a compact dot field
ai-working: directional activity or execution trace
pending-approval: paused decision signal with a stable center
```

- [ ] Add reduced-motion variants with no animation.

- [ ] Avoid:

```txt
robot faces
brain icons
generic sparkles
spinner-only loading symbols
busy glass effects inside the SVG itself
```

## Task 5: Build The Demo HTML

**Files:**

- Create: `demo.html`

- [ ] Build a standalone page with these sections:

```txt
User Brief
Supericons Interpretation
Meaning Match
Minimal Glass Adapter
Rendered Product Mockup
Before / After
Implementation Snippet
Validation Checklist
```

- [ ] Include a realistic agent-status panel with the three states:

```txt
AI Thinking
AI Working
Pending Approval
```

- [ ] Add an interactive state selector.

When the user selects a state, the demo should update:

```txt
active icon
status label
short explanation
selected profile summary
implementation snippet
validation checklist
```

- [ ] Keep all text public-safe and easy to understand.

## Task 6: Build The CSS

**Files:**

- Create: `styles.css`

- [ ] Use a dark glass surface with restrained effects.

- [ ] Keep layout responsive:

```txt
desktop: two-column product demo + explanation
mobile: stacked layout
```

- [ ] Ensure icons remain visible at 24px.

- [ ] Include reduced-motion handling:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] Do not use external fonts, libraries, images, or scripts.

## Task 7: Add The Interactive Demo Logic

**Files:**

- Modify: `demo.html`

- [ ] Add inline JavaScript that defines the three demo states.

Use this structure:

```js
const states = {
  "ai-thinking": {
    label: "AI Thinking",
    description: "The agent is reasoning before taking action.",
    icon: "icons/ai-thinking.svg",
    snippet: "<SuperIcon name=\"ai-thinking\" adapter=\"minimal-glass\" size={24} motion=\"active\" />"
  }
};
```

- [ ] Update the selected state without reloading the page.

- [ ] Keep the JavaScript small and readable.

## Task 8: Write The README

**Files:**

- Create: `README.md`

- [ ] Explain what the artifact tests.

- [ ] Explain the flow:

```txt
brief -> meaning -> adapter -> render -> validate
```

- [ ] List files and their purpose.

- [ ] State limitations:

```txt
This is a standalone concept test.
The snippets are illustrative.
This is not a production package yet.
The icons are curated for this demo rather than generated live.
```

## Task 9: Verification

**Files:**

- Verify: `demo.html`
- Verify: `profiles/*.json`
- Verify: `adapters/minimal-glass.json`
- Verify: `icons/*.svg`

- [ ] Open the demo in a browser.

- [ ] Confirm all three states can be selected.

- [ ] Confirm the active icon, label, explanation, profile summary, and snippet update.

- [ ] Confirm the page has no console errors.

- [ ] Confirm desktop layout has no horizontal overflow.

- [ ] Confirm mobile layout has no horizontal overflow.

- [ ] Confirm JSON files parse.

Run:

```powershell
Get-ChildItem output/supericons-use-case-shadcn-glass-agent-status -Recurse -Include *.json | ForEach-Object {
  Get-Content $_.FullName -Raw | ConvertFrom-Json | Out-Null
}
```

Expected:

```txt
No output and no errors.
```

- [ ] Confirm public-safe wording by inspecting the final artifact for private process notes, model names, review traces, or other behind-the-scenes generation details.

## Completion Report

When implementation is done, report:

- created files
- what the demo proves
- verification commands run
- browser checks completed
- limitations and recommended next step

## Recommended Next Step After This Plan

After the use-case demo works, create a second style adapter for the same three icons:

```txt
shadcn-minimal
```

Then compare:

```txt
minimal-glass vs shadcn-minimal
```

That comparison will reveal whether style adapters are truly separate from Supericon meaning.
