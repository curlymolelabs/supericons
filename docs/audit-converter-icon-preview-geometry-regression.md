# Audit: PNG to SVG Icon Preview Geometry Regression

## Symptom

After adding `Output Size`, tiny `Icon` mode assets such as:

- `alien-48px.png`
- `air-balloon-48px.png`

sometimes render in the output pane as a clipped white sliver instead of the full traced icon, while larger logo assets like:

- `Shell_logo.svg.png`
- `Kfc_logo.png`

still preview correctly.

## Main Finding

This is a geometry-space mismatch in the Node proof-service path for tiny icons.

It is **not** a general preview bug, and it is **not** a logo-trace bug.

## Root Cause

### 1. Tiny icons are traced from an upscaled mask

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), the icon service path for:

- `tiny-line-icon`
- `mono-mask`
- `single-color-mark`

creates an `upscaledCanvas` before calling the proof service.

That means the service is tracing a larger raster than the original crop.

Example:

- crop: `38x42`
- service input after upscale: maybe `114x126` or similar

So the returned SVG path coordinates live in the **upscaled geometry space**.

### 2. The service artifact is normalized as if it were traced at crop size

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), `buildConverterServiceTraceArtifact(...)` calls:

- `normalizeSvgOutput(cleanSvg, originalWidth, originalHeight, exportWidth, exportHeight)`

and the caller currently passes:

- `originalWidth: cropBounds.width`
- `originalHeight: cropBounds.height`

for both logo and icon routes.

That is fine for logos because the service traces the original crop directly.

It is **wrong for tiny icons** because the service did **not** trace the original crop. It traced the upscaled mask.

### 3. The viewBox becomes smaller than the actual path coordinate space

So the current normalized SVG ends up with something like:

- path coordinates built for `114x126`
- but `viewBox="0 0 38 42"`

That causes the preview and exported SVG to show only a cropped portion of the traced icon.

This matches the user-visible symptom exactly:

- only a white sliver or partial shape appears

## Why Logos Still Work

The working logo route is not using the upscaled mono-mask handoff.

For logo cases like Shell and KFC:

- the proof service receives the cropped image directly
- the returned SVG geometry and the normalized `viewBox` are already aligned

So the regression is isolated to the tiny icon proof-service route.

## Why This Surfaced Now

The recent export-size refactor made the geometry contract easier to notice because:

- preview size
- export size
- viewBox normalization

are now more explicitly separated.

That did **not** create the icon mismatch, but it exposed it more clearly.

## Product Conclusion

The fix should be **route-isolated**:

- fix only the icon proof-service geometry contract
- do not change the logo path
- do not touch the browser fallback path

## Correct Direction

The system needs to distinguish between:

1. `trace geometry size`
2. `cropped source size`
3. `export size`

For tiny icons, those are currently not the same thing.

The missing concept is:

- `traceGeometrySize`

which should reflect the actual raster dimensions sent to the proof service.

## Best Fix Shape

When the service traces an upscaled icon mask, we should either:

### Option A: Preserve geometry space and normalize from it

- keep the service SVG `viewBox` based on the traced raster size
- export `width` / `height` separately as we already do

### Option B: Scale geometry back down before final normalization

- convert the service SVG geometry from upscaled coordinates back into crop coordinates
- then continue using crop-sized `viewBox`

### Recommendation

Option B is better for this app because it preserves the current product model:

- preview references crop size
- metadata references crop size
- export sizing is computed from crop size

That avoids another round of split logic and reduces risk to the working logo path.

## Guardrail

Any fix must be scoped so it only applies when:

- `assetMode === 'icon'`
- proof-service route is active
- traced input dimensions differ from crop dimensions

That is the main anti-regression rule for the logo path.
