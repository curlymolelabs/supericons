# Supericons Tools PRD v2

## Tool 1: Motion Lab

> Visual CSS animation editor for SVG icons. Build, preview, and export hover animations.

### Why "Motion Lab"
- Short, memorable, implies experimentation
- SEO-friendly ("svg motion", "icon animation")
- Neutral enough to rank for generic queries, branded enough to own

### The Problem
Developers want animated icons but:
- Hand-writing `@keyframes` CSS for SVG elements is tedious and error-prone
- You can't see what you're building until you reload
- Matching animations to specific SVG sub-elements (paths, circles, groups) requires manual DOM inspection
- No existing tool combines SVG element selection with a visual timeline editor

### The Opportunity
Supericons already has 400 hand-crafted animations. Motion Lab lets users:
1. **Learn** by deconstructing existing Supericons animations (drives pack sales)
2. **Create** their own animations on any SVG (drives Pro retention)
3. **Export** production-ready CSS + SVG (drives upgrade pressure)

---

### UI Layout

```
+------------------------------------------------------------------+
|  MOTION LAB                                    [Import SVG] [Pro] |
+------------------------------------------------------------------+
|                    |                            |                  |
|   ELEMENT TREE     |      CANVAS                |  PROPERTIES     |
|                    |                            |                  |
|   > svg            |   +------------------+    |  Transform       |
|     > g#head       |   |                  |    |    X: [0]  Y:[0] |
|     > circle.bg  * |   |    (SVG preview   |    |    Scale: [1.0]  |
|     > path.ring    |   |     with hover    |    |    Rotate: [0]   |
|     > path.mark    |   |     preview)      |    |  Opacity         |
|                    |   |                  |    |    [1.0]          |
|   PRESETS          |   +------------------+    |  Stroke           |
|   [Pulse] [Bounce] |                            |    dashoffset:[0] |
|   [Spin]  [Shake]  |   Trigger: (o) Hover       |    width: [1.5]  |
|   [Float] [Pop]    |           ( ) Click        |  Fill             |
|                    |           ( ) Auto-loop    |    color: [#000]  |
|                    |                            |  Easing            |
|                    |                            |    [ease-in-out v] |
|                    |                            |    [cubic-bezier]  |
+------------------------------------------------------------------+
|  TIMELINE                                           0ms    500ms  |
|  circle.bg  : ----[K]--------------------[K]----->                |
|  path.ring  : ---------[K]----------[K]--------->                |
|  path.mark  : [K]---------------------------[K]->                |
|                                                                    |
|  [Play] [Pause]  Duration: [500ms]  [Add Keyframe]  [Export CSS]  |
+------------------------------------------------------------------+
```

### Interaction Flows

#### Flow 1: Load an Icon
1. User clicks "Motion Lab" in sidebar under TOOLS section
2. Empty state: "Drag an SVG here, paste SVG code, or pick from your library"
3. Three entry points:
   - **File upload**: Drag/drop or file picker (accepts .svg)
   - **Paste**: Paste raw SVG markup into a code editor panel
   - **Library picker**: Modal showing Supericons library grid. Click any icon to load it.
   - **Remix** (Pro): Click "Remix" on any premium icon in the collection detail view to open it in Motion Lab with its existing animation pre-loaded

#### Flow 2: Select Elements
1. SVG renders in the canvas at 128x128
2. Element tree (left panel) shows the SVG DOM hierarchy
3. **Click on canvas**: Highlights the element under cursor with a blue dashed bounding box. Selects it in the tree.
4. **Click on tree node**: Highlights the corresponding element on canvas
5. **Multi-select**: Cmd/Ctrl+Click to select multiple elements
6. Selected elements get a colored dot indicator in the tree (each gets a unique track color)

#### Flow 3: Add Animation
1. Select an element (e.g., `circle.bg`)
2. A track appears in the timeline for that element
3. Click "Add Keyframe" or double-click on the timeline track at a position
4. A keyframe marker (diamond shape) appears on the track
5. Properties panel shows animatable properties at that keyframe:
   - **Transform**: translateX, translateY, scale, rotate, skewX, skewY
   - **Opacity**: 0 to 1
   - **Stroke**: dashoffset, dasharray, width
   - **Fill**: color (with color picker)
   - **Custom**: raw CSS property input for advanced users
6. Edit property values. Changes preview live on canvas.
7. Add more keyframes by clicking on the timeline
8. Drag keyframes horizontally to adjust timing

#### Flow 4: Preview
1. **Hover mode** (default): Hovering over the canvas triggers the animation. Leaving resets.
2. **Auto-loop mode**: Animation loops continuously
3. **Scrub mode**: Drag the playhead across the timeline to manually scrub through the animation
4. **Speed control**: 0.25x, 0.5x, 1x, 2x playback speed
5. **Ghost mode**: Toggle to show the resting state as a faded overlay during animation (helps see delta)

#### Flow 5: Presets
1. Left panel "PRESETS" section offers common animation patterns:
   - **Pulse**: scale 1 -> 1.15 -> 1, ease-in-out
   - **Bounce**: translateY 0 -> -4px -> 0, cubic-bezier bounce
   - **Spin**: rotate 0 -> 360deg, linear
   - **Shake**: translateX 0 -> -2px -> 2px -> 0, ease-out
   - **Float**: translateY 0 -> -3px -> 0, ease-in-out, infinite
   - **Pop**: scale 0.8 -> 1.1 -> 1, cubic-bezier overshoot
   - **Stroke draw**: dashoffset 100% -> 0%, ease-in-out
   - **Fade in**: opacity 0 -> 1
   - **Color shift**: fill color A -> color B
2. Click a preset to apply it to the selected element(s)
3. Presets are starting points. User can modify after applying.

#### Flow 6: Export
1. Click "Export CSS" button
2. Modal shows generated code:
   - **CSS only**: `@keyframes` + selector rules (`.my-icon:hover .element { ... }`)
   - **Self-contained SVG**: SVG with embedded `<style>` block
   - **React component**: SVG wrapped in a React component with hover state
3. **Copy to clipboard** button for each format
4. **Download** button (saves .css, .svg, or .jsx file)

### Free vs Pro Gating

| Feature | Free | Pro |
|---|---|---|
| Load any SVG (upload, paste, library) | Yes | Yes |
| Element selection and tree | Yes | Yes |
| Timeline with up to 3 keyframes per element | Yes | Yes |
| Presets (apply to selected elements) | Yes | Yes |
| Live preview (hover, loop, scrub) | Yes | Yes |
| Easing curve editor | Yes | Yes |
| Unlimited keyframes per element | No | Yes |
| Export CSS code | No | Yes |
| Export self-contained SVG | No | Yes |
| Export React component | No | Yes |
| Remix premium Supericons animations | No | Yes (requires pack ownership) |
| Save animations to account | No | Yes |
| Load saved animations | No | Yes |

> [!IMPORTANT]
> **The gate is on export, not creation.** Free users can build and preview unlimited animations. They just can't extract the code. This maximizes engagement and creates strong upgrade pressure ("I already built it, I just need to export it").

### State Management

```javascript
const motionLabState = {
  svg: null,                    // Raw SVG string
  elements: [],                 // Parsed element tree [{id, tag, classes, children}]
  selectedElements: new Set(),  // Currently selected element IDs
  tracks: {                     // Animation tracks by element ID
    'circle.bg': {
      keyframes: [
        { offset: 0, props: { opacity: 0.15, transform: 'scale(1)' } },
        { offset: 0.5, props: { opacity: 0.4, transform: 'scale(1.1)' } },
        { offset: 1, props: { opacity: 0.15, transform: 'scale(1)' } },
      ],
      easing: 'ease-in-out',
      duration: 500,
    }
  },
  playback: {
    mode: 'hover',             // 'hover' | 'loop' | 'scrub'
    speed: 1,
    currentTime: 0,
    isPlaying: false,
  },
  trigger: 'hover',            // 'hover' | 'click' | 'auto'
};
```

### Animation Engine

The engine translates `motionLabState.tracks` into live CSS:

1. **Generate @keyframes**: For each track, produce a `@keyframes` rule from the keyframe array
2. **Generate selectors**: Based on trigger mode, generate `.container:hover .element` or `.container .element` rules
3. **Inject into preview**: Create/update a `<style>` element inside the preview container
4. **Hot-reload**: On any state change, regenerate CSS and re-inject. No page reload.

```javascript
function generateCSS(tracks, trigger, containerClass) {
  let css = '';
  for (const [elementSelector, track] of Object.entries(tracks)) {
    const kfName = `ml-${elementSelector.replace(/[^a-z0-9]/g, '')}`;
    
    // Build @keyframes
    css += `@keyframes ${kfName} {\n`;
    for (const kf of track.keyframes) {
      css += `  ${kf.offset * 100}% {\n`;
      for (const [prop, val] of Object.entries(kf.props)) {
        css += `    ${prop}: ${val};\n`;
      }
      css += `  }\n`;
    }
    css += `}\n`;
    
    // Build selector
    const prefix = trigger === 'hover' 
      ? `.${containerClass}:hover` 
      : `.${containerClass}`;
    css += `${prefix} .${elementSelector} {\n`;
    css += `  animation: ${kfName} ${track.duration}ms ${track.easing};\n`;
    css += `}\n\n`;
  }
  return css;
}
```

### Element Selection Engine

SVG elements need unique selectors. Strategy:
1. If element has `id` attribute: use `#id`
2. If element has `class` attribute: use `.classname`
3. Otherwise: generate positional selector (`svg > g:nth-child(2) > path:nth-child(1)`)
4. Store generated selector on each tree node for CSS generation

### Easing Curve Editor

Visual cubic-bezier editor:
- 200x200 canvas showing the bezier curve
- 4 control points (2 fixed at corners, 2 draggable handles)
- Presets dropdown: ease, ease-in, ease-out, ease-in-out, linear
- Named presets: bounce, elastic, overshoot
- Output: `cubic-bezier(x1, y1, x2, y2)` string
- Reference: model after [cubic-bezier.com](https://cubic-bezier.com)

### Technical Notes

- **No external dependencies.** Pure vanilla JS + Canvas API for the bezier editor.
- **SVG parsing**: Use `DOMParser` to parse SVG string, walk the DOM tree to build element list.
- **Hit testing**: For canvas click-to-select, use `document.elementFromPoint()` on the rendered SVG.
- **Timeline rendering**: Canvas-based (not DOM) for smooth scrubbing performance.
- **Undo/Redo**: Simple command stack. Each state change pushes to history. Ctrl+Z/Y to navigate.

### Estimated Effort
3-4 focused sessions:
- Session 1: UI shell, SVG loading, element tree, canvas preview
- Session 2: Timeline, keyframe editing, CSS generation, live preview
- Session 3: Presets, easing editor, export modal, Pro gating
- Session 4: Polish, undo/redo, save/load, edge cases

---

## Tool 2: Icon Converter

> Bidirectional SVG/PNG converter. SVG to PNG (rasterize) and PNG to SVG (trace).

### Why One Tool, Not Two
Developers need both directions. Combining them into a single interface with a direction toggle:
- Reduces navigation friction
- Shares UI patterns (file upload, size controls, preview)
- Better SEO (one page ranks for both query clusters)
- Simpler maintenance

### UI Layout

```
+------------------------------------------------------------------+
|  ICON CONVERTER         [SVG -> PNG]  [PNG -> SVG]     [Pro]      |
+------------------------------------------------------------------+
|                                                                    |
|  +-------------------+        +-------------------+               |
|  |                   |        |                   |               |
|  |   INPUT PREVIEW   |  --->  |  OUTPUT PREVIEW   |               |
|  |                   |        |                   |               |
|  |   (drag file here |        |  (live preview    |               |
|  |    or paste)      |        |   at target size) |               |
|  |                   |        |                   |               |
|  +-------------------+        +-------------------+               |
|                                                                    |
|  OPTIONS                                                           |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ Size: [16] [24] [32] [48] [64] [128] [256] [512] [Custom]  │  |
|  │ Background: (o) Transparent  ( ) White  ( ) Custom [____]   │  |
|  │ Padding: [0px] ──────────────────○──── [32px]               │  |
|  │ Quality: (o) 1x  ( ) 2x  ( ) 3x  ( ) 4x                   │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                    |
|  [Download PNG]  [Copy to Clipboard]                               |
|                                                                    |
|  ── BATCH MODE (Pro) ──────────────────────────────────────────── |
|  │ Drop multiple files or select from library                    │  |
|  │ [icon1.svg ✓] [icon2.svg ✓] [icon3.svg ✓] ... +42 more      │  |
|  │ Sizes: [x] 16  [x] 32  [x] 64  [ ] 128  [ ] 256  [ ] 512   │  |
|  │                                                [Download ZIP] │  |
|  └───────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
```

---

### Mode A: SVG to PNG

#### Features

| Feature | Free | Pro |
|---|---|---|
| Convert single SVG to PNG | Yes | Yes |
| Size presets (16 to 512) | Yes | Yes |
| Custom size input (any px value) | Yes | Yes |
| Background color (transparent, white, custom) | Yes | Yes |
| Padding control (0-32px slider) | Yes | Yes |
| Retina quality (1x, 2x, 3x, 4x) | Yes | Yes |
| Live preview at target size | Yes | Yes |
| Copy PNG to clipboard | Yes | Yes |
| Download single PNG | Yes | Yes |
| Batch convert (multi-file drop) | No | Yes |
| Multi-size batch (multiple sizes at once) | No | Yes |
| Download all as ZIP | No | Yes |
| Favicon set (16, 32, ICO + manifest.json) | No | Yes |
| iOS app icon set (all required sizes) | No | Yes |
| Android app icon set (mdpi to xxxhdpi) | No | Yes |

#### Technical: SVG to PNG Pipeline

```
SVG String
    |
    v
[Create <img> element, src = data:image/svg+xml;base64,{encoded}]
    |
    v
[Wait for img.onload]
    |
    v
[Create <canvas> at target dimensions]
    |
    v
[Set background fill if not transparent]
    |
    v
[Draw img onto canvas with padding offset]
    |
    v
[canvas.toBlob('image/png')] --> Download / Clipboard
```

**Edge cases:**
- SVGs without explicit `width`/`height`: use `viewBox` to determine aspect ratio
- SVGs with external references (`<use href="...">`, `url(...)`): inline them first
- SVGs with `<text>` elements: may render differently across browsers (warn user)
- Very large target sizes (>4096px): warn about memory usage

#### Favicon Generation (Pro)

Generate a complete favicon package:
```
favicon-package/
  favicon.ico          (16x16 + 32x32 multi-resolution)
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png (180x180)
  android-chrome-192x192.png
  android-chrome-512x512.png
  site.webmanifest     (JSON with icon references)
  browserconfig.xml    (IE/Edge tile config)
```

#### App Icon Sets (Pro)

**iOS:**
| Size | Scale | Output |
|---|---|---|
| 20pt | 2x, 3x | 40x40, 60x60 |
| 29pt | 2x, 3x | 58x58, 87x87 |
| 40pt | 2x, 3x | 80x80, 120x120 |
| 60pt | 2x, 3x | 120x120, 180x180 |
| 76pt | 2x | 152x152 |
| 83.5pt | 2x | 167x167 |
| 1024pt | 1x | 1024x1024 |

**Android:**
| Density | Size |
|---|---|
| mdpi | 48x48 |
| hdpi | 72x72 |
| xhdpi | 96x96 |
| xxhdpi | 144x144 |
| xxxhdpi | 192x192 |
| Play Store | 512x512 |

---

### Mode B: PNG to SVG

#### Features

| Feature | Free | Pro |
|---|---|---|
| Convert single PNG to SVG | Yes | Yes |
| Live preview of traced output | Yes | Yes |
| Threshold control (slider) | Yes | Yes |
| Detail level (low, medium, high) | Yes | Yes |
| Color mode: monochrome or color | Yes | Yes |
| Path simplification control | Yes | Yes |
| Download traced SVG | Yes | Yes |
| Copy SVG code to clipboard | Yes | Yes |
| Batch convert (multi-file drop) | No | Yes |
| Download all as ZIP | No | Yes |
| Manual path editing after trace | No | Yes |

#### Technical: PNG to SVG Pipeline

```
PNG File / Drag-drop / Paste
    |
    v
[Load into <canvas>, get ImageData]
    |
    v
[Convert to grayscale if monochrome mode]
    |
    v
[Apply threshold to create 1-bit bitmap]
    |
    v
[potrace.js: bitmap -> SVG path data]
    |
    v
[Apply path simplification based on detail level]
    |
    v
[Generate clean SVG with viewBox, no raster data]
    |
    v
[Display in output preview] --> Download / Copy
```

**Library:** Use [potrace-wasm](https://github.com/nicedoc/nicedoc.io) or [imagetracer.js](https://github.com/nicedoc/nicedoc.io) (both MIT). Potrace produces cleaner output for icon-style images.

**Color tracing:** For multi-color PNGs:
1. Quantize to N colors (user-configurable, 2-16)
2. Create separate 1-bit layers per color
3. Trace each layer independently
4. Combine into a single SVG with colored `<path>` elements

**Threshold control (monochrome):**
- Slider 0-255
- Live preview updates as slider moves
- Auto-detect optimal threshold via Otsu's method (default)

**Detail level:**
- Low: aggressive path simplification (fewest control points, smallest file)
- Medium: balanced (default)
- High: preserve fine details (more control points, larger file)

Maps to potrace `turdsize` (suppress speckles) and `alphamax` (corner threshold) parameters.

---

### Shared UI Components

Both modes share:
- **File drop zone**: Dotted border area, accepts drag-drop and click-to-browse
- **Clipboard paste**: Ctrl+V to paste image/SVG from clipboard
- **Preview panels**: Side-by-side input/output with zoom controls
- **Download button**: Primary CTA, always visible
- **Size display**: Shows input and output file sizes for comparison

### Routing

Sidebar entry: **"Converter"** under TOOLS section
URL: Internal view (like Collections, Pricing), triggered via `switchView('converter')`

If separate SEO landing pages are needed later, we can add static HTML pages that link into the app.

### SEO Keywords

**SVG to PNG:**
- "svg to png" (~200K monthly searches)
- "convert svg to png online" (~50K)
- "svg to png converter" (~30K)
- "favicon generator from svg" (~10K)

**PNG to SVG:**
- "png to svg" (~150K monthly searches)
- "image to svg converter" (~20K)
- "png to vector" (~15K)
- "trace image to svg" (~5K)

Combined: ~480K+ monthly search volume. Highest traffic potential of any Supericons feature.

### Estimated Effort

2 sessions:
- Session 1: SVG-to-PNG mode (canvas pipeline, size controls, preview, download, favicon gen)
- Session 2: PNG-to-SVG mode (potrace integration, threshold UI, color tracing), batch mode, Pro gating

---

## Build Priority

| # | Tool | Sessions | Traffic | Pro Pressure | Ship Target |
|---|---|---|---|---|---|
| 1 | Motion Lab | 3-4 | Medium | Very High | Week 2 |
| 2 | Icon Converter | 2 | Very High | Medium | Week 1 |

> [!IMPORTANT]
> **Decision needed:** Build Motion Lab first (higher strategic value, unique differentiator) or Icon Converter first (faster to ship, higher traffic)?
>
> My recommendation: Ship Icon Converter in 2 sessions as the quick win for SEO traffic, then invest 3-4 sessions into Motion Lab as the premium feature.

## Open Questions

1. **Tool navigation:** New sidebar section "TOOLS" with sub-items (Motion Lab, Converter)? Or a tools landing page with cards?

2. **Motion Lab "Remix" flow:** When a user clicks "Remix" on a premium icon, should it open in a new view or replace the current collection detail view?

3. **Conversion limits for free users:** Should we limit PNG-to-SVG to images under a certain size (e.g., 1024x1024) for free users?

4. **potrace licensing:** potrace is GPL. We need a GPL-compatible alternative or a clean-room JS implementation. [imagetracer.js](https://github.com/nicedoc/nicedoc.io) (MIT) or [nicedoc.io's wasm build](https://github.com/nicedoc/nicedoc.io) are options. Need to verify.
