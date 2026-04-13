# Docs Mobile And Tablet Sidebar Toggle Implementation Plan

Scope: Make the docs sidebar behave like a dismissible mobile/tablet navigation drawer instead of rendering inline below the content, with the entry point in the top-left header position.

## Problem Statement

The current docs shell works well on desktop, but it breaks down on smaller viewports:
- the docs sidebar still renders in the page flow on mobile and tablet widths
- the content appears first, then the full navigation stack appears below it
- this pushes useful reading space down the page and makes the docs feel long, crowded, and harder to scan
- the user expectation for this layout is a top-left menu toggle, not a permanently expanded navigation block

The screenshots match the current implementation:
- on narrower screens, the article remains primary
- the full docs nav is still mounted inline underneath the article
- the header's existing top-left menu button is explicitly hidden in docs view, so there is no compact navigation entry point

## Repo-Grounded Current State

### 1. The docs shell already has a dedicated sidebar

In [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:5449), the docs view renders a dedicated shell with:
- `.docs-shell`
- `.docs-shell__sidebar`
- `.docs-shell__content`

That means this is not a structural rewrite. The sidebar already exists as its own mountable region.

### 2. The responsive breakpoint already switches docs to one column

In [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css:7864), the docs layout changes at `max-width: 960px`:
- `.docs-shell` becomes `grid-template-columns: 1fr`
- `.docs-shell__content` becomes order `1`
- `.docs-shell__sidebar` becomes order `2`
- the sidebar becomes `position: static`

This is the direct reason the navigation shows up as a long inline block after the article instead of behaving like a drawer.

### 3. The app already has a top-left mobile menu button

In [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html:165), the header already includes `#sidebarToggle`.

In [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:938), that button already drives sidebar open/close behavior for the main app sidebar.

In [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css:7163), docs view explicitly hides:
- `.sidebar`
- `.panel`
- `#panelToggle`
- `#sidebarToggle`

So the product already reserves the correct top-left affordance, but docs currently suppresses it.

### 4. Existing docs planning already expected a mobile drawer/menu

[docs-full-section-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/docs-full-section-implementation-plan.md:240) already states the intended mobile behavior:
- top navigation remains visible
- docs sidebar becomes a drawer or menu
- page content remains the primary focus

So this plan is aligning the live implementation with the earlier docs architecture, not inventing a new UX direction.

## Recommended UX Direction

Use the existing header's top-left menu button as the docs navigation toggle on smaller docs viewports.

Why this is the best fit:
- it matches the user's expectation in the screenshots
- it avoids adding a second competing toggle inside the docs page content
- it uses the same header position the app already reserves for mobile navigation
- it keeps the search field, theme toggle, and account control in their current positions
- it preserves the desktop docs layout without reworking the page structure

## Recommended Behavior

### Desktop

For widths above the docs mobile breakpoint:
- keep the current sticky left docs sidebar
- keep the current two-column docs shell
- keep the header menu button hidden in docs view

### Mobile And Smaller Tablet Widths

For widths at or below the docs mobile breakpoint:
- hide the docs sidebar by default
- show the header's top-left menu button in docs view
- tapping the button opens the docs sidebar as a left-side overlay drawer
- the drawer sits below the site header and above the docs content
- a backdrop dims the page and closes the drawer on tap
- the drawer can be closed by:
  - tapping the menu button again
  - tapping the backdrop
  - pressing `Escape`
  - choosing a docs destination
  - resizing back above the mobile breakpoint

### Drawer Contents

The drawer should keep the current docs sidebar structure:
- Documentation home link
- grouped docs navigation
- current active page state
- current open-group state

This should be a presentation change, not a navigation rewrite.

## Recommended Breakpoint Decision

Use the existing docs responsive breakpoint at `960px` for the first implementation pass.

Reasoning:
- the docs shell already switches into the problematic one-column state at `960px`
- this keeps the change contained and low-risk
- it preserves the desktop sidebar on wider tablet landscape widths where the two-column layout still has room

If later QA shows the docs still feel cramped on a wider tablet width, we can revisit the breakpoint after the first drawer version lands.

## Interaction Rules

### Header Toggle

When docs is active on small screens:
- `#sidebarToggle` becomes visible
- its tooltip, title, and `aria-label` should read `Docs navigation` when closed
- `aria-controls` should point at the docs drawer region
- `aria-expanded` should reflect open state

Optional polish:
- switch the icon from `menu` to `close` while the drawer is open

### Drawer State

The docs drawer open state should be separate from:
- main app library sidebar open state
- docs group collapse/expand state

The existing local-storage-backed group expansion state should remain unchanged. The new drawer open state should be transient, not permanently persisted.

### Route Changes

When a docs nav link, pager link, or search result opens another docs page on mobile/tablet:
- navigate as normal
- close the drawer immediately after the route change starts or completes

This prevents the next page from rendering behind an already-open nav.

### Focus And Accessibility

Minimum accessibility behavior:
- focus should move into the drawer when it opens
- `Escape` closes the drawer
- focus returns to the menu button when the drawer closes
- the backdrop should not trap clicks behind it
- body/page scroll should not continue underneath the drawer on mobile

This does not require a full modal framework, but it should behave like an accessible overlay rather than a visually shifted block.

## Implementation Plan

### Batch 1: Add Docs Drawer State And Header Toggle Routing

Files:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)

Tasks:
- add a docs-specific open/close state helper
- give the docs sidebar a stable `id` so the header button can control it
- route `#sidebarToggle` to docs drawer behavior when the current view is docs-related
- keep existing icon-sidebar behavior unchanged for the main app
- close the docs drawer on docs navigation actions and breakpoint changes

### Batch 2: Convert The Small-Screen Sidebar Into An Overlay Drawer

File:
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

Tasks:
- stop rendering the docs sidebar as inline order `2` content at `max-width: 960px`
- position the sidebar as a fixed or absolute overlay drawer under the header
- add a backdrop/scrim layer
- restore the header menu button for docs view at the same breakpoint
- lock background scroll while the drawer is open
- keep desktop sticky-sidebar styles untouched above the breakpoint

### Batch 3: Accessibility And Interaction Hardening

Files:
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js)

Tasks:
- set `aria-expanded` and `aria-controls` correctly
- add `Escape` close handling
- return focus to the toggle on close
- ensure docs search result navigation also closes the drawer
- verify no conflict with existing docs group collapse state

## Files Most Likely To Change

- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css:7864)
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css:7163)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:5373)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:5449)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:397)
- [main.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:938)
- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html:165)

## Verification Checklist

### Mobile

At narrow phone widths:
- the docs page content loads without the full sidebar inline underneath it
- the top-left menu button is visible
- tapping it opens the docs drawer
- tapping a docs link closes the drawer and updates the page
- tapping outside the drawer closes it
- `Escape` closes it when a keyboard is attached

### Tablet Portrait

At common portrait tablet widths:
- the docs drawer pattern still feels intentional and not cramped
- the header search field remains usable
- theme and account controls remain accessible

### Tablet Landscape

At wider tablet landscape widths:
- the desktop two-column docs layout still works if the viewport is above the breakpoint
- no accidental overlay behavior appears where the sticky rail still has enough room

### Regression Checks

- docs group collapse state still persists correctly
- docs search still works
- pager navigation still works
- scroll action buttons still stay above the footer
- the main app icon sidebar still behaves correctly outside docs view

## Success Standard

This work is complete when:
- the docs sidebar no longer renders as a long inline block on mobile/tablet widths where it should be compact
- docs navigation is entered from the top-left header toggle on smaller screens
- the drawer behavior feels consistent with the rest of the app shell
- desktop docs behavior is unchanged
- the mobile/tablet docs experience feels launch-safe instead of obviously unfinished
