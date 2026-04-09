# Premium Export Metadata Sanitization Plan

Date: 2026-04-09

## Goal

Remove internal authoring metadata from premium export outputs so customer-facing files only contain what is required to render and animate the icon.

This includes:

- internal CSS comments
- internal source notes
- internal motion-design notes
- unnecessary implementation-only wrapper comments
- unnecessary internal root classes when they are not required for playback

## Why This Plan Exists

Current premium export outputs are leaking internal authoring metadata into customer-facing deliverables.

Examples confirmed in exported outputs:

- `Source: Material Symbols Rounded (solid/filled)`
- `DESIGN RULE: Every animation tells a security story.`
- icon-specific motion comments such as `24. PERSON-VERIFIED: Identity confirm...`
- HTML wrapper comment: `<!-- Supericons premium animated export -->`
- internal root classes such as `korvic` and `si-premium-standalone-root`

This is not a credential leak, but it is still a product-quality and implementation-leak problem. Exported files should feel clean, intentional, and brand-safe.

## Current-State Audit

### Leak Source 1: Raw CSS comments are preserved into exported SVG

- `extractIconCSS(...)` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1535) extracts relevant CSS blocks from the premium pack stylesheet.
- Those extracted blocks still include block comments from the source pack.
- `buildAnimatedSvg(...)` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1600) injects the CSS directly into `<style>...</style>`.
- `escapeSvgStyleText(...)` only XML-escapes style text; it does not sanitize or strip comments.

### Leak Source 2: HTML export adds a visible implementation comment

- `buildPremiumHtmlSnippet(...)` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2176) prepends `<!-- Supericons premium animated export -->`.
- This is internal/exporter metadata, not user value.

### Leak Source 3: Exported SVG still carries internal helper classes

- `getPremiumSvgCssContract(...)` and `applyPremiumStandaloneRootClasses(...)` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1494) and [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1508) add internal classes to the SVG root.
- After selector rewriting, some of these classes are no longer necessary in the final export payload.
- The current exported class name also exposes internal implementation naming and even product-tier wording (`premium`) unnecessarily.

### Leak Scope

Because all new premium export formats are generated from the same animated SVG payload, the leak propagates to:

- downloaded animated SVG
- copied animated SVG
- React export
- Base64 export
- HTML export
- Vue export
- Svelte export

This is good news for the fix: one sanitization layer can clean every format together.

## Constraints

- Do not break animation playback for `loop`, `hover`, or `once`.
- Do not break color overrides, speed overrides, or stroke-width behavior.
- Do not change purchase gating or entitlement checks.
- Do not alter the icon geometry or exported visual result.
- Keep exported files standalone and dependency-free.

## Implementation Strategy

### Phase 1: Introduce a dedicated export sanitization layer

Add a small sanitization step that runs after CSS selector rewriting but before the final SVG string is returned.

Recommended helpers:

- `stripCssComments(cssText)`
- `sanitizePremiumExportCss(cssText, { playMode })`
- `sanitizePremiumExportSvg(svgText)`

Responsibilities:

- remove all CSS block comments from exported `<style>`
- normalize excess whitespace without changing semantics
- preserve XML-safe escaping after sanitization

### Phase 2: Replace internal root class leakage with a public export contract

Introduce a neutral export-only root class, for example:

- `si-animated-icon`

Then update export generation so:

- rewritten CSS targets only the neutral export root selector
- unnecessary internal classes like `korvic` are removed from the final SVG root when no longer referenced
- `si-premium-standalone-root` does not appear in exported files

Important:

- keep internal preview/runtime contracts untouched unless required
- use a separate export-facing class contract so preview behavior and export behavior are decoupled safely

### Phase 3: Remove user-invisible exporter comments from non-SVG formats

Update premium export builders so they do not prepend internal comments.

Targets:

- remove `<!-- Supericons premium animated export -->` from HTML export
- ensure React/Vue/Svelte wrappers only embed sanitized SVG payload
- ensure Base64 is generated from the sanitized SVG payload, not the raw one

### Phase 4: Keep the fix centralized

Ensure every premium export path uses the same sanitized animated payload helper.

That means:

- downloaded animated SVG
- copied animated SVG
- React
- Base64
- HTML
- Vue
- Svelte

should all flow through one finalized sanitized animated SVG builder.

## Suggested Code Changes

### In [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

1. Add CSS comment stripping utility.
2. Add export-only root class constant with neutral public naming.
3. Refactor `buildAnimatedSvg(...)` so export mode can sanitize CSS and root classes before returning.
4. Update `buildPremiumAnimatedExportSvg(...)` to always return sanitized export payload.
5. Update `buildPremiumHtmlSnippet(...)` to remove wrapper HTML comments.
6. Keep static SVG export unchanged unless audit shows similar metadata leakage there.

## Verification Plan

### Functional Verification

For at least these icons:

- `person-verified`
- `face-id`
- `scan-virus`
- `certificate-seal`

verify exported animated SVG still:

- opens without XML errors
- animates correctly for `loop`
- animates on hover for `hover`
- plays once for `once`
- preserves selected color and speed

### Sanitization Verification

Confirm these strings are absent from exported animated payloads:

- `Source: Material Symbols Rounded`
- `DESIGN RULE`
- `Motion vocabulary`
- icon-specific prose such as `PERSON-VERIFIED:`
- `si-premium-standalone-root`
- internal animation token classes such as `korvic`
- `<!-- Supericons premium animated export -->`

### Cross-Format Verification

Confirm the sanitized payload propagates correctly to:

- copied animated SVG
- downloaded animated SVG
- decoded Base64 payload
- HTML snippet
- React snippet
- Vue snippet
- Svelte snippet

### Protection Verification

Regression-check that:

- locked premium items still do not expose export controls
- existing ownership gates still control access to export actions
- no new direct raw-CSS export path is introduced

## Risks And Mitigations

### Risk: Removing classes breaks selector targeting

Mitigation:

- sanitize only after selector rewriting is complete
- switch exports to a dedicated public root selector before removing internal classes

### Risk: Over-aggressive whitespace stripping changes CSS behavior

Mitigation:

- remove comments first
- keep whitespace normalization conservative
- validate multiple exported icons manually

### Risk: Preview behavior regresses if export contract and preview contract are mixed

Mitigation:

- keep preview-only helper classes untouched
- apply the neutral public class contract only inside export builders

## Definition Of Done

- Premium export outputs contain no internal authoring comments.
- Premium export outputs contain no unnecessary internal helper class names.
- HTML export contains no wrapper comment.
- All export formats still work from the same customize-panel state.
- Existing protection measures remain intact.
