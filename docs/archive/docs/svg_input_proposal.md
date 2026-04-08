# SVG Input Support for the Supericons Converter

> Superseded for the current bug by [svg-to-png-logo-compatibility-plan.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/svg-to-png-logo-compatibility-plan.md).
>
> This proposal explores a broader SVG normalization and tracing workflow. The active bug is narrower: stabilizing the existing `SVG -> PNG` path when uploaded SVGs depend on external resources such as font `@import` directives.

## The Problem

The Supericons converter currently only accepts raster (PNG) input. Users expect to paste or upload any image, including SVG. Complex SVGs fail silently across most converters due to external font `@import` directives, nested `<svg>` viewports, and cross-viewport filter references.

The UX expectation is simple: **paste or upload anything, get a result**.

## The Core Insight

> Use the browser itself as the SVG preprocessor. It already solves every hard rendering problem (fonts, filters, viewports, CSS). We just need to capture its output.

Every converter that fails does so because it tries to parse SVG as data. The browser doesn't parse it, it **renders** it. That is the difference.

---

## Proposed Architecture: The SVG Normalization Pipeline

When the converter detects SVG input (by checking for `<svg` or `.svg` extension), it routes through a 3-stage pipeline before the existing PNG-to-SVG tracer ever sees anything.

### Stage 1: Inline External Resources

Before rendering, rewrite the SVG string to make it self-contained:

| What | How |
|---|---|
| `@import url(...)` Google Fonts | `fetch()` the CSS, extract `woff2` URLs, `fetch()` those as ArrayBuffer, Base64-encode them, replace `@import` with inline `@font-face` declarations |
| `<image href="...">` | Fetch and inline as Base64 data URIs |
| `<use href="...">` | Resolve and inline the referenced elements |

This makes the SVG a **closed system** with zero external dependencies.

### Stage 2: DOM-Inject and Render

This is the novel part. Instead of loading the SVG into `<img>` (which sandboxes it and blocks fonts/scripts), inject it **directly into the DOM** as inline SVG inside a hidden, offscreen container:

```
1. Create a hidden div (position: absolute; left: -9999px; top: -9999px)
2. Set innerHTML to the inlined SVG string from Stage 1
3. Wait for document.fonts.ready (ensures any @font-face fonts have loaded)
4. Use svgElement.getBBox() to measure the actual rendered bounds
5. Set explicit width/height on the SVG from the measured bounds
```

The browser now has a fully rendered, pixel-accurate SVG in the DOM. Fonts are loaded. Filters are applied. Nested viewports are composed. Everything works because this is what browsers are built to do.

### Stage 3: Rasterize via Canvas

Now extract the rendered result as a bitmap:

```
1. Serialize the DOM SVG back to string via XMLSerializer
   (this captures the fully-resolved, DOM-rendered state)
2. Create a Blob(type: 'image/svg+xml') from the serialized string
3. Create an Object URL from the Blob
4. Load the Object URL into an <img> element
5. On img.onload, draw to a <canvas> at the target resolution
6. Extract pixel data from canvas via getImageData() or toDataURL()
7. Feed the bitmap into the existing PNG-to-SVG tracing pipeline
8. Clean up: revoke Object URL, remove hidden div
```

Because the SVG was already inlined in Stage 1, the `<img>` load in step 4 requires zero external resources. No fonts to fetch, no images to load. It renders instantly and identically.

---

## Architecture Diagram

```
User Input (paste/upload)
         |
    [Format Detection]
         |
    SVG detected?
    /          \
  No            Yes
  |              |
  |         [Stage 1: Inline]
  |         Fetch fonts, images,
  |         replace @import with
  |         base64 @font-face
  |              |
  |         [Stage 2: DOM Render]
  |         Inject into hidden div,
  |         wait for fonts.ready,
  |         measure with getBBox
  |              |
  |         [Stage 3: Rasterize]
  |         Serialize -> Blob ->
  |         <img> -> <canvas> ->
  |         pixel data
  |              |
  \______________/
         |
  [Existing PNG-to-SVG Tracer]
         |
      Output SVG
```

---

## Why This Approach is Novel

1. **Zero new dependencies.** No wasm rasterizer, no headless browser, no server. Pure browser APIs.
2. **The browser IS the renderer.** Instead of reimplementing SVG rendering (which every converter tries and fails at), we delegate to the only software that renders SVGs perfectly: the browser.
3. **Stage 1 makes Stage 3 deterministic.** Most canvas-based SVG rasterizers fail because the SVG still has external dependencies when it hits `<img>`. By inlining everything first, the `<img>` → `<canvas>` path becomes 100% reliable.
4. **Invisible to the user.** The entire pipeline runs in sub-second time for typical SVGs. The UX remains: paste, click, get result.
5. **Graceful degradation.** If Stage 1 fails to fetch a font (CORS, offline), the browser falls back to the CSS font stack (e.g., Arial). The conversion still succeeds, just with a substituted font. This is better than every existing converter, which simply fails.

---

## Edge Cases and Mitigations

| Edge Case | Mitigation |
|---|---|
| CORS-blocked Google Fonts woff2 | Google Fonts serves with `Access-Control-Allow-Origin: *`, so this should not happen. If it does, fall back to system font. |
| Animated SVGs (SMIL, CSS keyframes) | Capture a single frame at `t=0`. The tracer works on static shapes anyway. |
| Very large SVGs (>10MB paths) | Cap canvas resolution at 4096x4096. Show a warning if bounds exceed this. |
| SVGs with `<script>` tags | Strip all `<script>` elements during Stage 1 as a security precaution. |
| SVGs using `currentColor` | Resolve to black (#000) or allow user to pick a fallback color. |
| Text-heavy SVGs | The tracer will convert text outlines into paths, which is expected behavior for a logo/icon converter. |

---

## Implementation Scope

### Files to modify

| File | Change |
|---|---|
| `store.js` (converter section) | Add SVG detection at the input gate. Route SVG input through the normalization pipeline before the existing tracer. |
| `store.js` (new function) | `normalizeSvg(svgString)`: the 3-stage pipeline (inline, render, rasterize). Returns a canvas ImageData or PNG data URL. |
| `style.css` | Add `.converter-hidden-render` offscreen container styles. |

### Files unchanged
- Existing PNG-to-SVG tracer logic (it receives a bitmap either way)
- All other converter UI (dropzone, output preview, download button)
- No new npm dependencies

### Estimated effort
- ~150-200 lines of new JS (mostly the font inlining fetch logic)
- ~5 lines of CSS
- 0 new dependencies

---

## Verification Plan

### Manual Testing (in-browser)
1. Open the converter page
2. Upload the `docs/supericons-logo.svg` file (the file that currently fails)
3. Verify: the logo mark and "Supericons" text render in the preview
4. Verify: the tracer produces a valid SVG output with the shape traced
5. Test with a simple SVG (single `<path>`, no fonts, no filters) to confirm the happy path still works
6. Test with an SVG that uses Google Fonts `@import` to confirm font inlining
7. Test with a regular PNG upload to confirm the existing pipeline is unaffected

### Automated Checks
- No existing test suite was found for the converter. Given this is a purely client-side, visual tool, manual browser testing is appropriate.

---

## Decision Required

This proposal adds **SVG input** as a new capability to the converter. It does NOT change the existing PNG-to-SVG pipeline. The SVG normalization pipeline acts as a preprocessor that converts SVG into a bitmap before the tracer ever sees it.

> [!NOTE]
> This approach converts SVG to raster to SVG. The output will be a traced vector, not a 1:1 copy of the original SVG. This is appropriate for the converter's purpose (producing clean, single-path icon SVGs from any input), but it means complex multi-color SVGs will be simplified during tracing, just as they would be if the user had screenshotted the SVG and uploaded the PNG.
