# Converter Engine Integration Audit

## Goal

Determine the safest and most realistic path to replace the current `imagetracerjs`-based PNG to SVG engine with a stronger vectorization engine in this repo.

## Current Repo Reality

Supericons is currently a static Vite app:

- frontend build only in [vite.config.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js)
- no Node web server in the app runtime
- existing backend surfaces are Supabase Edge Functions, which run on Deno rather than Node native addons

The current converter is entirely browser-side in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

That matters because the next engine choice must either:

- run in the browser, or
- run behind a new service that does not exist today

## What We Found

### 1. `@neplex/vectorizer` is real VTracer, but Node-native

The installed package in [node_modules/@neplex/vectorizer/index.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/node_modules/@neplex/vectorizer/index.js) loads `.node` binaries through N-API.

That means:

- it works in Node
- it does not run directly inside the browser bundle
- it is not usable as a drop-in replacement inside the current client-side converter

Package metadata confirms:

- package: `@neplex/vectorizer`
- license: MIT
- repo: `https://github.com/neplextech/vectorizer`

Its local README in [node_modules/@neplex/vectorizer/README.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/node_modules/@neplex/vectorizer/README.md) also describes it as a Node.js wrapper over VTracer.

### 2. Supabase Edge Functions are not the right host for this package

The repo already uses Supabase Edge Functions in [supabase/functions](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/supabase/functions), but those are Deno-based.

Because `@neplex/vectorizer` is a Node native addon:

- it cannot be dropped into the existing Supabase Edge Functions model
- it would require a separate Node runtime or a browser-safe alternative

### 3. Potrace is not a clean licensing fit for this product path

Potrace itself is extremely attractive for mono/logo tracing quality.

However:

- Potrace is GPL-licensed from the official site: `https://potrace.sourceforge.net/`
- browser wrappers that bundle Potrace inherit that risk

For a commercial static web product, that is a major red flag unless the whole licensing strategy is intentionally changed.

So while Potrace is still useful as a quality reference, it is not the best default implementation path for this repo right now.

### 4. VTracer is the better strategic engine family here

From the official VTracer repo:

- repo: `https://github.com/visioncortex/vtracer`
- license: MIT
- supports both color and binary workflows
- already has a Rust + wasm story in its upstream webapp

This makes VTracer a better strategic fit than Potrace for Supericons because it can cover:

- mono/icon/logo work
- color/flat-art work
- browser-safe deployment if we use a wasm-capable wrapper or build path

### 5. There is a browser-oriented package candidate: `vectortracer`

Package metadata from npm:

- package: `vectortracer`
- version: `0.1.2`
- license: MIT
- repo: `https://github.com/AlansCodeLog/vectortracer`

This suggests a potentially viable browser-safe path without forcing a Node backend into a currently static app.

This needs careful validation before adoption, but it is a much better fit than trying to inject a Node addon into the current frontend.

## Decision

The next engine step should **not** be:

- directly importing `@neplex/vectorizer` into the frontend
- building around Potrace first
- creating a Node-only local helper that works in development but not in production

The next engine step **should** be:

- adopt a browser-safe VTracer-family path for the mono/logo route first
- keep the current improved ImageTracer path as fallback
- validate quality, bundle impact, and browser behavior before expanding to color routing

## Recommended Architecture

### Phase A: Browser-safe mono route first

Build a new exact-ish mono/logo route using a browser-safe VTracer-family integration.

Use it only for:

- `Monochrome`
- screenshot-derived single-hue logos
- simple icon/logo candidates

Keep `imagetracerjs` as fallback for everything else during rollout.

### Phase B: Add worker isolation

Whichever browser-safe engine we adopt should run in a worker, not on the main UI thread.

That keeps:

- dragging
- zooming
- preview controls
- retries

responsive during tracing.

### Phase C: Expand to color route only after mono is stable

Once mono/logo quality is clearly better, add the richer color vector path for flat artwork.

## Why This Is The Right Next Step

It fits all three constraints at once:

1. better quality
2. viable licensing
3. deployable inside a static frontend product

## Risks

### 1. Browser-safe wrapper quality may not match native VTracer immediately

Mitigation:

- keep the current fallback path
- benchmark on the existing screenshot/logo test set before switching defaults

### 2. WASM integration may require extra server headers if threads are involved

From the official NAPI-RS WebAssembly docs:

- threaded wasm can require `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy`

If the chosen browser package depends on threaded wasm, we will need to confirm whether:

- dev
- preview
- production hosting

can support those headers cleanly.

### 3. Bundle size may grow

Mitigation:

- lazy-load only in `PNG -> SVG`
- keep the current converter initial load light

## Practical Conclusion

The original plan’s “Potrace first” framing is no longer the best implementation path for this repo.

The best next step is:

- revise the plan to a **browser-safe VTracer-family mono upgrade**
- prototype it behind the current `Monochrome` / logo-routing path
- keep the current engine as fallback

## Sources

Primary sources used:

- Official Potrace site: `https://potrace.sourceforge.net/`
- Official VTracer repo: `https://github.com/visioncortex/vtracer`
- Official NAPI-RS WebAssembly docs: `https://napi.rs/docs/concepts/webassembly`
- npm metadata for `@neplex/vectorizer`
- npm metadata for `vectortracer`

Local repo sources used:

- [vite.config.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/vite.config.js)
- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [node_modules/@neplex/vectorizer/index.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/node_modules/@neplex/vectorizer/index.js)
- [node_modules/@neplex/vectorizer/README.md](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/node_modules/@neplex/vectorizer/README.md)
