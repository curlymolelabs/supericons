# Premium Customize Controls UX Refinement Plan

Date: 2026-04-09

## Scope

Refine the premium customize panel so the controls match the behavior that now works:

- preview controls should reflect one-shot preview playback truthfully
- `Reset all` should reset the entire selected-icon customize state, not just animation controls
- color controls should adopt the compact Motion Lab mental model for `Default` versus custom palette selection

This plan is intentionally limited to premium customize-panel UX and state semantics. It must not weaken purchase gating, auth-based asset access, export parity, or the already-fixed standalone SVG animation contract.

## Audit Findings

### Finding 1: The preview action row mixes local preview controls with panel-wide state reset

Evidence:

- the preview action row currently renders `Play`, `Stop`, and `Reset all` together in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2227)
- `buildPremiumPreviewSvg()` always renders preview playback with `'once'` mode in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1978)
- `startPremiumPreview()` always enters a one-shot replay state and auto-stops after the animation duration in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2062)

Impact:

- `Stop` is not paired with a true looping preview model, so a dedicated sibling button feels heavier than the behavior warrants
- `Reset all` is visually grouped as if it belongs only to preview playback, even though users read it as a panel-wide action

Recommendation:

- replace separate `Play` and `Stop` with a single toggle button so we preserve interrupt capability without spending two slots on one-shot preview playback

### Finding 2: `Reset all` is under-scoped relative to its label

Evidence:

- `resetPremiumPanelControls()` preserves the current `pngSize` instead of restoring the default in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2111)
- the reset toast currently says `Animation settings reset`, which understates the intended scope
- browser confirmation: after changing PNG size to `64px`, clicking `Reset all` left the active size at `64px`

Impact:

- the button label promises a panel-wide reset, but the state reset is incomplete
- users can reasonably assume something is broken when a control stays changed after `Reset all`

Recommendation:

- make reset explicitly panel-wide for the currently selected premium icon:
  - playback preview state
  - export trigger
  - speed
  - color mode
  - custom color value
  - stroke width
  - PNG size
- keep the selected icon and ownership state unchanged

### Finding 3: The premium color UI is more verbose than the Motion Lab pattern it is trying to express

Evidence:

- the premium panel currently uses:
  - `Original` / `Custom` segmented pills in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2280)
  - explanatory helper copy directly below those pills in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2283)
  - a summary row in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2285)
- Motion Lab already solves the same concept more compactly with:
  - a default/original dot
  - palette dots
  - a custom color add affordance
  in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L5154) and [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L7814)

Impact:

- the premium panel spends too much vertical space on explaining a state that can be shown directly in the palette row
- the current layout duplicates meaning across pills, note text, summary text, picker, and swatches

Recommendation:

- replace the segmented mode row with a single compact palette row modeled after Motion Lab:
  - first chip = `Default` / original-state icon
  - following chips = preset colors
  - final affordance = custom color picker

## Proposed Fix

### Phase 1: Collapse preview playback into a single toggle control

- replace `Play` and `Stop` with one preview toggle button
- behavior:
  - when stopped: button shows `Play`
  - when preview is running: button shows `Stop`
- keep preview behavior one-shot unless product later decides to add a real preview loop mode

Why this direction:

- it reduces clutter while keeping the ability to interrupt an active preview
- it better matches the current playback model than two separate buttons

### Phase 2: Move `Reset all` into a true panel-level action

- remove `Reset all` from the preview-only action cluster
- place it where its scope reads as panel-wide, for example:
  - in a compact panel utility row near the top, or
  - aligned with the export/customize sections rather than preview replay
- expand reset behavior to restore all selected-icon customize controls to default values
- update toast copy to something like `Customize settings reset`

### Phase 3: Replace color-mode pills with a compact Motion Lab-style palette row

- remove:
  - `Original` / `Custom` pills
  - the explanatory text under those pills
- add:
  - an original-state dot using the Motion Lab `default/original` visual language
  - preset swatches
  - a custom-color add/picker affordance

State model:

- clicking the original dot sets `colorMode = original`
- clicking any palette swatch sets `colorMode = custom` and applies that color
- using the custom color picker also sets `colorMode = custom`

### Phase 4: Keep exact-color support without making the panel taller by default

- preserve hex validation support if we still want exact value entry
- but demote it so it does not consume permanent space unless needed

Recommended implementation:

- either hide the hex field behind the custom-color affordance
- or show it only while a custom color is active

### Phase 5: Preserve preview/export and protection parity

- keep shared preview/export color logic on the same code path
- do not change:
  - locked premium panel behavior
  - entitlement checks
  - auth-based premium asset fetch
  - free-icon customize panel
  - standalone SVG root scoping fix

## File Inventory

- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

## Implementation Checklist

- replace preview `Play` + `Stop` with one toggle control
- update preview status wiring to support the toggle label/icon cleanly
- move `Reset all` out of preview-only grouping
- make reset restore PNG size and all selected-icon customize settings
- update reset toast copy to panel-wide language
- replace premium color-mode pills with a Motion-Lab-style original-dot + swatch row
- remove the redundant color-mode helper copy
- keep color-mode state behavior intact under the new compact UI
- preserve optional exact hex color entry in a less space-hungry form
- verify preview and export remain aligned

## Verification Matrix

### Preview controls

- owned premium icon autoplay still runs on selection
- toggle button starts preview when stopped
- toggle button stops preview mid-run when active
- no separate `Stop` button remains

### Reset behavior

- after changing:
  - trigger
  - speed
  - color
  - stroke width
  - PNG size
  clicking `Reset all` restores defaults for the selected icon
- selected premium icon remains selected
- reset toast copy reflects panel-wide scope

### Color controls

- original/default dot restores authored palette
- choosing a preset swatch switches to custom mode
- custom picker still works
- no segmented color-mode pills remain
- no redundant helper copy remains under the removed pills

### Regression and protection checks

- root-animated premium icons still animate the SVG, not the whole page
- locked premium flow still opens the lock panel
- free icon panel still works
- animated export and static export still reflect the active color state

## Acceptance Criteria

- [ ] premium preview uses one toggle control instead of separate `Play` and `Stop`
- [ ] `Reset all` is visually panel-scoped and actually resets all customize controls for the selected icon
- [ ] PNG size resets with the rest of the panel
- [ ] premium color UI uses a compact default-dot plus custom palette pattern
- [ ] the redundant color-mode pills and helper copy are removed
- [ ] purchase protections and preview/export parity remain intact

## Status

Plan written only. No code changes in this step.

