# Premium Customize Panel Stabilization Plan

## Problem

- User segment:
  - premium collection owners previewing curated animated icons in the customize pane
- Job to be done:
  - open an owned premium collection, click an icon, see it render immediately in the customize pane, confirm motion, and export confidently
- Current failure:
  - the selected premium icon can highlight in the grid while nothing usable appears in the customize pane
- Important scope note:
  - this is reproducible locally and is not blocked on deployment

## Confirmed Root Causes

### Root Cause 1: The premium panel body helper has a DOM contract bug

- `getPremiumPanelBody()` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1626) looks up `.panel__placeholder` anywhere inside `#panel`
- premium empty and loading states also render nested inline placeholders inside the panel body
- on a later icon click, the helper can grab that nested child placeholder and try to replace it with its own ancestor
- result:
  - runtime `HierarchyRequestError`
  - premium selection starts, but panel rendering aborts before the icon preview can load

### Root Cause 2: Store rerender behavior is stale in premium views

- `fetchProducts()` updates counts but does not rerender the packs surface when products arrive
- `ensureUserPurchasesLoaded()` rerenders `packs`, `downloads`, and `dashboard`, but not `collection-detail`
- `renderCollectionDetail()` computes `isPurchased` once when the detail view is built
- result:
  - premium surfaces can stay in a stale empty or locked state even after products or purchases finish loading

### Root Cause 3: The standalone premium SVG/CSS contract is still fragile downstream

- after the DOM crash is bypassed, preview and export still depend on the shared standalone builder path:
  - `extractIconCSS()`
  - `buildAnimatedSvg()`
  - `buildPremiumPreviewSvg()`
- split-class premium icons still need verification because some rules are keyed by a manifest animation class while others are keyed by SVG root classes
- result:
  - even after the click path is stabilized, preview/export correctness still needs a second pass to avoid hidden rendering defects

## Product Alignment Notes

- Do not reintroduce the removed `Authored animation` badge.
- Do not restore the redundant helper sentence that was intentionally removed.
- Keep the premium panel separate from the free-icon panel behavior.
- Do not widen scope into Motion Lab controls.

## Safety Constraints

- Do not break the free-icon customize panel in [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js).
- Do not break store routing or existing sidebar/view switching in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js).
- Do not break auth-driven purchase gating in [auth.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/auth.js).
- Keep preview and animated export on the same builder path so fixes do not diverge.
- Avoid renaming shared shell classes used by the base panel unless the change is fully scoped to premium inline content.

## Dependency Map

### Upstream gating dependencies

- auth bootstrap:
  - `initAuth()` -> `waitForAuth()` -> `getUser()`
- purchase state:
  - `ensureUserPurchasesLoaded()` -> `fetchUserPurchases()`
- product state:
  - `fetchProducts()`
- view shell:
  - `switchView('packs')`
  - `renderPackCatalog()`
  - `renderCollectionDetail(product)`

### Premium selection path

- owned collection detail cell click
- `selectPremiumIcon(iconName, collectionSlug)`
- `openPremiumPanelIfNeeded(window.__supericons)`
- `renderPremiumPanelLoading(...)`
- `getPremiumPanelBody()`
- asset + manifest + CSS loading
- `renderPremiumPanel(selection)`
- `renderPremiumPreview()`
- `buildPremiumPreviewSvg()`
- `buildAnimatedSvg(...)`

### Shared output path

- preview output and animated export both depend on the same standalone SVG builder
- any contract fix must be verified in both preview and export

## Implementation Strategy

### Phase 0: Establish a safe baseline

- confirm the current failing path in local dev before edits
- preserve the free-icon panel contract as the comparison baseline
- add a temporary verification checklist before touching rendering code:
  - free icon selection still renders normally
  - packs view still opens
  - owned collection detail still loads
  - locked collection behavior still shows the unlock panel

### Phase 1: Fix the panel DOM contract first

- update `getPremiumPanelBody()` so it only targets the panel shell's direct body/placeholder node, not nested descendants
- remove the assumption that any `.panel__placeholder` inside `#panel` is promotable to `.panel__body`
- replace nested premium helper placeholders with a premium-specific inline class that is never mistaken for the panel shell placeholder
- ensure repeated transitions are safe across:
  - default premium empty state
  - loading state
  - loaded state
  - error state
  - locked panel recovery

Files expected:

- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

Guardrails:

- do not rename the root shell placeholder in [index.html](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html)
- keep free-icon panel reset logic in [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) working unchanged

### Phase 2: Fix stale rerender behavior in premium store views

- rerender packs when `fetchProducts()` completes and packs is the active view
- extend rerender logic so `collection-detail` refreshes when purchases finish loading for the active product
- preserve the current product/detail context when rerendering
- avoid unnecessary full-view churn if the active view is unrelated

Implementation direction:

- keep rerender logic centralized instead of scattering ad hoc calls
- add explicit handling for `collection-detail` to `rerenderCollectionSurfaceForCurrentView()`
- when rerendering detail, use `activeCollectionProductId` or `activeCollectionProductSlug` to rebuild the same collection detail screen safely

Files expected:

- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Guardrails:

- do not create rerender loops between `renderCollectionDetail()` and purchase loading
- do not clear current premium selection unless the active collection actually changes
- do not regress downloads or dashboard rerenders

### Phase 3: Revalidate the premium click-to-preview path

- after Phases 1 and 2, verify the actual premium path end to end:
  - owned pack card opens detail
  - owned icon click enters `selectPremiumIcon()`
  - panel opens if needed
  - loading state is replaced by loaded state
  - selected icon becomes visible in the preview
- ensure failure states are still user-friendly if asset/CSS loading genuinely fails

Files expected:

- primarily verification, with small follow-up edits in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) only if needed

### Phase 4: Tighten the standalone SVG/CSS contract

- once the panel path is stable, re-audit the downstream preview/export builder with real premium icons
- preserve or remap both:
  - the manifest animation class
  - relevant SVG root classes
- ensure CSS extraction includes:
  - animation-class rules
  - root-class rules
  - `.si-anim svg` global rules
  - dependent keyframes
- ensure selector rewriting matches the emitted standalone structure instead of assuming `:root` is sufficient for every case

Priority regression cases:

- `Data & Charts > counter`
- `Data & Charts > scatter-plot`
- `Data & Charts > donut-chart`
- `Data & Charts > treemap`

Files expected:

- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Guardrails:

- preview and animated export must continue sharing the same builder path
- do not patch only `counter`; the fix must support split-class icons generically

### Phase 5: Preserve existing UX and accessibility guarantees

- keep keyboard activation and focus-visible states for collection-detail tiles intact
- verify panel open/close behavior across desktop and mobile shell rules
- keep reduced-motion behavior unchanged:
  - no autoplay when reduced motion is enabled
  - manual play remains available

Files expected:

- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) only if shell coordination truly requires it

## Detailed Handoff Checklist

- Refactor `getPremiumPanelBody()` to use direct-child panel shell lookup only
- Introduce a premium-inline helper class instead of nested `.panel__placeholder`
- Ensure premium empty, loading, and error states are idempotent across repeated selections
- Extend collection-surface rerendering to support `collection-detail`
- Rerender packs when product data arrives while packs is active
- Verify owned-state detail rendering after purchases finish loading
- Re-run the premium preview flow after the DOM/rerender fixes
- Then audit and patch standalone SVG/CSS extraction only as needed
- Keep preview/export parity throughout

## Verification Matrix

### Core regression checks

- `Free icon panel`
  - selecting a free icon still updates preview and controls correctly
- `Packs catalog`
  - packs view rerenders when products load
- `Owned collection detail`
  - purchased collection shows owned controls after purchases load
- `Locked collection detail`
  - unowned icon cells still open the unlock panel

### Premium panel checks

- `Repeated click path`
  - empty -> click icon -> loading -> loaded
  - loaded -> click another icon -> loading -> loaded
  - loaded -> asset failure -> error
  - error -> click another valid icon -> loaded
- `No DOM exception`
  - no `HierarchyRequestError` or other panel-body mutation errors in console
- `Panel shell stability`
  - panel close/reopen still works
  - mobile panel behavior does not regress

### Standalone preview/export checks

- `counter`
  - icon is visible in preview
  - autoplay/manual play visibly works
- `scatter-plot`
  - root-class fill rules are preserved
- `donut-chart`
  - split root/anim classes still render correctly
- `treemap`
  - resting-state blocks remain visible
- `Download Animated SVG`
  - exported file matches preview behavior in a browser

## Acceptance Checks

- [ ] Premium icon click no longer stalls on the empty-state panel
- [ ] No `HierarchyRequestError` occurs in the premium customize flow
- [ ] Packs rerender when product data arrives
- [ ] Collection detail rerenders correctly when purchases arrive
- [ ] Owned premium icon clicks render usable content in the customize pane locally
- [ ] Free-icon customize flows still work unchanged
- [ ] Locked premium flows still show the unlock panel unchanged
- [ ] Preview and animated export remain on the same rendering contract
- [ ] Split-class premium icons still render correctly after the stabilization work

## Residual Risks

- Risk 1:
  - rerender fixes could accidentally reset active premium panel state if not scoped to the active collection
- Risk 2:
  - panel DOM fixes could interfere with the generic free-icon panel if selectors are broadened instead of narrowed
- Risk 3:
  - after the DOM crash is fixed, the standalone SVG/CSS contract may still reveal secondary rendering defects

## Recommended Execution Order

1. Fix the panel DOM contract bug.
2. Fix stale packs and collection-detail rerender behavior.
3. Reproduce the owned premium click path again.
4. Only then patch any remaining standalone SVG/CSS contract gaps.
5. Run regression checks across free icons, locked premium flow, owned premium flow, and animated export.
