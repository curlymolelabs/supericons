# Premium Export Click Accuracy Fix Plan

## Goal
Fix the premium animated export pipeline so `Click` exports are truly click-triggered, not autoplaying on load, and make every downstream animated export interface emit consistent, correct behavior.

## Why This Follow-up Plan Exists
The earlier parity plan established the intended UX direction, but the export audit found that the current implementation is still incorrect in shipped output.

The clearest evidence is in [sparkles-animated.svg](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/sparkles-animated.svg#L8), where the exported selectors are plain:
- `svg.si-animated-icon .sf-sparkles-p1`
- `svg.si-animated-icon .sf-sparkles-p2`

Those selectors do not include `:active` or `.active`, so the animation autoplays immediately instead of waiting for click interaction.

## Audit Findings To Fix

### 1. Click exports are not actually click-triggered
- The authored pack CSS for `sparkles` is token-based and hover-oriented in [status-feedback.css](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/packs/status-feedback/status-feedback.css#L379) and [status-feedback.css](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/packs/status-feedback/status-feedback.css#L384).
- The current click rewrite in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1731) only catches selectors that are already normalized around the standalone export root.
- Token selectors are normalized later in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1752), after the click rewrite already ran.
- Result: the token selectors miss click conversion, then get flattened into plain root selectors and become autoplay rules.

### 2. Exported animated SVG contains duplicate selectors
- [sparkles-animated.svg](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/sparkles-animated.svg#L8) and [sparkles-animated.svg](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/sparkles-animated.svg#L9) are identical.
- The same duplication happens again at [sparkles-animated.svg](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/sparkles-animated.svg#L14) and [sparkles-animated.svg](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/sparkles-animated.svg#L15).
- This is not the root bug, but it shows the selector rewrite pipeline is not producing a canonical result.

### 3. Framework exports do not cleanly expose `.active` control
- React export in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2246)
- Vue export in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2268)
- Svelte export in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2279)

These wrappers place the SVG string inside a `<span>`, so any consumer class lands on the wrapper instead of the inner `<svg>`. That means `:active` still works when physically pressing the rendered element, but state-driven `.active` replay is awkward or unavailable without editing the snippet.

## Scope

### In scope
- Premium animated export selector rewriting in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1654)
- Premium animated export entry point in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2197)
- Animated SVG, HTML, Base64, React, Vue, and Svelte premium export outputs
- Canonical click selector behavior for standalone exported SVGs
- Framework export ergonomics for `.active`-class triggering
- Verification artifact regeneration for the `sparkles` sample in `docs/`

### Out of scope
- Motion Lab export logic
- Free icon customize/export logic
- Static SVG export path
- PNG export path
- Premium preview-only one-shot playback behavior

## Target Behavior After Fix

### Click export semantics
For premium animated exports in `Click` mode:
- animation should not autoplay on initial load
- animation should run while the exported SVG is pressed via `:active`
- animation should also be triggerable by applying `.active` to the exported SVG root in code contexts
- click playback should remain finite rather than infinite

### Canonical selector shape
Every exported click rule should compile to one canonical root-aware selector shape:
- `svg.si-animated-icon:active ...`
- `svg.si-animated-icon.active ...`

No leftover token-root selectors and no duplicate selector pairs should remain in final output.

## Implementation Plan

### 1. Split export CSS transformation into explicit phases
Refactor the animated export builder in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1654) so selector processing is not doing normalization and trigger conversion in the wrong order.

Recommended phases:
1. derive export CSS from authored pack CSS
2. normalize authored selectors to the standalone export root
3. apply trigger semantics (`loop`, `hover`, `click`) to the normalized selectors
4. normalize animation iteration counts for click mode
5. dedupe selectors / rule fragments

This removes the current bug where token selectors bypass the click branch and get flattened afterward.

### 2. Normalize token-based selectors before trigger conversion
Add a dedicated normalization pass that converts pack-scoped selectors such as:
- `.pack-token .sf-sparkles-p1`
- `.si-icon-cell:hover .pack-token .sf-sparkles-p1`

into the standalone export-root form before click logic runs.

The fix should handle:
- root-only selectors
- token-descendant selectors
- hover-authored selectors that need conversion into click selectors
- authored selectors with comma-separated variants

### 3. Rebuild click conversion on top of normalized selectors
Once selectors are normalized, apply click conversion consistently:
- `hover` authored selectors become root `:active` and root `.active`
- autoplay selectors are not emitted for click mode
- `infinite` is replaced with a finite interaction count only in click mode

This should happen after root normalization, not before it.

### 4. Add a final canonicalization and dedupe pass
After click conversion:
- dedupe identical selectors
- collapse repeated comma entries
- avoid generating the same selector twice when multiple authored forms normalize to one exported selector

Expected outcome:
- [sparkles-animated.svg](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/sparkles-animated.svg#L8) style duplication disappears
- final CSS is smaller and easier to inspect

### 5. Preserve shared output parity across all animated export interfaces
All of the following currently depend on [buildPremiumAnimatedExportSvg](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2197):
- Copy Animated SVG
- Download Animated SVG
- Copy HTML
- Copy Base64
- Copy React
- Copy Vue
- Copy Svelte

The fix must be made once at the shared SVG-builder layer and then verified in every interface so there is no format drift.

### 6. Improve framework export ergonomics for `.active`
Decide and implement one of these approaches for React/Vue/Svelte exports:

#### Preferred
Make the exported snippet expose class/state control on the inner SVG root rather than only on the wrapper.

Possible approaches:
- inject a configurable root class directly into the exported SVG markup
- emit a component variant that replaces `class="si-animated-icon"` with a mergeable class expression
- allow a prop-driven `.active` state on the SVG root

#### Acceptable fallback
Keep the wrapper-based export, but include a clear inline comment or snippet structure that shows how to target the inner SVG root for `.active`.

Recommendation:
- use the preferred path for React
- mirror the same concept in Vue and Svelte

This is important because the current product promise for click mode is not just `:active`, but also `.active` for code contexts.

### 7. Re-generate and verify the sparkles reference artifact
Rebuild the `sparkles` animated sample and confirm:
- selectors contain `:active` / `.active`
- autoplay-on-load selectors are gone for click mode
- duplicate selector lines are gone
- the output still renders the same icon geometry and animation keyframes

## Verification Plan

### Code-level
- `node --check store.js`
- `npm run build`

### Direct output inspection
Using the premium `sparkles` icon in `Click` mode, verify:
1. `Copy Animated SVG`
2. `Copy HTML`
3. `Copy Base64` after decoding
4. `Copy React`
5. `Copy Vue`
6. `Copy Svelte`

For each one, inspect the emitted SVG payload and confirm:
- `svg.si-animated-icon:active ...` is present
- `svg.si-animated-icon.active ...` is present
- plain autoplay selectors are absent for click mode
- duplicate selector entries are absent

### Browser behavior checks
For the same icon:
1. Inline the animated SVG in a test page
2. Confirm it does not animate on initial load
3. Confirm it animates while pressing the SVG
4. Confirm adding `.active` to the SVG root triggers the animation

### Regression checks
- `Loop` export still loops continuously
- `Hover` export still animates on hover only
- static `Copy SVG` remains unchanged
- preview playback still behaves as preview-only authoring behavior

## Risks
- The main risk is over-normalizing selectors and breaking icons with more complex authored CSS patterns.
- The safest mitigation is to fix the pipeline in phases and validate against multiple premium icons, not only `sparkles`.
- Framework export changes must avoid breaking existing snippet copy ergonomics while improving inner-SVG control.

## Recommended Sequence
1. Refactor selector normalization and trigger conversion order
2. Add selector dedupe/canonicalization
3. Verify raw Animated SVG output first
4. Verify HTML and Base64 outputs
5. Improve React/Vue/Svelte `.active` ergonomics
6. Rebuild the `sparkles` sample artifact
7. Run full regression checks on `loop`, `hover`, and `click`
