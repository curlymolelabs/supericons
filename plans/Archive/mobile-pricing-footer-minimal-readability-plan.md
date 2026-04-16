# Mobile Pricing + Footer Minimal Readability Plan

## Goal

Make the pricing page and footer at least comfortably viewable on mobile before launch, without turning this into a full responsive redesign.

This plan is intentionally narrow:
- no desktop redesign
- no pricing copy rewrite
- no major information architecture changes
- no new mobile-only screens

## Current Problems

Based on the current implementation:

- The pricing page renders four dense pricing cards side by side in a way that becomes unreadable on small screens.
- The footer links compress into an unusable strip at narrow widths.
- The page creates too much horizontal pressure from long feature lists, ribbons, and CTA buttons.
- There are two overlapping pricing CSS sections in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css), which increases the risk of conflicting responsive behavior.

Relevant code:
- Pricing markup is generated in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- Footer markup lives in [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- Footer styles live near the main footer block in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- Pricing styles are defined in two pricing sections inside [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

## Product Standard

For launch, mobile pricing does **not** need to feel perfect.

It **does** need to:
- be readable without sideways scrolling
- keep CTA buttons visible and tappable
- preserve the meaning of the four plans
- keep FAQ usable
- keep footer links reachable without collapsing into illegible text

## Phase 1: Normalize The CSS Source Of Truth

Before tuning mobile behavior, reduce pricing-style conflicts.

Tasks:
- identify the duplicate pricing blocks in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- choose one pricing block as canonical
- remove or consolidate duplicate declarations where they conflict
- keep the existing desktop appearance visually stable

Success criteria:
- pricing styles come from one primary ruleset
- mobile adjustments do not rely on fighting duplicate selectors

## Phase 2: Make Pricing Cards Mobile-Readable

Use a simple stacked-card approach below mobile breakpoint.

Tasks:
- force the pricing grid to a single-column stack on narrow screens
- reduce outer padding and inter-card gaps
- soften or reposition ribbons so they do not collide with content
- reduce feature-list density slightly:
  - tighter text
  - better line-height
  - clearer wrapping
- ensure CTA buttons remain full-width and visible
- prevent any horizontal overflow from card internals

Preferred outcome:
- one card per row
- visible name, price, 4 to 7 feature lines, CTA
- no clipped columns

## Phase 3: Make FAQ Readable On Mobile

Tasks:
- reduce question padding slightly
- ensure question text wraps cleanly
- keep chevrons aligned without truncating the text
- allow answer text to expand naturally without clipping

Success criteria:
- FAQ entries can be opened and read on a phone without layout breakage

## Phase 4: Make Footer Minimally Usable

Current footer is a narrow desktop strip. On mobile, the goal is not elegance, just legibility.

Tasks:
- remove the `Supericons v0.1.0` footer label so the footer only shows:
  - `Curly Mole Labs`
  - `GitHub`
  - `Pricing`
  - `Privacy`
  - `Terms`
  - `MCP`
  - `Contact`
- allow footer content to wrap on small screens
- move from strict single-line layout to stacked or multi-row layout below breakpoint
- preserve both left and right groups
- reduce letter spacing and uppercase harshness if needed for readability
- ensure links remain tap targets rather than collapsing into a cramped ribbon

Preferred mobile behavior:
- left meta on one row
- links on one or more wrapped rows
- centered or left-aligned consistently

## Phase 5: Verify Shell Stability

Because pricing is a full-width suppressed-panel view, confirm the rest of the shell still behaves correctly.

Checks:
- pricing still hides the customize panel
- no overlap with header controls
- no horizontal page scroll on common mobile widths
- footer remains attached and visible

## Test Widths

At minimum verify:
- 390px width
- 430px width
- 768px width

## Acceptance Criteria

This work is done when:
- pricing page has no sideways scrolling on mobile
- all four pricing cards are readable in a vertical flow
- CTA buttons are visible and tappable
- FAQ is readable and expandable
- footer no longer shows `Supericons v0.1.0`
- footer links are readable and usable on mobile
- desktop pricing layout is not materially regressed

## Non-Goals

This pass does not include:
- a full mobile-first pricing redesign
- reducing four plans to fewer plans
- adding carousel pricing cards
- sticky mobile CTA experiments
- major footer IA changes

## Recommended Implementation Order

1. Consolidate duplicate pricing CSS
2. Fix mobile pricing grid/card layout
3. Fix FAQ wrapping
4. Fix footer wrapping/layout
5. Run mobile smoke checks
