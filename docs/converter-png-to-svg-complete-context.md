# PNG to SVG Converter Complete Context

## Purpose

This document consolidates the full discussion, technical findings, design decisions, user test feedback, failed experiments, and current recommendations related to Supericons' `PNG -> SVG` converter.

The goal is to give a second reviewer enough context to:

- understand how the current converter is designed
- see why this became a high-effort problem
- understand what has already been tried
- understand which conclusions are already well-supported
- help decide the next architectural move

This is intentionally detailed so the next person does not have to reconstruct the history from chat fragments.

## Executive Summary

The `PNG -> SVG` converter started as a seemingly straightforward raster-to-vector feature, but in practice it became a multi-stage image-processing and architecture problem.

The biggest reality check is this:

- the app is currently a static Vite frontend
- the converter is mostly browser-side logic in `store.js`
- there is no real dedicated PNG-to-SVG backend service today

That means the converter currently depends on:

- browser canvas preprocessing
- heuristic image profiling
- heuristic route selection
- a browser-safe mono/vector route using `vectortracer`
- a color fallback path using `imagetracerjs`
- post-trace cleanup and UI state management

This architecture is usable, and it has improved materially for some mono/logo cases, but it is not yet robust enough for broad, reliable logo conversion across different input classes.

Current major conclusions:

- mono/logo handling improved meaningfully
- color/logo handling is still the biggest unresolved gap
- `Auto` is not yet trustworthy
- determinism is not fully solved
- output quality is still inconsistent across KFC, Shell, McDonald's, and white-on-dark icons
- if this becomes a serious product feature, the next decision should be made in two layers:
  - choose the right color-capable engine first
  - then choose the lightest runtime that can host it cleanly

## Product Goal

The desired product outcome is simple:

`Upload a logo or icon PNG and get back a clean, crisp, vector-like SVG that feels reliable enough to use.`

Important scope clarification that emerged through testing:

- this should be an **icon/logo converter**
- not a general image-to-vector tool
- screenshots of logos/icons should still work better than they currently do
- full webpage screenshots, photo-like images, and noisy scenes may still produce heavy outputs, which is acceptable as long as the product is honest about that

## Why This Became High Effort

At first, this looked like a simple feature.

In reality, good PNG-to-SVG conversion depends on all of the following:

- background detection
- trimming/cropping to content bounds
- edge cleanup
- anti-aliasing interpretation
- palette reduction
- logo-vs-screenshot-vs-flat-art classification
- choosing the right tracing engine
- choosing the right settings for that engine
- normalizing the SVG after tracing
- avoiding stale async results in the UI
- keeping preview and export in sync

This is why it expanded from a "single bugfix" into a multi-phase architecture and quality effort.

## Current Runtime Architecture

### High-level reality

Supericons is currently a static frontend app.

Key files:

- `package.json`
- `vite.config.js`
- `store.js`
- `style.css`

There is no Node web server in the app runtime for the converter.

### Current PNG -> SVG pipeline

Current effective flow:

```text
Upload PNG
  -> load image into browser
  -> draw to canvas
  -> detect background from corners
  -> detect content bounds / crop
  -> build cropped preview image
  -> analyze trace profile
  -> resolve visible preset to internal preset
  -> choose trace route
     - mono-exact
     - flat-art-color
     - color-default
  -> preprocess pixels
  -> trace to SVG
     - vectortracer for mono route
     - imagetracerjs for color routes
  -> clean/normalize SVG
  -> compute metrics
  -> render preview + actions + optional note
```

### Main code locations

Core converter state and UI logic live in:

- `store.js`

Especially important functions:

- `resolveConverterPreset(...)`
- `analyzeConverterTraceProfile(...)`
- `getConverterTraceRoute(...)`
- `flattenConverterColorArtwork(...)`
- `preprocessImageData(...)`
- `loadImageTracer()`
- `loadConverterMonoEngine()`
- `traceWithConverterMonoEngine(...)`
- `traceWithImageTracerEngine(...)`
- `convertPngToSvg()`
- `buildImageTracerOptions(...)`
- `getConverterTraceAdvice(...)`
- `showConverterPendingOutput(...)`
- `showConverterOutput(...)`

### Current engines

#### Mono path

The mono/logo route currently uses:

- `vectortracer`

This is a browser-safe WASM path and is the closest thing to a real engine upgrade that has already landed.

#### Color path

The color path currently uses:

- `imagetracerjs`

This is loaded lazily from a CDN in the browser.

This is important because it means the current color path is:

- not using a dedicated backend
- not using the Node-native `@neplex/vectorizer`
- still dependent on a generic browser-side tracer

### Dependencies relevant to architecture

Installed dependencies include:

- `@neplex/vectorizer`
- `vectortracer`

Important distinction:

- `@neplex/vectorizer` is Node-native and uses N-API native binaries
- `vectortracer` is browser-safe WASM

This matters because the current frontend cannot just "use VTracer directly" in the browser through the Node package.

## Existing Repo Documentation Around This Work

Relevant docs/plans already created:

- `docs/converter-png-to-svg-quality-audit.md`
- `docs/converter-engine-integration-audit.md`
- `docs/audit-converter-png-svg-grainy-edges.md`
- `docs/audit-converter-color-route-failure.md`
- `docs/audit-converter-multicolor-preset-regression.md`
- `docs/converter-png-to-svg-full-roadmap.md`
- `plans/converter-png-to-svg-quality-implementation-plan.md`
- `plans/converter-browser-safe-mono-engine-plan.md`
- `plans/converter-mono-route-parity-fix-plan.md`
- `plans/converter-multicolor-preset-separation-fix-plan.md`

This document is the consolidation layer across those artifacts and the subsequent user testing discussion.

## What Has Been Implemented So Far

### 1. UX and inspection improvements

Shipped/implemented in the browser UI:

- single-output preview behavior
- compare modes
- preview background control
- auto-crop toggle
- enhance-small-icons toggle
- cleanup controls
- invert toggle
- complexity and size readouts
- mouse-wheel zoom
- drag-to-pan preview inspection
- quieter output notes moved below preview rather than inside the preview box

### 2. Current-engine quality improvements

Before the engine changes, the existing browser pipeline was upgraded with:

- stronger preprocessing
- screenshot-derived single-hue logo detection
- palette flattening for some icon/logo-like inputs
- tighter image-tracer settings for routed inputs
- file-size and path-count signals

### 3. Mono route integration

A browser-safe mono/logo route using `vectortracer` was integrated.

This materially improved some mono or near-mono inputs, such as screenshot-derived single-hue logo cases.

### 4. Mono cleanup and preset parity fixes

Further work improved mono output by:

- stripping unwanted strokes
- reducing dark outline artifacts
- differentiating mono presets more clearly

This improved cases like the Starbucks screenshot.

### 5. Failed color-engine rollout and rollback

An attempted richer browser-side multi-color engine rollout was tested and failed real smoke tests.

Observed failures included:

- KFC collapsing to grayscale/black-red wrong outputs
- Shell losing correct color structure
- generally incorrect color preservation

That route was rolled back.

Current state after rollback:

- color tracing remains on the improved ImageTracer fallback path
- true replacement of the color engine is still pending

## Current Visible Preset Model

The visible converter presets were changed from:

- `Simple`
- `Balanced`
- `Detailed`

to:

- `Auto`
- `Compact`
- `Exact`

The intent was:

- `Auto`: choose the best route/default
- `Compact`: smaller/lighter output
- `Exact`: preserve more detail

### Important current limitation

The visible preset labels are not yet a truly reliable user-facing contract.

Why:

- `Auto` is currently heuristic-based and not consistently best
- `Compact` sometimes behaves too similarly to `Auto`
- `Exact` can sometimes be right and sometimes drift into darker/heavier outputs
- sequence of clicks has appeared to matter in some real user tests

That means the visible preset model is ahead of the actual engine stability.

## User-Provided Benchmark Cases And What They Revealed

Real-world test cases supplied during this work include:

- Starbucks logo screenshot
- KFC logo
- Shell logo
- McDonald's logo
- cubes icon / white-on-dark square icon

These cases were extremely useful because they exposed different failure classes.

### Starbucks screenshot

What it showed:

- the converter originally produced grainy, raster-feeling edges
- output was technically SVG but visually still screenshot-like
- mono/logo routing plus stroke cleanup improved this case significantly

Result:

- major improvement
- one of the clearer success stories of the current work

### KFC logo

What it showed:

- multi-color but still logo-like input
- black, red, and white separation is important
- some presets collapsed black text/details into red
- some outputs became too dark overall
- sequence appeared to matter
- `Balanced` was especially unreliable

This case became the clearest signal that:

- color handling is still fragile
- preset semantics are not stable enough yet
- determinism may still be incomplete

### Shell logo

What it showed:

- `Auto` could become the worst result
- yellow/red separation is critical
- a route can look "light" or "clean" while still being semantically wrong

This case strongly undermined trust in the current `Auto` behavior.

### McDonald's logo

What it showed:

- the converter failed to preserve yellow correctly
- some outputs treated the arches incorrectly against the red field
- strong color-region separation is still a core unresolved gap

### Cubes icon / white on dark background

What it showed:

- foreground/background segmentation is still fragile
- white foreground on dark colored square is not being handled robustly
- preview background changes made failures easier to see
- some outputs became nearly invisible, empty-looking, or wrong-color

This case is important because it is closer to a very common app-icon pattern than a traditional brand logo.

## Consolidated Audit Findings

### A. This is not a real backend/service architecture yet

This is the single most important architectural finding.

Today, `PNG -> SVG` is effectively a client-side converter with:

- browser canvas preprocessing
- browser routing logic
- browser tracing
- browser SVG normalization

It is not a true conversion service with clean separation of concerns.

### B. Mono/logo handling is ahead of color handling

The mono route is not perfect, but it has progressed materially.

The color route remains the biggest unresolved quality gap.

This is why the problem should now be framed primarily as:

- `engine choice problem`

and only secondarily as:

- `runtime hosting problem`

### C. `Auto` is not trustworthy enough yet

Because `Auto` can be worse than manual choices, it should not be treated as a fully earned product feature yet.

### D. Determinism is still in doubt

If the same file and same selected preset can appear to produce different results depending on interaction sequence, that is not a tuning problem.

That is a correctness/stability problem.

### E. The current color route is still heuristic-heavy

The color path currently depends on:

- image profiling heuristics
- palette flattening heuristics
- ImageTracer tuning heuristics

That can work for some inputs, but it is not the same as having a stronger, deterministic engine pipeline.

### F. UI and messaging are not the main blockers anymore

Several UI refinements were useful:

- moving notes below preview
- cleaning up note wording
- changing visible presets

But the primary problem is no longer messaging.

The primary problem is engine/routing/output reliability.

## Why The Current Design Feels Fragile

The current design is doing too many jobs inside one frontend flow:

- image understanding
- engine selection
- state management
- tracing
- race handling
- preview rendering
- export metadata

That makes it harder to achieve:

- determinism
- debuggability
- reproducibility
- regression testing

It also means the current UI controls are indirectly exposing internal instability.

## Discussion Around Presets And Controls

### Earlier direction

The original visible presets were:

- `Simple`
- `Balanced`
- `Detailed`

These turned out to be confusing because:

- `Balanced` did not behave like a trustworthy middle ground
- `Simple` was sometimes best by accident
- `Detailed` could be best in one case and much worse in another

### New visible direction

The UI was revised to:

- `Auto`
- `Compact`
- `Exact`

This is better product language, but the underlying system still needs to earn those labels.

### Slider idea

A later discussion considered replacing fixed presets with a slider.

Conclusion:

- a slider is attractive only if the system is already deterministic
- if the engine is unstable, a slider will only make the instability more obvious
- a stepped fidelity slider could be a good later evolution, but not before correctness is fixed

## Discussion Around Messages / Notes

There were repeated discussions about whether the converter should show warning or guidance messages.

Key conclusion:

- messages should not appear inside the preview pane
- if needed, they should appear below the preview
- they must be precise and actionable
- vague messages like "crop tighter" are not good if there is no crop tool in the product

Accepted better framing:

- refer to the **source image**
- for example: upload an image containing only the logo or symbol

Current strategic view:

- notes are secondary
- correctness and output quality are primary

## Architecture Options Going Forward

### Option 1: Keep the browser-only architecture and continue tuning

What this means:

- continue using browser-side preprocessing and tracing
- continue using `vectortracer` for mono
- continue hardening the color path with ImageTracer or another browser-safe route

Pros:

- no new service to deploy
- keeps the product portable as a static frontend
- simpler product infrastructure

Cons:

- harder to achieve deterministic output
- harder to run industrial-strength engines
- harder to version and benchmark routes cleanly
- color route still likely to remain the weak spot for some time

Conclusion:

- viable as a temporary stabilization path
- likely not the strongest long-term answer if this feature matters a lot

### Option 2: Worker-isolated browser architecture

What this means:

- keep conversion in the browser
- move profiling/tracing into a Web Worker
- keep UI responsive
- enforce better job isolation and cancellation

Pros:

- reduces UI jank
- cleaner async boundaries
- can improve stale-result issues
- keeps static deployment model

Cons:

- does not inherently fix color quality
- does not inherently fix segmentation/routing problems
- still limited by browser-compatible engines

Conclusion:

- good engineering hygiene
- worthwhile if browser fallback remains part of the product
- not enough by itself to guarantee the results the product wants

### Option 3: Real converter backend/service

What this means:

- create a dedicated Node-based converter service
- submit PNG bytes + settings to that service
- let the service run profiling, routing, tracing, normalization, and benchmarking logic
- return SVG + metrics to the frontend

Pros:

- clean deterministic runtime
- can directly use Node-native engines like `@neplex/vectorizer`
- avoids CDN dependency for core conversion
- easier regression harnessing and caching
- easier future versioning of engine configs
- easier to benchmark against a fixed suite

Cons:

- requires new deployment architecture
- adds backend/service maintenance
- does not magically make every raster image perfect

Conclusion:

- strongest long-term path if the converter becomes a serious feature
- most likely path to achieve both quality and consistency

### Refined staged view after feasibility review

The architecture decision should now be treated as three staged questions, not one giant leap:

#### Level 1: Browser spike

- can a real color-capable VTracer-family engine run in the browser in our actual package/runtime constraints?

#### Level 2: Existing serverless platform spike

- if not, can a Supabase-compatible server-assisted route host the right engine cleanly?

Important caveat:

- Supabase Edge Functions run on Deno, so Node N-API packages like `@neplex/vectorizer` cannot be assumed to work there directly

#### Level 3: Dedicated Node runtime

- only if the earlier paths are not viable or do not meet quality needs

## Will A Real Service Truly Produce The Desired Results?

Most honest answer:

- it will improve the odds significantly
- it will not guarantee perfection for every raster source

What a real service can improve materially:

- deterministic results
- stronger engines
- stable routing
- repeatable benchmark evaluation
- higher confidence in output quality

What it cannot guarantee:

- exact recovery of the original vector source from every bad raster image
- perfect handling of every screenshot/photo/gradient-heavy input

Best expectation:

- very strong improvements for logos, simple icons, white-on-color marks, and screenshot-derived brand marks
- still imperfect on arbitrary complex raster inputs

## Recommended Way Forward

### Recommendation summary

If the goal is a serious, trustworthy converter:

1. stop expanding product-facing controls for now
2. treat the next phase as a stabilization and architecture phase
3. define an explicit benchmark suite
4. fix determinism first
5. demote or hide `Auto` until it actually wins consistently
6. run a color-engine feasibility spike before committing to a backend or service shape
7. choose the lightest runtime that can host the right color engine cleanly

### Near-term recommended scope

Support and optimize first for:

- flat brand logos
- simple app icons
- white-on-color marks
- screenshot-derived marks that are still logo-like

Do not optimize first for:

- full webpage screenshots
- photo-like inputs
- arbitrary illustrations outside icon/logo workflows

### Recommended next technical artifact

The most useful next artifact is not another broad audit.

It is:

`a benchmark-driven color-engine and runtime-hosting plan with deterministic acceptance criteria`

That plan should include:

- benchmark image set
- expected route per image
- expected acceptance criteria per image
- service API shape
- engine strategy
- fallback strategy

## Do We Need A Second Audit?

### Broad second audit?

No.

There is already enough evidence to say:

- the current architecture is browser-heavy
- the color path is still unreliable
- determinism is still in question
- `Auto` is not yet earned

### Narrow second audit?

Yes, if useful.

The best focused audit from here would be:

`determinism + benchmark audit`

That should answer:

- can same input + same settings ever produce different results?
- what exact route should each benchmark file take?
- which outputs count as acceptable vs unacceptable?
- where exactly are color-preservation failures happening?

## Suggested Questions For A Second Opinion

If another reviewer is brought in, these are the highest-value questions:

1. Should this feature stay browser-only, or is it already past the point where a dedicated converter service is justified?
2. Is `@neplex/vectorizer` behind a Node service the right next engine path for color/logo fidelity?
3. Should `Auto` be removed or hidden until benchmark performance is strong enough?
4. Is worker isolation worth doing before a backend service, or is that an intermediate cost with limited strategic value?
5. What should be the official supported v1 input classes?
6. What benchmark set and acceptance criteria should gate future changes?
7. Should the product use only `Compact` and `Exact` for now and reintroduce `Auto` later?
8. How should white-on-dark icons and foreground/background segmentation be handled more robustly?
9. Does a real browser-safe color-capable VTracer-family package exist for our use case, or would we need to build one?

## Bottom-Line Assessment

The converter is no longer a trivial feature.

It is currently:

- partially upgraded
- materially improved for some mono/logo cases
- still unstable or unreliable across broader logo/color cases

The current design is not "bad," but it is not robust enough yet to call the feature solved.

The work already done was not wasted. It surfaced the real boundaries:

- browser-side tracing can go only so far
- mono can be improved meaningfully in-browser
- color/logo reliability is still the hardest problem
- architecture now matters as much as tuning

If this feature is strategically important, the strongest next move is to stop treating it like a frontend control-tuning problem and start treating it like a true conversion-system problem.
