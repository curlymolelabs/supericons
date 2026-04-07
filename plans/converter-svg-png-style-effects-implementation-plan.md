# Converter SVG→PNG Style + Effects Implementation Plan

## Objective

Extend the `SVG → PNG` mode of the converter so users can:

1. recolor uploaded SVGs with Motion Lab-style `Fill` and `Stroke` palettes
2. apply visual effect presets:
   - `None`
   - `Gloss`
   - `Glass`
   - `Neumorph`
3. preview the styled result before export
4. download or copy a PNG that matches the preview

This plan implements the proposal in [converter-svg-png-style-effects-proposal.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/converter-svg-png-style-effects-proposal.md) while staying narrow enough for the current converter architecture in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

## Constraints

- do not disturb `PNG → SVG`
- keep preview/export parity by generating one styled SVG artifact per conversion
- do not depend on external CSS or external assets
- keep effects inline so the same SVG can feed both preview and raster export

## Phase 1: Shared Styled-SVG Pipeline

### Goal

Create one reusable builder that:

1. parses the uploaded SVG
2. analyzes paint capabilities
3. applies fill/stroke overrides
4. applies the selected effect preset
5. serializes the final styled SVG

### Work

- extend `converterState` with:
  - `fillColor`
  - `strokeColor`
  - `effect`
  - `effectIntensity`
  - `paintSupport`
- add pure converter helpers in `store.js`:
  - SVG paint capability detection
  - visible fill target detection
  - visible stroke target detection
  - styled SVG builder
- keep these helpers separate from Motion Lab DOM-specific code, but reuse the same helper-path protections conceptually

### Output

- one function that returns:
  - `{ svgEl, paintSupport }`
  - or a serialized styled SVG string plus support metadata

## Phase 2: Fill + Stroke Palette Controls

### Goal

Add Motion Lab-style paint controls to the converter UI.

### Work

- add `Fill` row to `SVG → PNG` options
- add `Stroke` row to `SVG → PNG` options
- use the same swatch set as Motion Lab:
  - default
  - black
  - white
  - orange
  - cyan
  - purple
  - green
  - yellow
  - custom picker
- add a small compatibility note:
  - not all SVGs support both fill and stroke
- disable unsupported rows when the uploaded SVG does not expose that paint channel

### UX Rules

- `Default` restores the original authored paint
- manual color pickers should clear swatch active state
- changing any paint setting should re-run the conversion immediately

## Phase 3: Effect Presets

### Goal

Add effect selection for styled exports.

### Work

- add an `Effect` control row to `SVG → PNG`
- add an `Intensity` slider
- implement these presets:

#### `None`
- no extra effect wrappers

#### `Gloss`
- apply an inline SVG gloss filter
- use specular/highlight-style lighting plus a subtle shadow so icons feel polished

#### `Glass`
- simulate glass with:
  - a translucent rounded plate behind the icon
  - soft shadow
  - light edge stroke
  - subtle highlight gradient
- treat this as a visual glass effect, not literal `backdrop-filter`

#### `Neumorph`
- simulate neumorphism with:
  - a soft surface plate
  - offset light and dark shadows
  - soft embossed card-like appearance

### Guardrails

- effects must render from inline SVG only
- effects must not rely on page backdrop
- effect IDs must be namespaced to avoid collisions
- filter regions must be roomy enough to avoid clipping shadows/highlights

## Phase 4: Preview / Export Parity

### Goal

Ensure the preview PNG and exported PNG come from the same styled SVG source.

### Work

- update `convertSvgToPng()` so it uses the styled SVG builder instead of the raw uploaded SVG
- keep `showConverterOutput()` unchanged; it should simply display the PNG produced from the styled SVG
- do not create a separate preview-only styling path

### Rule

If the user sees a glossed, glass, or neumorph icon in the converter preview, the downloaded PNG should match that styling.

## Phase 5: Reset + Mode Hygiene

### Goal

Keep the feature predictable and isolated.

### Work

- `convResetSvg` should reset:
  - size
  - background
  - padding
  - quality
  - fill
  - stroke
  - effect
  - intensity
- mode switching to `PNG → SVG` should hide all SVG styling controls cleanly
- loading a new SVG should recalculate paint support and rerun the conversion
- clearing input should reset converter output and support note state

## Files In Scope

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

## Verification

### Required checks

- `python scripts/run_frontend_checks.py --project . --execute`
- browser validation of `SVG → PNG`

### Browser scenarios

1. Upload a fill-based SVG
   - Fill palette works
   - Stroke row disables or has no effect when unsupported

2. Upload a stroke-based SVG
   - Stroke palette works
   - Fill row disables or has no effect when unsupported

3. Upload a mixed fill/stroke SVG
   - both controls work independently

4. Toggle each effect preset
   - preview updates
   - export still succeeds

5. Reset SVG options
   - all paint/effect controls return to defaults

6. Compare preview vs downloaded PNG
   - visual styling matches

## Residual Risk

- `Glass` and `Neumorph` are simulated visual presets, so they may read differently depending on icon geometry
- some complex uploaded SVGs may include unusual paint inheritance or masks; capability detection should be conservative rather than aggressive
- if any effect clips unexpectedly, expand the generated filter region rather than weakening the effect globally
