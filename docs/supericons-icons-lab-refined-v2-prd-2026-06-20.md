# Supericons Icons Lab Refined V2 PRD

Superseded for the next build slice by `docs/supericons-icons-lab-research-applied-prd-and-plan-2026-06-23.md`, which applies the newer icon-craft research and re-centers Icons Lab around Icon Creator Core instead of general vector-editor completeness.

Date: 2026-06-20

Status: Draft for implementation

## Source Key

- `[SOURCE: vector-editor-research]` = `docs/svg-icon-vector-editor-features-research.html`
- `[SOURCE: mockups]` = `references/mockups/icons-lab/2026-06-20/README.md`
- `[SOURCE: prior-blueprint]` = `docs/supericons-icons-lab-prd-architecture-blueprint-2026-06-19.md`
- `[SOURCE: static-core-prd]` = `docs/supericons-icons-lab-static-core-prd-blueprint-2026-06-19.md`
- `[SOURCE: honest-plan]` = `docs/supericons-icons-lab-honest-editor-implementation-plan-2026-06-20.md`
- `[SOURCE: inkscape-map]` = `docs/supericons-icons-lab-inkscape-minimum-editor-map-2026-06-20.md`
- `[SOURCE: refinement-plan]` = `docs/supericons-icons-lab-refinement-plan-2026-06-20.md`
- `[ASSUMPTION]` = product direction inferred from the sources above and current Supericons strategy.

## Title

Icons Lab V2 is a focused SVG icon production workbench for creating, refining, reviewing, packaging, and later making stateful Supericons icon systems with a human owner and agent partner. `[SOURCE: prior-blueprint]` `[SOURCE: mockups]` `[ASSUMPTION]`

## Problem Statement

Icons Lab previously drifted toward a UI that looked impressive but did not behave like a real icon editor. A successful version must start from a working 24x24 SVG document model, where every visible tool changes, inspects, previews, or exports the actual icon. `[SOURCE: honest-plan]` `[SOURCE: inkscape-map]`

An SVG icon editor is not a smaller Illustrator, Inkscape, or Figma clone. It needs professional vector primitives plus icon-specific discipline: grid, keylines, safe area, stroke recipes, small-size previews, SVG cleanup, and pack-level consistency. `[SOURCE: vector-editor-research]`

Supericons also needs an agentic workflow, but agent features must operate on structured icon documents and human approvals, not decorative chat or prompt-only output. `[SOURCE: vector-editor-research]` `[SOURCE: prior-blueprint]`

The refined mockups show the right product shape: editor-first, canvas-first, object-aware, recipe-driven, pack-aware, and agent-assisted without sacrificing human control. `[SOURCE: mockups]` `[ASSUMPTION]`

## Target User

Primary user: the Supericons founder, owner, or design lead who wants to create and approve high-quality icon assets without living inside a full professional vector suite. `[SOURCE: static-core-prd]`

Secondary user: an AI agent that needs structured operations for creating, editing, normalizing, previewing, QA-checking, and requesting review for icons. `[SOURCE: prior-blueprint]` `[SOURCE: vector-editor-research]`

Future user: a developer, designer, or pro customer who wants to create custom icons, icon packs, stateful icons, or bento sets for their own product. `[SOURCE: static-core-prd]` `[ASSUMPTION]`

## Jobs To Be Done

1. When I open Icons Lab, I want a real blank icon canvas or a clear template start so I can begin creating immediately without visual clutter. `[SOURCE: mockups]` `[SOURCE: honest-plan]`

2. When I draw or import an icon, I want to select, resize, move, style, reorder, and edit its nodes so the app behaves like a real vector editor. `[SOURCE: vector-editor-research]` `[SOURCE: inkscape-map]`

3. When I work on an icon, I want grid, safe area, keylines, snapping, style recipes, and size previews to guide quality without turning the UI into a lecture. `[SOURCE: vector-editor-research]` `[SOURCE: mockups]`

4. When I use an agent, I want the agent to propose or perform concrete document operations that I can review, undo, and approve. `[SOURCE: vector-editor-research]` `[SOURCE: mockups]`

5. When I build a pack, I want to compare icons as a family, manage metadata, and export clean public-safe assets. `[SOURCE: prior-blueprint]` `[SOURCE: mockups]`

6. When static icons are strong, I want to convert them into stateful or interactive versions without losing the base SVG craft. `[SOURCE: static-core-prd]` `[SOURCE: mockups]`

## Goals

1. Build Icons Lab as a real SVG icon editor first, not as a dashboard with fake panels. `[SOURCE: honest-plan]`

2. Match the refined mockups as a product direction while only exposing features that work in the current implementation milestone. `[SOURCE: mockups]` `[SOURCE: honest-plan]`

3. Provide the minimum professional vector feature set needed for icon craft: select, shapes, pen, nodes, transform, align, object stack, style, preview, import, export, and undo. `[SOURCE: vector-editor-research]` `[SOURCE: inkscape-map]`

4. Add Supericons-specific quality tools: 24x24 recipe, safe area, keylines, stroke discipline, `currentColor`, small-size previews, SVG cleanup, and pack consistency review. `[SOURCE: vector-editor-research]` `[SOURCE: static-core-prd]`

5. Support agent-assisted creation through wired commands, structured runs, reviewable diffs, and human approval gates. `[SOURCE: vector-editor-research]` `[SOURCE: prior-blueprint]`

6. Preserve a path to premium icon sets, bento sets, preview-panel CTAs, metadata, and future stateful icons. `[SOURCE: mockups]` `[SOURCE: prior-blueprint]`

## Non-Goals

1. Do not copy Inkscape, Figma, Illustrator, Recraft, Magnific, or any proprietary product. Icons Lab should learn from useful interaction patterns and build a Supericons-native workflow. `[SOURCE: vector-editor-research]` `[SOURCE: inkscape-map]`

2. Do not show a tool, panel, handle, score, export option, import option, agent action, or QA check unless it is wired to real document behavior. `[SOURCE: honest-plan]` `[SOURCE: inkscape-map]`

3. Do not build bitmap filters, mesh gradients, spray/tweak tools, text layout tools, print layout, or full illustration workflows in the first production path. `[SOURCE: vector-editor-research]` `[SOURCE: inkscape-map]`

4. Do not make the agent the final authority. Human approval remains required before an icon becomes approved or publishable. `[SOURCE: prior-blueprint]`

5. Do not embed affiliate, referral, private review, or internal process details inside portable SVG files. Public outputs should remain clean icon assets and metadata. `[SOURCE: static-core-prd]`

6. Do not ship stateful icons before the static editor, static QA, and export pipeline are reliable. Stateful editing is planned, but static craft remains the foundation. `[SOURCE: static-core-prd]` `[ASSUMPTION]`

## Product Principles

1. Canvas first. The main screen should open into the work surface, not a marketing page or dashboard. `[SOURCE: mockups]` `[SOURCE: honest-plan]`

2. Real before broad. A smaller set of working tools is better than a larger mock interface. `[SOURCE: honest-plan]`

3. Icon-specific, not general-purpose. Every feature should help produce better SVG icons or icon packs. `[SOURCE: vector-editor-research]`

4. Quality should be embedded. Checks should appear as contextual feedback, readiness, previews, and export blockers, not as a permanent low-value panel. `[SOURCE: refinement-plan]` `[SOURCE: mockups]`

5. Agents operate on documents. Agent actions must create, edit, inspect, render, QA, or export real document state. `[SOURCE: vector-editor-research]`

6. Packs are product units. Single-icon editing matters, but commercial value comes from coherent sets and clean metadata. `[SOURCE: prior-blueprint]` `[SOURCE: mockups]`

## Scope By Release

### P0: Honest Static Editor

P0 must deliver a real 24x24 SVG editor with blank canvas, select, move, resize, rectangle, ellipse, line, pen path creation, object stack, properties, stroke/fill controls, undo/redo, previews, and SVG export. `[SOURCE: honest-plan]` `[SOURCE: inkscape-map]`

### P1: Craft-Ready Icon Editor

P1 adds node editing, convert to path, align/distribute, group/ungroup, duplicate, flip, boolean operations, style recipe controls, import SVG, normalize SVG, and real QA feedback. `[SOURCE: vector-editor-research]` `[SOURCE: mockups]`

### P2: Agentic Pack Workbench

P2 adds guided brief creation, variant comparison, agent run panel, command palette, pack consistency review, metadata editor, preview-panel CTA support, and export staging. `[SOURCE: prior-blueprint]` `[SOURCE: mockups]`

### P3: Stateful And Interactive Icons

P3 adds state timelines, hover/pressed/active/disabled/loading/success/error states, path morph controls, transition settings, and interactive previews. `[SOURCE: static-core-prd]` `[SOURCE: mockups]`

## Mockup Surface Map

| Mockup | Product Surface | Build Meaning |
| --- | --- | --- |
| `01-core-icon-editor.png` | Main editor | Default workspace: canvas, tools, object stack, properties, preview, export. `[SOURCE: mockups]` |
| `02-node-path-editing.png` | Node/path mode | Real node selection, dragging, handles, segment actions, and path repair. `[SOURCE: mockups]` |
| `03-shape-boolean-builder.png` | Shape builder | Primitive shapes plus boolean union, subtract, intersect, and preview. `[SOURCE: mockups]` |
| `04-pack-workspace-consistency.png` | Pack review | Multi-icon review for stroke, density, naming, variants, and family consistency. `[SOURCE: mockups]` |
| `05-qa-cleanup-export.png` | QA/export | SVG cleanup, small previews, metadata, code output, and export blockers. `[SOURCE: mockups]` |
| `06-agentic-creation-workflow.png` | Agent workflow | Brief, variants, editable canvas, agent run steps, and human review controls. `[SOURCE: mockups]` |
| `07-new-icon-template-start.png` | Start/templates | Blank canvas, templates, icon recipes, SVG import, and guided pack starts. `[SOURCE: mockups]` |
| `08-import-trace-normalize.png` | Import pipeline | Import existing SVG/raster reference, trace or parse, then normalize. `[SOURCE: mockups]` |
| `09-style-recipe-system.png` | Style recipe | Grid, safe area, stroke, corners, caps, joins, optical nudges, examples. `[SOURCE: mockups]` |
| `10-stateful-icon-builder.png` | Stateful builder | Static-to-stateful workflow for interactive icon states. `[SOURCE: mockups]` |
| `11-command-history.png` | Command/history | Searchable commands, shortcuts, undo stack, checkpoints, agent actions. `[SOURCE: mockups]` |
| `12-library-pack-metadata.png` | Library publishing | Pack organization, tags, access tier, metadata, preview CTAs, export summary. `[SOURCE: mockups]` |

## Functional Requirements

### FR1. Real SVG Document Model

Icons Lab must use a structured document model as the source of truth for every visible object, style, selection, preview, QA result, and export. `[SOURCE: honest-plan]` `[SOURCE: inkscape-map]`

User job: create and edit icons with predictable behavior. `[SOURCE: honest-plan]`

Business goal: prevent the product from becoming an attractive but non-functional prototype. `[SOURCE: honest-plan]`

Risk mitigated: fake controls and mismatched UI state. `[SOURCE: honest-plan]`

Acceptance signals:

- Creating, editing, deleting, reordering, importing, and exporting all read or mutate the same document model. `[SOURCE: honest-plan]`
- Undo/redo restores previous document states. `[SOURCE: vector-editor-research]`
- Exported SVG matches the current canvas elements and styles. `[SOURCE: honest-plan]`

### FR2. Start And Template Screen

Icons Lab must provide a start screen for blank canvas, templates, icon recipes, import, and guided pack creation. `[SOURCE: mockups]`

User job: begin the correct workflow quickly. `[SOURCE: mockups]`

Business goal: support single icons, bento sets, and future premium packs from the same product shell. `[SOURCE: prior-blueprint]` `[ASSUMPTION]`

Risk mitigated: users land in a cluttered editor without knowing how to start. `[ASSUMPTION]`

Acceptance signals:

- Blank icon opens a 24x24 canvas with the default Supericons recipe. `[SOURCE: honest-plan]`
- Template choice creates a real document with editable elements. `[SOURCE: mockups]`
- Import path is hidden or disabled unless an SVG parser/importer is wired. `[SOURCE: honest-plan]`

### FR3. Canvas, Selection, And Navigation

Icons Lab must provide a zoomable, pannable, selectable SVG canvas with bounding boxes, resize handles, hover outlines, smart guides, snapping, and fit-to-artboard. `[SOURCE: vector-editor-research]`

User job: manipulate icons directly on the canvas. `[SOURCE: vector-editor-research]`

Business goal: make Icons Lab feel like a credible editor, not a form builder. `[SOURCE: inkscape-map]`

Risk mitigated: users can only drag canned shapes and cannot refine work. `[SOURCE: honest-plan]`

Acceptance signals:

- Click selects an object and syncs with the object stack. `[SOURCE: vector-editor-research]`
- Drag moves the selected object with optional snap. `[SOURCE: inkscape-map]`
- Resize handles modify actual geometry, not only CSS scale. `[SOURCE: vector-editor-research]`
- Zoom and pan do not change exported geometry. `[SOURCE: vector-editor-research]`

### FR4. Core Shape And Drawing Tools

Icons Lab must support rectangle, rounded rectangle, ellipse, circle, line, arc, freehand, and pen/path creation with clear active-tool behavior. `[SOURCE: vector-editor-research]`

User job: construct original icons from geometric primitives and paths. `[SOURCE: vector-editor-research]`

Business goal: enable original Supericons assets beyond logo conversion. `[SOURCE: prior-blueprint]`

Risk mitigated: the app remains only a shape placer with no real craft tools. `[SOURCE: vector-editor-research]`

Acceptance signals:

- Each drawing tool creates real SVG geometry. `[SOURCE: honest-plan]`
- Pen mode adds points and shows a live preview segment from the last point to the cursor. `[SOURCE: refinement-plan]`
- Pen clicks do not accidentally select existing objects while drawing. `[SOURCE: refinement-plan]`
- Shape tools support shift-constrain and from-center drawing where implemented. `[SOURCE: vector-editor-research]`

### FR5. Node And Path Editing

Icons Lab must support node mode for editable paths, including selecting points, moving nodes, adding/removing nodes, converting shapes to paths, and later curve handles. `[SOURCE: vector-editor-research]` `[SOURCE: inkscape-map]`

User job: refine the exact silhouette and geometry of an icon. `[SOURCE: vector-editor-research]`

Business goal: raise output quality beyond generic AI or primitive-only icons. `[SOURCE: static-core-prd]`

Risk mitigated: users cannot fix weak curves, awkward corners, or misaligned path segments. `[SOURCE: vector-editor-research]`

Acceptance signals:

- Node handles appear only for editable paths. `[SOURCE: honest-plan]`
- Moving a node updates the SVG path data. `[SOURCE: honest-plan]`
- The UI distinguishes object selection from node selection. `[SOURCE: vector-editor-research]`
- Unsupported node operations are hidden or unavailable until implemented. `[SOURCE: honest-plan]`

### FR6. Object Stack, Layers, Grouping, And Arrange

Icons Lab must provide an object stack backed by actual SVG elements, with select, rename, hide/show, lock/unlock, reorder by drag, group/ungroup, duplicate, delete, bring forward, send backward, and z-order control. `[SOURCE: vector-editor-research]` `[SOURCE: inkscape-map]`

User job: understand and manage what is on the canvas. `[SOURCE: inkscape-map]`

Business goal: support complex icons without exposing a full design-suite layer system too early. `[SOURCE: refinement-plan]`

Risk mitigated: object rows become fake labels or disconnected UI. `[SOURCE: inkscape-map]`

Acceptance signals:

- Every object row corresponds to one real SVG element or group. `[SOURCE: inkscape-map]`
- Drag reorder changes the render order. `[SOURCE: refinement-plan]`
- Hide, lock, delete, and rename persist in the document model. `[SOURCE: vector-editor-research]`

### FR7. Properties And Style Controls

Icons Lab must provide contextual properties for position, size, transform, stroke, fill, opacity, cap, join, corner radius, path type, and element-specific geometry. `[SOURCE: vector-editor-research]`

User job: make precise edits without manually writing SVG. `[SOURCE: inkscape-map]`

Business goal: improve accessibility for non-expert users while preserving advanced control. `[SOURCE: static-core-prd]`

Risk mitigated: fields like `X1`, `Y1`, `X2`, and `Y2` appear without meaning or context. `[SOURCE: refinement-plan]`

Acceptance signals:

- Properties show only fields that apply to the selected element type. `[SOURCE: honest-plan]`
- Stroke and fill controls update real SVG attributes. `[SOURCE: refinement-plan]`
- Cap and join controls appear only where they affect rendering. `[SOURCE: refinement-plan]`
- Color controls support `currentColor`, none, and chosen colors with public-safe export rules. `[SOURCE: vector-editor-research]`

### FR8. Align, Distribute, Transform, And Boolean Operations

Icons Lab must support align to artboard, align to selection, distribute objects, mirror/flip, rotate, duplicate, boolean union, subtract, intersect, exclude, and compound path creation where those operations are wired. `[SOURCE: vector-editor-research]`

User job: build clean icons from multiple shapes quickly. `[SOURCE: vector-editor-research]`

Business goal: make complex original icons possible without leaving Icons Lab. `[SOURCE: prior-blueprint]`

Risk mitigated: users must jump into Inkscape or Figma for basic icon construction. `[SOURCE: inkscape-map]`

Acceptance signals:

- Boolean operations modify the document geometry and can be undone. `[SOURCE: vector-editor-research]`
- Align and distribute use selected object bounds or artboard bounds as shown. `[SOURCE: vector-editor-research]`
- Operations that require multiple selections remain unavailable until multi-select is implemented. `[SOURCE: refinement-plan]`

### FR9. Style Recipe System

Icons Lab must support editable Supericons style recipes for grid, viewBox, safe area, stroke width, caps, joins, corner radius, optical nudges, density, allowed variants, and export rules. `[SOURCE: mockups]` `[SOURCE: static-core-prd]`

User job: keep icons consistent without manually remembering every rule. `[SOURCE: static-core-prd]`

Business goal: create premium packs with coherent visual systems. `[SOURCE: prior-blueprint]`

Risk mitigated: individual icons look fine but fail as a family. `[SOURCE: static-core-prd]`

Acceptance signals:

- A document can bind to a style recipe. `[SOURCE: static-core-prd]`
- Recipe changes can apply to selected objects or the whole document when confirmed. `[ASSUMPTION]`
- Compliance feedback appears contextually and does not dominate the main canvas. `[SOURCE: refinement-plan]`

### FR10. Preview, QA, Cleanup, And Export

Icons Lab must render live previews at 16, 20, 24, 32, 48, 64, and 128 px, with transparent, light, dark, warm, and cool backgrounds where supported. `[SOURCE: mockups]` `[SOURCE: vector-editor-research]`

User job: judge whether the icon works in actual UI sizes and contexts. `[SOURCE: vector-editor-research]`

Business goal: reduce poor-quality exports and increase library trust. `[SOURCE: static-core-prd]`

Risk mitigated: icons look good at canvas scale but fail in real UI. `[SOURCE: vector-editor-research]`

Acceptance signals:

- Preview cells render from the same live SVG document. `[SOURCE: honest-plan]`
- QA checks cover viewBox, safe area, currentColor, stroke width, raster embeds, hidden text, path complexity, and recipe compliance. `[SOURCE: honest-plan]` `[SOURCE: vector-editor-research]`
- Export produces clean SVG and optional PNG/component output only from approved document state. `[SOURCE: vector-editor-research]`
- Public export excludes private notes, agent logs, and internal process metadata. `[SOURCE: static-core-prd]`

### FR11. Import, Trace, And Normalize

Icons Lab must support importing SVG first, then later raster reference tracing, with clear normalization into the Icons Lab document model. `[SOURCE: mockups]` `[SOURCE: vector-editor-research]`

User job: bring in existing drafts, references, or logo/icon assets for cleanup. `[SOURCE: mockups]`

Business goal: support Supericons production workflows and future customer workflows. `[SOURCE: prior-blueprint]` `[ASSUMPTION]`

Risk mitigated: imported assets remain messy, non-editable, or unsafe to export. `[SOURCE: vector-editor-research]`

Acceptance signals:

- Imported SVG is parsed into editable elements where possible. `[SOURCE: vector-editor-research]`
- Unsupported SVG features are reported before export. `[SOURCE: vector-editor-research]`
- Normalization can apply viewBox, stroke, fill, color, and cleanup rules with before/after preview. `[SOURCE: mockups]`

### FR12. Agent Composer, Command Palette, And History

Icons Lab must support an agent composer and command palette that execute real editor commands, record changes in history, and keep all agent edits reviewable. `[SOURCE: mockups]` `[SOURCE: vector-editor-research]`

User job: collaborate with an agent without losing control of the document. `[SOURCE: prior-blueprint]`

Business goal: make Icons Lab differentiated for the agentic AI era. `[SOURCE: prior-blueprint]`

Risk mitigated: agent chat becomes decorative and untrusted. `[SOURCE: honest-plan]`

Acceptance signals:

- Agent commands mutate the document, run QA, generate variants, or request review. `[SOURCE: vector-editor-research]`
- Unsupported requests produce clear unavailable responses. `[SOURCE: honest-plan]`
- Every agent action appears in undo/history. `[SOURCE: vector-editor-research]`
- Command palette exposes only wired commands or clearly marks unavailable commands. `[SOURCE: honest-plan]`

### FR13. Pack Workspace, Metadata, And Publishing

Icons Lab must support pack-level organization, concept lists, status, variants, tags, search keywords, access tier, preview-panel CTA metadata, and export staging. `[SOURCE: mockups]` `[SOURCE: prior-blueprint]`

User job: turn icons into a usable library or sellable set. `[SOURCE: prior-blueprint]`

Business goal: support premium icons, bento sets, affiliate/referral CTAs in preview panels, and Supericons publishing. `[SOURCE: mockups]` `[ASSUMPTION]`

Risk mitigated: icons exist as files but cannot be searched, marketed, packaged, or published cleanly. `[SOURCE: prior-blueprint]`

Acceptance signals:

- Pack metadata is stored separately from portable SVG content. `[SOURCE: static-core-prd]`
- Search tags and CTA links are preview-panel/product metadata, not embedded SVG payload. `[SOURCE: static-core-prd]`
- Export staging produces clean SVGs, previews, and public-safe metadata. `[SOURCE: prior-blueprint]`

### FR14. Stateful Icon Builder

Icons Lab must eventually support converting static icons into stateful icon systems: default, hover, pressed, active, disabled, loading, success, error, and reduced-motion fallback. `[SOURCE: mockups]` `[SOURCE: static-core-prd]`

User job: create interactive icons for modern app surfaces. `[SOURCE: mockups]`

Business goal: expand Supericons beyond static assets into premium interactive UI components. `[SOURCE: prior-blueprint]` `[ASSUMPTION]`

Risk mitigated: dynamic icons are built on weak static foundations or inconsistent state semantics. `[SOURCE: static-core-prd]`

Acceptance signals:

- Stateful builder opens only after a valid base static icon exists. `[SOURCE: static-core-prd]`
- Each state can define stroke, fill, opacity, scale, rotation, path morph, duration, easing, and semantic label where supported. `[SOURCE: mockups]`
- Static fallback and reduced-motion export are required before stateful publishing. `[SOURCE: static-core-prd]`

## Core Document Model

The editor should preserve a structured model separate from SVG export so the app can support undo, agent operations, QA, preview, and future stateful transforms. `[SOURCE: vector-editor-research]` `[SOURCE: honest-plan]`

```json
{
  "id": "doc_heart_outline",
  "name": "heart-outline",
  "viewBox": "0 0 24 24",
  "recipeId": "si-outline-rounded-24",
  "canvas": {
    "size": 24,
    "safeArea": 2,
    "grid": 1,
    "snap": true
  },
  "selectedElementIds": ["el_1"],
  "elements": [
    {
      "id": "el_1",
      "type": "path",
      "name": "heart",
      "visible": true,
      "locked": false,
      "attrs": {
        "d": "M...",
        "fill": "none",
        "stroke": "currentColor",
        "strokeWidth": 2,
        "strokeLinecap": "round",
        "strokeLinejoin": "round"
      }
    }
  ],
  "history": [],
  "reviewState": "draft"
}
```

## UX Flow

1. Start: user chooses blank icon, template, import, style recipe, guided pack, or recent file. `[SOURCE: mockups]`

2. Create: user draws with shape, line, pen, or imported SVG elements on a 24x24 artboard. `[SOURCE: honest-plan]` `[SOURCE: vector-editor-research]`

3. Refine: user selects objects, edits properties, moves nodes, aligns, reorders, applies style recipe, or runs agent commands. `[SOURCE: vector-editor-research]` `[SOURCE: mockups]`

4. Preview: user checks the icon at production sizes and backgrounds. `[SOURCE: vector-editor-research]`

5. QA: app surfaces real blockers and cleanup actions. `[SOURCE: honest-plan]` `[SOURCE: mockups]`

6. Package: user adds metadata, tags, access tier, and preview-panel CTA data when working at pack level. `[SOURCE: mockups]`

7. Export: app stages public-safe SVGs, previews, metadata, and optional component code. `[SOURCE: prior-blueprint]` `[SOURCE: mockups]`

8. Upgrade: static approved icons can later enter the stateful builder. `[SOURCE: static-core-prd]` `[SOURCE: mockups]`

## Constraints

Icons Lab must remain separate from the existing Supericons site until the prototype is production-grade enough to merge. `[SOURCE: honest-plan]`

The first implementation must prioritize working local document behavior over remote agent orchestration. `[SOURCE: honest-plan]`

Local Inkscape can be used as an optional helper for plain SVG cleanup, geometry query, and PNG export, but Icons Lab must still edit and export SVG without depending on Inkscape. `[SOURCE: inkscape-map]`

The UI must use plain product language for user-facing text and avoid exposing raw technical labels unless those labels are explained or appropriate for advanced mode. `[SOURCE: refinement-plan]`

Public outputs must not include private prompt, review, provider, or internal workflow metadata. `[SOURCE: static-core-prd]`

## Success Metrics

Primary metric: time from blank canvas or imported SVG to clean export-ready static icon. `[ASSUMPTION]`

Supporting metrics:

- Percent of visible controls backed by real document behavior. `[SOURCE: honest-plan]`
- Percent of icons passing viewBox, safe area, currentColor, stroke, raster, hidden text, and preview checks. `[SOURCE: vector-editor-research]`
- Time to make a basic icon using only canvas tools and properties. `[ASSUMPTION]`
- Percent of agent actions that result in a real document mutation, QA report, export, or review request. `[SOURCE: vector-editor-research]`
- Percent of pack icons with complete public-safe metadata. `[SOURCE: prior-blueprint]`

Guardrail metrics:

- Count of visible controls with no wired behavior. Target: zero for any released milestone. `[SOURCE: honest-plan]`
- Count of exported SVGs containing private or internal process metadata. Target: zero. `[SOURCE: static-core-prd]`
- Count of agent-created assets approved without human review. Target: zero. `[SOURCE: prior-blueprint]`
- Count of stateful exports without static fallback or reduced-motion handling. Target: zero once stateful builder exists. `[SOURCE: static-core-prd]`

## Risks And Dependencies

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Mockup parity creates pressure to show unwired controls. `[ASSUMPTION]` | Fake controls damage trust. `[SOURCE: honest-plan]` | Use milestone visibility rules: hide or disable unavailable features clearly. `[SOURCE: honest-plan]` |
| Node and boolean editing are harder than shape placement. `[ASSUMPTION]` | Without them, Icons Lab cannot become a serious icon editor. `[SOURCE: vector-editor-research]` | Build path/node editing in a focused slice before advanced agent features. `[SOURCE: inkscape-map]` |
| QA panel becomes noisy. `[ASSUMPTION]` | It can steal focus from the canvas. `[SOURCE: refinement-plan]` | Surface QA as readiness, blockers, and contextual cleanup actions. `[SOURCE: refinement-plan]` |
| Agent features become decorative. `[SOURCE: honest-plan]` | Users lose confidence in the app. `[SOURCE: honest-plan]` | Agent composer only exposes wired commands and records all actions in history. `[SOURCE: vector-editor-research]` |
| Public metadata mixes product data with private process data. `[SOURCE: static-core-prd]` | Public artifacts become unsafe or unprofessional. `[SOURCE: static-core-prd]` | Keep source/review logs separate from public export schema. `[SOURCE: static-core-prd]` |
| Stateful icons distract from static core. `[ASSUMPTION]` | Dynamic states will animate weak icons. `[SOURCE: static-core-prd]` | Gate stateful builder behind valid static icon and QA pass. `[SOURCE: static-core-prd]` |

## Open Questions

1. Should P0 include resize handles on the canvas, or should numeric resizing ship first and canvas resize handles follow in P1? `[ASSUMPTION]`

2. Should boolean operations be implemented in-browser first, or should the first version use a library/helper for path operations? `[ASSUMPTION]`

3. Should the default Supericons recipe use 1.5px or 2px stroke for the first original icon packs? `[SOURCE: static-core-prd]`

4. Should the agent dock appear in P0 as a small command helper, or stay hidden until at least P1? `[SOURCE: honest-plan]`

5. Should pack metadata and preview-panel CTA support ship before or after the first static icon pack is complete? `[SOURCE: mockups]` `[ASSUMPTION]`

6. Which stateful export format should be first: CSS transitions, animated SVG, React component, or Lottie-like JSON? `[ASSUMPTION]`

7. Should `currentColor` remain the default for all exportable UI icons, with custom fill/stroke colors treated as preview or premium illustration settings? `[SOURCE: vector-editor-research]` `[ASSUMPTION]`

## Implementation Acceptance Gate

Before a screen or feature is considered complete, it must pass these gates. `[SOURCE: honest-plan]` `[SOURCE: vector-editor-research]`

- It reads from or writes to the document model. `[SOURCE: honest-plan]`
- It can be undone or redone when it mutates the document. `[SOURCE: vector-editor-research]`
- It appears correctly in preview when visual. `[SOURCE: vector-editor-research]`
- It exports correctly when relevant. `[SOURCE: honest-plan]`
- It is covered by a manual interaction test. `[SOURCE: honest-plan]`
- It does not expose private process metadata in public output. `[SOURCE: static-core-prd]`
- If it is not ready, it is hidden, disabled, or clearly marked unavailable. `[SOURCE: honest-plan]`

## Recommended Next Build Sequence

1. Reconcile current prototype against `01-core-icon-editor.png` and remove any unwired visible controls. `[SOURCE: mockups]` `[SOURCE: honest-plan]`

2. Finish P0: real document model, canvas, select/move/resize, shapes, line, pen, object stack, properties, preview, undo/redo, SVG export. `[SOURCE: honest-plan]` `[SOURCE: inkscape-map]`

3. Add P1 path craft: node editing, convert to path, align/distribute, groups, booleans, style recipe, import, normalize, real QA. `[SOURCE: vector-editor-research]`

4. Add P2 production workflow: agent composer, command palette, history, variant board, pack review, metadata, export staging. `[SOURCE: mockups]` `[SOURCE: prior-blueprint]`

5. Add P3 stateful builder after static icons are reliable. `[SOURCE: static-core-prd]` `[SOURCE: mockups]`

## PRD Coverage Checklist

- Problem: present.
- Target user: present.
- Scope: present.
- Functional requirements: present.
- Non-goals: present.
- Success metrics: present.
- Risks: present.
- Open questions: present.
- Every requirement maps to a user job, business goal, risk, and acceptance signal.
- Mockup parity is defined as working behavior, not visual imitation only.
