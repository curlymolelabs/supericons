# Converter Browser-Safe Mono Engine Plan

## Goal

Ship the next real PNG to SVG quality upgrade by replacing the current mono/logo tracing route with a browser-safe engine path that can run inside the existing static app.

## Why This Plan Exists

The repo audit in [converter-engine-integration-audit.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/converter-engine-integration-audit.md) changed the implementation decision:

- `@neplex/vectorizer` is strong, but Node-native
- Potrace is attractive for quality, but not the cleanest licensing path here
- the app is static, so we need a browser-runnable solution

That means the next build step is not “import the native package.”

It is:

- add a browser-safe mono/vector engine path
- route only the mono/logo cases to it first
- keep current ImageTracer as fallback

## Scope

This plan covers only:

- `PNG -> SVG`
- mono/icon/logo-like inputs
- browser-safe engine integration
- browser-side execution with clean fallback

It does not yet cover:

- full color engine replacement
- complete routing redesign for every image type
- removal of the current ImageTracer fallback

## Product Behavior

For users, the behavior should be:

1. upload PNG
2. if the image behaves like an icon/logo/mono mark, Supericons uses the higher-quality mono route automatically
3. output looks cleaner, sharper, and more vector-like
4. if the new route fails or is unsuitable, fallback still works

## Implementation Direction

### Phase 1: Add the engine behind a feature boundary

Add a small abstraction layer so the converter no longer calls ImageTracer directly as the only engine.

Create a trace runner concept like:

- `traceWithCurrentEngine(...)`
- `traceWithMonoEngine(...)`
- `traceWithFallback(...)`

Keep this logic local to the converter section in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) at first unless it becomes large enough to extract.

### Phase 2: Integrate browser-safe mono tracing in the browser

Use a browser-safe integration for the new mono path.

Requirements:

- lazy-load only when `PNG -> SVG` runs
- only invoke for mono/logo-like inputs
- preserve existing cancellation token behavior
- return SVG string back to the converter pipeline

Implementation note:

- start with a batched browser runner if that is the fastest stable path
- extract to a worker later if the runtime path proves reliable enough to justify the extra plumbing

### Phase 3: Route only the right images to it

Use the existing trace profiling from [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) to decide when to use the new engine.

Initial routing target:

- explicit `Monochrome` mode
- likely single-hue logo
- low palette count
- strong shape boundaries

Do not send:

- rich multi-color flat art
- screenshots with many distinct UI colors
- gradient/photo-like images

to the mono engine first.

### Phase 4: Normalize output to current converter expectations

The new engine output must still pass through the converter’s existing expectations:

- normalized `viewBox`
- transparent background behavior
- file-size / path-count metrics
- preview rendering
- download / copy flows
- compare modes

### Phase 5: Keep fallback explicit

If the browser-safe mono engine:

- throws
- produces empty output
- produces obviously invalid SVG

then the converter should fallback to the current route instead of failing hard.

## Files Likely Affected

- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css) only if small UI state changes are needed
- potentially a worker file later if the chosen package/runtime path supports it cleanly
- [package.json](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/package.json) for the browser-safe engine dependency
- [vite.config.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js) only if wasm/worker serving needs configuration

## Guardrails

- do not remove the current ImageTracer path in this phase
- do not redesign the entire PNG to SVG UI in this phase
- do not force a server dependency into the static app
- do not add licensing risk by bundling Potrace directly

## Verification

Minimum checks:

- `node --check store.js`
- `npm run build`
- browser validation on:
  - clean monochrome logo
  - screenshot-derived single-hue logo
  - simple line icon
  - one image that should still fallback

Success conditions:

- cleaner edges than the current mono route
- smaller or comparable path count for logo/icon cases
- no broken preview/export flows
- no UI freezes while tracing

## Exit Criteria

This phase is done when:

- mono/logo-like inputs visibly improve
- fallback remains stable
- no new backend is required
- the product is ready to begin the color-engine phase after that
