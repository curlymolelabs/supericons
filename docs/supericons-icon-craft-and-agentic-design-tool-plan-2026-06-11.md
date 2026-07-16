# Supericons Icon Craft And Agentic Design Tool Plan

Date: 2026-06-11

## Purpose

The `supericons` custom library should not only collect missing logos. It should define how a Supericons-native icon is designed, reviewed, normalized, animated, and published.

This plan covers two connected goals:

1. Define the visual and technical standard for Supericons-native icons.
2. Define a design tool that helps a human or AI agent create icons in that standard.

## Reference Inspiration

The design direction should study icon systems that are beautiful, minimal, consistent, and production-ready.

Primary references:

- Local Supericons style guide: `docs/supericons-icon-style-guide.md`
- Hugeicons docs: https://hugeicons.com/docs
- Hugeicons custom icons: https://hugeicons.com/docs/custom-icons
- Hugeicons customizable icons: https://hugeicons.com/docs/features/customizable-icons
- Hugeicons icon selection guidance: https://hugeicons.com/docs/best-practice/icon-selection
- Hugeicons icon design article: https://hugeicons.com/blog/design/how-to-design-icons
- Hugeicons on X: https://x.com/huge_icons
- Masum Parvej on X: https://x.com/masumparvej_

Reference takeaways:

- Design on a small, strict grid.
- Keep icons clear at small sizes.
- Use consistent stroke width, corner radius, color behavior, and naming.
- Reuse shapes and visual parts across the set.
- Keep the icon useful first, then make it beautiful.
- Support multiple styles and interactive states when the product needs them.
- Treat icon quality as a system of constraints: grid, stroke, radius, padding, metaphor, optical balance, and export cleanliness.

## Supericons Design Standard

### Canvas

Default canvas:

- 24 x 24 viewBox.
- 2px outer padding.
- 20 x 20 live area.
- Whole-pixel coordinates whenever possible.
- No accidental decimals in final normalized SVG.

Default keylines inside the live area:

- Square content: about 18 x 18.
- Circular content: about 20 x 20.
- Vertical rectangle: about 16 x 20.
- Horizontal rectangle: about 20 x 16.

These keylines are guides, not traps. Break them only for optical balance, recognizability, or a clearly documented family rule.

Supporting sizes:

- 16 x 16 for compact UI.
- 24 x 24 as the primary size.
- 32 x 32 for larger UI controls.
- 48 x 48 and above for showcase, docs, and animated previews.

### Stroke Style

Default stroke direction:

- 1.5px stroke for Supericons-native line icons.
- Minimum gap between strokes should be at least the stroke width.
- Round caps for friendly, modern icons.
- Round joins for approachable app UI.
- Centered strokes while editing.
- Keep live stroke editable in source files when possible.

Alternative styles can be introduced later:

- Sharp stroke.
- Solid.
- Duotone.
- Bulk.
- Animated.

The first release should prioritize one clean default style before expanding into many styles.

### Corners And Nested Shapes

Default rounded style:

- Use a consistent corner radius across a family.
- Start with about 2px radius on a 24px icon.
- For nested rounded shapes, keep radii visually concentric.
- Inner radius should generally be the outer radius minus the distance between the two shapes.

This prevents one of the quickest signs of an amateur icon set: rounded shapes that almost align but feel subtly wrong.

### Shape Language

Supericons-native icons should feel:

- Minimal.
- Balanced.
- Friendly but still developer-grade.
- Smooth, not childish.
- Recognizable at 16px and 24px.
- Modern enough for agentic AI and vibe-coding tools.

Useful repeated parts:

- Rounded rectangles.
- Circles and dots.
- Small spark or star forms.
- Connectors and paths.
- Chat/message shapes.
- Cursor/pointer motifs.
- Bracket, code, node, model, and workflow motifs.
- Loader rings and progress arcs.

### Visual Rules

Each icon should pass these rules:

- The silhouette is readable before details are noticed.
- The metaphor is not too obscure.
- The live area feels visually balanced.
- Positive and negative space are intentional.
- Similar icons reuse similar geometry.
- Stroke weight and radius match the rest of the set.
- Details do not collapse at 16px.
- The icon can work in black, white, and currentColor.
- No text is used as a shortcut inside the icon.
- No perspective is used unless it becomes a deliberate family-wide rule.
- Filled variants are simplified silhouettes, not simply inverted outlines.

### Drawing Rules

Use this discipline when creating original Supericons-native assets:

- Design for 16px readability, even when drawing at 24px.
- Build from geometric primitives such as circles, rectangles, arcs, and paths.
- Avoid freehand detail unless the metaphor truly needs it.
- Do not rotate rectangles for angled shapes; draw anchors directly on the grid when possible.
- Reuse shared parts such as arrows, badges, plus/minus modifiers, check marks, dots, and loader arcs.
- Name icons for what they depict, while putting concepts and use cases in metadata.

## Logos Versus Icons

The `supericons` library can contain both logos and original icons, but they need different rules.

Logos:

- Preserve the official brand shape.
- Use official source assets when possible.
- Do not restyle a logo into a new mark unless the brand permits it.
- Store source and usage notes.
- Treat trademark concerns separately from design quality.

Original icons:

- Use the Supericons grid and shape language.
- Can be simplified, stylized, animated, or adapted.
- Can become premium assets if they are high-quality and original.

## Static And Dynamic Assets

The custom library should support:

- Static SVG icons.
- Brand logos.
- Smart loaders.
- Animated SVG icons.
- Motion recipes for CSS animation.
- State icons for agentic AI interfaces.

Animation should be purposeful, not decorative.

Good animation uses:

- Small loops for waiting or loading.
- Progress motion for generation or retrieval.
- Pulse motion for live agent activity.
- Step motion for planning or workflow execution.
- Soft reveal for generated output.

Animation rules:

- Include a reduced-motion fallback.
- Avoid distracting infinite motion for normal UI icons.
- Keep animation CSS separable from the base SVG.
- Allow export as static SVG when motion is not wanted.

## Supericons Asset Anatomy

Each finished asset should have:

- Source SVG.
- Normalized SVG.
- Preview image.
- Search metadata.
- Category tags.
- Alias terms.
- Asset type.
- Access tier.
- Source URL when the asset is externally sourced.
- Usage note when the asset is a logo.
- Optional animation recipe.
- Optional reduced-motion variant.

Recommended asset types:

- `logo`
- `static_icon`
- `animated_icon`
- `loader`
- `state_icon`
- `flag_or_region_symbol`

Recommended access tiers:

- `free`
- `premium`
- `internal_review`

## SVG Production Profile

The default Supericons-native stroke SVG should follow this shape:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="..."/>
</svg>
```

Production rules:

- Use `viewBox="0 0 24 24"` for normalized icons.
- Use `currentColor` for themeable stroke or fill color.
- Put shared stroke properties on the root when possible.
- Keep live strokes for editable stroke icons.
- Keep path data clean and avoid unnecessary decimals.
- Avoid inline styles, unnecessary ids, hidden metadata, and clip paths unless required.
- Two-layer styles should use clear primary and secondary layers, with the secondary layer usually at about 40% opacity.

## Human Icon Design Workflow

1. Define the job of the icon.
2. Decide if the asset is a logo, concept icon, loader, or agent state.
3. Collect references and metaphors.
4. Sketch 3 to 5 versions.
5. Choose the clearest silhouette.
6. Build on the 24 x 24 grid.
7. Use the standard stroke, cap, join, and radius rules.
8. Simplify until it works at 16px.
9. Reuse existing shared parts where possible.
10. Test next to other Supericons assets in a 16px and 24px grid sheet.
11. Add metadata, aliases, and category tags.
12. Run source, usage, and visual QA.
13. Publish only after the asset passes checks.

## AI Agent Design Tool

The tool should help an AI agent and human reviewer create Supericons-native assets without requiring full manual vector design every time.

Working name: Supericons Design Tool

Primary users:

- Supericons maintainer.
- Icon designer.
- AI agent helping generate icons.
- Developer converting demand into usable UI assets.

Main jobs:

- Turn search demand into a clear icon brief.
- Normalize converted logos into the custom library format.
- Help create original Supericons-native concept icons.
- Generate and compare multiple icon directions.
- Check whether an icon follows the Supericons style.
- Prepare metadata for search and packaging.
- Prepare optional motion for smart loaders and agent states.

## Design Tool MVP

The first version should not try to replace Figma. It should be a focused icon production workbench.

MVP capabilities:

1. Asset intake
   - Upload SVG.
   - Upload PNG converted through the converter workflow.
   - Paste SVG.
   - Start from a text brief.

2. Asset classification
   - Logo.
   - Static icon.
   - Animated icon.
   - Loader.
   - Agent state.
   - Flag or region symbol.

3. Style normalization
   - Set viewBox to 24 x 24.
   - Check live area.
   - Check keyline fit for square, circular, vertical, and horizontal shapes.
   - Check stroke width.
   - Check minimum stroke gaps.
   - Check coordinates for avoidable decimals.
   - Check caps and joins.
   - Check corner radius and nested radii.
   - Check fill and stroke consistency.
   - Check `currentColor` usage.
   - Check path and node complexity.

4. Visual preview
   - Preview at 16px, 24px, 32px, and 48px.
   - Preview in light and dark mode.
   - Preview in currentColor.
   - Preview as static icon even when animation exists.

5. Metadata builder
   - Name.
   - Slug.
   - Asset type.
   - Category.
   - Aliases.
   - Related terms.
   - Source URL.
   - Usage note.
   - Access tier.

6. QA panel
   - Grid fit.
   - Keyline fit.
   - Readability.
   - Stroke consistency.
   - Minimum stroke gaps.
   - Corner and nested-radius consistency.
   - Small-size clarity.
   - CurrentColor and SVG cleanliness.
   - Path and node complexity.
   - Source status.
   - Logo usage status.
   - Animation safety.
   - Reduced-motion fallback.

7. Export
   - Normalized SVG.
   - Metadata JSON.
   - Optional CSS animation.
   - Optional preview PNG.
   - Staging-ready asset folder.

## Agentic Creation Flow

The tool should support a flow like this:

1. User enters a demand signal, for example `smart loader for AI agent planning`.
2. Tool asks for asset type if unclear.
3. Tool generates a short design brief.
4. Tool proposes metaphors such as loop, nodes, spark, cursor, plan path, or model cube.
5. Tool creates several SVG draft directions.
6. User picks one direction.
7. Tool normalizes the SVG.
8. Tool previews sizes and themes.
9. Tool suggests metadata and aliases.
10. Tool exports a staging record.

For logos, the flow should be different:

1. User provides an official source asset.
2. Tool records source URL and source type.
3. Tool normalizes only the technical SVG shape and sizing.
4. Tool does not invent or restyle the brand.
5. Tool flags missing usage notes for review.

## Suggested Tool Architecture

The design tool can reuse existing Supericons capabilities:

- Converter for PNG to SVG and SVG to PNG workflows.
- Motion Lab for animation recipes and previews.
- Existing icon customization controls for color, stroke width, export size, and preview.
- Existing search metadata patterns from the registry.

Suggested modules:

- Brief builder.
- SVG normalizer.
- Grid and keyline checker.
- Style checker.
- Geometry and complexity checker.
- Metadata builder.
- Motion recipe editor.
- Preview renderer.
- Export packager.

## Quality Gates

An asset should not enter the public library until it passes:

- SVG renders without errors.
- ViewBox is valid.
- 16px preview is readable.
- 24px preview is balanced.
- No unwanted clipping.
- No accidental decimals where whole pixels are expected.
- Stroke and corner rules match the selected style.
- Gaps between strokes do not collapse at small sizes.
- Nested rounded shapes feel concentric.
- Shared modifiers are reused consistently.
- SVG uses themeable color conventions.
- Path count and node count stay within a sensible complexity budget.
- Metadata has useful aliases.
- Logo records include source and usage notes.
- Animated records include reduced-motion behavior.
- Access tier is set intentionally.

## First Production Exercise

Before building many icons, create a small controlled test set:

- `smart-loader`
- `agent-running`
- `agent-waiting-approval`
- `tool-use-active`
- `memory-update`
- `retrieval-in-progress`
- `model-switching`
- `ai-studio`

This test set should prove:

- The style language works.
- The design tool can normalize assets.
- The metadata model supports search.
- Static and animated assets can live in the same library.
- Premium candidates can be marked without changing the asset format.

## Next Step

Create a simple design-system checklist and a design-tool wireframe before writing production code.

The first implementation milestone should be a local workbench that can take one SVG, check it against the Supericons rules, preview it at multiple sizes, collect metadata, and export a staging-ready asset record.
