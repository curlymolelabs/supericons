# Converter PNG to SVG Grainy Edge Audit

## Issue

For logo-like inputs such as the Starbucks mark shown in the screenshot, the `PNG -> SVG` result can look:

- grainy on edges
- soft instead of crisp
- visually similar to a raster image
- too busy for a clean logo vector

The user expectation for this workflow is:

`If I convert an icon or logo to SVG, it should feel like a clean vector illustration, not a traced screenshot.`

## Important Clarification

This output is still an SVG.

The browser is not rasterizing the result by mistake.

What is happening instead is:

- the converter is generating a **very high number of tiny vector paths**
- those paths are following the raster image's anti-aliased edge pixels very closely
- the resulting geometry is technically vector, but visually it feels like a traced bitmap

So the issue is:

`Bad vector geometry quality`

not:

`The browser is rendering a raster instead of SVG`

## Why This Specific Example Looks Bad

The screenshot shows:

- `Balanced`
- `Color`
- output around `650KB`
- about `3931 paths`
- complexity marked `Heavy`

That combination is the giveaway.

For a simple single-color logo, thousands of paths is far beyond what a clean vector logo should need.

## Root Cause

## 1. The input is a screenshot, not a clean source logo

A screenshot of a webpage logo already contains raster edge artifacts:

- anti-aliasing
- subpixel smoothing
- soft green edge shades
- white/near-white transition pixels

Those edge shades are not part of the real brand geometry.

But in `Color` mode, the tracer treats them as real color regions that deserve their own shapes.

## 2. Current color tracing preserves too many edge variations

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L7391), color mode does this:

- keeps at least `8` colors
- uses k-means color sampling
- keeps multiple quantization cycles

For `Balanced`, the base preset is `16` colors in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L7372).

That means the converter is trying to preserve multiple green and near-white shades from the screenshot edges instead of collapsing them into cleaner logo geometry.

## 3. Current preprocessing is not strong enough for logo-grade edge cleanup

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L7419), preprocessing mainly does:

- corner background detection
- background whitening
- thresholding in mono mode
- limited binary cleanup

What it does **not** do well enough for this case:

- remove anti-aliased fringe colors around the logo
- collapse close green shades into one clean logo tone
- simplify edge stair-stepping before tracing
- reconstruct the logo as idealized curves

So the tracer is starting from a noisy raster edge signal.

## 4. The current tracing engine is still ImageTracer-based

The current converter uses `imagetracerjs` in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L7256).

That is workable for generic tracing, but it is not the strongest engine for:

- exact logo vectors
- smooth brand curves
- low-path-count clean icons

Its behavior in this scenario is closer to:

- color quantization
- contour extraction
- many small shapes

than:

- clean logo curve reconstruction

## 5. The smoothness slider is not enough to solve this

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L7402), `smoothness` mainly tightens Bezier fitting and adds limited blur in color mode.

That can soften some staircase edges, but it does not fundamentally solve:

- too many source colors
- too many tiny traced regions
- screenshot edge contamination

So higher smoothness alone will not turn this into a proper brand-grade logo vector.

## Why It Feels “Rasterized”

The result feels rasterized because it is overfit to raster evidence.

In plain language:

- the tracer is copying the screenshot's pixel transitions too literally
- instead of understanding “this should be one clean curve”

That is why you see:

- noisy arcs
- uneven outlines
- fuzzy edge contours

Even though the file is SVG, the shape language still feels bitmap-derived.

## What A Good Logo SVG Should Look Like

For a logo or icon workflow, a strong result should usually have:

- far fewer paths
- smoother outer curves
- cleaner internal cutouts
- less color fragmentation
- no visible anti-aliased halo geometry

For a mark like this, thousands of paths is a strong sign the current trace is not logo-clean.

## Practical Interpretation

This is not a preview bug.

This is a **vectorization quality limitation** of the current pipeline for screenshot-derived logo inputs, especially when using:

- `Color`
- `Balanced` or `Detailed`

## Short-Term Guidance

For this kind of logo in the current converter:

- `Monochrome` will usually produce cleaner geometry than `Color`
- `Simple` will usually produce cleaner geometry than `Balanced`
- a clean original logo file will always outperform a screenshot

If the logo is truly one main color, current `Color` mode is usually the wrong default if your goal is clean vector edges.

## Product Gap

The converter currently gives users the controls,
but it does not yet guide them strongly enough toward:

- icon/logo-optimized tracing
- screenshot-unsuitable warnings
- cleaner low-path outputs for simple brand marks

That guidance matters because the current engine will happily generate a heavy SVG that is technically valid but visually poor for logo use.

## Conclusion

The current result looks grainy because:

- the source is a screenshot with anti-aliased edge pixels
- `Color` mode preserves those edge shades as many separate shapes
- preprocessing does not collapse that noise enough
- the current tracer is not strong enough to reconstruct a clean brand-grade vector from that kind of input

So the correct diagnosis is:

`The SVG is vector, but the vector geometry is too close to the raster screenshot.`

That is why it feels wrong.

## Recommended Next Direction

The long-term fix is still the same as the broader quality plan:

- route simple logo/icon inputs toward a mono/exact tracing path
- use stronger preprocessing
- replace the current generic engine with better mono/color tracing engines

In the near term, the most important product improvement is:

- detect likely logo/icon inputs
- steer them away from high-fragmentation color tracing
- warn when the result is clearly too heavy for icon/logo use
