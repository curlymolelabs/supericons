# PNG to SVG Deep Audit: Split Fit and Tiny Icon Limits

Date: 2026-04-06

## Summary

Two issues remain in the current `PNG -> SVG` implementation:

1. `Split` compare mode does not fit correctly for larger logo outputs.
2. Tiny plain icons such as `alien-48px.png` and `air-balloon-48px.png` still come out thicker than the source.

These two issues have different root causes.

- The `Split` issue is a preview-layout bug and is straightforward to fix.
- The tiny icon issue is not primarily a preview or smoothing problem. It is a tracing-model limitation in the current icon path.

The current architecture is now strong for flat raster logos and weak for micro-icons.

## Evidence Reviewed

Recent manual benchmark images and screenshots:

- `Kfc_logo.png`
- `Shell_logo.svg.png`
- `McDonalds-logo-500x281.png`
- `alien-48px.png`
- `air-balloon-48px.png`

Observed behavior:

- `KFC`, `Shell`, `McDonald's`: generally good in `Logo` mode with the local Node proof service.
- `alien`, `air-balloon`: still visibly thicker than the source in `Icon` mode.
- `Split` compare for larger logos clips or overflows the output preview area.
- `Default` compare for larger logos now fits again after the earlier preview correction, but `Split` still uses the wrong fit model.

## Current Design

The current frontend uses:

- `Mode`: `Icon | Logo`
- `Preset`: `Auto | Compact | Exact`
- `Background`
- `Compare`: `Default | Split`
- `Helpers`: `Auto Crop`

The current runtime path is:

- frontend preprocessing in `store.js`
- local Node proof service in `tools/converter-proof-service/service.mjs`
- `@neplex/vectorizer` as the actual trace engine

The important architectural split is now:

- `Logo` mode: flat artwork / raster logo / color-region path
- `Icon` mode: tiny line icon / binary mask path

This split is valid.

## Finding 1: Split Compare Is Using the Wrong Fit Model

### What is happening

The preview scaling logic currently computes one base scale for the output image and then doubles the width in split mode.

In practice:

- `Default` view fits a single image to the stage.
- `Split` view reuses that single-image scale for each pane.
- Then it renders two panes side by side.
- Result: the total rendered width becomes too large and the content clips or overflows inside the preview card.

### Why it happens

The current logic in `updateConverterPreviewZoomUi()`:

- computes `outputPixelWidth` from a single-image preview scale
- applies that width to each split pane
- sets the split container width to `outputPixelWidth * 2`
- keeps the same base scale regardless of whether the compare mode is `Default` or `Split`

That means the split layout is effectively sized for two full-width previews inside a space designed for one.

### Conclusion

This is a layout bug, not a tracing bug.

## Finding 2: Tiny Icons Are Thick Because We Are Using Region Tracing, Not Stroke Reconstruction

### What is happening

Tiny white icons on transparent or dark backgrounds still come out thicker than the source, even after:

- stronger thresholding
- icon-only thinning
- icon-only erosion
- alpha gating for transparent icon fringes
- better upscale ordering
- smoothed upscale input

### Why it happens

The current `Icon` route still works like this:

1. tiny icon raster is converted into a binary mask
2. the binary mask is sent to the Node proof service
3. the service runs `@neplex/vectorizer` in binary mode
4. the result is simplified into vector paths

That means we are tracing a filled silhouette.

For flat logos, that is fine.
For tiny line icons, it is not ideal.

The source icon is effectively a very small rasterized stroke drawing:

- anti-aliased
- only a few pixels wide
- with tiny holes and cutouts

Once that is turned into a binary region, the tracer is no longer reconstructing an intended stroke width. It is reconstructing a filled contour from a very low-resolution mask.

That produces:

- slightly inflated outlines
- holes that are a little too small
- facial features and inner gaps that drift

### Important distinction

This is not mainly caused by:

- the preview
- lack of a `Smoothness` slider
- `Auto Crop`
- compare mode

It is mostly caused by:

- loss of stroke information at 48px
- binary contour extraction before tracing
- use of a region-based vectorizer instead of a stroke-aware / centerline-aware icon route

### Why repeated tweaks had limited impact

The recent tweaks improved the result incrementally, but none changed the fundamental model:

- stricter thresholds only remove fringe pixels
- thinning and erosion only shave the silhouette
- spline/polygon settings only alter how the existing contour is simplified

None of those can fully recover the original stroke intent from a tiny raster icon.

### Conclusion

The current `Icon` route is approaching the practical ceiling of this engine strategy for 48px line icons.

### What the latest iterations prove

The latest refinements showed:

- the actual emitted SVG paths are already smooth
- the remaining mismatch is not mainly a curve-smoothing problem
- the remaining mismatch is contour inflation and stroke-intent loss from tracing a tiny raster region

That means another generic `Smoothness` control would almost certainly be misleading.

## Finding 3: The Architecture Is Now Sound for Logos

The deep audit does not indicate the full converter is broken.

What is working well now:

- `Logo` mode
- Node-backed color tracing
- KFC
- Shell
- McDonald's
- larger flat marks

What is not working well:

- tiny transparent line icons
- tiny raster symbols that require faithful stroke-width recovery

So the system is not failing broadly anymore.
It is failing specifically at one asset class.

## Practical Interpretation

The product is now much closer to a:

- `Logo Converter`

than a:

- universal `PNG -> SVG Converter`

That is not a failure.
It is a clearer product truth.

## Recommendation

### For launch

The strongest launch position is:

- keep `Logo` mode
- keep the Node-backed logo path
- fix split compare fitting
- either hide `Icon` mode or label it clearly as experimental / best-effort
- strongly consider naming the feature as a `Logo Converter` rather than a general PNG→SVG converter

### If icon support must remain

Then `Icon` mode should be treated as a separate problem with a separate engine strategy, not as a minor refinement of the logo path.

That would likely require one of:

- stroke-aware tracing
- centerline / skeleton-based tracing
- dedicated contour extraction from alpha without hard binary collapse
- different post-processing that reconstructs thin strokes rather than filled regions

That is a legitimate follow-up project, not a small last-mile tweak.

## Final Audit Call

- `Split fit`: definite bug, should be fixed.
- `Tiny icon thickness`: not fully fixable by another round of general heuristics.
- `Logo conversion`: in a good state and should be considered the successful core of the feature.
- `Product scope`: should be framed around logos and flat marks first.
- `Launch naming`: should likely emphasize `Logo` over `Icon` or general `PNG→SVG`.
