# Ionicons Motion Lab Hover Fix: Implementation Plan

Source: Motion Lab hover-preview investigation on 2026-04-03
Baseline checkpoint: `ac71977`

## Problem Summary

In Motion Lab, scale-heavy hover previews such as `Pulse` and `Shockwave` cause some Ionicons outline icons to collapse into a large solid-looking circle at preview size. The issue reproduces with `ionicons / close-circle-outline`, but does not reproduce with non-scale presets like `Shake`, and does not reproduce the same way with Lucide equivalents.

### Confirmed Root Cause

1. Ionicons outline assets are normalized from large `512x512` SVGs and have their original `stroke-width` stripped during import in [scripts/build-icons.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js).
2. Motion Lab reconstructs large-viewBox outline stroke widths heuristically when the icon is mounted in [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).
3. Scale-based presets currently animate the outer preview `<svg>` itself via the `__root__` selector in [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).
4. Existing `vector-effect="non-scaling-stroke"` safeguards are applied to child shapes, but the scale animation still runs on the outer `<svg>`, so the preview artifact remains.

## Stability Goals

1. Fix the Motion Lab preview bug without changing unrelated icon libraries or stable flows.
2. Keep preset definitions intact.
3. Keep the first rollout limited to Motion Lab preview behavior.
4. Avoid changing export output in the same step as the preview fix.
5. Preserve an immediate fallback to the current root-SVG behavior if the wrapper target is absent.

## Explicit Non-Goals

1. No redesign of preset timing, amplitude, or easing.
2. No library package upgrades.
3. No global animation engine rewrite outside Motion Lab.
4. No `scripts/build-icons.js` change in the first fix pass.

---

## Phase 0: Baseline Lock + Regression Checklist

No production logic changes in this phase.

### [VERIFY] Motion Lab baseline

Use the existing repro before touching code:

1. Load `ionicons / close-circle-outline` in Motion Lab.
2. Hover `Pulse` and confirm the solid-circle artifact appears.
3. Hover `Shockwave` and confirm the same artifact appears.
4. Hover `Shake` and confirm the icon remains visually correct.
5. Load a Lucide comparison icon and confirm `Pulse` remains visually correct.

### Success criteria for later phases

1. Ionicons `Pulse` and `Shockwave` no longer collapse into a solid disk.
2. Ionicons `Shake` remains unchanged.
3. Lucide preview behavior remains unchanged.
4. Click-to-apply presets still work.
5. Export still works exactly as before until export parity is intentionally changed in a later phase.

---

## Phase 1: Introduce a Motion Lab Preview Animation Target

This is the lowest-risk structural change. The goal is to stop animating the outer `<svg>` in preview, while keeping a fallback to the current behavior.

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

#### 1. Update `loadSvgIntoMotionLab(svgText)`

Inside `loadSvgIntoMotionLab(...)`, wrap drawable children in a synthetic inner group, for example:

```html
<g class="ml-icon-root" data-ml-anim-target="true">...</g>
```

Rules:

1. Leave `<defs>`, gradients, masks, clipPaths, metadata, and other non-drawable nodes at the SVG root.
2. Move only visible/drawable children into the synthetic wrapper.
3. Do not alter the original incoming icon markup beyond this preview-only structural wrapper.
4. If wrapping fails for any reason, keep the current root-SVG behavior.

#### 2. Add Motion Lab target helpers

Add two small helpers near the Motion Lab utilities:

1. `getMotionLabSvgRoot()`
2. `getMotionLabAnimTarget()`

Behavior:

1. `getMotionLabSvgRoot()` returns `#mlPreview svg`
2. `getMotionLabAnimTarget()` returns `[data-ml-anim-target="true"]` if present
3. If no wrapper exists, `getMotionLabAnimTarget()` falls back to the root SVG

This fallback is the main safety net for the stable codebase.

#### 3. Keep synthetic wrapper invisible to the editor UI

Update Motion Lab DOM walking and selection logic so the wrapper never appears as a selectable user element:

1. `buildElementTree(svgEl)` should skip the synthetic wrapper itself and continue walking its children.
2. Preview click hit-testing should not resolve selection to the wrapper.
3. The element tree, labels, and selectors shown in the UI should remain the same as they are today.

### Phase 1 verification

1. Motion Lab still opens and loads icons normally.
2. The layer tree does not suddenly show a new fake wrapper node.
3. Clicking paths in the preview still selects the expected icon element.
4. No export code changes yet.

---

## Phase 2: Route Preview Transforms to the Inner Target Only

Once the wrapper exists, the preview engine should use it for root-level transforms instead of the outer SVG.

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

#### 1. Change preview CSS generation for `__root__`

Update `generateTrackCSS(...)` so that:

1. For preview generation only, `__root__` maps to the Motion Lab animation target, not to `svg`
2. For non-root element tracks, behavior stays unchanged
3. For export generation, keep the current root-target behavior unchanged in this phase

Recommended approach:

1. Preserve the existing `__root__` track model
2. Only change how preview CSS resolves the target selector
3. Do not change preset data structures

#### 2. Change live transform preview helpers

Update:

1. `livePreviewProp(...)`
2. `updateLiveTransform(...)`
3. Any preview-only transform reset logic in `generateAndInjectCSS(...)`

New rule:

1. Root-level scale and rotate preview should target `getMotionLabAnimTarget()`
2. The outer `<svg>` should remain the stable viewport/container

#### 3. Move non-scaling-stroke enforcement to the effective preview target flow

Keep using `vector-effect="non-scaling-stroke"` for scale-based preview, but base the logic on the actual drawable subtree under the animation target.

That means:

1. Query shapes from the animation target subtree
2. Apply/remove `vector-effect` there
3. Do not rely on the outer SVG transform path

#### 4. Keep preview base CSS aligned with the wrapper model

Update preview base CSS from "root SVG always transforms" to:

1. Outer SVG remains centered and dimensioned
2. Inner wrapper receives root animation transforms
3. Child shapes still keep `transform-box: fill-box` and `transform-origin: center`

### Phase 2 verification

1. Re-test Ionicons `close-circle-outline`
2. Hover `Pulse` and verify the outline stays an outline
3. Hover `Shockwave` and verify the outline stays an outline
4. Hover `Shake` and verify no regression
5. Re-test a Lucide circular outline icon and verify it still behaves correctly
6. Use scale/rotate sliders and verify the preview remains stable

---

## Phase 3: Export Parity Hardening

Do not start this phase until preview behavior is confirmed stable.

The preview fix changes where the "whole icon" transform lives. Export needs to either preserve that structure or intentionally flatten it.

### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Choose one export strategy and keep it consistent:

### Recommended strategy: preserve the inner wrapper in exported SVG/CSS

1. Keep `.ml-icon-root` or equivalent wrapper in the exported SVG clone
2. Update:
   - `rewriteForStandalone(...)`
   - `rewriteForExternal(...)`
   - any root-target selector mapping
3. Map preview root animation from `#mlPreview ...` to:
   - `#animated-icon .ml-icon-root` for standalone SVG
   - `#icon-container .ml-icon-root` for external CSS

Why this is safer:

1. It preserves the structure already proven in preview
2. It avoids reintroducing root-SVG scaling in export
3. It avoids a second transform composition model

### Deferred alternative: flatten wrapper during export

This is possible, but should be avoided in the first pass because it adds extra DOM rewrite risk and increases the chance of mismatch between preview and export.

### Export cleanup requirements

Update `cleanSvgClone(...)` only as needed:

1. Strip preview-only inline styles and `vector-effect` as today
2. Keep the synthetic wrapper only if export logic now depends on it
3. Do not strip the wrapper if exported CSS targets it

### Phase 3 verification

1. Export Ionicons `Pulse` as standalone SVG and confirm animation still works
2. Export Ionicons `Shake` and confirm no regression
3. Export Lucide `Pulse` and confirm no regression
4. Verify external CSS export selectors still work
5. Verify no duplicate transforms appear in exported CSS

---

## Phase 4: Optional Ionicons Import Cleanup

This phase is intentionally deferred. It is not required to ship the bug fix.

### [MODIFY] [scripts/build-icons.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/build-icons.js)

Investigate whether Ionicons should keep a normalized stroke-width value during import instead of relying on preview-time reconstruction.

Potential directions:

1. Preserve original stroke-width as metadata before stripping
2. Normalize Ionicons once during build instead of rehydrating them heuristically at runtime
3. Limit the runtime heuristic path in Motion Lab once a more reliable build-time value exists

This should only happen after the preview/export fix is proven stable.

---

## Guardrails During Implementation

1. Do not change preset definitions in `PRESETS`
2. Do not change non-Motion-Lab icon rendering paths
3. Do not change converter/export/paywall/auth flows as part of this fix
4. Ship Phase 1 and Phase 2 together only if the wrapper fallback is in place
5. Do not bundle `scripts/build-icons.js` changes into the first patch

## Manual Verification Matrix

| Area | Test | Expected |
|---|---|---|
| Motion Lab preview | Ionicons `close-circle-outline` + `Pulse` hover | No solid-circle collapse |
| Motion Lab preview | Ionicons `close-circle-outline` + `Shockwave` hover | No solid-circle collapse |
| Motion Lab preview | Ionicons `close-circle-outline` + `Shake` hover | Same as current good behavior |
| Motion Lab preview | Lucide circular outline + `Pulse` hover | Same as current good behavior |
| Motion Lab controls | Scale slider on Ionicons outline | Outline remains readable |
| Motion Lab controls | Rotate slider on Ionicons outline | No wrapper-selection regression |
| Motion Lab selection | Click icon path on preview canvas | Correct element is selected |
| Motion Lab tree | Open elements panel | No synthetic wrapper shown |
| Export modal | Open export after preset apply | Still opens normally |
| Standalone export | Ionicons `Pulse` | Matches preview behavior after Phase 3 |
| External CSS export | Ionicons `Pulse` | Selector targets remain valid after Phase 3 |

## Recommended Rollout Order

1. Implement Phase 1 wrapper plus fallback
2. Implement Phase 2 preview target routing
3. Verify all preview regressions manually
4. Only then update export parity in Phase 3
5. Leave Phase 4 for later unless export or new Ionicons cases still expose stroke normalization problems

## Expected Outcome

After Phase 2, the broken Motion Lab hover preview should be fixed for Ionicons without disturbing the stable parts of the app, because the risky behavior change is isolated to the Motion Lab preview animation target instead of the global icon/export pipeline.
