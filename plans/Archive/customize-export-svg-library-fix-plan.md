## Customize Export SVG Library Fix Plan

Date: April 6, 2026

### Goal

Fix library-specific regressions in the `Customize` panel export pipeline so that exported SVG output matches the customize preview more closely for:

- `Ionicons` stroke icons
- `MingCute` SVG icons with incomplete root geometry metadata

This fix must stay scoped to the `Customize` export pipeline and must **not** change:

- icon library contents
- library ordering/data
- `SVG -> PNG` converter behavior
- `PNG -> SVG` converter behavior

### What We Are Fixing

#### Ionicons

Problem:

- customize preview uses library-specific stroke compensation
- exported SVG does not
- result: copied/downloaded SVG looks too thin in downstream rendering

Desired result:

- exported Ionicons stroke thickness should visually match the customize preview

#### MingCute

Problem:

- customize preview normalizes root SVG geometry
- exported SVG does not
- result: copied/downloaded SVG can appear off-center or misframed

Desired result:

- exported MingCute geometry should match the preview’s framing behavior

### Implementation Strategy

### Safe Fix Principle

Do not patch:

- `Copy SVG`
- `Download SVG`
- `Download PNG`
- `Download ICO`
- Motion Lab
- component exports

individually.

Patch the shared export SVG generation layer once, then verify every dependent feature that inherits it.

That means the main touchpoints should be:

- `getStyledSvg()`
- `resolveExportSvg()`
- a new shared normalization helper used only by those paths

Preview rendering should stay unchanged for this fix.

### Fix 1: Introduce Shared Export Normalization

Add one shared normalization step for non-material SVG libraries before export customization is finalized.

This should be used by:

- `getStyledSvg()`
- `resolveExportSvg()`
- any downstream path that depends on the export SVG string

Normalization should:

- strip root `width` and `height`
- preserve existing `viewBox` if present
- inject fallback `viewBox="0 0 24 24"` only when missing
- optionally add `preserveAspectRatio="xMidYMid meet"` when missing

This should be applied before final export customization, not only in preview.

Why:

- preview is already doing similar geometry normalization
- export needs to follow the same model

### Fix 2: Apply Library-Aware Stroke Export Logic

For libraries with preview-only stroke compensation, export must use the same logic.

Specifically:

- if `libraryMeta[icon.lib].strokeScale` exists
- export stroke width should incorporate that scale instead of using raw `c.strokeWidth`

Target library:

- `Ionicons`

Expected effect:

- the SVG copied/downloaded from customize should no longer become visually thinner than the panel preview

Implementation note:

- keep this driven by `libraryMeta.strokeScale`
- do not hardcode a one-off Ionicons branch unless the shared metadata path proves insufficient

### Fix 3: Keep Shared Export Consumers Intentionally Aligned

After the shared SVG is corrected, let the following inherit it unchanged:

- `Copy SVG`
- `Copy Base64`
- `Download SVG`
- `Download PNG`
- `Download ICO`
- batch ZIP export paths
- Motion Lab loading
- component code generation

This avoids format-specific drift.

### Fix 4: Keep Material Snapshot Path Untouched

Do **not** disturb the special material-icon snapshot path unless the shared normalization step proves harmless there.

Safer default:

- apply new normalization only to normal SVG-library exports first
- leave `materialSymbols` logic unchanged unless later testing shows a gap

### Fix 5: Keep React Component Wrapper Behavior Intact

React export currently strips root size and injects:

- `className`
- `width={size}`
- `height={size}`

That wrapper behavior should remain intact.

So the safe approach is:

- normalize the base export SVG first
- then let `buildReactSvgComponentCode()` continue to do its wrapper-specific root sizing step

### Guardrails

The fix must not:

- change preview rendering rules
- change raw library asset data
- modify converter input/output handling
- change library ordering
- introduce library-specific one-off hacks outside the shared export path unless strictly necessary
- change Motion Lab behavior except through the shared corrected SVG input

### Verification Plan

#### Primary checks

1. `Ionicons`
- customize an outline icon
- compare panel preview vs copied SVG pasted into `SVG -> PNG`
- compare panel preview vs downloaded SVG opened/rendered elsewhere
- confirm stroke no longer looks too thin

2. `MingCute`
- customize a MingCute icon
- copy SVG into `SVG -> PNG`
- confirm result is visually centered and framed like the customize panel

#### Secondary checks

Verify that the same fix also propagates correctly to:

- `Download SVG`
- `Copy Base64`
- `Download PNG`
- `Download ICO`
- `Copy SVGs`
- `Download SVGs (ZIP)`
- `Download PNGs (ZIP)`
- `Download ICOs (ZIP)`
- `Open in Motion Lab`
- `React/Vue/Svelte/HTML` component export

#### Regression checks

Spot-check unaffected libraries:

- `Lucide`
- `Tabler`
- `Simple Icons`
- `Bootstrap`

Confirm:

- no new centering regressions
- no stroke-weight regressions
- no broken component wrapper output
- no Motion Lab load failure

### Acceptance Criteria

This work is complete when:

- Ionicons copied/downloaded SVG visually matches the customize preview stroke weight
- MingCute copied/downloaded SVG is centered like the customize preview
- `Copy SVG` and `Download SVG` produce equivalent geometry/stroke behavior
- PNG/ICO exports derived from the same resolved SVG inherit the corrected result
- no obvious regressions appear in the other major free libraries

### Sequence

1. add shared export SVG normalization helper
2. route non-material export SVG generation through it
3. add library-aware stroke export handling for `strokeScale` libraries
4. verify Ionicons and MingCute first
5. run dependency regression spot-checks on all shared consumers
6. run library spot-checks on other free libraries

### Scope Boundary

This plan only fixes the export path behind the customize panel.

It does not:

- reorder libraries
- change premium behavior
- change converter heuristics
- change icon-library source data
