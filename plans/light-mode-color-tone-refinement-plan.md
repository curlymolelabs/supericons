# Light Mode Color Tone Refinement Plan

## Problem Statement

- User need:
  - keep the current UI layout intact while making light mode feel cleaner, sharper, and more balanced
- Jobs to be done:
  - improve light-mode contrast without reworking the existing interface
  - make the customize preview pane feel visually consistent with the icon cards
  - reduce the washed-out light orange cast so pricing and premium screens feel more professional
- Current issues:
  - the light theme uses a warm beige stack that can make the app look muddy instead of crisp
  - the customize preview background is darker and warmer than the nearby icon-card surface, which makes icon contrast feel uneven
  - some premium and pricing surfaces look sterile in one place and too tinted in another, so the overall tone feels inconsistent

## Scope

- In scope:
  - light-mode color tokens
  - surface fills
  - borders and dividers
  - text and muted-text contrast
  - panel, card, and pricing tone balance
  - hover, active, selected, and badge color tuning
- Explicitly out of scope:
  - layout changes
  - spacing changes
  - DOM structure changes
  - control regrouping
  - animation behavior changes
  - dark-mode redesign

## Constraints And Safety Rules

- Do not change component hierarchy or markup just to support the color refresh.
- Prefer token changes in `body.theme-light` first, then use a small number of targeted overrides only where necessary.
- Keep premium protections, auth gating, exports, and panel state logic untouched.
- Avoid changing dimensions, padding, flex/grid rules, or breakpoint behavior.
- If a surface can be fixed through shared tokens, do that before introducing selector-specific overrides.

## Proposed UX Direction

- Keep the current UI structure exactly as it is.
- Shift light mode from warm beige-heavy layering toward a cleaner near-white surface system.
- Use white or near-white for truth-critical surfaces:
  - icon cards
  - customize preview pane
  - pricing cards
  - input surfaces
- Preserve brand warmth through:
  - accent color
  - subtle border tone
  - restrained shadow warmth
  - selective highlight fills on premium states
- Increase separation by using contrast through text, border, and surface depth instead of broad orange tinting.

## Color Strategy

### 1. Base Light Theme Tokens

- Rework the `body.theme-light` token ladder in `style.css` so the base surfaces are cleaner and less tan:
  - `--si-bg`
  - `--si-surface-dim`
  - `--si-surface`
  - `--si-surface-container`
  - `--si-surface-container-high`
  - `--si-surface-container-highest`
  - `--si-surface-container-lowest`
  - `--si-surface-bright`
- Keep enough tonal separation so cards, rails, and overlays still read as layered.
- Tighten text contrast by slightly darkening:
  - `--si-text`
  - `--si-text-muted`
  - `--si-text-dim`
- Rebalance borders so they stay visible on whiter surfaces without turning gray and cold:
  - `--si-outline`
  - `--si-outline-variant`
  - `--si-ghost-border`

### 2. Customize Preview Surface

- Align the light-mode preview background with the icon-card surface family instead of the warmer `surface-dim` treatment.
- Preferred direction:
  - white or a very soft white gradient close to the collection icon-card background
- Goal:
  - the preview should feel like a focused extension of the icon grid, not a separate tinted container

### 3. Pricing Tone Cleanup

- Keep the pricing layout and card structure unchanged.
- Retune only the colors and tone of:
  - `pricing-view`
  - `pricing-card`
  - `pricing-card--popular`
  - `pricing-card--launch`
  - `pricing-header`
  - `pricing-toggle`
  - `pricing-faq`
- Make default pricing cards cleaner and whiter.
- Reserve stronger accent tint for:
  - the primary plan
  - premium highlight states
  - call-to-action emphasis
- Reduce the feeling of flat sterility by relying on better hierarchy through text contrast and subtle shadow, not stronger background tint.

### 4. Existing Surface Families To Audit Together

- Header and search bar
- Main app background
- Standard icon grid cells
- Premium collection grid cells
- Customize panel shell
- Customize preview pane
- Pricing cards and pricing FAQ
- Badges:
  - purchased
  - owned
  - redeemed
  - locked

## Implementation Phases

### Phase 1: Token First Pass

- update the light-mode token block in `style.css`
- keep the same token names so existing components inherit the new tone without layout risk
- verify that standard screens improve before adding special-case overrides

### Phase 2: Targeted Surface Alignment

- add only the minimum selector-level overrides needed for places where shared tokens are not enough:
  - preview pane
  - pricing cards
  - selected premium cells
  - high-visibility badges
- make sure these overrides stay color-only

### Phase 3: Contrast And Accent Pass

- check readable contrast on:
  - body text
  - muted labels
  - icon strokes in light mode
  - buttons
  - badges
  - separators
- tune accent usage so orange remains focused on interaction and priority, not ambient background

### Phase 4: Regression Verification

- verify no layout or spacing changes occurred in:
  - collection detail
  - customize panel
  - pricing page
  - header and search
- verify selected and purchased states still stand out clearly in light mode
- verify premium preview icons remain truthful in original-color mode

## Gate Results

- Usability Heuristics:
  - `Pass` if the implementation stays color-only, because clarity improves without moving controls or changing learned layout patterns
- Accessibility Baseline:
  - `Pass with verification` if contrast is checked across text, icon strokes, buttons, and badges after the token update
- Adaptive And Responsive Behavior:
  - `Pass` because no layout or breakpoint changes are planned
- Trust And Safety Interaction Quality:
  - `Pass` because preserving existing structure reduces user confusion and lowers regression risk
- Consistency And Cognitive Load:
  - `Pass` because the refresh keeps the same UI model while making surface hierarchy more coherent

## Implementation Handoff Checklist

- update only light-mode tokens and color overrides
- keep all layout, spacing, and component structure unchanged
- make the customize preview pane visually match the icon-card surface family
- reduce beige/orange wash across the light theme
- improve pricing page contrast and tone without redesigning pricing layout
- preserve purchased, owned, redeemed, and locked state clarity
- preserve premium protections and entitlement behavior
- preserve current dark mode
- verify no selector changes accidentally affect layout metrics
- capture before/after checks for:
  - collection detail
  - customize panel
  - pricing page
  - header/search

## File Inventory

- `style.css`
- optionally `store.js` only if a very small theme-specific color dependency needs to stay synchronized with the new light-mode tokens

## Residual Risks

- Pushing too far toward pure white can make the product feel colder if accent usage is not rebalanced carefully.
- Some legacy overrides may still carry warmer values and can create inconsistency if they are not audited together.
- Badge colors that worked on beige surfaces may need small tuning on whiter cards to preserve legibility.

## Next Iteration Target

- implement the token and tone pass in `style.css`
- verify light mode on:
  - premium collection detail
  - customize panel
  - pricing page
  - general free-icon browsing
- if the first pass looks too cold, adjust accent restraint and border warmth rather than reintroducing beige surface fills
