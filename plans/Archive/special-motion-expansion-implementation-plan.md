# Special Motion Expansion Implementation Plan

## Goal
Turn the current bottom Motion Lab quadrant into a real `Special` category by adding a curated set of premium-grade presets extracted from the premium icon collections, while keeping labels short enough to fit the current button UI cleanly.

This plan assumes:
- we keep the existing three bottom presets: `Sparkle`, `Swing`, `Jitter`
- we add **22** new `Special` presets for a total of **25**
- we add **1** new preset to the `Motion` quadrant so Motion also reaches **25**

Target balance:
- `Motion`: 25
- `Special`: 25
- `Entrances`: unchanged
- `Exits`: unchanged

---

## Why This Is The Right Scope

The extraction audit identified many premium-pack animations that are visually stronger than the current Motion Lab set, but not all of them belong in a first implementation wave.

This rollout should optimize for:
- visibly distinct motion in under one second
- short, readable labels
- export-safe CSS/SVG behavior
- high compatibility across icon structures
- minimum overlap with current Motion Lab presets

The goal is not to ship every good idea at once.
The goal is to ship a **coherent Special shelf** that instantly feels better than the current three-button placeholder.

---

## Current State

From [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- `Motion` currently has **24**
- `Special` currently has **3**
  - `Sparkle`
  - `Swing`
  - `Jitter`

Relevant UI location:
- bottom quadrant label is still `My Animations`
- button markup is in the Motion Lab quadrant block in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

---

## Naming Rule

Each new button label must be:
- one word, or
- a very short two-word label

Examples that fit:
- `Orbit`
- `Stream`
- `Converge`
- `Page Flip`
- `Black Hole`

Examples to avoid:
- `Node Reasoning Sequence`
- `Converge to Core`
- `Contactless Tap Payment`

The short label is for the button.
The richer concept name can still live in docs, comments, preset metadata, and future help text if needed.

---

## Final Preset Set

## A. Keep Existing Special Presets

These remain:
1. `Sparkle`
2. `Swing`
3. `Jitter`

---

## B. Add 22 New Special Presets

These are the recommended additions from the extraction audit, rewritten as short labels.

| Ship Label | Working Key | Derived From | Why It Makes The Cut |
|---|---|---|---|
| Orbit | `orbitChase` | Orbit Chase | A richer, multi-body orbit than current `Orbit` |
| Stream | `stream` | Streaming Cascade | A feed-like cascade, not just fade-in |
| Trace | `trace` | Trace + Confirm | Draw-first reveal family |
| Flow | `flow` | Flow Through | Pipeline/system movement |
| Converge | `converge` | Converge to Core | Inward pull with center activation |
| Cube | `cube` | Cube Turn | Clear depth/3D form |
| Typing | `typing` | Cursor Type-In | Text build + cursor behavior |
| Reason | `reason` | Node Reasoning Sequence | Ordered system reasoning pattern |
| Sweep | `sweep` | Donut Sweep | Arc/ring motion, progress-like but distinct |
| Scatter | `scatter` | Scatter Settle | Particles disperse and reform |
| Crest | `crest` | Wave Crest | Center-out ripple family |
| Tap | `tap` | Contactless Tap | Near-field interaction story |
| Shuffle | `shuffle` | Card Shuffle Mix | Layered crossover card motion |
| Infinity | `infinity` | Figure-8 Loop | Distinct path from current orbit/glide |
| Spatial | `spatial` | Spatial Orbit | Multi-depth orbit |
| Page Flip | `pageFlip` | Page Flip | Hinged page transition |
| Book Open | `bookOpen` | Book Open | Strong two-panel reveal |
| Domino | `domino` | Domino Cascade | Physical stagger chain |
| Supernova | `supernova` | Supernova Burst | Loud expansion effect |
| Black Hole | `blackHole` | Black Hole Collapse | Strong inward collapse effect |
| Fingerprint | `fingerprint` | Fingerprint Scan | Biometric scan family |
| Badge Tap | `badgeTap` | RFID Badge Tap | Access/scan interaction pattern |

This yields:
- 3 existing + 22 new = **25 Special presets**

---

## C. Add 1 New Motion Preset

To bring `Motion` from 24 to 25, add:

| Ship Label | Working Key | Derived From | Why It Belongs In Motion |
|---|---|---|---|
| Radar | `radar` | Radar Ping | Continuous, loop-safe, readable on many icons |

Why `Radar`:
- it reads clearly as a loop motion
- it is more general-purpose than the more icon-specific survivors
- it expands the Motion family without feeling redundant

Optional reserve if a second Motion addition is ever needed:
- `Beacon` from the same family, but **do not build now**

---

## Deferred Candidates

These should stay out of the first Special implementation wave.

| Candidate | Reason To Defer |
|---|---|
| Filter | too icon-structure dependent in first pass |
| Face Focus | better for security-specific icons than broad icon reuse |
| OTP | visually good, but more UI-state specific than general icon motion |
| Stamp | strong concept, but overlaps slightly with confirm/reveal family |

These can return in phase 2 after the first Special batch is validated.

---

## UI Plan

## 1. Rename The Bottom Quadrant

Change:
- `My Animations`

To:
- `Special`

Rationale:
- this section is curated, not user-saved
- `Special` is shorter, clearer, and matches the extracted motion set

## 2. Expand The Bottom Button Shelf

Update the bottom quadrant button block in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) so it contains:
- the existing 3 presets
- the 22 new presets above

## 3. Expand The Motion Shelf By 1

Add `Radar` to the Motion quadrant so Motion reaches 25 total.

---

## Implementation Phases

## Phase 1: Safe UI Wiring

Files:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Work:
- rename bottom quadrant label to `Special`
- add placeholder button markup for all new presets
- add `Radar` to Motion
- keep icon labels short enough to avoid visual overflow

Done when:
- Motion shows 25 buttons
- Special shows 25 buttons
- labels fit within the current button style without wrapping badly

---

## Phase 2: Preset Definition Batch 1

Implement the safest, highest-confidence presets first:

1. `Orbit`
2. `Stream`
3. `Trace`
4. `Flow`
5. `Converge`
6. `Sweep`
7. `Radar`
8. `Domino`

Why this batch:
- strong visual distinction
- lower icon-specific risk
- good spread of motion families

Done when:
- each preset runs in preview
- each one exports correctly in CSS and self-contained SVG

---

## Phase 3: Preset Definition Batch 2

Add medium-complexity spatial and reveal presets:

1. `Cube`
2. `Typing`
3. `Reason`
4. `Scatter`
5. `Crest`
6. `Shuffle`
7. `Infinity`
8. `Spatial`
9. `Page Flip`
10. `Book Open`

Done when:
- each preset reads clearly on both outline icons and common multi-part icons
- none of them visually collapse in exported SVG

---

## Phase 4: Preset Definition Batch 3

Add the strongest dramatic and interaction-heavy presets:

1. `Tap`
2. `Supernova`
3. `Black Hole`
4. `Fingerprint`
5. `Badge Tap`

Why they are last:
- more dramatic motion
- more structure sensitivity
- more likely to need tuning on Material glyphs vs multi-part icons

Done when:
- motion still feels premium, not noisy
- export and preview remain aligned

---

## Phase 5: Keyword / Agent Mapping

If the current text-to-preset helper remains in the app, extend the preset keyword mapping to include the new names.

Examples:
- `orbit chase`, `satellite`, `chase` -> `orbitChase`
- `stream`, `terminal`, `feed` -> `stream`
- `trace`, `draw`, `outline` -> `trace`
- `pipeline`, `flow`, `through` -> `flow`
- `fingerprint`, `scan`, `bio` -> `fingerprint`

If the AI input is removed before this work lands, this mapping phase can be skipped.

---

## Visual Fit Rules

Each new Special preset must pass these product checks:

1. The name fits the current button layout.
2. The animation is recognizably different from the existing Motion / Entrance / Exit presets.
3. It still feels good on:
   - Lucide-style outline icons
   - multi-part premium icons
   - Material Symbols exported SVGs
4. Exported CSS / SVG should not break or crop unexpectedly.

If a preset fails these tests, it should be deferred, not forced in.

---

## Verification Plan

For each batch, verify at least:

### Preview checks
- button appears and is clickable
- animation plays correctly in Motion Lab
- label fits without ugly wrapping

### Icon coverage checks
- one simple outline icon
- one multi-part icon
- one Material Symbols icon

### Export checks
- `Copy CSS`
- `Copy self-contained SVG`
- `Download SVG`

### Regression checks
- old presets still work
- no preview/export mismatch is reintroduced
- no layout overflow in the quadrants

---

## Risks

### 1. Too many presets, too little differentiation
Mitigation:
- ship in batches
- defer any preset that feels too close to something already present

### 2. Multi-part dependence
Mitigation:
- keep the first batch biased toward structure-safe motion
- leave more icon-specific concepts to later phases

### 3. Button overcrowding
Mitigation:
- use only one-word or short two-word labels
- do not allow long concept names into the shipped UI

### 4. Export mismatch
Mitigation:
- every batch must verify preview and export parity before adding more

---

## Final Ship Shape

After this plan lands:

- `Motion` will have **25** presets
- `Special` will have **25** presets
- the bottom quadrant will finally feel intentional, not placeholder
- the new presets will be sourced from the premium collections but generalized for broad Motion Lab use

This is the target product shape:
- `Motion` = reliable core movement library
- `Entrances` = arrivals
- `Exits` = departures
- `Special` = premium standout motion language
