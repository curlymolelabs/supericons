# Icons Lab Refinement Plan

Date: 2026-06-20

## Goal

Refine the Icons Lab prototype from a working SVG skeleton into a focused icon editor. The editor should feel canvas-first, predictable, and useful for making Supericons-quality static icons without exposing low-value internal checks or raw SVG concepts too early.

## Design Direction

The default screen should prioritize:

1. A blank 24x24 artboard.
2. A small creation/editing tool rail.
3. An object stack for selecting and ordering shapes.
4. Contextual properties for the selected object.
5. A compact builder/composer for agent-assisted actions.
6. Export readiness as a small status, not a full visible panel.

## Current Problems To Fix

- `Checks` takes too much permanent UI space for information that should mostly be automatic.
- `Inspector` sounds technical and exposes raw labels such as `X1` and `Y2`.
- `Elements` is really an object stack, not a full layer system.
- Object ordering uses Up/Down buttons instead of drag ordering.
- Pen technically creates paths, but the lack of live preview makes it feel like selection is happening instead.
- Cap and join controls are visible even when they do not meaningfully affect the selected shape.
- Stroke and fill do not offer usable color controls.
- Alignment, positioning, and snapping are not presented as an editor workflow.
- Preview cells do not let the user check light, dark, and transparent usage intentionally.

## Implementation Slice

This pass will implement:

- Rename `Elements` to `Objects`.
- Rename `Inspector` to `Properties`.
- Keep quality checks available only through a compact readiness status.
- Add drag-to-reorder for object rows.
- Add contextual property labels:
  - Line endpoints become `Start X`, `Start Y`, `End X`, `End Y`.
  - Geometry and style are grouped visually.
  - Cap/join appear only for line and path style contexts.
- Add stroke and fill color controls with real SVG updates.
- Add selected-object alignment to the artboard.
- Add Pen live preview from the last placed point to the cursor.
- Add an explicit `Finish Path` action while drawing.
- Prevent Pen clicks from selecting existing objects.
- Add preview background modes for transparent, light, and dark.

## Deferred

These need a deeper interaction model and should not be faked in this slice:

- Multi-select.
- Distribution between multiple objects.
- Group and ungroup.
- Boolean operations.
- Freeform unsnapped drawing mode.
- Curve handles and smooth/corner node modes.
- Full layer hierarchy.

## Verification

- Model verification must pass.
- Production build must pass.
- Browser smoke must prove:
  - Pen creates a visible path with live preview behavior.
  - Object drag reorder changes stack order.
  - Color controls change SVG stroke or fill.
  - Alignment changes selected geometry.
  - Checks are hidden by default and surfaced as a compact readiness status.
  - Export includes edited geometry and styles.
