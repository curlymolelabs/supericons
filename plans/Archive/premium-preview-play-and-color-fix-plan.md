# Premium Preview Play And Color Fix Plan

## Problem

- User segment:
  - premium collection owners using the customize panel for curated animated icons
- Jobs to be done:
  - click `Play` and see the premium preview animate again
  - understand whether the icon is using its original authored color or a custom override
  - switch between original and custom color behavior without guessing
- Current failures:
  - the `Play` button updates status text but does not visibly restart motion for some premium icons
  - the color controls are modeled as a custom single-color picker even when the icon's actual rendered default color is an authored bundle color
  - some collections honor the custom color picker while others ignore it entirely

## Confirmed Audit Findings

### Finding 0: The shared standalone preview/export CSS contract is leaking motion to the whole document

- Evidence:
  - clicking some premium icons caused the whole page to shake or animate in the same motion language as the selected icon
  - the same full-page reaction could also happen when clicking preview `Play` and `Stop`
  - inspection of emitted premium preview SVG for `Security & Auth > firewall-wall` showed inline CSS like `:root { animation: qascmc ... }`
- Root cause:
  - `buildAnimatedSvg()` rewrites icon root selectors to `:root` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1477)
  - when that standalone SVG is mounted inline in the customize panel, `:root` targets the HTML document root instead of the SVG root
- Impact:
  - the preview can animate the entire page instead of the icon
  - replay behavior becomes untrustworthy because the same broken selector contract also undercuts icon-local animation replay

### Finding 1: `Play` is wired, but preview animation is missing for root-targeted icons

- Evidence:
  - `startPremiumPreview()` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1934) sets preview state to `playing` and rerenders the preview
  - the `Play` button is correctly wired in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2270)
  - browser inspection of `Security & Auth > firewall-wall` showed:
    - status changes to `Playing once`
    - emitted preview CSS contains `:root { animation: qascmc ... }`
    - computed preview SVG animation stays `animation-name: none`
- Root cause:
  - `buildAnimatedSvg()` rewrites root-targeted selectors to `:root` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1477)
  - inside the inline customize panel, that selector can miss the preview SVG root and instead bleed onto the document root
- Impact:
  - icons whose motion is attached to the SVG root itself can look fully static even though the play button and status model are active

### Finding 2: The current color UI does not represent the actual icon color contract

- Evidence:
  - premium color defaults are hardcoded to `#ffffff` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1549)
  - for `Data & Charts > counter`, the preview control shows `#ffffff` while the rendered SVG fill is still `#3B82F6`
  - selecting a red swatch updates the picker and hex field, but the `counter` fill remains `#3B82F6`
  - for `Security & Auth > firewall-wall`, the same color controls do recolor the icon because that collection uses `currentColor`
- Root cause:
  - `buildAnimatedSvg()` and `buildStaticPremiumSvg()` only replace `currentColor` tokens
  - collections like `data-charts` use authored hex fills and CSS colors, so the current custom-color pipeline does not reach them
- Impact:
  - the color UI is misleading
  - some premium icons are effectively "custom color enabled"
  - others are "original color only" while still showing a custom picker

### Finding 3: The product needs an explicit original-vs-custom color model

- Evidence:
  - current premium panel only exposes one custom color picker path
  - there is no UI state that means "use the original authored color palette"
  - this is especially confusing for collections with authored brand hues or tonal systems
- Impact:
  - users cannot tell whether they are preserving the icon's intended palette or overriding it
  - exported output can diverge from what the controls imply

## Protection Measures That Must Not Break

- Purchase gating and locked premium behavior in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2417)
- Auth-based premium asset access in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L116)
- Existing free-icon customize panel behavior in [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)
- Shared animated export path through [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1477)
- Existing anti-download and preview restrictions in collection detail
- The customize panel must not gain any new route to premium assets without the existing entitlement checks
- The fix must not scope preview CSS by injecting global page styles or document-level classes as part of normal preview playback

## Fix Strategy

### Phase 1: Fix preview replay at the SVG root level

- replace the preview/export root selector strategy so replayable root animations do not depend on `:root`
- emit a stable standalone SVG root class for premium output, for example a dedicated premium standalone marker
- rewrite root-targeted rules to target the actual emitted SVG root instead of `:root`
- ensure the same contract removes the accidental whole-page motion bleed in inline preview

Target cases:

- `.mnv3on svg { animation: ... }`
- `.slirm7 svg { animation: ... }`
- any collection rule where the animation belongs on the SVG root instead of descendants

Implementation direction:

- update `buildAnimatedSvg()` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1477)
- preserve existing descendant selector support for icons like `counter`
- avoid preview-only hacks; the same emitted selector contract should work inline and in downloaded animated SVGs

Success condition:

- `Security & Auth > firewall-wall` visibly animates on selection and when `Play` is clicked
- clicking the premium icon or preview `Play` no longer animates the entire page

### Phase 2: Introduce an explicit premium color mode model

- add a color mode state to the premium panel:
  - `original`
  - `custom`
- default to `original`
- make the UI communicate that mode clearly before any custom picker interaction

Implementation direction:

- extend premium panel state in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1561)
- keep current picker/hex/swatches under `custom`
- show an explicit original-color option in the color section

Success condition:

- users can tell whether they are previewing the icon with its authored palette or an override

### Phase 3: Add color source analysis per premium icon

- detect whether the selected premium icon uses:
  - `currentColor`
  - authored literal fill/stroke colors
  - a mix of both
- store a minimal color contract per selected icon

Implementation direction:

- analyze the source SVG and extracted CSS when `selectPremiumIcon()` runs in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1997)
- capture:
  - whether currentColor is present
  - the primary authored palette tokens that should be overridable in custom mode
  - neutral colors that should usually be preserved, such as `none`, transparent, and intentional white separators/highlights

Guardrail:

- do not flatten every color token blindly
- preserve neutral accents and opacity structure where needed

### Phase 4: Make custom color work across authored-color collections

- in `custom` mode, recolor both:
  - `currentColor`-based icons
  - authored palette icons whose primary color is literal in SVG/CSS
- preserve the structural look of the icon where possible

Implementation direction:

- extend `buildAnimatedSvg()` and `buildStaticPremiumSvg()` so custom mode can replace the icon's primary authored color tokens, not just `currentColor`
- apply the same color contract in preview and export
- do not override neutral highlights unless the icon contract explicitly marks them as part of the primary palette

Success condition:

- `Data & Charts > counter` shows original blue in `original` mode
- switching to a custom red actually changes the blue bars while keeping the icon readable

### Phase 5: Update the premium color UI

- add a small mode row or segmented control in the color section:
  - `Original`
  - `Custom`
- when `Original` is active:
  - show the original authored color swatch or label
  - keep picker and hex hidden or visually secondary
- when `Custom` is active:
  - show picker
  - show hex field
  - show swatches

UI expectation:

- the color section should no longer imply that every premium icon starts as white
- the original color option should be one click away

### Phase 6: Verify export and protection parity

- confirm that the preview fix does not bypass:
  - locked premium flow
  - purchase gating
  - asset access rules
- confirm that the color mode and replay fixes apply equally to:
  - preview autoplay
  - `Play`
  - `Download Animated SVG`
  - `Copy Animated SVG`
  - `Copy SVG (static)`
  - `Download PNG`

## File Inventory

- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- optionally [main.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js) only if panel shell coordination truly requires it

## Detailed Handoff Checklist

- replace `:root`-dependent preview replay contract with a stable emitted SVG root selector
- remove accidental document-root motion bleed from inline premium preview
- verify root-animated premium icons replay on `Play`
- add premium color mode state: `original` vs `custom`
- detect per-icon source color strategy when a premium icon is selected
- preserve original authored palette as the default visual state
- make custom override work for authored literal colors as well as currentColor icons
- keep neutral accents safe during recoloring
- update the color UI so `Original` and `Custom` are explicit
- verify preview/export parity
- verify locked premium flow and free-icon panel remain unchanged

## Verification Matrix

### Replay checks

- `Security & Auth > firewall-wall`
  - autoplay visibly animates
  - `Play` visibly animates again after stopping
  - page shell does not shake or inherit the icon animation
- `Security & Auth > shield-check`
  - another root-animated icon still works
- `Data & Charts > counter`
  - descendant-driven animation still works after root-selector changes

### Color checks

- `Data & Charts > counter`
  - `Original` mode shows authored blue
  - `Custom` mode recolors the primary blue shapes
- `Security & Auth > firewall-wall`
  - `Original` mode shows authored default
  - `Custom` mode still recolors as before
- control fidelity:
  - color UI matches what is actually rendered

### Protection checks

- unowned premium icon still opens the locked panel
- purchase-gated flows still require ownership
- free-icon customize panel still works
- no auth or asset-access path is weakened
- no document-level motion classes or page-global preview styles are introduced as part of normal premium preview

### Export checks

- animated export matches preview replay behavior
- original/custom color modes are reflected in exported SVG and PNG

## Acceptance Checks

- [ ] `Play` visibly replays premium preview motion for root-animated icons
- [ ] premium preview no longer animates the entire document root
- [ ] preview status text matches actual motion behavior
- [ ] premium color UI clearly distinguishes `Original` and `Custom`
- [ ] original authored palette is the default state for premium icons
- [ ] custom color overrides work for both currentColor and authored-color collections
- [ ] locked premium protections still hold
- [ ] free-icon customize behavior remains unchanged
- [ ] preview and export stay in sync

## Residual Risks

- Risk 1:
  - recoloring authored-color icons may over-apply to neutral highlight accents if palette detection is too broad
- Risk 2:
  - selector rewriting for root animations could fix preview while unintentionally changing export behavior if the emitted root contract is not shared
- Risk 3:
  - different premium collections may use different authored palette conventions, so validation must cover more than one collection

## Recommended Execution Order

1. Fix the root-selector replay contract for preview/export.
2. Reconfirm `Play` with `firewall-wall`.
3. Add original-vs-custom color mode.
4. Extend recoloring to authored-color collections.
5. Run protection and export regressions.
