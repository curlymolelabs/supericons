# Premium Animated Panel Audit

Audit date: 2026-04-09
Audited against: [premium-animated-panel-redesign-plan.md](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/premium-animated-panel-redesign-plan.md)

## Summary

The premium customize panel has been **substantially implemented** and aligns well with the plan. Most of the core structure, panel states, playback controls, trigger, speed, color, stroke width gating, export hierarchy, reset, and accessibility considerations match the plan. However, there are gaps and minor deviations that need attention before the plan can be considered fully closed.

Severity key:
- `PASS`: fully matches the plan
- `GAP`: missing or incomplete
- `DEVIATION`: implemented but differs from the plan
- `RISK`: matches the plan but has a latent issue worth noting

---

## Phase 1: Remove Dead Affordances

**Status: PASS**

| Item | Status | Notes |
|------|--------|-------|
| Remove `Format Tools (Coming Soon)` from purchased collection detail | PASS | No `Format Tools` or `Coming Soon` strings exist in any purchased or collection-detail code path. The only `coming soon` reference is the legitimate empty state for when `products.length === 0` at [store.js:754](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L754), which is a valid zero-product fallback, not a dead placeholder. |
| No equivalent dead placeholders in premium flow | PASS | Searched for `Format Tools`, `Coming Soon`, `coming-soon`, `placeholder`, `dead` across all JS/HTML. No dead affordances found inside the purchased premium flow. |

---

## Phase 2: Fix Preview Confidence

**Status: Mostly PASS, 1 DEVIATION**

| Item | Status | Notes |
|------|--------|-------|
| Selected premium icon animates immediately in preview | PASS | `selectPremiumIcon` at [store.js:1898](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1898) calls `startPremiumPreview()` at line 1951 after loading SVG/CSS. Preview auto-plays once on selection. |
| Play and Stop near the preview | PASS | Play and Stop buttons rendered inside the panel at [store.js:1979-1986](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1979). Wired at [store.js:2154-2158](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2154). |
| Preview loading state | PASS | `renderPremiumPanelLoading` at [store.js:1596](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1596) shows hourglass icon and "Loading icon customization..." text. |
| Preview error state | PASS | `renderPremiumPanelError` at [store.js:1627](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1627) shows warning icon with user-facing plain-language message. |
| Preview auto-stops after single play | PASS | Timer-based at [store.js:1818-1825](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1818), uses computed animation duration + 80ms buffer. |
| `Authored animation` label in meta header | DEVIATION | Plan says the meta header should include a label: `Authored animation`. Current code shows `panel__meta-subtitle` with the collection name, and `panel__meta-helper` with the text "This icon uses curated motion. Use the controls below to preview and export it." (line 1973). The helper text conveys the intent, but there is no explicit `Authored animation` label badge as the plan specifies. |

---

## Phase 3: Expose Safe Playback Controls

**Status: PASS**

| Item | Status | Notes |
|------|--------|-------|
| Trigger control visible | PASS | Segmented control with `Loop`, `Hover`, `Play once` at [store.js:2005-2009](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2005). |
| Trigger semantics correct | PASS | `buildAnimatedSvg` at [store.js:1395](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1395) handles `hover` (wraps CSS in `:hover`), `once` (replaces `infinite` with `1`), `loop` (default infinite). |
| Speed slider present | PASS | Range input at [store.js:2017-2019](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2017), range 0.25x to 3x, step 0.25. Wired at line 2137. |
| Reset all present | PASS | Button at [store.js:1987-1990](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1987). `resetPremiumPanelControls` at line 1879 restores default color, stroke width, speed, trigger, and preview state. Shows toast `Animation settings reset`. |
| Default trigger for export | PASS | Default is `loop` per `PREMIUM_PANEL_DEFAULTS` at [store.js:1454](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1454). Plan says default should be `Loop`. Match. |
| Reduced motion behavior | PASS | `premiumPrefersReducedMotion()` at [store.js:1479](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1479) checks `prefers-reduced-motion: reduce`. Autoplay is skipped at [store.js:1948-1952](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1948). Manual Play remains available. |
| Preview controls do not change exported trigger | PASS | Preview always uses `'once'` mode internally (line 1778), while export uses `premiumPanelState.playMode` (lines 2182, 2213). Inline note at line 2010 explains this. |

---

## Phase 4: Clean Export Hierarchy

**Status: Mostly PASS, 1 GAP**

| Item | Status | Notes |
|------|--------|-------|
| `Download Animated SVG` is primary | PASS | Uses `customize-export__btn--primary` class at [store.js:2052](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2052). |
| `Copy Animated SVG` is secondary | PASS | Standard button at line 2055. |
| `Download PNG` is secondary | PASS | Standard button at line 2058. |
| `Copy SVG (static)` is visually demoted | PASS | Uses `customize-export__btn--subtle` class at [store.js:2062](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2062). |
| Export helper copy present | PASS | Inline note at line 2050: "Export preserves your current color, [stroke width, ]trigger, and speed settings." |
| Export success toast messages | PASS | `Animated SVG downloaded` (line 2225), `Animated SVG copied` (line 2186), `PNG downloaded` (line 2267). |
| Export error toast messages | PASS | Error-specific toasts with retry guidance at lines 2189, 2228, 2242, 2255, 2280. |
| CSS for `customize-export__btn--primary` | PASS | Defined at [style.css:2719-2724](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2719). Uses a tinted primary background with stronger border and `font-weight: 600`. Visually prominent. |
| CSS for `customize-export__btn--subtle` | PASS | Defined at [style.css:2730-2737](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2730). Uses `background: transparent` and `color: var(--si-text-dim)`. Visually demoted as intended. |

---

## Phase 5: Capability Gating

**Status: PASS**

| Item | Status | Notes |
|------|--------|-------|
| Stroke width gated per icon | PASS | `premiumIconSupportsStrokeWidth` at [store.js:1501](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1501) tests for any `stroke` attribute in SVG text. Stroke width section only rendered when `c.supportsStrokeWidth` is true (line 2035). |
| Hidden instead of disabled for unsupported icons | PASS | Uses conditional rendering (`${c.supportsStrokeWidth ? ... : ''}`), not a `disabled` attribute. Plan says "hide unsupported controls instead of showing a disabled dead control." Match. |
| Default stroke width derived from SVG | PASS | `getPremiumDefaultStrokeWidth` at [store.js:1505](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1505) extracts from the SVG's `stroke-width` attribute. |

---

## Proposed Panel Structure Audit

The plan defines a 5-section panel. Here is the mapping to the implementation:

| Plan Section | Implementation | Status |
|-------------|---------------|--------|
| 1. Meta Header (icon name, collection, label, helper text) | Lines 1967-1975: collection name as subtitle, icon name as title, helper text present. | PASS (except `Authored animation` label, see Phase 2 DEVIATION) |
| 2. Preview Block (animated preview, Play/Stop, status) | Lines 1977-1996: Play, Stop, Reset all buttons, preview note, preview status. | PASS |
| 3. Playback Section (Trigger, Speed, Reset all) | Lines 1998-2021: Trigger segmented control, Speed slider. | PASS |
| 4. Style Section (Color, Stroke width) | Lines 2023-2046: Color picker, hex input, swatches, conditional stroke width. | PASS |
| 5. Export Section (hierarchy, helper copy, PNG size) | Lines 2048-2074: Primary download, copy, PNG, demoted static SVG, export note, PNG size picker. | PASS |

---

## State Matrix Audit

| State | Implementation | Status |
|-------|---------------|--------|
| Default (no icon selected) | `renderPremiumPanelEmptyState` at [store.js:1566](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1566). Shows placeholder with "Select an animated icon..." copy. | PASS |
| Loading | `renderPremiumPanelLoading` at [store.js:1596](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1596). Shows hourglass + "Loading..." text. | PASS |
| Loaded | `renderPremiumPanel` at [store.js:1960](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1960), followed by `startPremiumPreview`. All controls visible. | PASS |
| Validation Error (color) | `setPremiumColorValidation` at [store.js:1855](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1855). On blur, reverts to last valid color (line 2110). Invalid hex is never applied to preview. | PASS |
| System Error | `renderPremiumPanelError` at [store.js:1627](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1627). Shows warning icon + plain-language copy. | PASS |
| Success (export) | Toast messages (lines 2186, 2225, 2267). | PASS |

---

## Accessibility Audit

| Requirement | Status | Notes |
|-------------|--------|-------|
| Keyboard path (icon cell, preview controls, trigger, sliders, export) | RISK | Icon cells in the collection grid use `div` with `click` listeners, not `button` or `role="button"`. These are not keyboard-focusable by default. All panel controls (Play, Stop, Reset, Trigger, sliders, export buttons) are `<button>` or `<input>`, so they are inherently keyboard-accessible. |
| Focus stability after icon selection | RISK | No explicit `focus()` management after selection. When a premium icon is selected, the panel body is replaced via `innerHTML`, which could disrupt focus. |
| Explicit text labels on playback controls | PASS | Play, Stop, Reset all, and Trigger buttons all have visible text labels alongside Material icons. |
| Contrast on dark backgrounds | RISK | Panel uses CSS variables (`--si-text-dim`, `--si-text-muted`, etc.), which should be fine given the system's dark theme design tokens. But the segmented buttons' inactive state uses `--si-text-dim`, which could be low-contrast depending on the background. Needs visual spot-check. |
| Motion reduction | PASS | Covered at lines 1479-1483 and 1948-1949. |

---

## Adaptive / Responsive Audit

| Requirement | Status | Notes |
|-------------|--------|-------|
| Preview controls stay near preview at compact widths | RISK | The preview actions use `flex-wrap: wrap` with `gap: 8px` ([style.css:1968-1971](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L1967)). This should degrade gracefully. |
| Trigger controls wrap cleanly | PASS | Segmented control uses `flex-wrap: wrap` at [style.css:2068](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css#L2068). |
| No horizontal scroll at compact widths | RISK | No explicit `overflow-x: hidden` on panel body for compact viewports. Trigger pills and preview action row could overflow if the panel gets extremely narrow. Needs a live test at 280px panel width. |

---

## Quality Gate Assessment

| Gate | Plan Target | Current Status |
|------|------------|----------------|
| Gate 1: Usability Heuristics | Pass | **PASS**: playback state is now visible (Play/Stop + status text), reset path exists, export intent is explained via helper copy. |
| Gate 2: Accessibility Baseline | Pass | **Partial PASS**: explicit preview playback controls are present. But collection grid cells are not keyboard-focusable (see Accessibility Audit). |
| Gate 3: Adaptive Quality | Pass | **PASS**: panel fits available space. Added controls use `flex-wrap`. Needs live narrow-panel spot-check. |
| Gate 4: Trust and Safety UX | Pass | **PASS**: preview shows clear Playing/Stopped status text. Loading and error states are explicit. |
| Gate 5: Consistency and Implementation Readiness | Pass | **PASS**: PREMIUM_PANEL_DEFAULTS defines `playMode: 'loop'`. Trigger control is visible and wired. State model matches UI. |

---

## Acceptance Check Verification

| Check | Status |
|-------|--------|
| Selecting a premium icon visibly animates the preview without extra clicks | PASS |
| Play/Stop is reachable and understandable near the preview | PASS |
| Trigger is visible and changes exported playback behavior | PASS |
| Reset all restores panel defaults | PASS |
| Export actions match the visible preview settings | PASS |
| Purchased premium collection screens no longer show dead placeholder UI | PASS |
| The panel remains usable at compact widths | RISK (needs live spot-check) |
| Copy is plain language and intent-clear | PASS |

---

## Open Issues Summary

### Should-Fix

1. **Missing `Authored animation` label in meta header**
   - Source: [store.js:1967-1975](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1967)
   - Plan explicitly calls for an `Authored animation` label in the meta header section. Current implementation relies on helper text alone.

2. **Collection grid icon cells are not keyboard-focusable**
   - Source: [store.js:1240-1293](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1240)
   - Cells are `div` elements with `click` listeners. Not inherently focusable without `tabindex="0"` or `role="button"`. Keyboard-only users cannot select premium icons via Tab/Enter.

### Nice-to-Have

3. **Focus management after icon selection**
   - When `renderPremiumPanel` replaces `panelBody.innerHTML`, focus is lost. Consider programmatically focusing the first panel control or the Play button after render.

4. **Narrow panel overflow spot-check**
   - Test at 280px panel width to confirm no horizontal scrolling occurs with the trigger segmented control and preview action row.

---
---

# Part 2: Premium Customize Preview Failure Audit

Audit date: 2026-04-09
Audited against: [premium-customize-preview-fix-plan.md](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/plans/premium-customize-preview-fix-plan.md)

## Relationship to Part 1

Part 1 audited the panel structure (controls, layout, states, accessibility) against the redesign plan. That audit concluded "PASS" for the general panel contract. This Part 2 audit examines a deeper, systemic rendering failure: premium icons that appear blank or unstyled in the customize preview and exported SVGs, despite the panel controls themselves being correct.

The Part 1 audit checked "Selecting a premium icon visibly animates the preview without extra clicks" and marked it PASS. That assessment was based on the render flow code path, not on whether the emitted CSS actually matches the SVG markup. Part 2 overrides that finding: **the render flow fires correctly, but the CSS it produces is structurally disconnected from the SVG it wraps.** The pipeline runs, but the output is broken for a significant subset of icons.

## Summary

All five findings in the fix plan are **confirmed as still present** in the current codebase. The bugs are systemic, not limited to `counter`, and affect both preview rendering and animated SVG exports. No fixes have been applied.

Severity key (same as Part 1):
- `CONFIRMED`: finding is verified as still present
- `FIXED`: finding has been resolved
- `PARTIAL`: partial mitigation exists

---

## Finding 1: Preview drops the collection wrapper class contract

**Status: CONFIRMED**

| Aspect | Evidence |
|--------|----------|
| Grid rendering | The collection grid wraps each icon preview in `si-anim ${getAnimClass(...)}` at [store.js:1255](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1255). For `counter`, this produces class `a5s2pb`. |
| Preview rendering | `renderPremiumPreview` at [store.js:1794-1806](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1794) mounts the SVG inside `<div class="panel__preview-icon panel__preview-icon--premium">`. No `a5s2pb` class or equivalent wrapper exists in the preview DOM. |
| CSS contract | Bundle CSS contains rules like `.a5s2pb .dc-digit { transform: translateY(4px); opacity: 0; }`. This rule sets digits invisible by default. In the grid, `.a5s2pb` is the wrapper parent, so the rule fires. In the preview, no element has `.a5s2pb`, so `.dc-digit` elements remain unstyled. |
| User impact | `counter` digits (and any icon whose resting state depends on the wrapper class) are either invisible or incorrectly styled in the preview. |

### Verified DOM structure comparison

```
GRID (works):
  <div class="si-anim a5s2pb">       <-- wrapper has animClass
    <svg class="si-icon si-anim-dc si-dc-counter">
      <text class="dc-digit dc-digit-1">...</text>

PREVIEW (broken):
  <div class="panel__preview-icon panel__preview-icon--premium">   <-- NO animClass
    <svg class="si-icon si-anim-dc si-dc-counter">
      <style>
        .a5s2pb .dc-digit { ... }     <-- orphaned, no parent has .a5s2pb
      </style>
      <text class="dc-digit dc-digit-1">...</text>
```

---

## Finding 2: `buildAnimatedSvg` rewrites only part of the selector model

**Status: CONFIRMED**

| Aspect | Evidence |
|--------|----------|
| What IS rewritten | `.si-anim--{name} svg` to `:root`, `.si-anim svg` to `:root`, `${animClass} svg` to `:root` (lines 1414-1422). Hover selectors `.si-icon-cell:hover` and `.icon-card:hover` are stripped (lines 1408-1409). |
| What IS NOT rewritten | Plain descendant selectors like `.a5s2pb .dc-digit` survive untouched. After hover stripping, `.si-icon-cell:hover .a5s2pb .dc-digit-1` becomes `.a5s2pb .dc-digit-1`, which still requires a parent `.a5s2pb` element. |

### Verified rewrite simulation

| Input | Output | Result |
|-------|--------|--------|
| `.a5s2pb .dc-digit { transform: translateY(4px); opacity: 0; }` | `.a5s2pb .dc-digit { transform: translateY(4px); opacity: 0; }` | UNCHANGED (orphaned) |
| `.si-icon-cell:hover .a5s2pb .dc-digit-1 { animation: yo50dx .3s ease forwards; }` | `.a5s2pb .dc-digit-1 { animation: yo50dx .3s ease forwards; }` | Hover stripped, but `.a5s2pb` still orphaned |
| `.si-anim svg { overflow: visible; }` | `:root { overflow: visible; }` | Correctly rewritten |
| `.a5s2pb svg .something { color: red; }` | `:root .something { color: red; }` | Correctly rewritten (pattern is `animClass svg`) |

The rewrite logic handles `animClass svg` patterns but not `animClass descendant` patterns (without `svg` in the middle). This is the core gap.

---

## Finding 3: CSS extraction omits root-scoped style rules

**Status: CONFIRMED**

| Aspect | Evidence |
|--------|----------|
| Extraction filter | `extractIconCSS` at [store.js:1382](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1382) keeps blocks containing `animClass` or `.si-anim svg`. |
| Split-class architecture | Premium icons use TWO class tokens: (1) the manifest `classMap` entry (e.g. `a5s2pb`) for hover-triggered choreography, and (2) an SVG root class (e.g. `vd12s5` for `scatter-plot`, `jwmqiz` for `donut-chart`) for fill/stroke resting-state setup. |

### Verified class split from live bundle

| Icon | Manifest animClass | SVG root class(es) | Root class in CSS? |
|------|--------------------|---------------------|-------------------|
| counter | `a5s2pb` | `si-icon si-anim-dc si-dc-counter` | `si-dc-counter`: NO |
| scatter-plot | `hg4wk2` | `si-icon si-anim-dc vd12s5` | `vd12s5`: YES |
| donut-chart | `imjihk` | `si-icon si-anim-dc jwmqiz` | `jwmqiz`: YES |
| treemap | `u8vgov` | `si-icon si-anim-dc uv7an2` | `uv7an2`: YES |
| bar-chart | `zhe4xf` | `si-icon si-anim-dc si-dc-bar-chart` | `si-dc-bar-chart`: NO |

For icons like `scatter-plot`, `donut-chart`, and `treemap`, the SVG root class is referenced in bundle CSS for resting-state rules. `extractIconCSS` only searches for the `animClass` and `.si-anim svg`. Rules keyed by the SVG root class (e.g. `.vd12s5 circle`) are dropped.

### Verified CSS extraction for counter

`extractIconCSS` finds 5 rule blocks for `counter`:
1. `.si-anim svg { overflow: visible; }` (global rule, matched via `.si-anim svg`)
2. `.a5s2pb .dc-digit { ... }` (resting state, matched via `a5s2pb`)
3. `.si-icon-cell:hover .a5s2pb .dc-digit-1 { ... }` (animation trigger, matched via `a5s2pb`)
4. `.si-icon-cell:hover .a5s2pb .dc-digit-2 { ... }` (same pattern)
5. `.si-icon-cell:hover .a5s2pb .dc-digit-3 { ... }` (same pattern)

The extraction finds these because they all contain `a5s2pb`. But for icons using root-class rules (scatter-plot uses `.vd12s5 circle`), `extractIconCSS` misses those because it does not know about `vd12s5`.

---

## Finding 4: The issue is systemic

**Status: CONFIRMED**

| Aspect | Evidence |
|--------|----------|
| Scope | All 50 icons in the `data-charts` bundle have a manifest animClass. The preview and export both call `buildAnimatedSvg`. |
| Shared code path | `buildPremiumPreviewSvg` at [store.js:1769](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1769) and the export handlers at [store.js:2176-2184](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2176) and [store.js:2207-2214](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2207) all use `buildAnimatedSvg`. |
| Implication | Any fix to `buildAnimatedSvg` and `extractIconCSS` automatically repairs both preview and export for all premium icons. Conversely, not fixing these means the bug affects every icon that uses the split-class pattern, across every collection. |

---

## Finding 5: Panel reset behavior masks the real render failure

**Status: CONFIRMED (secondary)**

| Aspect | Evidence |
|--------|----------|
| Reset on view switch | `switchView` at [store.js:587-607](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L587) clears `currentPremiumSelection`, resets `premiumPanelState`, and puts the panel in a generic placeholder state. |
| Empty state on collection load | `renderPremiumPanelEmptyState` is called at [store.js:1301](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1301) when entering a purchased collection. |
| Masking effect | After selection, `selectPremiumIcon` does run successfully (line 1898) and `renderPremiumPanel` renders controls (line 1946). But the SVG preview looks blank because of Findings 1-3. The user sees "panel loaded with controls, but icon is blank," which is more confusing than a total failure, because the controls suggest success. |
| Part 1 cross-reference | This relates to Part 1's PASS for "Preview loading state" and "Preview error state." Those state handlers are correctly implemented, but this specific failure mode (CSS mismatch, not a network/data error) does not trigger the error state. The preview renders, it just renders incorrectly. |

---

## Fix Strategy Assessment

### Phase 1: Unify the preview contract

**Status: NOT STARTED**

The plan recommends making the standalone preview self-contained by carrying the required wrapper/root classes into the generated markup and rewriting selectors against that known structure. Currently, `renderPremiumPreview` at line 1804 uses `panel__preview-icon--premium` with no animClass wrapper, and `buildAnimatedSvg` does not inject the animClass anywhere in the emitted SVG.

### Phase 2: Class-aware CSS extraction

**Status: NOT STARTED**

`extractIconCSS` at [store.js:1335-1393](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1335) filters by `animClass` and `.si-anim svg` only. It does not inspect SVG markup for additional class tokens. No helper exists to discover SVG root classes.

### Phase 3: Structure-aware selector rewriting

**Status: NOT STARTED**

`buildAnimatedSvg` at [store.js:1395-1448](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1395) handles three rewrite patterns (`si-anim--name svg`, `si-anim svg`, `animClass svg`) but not `animClass descendant` patterns. No stable wrapper class is emitted for premium standalone output.

### Phase 4: Observable and fail-soft preview

**Status: NOT STARTED**

No console warnings exist for empty CSS extraction or missing animation classes. The preview renders silently even when CSS is structurally disconnected.

### Phase 5: Export parity re-test

**Status: NOT STARTED (blocked by Phase 1-3)**

Cannot be validated until Phases 1-3 are implemented.

---

## Cross-reference: How this affects Part 1 findings

| Part 1 Finding | Impact from Part 2 |
|----------------|-------------------|
| Phase 2: "Selected premium icon animates immediately in preview" (PASS) | **INVALIDATED for affected icons.** The render pipeline fires, but broken CSS means the icon can appear blank. Part 1's PASS was based on flow correctness, not visual correctness. |
| Phase 3: "Trigger semantics correct" (PASS) | **DEGRADED.** `buildAnimatedSvg` handles hover/once/loop trigger modes correctly for the patterns it rewrites, but the orphaned `.animClass .descendant` patterns break all three modes. |
| Phase 4: "Export" (PASS) | **DEGRADED.** Exports use the same broken `buildAnimatedSvg`, so downloaded/copied animated SVGs inherit the selector mismatch. |
| State Matrix: "Loaded" (PASS) | **DEGRADED.** The panel reaches the "Loaded" state correctly, but the visual output is wrong. No error state is triggered because data loaded successfully; only the CSS contract is broken. |

---

## Consolidated Open Issues (Parts 1 + 2)

### Critical (Part 2: must fix before icons are usable)

1. **Preview drops collection wrapper class contract** (Finding 1)
   - Source: [store.js:1794-1806](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1794)
   - Fix: Emit the animClass wrapper in the preview DOM, or rewrite all `.animClass .descendant` selectors to target `:root .descendant` in `buildAnimatedSvg`.

2. **`buildAnimatedSvg` does not rewrite `.animClass .descendant` selectors** (Finding 2)
   - Source: [store.js:1407-1422](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1407)
   - Fix: Add rewrite rule: `.{animClass} .thing` to `:root .thing`.

3. **`extractIconCSS` misses SVG root-class rules** (Finding 3)
   - Source: [store.js:1382](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1382)
   - Fix: Parse SVG markup for class tokens and include rules referencing them.

4. **No error affordance when standalone preview CSS is incomplete** (Finding 4 + Phase 4)
   - Source: no diagnostic code exists
   - Fix: Add console warnings and a visible fallback if extracted CSS is empty.

### Should-Fix (Part 1)

5. **Missing `Authored animation` label in meta header**
   - Source: [store.js:1967-1975](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1967)

6. **Collection grid icon cells are not keyboard-focusable**
   - Source: [store.js:1240-1293](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1240)

### Nice-to-Have (Part 1)

7. **Focus management after icon selection**
   - When `renderPremiumPanel` replaces `panelBody.innerHTML`, focus is lost.

8. **Narrow panel overflow spot-check**
   - Test at 280px panel width.

