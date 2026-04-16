# Premium Icon Bundle: Design Workflow

> A repeatable 10-step process for designing, validating, and shipping a premium icon bundle.
> Methodology: IDEO Design Thinking + Socratic Prompting at every decision gate.

---

## Phase 1: EMPATHIZE (Who and Why)

### Step 1: Define the Buyer Persona

Before drawing a single pixel, answer these questions:

- **Who is buying this bundle?** (e.g., "indie dev building an agentic AI tool")
- **What is their technical stack?** (React? Flutter? Figma mockup?)
- **What is their design skill level?** (Can they modify SVGs, or do they need plug-and-play?)
- **What are they building?** (SaaS dashboard? Mobile app? Marketing site?)
- **What is their budget sensitivity?** ($19 impulse buy vs. $49 considered purchase)

**Deliverable:** A one-paragraph buyer brief.

Example: "Solo developer building a Next.js AI chat product. Needs 30-40 clean, minimal icons for navigation, status, and AI-specific concepts. Cannot design icons. Wants to copy-paste React components. Budget: $19-29."

### Step 2: Map the Buyer's Journey

Walk through the user's actual workflow and identify where icons are needed:

```
App Launch -> Sidebar Nav -> Dashboard -> Data Display -> Settings -> Empty States -> Errors -> Onboarding
```

For each screen/state, ask:
- What icons does this screen require?
- Are there screen-specific icons (e.g., "fine-tune", "token usage") that do not exist in any free library?
- What is the "gap" between what free libraries offer and what this user actually needs?

**Deliverable:** A screen-by-screen icon inventory.

---

## Phase 2: DEFINE (What Exactly)

### Step 3: List Every Icon Needed

Based on the journey map, create a flat list of every icon the bundle must contain. Group them by function:

| Group | Icons | Count |
|---|---|---|
| Navigation | home, menu, back, search, close, settings | 6 |
| Status | success, error, warning, info, loading, offline | 6 |
| Actions | add, edit, delete, save, copy, share, download | 7 |
| Domain-Specific | (unique to this bundle's theme) | 10-15 |
| Empty States | no-data, no-results, first-time, maintenance | 4 |

**Target:** 30-50 icons per bundle. Below 30 feels thin. Above 50 becomes unfocused.

**Socratic gate:** For each icon, ask: "Does this icon already exist in the free Supericons library in a style that matches this bundle?" If yes, it is not worth including. The bundle must contain icons you cannot trivially find for free.

### Step 4: Define the Visual Brief

Lock down ALL design parameters before any icon is drawn:

| Parameter | Decision |
|---|---|
| Grid | 24x24 or 20x20? |
| Stroke width | 1.5px (standard), 2px (bold), 1px (thin)? |
| Corner radius | Sharp (0), Slight (1px), Rounded (2px), Fully rounded? |
| Cap style | Round, Square, or Butt? |
| Join style | Round, Miter, or Bevel? |
| Fill style | Outline only, Solid fill, Duotone, or Mixed? |
| Optical padding | Uniform padding or optically adjusted per shape? |
| Style reference | "Like Lucide", "Like SF Symbols", "Like Phosphor Thin"? |

**Socratic gate:** "If I place any 3 icons from this set side by side, do they look like they were designed by the same person in the same session?" If not, revisit the brief.

**Deliverable:** A one-page visual spec sheet with a reference icon drawn first (the "key icon") that sets the tone for the entire bundle.

---

## Phase 3: IDEATE (Design the Key Icon)

### Step 5: Draw the Key Icon

Pick the single most representative icon from the list (often "home" or "dashboard") and design it first. This icon establishes:

- The exact stroke weight on the artboard
- The padding/margin convention
- The corner radius
- The level of detail (how many elements per icon)

**Process:**
1. Set up a 24x24 artboard with a 2px padding zone (20x20 live area)
2. Draw the icon using only paths (no text, no embedded images)
3. Ensure all strokes are expanded or set to consistent widths
4. Preview at 16px, 24px, 32px, and 48px to verify legibility at all sizes
5. Test in both dark (#111) and light (#faf8f4) backgrounds

**Socratic gate:** "At 16x16, can a user still identify what this icon represents without a label?" If not, simplify.

### Step 6: Draw 5 Proof Icons

Before committing to all 30-50, draw 5 more icons spanning different structural types:

| Type | Example | Tests |
|---|---|---|
| Simple geometric | circle-check, square | Stroke consistency |
| Complex composite | dashboard (multiple shapes) | Visual weight balance |
| Organic/curved | leaf, brain, cloud | Corner radius consistency |
| Directional | arrow, chevron, send | Optical alignment |
| Text-adjacent | alert-badge, notification-dot | Small detail legibility |

**Deliverable:** 6 proof icons (1 key + 5 proof) arranged on a single artboard.

**Socratic gate:** "Do these 6 icons feel like a family? Could I swap any one for a Lucide icon and it would look out of place?" If a Lucide icon blends in seamlessly, your style is not differentiated enough to charge for.

---

## Phase 4: PROTOTYPE (Full Production)

### Step 7: Produce the Full Set

With the visual brief proven by 6 icons, produce the remainder:

**Per-icon checklist:**
- [ ] Draw on the correct grid (24x24 with 2px padding)
- [ ] Stroke width matches spec (e.g., 1.5px)
- [ ] Corner radius matches spec
- [ ] All paths are properly closed (no open endpoints unless intentional)
- [ ] No stray points or invisible paths
- [ ] Icon is centered both horizontally and vertically
- [ ] `viewBox="0 0 24 24"` is set correctly
- [ ] `fill="none"` and `stroke="currentColor"` for outline icons
- [ ] Preview at 16px, 24px, 48px: all legible
- [ ] Dark background test: passes
- [ ] Light background test: passes

**Naming convention:**
- Lowercase, hyphen-separated: `arrow-left.svg`, `brain-circuit.svg`
- No library prefix (these are Supericons originals)
- Names must be unique within the bundle

### Step 8: Optimize and Export

**SVG Optimization:**
1. Run through SVGO (remove metadata, comments, editor cruft)
2. Strip fixed `width`/`height` attributes (keep only `viewBox`)
3. Ensure `stroke="currentColor"` so color is inherited
4. Remove any `style` attributes (use SVG attributes instead)
5. Validate: open each SVG in a browser, verify it renders correctly

**Export formats to include in the bundle:**
- `/svg/` folder with all raw optimized SVGs
- `/react/` folder with JSX components (auto-generated from SVGs)
- `/vue/` folder with SFC components
- `preview.html` showing all icons in a grid (buyer proof of purchase)
- `LICENSE.md` (your proprietary license)
- `README.md` (usage instructions, changelog)

---

## Phase 5: TEST (Validate Before Shipping)

### Step 9: Quality Audit

**Visual audit (manual):**
- [ ] Print all icons on a single sheet at 4x size. Circle any that feel "off"
- [ ] Show the set to 2-3 people without context. Ask: "Do these look like one set?"
- [ ] Compare against the buyer persona's actual app screenshots. Do the icons fit?

**Technical audit (automated):**
- [ ] All SVGs valid XML (no parsing errors)
- [ ] All SVGs use `currentColor` (not hardcoded hex values)
- [ ] All SVGs have consistent `viewBox`
- [ ] No icon exceeds 2KB (target: under 500 bytes each)
- [ ] Total bundle ZIP under 500KB

**Socratic gate:** "Would I pay $29 for this bundle if I found it on Gumroad?" If the honest answer is "maybe", add more icons or improve quality until the answer is "yes, immediately."

### Step 10: Package and List

**Bundle contents:**
```
supericons-agentic-ai-kit-v1.0/
  svg/                     # 40 optimized SVGs
  react/                   # 40 JSX components
  vue/                     # 40 Vue SFCs
  preview.html             # Visual gallery
  LICENSE.md               # Proprietary license terms
  README.md                # Usage guide
```

**Listing requirements:**
- Hero image: 1200x630 showing 12-16 icons in a grid on dark background
- Bundle name, description, icon count, included formats
- Live preview (integrate into Supericons app as a "Premium" library filter)
- Price: $19-29 for individual, $49-79 for team/unlimited

---

## Summary: The 10 Steps

| # | Step | Phase | Deliverable |
|---|---|---|---|
| 1 | Define buyer persona | Empathize | One-paragraph buyer brief |
| 2 | Map buyer's journey | Empathize | Screen-by-screen icon inventory |
| 3 | List every icon needed | Define | Grouped icon list (30-50) |
| 4 | Define visual brief | Define | One-page spec sheet |
| 5 | Draw the key icon | Ideate | 1 reference icon |
| 6 | Draw 5 proof icons | Ideate | 6-icon proof sheet |
| 7 | Produce full set | Prototype | All 30-50 icons |
| 8 | Optimize and export | Prototype | Multi-format bundle |
| 9 | Quality audit | Test | Audit checklist passed |
| 10 | Package and list | Test | ZIP + listing assets |
