# Premium Animated Panel Redesign Plan

## Problem

- User segment: Pro subscribers and premium pack owners customizing curated animated icons.
- Job to be done: Preview a premium animated icon, make a few safe style/playback adjustments, and export it confidently.
- Current pain:
  - the premium panel feels incomplete compared with the free-icon panel
  - the preview does not clearly communicate playback state
  - there is no visible `Play/Stop` control near the preview
  - `Trigger` exists in code but is not exposed in the UI
  - there is no `Reset all`
  - export options are present, but the relationship between preview state and export state is not obvious
  - purchased collection views still contain a dead `Format Tools (Coming Soon)` placeholder that does not belong in the premium flow
- Success criteria:
  - selecting a premium icon immediately shows motion in the preview
  - users can clearly control playback near the preview pane
  - the panel exposes only safe, curated controls
  - export behavior is easy to understand and matches the chosen settings
  - no dead or `coming soon` placeholder blocks remain inside purchased premium collection detail views

## UX Direction

- Chosen direction summary:
  - treat the premium panel as an `Authored Animation` surface, not a mini Motion Lab
  - keep the panel separate from the free-icon panel
  - expose only a narrow set of safe controls:
    - preview playback
    - trigger
    - speed
    - color
    - stroke width where appropriate
    - reset
    - export
- Why this direction:
  - premium animated icons are curated assets with pre-authored motion
  - users need confidence and clarity more than deep control
  - too many controls would blur the boundary between premium customize and Motion Lab
- Rejected alternatives and rationale:
  - bring full Motion Lab controls into the premium panel
    - rejected because it overcomplicates a curated asset workflow
  - keep the current sparse panel and only add reset
    - rejected because it does not solve the playback clarity problem
  - move all playback controls into export only
    - rejected because users need preview confidence before export

## Non-Goals

- do not turn the premium panel into Motion Lab
- do not add element-level or timeline controls
- do not expose transforms, easing, or per-part choreography
- do not promise format tools that are not ready
- do not show controls that only work on a subset of icons unless they are capability-gated

## Defaults And Behavior Rules

- Preview on selection:
  - animate once immediately when an icon is selected
- Preview default playback state:
  - stopped after the initial autoplay finishes
- Default trigger for export:
  - `Loop`
- Preview controls:
  - `Play` starts preview playback
  - `Stop` halts preview playback and returns to the resting frame
- Trigger semantics:
  - `Loop`: repeated playback
  - `Hover`: animation starts on hover in supported contexts
  - `Play once`: one run on load/open
- Export contract:
  - export uses the selected `Trigger`, `Speed`, `Color`, and `Stroke width`
  - preview controls do not change the exported trigger unless the trigger control itself changes
- Reduced motion:
  - disable autoplay for users with `prefers-reduced-motion`
  - keep manual `Play` available

## Interaction Contract

### Primary Actions

- Select a premium icon from the collection grid
- Preview the animation immediately
- Adjust playback and style safely
- Export the animated SVG

### Secondary Actions

- Copy animated SVG code
- Download PNG
- Copy static SVG

### Validation Rules

- `Color` accepts valid hex input or swatch selection
- `Stroke width` stays within the existing safe range
- `Speed` stays within the existing safe range
- `Trigger` is limited to:
  - `Loop`
  - `Hover`
  - `Play once`

### Capability Rules

- `Color` is shown for all premium animated icons
- `Speed` is shown for all premium animated icons
- `Trigger` is shown for all premium animated icons
- `Stroke width` is shown only if the icon renders cleanly with stroke changes
- if a control is unsupported for a specific icon, hide it instead of showing a disabled dead control

### Error Behavior

- if a premium icon cannot load, show a plain-language panel error state
- if export generation fails, show a toast with retry guidance
- do not leave the panel looking empty or inert after selection
- remove placeholder affordances that imply features exist before they are real

### Recovery Behavior

- `Reset all` restores:
  - default color
  - default stroke width
  - default speed
  - default trigger
  - preview playback state
- user can always close the panel or select another icon

### Undo / Rollback Behavior

- `Reset all` acts as the primary rollback action
- individual control changes do not need explicit undo if reset is present

## Proposed Panel Structure

### 1. Meta Header

- icon name
- collection name
- label: `Authored animation`
- short helper text:
  - `This icon uses curated motion. Use the controls below to preview and export it.`

### 2. Preview Block

- animated preview visible immediately when the icon is selected
- preview auto-plays once on selection
- small playback control row near the preview:
  - `Play`
  - `Stop`
- optional compact status text:
  - `Preview only`

Important rule:

- `Play/Stop` controls the preview surface only
- export still uses the selected trigger mode

### 3. Playback Section

- `Trigger`
  - segmented control or pills:
    - `Loop`
    - `Hover`
    - `Play once`
- `Speed`
- `Reset all`

Preview toolbar recommendation:

- place `Play`, `Stop`, and `Reset all` directly on or just beneath the preview block
- keep `Trigger` and `Speed` in the playback section below

### 4. Style Section

- `Color`
- `Stroke width`

If later testing shows some icons do not respond well to stroke width:

- hide or disable `Stroke width` for those icons

### 5. Export Section

Recommended hierarchy:

- primary: `Download Animated SVG`
- secondary: `Copy Animated SVG`
- secondary: `Download PNG`
- tertiary / lower emphasis: `Copy SVG (static)`

Add a short note:

- `Export preserves your current color, playback trigger, and speed settings.`

## State Matrix

### Default

- placeholder preview
- helper text:
  - `Select an animated icon to preview and export it.`

### Loading

- preview skeleton or spinner in the preview pane
- panel copy:
  - `Loading icon customization...`

### Loaded

- preview animates once automatically
- playback controls visible
- style controls visible
- export controls visible
- any unsupported controls are omitted cleanly

### Empty

- only relevant before a premium icon is selected
- same as default placeholder state

### Validation Error

- invalid hex input should not silently corrupt state
- keep last valid color and show lightweight inline guidance if needed

### System Error

- if SVG or CSS cannot load:
  - `We could not load this icon right now. Try another icon or try again.`

### Success

- export actions show clear toast messages:
  - `Animated SVG downloaded`
  - `Animated SVG copied`
  - `PNG downloaded`

## Implementation Phases

### Phase 1: Remove dead affordances

- remove `Format Tools (Coming Soon)` from premium collection detail screens
- ensure no equivalent dead placeholders remain in the premium flow

### Phase 2: Fix preview confidence

- make selected premium icons animate immediately in preview
- add `Play` and `Stop` near the preview
- add preview-specific loading and error states

### Phase 3: Expose safe playback controls

- add visible `Trigger`
- keep `Speed`
- add `Reset all`
- define exact default behavior and reduced-motion behavior

### Phase 4: Clean export hierarchy

- make `Download Animated SVG` primary
- demote `Copy SVG (static)`
- add export helper copy
- verify exported files behave correctly in a browser

### Phase 5: Capability gating

- audit `Stroke width` behavior across a representative premium icon set
- hide unsupported controls instead of exposing unreliable ones

## Accessibility Requirements

- Keyboard path definition:
  - icon cell selection
  - preview controls
  - trigger controls
  - sliders
  - export buttons
- Focus order and visibility requirements:
  - after icon selection, focus should remain stable
  - playback controls and reset must have visible focus styles
- Labeling and instructions requirements:
  - `Play`, `Stop`, `Reset all`, and `Trigger` must be explicit text labels
  - avoid icon-only playback controls without labels
- Contrast and non-text contrast requirements:
  - trigger pills and reset button must remain legible on dark backgrounds
- Motion reduction behavior:
  - if `prefers-reduced-motion` is enabled, do not auto-loop
  - allow manual preview playback instead

## Adaptive Requirements

### Compact

- preview controls stay directly beneath or overlaid at the bottom of the preview
- trigger controls wrap cleanly without causing horizontal scrolling

### Medium

- keep the same structure
- avoid moving playback controls far from the preview

### Expanded

- maintain one coherent panel, not multiple floating sections

## Quality Gates

### Gate 1: Usability Heuristics

- Current: fail
  - playback state is not visible enough
  - no reset path
  - export intent is not clearly explained
- Target after redesign: pass

### Gate 2: Accessibility Baseline

- Current: partial fail
  - no explicit preview playback control
- Target after redesign: pass

### Gate 3: Adaptive Quality

- Current: pass
  - panel fits the available space
- Risk:
  - adding controls must not create cramped mobile overflow

### Gate 4: Trust and Safety UX

- Current: partial fail
  - users cannot easily tell whether the preview is broken or simply not playing
- Target after redesign: pass

### Gate 5: Consistency and Implementation Readiness

- Current: fail
  - hidden `playMode` model is not matched by the visible UI
- Target after redesign: pass

## Implementation Handoff Checklist

- Add preview playback controls near the preview pane
- Auto-play the preview once when a premium icon is selected
- Stop the preview cleanly at the resting frame
- Add `Trigger` control:
  - `Loop`
  - `Hover`
  - `Play once`
- Add `Reset all`
- Keep `Speed`
- Keep `Color`
- Keep `Stroke width`, but be ready to gate it per icon capability later
- remove `Format Tools (Coming Soon)` and any equivalent purchased premium placeholder blocks
- Reorder exports so `Download Animated SVG` is primary
- Demote `Copy SVG (static)` visually
- Add export helper copy
- Keep premium panel intentionally narrower than Motion Lab

## QA Matrix

- `Selection`
  - selecting any premium icon should animate once immediately
- `Preview playback`
  - `Play` restarts the preview
  - `Stop` freezes the preview at the resting frame
- `Trigger`
  - switching between `Loop`, `Hover`, and `Play once` updates export behavior
- `Reset`
  - `Reset all` restores defaults without requiring re-selection
- `Export`
  - downloaded animated SVG opens and animates correctly in a browser
  - copied animated SVG preserves style and trigger settings
  - PNG export remains correct
- `Capability gating`
  - icons that do not support stroke width cleanly do not expose a misleading control

## Acceptance Checks

- [ ] Selecting a premium icon visibly animates the preview without extra clicks
- [ ] `Play/Stop` is reachable and understandable near the preview
- [ ] `Trigger` is visible and changes exported playback behavior
- [ ] `Reset all` restores panel defaults
- [ ] Export actions match the visible preview settings
- [ ] Purchased premium collection screens no longer show dead placeholder UI
- [ ] The panel remains usable at compact widths
- [ ] Copy is plain language and intent-clear

## Residual Risks

- Risk 1:
  - some icons may not respond uniformly to stroke width changes
- Risk 2:
  - `Hover` as an exported trigger may still be less intuitive than `Loop` for some users
- Monitoring / follow-up:
  - test a representative set of icons across all premium collections
  - confirm exported SVG behavior in browser, code embed, and design-tool import contexts
