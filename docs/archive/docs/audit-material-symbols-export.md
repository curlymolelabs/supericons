# Audit Report: Material Symbols Export Limitations

## Executive Summary
This audit investigates the reported issue where the customizer panel's export functions ("Copy SVG", "Copy Base64", "Download SVG") and the "Open in Motion Lab" button do not work for the Material Symbols icon library on the Supericons app.

## Root Cause Analysis
The underlying reason these functions are unavailable stems from the architectural decision to implement Material Symbols as a **Variable Font** (`icon.type === 'font'`) rather than raw scalable vector graphics (`icon.type === 'svg'`).

1. **Missing SVG Property**: The export functions strictly depend on the `getStyledSvg(icon)` helper function, which attempts to retrieve the `icon.svg` property. Because Material Symbols are rendered via the DOM using font ligatures and CSS variable axes (Weight, Fill, Grade, Optical Size), they do not store or process an actual `.svg` string in memory.
2. **Short-circuiting Logic**: When `getStyledSvg(icon)` is called for a font-based icon, it returns `null`. This specifically triggers the fallback toast notifications (e.g., `"Font icons: use Copy as Component instead"` and `"Font icons: PNG export not supported"`).
3. **Motion Lab Condition**: The "Open in Motion Lab" UI button is explicitly blocked from rendering via a ternary conditional check (`if (icon.type === 'svg')`) in the customize panel HTML generation. Since Material Symbols evaluate to `'font'`, the button is omitted from the DOM entirely.

## Are Other Libraries Affected?
**No.** Based on an audit of the `libraryMeta` and the application's ingestion rules, Material Symbols is the *only* library currently implemented as a font. 

All other libraries (Lucide, Tabler, Phosphor, Heroicons, Bootstrap, Iconoir, Ionicons, Simple Icons, MingCute, and Premium collections) are ingested and treated as scalable vectors (`icon.type === 'svg'`). As a result, they fully support the graphical rendering pipeline, including SVG batch downloads, Canvas API transformations for PNG/ICO generation, and integration with the Motion Lab ecosystem.

## Conclusion
The limitation is intentional and isolated strictly to the Material Symbols library due to its unique 4-axis variable font structure. Users must rely on the component export functions (React, Vue, Svelte, HTML) to utilize these specific icons.

## Appendix: Material Symbols Export Enhancements (Research Findings)

While auditing Material Symbols, which lacks direct SVG export due to its implementation as a continuous variable font (`icon.type === 'font'`), the following solutions were identified to make export functions more useful:

### 1. The `<foreignObject>` SVG to Canvas Pipeline (Best for PNG/ICO)
Construct an SVG that uses a `<foreignObject>` tag to embed a `<span>` styled with the exact CSS `font-variation-settings`.
1. The browser accurately renders the font inside the SVG.
2. Serialize this SVG into a Base64 Data URI.
3. Draw it onto an off-screen `<canvas>` to extract a `.png` or `.ico`.
*Result:* Unlocks raster image exports (PNG, ICO, Base64).
*Limitation:* Does not provide raw mathematical `<path>` data for Motion Lab.

### 2. The Text-Based SVG Export
Generate an SVG file containing a `<text>` element referencing the font:
```xml
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <style>
    @import url('https://fonts.googleapis.com/...');
    text { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 1, 'wght' 400; }
  </style>
  <text x="12" y="12" alignment-baseline="central" text-anchor="middle">search</text>
</svg>
```
*Result:* Unlocks SVG export instantly.
*Limitation:* The file requires an active internet connection to download the font, making it unsuitable for offline design tools.

### 3. Fetching Google's Static SVGs on Demand
Google hosts discrete, pre-generated `<path>` SVGs for major axis permutations. The app could mathematically round the user's slider values and `fetch()` the nearest static SVG.
*Result:* Unlocks all functions, including Motion Lab, by providing real path data.
*Limitation:* Loses the precise fidelity of continuous sliders and adds network latency.

### Recommendation
A hybrid approach is advised if implemented: Option 1 to silently enable high-fidelity raster exports locally, and Option 3 as a fallback to unlock Motion Lab with snapped presets.
