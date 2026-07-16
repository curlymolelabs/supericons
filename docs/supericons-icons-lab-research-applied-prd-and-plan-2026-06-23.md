# Supericons Icons Lab Research-Applied PRD And Plan

Date: 2026-06-23

Status: Superseding product direction for the next Icons Lab build slice. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]`

## Source Key

- `[SOURCE: great-icon-research]` = `docs/icons-lab-great-icon-and-software-research-2026-06-23.md`
- `[SOURCE: core-audit]` = `docs/icons-lab-core-foundation-ui-ux-audit-2026-06-23.md`
- `[SOURCE: refined-v2-prd]` = `docs/supericons-icons-lab-refined-v2-prd-2026-06-20.md`
- `[SOURCE: honest-plan]` = `docs/supericons-icons-lab-honest-editor-implementation-plan-2026-06-20.md`
- `[SOURCE: static-core-prd]` = `docs/supericons-icons-lab-static-core-prd-blueprint-2026-06-19.md`
- `[ASSUMPTION]` = a product decision inferred from the sources above and current Supericons direction.

## Product Position

Icons Lab is a focused icon craft bench for creating, refining, reviewing, and exporting Supericons-grade icon assets with a human owner and an agent craft partner. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`

The product name remains **Icons Lab**. "Icon Creator Core" is the first working mode inside Icons Lab, not a replacement name. `[ASSUMPTION]`

Icons Lab should not feel like a smaller Inkscape, Figma, Illustrator, Photoshop, or generic AI image generator. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]` It should feel like a 24px icon workshop where the app handles grid discipline, previews, recipe consistency, and export hygiene while the human keeps taste authority. `[SOURCE: great-icon-research]`

## Problem

The previous Icons Lab direction over-weighted general vector-editor completeness: more tools, more inspector controls, visible checks, and advanced operations before the user could comfortably create one polished static icon. `[SOURCE: core-audit]` `[SOURCE: refined-v2-prd]`

Great icons are not just valid SVGs. They need instant readability, clear metaphor, small-size legibility, grid discipline, optical balance, consistent visual weight, useful negative space, and controlled personality. `[SOURCE: great-icon-research]`

The product gap is therefore not "build a full vector editor." The gap is "help a human and an agent reliably produce beautiful, readable, consistent icon sets without forcing the human to master full vector software." `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`

## Target User

Primary user: the Supericons founder, owner, or design lead who wants to create and approve high-quality icons without living inside a full professional vector suite. `[SOURCE: refined-v2-prd]` `[SOURCE: core-audit]`

Secondary user: an AI agent that needs structured operations for concept briefing, primitive creation, point editing, readability review, visual-weight comparison, and export preparation. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`

Future user: a developer, designer, or pro customer who wants to create custom icons, bento icon sets, or product-specific icon packs with guided agent assistance. `[SOURCE: refined-v2-prd]` `[ASSUMPTION]`

## Jobs To Be Done

1. When I need a new icon, I want to describe the meaning and context first so I can start from intent instead of a blank, intimidating toolbar. `[SOURCE: great-icon-research]`

2. When I create or edit an icon, I want a small, honest 24px canvas with previews at real use sizes so I can judge readability while I work. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`

3. When I shape an icon, I want icon-native primitives and guided point editing so I can create clean geometry without needing full vector-editor expertise. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`

4. When the agent helps, I want it to propose metaphors, simplify forms, balance spacing, compare siblings, and explain tradeoffs instead of only generating raw SVG. `[SOURCE: great-icon-research]`

5. When an icon is nearly ready, I want review to focus on real warnings and taste decisions, not a noisy checklist of things that already pass. `[SOURCE: core-audit]`

6. When I build a set, I want visual weight, metaphor consistency, naming, metadata, and export readiness checked across the family. `[SOURCE: great-icon-research]` `[SOURCE: static-core-prd]`

## Goals

1. Re-center the next build around Icons Lab's core creation loop: one static icon made well before broader vector, stateful, or animation features expand. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]`

2. Make the canvas truthful: what the user sees on the canvas must match preview and export stroke behavior. `[SOURCE: core-audit]`

3. Encode icon craft into the product: 24px board, 2px safe area, 1px grid, 2px stroke, keylines, small-size previews, and Supericons style recipes. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`

4. Make creation start from intent, metaphor, and context before tool choice. `[SOURCE: great-icon-research]`

5. Make the agent a craft partner with structured, reviewable actions and human approval gates. `[SOURCE: great-icon-research]` `[SOURCE: refined-v2-prd]`

6. Preserve future set-building, premium packs, bento sets, and stateful icons without letting those future goals clutter the static core. `[SOURCE: refined-v2-prd]` `[SOURCE: static-core-prd]`

## Non-Goals

1. Do not build a general-purpose vector editor in the next slice. `[SOURCE: core-audit]`

2. Do not expose advanced operations as primary UI unless they directly improve static icon creation and are fully wired. `[SOURCE: honest-plan]` `[SOURCE: core-audit]`

3. Do not keep always-visible pass checks in the editor. `[SOURCE: core-audit]`

4. Do not ship stateful icon creation before the static icon craft loop is strong. `[SOURCE: static-core-prd]` `[SOURCE: core-audit]`

5. Do not make AI generation the product wedge if the output is not structured, editable, recipe-aware SVG. `[SOURCE: great-icon-research]`

6. Do not put internal process metadata, affiliate metadata, or agent review traces into portable SVG output. `[SOURCE: static-core-prd]`

## Scope

### In Scope For Next Build Slice

- Icons Lab core creation screen. `[SOURCE: core-audit]`
- Intent-first start flow for one icon. `[SOURCE: great-icon-research]`
- 24px canvas with 2px safe area, 1px grid, 2px default stroke, keylines, and matching preview/export rendering. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`
- Icon-native primitive kit: box, rounded box, circle, dot, line, arc, corner, chevron, arrow, spark, badge/modifier, cutout, connector. `[SOURCE: great-icon-research]`
- Guided Points mode with convert-to-points, drag points, simple corner/smooth/balance actions, and plain-language labels. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]`
- Always-visible small previews at 16px, 20px, 24px, 32px, 48px, and 128px. `[SOURCE: great-icon-research]`
- Focused inspector that changes by selected object and hides low-value advanced controls by default. `[SOURCE: core-audit]`
- Agent composer prompts for metaphor, simplify, balance, open negative space, make more Supericons, and export review. `[SOURCE: great-icon-research]`
- Review warnings for small-size readability, safe area, visual weight, tight gaps, grid fit, stroke consistency, and naming. `[SOURCE: great-icon-research]`

### Out Of Scope For Next Build Slice

- Full boolean workflow as a dominant editor surface. `[SOURCE: core-audit]`
- Full state timeline editing. `[SOURCE: static-core-prd]`
- Multi-user collaboration. `[ASSUMPTION]`
- Marketplace or monetization surfaces inside Icons Lab. `[ASSUMPTION]`
- Full external model orchestration. `[ASSUMPTION]`

## Functional Requirements

| ID | Requirement | Maps To |
| --- | --- | --- |
| FR1 | The default editor opens to an Icons Lab core creation layout: left primitives/layers, center 24px canvas, right focused inspector plus preview, and compact agent composer. `[SOURCE: core-audit]` | JTBD 2, JTBD 3; Goal 1 |
| FR2 | The start flow asks for concept, object/action/state, usage context, and desired style recipe before generation or editing. `[SOURCE: great-icon-research]` | JTBD 1; Goal 4 |
| FR3 | The canvas uses 24px viewBox, 2px safe area, 1px snap grid, 2px default stroke, rounded caps/joins, and `currentColor` defaults. `[SOURCE: great-icon-research]` `[SOURCE: core-audit]` | JTBD 2; Goal 2; Risk R1 |
| FR4 | The canvas, preview, and export render actual icon strokes consistently. `[SOURCE: core-audit]` | JTBD 2; Goal 2; Risk R2 |
| FR5 | The primitive kit creates recipe-aware icon blocks with predictable geometry and naming. `[SOURCE: great-icon-research]` | JTBD 3; Goal 3 |
| FR6 | Points mode uses plain language, shows convert-to-points when needed, and exposes only point controls that work for the selected object. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]` | JTBD 3; Risk R3 |
| FR7 | Sketch input does not move the page and can later be cleaned into icon-grade geometry. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]` | JTBD 3; Risk R4 |
| FR8 | The preview panel prioritizes real-size previews and shows only warnings or blockers, not pass rows. `[SOURCE: core-audit]` | JTBD 2, JTBD 5; Goal 1 |
| FR9 | The focused inspector shows only controls relevant to the selected object and collapses advanced operations by default. `[SOURCE: core-audit]` | JTBD 3; Risk R5 |
| FR10 | The agent composer supports craft commands that map to real document operations or review reports: propose metaphors, simplify, balance, open spacing, compare weight, normalize recipe, and prepare export. `[SOURCE: great-icon-research]` | JTBD 4; Goal 5 |
| FR11 | Review mode evaluates recognition, interpretation, small-size readability, safe area, visual weight, stroke consistency, grid fit, negative space, naming, and metadata. `[SOURCE: great-icon-research]` | JTBD 5, JTBD 6; Risk R6 |
| FR12 | Export produces clean SVG, React component, PNG sizes, public metadata, and style recipe data without private agent/process metadata. `[SOURCE: great-icon-research]` `[SOURCE: static-core-prd]` | JTBD 6; Goal 6; Risk R7 |

## UX Flow

### Happy Path: One Static Icon

1. User opens Icons Lab and chooses Blank icon, Template, Generate from prompt, Convert SVG/logo, or Build bento set. `[SOURCE: great-icon-research]`
2. User enters concept and usage context. `[SOURCE: great-icon-research]`
3. Icons Lab applies the default Supericons outline recipe. `[SOURCE: great-icon-research]`
4. User or agent creates a first form using smart primitives or sketch. `[SOURCE: great-icon-research]`
5. User shapes the icon with Select, Points, primitive controls, and focused inspector fields. `[SOURCE: core-audit]`
6. User watches the 16px, 20px, 24px, 32px, 48px, and 128px previews while editing. `[SOURCE: great-icon-research]`
7. Agent runs a craft pass only when asked or when export review begins. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]`
8. User accepts or rejects agent suggestions. `[SOURCE: refined-v2-prd]`
9. User exports clean assets and metadata. `[SOURCE: static-core-prd]`

### Agent-Assisted Path

1. User asks for an icon or bento set in plain language. `[SOURCE: great-icon-research]`
2. Agent proposes metaphors before drawing. `[SOURCE: great-icon-research]`
3. User picks a metaphor and style direction. `[ASSUMPTION]`
4. Agent creates editable geometry using primitives and recipe constraints. `[SOURCE: great-icon-research]`
5. Agent reports warnings with before/after suggestions. `[SOURCE: core-audit]`
6. User approves the edit or asks for another variant. `[SOURCE: refined-v2-prd]`

## Screen Plan

### 1. Start

Purpose: choose the job before showing a dense toolbar. `[SOURCE: great-icon-research]`

Must include:

- Blank icon.
- Use template.
- Convert SVG/logo.
- Generate from prompt.
- Build bento set.
- Recent icons. `[SOURCE: great-icon-research]` `[ASSUMPTION]`

### 2. Core Creation Screen

Purpose: create one static icon well. `[SOURCE: core-audit]`

Must include:

- Left rail: Select, Points, Box, Round, Circle, Dot, Line, Arc, Corner, Arrow, Spark, Badge, Sketch. `[SOURCE: great-icon-research]`
- Layers area: object list with rename, show/hide, lock, reorder, group, duplicate, delete. `[SOURCE: refined-v2-prd]`
- Center: honest 24px canvas with grid, safe area, keylines, and real stroke rendering. `[SOURCE: core-audit]`
- Right: focused inspector and preview sizes. `[SOURCE: core-audit]`
- Agent composer: compact prompt box with suggested craft commands. `[SOURCE: great-icon-research]`

### 3. Review

Purpose: judge readiness and taste. `[SOURCE: great-icon-research]`

Must include:

- Real warnings only.
- Small-size preview.
- Context preview.
- Sibling comparison.
- Agent rationale.
- Human decision controls: approve, revise, save variant. `[SOURCE: great-icon-research]` `[SOURCE: refined-v2-prd]`

### 4. Set Builder

Purpose: create multiple related icons after the single-icon loop works. `[SOURCE: great-icon-research]`

Must include:

- Pack brief.
- Shared style recipe.
- Concept list.
- Missing concept suggestions.
- Visual weight comparison.
- Export staging. `[SOURCE: great-icon-research]` `[SOURCE: static-core-prd]`

### 5. Export

Purpose: ship clean files. `[SOURCE: static-core-prd]`

Must include:

- SVG.
- React.
- PNG sizes.
- Metadata.
- Search keywords.
- Style recipe.
- Set manifest where relevant. `[SOURCE: great-icon-research]` `[SOURCE: static-core-prd]`

## Implementation Plan

### Iteration Loop

Each build loop should ship one small, visible improvement to Icons Lab's actual creation flow, then verify it before moving to the next loop. `[SOURCE: core-audit]` `[ASSUMPTION]`

Loop order:

1. Pick one user-facing creation problem.
2. Change the smallest set of product surfaces needed to solve it.
3. Verify model behavior, build behavior, and browser-visible behavior.
4. Inspect the screen from human and agent perspectives.
5. Keep the improvement, revise it, or remove it before starting the next loop.

The first loop focuses on keeping the product name **Icons Lab** while changing the substance of the editor: open into the 24px creation workspace, prioritize icon-native primitives, hide advanced shape operations until needed, make preview warnings useful, and make agent prompts concrete. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]`

### Milestone 1: Reframe The Existing Editor Into Icons Lab Core Creation

Deliver:

- Rename and regroup tool surfaces around icon primitives. `[SOURCE: core-audit]` `[SOURCE: great-icon-research]`
- Keep canvas honest with matching preview/export strokes. `[SOURCE: core-audit]`
- Move advanced boolean/path operations behind an Advanced group or contextual menu. `[SOURCE: core-audit]`
- Keep preview pass-checks hidden in editor; warnings only. `[SOURCE: core-audit]`

Acceptance criteria:

- A new user can identify where to start without reading documentation. `[ASSUMPTION]`
- The canvas and preview show the same visual stroke weight. `[SOURCE: core-audit]`
- Editor preview shows previews first and warnings only. `[SOURCE: core-audit]`

### Milestone 2: Smart Primitive Kit

Deliver:

- Implement the icon-native primitives: box, rounded box, circle, dot, line, arc, corner, chevron, arrow, spark, badge/modifier, cutout, connector. `[SOURCE: great-icon-research]`
- Each primitive uses recipe defaults and meaningful names. `[SOURCE: great-icon-research]`
- Primitive placement respects safe area and snap grid by default. `[SOURCE: great-icon-research]`

Acceptance criteria:

- User can create a readable simple icon without the pen tool. `[SOURCE: great-icon-research]`
- Primitive geometry stays on whole pixels unless the user makes an optical correction. `[SOURCE: great-icon-research]`

### Milestone 3: Guided Points And Sketch Cleanup

Deliver:

- Points mode guidance for selection, conversion, and point dragging. `[SOURCE: core-audit]`
- Plain actions: corner, smooth, balance, snap, add point, remove point. `[SOURCE: great-icon-research]`
- Sketch cleanup pass that simplifies rough paths into fewer icon-grade points. `[SOURCE: great-icon-research]`

Acceptance criteria:

- Selecting a non-path shape in Points mode gives the next useful action. `[SOURCE: core-audit]`
- Sketch drawing never scrolls or moves the page. `[SOURCE: core-audit]`
- Cleaned sketch paths are editable and preview correctly at 16px. `[SOURCE: great-icon-research]`

### Milestone 4: Intent And Agent Craft Loop

Deliver:

- Intent brief form: concept, object/action/state, usage, audience, style mood. `[SOURCE: great-icon-research]`
- Agent craft commands: propose metaphors, simplify, improve 16px readability, open negative space, balance visual weight, normalize to recipe, prepare export. `[SOURCE: great-icon-research]`
- Reviewable before/after changes with undo. `[SOURCE: refined-v2-prd]`

Acceptance criteria:

- Agent suggestions map to actual document operations or explicit review notes. `[SOURCE: great-icon-research]`
- Human can accept, reject, or undo every agent change. `[SOURCE: refined-v2-prd]`

### Milestone 5: Review And Export

Deliver:

- Review screen with readability, metaphor, visual weight, negative space, safe area, grid fit, stroke, naming, and metadata checks. `[SOURCE: great-icon-research]`
- Export SVG, React, PNG, metadata, and recipe. `[SOURCE: static-core-prd]`
- Public-safe output with no private process fields. `[SOURCE: static-core-prd]`

Acceptance criteria:

- Exported SVG has a clean 24px viewBox and recipe-consistent styling. `[SOURCE: static-core-prd]`
- Review warnings are actionable and tied to visible icon issues. `[SOURCE: great-icon-research]`

### Milestone 6: Set Builder

Deliver:

- Shared pack brief and recipe. `[SOURCE: static-core-prd]`
- Side-by-side sibling previews. `[SOURCE: great-icon-research]`
- Visual-weight and metaphor consistency comparison. `[SOURCE: great-icon-research]`
- Missing concept suggestions for bento or product sets. `[SOURCE: great-icon-research]` `[ASSUMPTION]`

Acceptance criteria:

- User can compare a candidate against sibling icons before approval. `[SOURCE: great-icon-research]`
- Pack export includes manifest, metadata, SVG assets, and search keywords. `[SOURCE: static-core-prd]`

## Success Metrics

- A first-time internal user can create and export a simple readable static icon without using advanced vector controls. `[ASSUMPTION]`
- Every exported icon passes viewBox, stroke, safe-area, and public-metadata checks. `[SOURCE: static-core-prd]`
- The editor preview catches small-size readability problems before export. `[SOURCE: great-icon-research]`
- Agent edits are always reviewable and undoable. `[SOURCE: refined-v2-prd]`
- A pack review can identify icons that feel too heavy, too light, too crowded, or metaphorically inconsistent. `[SOURCE: great-icon-research]`

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R1 | The app becomes a generic vector editor again. `[SOURCE: core-audit]` | Keep the next slice limited to Icons Lab core creation and icon-native primitives. `[SOURCE: core-audit]` |
| R2 | Canvas, preview, and export disagree visually. `[SOURCE: core-audit]` | Use shared recipe rendering and verify canvas/preview/export stroke behavior. `[SOURCE: core-audit]` |
| R3 | Points mode feels broken to non-designers. `[SOURCE: core-audit]` | Show convert-to-points and plain-language point actions. `[SOURCE: core-audit]` |
| R4 | Sketch creates messy, non-icon-grade paths. `[SOURCE: great-icon-research]` | Add cleanup, simplify, and snap passes before treating sketch as production geometry. `[SOURCE: great-icon-research]` |
| R5 | Inspector complexity hides the core task. `[SOURCE: core-audit]` | Make inspector contextual and collapse advanced actions. `[SOURCE: core-audit]` |
| R6 | Agent-generated icons look attractive but fail as a consistent set. `[SOURCE: great-icon-research]` | Require recipe, preview, visual-weight comparison, and human approval. `[SOURCE: great-icon-research]` |
| R7 | Public exports leak private process metadata. `[SOURCE: static-core-prd]` | Keep export schema public-safe and product-focused. `[SOURCE: static-core-prd]` |

## Open Questions

1. Should the default Supericons outline recipe always be 24px/2px, or should the app offer recipe presets for 16px and 32px from the first release? `[SOURCE: great-icon-research]` `[ASSUMPTION]`

2. Which visual signature should become the permanent Supericons taste marker: rounded exterior with squared interiors, distinctive dot/cutout, warm geometry, or another pattern? `[SOURCE: great-icon-research]` `[ASSUMPTION]`

3. Should agent generation begin as local deterministic commands only, or should a remote model-backed agent enter the Milestone 4 slice? `[SOURCE: refined-v2-prd]` `[ASSUMPTION]`

4. How much optical off-grid correction should be allowed before review marks it as risky? `[SOURCE: great-icon-research]` `[ASSUMPTION]`

5. Should Set Builder ship before stateful icons, or should stateful variants begin once single-icon export is stable? `[SOURCE: static-core-prd]` `[ASSUMPTION]`
