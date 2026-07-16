# Icons Lab Honest Editor Implementation Plan

Superseded for the next build slice by `docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md`, which keeps the honesty rule but changes the product emphasis from vector editor first to icon craft bench first.

Date: 2026-06-20

## Direction

Build Icons Lab as a real 24x24 SVG icon editor with an agent dock, not as a dashboard.

The latest mockup sets the right product shape:

- Vector editor first.
- Agent composer second.
- Canvas as the main work area.
- Tools shown only when they actually work.
- Static icon craft before dynamic/stateful features.

## Non-Negotiable Rule

Do not show fake controls.

If a feature is not wired, it should be hidden, disabled with a clear unavailable state, or excluded from the first slice.

This applies to:

- Import.
- Export.
- QA.
- Agent actions.
- Node handles.
- Layers.
- Preview sizes.
- Inspector fields.

## V1 User Journey

1. User opens Icons Lab.
2. They see a real blank 24x24 SVG artboard with grid, keyline, and safe area.
3. They choose a working tool: Select, Rectangle, Circle, Line, or Pen.
4. They draw or add a shape.
5. The shape appears as a real SVG element.
6. The element appears in the Elements list.
7. Selecting the element updates the Inspector.
8. Changing Inspector values updates the SVG.
9. User can move/delete/reorder elements.
10. User can preview the icon at required sizes.
11. User can export a real SVG string/file.
12. The agent dock can help only through wired local commands.

## Build Strategy

Do this in small truthful slices.

The first milestone should feel modest but real. It is better to have five working editor features than twenty fake ones.

## Milestone 1: Real Canvas And Elements

Goal: create the smallest usable icon editor.

Build:

- 24x24 SVG document model.
- Blank artboard with grid, safe area, and keyline overlay.
- Select tool.
- Rectangle tool.
- Circle tool.
- Line tool.
- Elements panel backed by the real SVG element array.
- Selection state.
- Delete selected element.
- Export current SVG.

Do not build yet:

- Agent chat.
- Import.
- QA.
- Path node editing.
- Boolean operations.
- Advanced alignment.

Success criteria:

- User can create a rectangle, circle, and line.
- Created elements render on the artboard.
- Elements appear in the Elements panel.
- Selecting an element highlights it.
- Deleting an element removes it from both canvas and list.
- Export produces a valid SVG with `viewBox="0 0 24 24"`.

## Milestone 2: Inspector And Transform Editing

Goal: make selected elements editable through real fields.

Build:

- Inspector panel for selected element.
- Editable X, Y, W, H fields for rect.
- Editable CX, CY, R fields for circle.
- Editable X1, Y1, X2, Y2 fields for line.
- Stroke width field.
- Stroke cap and join controls.
- Fill control limited to `none` or `currentColor`.
- Grid snapping for numeric fields.

Success criteria:

- Inspector never shows fields unrelated to the selected element type.
- Editing a field updates the live SVG.
- Values stay inside the 24x24 canvas unless freeform mode is explicitly enabled later.

## Milestone 3: Basic Interaction

Goal: make the canvas feel like an editor.

Build:

- Click element to select.
- Drag selected element.
- Snap movement to grid.
- Keyboard delete.
- Undo and redo.
- Zoom controls: fit, 100%, 200%, 400%.

Success criteria:

- User can work from the canvas without relying only on form fields.
- Undo/redo tracks element create, move, edit, delete.

## Milestone 4: Preview Strip

Goal: make icon quality visible at real use sizes.

Build:

- Preview sizes: 16, 20, 24, 32, 48, 128.
- Live update from current SVG document.
- Light and dark preview toggle.

Success criteria:

- Previews are generated from the same live SVG.
- Preview strip contains no placeholder icons.

## Milestone 5: Static QA

Goal: connect the editor to the existing static-core quality rules.

Build:

- `viewBox` check.
- `currentColor` check.
- Stroke width check.
- Safe area check.
- Hidden text check.
- Raster embed check.
- Shape count check.
- Recipe compliance summary.

Success criteria:

- QA reads the current editor document.
- QA results are real pass/warn/fail checks.
- QA does not claim taste approval.

## Milestone 6: Agent Dock With Real Local Commands

Goal: introduce agent interaction without pretending backend intelligence exists.

Build:

- Agent message list.
- Composer input.
- Local command parser for a tiny command set:
  - "add circle"
  - "add rectangle"
  - "center selected"
  - "simplify for 16px"
  - "run qa"
  - "export svg"
- Agent response explains the actual document mutation.

Do not build yet:

- Remote agent orchestration.
- Multistep autonomous editing.
- Model-generated SVG.
- Fake confidence scores.

Success criteria:

- Every agent response corresponds to a real local action.
- If the command is unsupported, the agent says it cannot do that yet.

## Milestone 7: Path And Node Editing

Goal: add the real icon-craft power needed for original icons.

Build:

- Pen tool creates polyline/path.
- Node mode selects path points.
- Drag nodes with snap.
- Add/remove node.
- Convert line/rect/circle to path.

Success criteria:

- Node handles are shown only for editable paths.
- Moving a node updates SVG path data.

## Milestone 8: Inkscape Helper Integration

Goal: use local Inkscape where it helps, without depending on it for basic editing.

Use Inkscape CLI for:

- Plain SVG cleanup.
- Geometry query.
- PNG preview export.

Known verified commands:

```powershell
& 'C:\Program Files\Inkscape\bin\inkscape.exe' -S input.svg
& 'C:\Program Files\Inkscape\bin\inkscape.exe' input.svg --export-plain-svg --export-filename=output.svg
& 'C:\Program Files\Inkscape\bin\inkscape.exe' input.svg --export-filename=preview.png --export-width=128 --export-height=128
```

Success criteria:

- Inkscape helper is optional.
- If Inkscape is unavailable, Icons Lab still edits and exports SVG.

## Proposed File Architecture

Keep this inside `icons-lab-prototype` until it becomes ready for the main app.

```text
icons-lab-prototype/src/
  App.jsx
  editor/
    documentModel.js
    svgExport.js
    geometry.js
    history.js
    qa.js
    agentCommands.js
  components/
    EditorShell.jsx
    ToolRail.jsx
    SvgCanvas.jsx
    ElementsPanel.jsx
    InspectorPanel.jsx
    PreviewStrip.jsx
    AgentDock.jsx
```

## Document Model

Minimum document shape:

```js
{
  viewBox: "0 0 24 24",
  recipeId: "si-outline-rounded-24",
  selectedElementId: "el_1",
  elements: [
    {
      id: "el_1",
      type: "rect",
      name: "rect-1",
      visible: true,
      attrs: {
        x: 6,
        y: 6,
        width: 12,
        height: 8,
        rx: 2,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.5,
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    }
  ]
}
```

## First Implementation Slice

The next coding task should be:

> Replace the current visual-only Icons Lab prototype with a working minimal SVG editor. Build a real 24x24 document model, working Select/Rect/Circle/Line tools, real Elements list, real Inspector fields for selected elements, delete selected element, live preview sizes, and SVG export. Hide agent/import/QA until their actions are wired.

## Verification Required

For each milestone:

- `npm run build`
- Browser render check.
- Interaction check for each tool.
- Exported SVG validity check.
- No visible placeholder controls.

For Milestone 1 specifically:

- Add rectangle.
- Add circle.
- Add line.
- Select each element.
- Delete selected element.
- Export SVG.
- Confirm exported SVG contains the exact live elements.

## Product Judgment

The mockup is the visual north star, but the build should be more modest than the mockup at first.

The correct first version may look simpler, because it should only show what works.

That is a feature, not a flaw.
