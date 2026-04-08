# Material Symbols Motion Lab Asset Profile Fix Plan

Source:
- [audit-material-symbols-motion-lab.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/audit-material-symbols-motion-lab.md)

Baseline:
- Material Symbols now resolve successfully into Motion Lab through the export-grade SVG path.
- Motion Lab presets are attaching and running for Material icons.
- The remaining issue is that Material icons feel weak or broken in Motion Lab because they arrive as single filled snapshot glyphs, while Motion Lab behavior is tuned for richer multi-part SVG structure.

## Problem Summary

Material Symbols are not failing to animate because of a selector or CSS injection bug. The real mismatch is structural:

1. Material icons enter Motion Lab as resolved snapshot SVGs.
2. Those snapshots are usually a single filled compound `<path>`.
3. Motion Lab presets currently animate the icon as one root-level unit.
4. Motion Lab has no icon-structure awareness, so it applies the same preset behavior to single-fill glyphs and to multi-part stroke icons.

Result:

- animation technically runs
- but the visual effect is often too subtle, too blunt, or too unexpressive
- users understandably interpret this as Motion Lab "not working" for Material Symbols

## Objective

Improve Motion Lab behavior for Material Symbols without destabilizing:

- the working Material export pipeline
- the working Motion Lab loader path
- existing non-Material icon behavior

Success means:

1. Material icons feel visibly animated and intentional in Motion Lab.
2. Existing SVG libraries such as Lucide, Tabler, Ionicons, and Iconoir behave exactly as before.
3. The current export parity work remains untouched.
4. The implementation is additive, local to Motion Lab, and easy to rollback.

## Non-Goals

This plan does not attempt to:

1. replace Material Symbols with a different library
2. redesign the full Motion Lab preset system
3. change Material preview rendering outside Motion Lab
4. change the owned-cache export pipeline
5. build a new decomposed Material SVG asset set in the first pass

## Chosen Fix Direction

Add an internal Motion Lab asset-profile layer and adapt preset behavior for icons that are effectively single filled glyphs.

### Core rule

Motion Lab should not treat all input SVGs as structurally equivalent.

Instead:

1. profile the incoming icon when it is loaded
2. classify its geometry
3. adapt root-level preset behavior when the icon is a `single-fill-glyph`

This preserves the existing Motion Lab architecture while improving fit for Material Symbols.

## Design Principles

1. Preserve the stable path
   Motion Lab should still load the same resolved SVG it uses today.

2. Adapt behavior, not source
   The first fix should change how Motion Lab responds to the asset, not replace the asset pipeline.

3. Keep the fix local
   The change should stay inside Motion Lab codepaths in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

4. Avoid broad retuning
   Existing presets should remain the same for normal SVG libraries.

5. Make the behavior explainable
   If a single-fill glyph gets special handling, the UI should communicate that clearly and briefly.

---

## Phase 0: Baseline Lock and Comparison Cases

No production logic changes in this phase.

### Build a reference set

Before implementation, capture a small set of comparison icons:

1. Material:
   - `accessibility`
   - `accessible_menu`
   - `refresh`
2. Lucide:
   - a visually similar human or accessibility icon
   - a simple single-path icon
3. Ionicons:
   - one outline icon
4. Tabler:
   - one multi-stroke icon

### Manual baseline checks

For each icon above, try:

1. `bounce`
2. `pulse`
3. `spin`
4. `shake`
5. one glow or filter preset such as `neonglow`

Document what is currently weak for Material and currently good for the other libraries.

### Exit criteria

1. We have a stable before-state reference.
2. We know which presets are most visibly underperforming on Material.

---

## Phase 1: Add Motion Lab SVG Profiling

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Add a small profiling step during `loadSvgIntoMotionLab(svgText)`.

### New state

Extend `motionLab` state with a profile object, for example:

```js
motionLab.assetProfile = {
  kind: 'multi-stroke',
  shapeCount: 0,
  pathCount: 0,
  hasStroke: false,
  hasFillNone: false,
  largeViewBox: false,
};
```

### New helper

Add a helper such as:

```js
function analyzeMotionLabSvgProfile(svgEl) { ... }
```

### Profile inputs

The helper should inspect:

1. drawable shape count
2. path count
3. whether any shape has stroke
4. whether any shape uses `fill="none"`
5. whether the asset has the large-viewBox heuristic marker

### Suggested classifications

Start simple:

1. `single-fill-glyph`
2. `single-stroke-shape`
3. `multi-stroke`
4. `multi-fill`

Suggested first-pass classification rules:

1. `single-fill-glyph`
   - one drawable shape
   - no stroke
   - no `fill="none"`
2. `single-stroke-shape`
   - one drawable shape
   - has stroke or `fill="none"`
3. `multi-stroke`
   - multiple drawable shapes with stroke behavior dominant
4. `multi-fill`
   - multiple drawable shapes without stroke dominance

### Guardrails

1. Profile only the current Motion Lab SVG clone.
2. Do not mutate the SVG during analysis.
3. Do not change selection, tree building, or export logic in this phase.

### Exit criteria

1. Every Motion Lab load has a populated `motionLab.assetProfile`.
2. Material Symbols consistently classify as `single-fill-glyph`.
3. Existing libraries classify sensibly without changing behavior yet.

---

## Phase 2: Add Profile-Aware Preset Adaptation

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Introduce a thin adaptation layer between preset lookup and track creation.

### New helper

Add a function such as:

```js
function adaptPresetForAssetProfile(presetName, preset, profile) { ... }
```

This helper should return:

1. the original preset unchanged for normal SVG profiles
2. a modified preset for `single-fill-glyph`

### First-pass adaptation strategy for `single-fill-glyph`

Keep the original preset identity, but make it more legible:

1. Translation-heavy presets:
   - increase translate distances by a modest factor, for example `1.4x` to `1.8x`
2. Rotation-heavy presets:
   - increase rotation amplitudes slightly, for example `1.2x` to `1.35x`
3. Scale-heavy presets:
   - increase scale deltas slightly, not aggressively
4. Filter and glow presets:
   - increase glow radius and/or opacity moderately
5. Opacity-only presets:
   - leave unchanged unless testing shows a clear need

### Important constraint

Do not edit the base `PRESETS` table directly for this fix.

Instead:

1. clone the chosen preset
2. adapt the clone
3. write the adapted keyframes into the track

This keeps the existing preset catalog stable for the rest of the app.

### Where to hook it

Apply the adaptation inside `applyPreset(...)` and any other path that applies presets to the live preview, including:

1. direct preset click
2. preset hover preview
3. intensity re-application flow
4. AI-agent preset application path if it reuses the same preset engine

### Guardrails

1. If no profile exists, fall back to current behavior.
2. If the profile is not `single-fill-glyph`, return the base preset unchanged.
3. Keep the preset name and UI labels unchanged.

### Exit criteria

1. Material presets become visibly stronger without feeling exaggerated.
2. Lucide, Tabler, Ionicons, and Iconoir remain unchanged.
3. No selector or track regressions appear.

---

## Phase 3: Add a Small Motion Lab Capability Hint

### [MODIFY] [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Add a compact, low-noise UI hint when the current asset profile is `single-fill-glyph`.

### Suggested copy

Keep it short and factual:

`This icon is a single filled glyph. Motion Lab is using glyph-optimized presets.`

### Placement

Best candidates:

1. beneath the preview stage
2. near the preset bar
3. in the properties column above playback controls

### Guardrails

1. Do not add a large warning banner.
2. Do not show the hint for non-glyph profiles.
3. Do not imply the icon is unsupported.

### Exit criteria

1. Users get a clear explanation for the different behavior.
2. The hint does not clutter the interface.

---

## Phase 4: Optional Profile-Aware Control Messaging

This phase is optional and should come only after Phases 1 to 3 are stable.

### Possible refinements

For `single-fill-glyph` icons:

1. show a short tooltip or microcopy near stroke controls
2. avoid implying stroke-based structure will respond the same way as outline icons

This should remain informational only in the first pass. Do not disable controls unless there is a verified product reason.

### Exit criteria

1. Motion Lab communicates the asset limitation more clearly.
2. No control regressions are introduced.

---

## Phase 5: Verification and Tuning

### Manual verification matrix

Test these across Material and non-Material icons:

| Area | Test | Expected |
|---|---|---|
| Material | `bounce` | More visible motion than baseline |
| Material | `pulse` | Clear readable motion without distortion |
| Material | `spin` | Same or better clarity |
| Material | `shake` | Same or better clarity |
| Material | `neonglow` | More legible glow effect |
| Lucide | `bounce` | Unchanged from baseline |
| Tabler | `pulse` | Unchanged from baseline |
| Ionicons | `shake` | Unchanged from baseline |
| Motion Lab UI | load Material icon | glyph hint appears |
| Motion Lab UI | load Lucide icon | glyph hint absent |

### Runtime checks

1. Preset click still writes tracks correctly.
2. Preset hover preview still works.
3. Intensity slider still re-applies active presets.
4. Export from Motion Lab still works unchanged.

### Regression checks

1. `node --check store.js`
2. `npm run build`
3. a browser smoke test across at least one icon from each major library

---

## Risks and Mitigations

### Risk 1: over-tuned presets make Material feel exaggerated

Mitigation:

1. start with modest multipliers
2. validate against 3 to 5 representative Material icons
3. keep adaptation isolated to `single-fill-glyph`

### Risk 2: adaptation leaks into non-Material icons

Mitigation:

1. gate everything behind explicit asset-profile classification
2. do not modify base preset definitions

### Risk 3: UI hint adds clutter

Mitigation:

1. use one sentence
2. show it only when needed

### Risk 4: future richer Material assets need a different treatment

Mitigation:

1. keep the profile model extensible
2. avoid hardcoding "Material" checks
3. adapt based on geometry profile, not library name

---

## Longer-Term Follow-Up

If the first-pass adaptation still leaves Material visibly behind the other libraries, the next-level investment is:

1. build a dedicated Motion Lab asset source for Material
2. precompute richer or decomposed variants for animation
3. keep export snapshots and Motion Lab assets as separate concerns

That work should only begin after the cheaper profile-aware approach is validated.

## Acceptance Criteria

The fix is complete only when all of the following are true:

1. Material icons in Motion Lab feel clearly animated for common presets.
2. Animation is still attached through the existing root-track model.
3. Existing non-Material icon behavior remains unchanged.
4. The user sees a concise explanation for single-fill glyph behavior.
5. Motion Lab export and the broader Material export pipeline remain stable.
