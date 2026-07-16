# Icons Lab Canvas-First UX Plan

Date: 2026-06-20

## Goal

Redesign Icons Lab from a presentation-style AI dashboard into a practical icon creation workspace.

The first screen should answer one question immediately: "Where do I make the icon?"

## Product Shape

Icons Lab should feel like a hybrid of:

- A vector editor for precise icon craft.
- An agentic coding harness for instruction, iteration, review, and traceability.
- A Supericons quality system for style recipes, QA, preview sizes, metadata, and export staging.

It should not feel like:

- A landing page.
- A strategy dashboard.
- A generic AI chat wrapper.
- A professional vector editor with every possible feature exposed at once.

## Primary User Journey

1. Open Icons Lab.
2. See a blank 24x24 canvas with keyline grid, safe area, and core tools.
3. Choose a start path:
   - Blank icon.
   - Template.
   - Import SVG.
   - Ask agent.
4. Create or generate an icon on the canvas.
5. Select layers and inspect vector properties.
6. Adjust stroke, alignment, symmetry, and grid fit.
7. Ask the agent to refine, simplify, compare, or generate variants.
8. Run static QA and preview at required sizes.
9. Approve for owner review or stage for export.

## First Screen

The first screen should be a workspace, not an overview.

Required layout:

- Top bar: project controls, recipe, preview, QA, export.
- Left rail: vector tools and template/layer access.
- Center: 24x24 canvas as the dominant surface.
- Right inspector: position, stroke, fill, radius, alignment, QA.
- Agent dock: messages, composer, proposed actions.
- Bottom strip: templates, variants, and preview sizes.

## UX Principles

1. Canvas first.
   The canvas should be the visual center of gravity.

2. Agent as partner, not page owner.
   The agent should help create and refine icon work, but the user should always see and control the icon.

3. Progressive power.
   Start with essential icon tools. Reveal advanced vector details only when an object is selected.

4. Taste loop.
   The app should let the human owner approve, reject, and steer taste.

5. Static quality before motion.
   Dynamic and interactive states come after the static icon is clean.

## Prototype Slice To Build Now

This implementation slice should replace the current dashboard-like UI with:

- Blank-canvas-first editor layout.
- Start cards for Blank, Template, Import SVG, and Ask Agent.
- Tool rail with select, pen, line, rectangle, circle, mirror, snap, and preview tools.
- Center canvas with keyline grid and a sample editable draft.
- Layer list.
- Inspector with recipe-bound properties.
- Agent messages and composer.
- Template/variant strip.
- QA and preview panel.

## Out Of Scope For This Slice

- Real path editing.
- File import parser.
- Backend agent orchestration.
- Persisted projects.
- Publishing into the public Supericons registry.
- Dynamic or animated icon states.

## Success Criteria

- The prototype opens directly into an icon-making workspace.
- The canvas is the clearest object on the screen.
- The user can understand the creation journey without reading a strategy panel.
- Build passes.
- Browser check confirms the app renders.
