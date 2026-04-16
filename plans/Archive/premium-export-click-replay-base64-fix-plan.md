# Premium Export Click Replay And Base64 Fix Plan

## Goal
Close the remaining premium animated export gaps by making `Click` exports replay on actual click for inline SVG-based formats, while stopping `Copy Base64` from implying interactive trigger behavior it cannot reliably preserve.

## Confirmed Remaining Gaps

### 1. `Click` export is still press-state oriented
- The export CSS is now structurally correct, but `headphones-animated.svg` still relies on `:active` / `.active`.
- That means plain inline usage behaves like press-state animation unless the consumer manually toggles `.active`.
- This is not the same as a self-contained `on click` replay behavior.

### 2. Base64 is not a truthful export surface for interactive triggers
- `Copy Base64` wraps the same animated SVG payload into a `data:` URI.
- In common usage (`<img src="...">`), the inner SVG root does not preserve practical `hover` or `click` interaction behavior.
- Leaving Base64 fully enabled for interactive modes over-promises what the exported artifact can do.

## Implementation Scope

### In scope
- Premium animated export builder in [store.js](D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- Click-trigger behavior for:
  - Download Animated SVG
  - Copy Animated SVG
  - Copy HTML
  - Copy React
  - Copy Vue
  - Copy Svelte
- Base64 export affordance in the premium customize panel
- Checked-in animated SVG reference artifacts in `docs/`

### Out of scope
- Motion Lab export behavior
- Free icon export behavior
- Static SVG export path
- PNG export path

## Solution

### 1. Make exported click SVGs self-replay on actual click
- Keep the exported click mode centered on the `.active` class path.
- Inject a lightweight root-level click handler onto exported SVG roots for click mode only.
- On click, the handler should:
  - clear any previous replay timer
  - remove `.active`
  - force reflow
  - re-add `.active`
  - remove `.active` again after the animation timeline completes

This makes raw inline SVG and HTML exports replay on click without requiring external code.

### 2. Compute replay timeout from the emitted SVG itself
- Derive the replay timeout from the final exported SVG after CSS injection.
- Use computed styles on a temporary offscreen SVG instance with `.active` applied.
- Reuse the same duration accounting logic already used by the preview pipeline:
  - animation duration
  - animation delay
  - iteration count

This avoids hard-coded timing guesses and keeps multi-track icons accurate.

### 3. Restrict Base64 to honest, loop-safe behavior
- Treat `Copy Base64` as supported only for `Loop`.
- For `Hover` and `Click`:
  - show the button in a disabled-looking state
  - keep it focusable/clickable enough to explain why
  - show a tooltip/toast explaining that interactive SVG triggers do not survive standard Base64 data-URI usage

### 4. Refresh shipped reference artifacts
- Update `sparkles-animated.svg`
- Update `headphones-animated.svg`

They should reflect the final exported shape:
- `.active`-driven click animation selectors
- root click replay attributes
- no misleading press-only-only output

## Verification
- `node --check store.js`
- `npm run build`
- inspect `docs/sparkles-animated.svg`
- inspect `docs/headphones-animated.svg`
- confirm Base64 is guarded for non-loop modes in the premium panel code path
