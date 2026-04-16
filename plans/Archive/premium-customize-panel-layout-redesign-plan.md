# Premium Customize Panel Layout Redesign Plan

Date: 2026-04-09

## Scope

Redesign the premium customize panel so its control flow matches the actual user job:

1. preview the icon
2. adjust appearance
3. choose export behavior
4. export in the desired format

This plan is limited to premium customize-panel UI and interaction layout. It must not break:

- premium purchase gating
- auth-based premium asset access
- the standalone SVG preview/export animation contract
- locked premium flow
- free-icon customize flow
- export output parity

## Problem Statement

The panel currently works, but the layout still reflects implementation order rather than task order:

- `Reset all` is visually over-promoted and separated from the export behavior it affects
- preview controls, export trigger controls, and export actions are split across sections in a way that forces users to scan up and down the rail
- export-trigger controls look heavier than they need to
- SVG and PNG actions are mixed together instead of grouped by purpose
- the narrow right rail is spending too much space on structure and not enough on action clarity

The redesign goal is to make the panel feel compact, predictable, and closer to Motion Lab, while preserving the current premium protections and working preview/export behavior.

## Constraints And Assumptions

- the right rail is narrow, so dense controls need compact but still touch-safe hit areas
- `stroke width` remains conditional and only appears for icons that support it
- preview playback remains separate from export trigger behavior
- premium preview and premium export must stay on the same underlying state model
- explanatory copy should be reduced where labels and grouping already communicate intent

## Audit Findings

### Finding 1: The current control order does not match the user’s mental model

Evidence:

- `Reset all` currently renders above the preview controls in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2204)
- preview toggle is in its own section in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2213)
- export trigger and speed are still bundled under `Playback` in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2225)
- export actions come later in the `Export` section in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2292)

Impact:

- users have to scan between distant sections to understand one workflow
- `Reset all` feels detached from the settings it resets
- export trigger looks like a preview setting even though it governs export behavior

### Finding 2: The export-trigger control style is bulkier than the task requires

Evidence:

- export trigger currently uses large pill buttons via `.panel__segmented` and `.panel__segmented-btn` in [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2094)
- Motion Lab already uses a lighter trigger-bar pattern in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L4498) and [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L7767)

Impact:

- the rail spends too much visual weight on a three-choice selector
- the current pills compete with the actual export buttons for attention

### Finding 3: Export outputs are not grouped by format

Evidence:

- animated SVG, copy animated SVG, PNG download, and static SVG copy are all rendered in a single button block in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2294)
- PNG size is visually separated below a divider in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2310)

Impact:

- format-specific actions are harder to scan
- PNG settings feel disconnected from the PNG action they affect

### Finding 4: The color row is now compact, but the panel around it is still too vertically fragmented

Evidence:

- the compact premium palette already exists in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2251) and [style.css](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2553)
- surrounding sections still insert separate titles, notes, and dividers that interrupt the flow

Impact:

- one improved row sits inside a panel that still feels stacked rather than sequenced
- the palette loses some of its intended efficiency because neighboring sections remain heavy

### Finding 5: A strict single-row layout needs a rule for narrow widths and conditional stroke width

Evidence:

- the panel rail is width-constrained in the current UI
- some premium icons expose `stroke width`, while others do not

Impact:

- a rigid one-line-only implementation risks clipping, awkward compression, or inconsistent behavior
- stroke width needs a consistent place in the new flow so it does not feel bolted on afterward

## Proposed UX Direction

### Preferred Direction

Adopt your requested task flow as the primary structure:

#### Row 1: Preview controls

- compact play/stop icon-button on the left
- speed slider on the same row
- preview status text kept lightweight and secondary

Design intent:

- the first interactive row should do exactly one job: make the preview move and adjust its pace

#### Row 2: Appearance

- color palette row stays compact and visible
- original/default dot remains first
- preset swatches follow
- custom-color add button remains last

For icons with stroke width:

- add a compact secondary appearance row directly beneath color
- keep it visually attached to appearance, not export

Design intent:

- color and line weight both change how the icon looks, so they should live together

#### Row 3: Export behavior

- export trigger controls move directly above export outputs
- `Reset all` moves into this row, aligned to the right as a compact utility action
- trigger controls switch to a Motion-Lab-inspired compact radio-bar treatment

Design intent:

- this row becomes the “how export behaves” row
- reset sits here because it belongs to the broader export/customize setup, not preview playback

#### Row 4+: Export outputs grouped by format

- SVG group:
  - Download Animated SVG
  - Copy Animated SVG
  - Copy SVG (static)
- PNG group:
  - PNG size selector
  - Download PNG

Design intent:

- SVG actions should be scanable as one family
- PNG settings should sit with the PNG action they affect

## Counter Proposal

I agree with your structure, with two implementation adjustments I would recommend:

### Counter Proposal 1: Keep the row grouping fixed, but allow controlled wrapping inside the row on narrow widths

I would not force every row to remain a literal single line at all viewport widths. On the current right rail, that can make controls feel cramped or reduce touch accuracy.

Recommended rule:

- keep the grouping order fixed
- allow row 1 and row 3 to wrap internally at narrow widths
- preserve visual grouping so the user still reads them as one row conceptually

This keeps the UX flow you want without sacrificing usability on tight widths.

### Counter Proposal 2: Reuse Motion Lab’s compact selection pattern, but not its smallest native-radio footprint verbatim

I agree with using Motion Lab as the reference. I would not copy the tiniest native radio presentation one-for-one, because the premium rail needs slightly more forgiving targets.

Recommended direction:

- use Motion Lab’s horizontal choice pattern and lighter visual density
- keep premium trigger options at roughly current touch-safe heights
- style them as compact choice chips or radio-cards rather than tiny browser-default dots with text

This gives us the same visual language without making the rail harder to use.

## Gate Results

### Usability heuristics: Pass with one caution

The proposed row order better matches the task sequence and reduces scanning cost. The caution is narrow-width compression, which is why controlled row wrapping is recommended.

### Accessibility baseline: Pass if implemented with guardrails

The redesign is safe if:

- play/stop and reset remain keyboard reachable
- export trigger options keep clear active state
- compressed controls maintain touch-safe size
- grouped export actions have clear labels and focus order

### Adaptive and responsive behavior: Partial pass

The direction is strong, but it needs an explicit responsive rule for narrow rails and conditional stroke-width presence.

### Trust and safety interaction quality: Pass

Moving `Reset all` closer to export behavior clarifies scope and reduces the chance of users reading it as preview-only.

### Consistency and cognitive load: Pass

Using the Motion Lab pattern selectively reduces visual noise and makes the premium panel feel more consistent with the rest of the app.

## Implementation Handoff Checklist

- reorder premium panel sections in [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) to follow:
  - preview
  - appearance
  - export behavior
  - export outputs by format
- move `Reset all` into the export-behavior row
- redesign export trigger controls to a compact Motion-Lab-inspired selection bar
- keep play/stop and speed visually grouped in the first row
- keep color palette as the primary appearance control
- place `stroke width` directly under color when supported
- split export actions into SVG and PNG groups
- move PNG size into the PNG group instead of leaving it below a generic divider
- remove or reduce redundant helper copy that no longer earns its vertical space
- preserve all existing premium state wiring:
  - preview toggle
  - reset semantics
  - play mode / export trigger state
  - color mode and custom color
  - stroke width
  - PNG size
- do not change:
  - entitlement logic
  - asset fetch/auth path
  - locked premium behavior
  - free-icon customize layout
  - standalone SVG preview/export builder contract

## Suggested Implementation Phases

### Phase 1: Layout reordering only

- move sections into the new row order without changing behavior
- keep existing handlers and state names intact

### Phase 2: Compact trigger and reset row

- replace current segmented export-trigger pills with the compact choice pattern
- convert reset to compact utility presentation in the same row

### Phase 3: Export grouping

- split the current export block into `SVG` and `PNG`
- move PNG size into the PNG group

### Phase 4: Copy and spacing cleanup

- trim redundant helper copy
- tighten section spacing and dividers so the panel reads as one workflow

### Phase 5: Responsive and accessibility pass

- validate narrow-width wrap behavior
- verify keyboard order and focus states

## Verification Matrix

### Layout and UX

- row 1 contains preview toggle plus speed control
- row 2 contains color palette
- row 2b contains stroke width only when supported
- row 3 contains export trigger plus reset
- row 4+ groups export actions into SVG and PNG sections

### Behavior

- play/stop still controls preview only
- export trigger still affects export output, not preview state semantics
- `Reset all` still restores the full panel state for the selected premium icon
- PNG size still resets correctly

### Regression and protection checks

- owned premium icon still previews correctly
- animated SVG export still reflects trigger, speed, and appearance settings
- PNG export still reflects current appearance settings
- locked premium flow still opens the lock panel
- free-icon customize panel is unchanged
- no entitlement or auth protections are weakened

## Acceptance Criteria

- [ ] the premium panel follows the requested top-to-bottom workflow
- [ ] `Reset all` sits with export-trigger controls instead of consuming a standalone row
- [ ] export trigger controls are visually lighter and more compact
- [ ] SVG and PNG actions are grouped by format
- [ ] PNG size is colocated with PNG export
- [ ] color palette remains compact and prominent
- [ ] stroke width has a consistent appearance-related placement when present
- [ ] premium protections and working preview/export behavior remain intact

## Status

Plan written only. No code changes in this step.
