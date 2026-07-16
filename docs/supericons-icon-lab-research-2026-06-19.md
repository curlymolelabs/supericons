# Supericons Icon Lab Research

Date checked: 2026-06-19

This note studies three icon-creation references for Supericons' own icon production system:

- Apple Icon Composer, inspected from the official DMG artifact placed under `tools/icon-research/apple-icon-composer/`.
- Recraft's public icon generator, API, and prompt guidance.
- Magnific's public icon generator, icon-editing docs, and creative workflow docs.

The goal is not to copy or reverse engineer proprietary tools. The goal is to learn product patterns, design-system ideas, workflow shape, and quality gates that can inform a clean Supericons-native, open, extensible icon-production system.

## Apple Icon Composer: Local Artifact Findings

Local artifact inspected:

```text
tools/icon-research/apple-icon-composer/Icon_Composer_1.6_Release_Candidate_2.dmg
```

Verified facts from the current local artifact:

- DMG size: 17,060,934 bytes.
- SHA-256: `67581F2758E4229C32EEB8BA1C0119C8F5AD4EC9249C97BE143FF2F6B7EBEA32`.
- The DMG contains a Mac app bundle: `Icon Composer.app`.
- App version from `version.plist`: `1.6`, bundle version `99.1`.
- Project name in `version.plist`: `IconStudio`.
- Main bundle identifier: `com.apple.IconComposer`.
- Minimum macOS in main app `Info.plist`: `15.3`.
- The app exports a document type named `Icon Composer Icon`.
- The exported type identifier is `com.apple.iconcomposer.icon`.
- The file extension for the app's project document is `.icon`.
- The `.icon` document type conforms to `com.apple.package`, which implies a folder/package-style document rather than a simple flat file.
- The app includes QuickLook preview and thumbnail app extensions for `.icon` documents.
- The thumbnail extension declares `QLThumbnailMinimumDimension: 32`.
- The thumbnail extension is sandboxed and read-only for user-selected files.
- The bundle includes a command-line executable named `ictool`.
- The bundle includes frameworks named `CoreSVG`, `IconComposerFoundation`, `IconComposerKit`, `IconRendering`, and `RenderBox`.
- The bundle includes six `8192 x 8192` JPEG background images named as sine-color backgrounds, plus a DMG window background image.
- The app icon resource `AppIcon.icns` is readable as `256 x 256` RGBA by the local image tooling.

Important interpretation:

- Apple treats icon creation as a document workflow, not a one-off export.
- The document is previewable by the OS, with QuickLook and thumbnails.
- The tool appears to support both an interactive UI and a command-oriented path through `ictool`.
- The naming of bundled frameworks indicates separate concerns: SVG handling, foundation/model logic, UI kit, rendering, and render-box/material output.
- The included large backgrounds suggest previewing icons against multiple visual contexts is part of the design workflow.

## Apple Icon Composer: Public Workflow Lessons

Official Apple sources describe Icon Composer as a tool for creating layered icons from a single design for iPhone, iPad, Mac, and Apple Watch. Apple says the format supports a multi-layer icon and annotations across appearance modes, integrates with Xcode, and can export flattened versions for marketing and communication needs.

Key workflow ideas from Apple's public materials:

- Start in a design tool, then export layers.
- Use vectors where possible, because SVG layers scale cleanly.
- Keep source artwork flat, opaque, and reduced to its graphic essence before importing.
- Split artwork by depth order and by color if those colors need separate treatment later.
- Export layers as SVG when possible.
- Export PNG only when gradients, raster images, or effects cannot be expressed cleanly as SVG.
- Do not include the enclosing rounded rectangle or circle mask in source exports; the target platform applies the mask.
- Convert text to outlines before SVG export.
- Use layer order to preserve depth.
- Limit visual complexity. Apple's transcript notes that Icon Composer groups can go up to four, which they describe as a useful bound for complexity.
- Preview across modes and contexts, including Default, Dark, Mono, clear/tinted appearances, platform shapes, backgrounds, icon grids, zoomed-in views, and small-size views.
- Tune fills, opacity, blend modes, shadows, specular highlights, and material behavior per appearance where needed.
- Preserve mono-mode legibility by ensuring at least one recognizable element has strong contrast.

Supericons lesson:

We should not copy Apple's Liquid Glass or `.icon` format. But we should adopt the production idea: every serious icon should have a source project, layer model, style recipe, mode variants, small-size previews, and export outputs.

## Recraft: Public Workflow Lessons

Recraft's icon page focuses on generating complete icon sets, not just isolated icons. It describes a workflow where a user creates a new image set, chooses an icon style, writes up to six prompts, controls detail level, and adds a color palette. It also describes generating icons in one click, iterating results, and using brand-style customization with reference or branded images and HEX color control.

Relevant public Recraft patterns:

- Batch generation is a core feature: one style applied across a small set.
- Prompting is structured, not magical. Recraft's prompt guide frames good prompts around subject, composition, context, medium, style, vibe, and attributes.
- Their logo and icon guidance emphasizes simple recognizable shapes, minimal detail, clear geometry, and restrained palettes.
- Their API exposes image generation, style creation, image-to-image, inpainting, outpainting, background replacement, vectorization, prompt enhancement, exploration, and similar-image exploration.
- Their style documentation distinguishes between photorealism, illustration, vector art, and icons. It also notes that vector art and icon styles output SVG, while raster styles output formats like PNG, WEBP, or JPG.
- Recraft supports custom style IDs and style reuse, which is important for set consistency.

Supericons lesson:

The product unit should be a set, not a single icon. The system should generate, compare, and review icons in packs of 6, 12, 24, or 50. A Supericons style recipe should be reusable across every icon in a pack.

## Magnific: Public Workflow Lessons

Magnific's icon generator docs describe a text-to-icon workflow that produces four icon variations per generation, with PNG and SVG downloads. Its guidance says a good prompt should describe the object, style, and feel, and recommends avoiding overly abstract concepts because icons work best when they map to a clear recognizable object.

Relevant public Magnific patterns:

- Generate four alternatives per prompt.
- Let the user choose a preferred result, then refine.
- Support simple style families such as flat, outline, 3D, sticker, and gradient.
- Support PNG for fixed-size use and SVG for scalable production use.
- Treat SVG as the editable production format.
- Provide browser-based editing for SVG icons, including color, size, and where supported, stroke weight.
- Distinguish editable-stroke SVGs from simplified SVGs where strokes are converted to fixed shapes.
- In Spaces, Magnific describes node-based creative workflows. Relevant experimental nodes include Image to SVG, SVG Generator, SVG Animation, and image pipelines such as generate, explore, polish, upscale, and design.
- Magnific's image generator docs support references for style, object, character, color, camera, and effects. For icons, style and color references are the most relevant.

Supericons lesson:

Supericons should keep strokes editable whenever possible. The creator tool should explicitly mark whether an SVG is stroke-native or outline-flattened. It should also make variation review a first-class workflow, not an afterthought.

## Supericons Icon Lab: Recommended Product Shape

Supericons Icon Lab should be a production workbench for original icon sets.

It should not start as a general-purpose AI art generator. It should start as a focused icon system with strict constraints, because our advantage is taste, consistency, metadata, and utility.

Recommended modules:

1. Concept brief
   - Icon ID
   - Name
   - Concept
   - User interface use case
   - Primary metaphor
   - Avoided metaphors
   - Search terms
   - Related icons

2. Style recipe
   - Canvas size
   - ViewBox
   - Stroke width
   - Stroke cap and join
   - Corner radius language
   - Fill behavior
   - Color palette
   - Visual density
   - Minimum white space
   - Allowed detail level
   - Dark and light preview behavior

3. Batch creator
   - Generate a coherent pack at once.
   - Support 6, 12, 24, and 50-icon batches.
   - Keep one shared style recipe across the batch.
   - Let the designer approve, reject, or regenerate individual concepts.

4. Variant board
   - Show multiple candidates per concept.
   - Compare outline, filled, duotone, monochrome, and animated-loader forms where relevant.
   - Track why a variant was chosen.

5. Layer composer
   - Store icon source as logical layers when useful.
   - Preserve layer names and semantic roles.
   - Support mode-specific overrides for color, opacity, and stroke.
   - Avoid copying Apple's document format; use a Supericons-native package format.

6. SVG cleanup
   - Normalize `viewBox`.
   - Remove editor metadata.
   - Ensure `currentColor` where appropriate.
   - Normalize stroke width.
   - Keep strokes editable unless a filled icon intentionally requires paths.
   - Detect unexpected raster embeds.
   - Detect hidden text, masks, filters, and large path bloat.

7. Visual QA
   - Preview at 16, 20, 24, 32, 48, and 128 px.
   - Preview on light, dark, warm, cool, and transparent backgrounds.
   - Check small-size legibility.
   - Check silhouette clarity.
   - Check optical balance inside the viewBox.
   - Check stroke consistency across the pack.
   - Check whether the metaphor reads without labels.

8. Metadata and search
   - Generate search aliases.
   - Add use-case tags.
   - Add category tags.
   - Link related icons.
   - Keep affiliate or commerce CTA data out of portable SVGs and icon schemas.

9. Export
   - Source package for internal editing.
   - Clean SVG for product use.
   - Preview PNGs.
   - Registry record.
   - Pack manifest.
   - Optional animated SVG or Lottie output for loader/state icons.

## Proposed Supericons Source Package

Avoid Apple's `.icon` extension. Use a Supericons-native package naming scheme:

```text
*.siicon/
  icon.json
  layers/
    base.svg
    accent.svg
  variants/
    outline.svg
    filled.svg
    mono.svg
  previews/
    16.png
    24.png
    48.png
  qa.json
```

Minimal `icon.json` shape:

```json
{
  "id": "si:tool-call",
  "name": "Tool Call",
  "concept": "An AI agent invoking a tool or function.",
  "metaphor": "cursor entering a tool socket",
  "styleRecipe": "agentic-ai-core-v1",
  "sourceType": "layered-svg",
  "variants": ["outline", "filled", "mono"],
  "searchTerms": ["tool call", "function call", "ai tool", "agent action"],
  "qaStatus": "draft"
}
```

## Recommended First Pack

Start with a small internal proof pack:

```text
packId: agentic-ai-core-kit-001
targetCount: 12
style: 24x24 outline, 1.5px stroke, rounded caps and joins, currentColor
```

First 12 icons:

1. `si:agent-core`
2. `si:tool-call`
3. `si:tool-result`
4. `si:context-window`
5. `si:context-compaction`
6. `si:memory-checkpoint`
7. `si:agent-handoff`
8. `si:approval-gate`
9. `si:policy-guardrail`
10. `si:trace-span`
11. `si:eval-run`
12. `si:token-meter`

Why this pack:

- It is clearly Supericons-native.
- It is useful in real AI products.
- It tests the hardest part of the system: abstract-but-legible agent concepts.
- It can become the base grammar for larger bento sets later.

## Build Strategy

Recommended build order:

1. Create a markdown or JSON style recipe for `agentic-ai-core-v1`.
2. Build a small web-based Icon Lab prototype inside Supericons.
3. Start with manual SVG sketches plus AI-assisted prompt candidates.
4. Add SVG cleanup and visual QA scripts before adding more generation automation.
5. Generate the 12-icon proof pack.
6. Review the pack at small sizes.
7. Only then scale to 72 concepts.

The important move is to build the QA system early. Without QA, AI generation produces attractive but inconsistent icons. With QA, Supericons can turn AI assistance into a controlled production pipeline.

## What Not To Copy

- Do not copy Apple's `.icon` file format, Liquid Glass rendering, app UI, or proprietary implementation.
- Do not decompile Apple, Recraft, or Magnific code.
- Do not duplicate Recraft or Magnific's UI patterns directly.
- Do not embed third-party icon generator outputs into Supericons unless licensing and originality are clear.

## Core Principle

Supericons should use AI as a creative assistant, but the product should be built around a stronger idea:

```text
repeatable icon production for emerging software concepts
```

That means the real moat is not a prompt box. The real moat is the combination of concept taxonomy, style recipes, source packages, SVG cleanup, small-size QA, metadata, and pack-level consistency.
