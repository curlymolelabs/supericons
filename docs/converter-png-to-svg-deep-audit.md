# PNG-to-SVG Converter: Deep Audit Report

## What This Audit Covers

This is a first-principles read of the full converter source code in `store.js` (~2,900 lines, section
`// ── Converter ────` starting at line 5951), combined with all prior audit docs under `docs/` and the
`tools/converter-proof-service/` implementation. No other agent sessions were used.

The three questions you asked are answered directly below, then elaborated.

---

## Question 1: Can the Current Converter Work Across Scenarios?

**Short answer: No -- not reliably. Mono works reasonably well. Color does not.**

### What the converter actually is today

The PNG-to-SVG path runs entirely in the browser. It has three tiers:

```
Upload PNG
  -> detectBackgroundFromCorners()        [corner-sample heuristic]
  -> detectConverterContentBounds()       [auto-crop by foreground pixels]
  -> analyzeConverterTraceProfile()       [pixel-level color analysis]
  -> resolveConverterPreset()             [Auto mode heuristic]
  -> getConverterTraceRoute()             [mono-exact / flat-art-color / color-default]
  -> preprocessImageData()               [threshold + flatten + binarize]
  -> BRANCH 1: traceWithConverterMonoEngine()   [vectortracer WASM]
       -> fallback: traceWithImageTracerEngine()
  -> BRANCH 2: traceWithImageTracerEngine()   [imagetracerjs CDN for color]
  -> buildConverterTraceArtifact()        [normalize, strip, retint]
  -> showConverterOutput()

  // Optional: if VITE_CONVERTER_PROOF_URL is set (dev only):
  -> traceWithConverterProofService()     [Node proof-service, @neplex/vectorizer]
     [falls back to browser path on failure]
```

### Per-scenario assessment

| Scenario | Route Taken | Works? | Why |
|---|---|---|---|
| Mono logo on white BG | `mono-exact` via vectortracer | **Yes** | BinaryImageConverter + solid preprocessing pipeline is effective |
| Transparent mono icon | `mono-exact` via vectortracer | **Mostly** | `transparentMonoThreshold` heuristic can misfire on low-contrast icons |
| Single-hue logo (Starbucks) | `mono-exact` because `likelySingleHueLogo=true` | **Yes** | This is the documented success story |
| Flat multi-color logo (KFC, Shell) | `flat-art-color` -> imagetracerjs | **No** | `flattenConverterColorArtwork()` snaps to palette before ImageTracer sees the image; then ImageTracer's k-means quantization further collapses colors. The combination is destructive for brand marks. |
| Complex multi-color (McDonald's) | `color-default` -> imagetracerjs | **No** | No palette pre-processing here, but ImageTracer's color quantization alone cannot preserve brand-accurate color regions reliably. |
| White-on-dark square icon | Heuristic chooses wrong route | **Inconsistent** | `detectBackgroundFromCorners()` may mis-read a colored square as background-free, then `transparentMonoThreshold` or `invert` produces wrong polarity |
| Auto preset | Resolves to one of the above | **Unreliable** | `resolveConverterPreset()` chooses based on heuristics that can misfire; result depends on whether the heuristic matches reality |

**Conclusion:** The converter CAN work for the mono/single-hue-logo scenario class. It CANNOT reliably work for the multi-color scenarios it is also designed to handle. The implicit capability claim (`Color Mode` option, `flat-art-color` route, KFC/Shell being listed as targets) is not yet earned by the implementation.

---

## Question 2: Are the Helpers and Cleanup Blocking or Affecting Effectiveness?

**Short answer: The helpers are net positive for mono. For color, they are a primary failure driver.**

### Helper-by-helper breakdown

#### `detectBackgroundFromCorners()` -- Mostly Helpful, Occasionally Wrong
- Corner sampling is a reasonable heuristic for icons on solid backgrounds.
- Fails for: center-weighted logos on transparent backgrounds, icons where corners contain content, white logos on white borders.
- When wrong, it cascades: `isConverterForegroundPixel()`, `detectConverterContentBounds()`, and `flattenConverterColorArtwork()` all rely on the returned `bgColor`.

#### `autoCrop` / `detectConverterContentBounds()` -- Net Positive
- Correctly removes surrounding empty space in most cases.
- Tightly binarized: uses the same foreground-detection logic as preprocessing, so if background detection is wrong, crop will be wrong too.
- Minor issue: the 1-pixel pad is sometimes insufficient for anti-aliased edges.

#### `enhanceSmallIcons` / upscaling -- Net Positive
- Upscaling small icons (<=24px -> 4x, <=48px -> 3x, <=96px -> 2x) before tracing is correct behavior.
- `useSharpUpscale` flag disables interpolation for mono/flat-art: good decision.
- Issue: the vectortracer WASM pipeline runs at the upscaled resolution and then scales path coordinates back, which is correct but adds rendering time for small inputs.

#### `flattenConverterColorArtwork()` -- **The Primary Color Route Failure Driver**
This is the most consequential helper and the most dangerous.

What it does:
1. Snaps every foreground pixel to the nearest color in `traceProfile.palette` (a 6-entry deduplicated palette derived from quantized color counts)
2. Then runs a 3x3 majority-vote spatial smoothing pass on the label field
3. Writes the snapped palette colors back to the imageData before ImageTracer runs

Why this is destructive for color logos:
- The palette is extracted with `getConverterQuantizedColorKey(r,g,b, step=24)` -- a step of 24 in each channel is aggressive quantization. Nearby colors (e.g., dark red `#8B0000` and black `#000000`) can collapse into the same bucket.
- After palette snap, anti-aliased edge pixels (which naturally lie between two colors and act as boundary hints) are eliminated. The two adjacent regions now share hard-snapped colors with no gradient transition.
- ImageTracer's k-means then runs on a pre-quantized image. The two steps compound each other: the image is already aggressively simplified, and k-means adds a second simplification pass, further erasing the difference between close-but-distinct color regions.
- The spatial smoothing pass reinforces dominant-region labels, which benefits large flat areas but absorbs small text-like regions (e.g., the KFC wordmark inside a red field) into the surrounding dominant color.

The outcome documented in `audit-converter-multicolor-preset-regression.md` is precisely this: KFC `Balanced` and `Detailed` presets collapse black letters into the red fill. This is not a minor tuning bug -- it is an intrinsic consequence of combining aggressive palette-snap with spatial smoothing before a color-quantizing tracer.

#### `applyBinaryNoiseCleanup()` -- Net Positive for Mono Only
- Morphological erosion/dilation on the binary mask.
- This is standard and correct for mono traces.
- Does not apply to color mode (only runs after the binary threshold step).

#### `stripConverterMonoStroke()` -- Net Positive
- Removes `stroke`/`stroke-width` attributes from mono traces.
- Vectortracer WASM emits these unnecessarily; stripping them is correct.
- Safe: only called on mono-route outputs.

#### `stripBackgroundPaths()` -- Net Positive with Caveat
- Removes SVG paths whose fill is close to white (used as background sentinel).
- The sentinel is either `[255,255,255]` or `CONVERTER_TRANSPARENT_BG_SENTINEL [255,0,255]` (magenta).
- Magenta sentinel for transparent-background inputs is a clever workaround.
- Caveat: white paths in the original logo's design space get stripped. A logo with a white interior region (e.g., the white "negative space" windows in a logo) would lose that white.

#### `retintConverterForegroundSvg()` -- Net Positive for Mono, Irrelevant for Color
- For mono outputs, recolors all non-white fills to the dominant color detected by `pickConverterMonochromeFill()`.
- Important for making the mono output appear in the right hue rather than uniformly black.
- The `forceRetint` flag on mono ensures white fills are also recolored (needed when the icon fill happens to be white).

#### `preprocessImageData()` overall -- Critical Path
- For mono: converts image to binary (black=foreground, white=background) before imagetracerjs or vectortracer. This is necessary because imagetracerjs ignores alpha and would otherwise trace everything as one fill.
- For color: removes background pixels but does NOT binarize. This is the correct behavior.
- The color branch relies entirely on imagetracerjs to do its own quantization, which as described above, is insufficient.

### Cleanup summary

| Helper | Mono | Color |
|---|---|---|
| `detectBackgroundFromCorners` | Helps | Upstream dependency -- can cascade failures |
| `autoCrop` | Helps | Helps |
| `flattenConverterColorArtwork` | Not used | **Primary failure driver** |
| `applyBinaryNoiseCleanup` | Helps | Not used |
| `stripConverterMonoStroke` | Helps | N/A |
| `stripBackgroundPaths` | Helps | Helps (with caveat) |
| `retintConverterForegroundSvg` | Helps | N/A |
| `buildConverterMonoEngineConfig` | Well-designed | N/A |
| `buildImageTracerOptions` | Well-designed | Well-designed for what ImageTracer can do |

---

## Question 3: Is the Design Sound? Should It Be Purpose-Specific?

**Short answer: The design is overextended. The mono path is sound in isolation. The color path rests on an engine (imagetracerjs) that cannot deliver what the product implies.**

### What the design is doing right

1. **Token-based race guard** (`_convToken`): Each async conversion increments a token; stale completions are discarded. This is correctly implemented and solves the determinism-under-rapid-input problem.

2. **Proof-service client** (`traceWithConverterProofService`): The integration with the local Node proof-service is architecturally correct. The service uses `@neplex/vectorizer` (real VTracer via N-API), which is the right engine for color. The client uses `CONVERTER_PROOF_SERVICE_URL` to gate on whether the service is available and falls back to the browser path transparently.

   > **Critical gap**: `CONVERTER_PROOF_SERVICE_URL` is only populated when `VITE_CONVERTER_PROOF_URL` is set in the environment OR in dev mode pointing to localhost. In production, it is an empty string (`''`), which means the proof service path is **never reached in production**. The entire `traceWithConverterProofService` code path is dead in production today.

3. **Preset differentiation for mono**: `buildConverterMonoEngineConfig()` has thorough preset-by-preset tuning (cornerThreshold, spliceThreshold, filterSpeckle, pathPrecision, maxIterations all vary by preset AND by smoothness slider).

4. **Fallback chain**: The mono-engine fallback to ImageTracer (via `shouldFallbackFromMonoTrace()`) and the polarity-retry logic (auto-detect if inverted would help) are thoughtful error recovery strategies.

5. **UI isolation**: The preview background control, compare modes (Trace/Original/Split/Overlay), and zoom/pan are correctly decoupled from the output state. These do not affect conversion quality.

### What the design is doing wrong

1. **The color engine is wrong for the product's stated goal.** The product presents Color Mode as a capability for multi-color logo conversion. ImageTracer v1.2.6 (loaded from CDN) is a generic image tracer with pixel-grid region contour tracing. It does not perform color-region segmentation, shape decomposition, or topological consistency. For logo inputs (flat regions, brand colors), the quantization-then-contour approach produces structurally incoherent SVGs where small color differences collapse.

2. **`flattenConverterColorArtwork()` is pre-processing that assumes the palette is already correct.** It runs a 24-step quantization, then a majority-vote smoothing, then hands the result to ImageTracer whose own k-means further modifies it. There are two competing simplification algorithms in sequence with no coordination between them. The palette from step 1 has already been distorted before step 2 even begins.

3. **`Auto` preset is not trustworthy.** `resolveConverterPreset()` resolves Auto to a concrete preset via heuristics (`likelySingleHueLogo`, `likelyFlatArtwork`, coverage thresholds). These heuristics are reasonable approximations but they can misfire. When Auto misfires, the user gets a worse result than if they had chosen Compact or Exact manually. This violates the implied contract of "Auto = best result."

4. **The proof-service is dead in production.** This is the most important architectural gap. The proof-service (`@neplex/vectorizer`) is the only part of the codebase that can produce trustworthy color results (real VTracer with proper color quantization). But it only activates when `VITE_CONVERTER_PROOF_URL` is set -- which it is not in production. So every user in production gets the imagetracerjs color path, which is documented to fail for KFC/Shell/McDonald's.

5. **The design is all-purpose but the engine library is only capable for one purpose.** The state model, UX, and routing infrastructure suggest a general icon/logo converter for both mono and multi-color inputs. But only the mono path has an engine that can deliver this. The color path falls short structurally, not because of tuning.

### Should it be designed for a specific purpose?

Yes. Here is the right framing:

**What this converter can reliably be today:**
- A mono/single-hue logo tracer (vectortracer WASM path)
- An SVG-to-PNG renderer (SVG-to-PNG path is correct and complete)

**What it cannot be today without an engine change:**
- A multi-color logo/icon tracer
- A reliable Auto-mode converter for unknown inputs

**Recommended purpose scope (without new infrastructure):**
- Remove or disable the Color Mode option, or label it clearly as experimental.
- Keep Auto only if its heuristics are validated on a benchmark set.
- Focus the product claim on: "Convert monochrome icons and single-hue logos to SVG vectors."

**Recommended purpose scope (with the proof-service shipped):**
- Wire `VITE_CONVERTER_PROOF_URL` to a deployed endpoint (Supabase Edge Function or equivalent).
- The proof-service already uses `@neplex/vectorizer` with both `ColorMode.Binary` and `ColorMode.Color`.
- Once active, the color path becomes viable. At that point, a full-purpose claim is defensible pending benchmark validation.

---

## Root Causes of Iteration Failure

The previous agents iterated many times for the same reason: they were tuning parameters of imagetracerjs for color inputs that imagetracerjs cannot trace correctly at any parameter setting. The tuning effort was sincere but the problem was at the engine selection layer, not the parameter layer.

This explains the pattern of "solved in one case, broke another": each tuning pass moved the parameter set to be more optimal for the specific test case at hand, but the underlying algorithm could not generalize. Logo color fidelity is a segmentation problem (find semantically distinct color regions), not a quantization problem (find the most common color buckets). ImageTracer solves only the quantization version.

---

## Summary Verdict

| Dimension | Finding |
|---|---|
| Mono/logo tracing | Sound. vectortracer WASM is the right engine. Preprocessing, cleanup, and fallback chain are well-designed. |
| Color tracing (in production) | Broken. imagetracerjs cannot reliably preserve brand colors. `flattenConverterColorArtwork` compounds the problem. |
| Color tracing (via proof-service) | Dead in production. The service exists and works, but `CONVERTER_PROOF_SERVICE_URL` is always empty in production. |
| Auto preset | Unreliable. Useful as a concept but not yet validated against a benchmark set. |
| Design soundness | Overextended. The infrastructure and UX are well-built. The engine library does not support the full scope it implies. |
| Helpers / cleanup | Mixed. Mono helpers are net positive. Color helpers (`flattenConverterColorArtwork`) actively harm output quality. |
| Single-purpose vs. all-purpose | Should be scoped to mono+single-hue until the proof-service is deployed. |

---

## Highest-Leverage Next Step

Connect the proof-service to production. Everything else (Auto validation, Color Mode truthfulness, benchmark gating) depends on having a real color engine running. The code already has the client (`traceWithConverterProofService`), the service (`tools/converter-proof-service`), the fallback chain, and the UI. Only the URL is missing.

