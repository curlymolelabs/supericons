## PNG/SVG Customize Export Audit

Date: April 6, 2026

### Scope

Audit the `Customize` panel export path for free libraries, specifically:

- `Ionicons`: copied SVG looks too thin when pasted into `SVG -> PNG`
- `MingCute`: copied SVG looks offset / not centered when pasted into `SVG -> PNG`

The question is whether the `Copy SVG` function is corrupted, and whether download/export paths are also affected.

### Short Answer

This is **not** a clipboard-only problem.

The issue is in the shared `Customize` panel export SVG pipeline. `Copy SVG`, `Download SVG`, `Copy Base64`, `Download PNG`, `Download ICO`, and most component export paths all derive from the same resolved SVG output. So if the resolved export SVG is wrong, every downstream export can inherit the same problem.

### Key Code Paths

In [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js):

- `Copy SVG` uses `resolveExportSvg(icon)` and copies `resolved.svg`
- `Download SVG` uses `resolveExportSvg(icon)`
- `Copy Base64` uses `resolveExportSvg(icon)`
- `Download PNG` uses `resolveExportSvg(icon)` before rasterizing
- `Download ICO` uses `resolveExportSvg(icon)` before rasterizing
- `generateComponentCode()` for non-material SVG libraries ultimately uses `getStyledSvg(icon)`

Core shared functions:

- `resolveExportSvg()`
- `getStyledSvg()`
- `applyExportCustomization()`

So the export issue is centralized.

### Deeper Dependency Map

The export SVG pipeline is connected to more features than just the three visible buttons in the customize panel.

#### Direct single-icon dependencies

These all depend on `resolveExportSvg()` or `getStyledSvg()`:

- `Copy SVG`
- `Copy Base64`
- `Download SVG`
- `Download PNG`
- `Download ICO`
- `Open in Motion Lab`

#### Batch export dependencies

These also depend on the same resolved SVG:

- `Copy SVGs`
- `Download SVGs (ZIP)`
- `Download PNGs (ZIP)`
- `Download ICOs (ZIP)`

#### Code export dependencies

These also inherit the same export SVG path for non-material SVG icons:

- `React`
- `Vue`
- `Svelte`
- `HTML`

Important nuance:

- React code export additionally runs `stripRootSvgSize()` afterward
- but it still starts from the same base `getStyledSvg(icon)` result

So a geometry or stroke bug in the base export SVG can still propagate into generated component code.

### Preview vs Export Split

The customize panel currently has two different SVG preparation models:

#### Preview model

Preview rendering:

- strips root `width` / `height`
- adds fallback `viewBox` if missing
- applies library-specific preview stroke compensation
- renders in a controlled preview frame

#### Export model

Export rendering:

- recolors `fill="currentColor"` and `stroke="currentColor"`
- rewrites `stroke-width`
- optionally injects animation wrappers
- does **not** consistently normalize geometry the same way as preview
- does **not** consistently mirror preview stroke compensation

That preview/export split is the deeper structural cause of these regressions.

### Root Cause 1: Ionicons Thin Outline

#### What the audit found

The preview path and export path do **not** use the same stroke-width logic for Ionicons.

In [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js):

- `libraryMeta.ionicons.strokeScale = 21.33`
- preview rendering multiplies user stroke width by `strokeScale`
- export rendering does **not** apply that same library-specific scaling

Preview code uses:

- `const previewScale = (libraryMeta[icon.lib]?.strokeScale || 1);`
- then applies scaled stroke width in preview

Export code uses:

- `stroke-width="${c.strokeWidth}"`

with no Ionicons compensation.

#### Source SVG evidence

Representative Ionicons source:

- `accessibility-outline`

The raw SVG starts with:

```svg
<svg stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">...
```

The audit also found that sampled Ionicons source SVGs do **not** usually ship with explicit `stroke-width` attributes already embedded. That means the export pipeline is largely responsible for assigning final stroke thickness.

#### Conclusion

Ionicons is not “corrupted” during copy. The exported SVG is just being generated with a thinner stroke model than the preview.

That explains why:

- the icon can look correct in the customize panel
- but look too thin after `Copy SVG` and paste into the converter

### Root Cause 2: MingCute Off-Center Export

#### What the audit found

Preview rendering normalizes SVG geometry more aggressively than export rendering.

Preview path:

- strips root `width` / `height`
- injects a fallback `viewBox="0 0 24 24"` if missing
- renders inside a preview frame with consistent centering rules

Export path:

- mostly applies fill/stroke customizations only
- does **not** apply the same normalization consistently

#### Source SVG evidence

Representative MingCute source:

- `align_arrow_down_line`

The raw SVG starts with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><g fill="none" ...
```

The audit found multiple MingCute icons missing a root `viewBox`, for example:

- `align_arrow_down_line`
- `align_arrow_left_line`
- `align_arrow_right_line`
- `align_arrow_up_line`
- `arrows_down_line`

So MingCute is a concrete example where preview and export are operating on different geometry assumptions.

#### Conclusion

MingCute is not a clipboard bug either.

The customize preview is compensating for missing root geometry metadata, while the exported SVG is not normalized the same way. When pasted into `SVG -> PNG`, the converter respects the exported geometry and the icon appears off-center.

### Is Download SVG Also Affected?

Yes.

Affected paths likely include:

- `Copy SVG`
- `Download SVG`
- `Copy Base64`
- `Download PNG`
- `Download ICO`
- component exports that are built from the same styled/export SVG path
- Motion Lab load path
- batch ZIP exports

This is because they all depend on the resolved export SVG rather than a separate clipboard-only format.

### What Is Not The Root Cause

This is **not** primarily:

- a `SVG -> PNG` converter bug
- a clipboard encoding bug
- a browser paste bug

The converter is exposing the issue because it renders the exported SVG faithfully.

### Risk Assessment

The regression is currently library-specific, not universal.

- `Ionicons`: stroke visual mismatch risk
- `MingCute`: geometry / centering mismatch risk
- other libraries may still be okay because their source SVGs already contain more complete geometry metadata or do not depend on preview-only stroke compensation

### Why This Needs A Careful Fix

Because the export path is shared, a quick local patch can easily create new regressions in:

- batch exports
- Motion Lab loading
- PNG/ICO raster export
- component code generation

So the safest repair is not to special-case `Copy SVG`.

The safest repair is:

1. fix the shared export SVG generation once
2. keep the fix scoped to non-material SVG libraries first
3. leave preview logic and converter logic untouched
4. explicitly regression-test every dependent feature that inherits the shared SVG output

### Recommended Fix Direction

Do not patch `Copy SVG` in isolation.

Instead:

1. fix the shared export SVG pipeline
2. add shared export normalization for non-material SVG libraries
3. apply library-aware stroke handling during export, not only during preview

That will keep:

- `Copy SVG`
- `Download SVG`
- `PNG/ICO` exports
- component export generation

in sync with each other.
