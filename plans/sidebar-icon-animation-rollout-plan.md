# Sidebar Icon Animation Rollout Plan

## Goal

Apply the bespoke sidebar icon set and hover animations from the V4 demo to the actual app sidebar without breaking existing navigation, counts, active states, responsiveness, or build/dependency behavior.

The rollout should preserve current sidebar functionality while upgrading the visual language of:

- Browse: All Icons, Favorites, Recent
- Libraries: MingCute, Simple Icons, Lucide, Tabler, Phosphor, Heroicons, Bootstrap, Iconoir, Ionicons, Material Symbols
- Premium Collections: Collections
- Tools: Motion Lab, Converter
- Utility link: Pricing

Out of scope for this pass:

- Reworking sidebar IA or item order
- Adding new libraries or sidebar entries
- Changing the hidden `My Collection` product behavior
- Changing grid, panel, or store logic outside the sidebar surface

## Why This Needs A Careful Rollout

The sidebar is not rendered from one place.

- Static items are authored directly in [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html).
- Dynamic library rows are generated in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js).
- Active state styling and hover behavior live in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css).
- Store views also rely on existing sidebar item ids and classes in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).

Because of that split, the safe path is not “paste demo HTML into the app.” The safe path is to centralize icon markup, keep existing selectors intact, and layer animation styles on top of the current sidebar contract.

## Current Architecture Inventory

### Static Sidebar Items

These are currently hard-coded in [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html):

- `all`
- `favorites`
- `recent`
- `animated-packs`
- `my-downloads`
- `sidebarMotionLab`
- `sidebarConverter`
- `sidebarPricing`

They currently use Material Symbols font glyphs through `.sidebar__item-icon`.

### Dynamic Library Items

The libraries section is rendered in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) via:

- `libraryMeta`
- `librarySidebarOrder`
- `renderLibraries()`

Today `libraryMeta` stores font-glyph names like `star`, `apps`, `hexagon`, and `grid_view`, which are injected as Material Symbols text. That is incompatible with the bespoke SVG animation work from the demo.

### Styling Contract

The current sidebar layout in [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css) assumes:

- `.sidebar__item` is the clickable row
- `.sidebar__item-icon` is a fixed-size visual slot
- `.sidebar__item-name` flexes
- `.sidebar__item-count` stays aligned right

This contract should remain intact. We should swap icon internals, not redesign row structure.

### Store / Navigation Dependencies

[store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) relies on existing sidebar ids and `.sidebar__item` classes for view switching and active state updates. Those ids and data attributes must not change.

## Rollout Principles

### 1. Keep Existing DOM Hooks Stable

Do not rename or remove:

- `.sidebar__item`
- `.sidebar__item-icon`
- `.sidebar__item-name`
- `.sidebar__item-count`
- existing ids like `sidebarMotionLab`, `sidebarConverter`, `sidebarPricing`
- existing `data-library` values

### 2. Replace Icon Internals, Not Sidebar Behavior

The new work should only change:

- icon markup inside the icon slot
- icon-specific hover animation CSS
- optional helper rendering code

It should not change:

- click handling
- active library switching
- counts
- store view activation
- mobile sidebar open/close logic

### 3. No New Runtime Dependencies

Use inline SVG and existing CSS only.

Do not add:

- icon libraries
- animation libraries
- JS animation runtimes
- build plugins

### 4. Respect Motion Accessibility

All new hover animations must degrade cleanly under `prefers-reduced-motion: reduce`.

## Recommended Implementation Strategy

## Phase 1: Introduce A Central Sidebar Icon Registry

Create one central source of truth for sidebar icon markup.

Recommended file:

- `sidebar-icons.js`

This module should export:

- a registry of SVG markup keyed by semantic sidebar item id
- optional class names per icon for animation targeting

Suggested keys:

- `all`
- `favorites`
- `recent`
- `mingcute`
- `simpleicons`
- `lucide`
- `tabler`
- `phosphor`
- `heroicons`
- `bootstrap`
- `iconoir`
- `ionicons`
- `material`
- `collections`
- `motionlab`
- `converter`
- `pricing`
- `my-downloads`

`my-downloads` should intentionally keep a simple fallback icon for now, since it was not part of the bespoke demo.

### Why This Approach

This avoids duplicating SVG markup across:

- static HTML in `index.html`
- dynamic row generation in `main.js`

It also gives us one place to revise future icon motion without re-auditing multiple render paths.

## Phase 2: Convert Static Sidebar Items To Placeholder Slots

Update [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html) so static sidebar items use semantic placeholders instead of hard-coded Material Symbols text.

Recommended pattern:

```html
<span class="sidebar__item-icon" data-sidebar-icon="all" aria-hidden="true"></span>
```

Repeat this for:

- All Icons
- Favorites
- Recent
- Collections
- My Collection
- Motion Lab
- Converter
- Pricing

Important:

- Keep the surrounding row markup unchanged.
- Keep ids and `data-library` attributes unchanged.
- Do not move or rename count elements.

## Phase 3: Update Dynamic Library Rendering To Use The Registry

Refactor `libraryMeta` in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) so it stores an icon key instead of a Material Symbols glyph string.

Recommended shape:

```js
material: { name: 'Material Symbols', iconKey: 'material', ... }
```

Then update `renderLibraries()` to inject SVG markup from the shared registry, not font glyph text.

Important:

- Keep `name`, count rendering, sort order, and `data-library` logic unchanged.
- Only the icon cell content should change.

## Phase 4: Add A Tiny DOM Hydration Helper For Static Rows

Add a helper in [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) to fill all `[data-sidebar-icon]` placeholders from the registry during app init.

Suggested helper:

- `hydrateSidebarIcons()`

Behavior:

- find all static placeholder nodes
- replace their contents with the corresponding SVG markup
- add a small namespaced class like `sidebar__item-icon--svg`

This keeps static rows and dynamic rows using the same markup source.

## Phase 5: Port The Animation CSS Into Production Styles

Move the proven icon animation styles from the demo into [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css), but namespace them specifically for the actual app sidebar.

Recommended namespace:

- `.sidebar__item-icon--svg`
- `.sidebar-icon--all`
- `.sidebar-icon--favorites`
- `.sidebar-icon--recent`
- `.sidebar-icon--mingcute`
- `.sidebar-icon--motionlab`

Do not paste the demo CSS wholesale. Port only the rules needed for the production sidebar.

### Production CSS Goals

- preserve the existing 18px icon slot
- keep icon baseline and count alignment stable
- animate on row hover and active states only where appropriate
- avoid layout shift
- avoid clipping artifacts
- keep reduced-motion fallback

### Animation Mapping

Roll over the bespoke motions from V4:

- All Icons: blinking tile matrix
- Favorites: heart pulse without clipping
- Recent: clock tick
- MingCute: rapid vertical flip
- Simple Icons: supplied slide-right
- Lucide: split-form motion from V3
- Tabler: border/prompt/cursor motion from V3
- Phosphor: supplied wobble
- Heroicons: shield pulse
- Bootstrap: tightened `B` icon with existing subtle motion
- Iconoir: line/circle motion from V3
- Ionicons: orbit/dot motion from V3
- Material Symbols: geometric trio motion from V3
- Collections: stacked layers fan
- Motion Lab: linked-ring spring boing
- Converter: opposing arrow pass
- Pricing: tag swing

### Active Item Behavior

We should keep the current active-row color treatment and not auto-run all animations continuously. Preferred production behavior:

- static at rest
- animate on hover
- active rows keep color state only

Exception:

- if design review wants the active row to animate too, that should be a separate opt-in decision after the first rollout is stable

## Phase 6: Keep Fallback Compatibility During Migration

During implementation, keep a safe fallback path:

- if a registry key is missing, render the existing Material Symbols fallback
- if SVG injection fails, the row should still remain clickable and readable

This protects the app from partial rollout mistakes and helps us land the work in small batches.

## Recommended File Changes

### New File

- [sidebar-icons.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/sidebar-icons.js)

### Existing Files

- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

### Demo File For Reference Only

- [sidebar-icons_v4.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/demo/bespoke/sidebar-icons_v4.html)

The demo file should not be imported directly into production. It is the design reference, not the app implementation.

## Safe Delivery Sequence

### Batch 1: Infrastructure Only

- add the shared registry module
- add placeholder hydration for static items
- keep current visuals identical or near-identical

Goal:

- prove the new markup path works without changing app behavior

### Batch 2: Dynamic Libraries

- switch `renderLibraries()` from font glyphs to registry-based SVGs
- keep motion disabled or minimal at first

Goal:

- prove counts, ordering, and click behavior remain stable

### Batch 3: Production Animation Layer

- add the scoped hover animation CSS
- port the refined icon motion set
- tune per-icon sizing and stroke weight in the actual app layout

Goal:

- land the visual upgrade after the rendering path is already stable

### Batch 4: Polish / Fallback Review

- verify hidden `My Collection` still renders properly when visible
- review mobile sidebar layout
- trim any icon that feels too busy at 18px

Goal:

- ensure the bespoke motions still read well at production scale

## Risks And Mitigations

### Risk 1: Breaking Store Sidebar Navigation

Cause:

- changing ids, classes, or `data-library` values

Mitigation:

- keep existing row wrappers and hooks unchanged
- only replace icon markup inside `.sidebar__item-icon`

### Risk 2: Layout Shift Or Count Misalignment

Cause:

- SVGs not respecting the icon slot dimensions

Mitigation:

- keep a fixed icon slot width/height
- normalize SVG `viewBox`, stroke width, and alignment
- avoid changing row padding or count widths during the first pass

### Risk 3: Hover Clipping Or Overflow Artifacts

Cause:

- animated SVG bounds exceeding the icon slot or row clip

Mitigation:

- tune per-icon `overflow`, `transform-box`, and `transform-origin`
- keep animation amplitude modest at production scale
- test the Favorites heart and Motion Lab rings specifically

### Risk 4: Performance / Motion Noise

Cause:

- too many simultaneous animations or continuous playback

Mitigation:

- hover-only animation by default
- reduced-motion fallback
- no JS-driven animation loops

### Risk 5: Dynamic Libraries Drift From Static Rows

Cause:

- separate markup sources for static and generated items

Mitigation:

- one shared registry module
- no duplicated inline SVG definitions across files

## Verification Plan

## Automated Checks

Run at minimum:

- `node --check main.js`
- `npm run build`

If available in the repo flow:

- `python scripts/run_frontend_checks.py --project . --execute`

## Manual Browser Checks

Verify on desktop:

- sidebar renders with correct counts
- All Icons, Favorites, Recent still switch correctly
- library rows still filter correctly
- Collections opens the collections view
- Motion Lab opens Motion Lab
- Converter opens Converter
- Pricing opens pricing
- active row highlighting still works
- hover animations run without clipping
- collapsed libraries section still works

Verify on mobile / narrow layout:

- sidebar still opens and closes
- row hit targets remain intact
- icons do not crowd labels or counts

Verify store-driven states:

- switching to Pricing, Motion Lab, Converter, and Collections still updates the active sidebar row correctly

## Visual QA Focus Items

Pay extra attention to:

- Favorites pulse clipping
- Motion Lab linked-ring readability at 18px
- MingCute legibility during fast flip
- Bootstrap `B` thickness at small size
- All Icons tile brightness against active-row orange

## Recommendation

Proceed with the rollout, but do it in the staged sequence above rather than one large replace-all patch.

That gives us the best safety profile:

- no dependency changes
- no sidebar behavior rewrite
- one shared icon source of truth
- animation added only after the rendering path is stable

If we execute this plan, the first implementation batch should be the registry + static placeholder hydration only.
