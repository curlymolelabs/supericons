# Landing Hero Icon Rain Implementation Plan

Date: 2026-04-07
Reference mockup: [icon-rain-mockup.html](../icon-rain-mockup.html)

## Objective

Refine the Supericons landing page so the top-of-page impression matches the approved icon-rain mockup:

- near-full-screen hero
- subtle ambient icon field behind the copy
- restrained content hierarchy
- current Supericons orange theme instead of the mockup's purple accent
- strong first-impression focus for human visitors

The landing page must still preserve the AI-agent positioning section:

- keep `Works with any AI coding agent`
- keep the editor badges
- keep the MCP config block and docs link

The icon rain is a landing-only presentation effect. It must not appear in the main app after the landing sections are dismissed.

---

## Locked Decisions

### 1. Stream direction remains upward

We are keeping the upward drift from the approved mockup.

Why:
- the current mockup is already visually successful
- it reads as premium ambient motion rather than literal "weather"
- changing direction introduces motion retuning without a product need

### 2. Production should match the mockup's full-stage feel

This is not just a small texture layer added to the current compact hero.

Implementation truth:
- the landing hero should become a large stage section with the icon rain integrated into the composition

### 3. Theme sync uses the existing Supericons orange system

The production version should inherit the current orange brand accents already used in the landing hero and CTA.

Rule:
- orange for glow, CTA emphasis, and accent surfaces
- icon rain stays neutral and dim
- no production purple bias

### 4. Keep the AI-agent section

The section headed `Works with any AI coding agent` remains part of the landing sequence and should sit directly below the hero once the feature-card grid is removed or demoted.

### 5. No production tuning controls

The controls in the mockup are prototype-only.

Production must ship:
- no controls panel
- no debug sliders
- no user-facing effect toggles

### 6. Use the curated mockup icon set

Do not wire the rain to live Supericons assets or package data.

Rule:
- keep the hand-curated inline SVG path list from the mockup
- treat it as a visual motif, not a content source

### 7. Dismissal removes the effect completely

When the landing layer is dismissed, the icon rain must stop building and stop rendering.

Implementation truth:
- no icon rain inside the main app
- no hidden offscreen animation continuing after dismiss

### 8. Reduced-motion support is required

The effect is decorative and must gracefully reduce or disable for users who prefer reduced motion.

---

## Product Intent

The landing sequence should do two jobs well:

1. impress first-time visitors immediately
2. route them into either:
   - the main icon tool
   - the MCP / AI-agent story

This means:

- the hero should stay visually bold and text-light
- the current feature-card grid should not compete with the hero
- the AI-agent section should remain as the primary explanatory section below the hero

---

## Scope Boundaries

### In scope

- landing hero layout and spacing
- icon rain background effect
- landing hero copy trim
- feature-grid removal or demotion
- MCP section retention and visual refinement
- dismiss / teardown lifecycle
- reduced-motion and mobile behavior

### Out of scope

- app search behavior
- icon grid behavior
- premium or store flows
- MCP backend functionality
- icon asset pipelines
- directory reorganization

---

## Proposed Final Landing Structure

### Section 1: Hero Stage

Large immersive hero with:

- icon rain background
- headline
- one short subtitle
- primary CTA
- stats row

### Section 2: AI-Agent Proof

Keep:

- `Works with any AI coding agent`
- editor badges
- MCP config block
- docs link

This becomes the main supporting section directly below the hero.

### Section 3+: Main App

After dismissal, the user sees the actual tool without the landing presentation layer.

---

## Content Strategy

### Hero

Keep the hero intentionally restrained.

Target content density:

- strong headline
- one supporting sentence
- one primary CTA
- current stats row

### Feature Cards

The current six-card feature grid should be removed from the primary landing flow in v1 of this refinement.

Why:
- it breaks the elegance of the mockup
- it introduces too much explanatory copy immediately after the hero
- the MCP section is the more important supporting proof block

If later testing shows the page needs more explanation, add a smaller proof strip in a follow-up instead of restoring the current card grid.

### AI-Agent Messaging

Keep the MCP section intact, but visually refine it so it feels like the second act of the same landing story rather than a separate generic content block.

---

## Proposed Changes

### Phase 0: Visual Baseline Capture

Before changing code:

- capture screenshots of the current landing hero
- capture screenshots of the current feature grid
- capture screenshots of the current MCP section
- keep one screenshot of the approved mockup for parity checks

Purpose:
- make it easy to compare before / after hierarchy, density, and legibility

---

### Phase 1: Hero Markup Restructure

#### [MODIFY] `index.html`

Update the landing sequence so the hero can support the icon-rain stage properly.

Work:

- add `<div class="icon-rain" id="iconRain" aria-hidden="true"></div>` as the first child inside `.landing-hero`
- keep `.landing-hero__inner`
- ensure the actual content block has its own stacking context above the rain
- keep:
  - headline
  - subtitle
  - CTA
  - stats row
- remove the current `landing-features` section from the landing flow
- keep the `landing-mcp` section and move it to directly follow the hero

Result:
- hero becomes the full visual statement
- MCP becomes the primary explanation section

---

### Phase 2: Hero Visual System and Theme Sync

#### [MODIFY] `style.css`

Transform the current compact hero into a larger stage that matches the mockup while preserving the Supericons brand theme.

Work:

- update `.landing-hero` from a padded banner into a near-full-screen stage
  - target: `min-height: 100svh`
  - centered composition
  - still responsive on mobile
- keep the existing dark base and orange ambient glow
- add an additional center readability mask so the text stays crisp above the rain
- give `.landing-hero__inner` and/or `.landing-hero__content` explicit `position: relative` and `z-index`
- keep CTA styling inside the existing orange token system
- avoid `transition: all`; list properties explicitly
- add `.icon-rain`, `.icon-rain__column`, `.icon-rain__cell`, and keyframes
- use gradients at the top and bottom edges so the columns dissolve naturally

Theme rules:

- icon rain color: neutral dim white/gray
- highlight icons: slightly brighter neutral, not orange
- orange reserved for:
  - hero glow
  - CTA
  - stat emphasis
  - optional subtle MCP accents

---

### Phase 3: Landing Rain Effect Module

#### [NEW] `landing-effects.js`

Isolate the icon-rain logic into its own module instead of adding several hundred lines to `main.js`.

Responsibilities:

- hold the curated SVG path list from the mockup
- define production config defaults
- build the rain columns and cells
- handle debounced resize rebuilds
- expose lifecycle methods:
  - `initLandingEffects()`
  - `destroyLandingEffects()`

Implementation rules:

- keep the upward drift
- no production controls
- use the mockup icon set directly
- no network fetches
- no dependency on the Supericons asset pipeline

Performance rules:

- animate columns with `transform`
- animate cells with `opacity`
- keep `will-change` only where it clearly helps
- avoid overusing `will-change` on every descendant if it increases compositing cost

---

### Phase 4: Production Tuning Defaults

#### [NEW/IN MODULE] rain config

Start from the approved mockup and tune only for production stability.

Desktop target defaults:

- columns: about `16`
- icons per column: about `12`
- base opacity: `0.04` to `0.06`
- highlight opacity: `0.10` to `0.14`
- blink duration: about `5s`
- drift duration: about `45s`
- bright chance: about `10%` to `12%`

Mobile target defaults:

- fewer columns
- fewer visible rows
- same visual mood, lower density

Guardrails:

- center readability always wins over atmosphere
- if motion feels busy, reduce density before reducing legibility protections

---

### Phase 5: Landing Lifecycle Integration

#### [MODIFY] `main.js`

Wire the landing effect into the existing landing-dismiss behavior.

Work:

- import the new landing-effects module
- initialize it only if the landing hero is present and not already dismissed
- do not initialize the effect inside the main app area
- update the existing dismiss path so it also destroys the effect
- if local storage says the landing is already dismissed, skip rain initialization entirely

Important behavior:

- the rain runs only while the landing bundle is visible
- dismissing the hero also removes the MCP landing section, consistent with the current landing-to-app transition

---

### Phase 6: Remove or Demote Feature Grid

#### [MODIFY] `index.html`
#### [MODIFY] `style.css`

The existing six-card grid should no longer sit between the hero and the MCP section.

Recommended v1:

- remove the `landing-features` section entirely from the landing flow

Why:

- it weakens the strong first impression created by the hero
- it reintroduces the exact wordy card density the mockup successfully avoids
- the MCP section is the more strategic proof section to preserve

Fallback if removal feels too aggressive after visual review:

- replace it with a very slim proof row later
- do not restore the full six-card grid in this pass

---

### Phase 7: AI-Agent Section Refinement

#### [MODIFY] `style.css`

Keep the `Works with any AI coding agent` section, but visually tune it so it flows naturally after the hero.

Work:

- preserve the title verbatim
- keep the editor badges
- keep the install code block
- keep the docs link
- refine spacing, surface contrast, and accent treatment so it feels tied to the new hero
- maintain readability and easy copy interaction

Design direction:

- calmer than the hero
- still branded
- visually supportive, not louder than the hero

---

### Phase 8: Accessibility and Motion Safety

#### [MODIFY] `style.css`
#### [MODIFY] `landing-effects.js`

Required safeguards:

- icon rain container is decorative and `aria-hidden`
- pointer events disabled on the rain layer
- `prefers-reduced-motion: reduce`
  - either disable animation and show a faint static icon field
  - or disable the rain entirely
- text contrast must remain strong against the animated background
- mobile layout must preserve CTA tap clarity and avoid visual clutter

Recommendation:

- reduced-motion mode should prefer a static background over full removal, unless the static field still harms readability

---

## Files In Scope

- [index.html](../index.html)
- [style.css](../style.css)
- [main.js](../main.js)
- [icon-rain-mockup.html](../icon-rain-mockup.html)
- [landing-effects.js](../landing-effects.js) (new)

---

## Verification Plan

### Required Checks

1. `npm run build`
2. `npm run dev`

### Browser Verification

1. Load the landing page and verify the hero fills the viewport with the icon rain active.
2. Verify the hero matches the mockup mood while using the site's orange theme.
3. Verify the hero text stays readable at all times.
4. Verify the rain streams upward smoothly and does not appear jittery.
5. Verify there is no controls panel in production.
6. Verify the feature-card grid is gone from the landing sequence.
7. Verify the `Works with any AI coding agent` section still appears directly below the hero.
8. Verify the MCP copy button and docs link still work.
9. Click the hero CTA and confirm the landing bundle dismisses correctly.
10. After dismissal, confirm the rain is removed and no longer animating.
11. Refresh with the landing already dismissed and confirm the rain does not initialize.
12. Resize the window and confirm the rain rebuilds cleanly while visible.

### Mobile Verification

1. Verify density is lower but the visual effect remains recognizable.
2. Verify the hero CTA remains obvious and easy to tap.
3. Verify stats wrap cleanly.
4. Verify the MCP section remains readable and uncluttered.

### Accessibility Verification

1. Enable `prefers-reduced-motion` and confirm the animated version does not run.
2. Verify focusable landing controls retain clear focus states.
3. Verify decorative rain elements are not surfaced to assistive technology.

### Performance Verification

1. Record a short performance trace with the landing hero visible.
2. Confirm no obvious jank during steady-state animation.
3. Confirm resize rebuilds do not stall the page excessively.
4. Confirm dismissal tears down listeners and DOM used by the effect.

---

## Residual Risks

- a full-stage hero may reduce immediate explanatory copy, which can slightly delay comprehension for some users
- upward motion may read as floating rather than literal rain, but this is acceptable because it matches the approved visual
- low-end mobile devices may still need additional density reduction after real-device testing
- removing the feature-card grid may require later follow-up if stakeholders want more product proof above the fold

---

## Recommended Delivery Order

1. Implement hero structure and remove the feature grid.
2. Add the visual rain layer and hero styling.
3. Add the isolated landing-effects module.
4. Wire dismiss / teardown lifecycle.
5. Refine the MCP section styling.
6. Run browser, mobile, motion, and performance verification.

This keeps the visual foundation in place before adding the moving parts.
