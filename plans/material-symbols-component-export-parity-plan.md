# Material Symbols Component Export Parity Plan

Related context:
- [material-symbols-export-parity-proposal.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/material-symbols-export-parity-proposal.md)
- [material-symbols-export-parity-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/material-symbols-export-parity-implementation-plan.md)
- [material-symbols-owned-cache-layer-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/material-symbols-owned-cache-layer-implementation-plan.md)

Baseline:
- Material `Copy SVG`, `Copy Base64`, `Download SVG`, `Download PNG`, `Download ICO`, Motion Lab, and MCP now resolve through the owned snapshot path.
- The remaining parity gap is **framework/component code export** for Material icons.

## Objective

Make Material Symbols produce the same practical component export value as the SVG-based libraries for:

- React
- Vue
- Svelte
- HTML

Success means:

1. Material component exports are self-contained SVG output, not font-dependent `<span class="material-symbols-outlined">...`.
2. React and Vue output is syntactically valid.
3. The exported code matches the resolved Material snapshot that already powers `Copy SVG`.
4. Existing non-Material component export behavior remains stable.

## Current Problem

The current generator still treats Material as a font export case in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js#L2024).

### Confirmed issues

1. Material React export returns a font span instead of SVG.
2. Material Vue export returns a font span instead of SVG.
3. Material Svelte and HTML exports are still font-based and require the Material Symbols font to exist in the consuming app.
4. React output is invalid because the generated `style={{ ... }}` object is not valid JSX syntax.
5. Vue output is invalid because the generated `iconStyle` object is not valid JavaScript syntax.
6. Component export no longer matches the product expectation now that the rest of Material export flows use owned SVG snapshots.

### Example of the mismatch

Today:
- `Copy SVG` gives a correct owned snapshot SVG.
- `Copy Base64` gives the same correct SVG, encoded.
- `React`, `Vue`, `Svelte`, and `HTML` still generate font-based snippets.

That means Material still behaves like a second-class library in the code export section even though its graphical export path is already fixed.

## Non-Goals

This plan does not aim to:

- change Material grid rendering
- change Material preview rendering
- remove Material slider controls
- redesign the export panel UI
- change the already-working SVG/Base64/image/Motion Lab/MCP paths
- add a new “font snippet” export option in this pass

## Chosen Fix Direction

Use the **resolved export SVG** as the single source of truth for Material component export.

### Core rule

If a Material icon can already export as SVG, then React/Vue/Svelte/HTML export should be generated from that same resolved SVG.

That means:

1. stop generating Material component code from the font branch
2. reuse the owned snapshot result from `resolveExportSvg(icon, customize)`
3. generate framework snippets from SVG, just like an SVG-native icon

## Design Principles

1. **One geometry source**
   Material component output must come from the same resolved SVG used by `Copy SVG`.

2. **Self-contained snippets**
   Exported code should not rely on external Material font CSS or ligature text.

3. **Preserve current customization**
   The generated code should reflect the current customization state already baked into the resolved SVG.

4. **Minimal regression risk**
   Keep the preview model font-based. Change only the code export generator path.

## Implementation Strategy

## Phase 1: Refactor Component Export to Support Async SVG Resolution

### Why

`copyComponent()` and `generateComponentCode()` are currently synchronous, but Material component export now needs the same async resolver path as the other Material export actions.

### Work items

1. Change `copyComponent(icon, framework)` to async-safe behavior for both:
   - single-icon export
   - multi-select export
2. Introduce an async component generation path, for example:
   - `generateComponentCode(icon, framework)` becomes async
   - or `generateComponentCodeFromResolved(icon, framework, resolved)` is added
3. Reuse `resolveExportSvg(icon, state.customize)` for Material instead of reading the `font` branch directly.

### Guardrails

1. Do not touch the existing button wiring shape more than needed.
2. Do not duplicate a second Material resolver just for code export.

### Exit criteria

1. Component export can await Material SVG resolution.
2. Existing non-Material component export still works.

## Phase 2: Remove the Material Font Branch from Code Generation

### Why

The current `if (icon.type === 'font')` branch is the source of both the parity gap and the invalid React/Vue output.

### Work items

1. Replace the Material-specific font snippet branch with SVG-based generation.
2. Keep the existing SVG library branch intact where possible.
3. If helpful, split the generator into:
   - `generateSvgComponentCode(svg, icon, framework)`
   - `generateFrameworkSnippet(icon, framework, resolvedSvg)`

### Desired behavior

For Material:
- React output should return an SVG component
- Vue output should return SVG markup
- Svelte output should return SVG markup
- HTML output should return SVG markup

### Guardrails

1. Do not regress other font usages in the UI; this change is only for export snippets.
2. Do not keep a silent fallback to font spans for Material.

### Exit criteria

1. Material React/Vue/Svelte/HTML all export SVG-based snippets.
2. No Material snippet depends on `material-symbols-outlined`.

## Phase 3: Harden Framework-Specific Output

### Why

Even after switching to SVG-based export, framework-specific output still needs to be safe and pleasant to use.

### React requirements

1. Output must be valid JSX.
2. Prefer a component shape like:
   - `className`
   - optional `size = 24`
   - `...props`
3. Ensure SVG attributes are JSX-safe where necessary:
   - `class` -> `className`
   - kebab-case event/style props are not leaked
   - preserve valid SVG attributes like `viewBox`

### Vue requirements

1. Output must be valid Vue SFC markup.
2. Avoid generating broken JS objects for inline styles.
3. Prefer plain SVG template markup over font-based spans.

### Svelte requirements

1. Output should be simple raw SVG markup.
2. No external font dependency.

### HTML requirements

1. Output should be simple raw SVG markup.
2. No external font dependency.

### Optional refinement

If needed, add a small helper to normalize framework-specific attribute names when embedding SVG strings.

### Exit criteria

1. React snippet pastes and parses correctly.
2. Vue snippet pastes and parses correctly.
3. Svelte and HTML snippets render correctly without any external font.

## Phase 4: Batch Component Export Consistency

### Why

Multi-select export currently maps icons through the same generator. That path must remain consistent once Material becomes async.

### Work items

1. Update multi-select component export to await all generated snippets.
2. Preserve current combined clipboard output format.
3. Ensure mixed selections behave correctly:
   - Material + Lucide
   - Material + premium SVG packs

### Failure handling

1. If one Material icon fails resolution, do not fail the whole batch silently.
2. Skip unresolved icons and report counts, or fail clearly with a useful toast.

### Exit criteria

1. Multi-select code export works for mixed libraries.
2. Combined output remains readable and deterministic.

## Phase 5: UX Copy and Product Clarity

### Why

Once Material component export becomes SVG-based, the current behavior will finally align with user expectations. The UI should not imply something different.

### Work items

1. Review any code-export hints or copy that still imply Material component export is font-based.
2. Keep toasts accurate if Material export uses a snapped snapshot preset.
3. Optionally add a short note if needed:
   - “Code export uses the current SVG snapshot”

### Exit criteria

1. The export panel behavior matches the user’s mental model.
2. No misleading copy remains around Material code export.

## Files Likely to Change

- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)

Potentially no other file needs to change if the refactor stays local to the export generator.

## Acceptance Criteria

The fix is complete only when all of the following are true:

1. `Copy SVG` and component export for the same Material icon produce the same geometry.
2. React export for Material is valid JSX and renders without Material font CSS.
3. Vue export for Material is valid Vue markup and renders without Material font CSS.
4. Svelte export for Material renders without Material font CSS.
5. HTML export for Material renders without Material font CSS.
6. Non-Material React/Vue/Svelte/HTML export remains stable.
7. Multi-select component export works for mixed Material and SVG libraries.
8. Current Material preview behavior is unchanged.

## Verification Matrix

| Area | Test | Expected |
|---|---|---|
| Material single export | `Copy SVG` on `accessibility_new` | valid owned SVG |
| Material single export | `React` export on same icon | valid JSX SVG component |
| Material single export | `Vue` export on same icon | valid Vue SVG snippet |
| Material single export | `Svelte` export on same icon | valid raw SVG snippet |
| Material single export | `HTML` export on same icon | valid raw SVG snippet |
| Geometry parity | compare `Copy SVG` vs component SVG | same path data / geometry |
| Batch export | Material + Lucide React copy | both snippets included |
| Regression | Lucide React export | unchanged |
| Regression | premium pack HTML export | unchanged |
| Regression | Material panel preview | unchanged |

## Risks

### Risk 1: Async refactor breaks existing copy handlers

Mitigation:
- keep the event handler interface stable
- isolate async changes inside `copyComponent()`

### Risk 2: React JSX conversion is incomplete

Mitigation:
- explicitly normalize SVG attributes for JSX
- test with a real exported Material sample

### Risk 3: Mixed batch output becomes inconsistent

Mitigation:
- keep one shared async generation pipeline for all libraries

## Recommended Rollout Order

1. make component export async-safe
2. switch Material from font snippet to resolved SVG snippet
3. harden React and Vue output
4. verify multi-select behavior
5. polish copy and edge-case messaging

## Expected Outcome

After this fix, Material Symbols will stop being an exception in the code export section.

Users will get:
- real SVG for graphical exports
- real SVG-based snippets for framework exports
- no broken React/Vue syntax
- no dependency on Material font CSS in exported code

That closes the last meaningful parity gap for Material within the current Supericons export surface.
