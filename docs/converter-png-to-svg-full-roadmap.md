# Converter PNG to SVG Full Roadmap

## Purpose

This roadmap exists to answer two practical questions:

1. where we are now
2. where we are headed next

The `PNG -> SVG` converter has evolved over several iterations, and the work is no longer just "fix one bug." It is now a staged quality upgrade from a basic browser tracer into a sharper, more trustworthy icon and logo converter.

## North Star

The product goal is simple:

`A user should be able to upload an icon, logo, or screenshot-derived mark and get back an SVG that feels clean, crisp, and genuinely vector-like.`

This roadmap is for `icon/logo conversion`, not for general photo vectorization.

## Why This Has Taken Time

This work stretched because the original direction had to change after real repo and runtime constraints became clear.

What changed:

- the app is a static Vite frontend, not a Node server app
- `@neplex/vectorizer` is Node-native, so it cannot be dropped directly into the browser runtime
- Potrace is attractive for mono tracing quality, but not the cleanest licensing path for this product
- a browser-safe VTracer-family route turned out to be the better practical path
- an attempted wrapper-based color-engine rollout failed smoke tests and had to be backed out

So the work moved from:

- "replace the tracer"

to:

- improve the current browser pipeline first
- then add a browser-safe mono engine
- then later replace the color path
- then later harden worker/performance architecture

That was the right technical decision, but it made the implementation longer.

## Important Framing

The next phase should be described more precisely as:

- `engine choice` fixes quality
- `runtime hosting` fixes packaging, determinism, deployment, and operational control

That distinction matters.

A backend or service does **not** improve SVG fidelity by itself.

It helps because it can host stronger engines cleanly and make the tracing runtime more deterministic.

So the real question is not:

- `frontend or backend?`

It is:

- `which color-capable engine do we trust?`
- `where can that engine run cleanly in this product?`

## Current Status

### Completed

#### Foundation and UX

- single-output preview behavior is fixed
- preview background control exists
- compare modes exist
- auto-crop exists
- enhance-small-icons exists
- cleanup controls exist
- invert control exists
- complexity and file-size signals exist
- wheel zoom + drag-to-pan preview inspection exists

#### Current-engine quality improvements

- stronger preprocessing exists
- screenshot-derived single-hue logos are detected
- flat-art palette flattening exists
- background cleanup is better than the original converter
- users now get quality hints when an input behaves more like a screenshot than an icon

#### New mono-engine route

- a browser-safe VTracer-family mono route is now integrated
- mono/logo-like cases can use that route
- current ImageTracer remains as fallback
- the build pipeline now supports the required WASM asset

#### Color-path hardening

- flat-art color cases now have stronger routing and tighter ImageTracer settings
- the attempted wrapper-based color-engine route was rolled back after KFC and Shell smoke tests failed
- true color-engine replacement is still pending

### Partially Complete

- the mono engine is integrated and working for the current supported cases
- worker isolation for the mono engine was explored, but the stable shipped path is currently lazy-loaded batched browser execution
- this means the quality step is delivered, but the performance architecture is not "final form" yet
- color routing is improved, but the dedicated replacement engine is not yet trustworthy enough to ship

### Not Done Yet

- full color-engine replacement across broader image classes
- full automatic routing between engine families
- worker-based tracing architecture as the default production path
- UI refresh from generic controls to purpose-based tracing modes
- fuller benchmark coverage and regression harness

## Where We Are Right Now

The project is currently in this state:

### Phase A

`Usable upgraded converter`

The converter is already much better than the original version for:

- simple icons
- clean logos
- screenshot-derived single-hue brand marks

But it is not yet the full planned system for:

- complex multi-color artwork
- richer color-region tracing
- maximum performance isolation

## Roadmap

## Milestone 0: Color Engine Feasibility Spike

### Goal

Validate the cheapest viable path to a real color-capable tracing engine before committing to a runtime architecture.

### Why This Comes First

The biggest remaining gap is not mono tracing. It is color/logo fidelity.

Before committing to a backend or service shape, we should answer:

`Can we run a real color-capable VTracer-family engine in a way that fits this product?`

### Facts Already Confirmed

- the installed browser package `vectortracer` currently documents only binary tracing
- the installed Node package `@neplex/vectorizer` exposes color vectorization, but it is Node-native
- Supabase Edge Functions run on Deno, so Node N-API packages cannot be assumed to work there

### Spike Paths

#### Path A: Browser-safe color-capable WASM tracer

- verify whether a real color-capable browser VTracer package already exists
- or whether a custom WASM build is realistically buildable

#### Path B: Server-assisted path using existing platform surfaces

- check whether a Deno-compatible WASM route can run in Supabase Edge Functions
- if not, record the exact blocker clearly

#### Path C: Dedicated Node runtime

- use a Node-capable host for `@neplex/vectorizer`
- treat this as the highest-control, highest-cost path

### Exit Criteria

- one chosen runtime-hosting direction for the color engine
- explicit evidence for why the rejected paths were rejected
- no more roadmap assumptions about browser color VTracer availability

## Milestone 1: Stabilize The Mono Path

### Goal

Make the new mono/logo route dependable enough to be treated as the normal high-quality icon/logo path.

### Work

- harden browser-side mono tracing
- refine parameter mapping for `Simple / Balanced / Detailed`
- expand benchmark set across:
  - monochrome icons
  - line icons
  - brand marks
  - screenshot-derived logos
- validate output consistency against the fallback path

### Exit Criteria

- mono/logo traces are consistently cleaner than the old route
- fallback only triggers when truly needed
- no obvious hangs or broken outputs

## Milestone 2: Replace The Color Engine

### Goal

Stop relying on the current generic color path for flat artwork and move to a stronger color vectorization engine.

### Work

- choose the color-engine hosting path based on Milestone 0 evidence
- integrate a real color-capable VTracer-family route
- use it for:
  - flat multi-color icons
  - stickers
  - badges
  - simple illustrations
- keep the current color path as fallback until confidence is high

### Why This Matters

This is still the biggest remaining quality gap.

Right now:

- mono/logo output is improving fast
- flat-art color output is still on the improved fallback path
- broader color output is still the weakest part of the full vision

### Exit Criteria

- flatter colors
- fewer noisy edge artifacts
- better region separation
- smaller or more reasonable path counts for flat art
- benchmark logos preserve their important semantic colors correctly

## Milestone 3: Build Proper Routing

### Goal

Choose the right tracing path automatically instead of forcing one engine to do every job.

### Work

- classify uploaded input as:
  - logo
  - icon
  - screenshot-derived logo
  - flat art
  - screenshot-heavy / UI-heavy
- route to:
  - mono engine
  - color engine
  - fallback path
- improve product hints when the source is not ideal for icon-style SVG output

### Exit Criteria

- better default behavior without user guesswork
- fewer cases where users choose the wrong mode manually
- clearer warning language for overly complex inputs

## Milestone 4: Performance and Worker Architecture

### Goal

Move tracing off the main execution path only after the chosen engine path is stable enough to justify the extra complexity.

### Work

- revisit worker-backed execution for mono and color routes
- keep cancellation behavior intact
- keep preview interactions responsive while tracing
- preserve lazy loading so the converter does not bloat initial app load

### Why This Is Not Already Final

The worker path was attempted, but the reliable shipped version today is the browser-side batched runner. That was the right short-term tradeoff to deliver real quality gains without shipping a hanging converter.

Worker isolation is now considered a polish and robustness milestone, not the main quality unlock.

### Exit Criteria

- no UI jank during heavy traces
- stable cancellation when users change settings mid-run
- same output quality as the non-worker path

## Milestone 5: Refresh The Control Model

### Goal

Replace the current low-level-feeling controls with clearer product-facing modes.

### Proposed Direction

- `Logo`
- `Icon`
- `Flat Art`
- `Color`

and a smaller number of meaningful supporting controls like:

- detail
- corner sharpness
- cleanup
- background removal

### Why This Matters

The converter should feel like a focused product tool, not a tracing sandbox.

### Exit Criteria

- clearer defaults
- less user confusion
- higher chance of good output on the first try

## Milestone 6: Release Hardening

### Goal

Turn the upgraded converter into a fully trustworthy product surface.

### Work

- expand benchmark set
- keep before/after examples
- verify file size, path count, visual fidelity, and speed
- validate browser rendering, copy flow, and download flow
- add regression checks for representative samples

### Semantic Acceptance Criteria

The benchmark gate should not rely only on file size and path count.

Each representative logo/icon also needs a human-judged semantic pass, for example:

- KFC: black text stays black, red stays red, white background remains clean
- Shell: yellow and red remain distinct and bounded correctly
- McDonald's: yellow arches remain solid and the red field stays uniform
- cubes icon: white foreground remains visible against the dark background

These are the kinds of checks that determine whether the converter is actually trustworthy.

### Exit Criteria

- stable output across the benchmark set
- no major regressions when engines are tuned
- clear confidence in the shipping defaults

## Current Position On The Roadmap

Today we are here:

- Milestone 0: not completed
- Milestone 1: mostly underway, partially delivered
- Milestone 2: not started
- Milestone 3: partially underway through current heuristics, not complete
- Milestone 4: explored, not completed
- Milestone 5: not started
- Milestone 6: not completed

## Practical Next Step

If we continue immediately, the best next move is:

`run the color-engine feasibility spike, then choose the lowest-cost runtime that can host the right color engine`

That is the most efficient order because:

- the mono route already has visible gains
- the color path is the biggest remaining quality gap
- the engine decision should drive the runtime decision, not the other way around

## What Is Already Good Enough To Use

Even before the full roadmap is finished, the current converter is already useful for:

- simple black icons
- logo marks
- screenshot-derived single-hue symbols
- general icon cleanup and inspection

## What Users Should Still Expect To Be Imperfect

Until Milestone 2 and Milestone 3 are done, users should still expect weaker results on:

- complex multi-color screenshots
- full webpage screenshots
- UI-heavy or photo-like images
- richly anti-aliased color artwork

That is not a bug in the current roadmap stage. It is the remaining work.

## Related Documents

- [converter-png-to-svg-quality-implementation-plan.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/converter-png-to-svg-quality-implementation-plan.md)
- [converter-browser-safe-mono-engine-plan.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/converter-browser-safe-mono-engine-plan.md)
- [converter-engine-integration-audit.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/converter-engine-integration-audit.md)
- [audit-converter-png-svg-grainy-edges.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-converter-png-svg-grainy-edges.md)

## Bottom Line

We are no longer at the "is this a useful converter?" stage.

We are at the:

- `mono/logo path is becoming good`
- `color path still needs real engine work`
- `full routing/performance polish still remains`

stage.

That means progress is real, but the full implementation is not finished yet.
