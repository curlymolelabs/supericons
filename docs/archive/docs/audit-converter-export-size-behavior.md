# Audit: PNG to SVG Export Size Behavior

## Question

Why does a large PNG input produce an oversized downloaded SVG, and what should change so users can reduce the exported size without breaking the preview?

## Short Answer

The converter is currently doing exactly what it was told to do:

- crop the raster source
- trace it
- set the downloaded SVG `viewBox`, `width`, and `height` to the cropped raster dimensions

That is technically consistent, but it is not product-friendly for large source logos.

## Root Cause

### 1. Export size is bound to the cropped source dimensions

The browser-side normalization path currently rewrites the SVG like this:

- in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), `normalizeSvgOutput(svgStr, originalW, originalH)`
- it removes existing `width`, `height`, and `viewBox`
- then rewrites them to:
  - `viewBox="0 0 originalW originalH"`
  - `width="originalW"`
  - `height="originalH"`

So if the cropped input is `1264x1170`, the downloaded SVG will also be exported at `1264x1170`.

### 2. The Node mono engine also starts from the cropped source dimensions

The mono engine config in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) sets:

- `attributes: viewBox="0 0 cropWidth cropHeight" width="cropWidth" height="cropHeight"`

That means the same “mirror the cropped raster size” behavior is present there too.

### 3. Preview size and export size are currently coupled conceptually

The UI metadata and preview size are driven by:

- `cropBounds.width`
- `cropBounds.height`

and `showConverterOutput(...)` stores those as `outputPreviewSize`.

That works for preview fitting, but it also reinforces the current export contract:

- source crop size
- preview reference size
- downloaded SVG size

are all treated as the same thing.

## Why This Feels Wrong

From a user point of view:

- the preview is for inspection
- the export size is for actual use

Those are not the same concern.

A user may want:

- a large source image for cleaner tracing
- but a normalized SVG export size for UI use

Right now, the converter does not let them separate those two goals.

## Important Clarification

Huge exported dimensions do **not** fully explain a large SVG file size in KB.

Most of the file size comes from:

- path count
- path complexity
- precision
- number of layers

The `width` and `height` attributes themselves are tiny strings.

So:

- oversized export dimensions are a real UX and usability problem
- but they are not the main reason a heavy trace is `300KB+`

That said, the user still needs control over exported dimensions because:

- large output dimensions are awkward in editors and design tools
- rendered size becomes confusing
- users expect some normalized export behavior

## Product Conclusion

The converter should treat these as separate concerns:

1. `trace source size`
2. `preview display size`
3. `exported SVG dimensions`

Only the first is inherently tied to the input PNG.

The third should become user-controlled.

## Recommended Direction

Add an explicit export sizing control for `PNG -> SVG`:

- keep tracing against the best available source crop
- keep preview fitting logic independent
- let users choose the downloaded SVG dimensions

The most important implementation principle is:

- preserve the original traced `viewBox`
- change exported `width` and `height` independently

That allows the same vector geometry to scale cleanly without retracing.

## Suggested UX Model

Add a small `Output Size` control with:

- `Auto`
- `Original`
- `Custom`

Where:

- `Auto` normalizes export size based on asset mode
- `Original` preserves the cropped raster dimensions
- `Custom` lets the user enter a target width in px, with height computed from aspect ratio

## Why This Is Better Than A Generic Scale Slider

A freeform scale slider would be harder to reason about because:

- the user does not know the current baseline dimension
- SVG export is usually consumed in absolute dimensions

An explicit size model is clearer:

- original
- normalized
- custom width

## Acceptance Criteria

For a large source like Shell:

- preview still looks correct and fits in the stage
- default export is not forced to `1264x1170`
- user can switch back to `Original` if desired
- copied/downloaded SVG reflects the chosen export dimensions

For smaller inputs:

- export defaults remain sensible
- preview behavior does not regress

