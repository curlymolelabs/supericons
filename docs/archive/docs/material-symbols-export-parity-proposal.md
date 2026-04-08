# Proposal: Material Symbols Export Parity Fix

## Summary

The current Material Symbols export story does not meet the product bar set by the rest of Supericons. Today, Material Symbols provide strong **preview and component export** value, but they do not provide the same **graphical export value** as SVG-based libraries.

This proposal recommends a **dual-representation architecture**:

1. Keep the current **variable font** implementation for browsing, live preview, and axis sliders.
2. Add an **owned SVG snapshot export layer** for Material Symbols so the app can treat them like real SVG icons for Motion Lab, SVG/Base64 download, PNG/ICO rendering, batch export, and MCP usage.

The core principle is simple: **preview can stay font-based, but export must become SVG-based**.

## Why The Existing Audit Is Incomplete

The existing audit in `docs/audit-material-symbols-export.md` correctly identifies the immediate technical cause, but it understates the actual product gap and points toward solutions that are too fragile for long-term parity.

### Gaps in the existing audit

1. It frames the limitation as mostly isolated to:
   - Copy SVG
   - Copy Base64
   - Download SVG
   - Open in Motion Lab

   In reality, Material Symbols are excluded from the broader graphical export pipeline as well.

2. It does not call out that **batch export also excludes Material Symbols**.
   - Batch SVG ZIP filters to `i.type === 'svg'`
   - Batch PNG ZIP filters to `i.type === 'svg'`
   - Batch ICO ZIP filters to `i.type === 'svg'`

3. It does not mention the **MCP/API consequence**.
   - `mcp/index.js` explicitly skips font icons because downstream consumers need actual SVG code.

4. It treats “use component export instead” as an acceptable fallback.
   - That is not parity.
   - Users expect the Material library to participate in the same export and Motion Lab workflows as the other libraries.

5. It recommends solutions that are not robust enough as the primary architecture:
   - `<foreignObject>` inside SVG is not dependable across toolchains.
   - `<text>`-based SVG exports depend on font availability and are not portable.
   - Fetching Google-hosted SVGs at runtime introduces latency, vendor dependency, and cache/offline fragility.

## What “Parity” Should Mean

Material Symbols should provide the same practical value as the rest of the icon libraries in these areas:

- Copy SVG
- Copy Base64 SVG
- Download SVG
- Download PNG
- Download ICO
- Batch SVG ZIP
- Batch PNG ZIP
- Batch ICO ZIP
- Open in Motion Lab
- MCP access to usable SVG output

The only acceptable difference is that Material Symbols can retain a richer **live variable-font preview model** before export.

## Current Implementation Touchpoints

These are the code paths that currently block parity:

- `main.js:754-771`
  - SVG-only controls are separated from Material font controls.
- `main.js:836-842`
  - “Open in Motion Lab” only renders for `icon.type === 'svg'`.
- `main.js:1162-1243`
  - Batch export only includes icons where `i.type === 'svg'`.
- `main.js:1478-1488`
  - Motion Lab load only works for SVG icons.
- `main.js:1513-1554`
  - Single-icon SVG/Base64/Download SVG all rely on `getStyledSvg(icon)`.
- `main.js:1688`
  - `getStyledSvg(icon)` immediately returns `null` when `icon.svg` is absent.
- `main.js:1731-1771`
  - PNG and ICO export depend on styled SVG, so font icons are rejected.
- `mcp/index.js:36`
  - Font icons are skipped because clients need actual SVG code.

## Important Repository Evidence

The repo already contains strong evidence that a path-based Material Symbols strategy is viable:

- Premium packs already ship **real SVG assets** derived from Material Symbols.
- Examples:
  - `public/packs/security-auth/security-auth.css`
  - `public/packs/media-playback/media-playback.css`
  - related bundle JSON contains real SVG path data

This matters because it shows the project is already comfortable working with **Material-derived SVG snapshots**. The missing piece is extending that idea to the main Material Symbols library export path.

## Proposed Fix

## Recommendation

Introduce a **Material Symbols SVG snapshot resolver** and make the export pipeline consume that resolver instead of assuming only raw `icon.svg` icons are exportable.

### Proposed architecture

#### 1. Keep current font rendering for browsing

Do not replace the current font-based UI for:

- grid rendering
- instant slider feedback
- live preview
- component export

This keeps the current experience fast and preserves the existing stable behavior.

#### 2. Add an export-grade SVG representation for Material Symbols

Add a new Material-specific export source that returns a real SVG string for a given icon plus a normalized axis configuration.

Conceptually:

```txt
resolveExportSvg(icon, customizeState)
  -> if svg icon: return styled svg
  -> if material font icon: return resolved material snapshot svg
```

This should become the single gateway for:

- Copy SVG
- Base64
- Download SVG
- PNG render
- ICO render
- batch export
- Motion Lab loading
- MCP delivery

#### 3. Use owned snapshots, not browser tricks, as the primary path

The export-grade Material SVG should come from an **owned and versioned source**, not from:

- `<foreignObject>`
- `<text>` in SVG
- direct runtime dependency on Google-hosted SVGs

Preferred model:

- a generated local snapshot set
- or a repo-owned/static-hosted snapshot cache
- or a build-produced asset manifest keyed by icon id + supported axis values

This keeps export deterministic, portable, and tool-friendly.

#### 4. Snap export to a supported axis matrix

Material Symbols sliders are continuous enough that exporting every possible axis combination is not practical.

Instead:

- preview remains continuous/font-based
- export snaps to a defined, supported matrix of Material variants

Examples of export-safe normalization:

- `FILL`: exact `0` or `1`
- `wght`: `100..700` in `100` steps
- `GRAD`: reduced export set such as `-25`, `0`, `200`
- `opsz`: reduced export set such as `20`, `24`, `40`, `48`

If the chosen preview state lands between export-safe variants, the app should export the nearest supported snapshot and disclose that clearly in the UI.

That is still far better than the current state of “no graphical export at all.”

#### 5. Make parity explicit in the UX

Material Symbols should no longer silently disappear from export workflows.

Instead:

- Motion Lab button should appear when an export snapshot is available
- batch export should include Material Symbols when snapshots are resolvable
- if an exact axis value is not exportable, show a subtle note:
  - “Export uses nearest supported Material snapshot”

This keeps user trust high without pretending the font model and export model are identical.

## Why This Is Better Than The Existing Suggestions

### Better than `<foreignObject>`

- More portable
- Better for design tools
- Better for Motion Lab
- Produces actual path-based SVG instead of browser-rendered HTML-in-SVG tricks

### Better than `<text>`-based SVG export

- No dependency on external font loading
- Works offline
- More reliable in downstream tools

### Better than runtime Google fetch

- Avoids vendor lock during export
- Avoids latency on every export path
- Avoids fragile network-dependent Motion Lab loading
- Allows batch export and MCP to work from owned assets

## Rollout Strategy

### Phase 1: Export adapter foundation

- Introduce a Material export resolver concept
- Route all export actions through one export-SVG gateway
- Preserve all current preview behavior

### Phase 2: Single-icon parity

- Enable Copy SVG
- Enable Base64 SVG
- Enable Download SVG
- Enable PNG/ICO via resolved SVG
- Enable Motion Lab for Material Symbols

### Phase 3: Batch and MCP parity

- Include Material Symbols in batch SVG ZIP
- Include Material Symbols in batch PNG ZIP
- Include Material Symbols in batch ICO ZIP
- Expose Material Symbols through MCP once real SVG output exists

### Phase 4: UX refinement

- Show export snapping guidance where needed
- Clarify preview-vs-export behavior for axis values

## Non-Goals

This proposal does **not** require:

- replacing the current font-based browsing UI
- removing variable font sliders
- guaranteeing mathematically exact export for every possible slider position
- changing premium pack behavior

## Risks

### 1. Snapshot matrix size

If too many axis combinations are pre-generated, asset volume may grow quickly.

Mitigation:

- use a constrained export-safe matrix
- cache only supported combinations
- keep preview separate from export

### 2. Preview/export mismatch

Users may notice that exported output is snapped to a nearby supported variant.

Mitigation:

- disclose snapping in the UI
- keep supported steps close to current slider increments

### 3. Integration spread

The current limitation appears in multiple places, so partial fixes will still feel broken.

Mitigation:

- treat this as a cross-cutting export-platform change, not a single button fix

## Acceptance Criteria

The fix should be considered complete only when Material Symbols can:

- open in Motion Lab
- export as SVG
- export as Base64 SVG
- export as PNG
- export as ICO
- participate in batch ZIP export
- participate in MCP output as SVG
- preserve current font-based preview behavior
- avoid dependence on fragile browser-only SVG text tricks as the primary export path

## Final Recommendation

Do **not** pursue a browser-trick solution as the main architecture.

The right fix is to give Material Symbols a **real, owned SVG export representation** while keeping the current variable font model for interactive preview. That is the cleanest way to make Material Symbols deliver the same value as the rest of the libraries without destabilizing the current app.
