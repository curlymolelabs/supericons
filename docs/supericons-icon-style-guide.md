# Supericons Icon Style & Format Guide

How beautiful, consistent, minimalistic icons get made — synthesized from Hugeicons' published design guidelines (Masum Parvej / Halal Lab, 46,000+ icons shipped), Bonnie Kate Wolf's iconography guide for Figma, and Material Design conventions. Adapted as a working spec for Supericons.

---

## 1. The core insight

Great icon sets aren't drawn — they're *engineered*. Hugeicons, Lucide, and Material all look effortless because every icon obeys the same small set of hard constraints (grid, stroke, corner radius, padding) and the same soft constraints (metaphor, simplicity, optical balance). Beauty comes from the system, not from individual icons. When asked why anyone picks one icon set over thousands of others, Masum Parvej's answer was: "Mostly for beauty" — and that beauty is consistency at scale.

## 2. The geometric spec

### Canvas and grid
- **24×24px master grid.** The industry default (Hugeicons, Lucide, Material, Feather all use it). Scales cleanly in 8-pt layout systems (16/24/32/48).
- **2px padding, 20px live area.** Artwork stays inside the central 20×20. The padding is breathing room and guarantees icons never touch adjacent UI. Break it only deliberately, for optical reasons.
- **Keyline shapes** inside the live area compensate for perceived size differences (circles look smaller than squares at equal dimensions):
  - Square content: 18×18
  - Circular content: 20×20 (full live area)
  - Vertical rectangle: 16×20; horizontal rectangle: 20×16
- **Whole-number coordinates.** X/Y positions and dimensions snap to the pixel grid (0, 24 — never 0.03 or 24.4). Off-pixel geometry renders blurry at small sizes. Straight lines especially must sit on-pixel.

### Stroke
- **One stroke weight across the entire set.** 1.5px is the modern sweet spot at 24px (Hugeicons uses 1.5; Lucide and Material use 2; thin/elegant sets use 1). Pick one; never mix.
- **Minimum gap between strokes ≥ stroke weight.** Anything tighter fills in visually at 16px.
- **Round caps and round joins** for a friendly, modern feel (the "rounded" family); square caps + mitered joins for a technical "sharp" family. One choice per family, never mixed within one.
- **Live strokes during design** (so weight can be tuned set-wide), flattened/outlined only if an export target requires it.

### Corners
- **Consistent corner radius** everywhere (typically 2px at 24px grid for rounded styles).
- **Concentric radii for nested shapes:** inner radius = outer radius − distance between the shapes. This is the single most common giveaway of an amateur set.

### Optical correction
- Pixel grid first, then trust your eye. Center the dominant shape on the *optical* center, not the bounding-box center (e.g. a play triangle sits slightly right of mathematical center).
- When nested shapes look off-balance despite correct math, realign optically. The human eye detects misalignment even at 16px.

## 3. Drawing rules (the minimalism discipline)

1. **Design for 16px, draw at 24px.** You work at 3200% zoom; users see a 16px glyph. Any detail that disappears at 16px shouldn't exist.
2. **Build from geometric primitives.** Rectangles, circles, arcs — combined with boolean operations — not freehand pen paths. Draw angled shapes point-by-point on the grid; never rotate a rectangle (anchors come off-pixel).
3. **One metaphor, drawn from universal physical objects** (alarm clock → reminder, envelope → mail). Avoid vague metaphors and culture-specific references. When simplifying for small sizes, preserve the metaphor's most recognizable detail and delete everything else.
4. **No text in icons.** If a glyph needs a character (currency), draw it as a shape.
5. **No perspective** unless it's a deliberate system-wide trait.
6. **Reuse parts.** Arrows, badges, enclosures, plus/minus modifiers are shared components placed identically across icons (same position, same size). This is how Hugeicons ships tens of thousands of icons that feel like one hand drew them — and how modifier icons (user-add, user-remove, user-check) stay in lockstep.
7. **Filled icons are shadows, not inverted outlines.** When deriving a solid variant from a stroke icon, simplify the linework into a silhouette; keep interior cutouts proportional to the stroke weight (with a 2px stroke, interior filled details ≤ 4×4px).

## 4. Style families (the Hugeicons format model)

Hugeicons' 10 styles are really a 2-axis matrix — corner treatment × rendering treatment:

| Axis | Options |
|---|---|
| Corner | Rounded (soft, friendly) · Sharp (crisp, technical) · Standard |
| Rendering | **Stroke** (outline only) · **Solid** (filled silhouette) · **Twotone** (2 stroke layers, secondary at 40% opacity) · **Duotone** (stroke + tinted fill, secondary at 40%) · **Bulk** (2 fill layers, secondary at 40%) |

Rules that make the matrix work:
- Every icon exists in every style with the **same silhouette and metaphor** — only treatment changes.
- Two-layer styles use exactly **two color slots** (primary + secondary), secondary defaulting to 40% opacity of primary. This gives "multicolor" expressiveness while staying themeable with one or two CSS variables.
- Never mix families in one UI surface. (This is a great Supericons search/filter feature: let users lock a style family.)

A practical starting point for a Supericons house style: one family first (stroke-rounded, 1.5px, 24px grid), prove it across ~200 icons, then derive solid → duotone from the validated outlines. Start with the *hardest, most complex* icons to establish the rules; the simple ones (X, chevron, hamburger) follow trivially.

## 5. SVG format spec (production)

What a Supericons-style canonical SVG should look like:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="..."/>
</svg>
```

- `viewBox="0 0 24 24"` always; render size is set by the consumer.
- `currentColor` so icons inherit text color — this is what makes one-line theming work.
- Stroke properties on the root, not per-path, so stroke width is runtime-adjustable (your real-time stroke customization depends on shipping live strokes, not outlined paths).
- Two-layer styles: secondary layer carries `opacity=".4"` (or a `--icon-secondary` CSS variable) so both slots are customizable.
- Whole-number or max-2-decimal path data; run SVGO with safe presets; no `id`s, no inline `style`, no clip-paths unless unavoidable.
- Component exports (React/Vue/Svelte) pass through `size`, `color`, `strokeWidth`, `absoluteStrokeWidth` props and spread the rest.

### Naming and metadata
- Name icons for **what they depict, not what they mean**: `lightbulb`, not `idea`; `stopwatch`, not `speed`. Short, kebab-case, multi-word with dashes (`chef-hat`).
- Variants via suffix/slash convention: `coffee/stroke`, `coffee/solid`; modifiers as `user-add`, `user-check`.
- Concept mappings ("idea", "speed") belong in **searchable tags/metadata**, not filenames — this is exactly the search index Supericons already needs, and it's what makes concept search and MCP `recommend_icons` good.

## 6. Production workflow & QA

1. Define the spec sheet (grid, padding, stroke, radius, caps) before drawing anything.
2. Draw hardest icons first to stress-test the rules.
3. Build/reuse shared components for recurring parts.
4. Review icons **in context and in bulk**: render the whole set as a 16px and 24px grid sheet; inconsistencies pop instantly at a glance.
5. User-test recognition: show icons without labels, ask what each means.
6. Automated QA worth building for Supericons ingestion (you aggregate 10 libraries — per-library consistency metadata is a differentiator):
   - viewBox is 24 (or normalized), artwork within live area
   - stroke width uniform; coordinates within decimal tolerance
   - no fills in stroke styles / no strokes in solid styles
   - fill/stroke uses `currentColor`
   - path count and node count sane (complexity budget)

## 7. QA checklist (per icon)

- [ ] Fits 24px grid, respects 2px padding / keylines
- [ ] Stroke weight identical to set; gaps ≥ stroke weight
- [ ] Caps, joins, corner radius match family; nested radii concentric
- [ ] Anchors on whole pixels; straight lines on-pixel
- [ ] Recognizable at 16px; metaphor unambiguous
- [ ] Optically centered (eye-checked, not just math-checked)
- [ ] Shared parts (arrows, badges) reused from components, not redrawn
- [ ] Named for the object; concepts in tags
- [ ] SVG clean: currentColor, root-level stroke attrs, SVGO-optimized

---

## Sources

- [Hugeicons — Icon Design Guidelines: How to Design Beautiful Icons](https://hugeicons.com/blog/design/how-to-design-icons)
- [Hugeicons — 10 Styles overview](https://hugeicons.com/styles)
- [Hugeicons Docs — Introduction & Styling](https://hugeicons.com/docs)
- [Bonnie Kate Wolf — A complete guide to iconography (designsystems.com / Figma)](https://www.designsystems.com/iconography-guide/)
- [Material Design — System icons](https://m2.material.io/design/iconography/system-icons.html)
- [Hugeicons / Masum Parvej on X](https://x.com/huge_icons), [masum.design](https://masum.design/)
