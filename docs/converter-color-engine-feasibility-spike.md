# Converter Color Engine Feasibility Spike

## Date

April 5, 2026

## Purpose

This spike answers the next gating question for the `PNG -> SVG` converter:

`What is the lightest viable way to host a real color-capable tracing engine for Supericons?`

This is not a final implementation doc. It is a decision checkpoint intended to reduce wasted effort.

## Why This Spike Was Needed

The current converter has already shown:

- meaningful progress on mono/logo cases
- continuing weakness on multi-color logo/icon cases
- user-visible inconsistency across KFC, Shell, McDonald's, and white-on-dark icons

At this point, more UI or preset tuning is not the highest-leverage move.

The real question is:

- can we run a color-capable VTracer-family engine in the browser?
- if not, what runtime can host it with the least operational cost?

## Sources Used

Primary sources:

- local package docs for `vectortracer`
- local package docs for `@neplex/vectorizer`
- official VTracer repo
- Deno docs for Node-API / FFI
- Supabase Edge Functions docs and limits

## Current Local Repo Facts

### 1. Browser package in repo: `vectortracer`

The installed browser-facing package is:

- `vectortracer`

What the local docs show:

- binary image converter is supported
- color image converter is **not** documented as shipped

This is visible directly in:

- `node_modules/vectortracer/README.md`

Observed local evidence:

- `Binary Image Converter` is listed as available
- `Color Image Converter` is listed as unchecked / not completed

### 2. Node-native package in repo: `@neplex/vectorizer`

The installed Node-native package is:

- `@neplex/vectorizer`

What the local docs show:

- it exposes `ColorMode.Color`
- it exposes color controls such as:
  - `colorPrecision`
  - `filterSpeckle`
  - `layerDifference`
  - hierarchical and path simplification settings

This is visible directly in:

- `node_modules/@neplex/vectorizer/README.md`
- `node_modules/@neplex/vectorizer/index.d.ts`

Important local evidence:

- the package loads platform-specific `.node` binaries
- this is a Node-native runtime package, not a browser bundle package

### 2a. Local Node proof succeeded

A local Node spike was run directly in this repo against `dc_verify.png`.

Result:

- `@neplex/vectorizer` loaded successfully
- `vectorize(...)` returned SVG output successfully
- the engine is therefore not hypothetical in this repo; it is runnable locally in a Node runtime

Important nuance discovered during the spike:

- the package requires a full config shape or a preset enum value
- a partial config object was rejected

This matters because it confirms:

- the Node-native color path is technically real
- and the main uncertainty has shifted from `does the engine work?`
- to `where should we host it for product use?`

### 3. Current frontend runtime

The app is currently:

- static Vite frontend
- browser-driven converter in `store.js`

There is no existing Node HTTP converter service in the product runtime.

## External Runtime Findings

### 1. Official VTracer itself supports color tracing

The official VTracer repo confirms:

- color mode exists
- browser/WASM is part of the broader VTracer story
- the webapp demonstrates Rust + WASM viability

Important nuance:

- this confirms the **engine family** supports color
- it does **not** prove that our installed browser wrapper package already exposes that color path

That distinction is crucial.

### 2. Deno supports Node-API addons in principle

Deno documentation indicates:

- Node-API addons can work in Deno 2
- npm packages using Node-API addons are supported in some Deno runtimes
- native code usage requires FFI/native permissions

This means the earlier blanket assumption of:

- `Deno can never use Node-API addons`

is too strong.

However, this is **not enough** to conclude that hosted Supabase Edge Functions are a safe or supported production host for `@neplex/vectorizer`.

### 3. Supabase Edge Functions are promising but not yet proven for this case

Supabase docs confirm:

- Edge Functions are Deno-based
- they support npm dependencies
- they support WASM
- they have runtime and bundle limits

Important hosted constraints from Supabase docs include:

- memory limits
- CPU limits
- bundle size limits
- node libraries requiring multithreading are not supported
- web worker APIs are unavailable

So the Edge Function path is attractive, but still uncertain for this exact use case.

Key unresolved question:

- can `@neplex/vectorizer` or an equivalent color-capable VTracer-family runtime run reliably inside hosted Supabase Edge Functions under their native-code and resource constraints?

That has not been proven yet.

### 4. Local Edge-function-style spike is currently blocked in this workspace

Two practical blockers exist in the current environment:

- `deno` is not installed locally
- `supabase` CLI is not installed locally

So a true local Edge Function proof could not be executed in this workspace during this spike.

That means the Edge path remains:

- promising
- but unproven here

## Decision Matrix

### Option A: Stay browser-only with current installed browser package

Current evidence says:

- not viable for real color VTracer with the installed package

Why:

- the installed `vectortracer` package does not document a shipped color converter

Verdict:

- reject as the immediate color-engine path

### Option B: Find or build a browser-safe color-capable VTracer package

Possible, but not yet proven.

Two subpaths:

1. find an existing maintained browser-capable package exposing color mode
2. build a custom WASM wrapper around VTracer color mode

Pros:

- keeps product static
- avoids backend/service rollout

Cons:

- package availability is not confirmed
- custom build path is a non-trivial engineering task

Verdict:

- viable as a research spike
- not yet a committed implementation path

### Option C: Supabase Edge Function assisted converter

This is the lightest existing server-assisted option that fits the current stack.

Pros:

- matches current platform direction better than a totally new service
- gives clean request/response determinism
- keeps frontend simpler

Cons:

- native addon viability is not yet proven in hosted Supabase Edge
- bundle/runtime limits could block the approach
- may require a Deno-compatible WASM route rather than direct `@neplex/vectorizer`

Verdict:

- strong candidate
- requires a focused proof-of-viability spike before adoption

### Option D: Dedicated Node converter service

This is the clearest technical path if the goal is to run `@neplex/vectorizer` directly with minimal runtime ambiguity.

Pros:

- highest control
- cleanest direct host for the current Node-native color engine
- easiest environment for benchmarking and deterministic output

Cons:

- highest infrastructure and operational cost
- larger scope than the browser or Edge-assisted paths

Verdict:

- technically strong
- should be chosen only if lighter hosting options fail or are too risky

## Most Important Findings

### Finding 1

The color problem is still primarily an **engine-hosting problem**, not a UI problem.

### Finding 2

The installed browser package does **not** currently justify the assumption that browser-side VTracer color mode is ready to wire up quickly.

### Finding 3

The installed Node-native package already exposes the color capabilities we want, but it requires a runtime that can host native addons safely and predictably.

### Finding 4

Supabase Edge Functions remain a plausible middle path, but the Node-native package cannot yet be assumed to work there without a focused proof.

### Finding 5

A dedicated Node service is the clearest guaranteed path, but probably not the first path we should try if a lighter platform-supported option can work.

### Finding 6

The Node-native engine is already proven locally in this repo, which lowers technical risk for a server-hosted path significantly.

## Recommended Next Move

The best next move is a two-part narrowed spike:

### Part 1: Browser/WASM feasibility check

Goal:

- determine whether a real browser-safe VTracer color runtime already exists for our use case

If yes:

- prototype against the benchmark set

If no:

- stop browser-side color engine exploration quickly

### Part 2: Supabase Edge viability check

Goal:

- determine whether the hosted Supabase environment can run a suitable color-capable VTracer-family path

Important note:

- this may require a Deno/WASM route, not direct use of the Node-native addon

If that path is not clean:

- escalate to a dedicated Node converter service

If launch pressure is high and infrastructure simplicity matters less than certainty:

- the fastest technically certain path is now a Node-hosted proof service using `@neplex/vectorizer`
- because the engine itself has already been proven locally

## What This Means For The Roadmap

This spike supports the following roadmap changes:

- treat `engine choice` as the quality unlock
- treat `runtime hosting` as the packaging and determinism decision
- do not assume browser color VTracer is already available
- do not jump straight to a dedicated Node service without first checking lighter viable paths

## Final Assessment

As of this spike:

- browser mono VTracer path: validated and already in use
- browser color VTracer path: not validated with the installed package
- Supabase Edge path: promising but unproven
- dedicated Node service: strongest fallback if lighter paths fail

## Recommended Order

1. browser-safe color-capable VTracer availability check
2. Supabase Edge viability check
3. dedicated Node service only if needed

### Launch-pressure variant

If launch timeline pressure is stronger than infrastructure minimization:

1. browser-safe color-capable VTracer availability check
2. if not clearly viable, skip directly to a Node-hosted proof service using `@neplex/vectorizer`
3. revisit Edge compatibility later as an optimization path

That is the lowest-risk sequence that matches both the current repo and the launch timeline pressure.
