# Supericons Docs Minimalist Layout Refinement Plan

**Date:** 10 April 2026  
**Status:** Ready for implementation

---

## Goal

Refine the new docs section so it feels calm, editorial, and easy to scan.

The current docs shell has the right structure, but it still looks too panel-heavy. The next pass should remove the large container-box feel and move the layout closer to the pattern used by strong documentation products:
- a clear left navigation rail
- an open reading canvas
- typography-led hierarchy
- surfaces used only when they help

This should stay true to Supericons' theme, typography, and visual tone.

---

## Design Direction

The docs section should feel like product documentation, not like a dashboard.

That means:
- fewer large bordered containers
- more spacing between sections
- stronger content hierarchy through headings and rhythm
- smaller, more purposeful use of cards
- code blocks and compact callouts staying surfaced

The page should feel lighter, quieter, and more readable while still matching the Supericons brand.

---

## What Should Change

### 1. Remove large section containers

Large wrapper boxes should no longer define the page.

This applies to:
- the hero block
- standard content sections
- placeholder page sections
- large pager boxes if they feel too heavy

These should become open sections separated by spacing, headings, and occasional dividers.

### 2. Keep smaller functional surfaces

Smaller containers should remain where they serve a clear purpose.

Keep surfaced styling for:
- code blocks
- quick-link cards
- product choice cards
- compact callouts
- small utility elements such as pills or badges when still needed

### 3. Turn the center column into a reading canvas

The main content area should behave like an article.

Each page should read as:
- page intro
- section heading
- body copy
- lists, code blocks, tables, or small cards as needed

The structure should come from content flow, not from one large box after another.

### 4. Make the left docs sidebar feel like a rail, not a panel

The docs navigation should remain persistent, but visually lighter.

Refine the sidebar so it feels like:
- a navigation rail
- grouped sections with clear labels
- understated active states

The sidebar should support the page, not compete with it.

### 5. Reduce hero weight

The page intro should stay, but it should no longer feel like a large framed card.

Keep:
- kicker
- title
- intro paragraph

Reduce:
- border weight
- box framing
- visual bulk

Hero chips should be reduced or removed unless they provide real value.

### 6. Make section transitions softer

The docs pages should rely on vertical rhythm first.

Use:
- spacing
- heading hierarchy
- subtle divider lines only where helpful

Avoid stacking borders around every section.

### 7. Make placeholders feel intentional but light

Placeholder pages should stay part of the system, but they should not look like incomplete cards stacked inside larger cards.

Each placeholder page should include:
- a clear page title
- one short explanation of what the page will cover
- one simple link row showing what is already available now

The layout should stay minimal and editorial.

### 8. Refine docs home separately

Docs Home should not become a wall of cards.

Recommended structure:
- open intro at the top
- one compact “Start here” card group
- plain content sections below
- a lighter next-page pattern at the bottom

This keeps home useful without making it feel like a dashboard.

### 9. Refine guide pages as reference articles

Claude Code, Codex, and Cursor should read like setup guides, not marketing panels.

Recommended structure:
- intro
- setup section
- premium setup section
- troubleshooting
- related links

Use plain sections for the article flow.
Use surfaced styling only for code blocks and compact support elements.

---

## What Should Stay

The following foundations are correct and should remain:
- top navigation
- docs-specific left sidebar
- existing docs information architecture
- current MCP guide content
- placeholder page strategy for unfinished sections
- Supericons theme and typography
- code copy buttons and code block treatment

This pass is a layout refinement, not a rewrite of the docs structure.

---

## Visual Principles

### Typography leads

Headings, spacing, and alignment should organize the page before borders do.

### Surfaces are earned

Only use a container when it improves comprehension or interaction.

### Navigation stays calm

The sidebar should be easy to scan and clearly grouped, without feeling loud or heavy.

### One primary reading path

The center column should feel like the default focus of the page.

### Brand stays present but restrained

Keep the Supericons orange accent, dark theme, and type system, but use them with control.

---

## Implementation Scope

### Phase A. Shell refinement

Refine the docs shell first:
- remove large boxed treatment from the overall article layout
- lighten the sidebar presentation
- simplify page spacing and section rhythm
- adjust the page-width and reading-width balance

### Phase B. Docs Home

Apply the new layout system to Docs Home first.

This page should become the benchmark for:
- open hero treatment
- lighter section structure
- selective card usage

### Phase C. MCP guide pages

Refine:
- Claude Code
- Codex
- Cursor

These pages should become clean article layouts with surfaced code blocks and lighter section separation.

### Phase D. Placeholder pages

After the real pages are refined, update all placeholder pages so they inherit the same lighter pattern.

---

## Execution Order

1. Refine the shell and layout rules.
2. Update Docs Home to match the new pattern.
3. Update Claude Code, Codex, and Cursor pages.
4. Update placeholder pages.
5. Review desktop and mobile spacing together.
6. Tune the sidebar active state and section dividers last.

---

## Success Standard

This refinement is complete when:
- the docs section no longer feels dominated by large container boxes
- the main reading column feels open and calm
- cards remain only where they are useful
- the docs home feels editorial rather than dashboard-like
- MCP guide pages feel like clean setup guides
- placeholder pages feel intentional, not cluttered
- desktop and mobile both preserve clear hierarchy

---

## Notes For The Next Build Pass

This is a visual and layout refinement on top of the phase 1 docs foundation.

It should not change:
- the page map
- the progressive-build strategy
- the current real content already in place

The purpose of this pass is to make the docs experience feel more like a polished documentation product before the remaining sections are filled in.
