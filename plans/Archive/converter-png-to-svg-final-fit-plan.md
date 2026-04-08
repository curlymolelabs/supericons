# PNG to SVG Final Fit Plan

Date: 2026-04-06

## Goal

Close the remaining launch blockers in a focused way without reopening broad converter experimentation.

## Scope

This plan addresses:

1. `Split` compare fit for larger logo outputs
2. launch scope decision for `Icon` mode versus `Logo` mode
3. product naming / positioning for launch

This plan does **not** assume that one more round of threshold tuning will fully solve tiny raster icon stroke fidelity.

## Plan

### Step 1: Fix Split Compare Fit

Update the preview sizing logic in `store.js` so split mode computes its own fit scale instead of reusing the single-image fit scale.

Implementation direction:

- compute base scale from:
  - available preview width
  - available preview height
  - current compare mode
- in `Default`:
  - fit one output into the preview box
- in `Split`:
  - fit the combined two-pane width into the preview box
  - each pane should use half-width constraints rather than reusing the single-pane width
- preserve the current behavior where tiny outputs can still display near natural size

Acceptance criteria:

- `Shell` in `Split` fits entirely inside the output preview
- `KFC` in `Split` fits entirely inside the output preview
- no clipping or side overflow in the compare stage

### Step 2: Lock Launch Scope

Decide whether launch scope is:

- `Logo only`
or
- `Logo + Experimental Icon`

Recommended default:

- `Logo only`

Why:

- logos are now good enough
- tiny icons are still not reliably faithful
- removing or softening `Icon` mode makes the feature more honest and stronger

Implementation options:

#### Option A: Logo-first launch

- hide `Icon` mode in the UI
- rename or position the feature as a `Logo Converter`
- keep current successful Node-backed logo path

#### Option B: Keep Icon mode but de-emphasize it

- keep `Icon`
- label it as best-effort / experimental
- do not claim faithful conversion for tiny raster icons

Recommended choice:

- `Option A` if launch confidence is the priority

### Step 3: If Icon Mode Must Stay, Freeze Further Heuristic Tweaks

If `Icon` mode remains visible at launch:

- stop broad heuristic tuning after the split-fit repair
- document the limitation clearly
- treat icon fidelity as a post-launch improvement track
- do not imply that `Auto`, `Compact`, or `Exact` can faithfully recover tiny stroke widths from 48px raster icons

What not to do now:

- reintroduce many user controls
- add a generic `Smoothness` control
- keep blindly tuning thresholds across the whole converter

### Step 4: Post-Launch Icon Track

If icon fidelity remains important after launch, open a dedicated follow-up project:

- evaluate stroke-aware or centerline-aware tracing
- test contour extraction from alpha before binary collapse
- benchmark specifically on:
  - `alien-48px.png`
  - `air-balloon-48px.png`
  - other small raster glyph icons

This should be treated as a separate engine problem, not a small UI refinement.

### Step 5: Launch Naming

If `Logo only` is chosen, update the product wording to match reality:

- preferred:
  - `Logo Converter`
  - `PNG Logo to SVG`
- avoid:
  - broad `PNG to SVG` wording that implies tiny icons and arbitrary raster images are equally supported

## Acceptance Criteria

### Must pass before launch

- `Shell` split preview fits correctly
- `KFC` split preview fits correctly
- `Shell`, `KFC`, `McDonald's` remain good in `Logo` mode
- preview controls remain simple and understandable
- launch copy does not overpromise tiny icon fidelity if `Icon` remains visible

### Optional

- `Icon` mode remains available if and only if the team is comfortable positioning it as best-effort

## Recommended Launch Decision

Best launch shape:

- ship the feature as a `Logo Converter`
- fix `Split` compare fitting
- keep the Node-backed logo path
- do not let tiny icon perfection delay launch
