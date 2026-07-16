# Icons Lab Inkscape Minimum Editor Map

Date: 2026-06-20

## Verified Local Inkscape Install

Installed executable:

```text
C:\Program Files\Inkscape\bin\inkscape.exe
```

Version checked locally:

```text
Inkscape 1.3.2 (091e20e, 2023-11-25, custom)
```

Local sources inspected:

- `C:\Program Files\Inkscape\share\inkscape\ui\toolbar-tool.ui`
- `C:\Program Files\Inkscape\share\inkscape\ui\menus.ui`
- `C:\Program Files\Inkscape\share\inkscape\keys\default.xml`
- `C:\Program Files\Inkscape\share\inkscape\tutorials\tutorial-basic.svg`
- Inkscape CLI help and action list.

Local command checks also confirmed that Inkscape can query object geometry and export Supericons SVGs.

## What We Should Learn From Inkscape

Inkscape is powerful because it starts with real creation primitives:

- Select objects.
- Edit nodes and paths.
- Draw basic shapes.
- Draw paths.
- Transform objects.
- Inspect fill and stroke.
- Manage object/layer order.
- Align and distribute.
- Zoom and pan.
- Export clean assets.

Icons Lab should begin there, but much smaller.

## What We Should Not Copy

Do not copy the full Inkscape surface.

Avoid for Icons Lab V1:

- Mesh gradients.
- Spray/tweak tools.
- Text editing.
- Complex filters.
- Bitmap effects.
- Markers.
- Advanced path effects.
- Full document layout tools.
- Full illustration workflows.

These are useful in Inkscape, but they are not the minimum path to a high-quality icon builder.

## Icons Lab UI Honesty Rule

Do not show a tool unless it works.

This means the next prototype should remove or hide:

- Agent chat if it does not modify the document.
- Import button if no SVG parser is wired.
- Export button if no SVG output is generated.
- QA button if no real QA checks run.
- Fake vector handles if they cannot select or move anything.
- Fake layers if they are not connected to actual SVG elements.

The UI should feel simpler, but more real.

## Minimum Editor Core

### 1. Document

Icons Lab document model:

```text
viewBox: 0 0 24 24
safeArea: 2px
grid: 1px major, 0.5px optional minor
defaultStroke: currentColor
defaultStrokeWidth: 1.5
defaultLineCap: round
defaultLineJoin: round
defaultFill: none
```

### 2. Tools To Implement First

| Inkscape Tool | Icons Lab Equivalent | V1 Behavior |
| --- | --- | --- |
| Select | Select / move | Click SVG element, drag to move, show bounding box. |
| Node | Node edit | Select path points and move them on the grid. |
| Rectangle | Rect | Drag or click to add rect with radius. |
| Ellipse / Arc | Circle | Drag or click to add circle/ellipse. |
| Pen | Path | Click points to create a polyline/path. |
| Zoom | Zoom / fit | Zoom canvas, fit to icon. |

Line can be implemented as a simplified path tool.

### 3. Inspector To Implement First

Only show fields backed by selected SVG data:

- X.
- Y.
- Width.
- Height.
- Stroke width.
- Stroke cap.
- Stroke join.
- Fill.
- Corner radius for rect.
- Element type.

### 4. Layers To Implement First

Layers should be a list of actual SVG elements.

Required V1 actions:

- Select layer.
- Rename layer.
- Reorder layer.
- Hide/show layer.
- Delete layer.

Do not show symbolic layer names unless they come from real element metadata.

### 5. Canvas To Implement First

Canvas should be the real editor:

- SVG artboard.
- 24x24 viewBox.
- Visible keyline/safe-area overlay.
- Click to select.
- Drag to move.
- Snap to grid.
- Keyboard delete.
- Undo and redo.

### 6. Export To Implement First

Export must produce a real SVG string from the current document.

Optional local Inkscape helper:

```powershell
& 'C:\Program Files\Inkscape\bin\inkscape.exe' input.svg --export-plain-svg --export-filename=output.svg
```

Optional preview export:

```powershell
& 'C:\Program Files\Inkscape\bin\inkscape.exe' input.svg --export-filename=preview.png --export-width=128 --export-height=128
```

Optional geometry query:

```powershell
& 'C:\Program Files\Inkscape\bin\inkscape.exe' -S input.svg
```

## Recommended Build Sequence

### Slice 1: Honest Blank Canvas

Build only:

- 24x24 SVG canvas.
- Select tool.
- Rect tool.
- Circle tool.
- Element list.
- Basic inspector.
- Export current SVG.

No agent, no fake import, no fake QA.

### Slice 2: Path And Node Editing

Add:

- Line/path tool.
- Select path nodes.
- Move nodes with grid snap.
- Convert selected basic shape to path if needed.

### Slice 3: Icon Craft Controls

Add:

- Stroke width.
- Round caps and joins.
- Corner radius.
- Align center.
- Fit to safe area.
- Duplicate/delete.
- Undo/redo.

### Slice 4: Real QA

Add checks already used by the static core:

- `viewBox`.
- `currentColor`.
- Stroke width.
- Safe area.
- Raster embeds.
- Hidden text.
- Shape count.
- Recipe compliance.

### Slice 5: Agent Harness

Only after the editor can change the document:

- Agent can add shapes.
- Agent can edit selected object.
- Agent can run QA.
- Agent can generate variants.
- Agent can explain what changed.

## Product Direction

Icons Lab should not be a smaller Inkscape clone.

It should be an icon-specific editor with agent assistance:

- Less surface area than Inkscape.
- More icon discipline than Figma.
- More structured output than AI image tools.
- Real tools before AI decoration.

The first honest milestone is a small working vector editor for 24x24 SVG icons.
