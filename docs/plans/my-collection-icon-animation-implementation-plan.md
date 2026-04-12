# My Collection Icon Animation Implementation Plan

Date: April 12, 2026
Status: Approved for implementation
Owner: Supericons
Scope: Sidebar icon animation for "My Collection" item only

Reference mockup: `docs/my-collection-icon-mockup.html` (Version 1)

---

## Problem Statement

The "My Collection" sidebar item currently uses a plain Material Symbols `<span>` glyph (`folder_special`). Every other sidebar item uses a custom inline SVG with per-element CSS keyframe animations. The "My Collection" item is the only one that is unanimated and visually inconsistent with its neighbors.

## Chosen Direction

Version 1: Existing folder shape with cascading sparkle crosses on hover.

The sparkles represent: this is your personal curated collection - items that shine.

---

## Choreography Design

### Meaning-to-Motion

```
Icon:        My Collection (personal curated folder)
Real Object: A folder holding precious/starred items
Verb:        Shines and glitters when you look at it
Motion:      Folder pulses with pride; sparkle crosses ignite
             across the top in a left-to-right cascade
```

### Pattern

Pattern B (Cascade): sparkles ignite left-to-right in spatial order.

### Element Sequence

| Element | Delay | Duration | What it does |
|---|---|---|---|
| `v1-folder-body` | 0ms | 700ms | Subtle 1.07x scale pride pulse (spring easing) |
| `v1-spark-1` | 0ms | 700ms | Left sparkle cross ignites, peaks at 20%, fades out |
| `v1-spark-2` | 120ms | 700ms | Center sparkle, slightly taller cross |
| `v1-spark-3` | 240ms | 700ms | Right sparkle, cascade complete |

### Easing

- Folder body: `var(--si-ease-spring)` - physical, pride-swell feel
- Sparkles: `var(--si-ease-out)` - decelerate in (flash ignites fast), accelerate out (light fades)

### Total sequence duration

700ms. Under the 800ms bespoke choreography limit.

---

## SVG Structure

The new SVG uses named `<g>` groups following the exact same pattern as every other sidebar icon in `sidebar-icons.js`.

```xml
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round"
     class="sidebar-icon sidebar-icon--my-collection" aria-hidden="true">

  <!-- Folder body: clean two-part folder (tab + body as one path) -->
  <g class="v1-folder-body">
    <path d="M4 9 L4 19 Q4 20 5 20 L19 20 Q20 20 20 19 L20 9 Q20 8 19 8 L12.5 8 Q12 8 11.5 7.5 L10.5 6 Q10 5 9.5 5 L5 5 Q4 5 4 6 L4 9 Z"/>
  </g>

  <!-- Spark 1: top-left, 4-point cross -->
  <g class="v1-spark-1">
    <line x1="6" y1="3.5" x2="6" y2="7" stroke-width="1.2"/>
    <line x1="4.25" y1="5.25" x2="7.75" y2="5.25" stroke-width="1.2"/>
    <line x1="4.8" y1="3.8" x2="7.2" y2="6.7" stroke-width="0.7" opacity="0.5"/>
    <line x1="7.2" y1="3.8" x2="4.8" y2="6.7" stroke-width="0.7" opacity="0.5"/>
  </g>

  <!-- Spark 2: top-center, slightly larger -->
  <g class="v1-spark-2">
    <line x1="12" y1="1.5" x2="12" y2="5.5" stroke-width="1.3"/>
    <line x1="10" y1="3.5" x2="14" y2="3.5" stroke-width="1.3"/>
    <line x1="10.5" y1="2" x2="13.5" y2="5" stroke-width="0.75" opacity="0.5"/>
    <line x1="13.5" y1="2" x2="10.5" y2="5" stroke-width="0.75" opacity="0.5"/>
  </g>

  <!-- Spark 3: top-right -->
  <g class="v1-spark-3">
    <line x1="18" y1="3.5" x2="18" y2="7" stroke-width="1.2"/>
    <line x1="16.25" y1="5.25" x2="19.75" y2="5.25" stroke-width="1.2"/>
    <line x1="16.8" y1="3.8" x2="19.2" y2="6.7" stroke-width="0.7" opacity="0.5"/>
    <line x1="19.2" y1="3.8" x2="16.8" y2="6.7" stroke-width="0.7" opacity="0.5"/>
  </g>

</svg>
```

---

## CSS to Add

Add this entire block to `style.css` immediately after the existing Collections animation block (ends at approximately line 1418).

```css
/* ── My Collection icon ────────────────────────────────────────────
   Story: folder glows with pride (0ms), three sparkle crosses
          ignite left-to-right (0ms, 120ms, 240ms stagger),
          each flashing in and fading out like light off precious items.
   Pattern: B (Cascade) - spatial left-to-right order.
   Easing: spring for folder body, ease-out for sparkles.
   ──────────────────────────────────────────────────────────────── */

.sidebar-icon--my-collection .v1-folder-body {
  transform-origin: center;
  transform-box: fill-box;
}

.sidebar-icon--my-collection .v1-spark-1,
.sidebar-icon--my-collection .v1-spark-2,
.sidebar-icon--my-collection .v1-spark-3 {
  transform-box: fill-box;
  opacity: 0;
}

.sidebar-icon--my-collection .v1-spark-1 { transform-origin: 6px 5px;  }
.sidebar-icon--my-collection .v1-spark-2 { transform-origin: 12px 4px; }
.sidebar-icon--my-collection .v1-spark-3 { transform-origin: 18px 5px; }

.sidebar__item:hover .sidebar-icon--my-collection .v1-folder-body {
  animation: mc-folder-glow 700ms var(--si-ease-spring) infinite;
}

.sidebar__item:hover .sidebar-icon--my-collection .v1-spark-1 {
  animation: mc-sparkle 700ms var(--si-ease-out) 0ms infinite;
}

.sidebar__item:hover .sidebar-icon--my-collection .v1-spark-2 {
  animation: mc-sparkle 700ms var(--si-ease-out) 120ms infinite;
}

.sidebar__item:hover .sidebar-icon--my-collection .v1-spark-3 {
  animation: mc-sparkle 700ms var(--si-ease-out) 240ms infinite;
}

@keyframes mc-folder-glow {
  0%   { transform: scale(1); }
  25%  { transform: scale(1.07); }
  60%  { transform: scale(0.98); }
  100% { transform: scale(1); }
}

@keyframes mc-sparkle {
  0%   { opacity: 0;   transform: scale(0.4) rotate(0deg); }
  20%  { opacity: 1;   transform: scale(1.2) rotate(15deg); }
  45%  { opacity: 0.7; transform: scale(0.9) rotate(-5deg); }
  70%  { opacity: 0.3; transform: scale(1.05) rotate(8deg); }
  100% { opacity: 0;   transform: scale(0.4) rotate(0deg); }
}
```

Note: the reduced-motion block already at line ~1507 covers this icon automatically via the wildcard `.sidebar-icon *` selector. No additional reduced-motion rule is needed.

---

## Files to Change

### 1. `sidebar-icons.js`

**Change:** Replace the `my-downloads` key value (currently a `<span class="material-symbols-outlined">folder_special</span>`) with the new SVG markup.

**Important:** Confirm the key name used in `main.js` when rendering this sidebar item before changing. The key in `sidebar-icons.js` must match the key passed to `renderSidebarIconSlot()` or `hydrateSidebarIconSlot()` in `main.js`. If the key is `my-downloads`, update the SVG under that key. If it is `my-collection`, add a new key. Do not rename existing keys without checking all call sites.

### 2. `style.css`

**Change:** Add the CSS block above directly after the Collections animation block, which ends at approximately line 1418 with the `v3-fan-bot` keyframe closing brace.

---

## Files Not Changing

- `mcp/` directory - no MCP changes
- `main.js` - no logic changes (only the icon slot key lookup, which is already wired)
- Any other sidebar entry

---

## Acceptance Signals

- "My Collection" sidebar item displays a recognizable folder shape at rest
- On hover, three sparkle crosses ignite left-to-right and fade out within 700ms
- The folder body gives a subtle pride-pulse scale
- The animation loops while hovered and stops immediately on mouse-out
- The icon reads clearly at 18px (the sidebar `sidebar__item-icon` size)
- `npm run build` still passes after the change
- `npm --prefix mcp run verify:package` still passes

---

## Verification

1. Open the app locally with `npm run dev`
2. Navigate to the sidebar and find "My Collection"
3. Hover the row and confirm the sparkle cascade fires left-to-right
4. Move mouse away and confirm animation stops
5. Check the active (selected) state: icon should glow faintly via the existing `.sidebar__item.active .sidebar__item-icon` opacity rule
6. Confirm no regression on neighboring items (Collections, Pricing, etc.)

---

## Open Questions

1. Is the sidebar key `my-downloads` or `my-collection`? Check `main.js` for the `renderSidebarIconSlot` or `hydrateSidebarIconSlot` call that renders this row before editing `sidebar-icons.js`.
2. Should the sparkle color follow `currentColor` (inherits from the sidebar item text color, including orange in active state) or be fixed? Current plan: `currentColor` - this means in the active state the sparkles appear in the brand orange, which is a nice bonus.
