# Converter PNG to SVG Quality Audit

## Scope

This audit reviews the current `PNG -> SVG` pipeline in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) and identifies why the output often feels soft, rounded, or inexact for icons, logos, and UI artwork.

It also compares the current approach against stronger tracing techniques from primary sources:

- Potrace official site and docs: <https://potrace.sourceforge.net/>
- VTracer official repo: <https://github.com/visioncortex/vtracer>
- SAMVG paper: <https://arxiv.org/abs/2311.05276>
- CVPR 2025 Layered Image Vectorization paper: <https://openaccess.thecvf.com/content/CVPR2025/papers/Wang_Layered_Image_Vectorization_via_Semantic_Simplification_CVPR_2025_paper.pdf>
- imagetracerjs repo / package docs:
  - <https://github.com/jankovicsandras/imagetracerjs>
  - <https://www.npmjs.com/package/imagetracerjs/v/1.2.3>

## Current Mechanism

The current converter does the following:

1. Loads `imagetracerjs` lazily from a CDN in `loadImageTracer()`.
2. Reads the source PNG into a canvas in `convertPngToSvg()`.
3. Downscales the image before tracing.
4. Runs a simple preprocessing pass in `preprocessImageData()`:
   - detect a corner background color
   - threshold to black/white in mono mode
   - replace background pixels with white
5. Traces through `ImageTracer.imagedataToSVG(...)`.
6. Rewrites the `viewBox`.
7. Removes background-colored paths with a regex in `stripBackgroundPaths(...)`.

The relevant local decisions are concentrated around:

- `convertPngToSvg()`
- `buildImageTracerOptions(...)`
- `preprocessImageData(...)`
- `detectBackgroundFromCorners(...)`
- `stripBackgroundPaths(...)`
- `normalizeSvgOutput(...)`

## Main Quality Gaps

### 1. The tracer is resolution-capped before tracing

`convertPngToSvg()` intentionally downsamples the source to a capped trace canvas before running the tracer.

That is the biggest reason sharp source edges become soft output edges.

Even though the code later rescales coordinates back up, the detail is already gone once the raster has been simplified.

Practical impact:

- corners get rounded
- fine gaps close up
- thin strokes merge
- small internal cutouts disappear
- logos and icons feel “approximate” instead of exact

## 2. The current pre-processing is too simple for hard-edge icon work

The mono flow is a single threshold step plus background detection from the four corners.

That works for clean black-on-white shapes, but it is not enough for:

- anti-aliased logos
- icons on noisy or tinted backgrounds
- screenshots with translucent edges
- small icons with faint detail

There is no:

- trim-to-content pass
- despeckle pass
- morphology pass
- edge-preserving sharpening
- adaptive thresholding
- corner-preserving prefilter

Potrace’s own official docs explicitly separate tracing from bitmap preparation and point to `mkbitmap` as the pre-processing stage for better behavior on grayscale and color inputs.

## 3. One tracing engine is being used for every image class

Right now, the app uses one engine and roughly one family of options for all of these:

- monochrome icons
- logos
- colored clipart
- flat illustrations
- soft-edged images

That is a mismatch.

Potrace is specifically strong for binarized black-and-white tracing. Its official docs expose tuning parameters like `turdsize`, `alphamax`, and `opttolerance`, which are all directly about speckles, corners, and curve optimization.

VTracer is designed for a different problem: color images and high-resolution scans. Its official repo exposes:

- `color_precision`
- `corner_threshold`
- `filter_speckle`
- `hierarchical`
- `mode` = `pixel | polygon | spline`
- presets like `bw`, `poster`, `photo`

Those controls are closer to what Supericons needs for high-quality multi-color tracing.

## 4. The current background removal is brittle

The traced background is stripped after vectorization by regex-matching white fills.

That is fragile for exact tracing because:

- quantization drift may not stay near pure white
- a legitimate white foreground shape can be removed accidentally
- it assumes the preprocessing phase normalized the background perfectly

This is serviceable as a stopgap, but not strong enough as the main cleanup mechanism.

## 5. The current smoothing model trades sharpness for visual softness

The current code uses canvas image smoothing plus tracer tolerance adjustments.

That makes output friendlier for some artwork, but for icon/logo work it often harms:

- corner fidelity
- exact geometry
- stroke separation
- path count control

In other words, the current system is tuned toward “acceptable generic SVG” rather than “crisp exact vector”.

## 6. The current engine choice is dated

The converter currently loads `imagetracerjs@1.2.6` from a CDN.

That library is still useful, but it is not the strongest modern option for exact icon-quality vectorization.

Compared with VTracer’s official Rust + WASM webapp and newer parameter surface, the current stack is materially behind.

## What Current Research Suggests

### Potrace

Potrace remains the strongest classic binary tracer for logos, line art, and black/white icon shapes.

Why it matters:

- built specifically for smooth tracing of bitmaps into vector curves
- has explicit controls for speckle suppression and corner behavior
- pairs naturally with a separate preprocessing stage

For Supericons, Potrace is the best fit for:

- monochrome icons
- logos
- marks with hard edges
- thresholded artwork

### VTracer

VTracer is the strongest practical modern candidate for browser-friendly color tracing.

Why it matters:

- official project says it handles colored high-resolution scans
- official project already ships a Rust + WASM web app
- exposes more useful tracing parameters for quality tuning than the current converter
- supports `spline` fitting and color-aware hierarchical tracing

For Supericons, VTracer is the best fit for:

- flat colored artwork
- stickers, badges, emoji-like assets
- multi-color PNGs that should not collapse into a few fuzzy blobs

### Recent academic image vectorization

Recent research is moving toward segmentation-first and layered reconstruction.

Notable direction:

- SAMVG uses segmentation plus multi-stage refinement for higher-quality SVG generation
- CVPR 2025 layered vectorization progressively builds compact layered vector representations with better semantic alignment and fidelity

Why this matters:

- the state of the art is no longer “just run a single low-level tracer”
- better quality increasingly comes from multi-stage structure-aware pipelines

Why it is not the first implementation target:

- too heavy for a fast interactive browser converter
- too complex to ship and maintain in this product right now
- not necessary to materially beat the current output for icon/logo workloads

## Recommendation

Do not try to “tune imagetracerjs harder”.

That might produce minor gains, but it will not solve the root problem.

The stronger direction is:

### Recommended architecture

1. Use a binary/icon tracing path for exact mono artwork.
2. Use a color tracing path for multi-color artwork.
3. Add a stronger pre-processing stage before either tracer runs.
4. Move tracing work into a worker-backed WASM path instead of the current main-thread CDN flow.

### Practical recommendation for Supericons

- `mono / logos / icons`:
  Potrace-class tracing
- `color / poster / illustration`:
  VTracer-class tracing

This is the highest-value improvement path that is still realistic for the product.

## Bottom Line

The current PNG -> SVG output is not sharp enough mainly because:

- the source is downsampled before tracing
- preprocessing is too shallow
- a single generic tracer is used for all image types
- background stripping is brittle

The best practical upgrade is a hybrid tracer pipeline:

- Potrace-style mono tracing for exact shapes
- VTracer-style color tracing for richer artwork
- stronger preprocessing and worker/WASM execution

That will deliver visibly sharper, more exact output than the current ImageTracer-based flow without requiring a speculative AI vector generation system.
