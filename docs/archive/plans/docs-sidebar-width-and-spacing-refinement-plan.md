Date: April 13, 2026
Status: Proposed
Scope: Tighten the docs sidebar width, left spacing, and header treatment so it feels closer to the main app sidebar

Depends on:
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

## Goal

Make the docs sidebar feel less roomy and more aligned with the main app sidebar.

The user-facing goals are:

1. reduce the empty space to the left of the docs sidebar
2. reduce the overall width of the docs sidebar
3. make the docs sidebar follow the same width logic as the main app sidebar
4. remove the extra helper line under `Documentation`

This is a layout refinement, not a navigation rewrite.

## Investigation Summary

The current docs sidebar feels too wide for three concrete reasons:

### 1. The docs shell uses a wider, more editorial layout than the main app

Current rule:

- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):7183

```css
.docs-view--site .docs-shell {
  display: grid;
  grid-template-columns: minmax(210px, 248px) minmax(0, 1fr);
  gap: 40px;
  max-width: 1180px;
  margin: 0 auto;
}
```

Why this feels off:

- the main app already has a canonical sidebar width token:
  - [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):79
  - `--si-sidebar-width: 240px;`
- the docs sidebar is allowed to grow to `248px`
- the `40px` gap to content makes the sidebar read even wider than it is
- the centered `max-width: 1180px` layout creates extra dead space on the left that the main app does not have

### 2. The docs view adds its own horizontal page padding before the sidebar even starts

Current rule:

- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):7179

```css
.docs-view--site {
  padding: 0 28px 64px;
}
```

Why this feels off:

- that `28px` padding is added before the sidebar content
- combined with the centered docs shell, it increases the left-side air noticeably

### 3. The sidebar header has an extra text block that increases visual bulk

Current markup:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):5459

```html
<p class="docs-shell__sidebar-copy">Setup guides and product reference.</p>
```

Why this feels off:

- the docs header already has:
  - the global Supericons logo and brand in the top header
  - the `Documentation` home label inside the docs sidebar
- the helper line adds height and visual weight without adding much new information

### 4. The docs nav also has slightly generous internal rhythm

Current rules:

- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):7197
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):7464
- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css):7516

Notable values today:

- sidebar gap: `20px`
- group gap: `8px`
- link left inset: `12px`

These are not individually wrong, but together they make the docs nav feel looser than the main app sidebar.

## Proposed Fix

## Fix 1: Use the main sidebar width token for the docs sidebar

Change the docs grid from:

```css
grid-template-columns: minmax(210px, 248px) minmax(0, 1fr);
gap: 40px;
```

to:

```css
grid-template-columns: var(--si-sidebar-width) minmax(0, 1fr);
gap: 24px;
```

Why:

- `var(--si-sidebar-width)` is already the main app sidebar width
- `24px` matches the existing spacing scale better than `40px`
- this is the cleanest way to make the docs sidebar feel like part of the same product system

## Fix 2: Reduce the extra horizontal padding around the docs shell

Change:

```css
.docs-view--site {
  padding: 0 28px 64px;
}
```

to:

```css
.docs-view--site {
  padding: 0 20px 64px;
}
```

Why:

- keeps some breathing room
- reduces the perceived left-side gap
- avoids the harsher look of pushing the docs shell fully flush to the viewport edge

### Note

This is the safe first pass.

If the docs sidebar still feels too detached after that, the stronger alignment option would be:

- remove the horizontal padding entirely
- give the docs sidebar its own internal left padding based on the main sidebar rhythm

That is a bigger visual change and should not be the first move.

## Fix 3: Remove the sidebar helper line under `Documentation`

Delete this markup from [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

```html
<p class="docs-shell__sidebar-copy">Setup guides and product reference.</p>
```

Why:

- it is no longer needed
- it adds vertical bulk
- the sidebar reads more cleanly with just the `Documentation` home link

## Fix 4: Tighten the internal sidebar rhythm slightly

Recommended adjustments:

### Sidebar stack gap

Change:

```css
.docs-view--site .docs-shell__sidebar {
  gap: 20px;
}
```

to:

```css
.docs-view--site .docs-shell__sidebar {
  gap: 16px;
}
```

### Group spacing

Change:

```css
.docs-view--site .docs-shell__nav-group {
  gap: 8px;
  padding-bottom: 8px;
}
```

to:

```css
.docs-view--site .docs-shell__nav-group {
  gap: 6px;
  padding-bottom: 6px;
}
```

### Link left inset

Change:

```css
.docs-view--site .docs-shell__nav-link {
  padding: 8px 0 8px 12px;
}
```

to:

```css
.docs-view--site .docs-shell__nav-link {
  padding: 8px 0 8px 8px;
}
```

Why:

- this makes the nav feel more compact
- it reduces the impression that the link text is floating too far from the left edge
- it keeps the active border and gradient treatment intact

## Recommended Implementation Order

1. Remove the helper line under `Documentation`
2. Switch docs sidebar width to `var(--si-sidebar-width)`
3. Reduce docs shell gap from `40px` to `24px`
4. Reduce docs page horizontal padding from `28px` to `20px`
5. Tighten internal sidebar spacing
6. Verify desktop and mobile docs layout

## Why This Is The Right First Pass

This plan is intentionally conservative.

It fixes the real causes of the “too wide” feeling without:

- rewriting the docs layout
- changing the docs navigation structure
- introducing new sidebar chrome
- breaking mobile behavior

It also uses existing design-system values instead of inventing docs-only width logic.

## Files To Change

- [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

## Verification

This pass is complete only if:

1. the docs sidebar visually feels closer to the main app sidebar
2. the left-side gap is noticeably reduced
3. the docs sidebar width matches the main sidebar width token
4. the `Documentation` helper line is gone
5. the docs nav still reads clearly and remains easy to click
6. mobile stacking still works
7. `npm run build` passes

## Bottom Line

The docs sidebar feels too wide because the docs layout is currently using:

- a slightly oversized sidebar column
- an overly large gap to content
- extra horizontal padding
- an unnecessary helper line

The best fix is to bring the docs sidebar back onto the same width token and tighter spacing system the main app already uses.
