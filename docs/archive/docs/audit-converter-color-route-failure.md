# Audit: Converter Color Route Failure

## Summary

The new multi-color `PNG -> SVG` route is not behaving correctly.

Observed failures from smoke testing:

- KFC logo loses the red fill and turns into a black-and-white result
- Shell logo loses yellow/red and becomes a gray/white result
- output remains structurally vectorized, but the color fidelity is wrong

This is **not** just a bad input issue.

These are exactly the kinds of flat multi-color logos the color route was meant to improve.

## Primary Root Cause

The current color-engine integration is using the wrong browser wrapper.

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js), the new color route loads:

- `svgit4me/public/SVGit4Me.mjs`

and calls `convertToSVG(blob, options)`.

### Why that is a problem

The browser wrapper in `svgit4me/public/SVGit4Me.mjs` does **not** appear to pass the uploaded image bytes into the tracing call.

Relevant code from the installed package:

- it creates `buffer` from the file/blob
- but never uses that buffer in the actual conversion call
- instead it creates a hidden SVG element and calls:
  - `ColorImageConverter.new_with_string(params)`

Evidence:

- `buffer` is created at line `473` in the extracted file
- `options.svg_id` is set
- then `ColorImageConverter.new_with_string(params)` is called
- there is no byte-based trace call in that wrapper

By contrast, the package's `dist/SVGit4Me.js` uses a more sensible byte-based path:

- `trace_image(new Uint8Array(buffer), options)`

That means the currently imported `public` wrapper is likely a browser-demo/DOM-oriented integration, not the correct production tracing path for uploaded file bytes in this app.

## Why the Smoke Test Matches This Diagnosis

The failures are consistent with a broken or mismatched integration layer:

- colors are lost or collapsed
- grayscale/mono-like output appears even in `Color` mode
- the output still resembles the source silhouette, but not its actual color regions

That behavior fits an integration path that is:

- not tracing the uploaded bytes directly
- or relying on hidden DOM state / demo assumptions
- or producing output through a different rendering path than we intended

## What Is Not the Main Root Cause

### Not the `single-hue logo` heuristic anymore

That misclassification bug was real and already fixed.

After that fix, KFC and Shell still fail, which means the remaining issue is not just incorrect mono routing.

### Not mainly `flattenConverterColorArtwork()`

The current flat-art preprocessing may influence palette simplification, but it would not by itself convincingly explain:

- KFC red becoming black
- Shell red/yellow becoming gray/white

Those symptoms point more strongly to the color engine integration layer than to the preprocessing heuristics.

### Not mainly `stripBackgroundPaths()`

`stripBackgroundPaths()` only removes fills close to white.

In the failing outputs:

- non-white regions are not simply disappearing
- they are often changing to grayscale/black instead

So the issue is upstream of background stripping.

## Secondary Contributing Factors

### 1. Flat-art preprocessing is still aggressive

Before the color engine runs, color inputs that look like flat art go through:

- palette flattening
- smoothing
- white-background normalization

That is useful for cleanup, but once we swap to a stronger color engine, we should re-evaluate whether all of that preprocessing is still beneficial for clean logos.

### 2. The new color route has no trusted validation step yet

The route currently assumes:

- if the returned SVG is syntactically valid
- and not too heavy

then it is acceptable.

But color fidelity is not being validated.

That is why a visually wrong grayscale result can still pass the current acceptance checks.

## Proposed Fix

## Immediate Fix

Back out the current `svgit4me/public/SVGit4Me.mjs` route from production use.

For now:

- remove that wrapper from the active color path
- send `flat-art-color` back through the improved ImageTracer route
- keep the classification logic and guidance, but do not trust the current color-engine wrapper

### Why this is the safest next move

It avoids shipping a route that is visibly wrong for core multi-color logo cases.

A weaker-but-correct color result is better than a stronger-looking engine integration that destroys brand colors.

## Correct Long-Term Fix

Replace the current wrapper with a direct byte-based color-engine integration.

### Preferred direction

Use a VTracer integration that traces from the uploaded bytes or `Uint8Array` directly, not through a DOM/demo wrapper.

The correct integration should look more like:

- `trace_image(new Uint8Array(buffer), options)`

and less like:

- hidden SVG element + `svg_id`

### Practical implementation options

1. vendor the byte-based VTracer webapp wrapper into the repo
2. expose/import the byte-based trace function directly from a browser-safe package
3. only re-enable the new color engine after that byte-based path is verified on real multi-color samples

## Required Acceptance Gate Before Re-enabling Color Engine

Do not consider the color-engine route ready until it passes these real samples:

- KFC logo
- Shell logo
- one flat two-color badge
- one flat three-to-five-color icon/illustration

Expected:

- brand colors remain recognizable
- no grayscale collapse
- no mono-style recoloring
- output is at least as faithful as the improved ImageTracer fallback

## Recommended Rollout Strategy

### Phase 1

- disable current `svgit4me/public` route for production use
- restore `flat-art-color` to the improved fallback path

### Phase 2

- build the correct byte-based VTracer integration
- validate with benchmark logos

### Phase 3

- re-enable the new color engine only after color fidelity is proven

## Final Conclusion

The current multi-color failure is primarily an **integration bug**, not an unavoidable tracing limitation.

The repo is currently using a browser wrapper that does not appear to trace the uploaded bytes in the correct way for production.

The right fix is:

- stop trusting the current wrapper
- revert the active color route to the safer fallback
- then reintroduce a proper byte-based VTracer color path
