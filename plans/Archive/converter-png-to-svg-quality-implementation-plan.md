# Converter PNG to SVG Quality Implementation Plan

## Goal

Improve `PNG -> SVG` quality so icons, logos, and flat artwork trace with sharper edges, better corner fidelity, cleaner cutouts, and more exact geometry than the current ImageTracer-based pipeline.

## Key Framing

The next stage should be described as:

- `engine selection` for quality
- `runtime hosting` for packaging, determinism, and operations

This is important because a backend or service is not itself a quality fix.

Quality improves when we run a stronger color-capable engine.

Runtime choice matters because it determines whether that engine can run:

- in the browser
- in a worker
- in an Edge Function
- in a dedicated Node service

## Product Principle

Users care about one thing:

`My traced SVG should feel like a clean vector version of the original image, not a soft approximation.`

This plan optimizes for:

- sharper output
- more exact shapes
- fewer tracing artifacts
- faster trust in the result
- easier visual judgment before export

It does not optimize for:

- photorealistic raster-to-vector conversion
- generative SVG synthesis
- arbitrary AI-based restyling

## Supported Reality

This converter should handle screenshot-derived icons and logos better than it does today.

That means:

- a screenshot is not treated as automatically "bad input"
- if the screenshot still behaves like flat logo/icon artwork, the converter should try to reconstruct a clean vector result
- the product may still warn when a trace becomes very heavy, but it should not assume screenshots are outside scope

In practice, that means the converter needs to distinguish between:

- `screenshot of a flat logo/icon`
- `screenshot of a full UI / webpage / photo-like scene`

Those should not take the same tracing path.

## Proposed Direction

Replace the current single-engine tracing approach with a hybrid quality-first pipeline:

1. Better preprocessing
2. Image-type classification
3. Browser-safe mono tracing engine for exact binary/icon work
4. Real color tracing engine for richer multi-color work
5. Cleaner post-processing and output normalization
6. Responsive browser execution, with worker/WASM as a follow-on when stable

## Step 0: Color Engine Feasibility Spike

Before committing to backend work, verify what real color-engine path is actually available.

### Questions to answer

1. Does a browser-safe color-capable VTracer-family package already exist?
2. If not, is a custom browser WASM build realistic enough to justify?
3. If browser color VTracer is not practical, what is the lightest runtime that can host a real color-capable engine?

### Current facts already known

- the installed `vectortracer` browser package documents binary tracing only
- the installed `@neplex/vectorizer` package exposes color vectorization, but it is Node-native
- Supabase Edge Functions are Deno-based, so Node N-API addons cannot be assumed to work there

### Evidence-driven outcomes

#### Outcome A: Browser path is viable

- use a browser-safe color-capable VTracer-family package or build
- keep the app static

#### Outcome B: Edge Function path is viable

- use a Deno-compatible WASM route in Supabase Edge Functions
- keep the frontend static while adding a lightweight server-assisted trace boundary

#### Outcome C: Dedicated Node runtime is required

- host `@neplex/vectorizer` or equivalent on a Node-capable runtime
- accept the higher operational cost in exchange for higher control

### Exit Criteria

- one chosen direction for the color engine runtime
- explicit written evidence for why the non-chosen paths were rejected

## Shipping Slice Before Full Engine Swap

Before the full Potrace/VTracer architecture lands, ship an intermediate quality upgrade inside the current browser pipeline:

1. detect likely screenshot-derived logo/icon inputs
2. route single-hue logo screenshots to a stricter mono-style trace internally
3. recolor the cleaned mono result back to the dominant logo color
4. flatten limited-palette artwork more aggressively before color tracing
5. tighten current tracer options when the image is clearly icon/logo-like

### Progress Update

Shipped so far inside the current-engine path:

- screenshot-derived single-hue logo detection
- browser-safe mono exact route with automatic fallback hardening
- dominant-color recolor for screenshot-derived logo traces
- limited-palette flattening for flat artwork
- dedicated `flat-art-color` routing with tighter color-trace settings
- preview/inspection UX and heavy-trace guidance

Important correction after multi-color audit:

- an attempted wrapper-based browser color-engine rollout was removed from production
- `flat-art-color` currently uses the improved ImageTracer path only
- true multi-color engine replacement is still pending until a correct byte-based VTracer integration is in place
- the current fallback path should keep being hardened in the meantime:
  - avoid mono-like smoothing for multi-color artwork
  - preserve more palette entries for flat logos
  - prefer reliable color separation over aggressive simplification

Still pending from the larger plan:

- a true replacement color engine
- broader automatic mode routing across all image types
- off-main-thread worker/WASM execution as the stable default

This is the fastest path to visibly sharper SVG output for the kinds of examples users are already trying.

## Phase 0: Baseline and Comparison Set

Create a small local benchmark set of real problem inputs:

- black logo on transparent background
- anti-aliased monochrome icon
- small UI icon screenshot
- flat two-color badge
- multi-color emoji/sticker
- noisy PNG with tinted background
- KFC logo
- Shell logo
- McDonald's logo
- Starbucks screenshot
- cubes icon / white-on-dark app icon

For each sample, capture:

- current SVG output
- path count
- file size
- obvious defects

Success criteria for the upgrade:

- corners look sharper
- small holes/cutouts survive
- thin strokes remain separate
- background artifacts are reduced
- output path count stays reasonable
- users can quickly judge the traced SVG on light, dark, checker, and custom preview backgrounds

### Semantic acceptance criteria

Proxy metrics are not enough.

For the benchmark set, add human-judged criteria such as:

- KFC: black text stays black, red stays red, white field stays clean
- Shell: yellow and red remain distinct and correctly bounded
- McDonald's: yellow arches stay yellow and the red field stays uniform
- cubes icon: white foreground remains visible and separate from the dark square

These checks should gate major engine or routing changes just as strongly as file size and path count.

## Phase 1: Stronger Preprocessing

Build a new preprocessing layer before tracing.

### Mono / icon preprocessing

- trim transparent borders before tracing
- support optional nearest-neighbor upsample for very small inputs
- add adaptive thresholding fallback, not just one global threshold
- add speckle cleanup for tiny isolated regions
- add optional morphology for gap closing / hole preservation

### Color preprocessing

- trim transparent borders
- detect likely flat-art vs photo-like input
- reduce color noise before tracing
- preserve edges while suppressing gradients/noise
- improve background isolation beyond corner-only detection
- collapse anti-aliased screenshot fringe colors back into a smaller dominant palette
- detect screenshot-derived single-hue logos and prepare them for exact tracing

### Why this phase matters

Potrace’s own docs explicitly assume preprocessing is handled upstream, and the current preprocessing is too shallow to support exact results.

## Phase 2: Replace the Mono Engine

Introduce a browser-safe mono tracing path for logo/icon work.

### Target workloads

- black-and-white icons
- logos
- symbols
- line art

### Architecture decision

Do not anchor this phase to Potrace directly.

Based on the repo audit:

- the current app is a static Vite frontend
- `@neplex/vectorizer` is Node-native and not browser-runnable
- Potrace introduces licensing friction for this product path

So Phase 2 should use a **browser-safe VTracer-family mono route** instead:

- binary / monochrome mode
- lazy-loaded browser execution
- lazy-loaded only inside `PNG -> SVG`

### UI strategy

Do not expose raw engine jargon first.

Map it to product language:

- `Exact`
- `Balanced`
- `Smooth`

Internally, those presets can translate to tuned mono-engine parameters.

### Implementation note

Prefer a local/bundled browser-safe integration path over shelling out to a desktop binary or adding a Node-only helper. The web product should stay portable.

## Phase 3: Add a Color Engine

Introduce a VTracer-class tracing path for color and flat-illustration work.

Status note:

- this phase is not shipped yet
- a previous wrapper-based attempt failed real-world KFC/Shell smoke tests and was rolled back
- the next implementation must use a byte-based tracing integration, not a DOM/demo wrapper
- the browser-safe runtime path for that engine is still subject to Step 0 feasibility

### Target workloads

- flat multi-color artwork
- stickers
- simple illustrations
- colored badges

### Expected controls to tune internally

- color precision
- corner threshold
- speckle filter
- hierarchical mode
- trace mode (`polygon` vs `spline`)
- preset (`bw`, `poster`, `photo`)

### Product-facing translation

Instead of exposing raw engine knobs first, expose user-friendly modes:

- `Logo`
- `Icon`
- `Flat Art`
- `Photo-like`

Under the hood:

- `Logo` and `Icon` route toward the mono engine or strict color settings
- `Flat Art` routes toward VTracer poster/spline settings
- `Photo-like` is allowed only if it actually produces acceptable output

## Phase 4: Add Image-Type Routing

Add a lightweight classifier before tracing.

The app should inspect the uploaded PNG and choose a default path:

- transparent + low color count + high edge contrast -> mono/icon path
- flat color regions + limited palette -> color vector path
- screenshot-derived flat logo with one dominant hue -> mono/icon path plus recolor
- noisy / gradient-heavy / photo-like -> either warn or use a cautious color path

### Why this matters

The current tool asks one engine to solve every tracing problem. The routing layer is what turns two strong engines into one coherent product experience.

### Immediate routing rule to ship now

Inside the current ImageTracer-based implementation:

- if the image is `Color` mode but behaves like a single-hue flat logo, trace it through the exact mono path internally
- then recolor the result to the dominant foreground color

This will not solve every raster-to-vector case, but it should materially improve:

- screenshot logos
- app header brand marks
- simple badge screenshots
- colored single-hue symbols

## Phase 5: Move Tracing Off the Main Thread

Tracing should eventually run in a worker-backed WASM flow.

### Why

- better engines and better preprocessing will increase compute cost
- the converter UI should remain responsive while tracing
- Phase 2 can ship first with a batched browser runner if that is the most stable integration path

### Priority note

This is now a polish and robustness phase, not the main quality unlock.

If there is a tradeoff between:

- better color quality
- and worker isolation

the color engine work should come first.

### Requirements

- lazy-load worker and WASM only in `PNG -> SVG`
- cancel stale runs when user changes controls
- keep the latest-result token guard
- surface progress or at least a clearer loading state

## Phase 6: Improve Output Cleanup

Replace brittle cleanup steps with geometry-aware cleanup.

### Fixes

- stop relying on regex-only white-path stripping as the main cleanup mechanism
- strip background more structurally
- normalize viewBox after final geometry is known
- remove tiny isolated artifacts
- simplify paths only within safe tolerances
- preserve corners in icon/logo modes

### Important rule

Do not over-simplify.

For icons and logos, a slightly larger SVG is better than a simpler but inaccurate one.

## Phase 7: Refresh the UI Controls

Replace today’s generic controls with quality-oriented tracing modes.

### Suggested v1 UI

- `Mode`
  - `Logo`
  - `Icon`
  - `Flat Art`
  - `Color`
- `Detail`
  - low / medium / high
- `Background removal`
  - auto / transparent-only / off
- `Corner sharpness`
  - soft / balanced / exact

### Add a preview background control

Add a dedicated preview-only background control for the traced SVG output so users can inspect contrast and edge cleanup on realistic surfaces.

Recommended options:

- `Transparent` default
- `White`
- `Black`
- `Custom`

Important behavior:

- this changes the preview surface only
- it does not bake a background into the SVG export
- the chosen preview background should also be respected in any compare mode

Why this matters:

- a trace can look acceptable on transparency but fail on a white or black surface
- white or near-white shapes can disappear on light backgrounds
- users need to judge the result in a practical context before downloading

### Other high-value controls to add

These are the most useful controls to help users get better results without bloating the tool.

#### 1. `Compare`

Add a simple comparison control:

- `Original`
- `Trace`
- `Split`
- `Overlay`

Why:

- users need to see exactly where corners drifted, gaps closed, or details were lost
- this is one of the fastest ways to build trust in the output

#### 2. `Auto crop`

Add a trim-to-content toggle:

- `Auto crop`

Why:

- excess transparent padding makes the result harder to judge
- tight bounds help both the preview and the tracer itself

#### 3. `Enhance small icons`

Add a dedicated control for tiny source graphics:

- `Enhance small icons`

Behavior:

- nearest-neighbor or high-fidelity upsample before tracing
- stronger corner preservation
- more conservative smoothing

Why:

- small UI icons are one of the easiest inputs to ruin
- this deserves a focused control instead of hiding the behavior inside generic smoothing

#### 4. `Noise cleanup`

Add a simple cleanup selector:

- `Low`
- `Medium`
- `High`

Why:

- users often upload screenshots or imperfect source assets
- they need a practical way to suppress speckles without understanding tracer internals

#### 5. `Invert`

Add an explicit polarity control:

- `Normal`
- `Invert`

Why:

- logos and symbols are often light-on-dark
- automatic background detection will not always guess correctly
- this gives the user a fast recovery path

#### 6. `Complexity`

Add a compact output complexity readout:

- `Path count`
- `SVG size`
- optional `Quality vs complexity` hint

Why:

- users need to know when the trace is becoming too heavy to be useful
- this helps them adjust before exporting an over-complex SVG

### Controls to avoid in v1

Do not expose every engine knob directly in the main UI.

Avoid:

- raw Potrace parameter names
- raw VTracer parameter names
- too many low-level numeric fit sliders
- vague AI-style enhancement controls

The converter should feel practical and confidence-building, not like a research console.

Keep advanced engine-specific knobs hidden unless a later expert mode is added.

## Phase 8: Fallback and Safety Policy

Some PNGs should not be force-vectorized if the result will obviously disappoint.

Add a quality guard:

- if the image looks photo-like or highly textured
- and estimated vector complexity explodes
- warn the user that the converter is optimized for icons, logos, and flat artwork

This protects product trust.

## Proposed Delivery Order

### Milestone 0

Run the color-engine feasibility spike:

- verify browser-safe color-capable VTracer-family availability
- verify whether a Supabase Edge Function route is truly viable
- verify whether a dedicated Node runtime is actually required

### Milestone 1

Improve the current flow before finalizing the new color-engine host:

- trim transparent bounds
- better small-image handling
- better thresholding
- better speckle cleanup
- quality benchmark harness

This should produce immediate wins and give a baseline for comparison.

### Milestone 2

Add the mono exact-trace path.

- integrate a browser-safe VTracer-family mono route
- route `Logo` and `Icon` style cases to it first
- keep current ImageTracer as fallback
- verify exactness improvements on the benchmark set

This is still the highest-value single upgrade.

### Milestone 3

Add the color tracing path.

- integrate the chosen color-capable engine in the runtime proven by Milestone 0
- route `Flat Art` and `Color` modes to it
- verify color-region separation and edge fidelity

### Milestone 4

Refine routing, cleanup, and UX.

- automatic engine selection
- better warnings
- better defaults
- progress feedback
- preview background control
- comparison modes
- small-icon and cleanup helper controls

## Verification Plan

For each benchmark image, compare old vs new on:

- corner accuracy
- hole preservation
- stroke separation
- background cleanliness
- path count
- SVG size
- visual similarity to source

Also verify:

- no UI freezes during tracing
- control changes cancel stale runs
- download and copy flows still work
- output opens correctly in browser/design tools
- preview background changes never alter exported SVG data
- compare modes stay aligned at the same scale and bounds
- small-icon mode improves tiny assets without hurting larger ones

## Preview Inspection UX

The converter preview should stay clean while still letting users inspect edge quality closely.

Add an inspection layer that affects preview only:

- mouse-wheel zoom on both input and output panes
- drag-to-pan when the preview is zoomed above `100%`
- `grab` / `grabbing` cursor states to signal panning
- hidden scrollbars so the panes do not look like generic browser scrollers

Important guardrails:

- this must not affect export size, SVG data, or tracing settings
- panning should reuse the existing scroll viewport instead of introducing a custom transform engine
- inspection should remain lightweight and stable, not turn the converter into a full image editor

## Key Design Decision

Do not pursue a “latest AI vectorizer” as the primary production path for this feature right now.

Recent research like SAMVG and CVPR 2025 layered vectorization is important signal, but not the right first implementation for this app.

The right build path is:

- classic exact tracing where it is strongest
- modern color tracing where it is strongest
- stronger preprocessing and routing around them

That gives Supericons a real quality jump without turning the converter into an unstable research project.
