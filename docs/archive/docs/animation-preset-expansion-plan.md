# Motion Lab: Animation Preset Expansion Plan

## Current State Audit

**10 presets** across 4 quadrants (defined in `store.js` PRESETS object, line 3964):

| Quadrant | Current Presets | Count |
|---|---|---|
| Motion (top) | Bounce, Float, Shake | 3 |
| Transform (left) | Spin, Pulse, Pop | 3 |
| Effects (right) | Fade | 1 |
| Saved (bottom) | Sparkle, Swing, Jitter | 3 |

**Target: ~20 per category = ~60 total** (excluding Saved/My Animations which is user-generated).

---

## Proposed Category Restructure

Replace the 4-quadrant spatial layout with a scrollable category panel that scales to 20+ presets per section.

### Category A: Entrances (20 presets)

Animations that bring the icon into view. Start from invisible/off-stage, end at resting state.

| # | Name | Technique | Keyframe Summary | Easing |
|---|---|---|---|---|
| 1 | **Fade In** | opacity 0->1 | `0%{opacity:0} 100%{opacity:1}` | ease-in-out |
| 2 | **Scale Up** | scale(0)->scale(1) | `0%{scale(0)} 60%{scale(1.05)} 100%{scale(1)}` | ease-out |
| 3 | **Slide Up** | translateY(20px)->0 + opacity | From below with fade | ease-out |
| 4 | **Slide Down** | translateY(-20px)->0 + opacity | From above with fade | ease-out |
| 5 | **Slide Left** | translateX(20px)->0 + opacity | From right with fade | ease-out |
| 6 | **Slide Right** | translateX(-20px)->0 + opacity | From left with fade | ease-out |
| 7 | **Pop In** | scale(0.3)->scale(1.1)->scale(1) | Spring overshoot entrance | cubic-bezier(.68,-.55,.27,1.55) |
| 8 | **Drop In** | translateY(-30px)->bounce->settle | Falls in with bounce on land | ease-out |
| 9 | **Flip In X** | rotateX(-90deg)->0 + opacity | Horizontal flip reveal | ease-out |
| 10 | **Flip In Y** | rotateY(-90deg)->0 + opacity | Vertical flip reveal | ease-out |
| 11 | **Zoom In** | scale(3)->scale(1) + opacity | Large to normal with fade | ease-out |
| 12 | **Rotate In** | rotate(-180deg)->0 + scale(0)->1 | Spiral entrance | ease-out |
| 13 | **Unfold** | scaleY(0)->1 with origin bottom | Unfolds vertically from base | ease-out |
| 14 | **Ink Bleed** | scale(0) + blur(6px)->blur(0) | Ink spreading on paper | ease-out |
| 15 | **Typewriter** | clip-path inset(0 100% 0 0)->inset(0) | Left-to-right reveal | linear |
| 16 | **Stagger Rise** | per-element translateY(10px)->0 with delay | Elements rise one by one | ease-out |
| 17 | **Elastic In** | scale(0)->scale(1) with spring bounce | Elastic spring entrance | cubic-bezier(.175,.885,.32,1.275) |
| 18 | **Shutter Open** | clip-path inset(50% 0)->inset(0) | Opens from center horizontally | ease-out |
| 19 | **Swirl In** | rotate(360deg) + scale(0)->1 + opacity | Tornado entrance | ease-out |
| 20 | **Rise & Glow** | translateY(10px)->0 + drop-shadow glow | Rises with golden glow | ease-out |

---

### Category B: Attention Seekers (20 presets)

Looping or triggered animations for icons already visible. Draw attention, provide feedback.

| # | Name | Technique | Keyframe Summary | Easing |
|---|---|---|---|---|
| 1 | **Pulse** | scale(1)->scale(1.15)->scale(1) | Rhythmic breathing | ease-in-out |
| 2 | **Bounce** | translateY 4-step with overshoot | Ball bounce | ease-out |
| 3 | **Shake** | translateX oscillation damping | Horizontal rattle | ease-out |
| 4 | **Spin** | rotate(0)->rotate(360deg) | Full rotation | linear |
| 5 | **Float** | translateY(0)->(-4px)->0 | Gentle levitation | ease-in-out |
| 6 | **Swing** | rotate 0->15deg->-15deg->0 | Pendulum from top | ease-in-out |
| 7 | **Jitter** | translate(2px,-2px) random pattern | Nervous vibration | linear |
| 8 | **Sparkle** | drop-shadow golden pulse | Glowing highlight | ease-in-out |
| 9 | **Rubber Band** | scaleX(1.15)->scaleX(0.9)->settle | Horizontal stretch-snap | ease-out |
| 10 | **Jelly** | skewX + scaleY alternating 6 steps | Gelatin wobble | linear |
| 11 | **Heartbeat** | scale(1)->1.15->1->1.1->1 double thump | Cardiac rhythm | ease-in-out |
| 12 | **Wobble** | rotate -5deg->5deg->-3deg->3deg->0 | Off-balance rocking | ease-in-out |
| 13 | **Neon Glow** | drop-shadow cycling intensity + color | Neon sign pulsing | ease-in-out |
| 14 | **Breathe** | scale(1)->scale(1.03) very slow (4s) | Zen ambient rhythm | ease-in-out |
| 15 | **Tilt** | rotate(0)->rotate(10deg)->rotate(0) | Quick tilt and return | ease-in-out |
| 16 | **Flash** | opacity 1->0->1->0->1 rapid | Flash attention | linear |
| 17 | **Knock** | translateX(0)->(-3px)->0 single sharp | Door knock motion | ease-out |
| 18 | **Ring** | rotateZ oscillation with decreasing amplitude | Bell ringing | ease-out |
| 19 | **Glitch** | translateX jitter + opacity flicker + scale micro-shifts | Digital glitch | step-end |
| 20 | **Magnetic** | scale(1.08) + translateY(-2px) on hover | Magnetic pull | cubic-bezier(.25,.46,.45,.94) |

---

### Category C: Exits (20 presets)

Animations that take the icon out of view. Inverse of entrances.

| # | Name | Technique | Keyframe Summary | Easing |
|---|---|---|---|---|
| 1 | **Fade Out** | opacity 1->0 | Simple disappear | ease-in-out |
| 2 | **Scale Down** | scale(1)->scale(0) | Shrink to nothing | ease-in |
| 3 | **Slide Out Up** | translateY(0)->(-20px) + opacity->0 | Exit upward | ease-in |
| 4 | **Slide Out Down** | translateY(0)->(20px) + opacity->0 | Exit downward | ease-in |
| 5 | **Slide Out Left** | translateX(0)->(-20px) + opacity->0 | Exit left | ease-in |
| 6 | **Slide Out Right** | translateX(0)->(20px) + opacity->0 | Exit right | ease-in |
| 7 | **Pop Out** | scale(1)->scale(1.1)->scale(0) | Spring exit | ease-in |
| 8 | **Float Away** | translateY(0)->(-30px) + opacity->0 | Gentle rise and vanish | ease-in |
| 9 | **Flip Out X** | rotateX(0)->90deg + opacity->0 | Horizontal flip exit | ease-in |
| 10 | **Flip Out Y** | rotateY(0)->90deg + opacity->0 | Vertical flip exit | ease-in |
| 11 | **Zoom Out** | scale(1)->scale(3) + opacity->0 | Expand and vanish | ease-in |
| 12 | **Spiral Out** | rotate(0)->180deg + scale(1)->0 | Spiral exit | ease-in |
| 13 | **Fold** | scaleY(1)->0 with origin bottom | Folds vertically to base | ease-in |
| 14 | **Dissolve** | per-element translate outward + opacity->0 | Scatter dissolution | ease-out |
| 15 | **Shutter Close** | clip-path inset(0)->inset(50% 0) | Closes from edges to center | ease-in |
| 16 | **Shrink & Blur** | scale(1)->0.5 + blur(0)->blur(6px) | Blur while shrinking | ease-in |
| 17 | **Collapse** | scaleX(1)->0 with origin center | Horizontal collapse | ease-in |
| 18 | **Sink** | translateY(0)->(15px) + scale(1)->0.8 + opacity->0 | Heavy sinking motion | ease-in |
| 19 | **Vortex** | rotate(0)->720deg + scale(1)->0 + opacity->0 | Fast spiral vanish | ease-in |
| 20 | **Twinkle Out** | drop-shadow glow peak + scale->0 | Flash of light then gone | ease-in |

---

## Implementation Details

### Data Structure Changes

The current `PRESETS` object is flat. Restructure to categorized:

```javascript
const PRESETS = {
  entrances: {
    fadeIn: { keyframes: [...], easing: '...' },
    scaleUp: { keyframes: [...], easing: '...' },
    // ... 18 more
  },
  attention: {
    pulse: { keyframes: [...], easing: '...' },
    bounce: { keyframes: [...], easing: '...' },
    // ... 18 more
  },
  exits: {
    fadeOut: { keyframes: [...], easing: '...' },
    scaleDown: { keyframes: [...], easing: '...' },
    // ... 18 more
  }
};
```

### UI Layout Changes

Replace 4-quadrant spatial layout with vertical scrollable sections:

```
+-- Preset Panel (left of preview) -------+
| ENTRANCES                          (20)  |
| [Fade In] [Scale Up] [Slide Up] ...     |
|                                          |
| ATTENTION                          (20)  |
| [Pulse] [Bounce] [Shake] [Spin] ...     |
|                                          |
| EXITS                              (20)  |
| [Fade Out] [Scale Down] [Slide Up] ...  |
|                                          |
| MY ANIMATIONS                   (user)   |
| [Elastic Jelly] [Cyber Glitch] ...       |
| (populated from Supabase)                |
+------------------------------------------+
```

### Migration Path

1. Move existing 10 presets into the correct categories:
   - `bounce`, `float`, `shake` -> Attention
   - `spin`, `pulse`, `pop` -> Attention (spin could also be Entrances)
   - `fade` -> Entrances (rename to Fade In, add Fade Out to Exits)
   - `sparkle`, `swing`, `jitter` -> Attention
2. Implement 50 new presets (10 more Entrances, 10 more Attention, 20 Exits)
3. Update HTML template: quadrant layout -> scrollable section layout
4. Update preset engine to read category structure

### Icon Mapping

Each preset button needs a Material Symbols icon. Here are the icon assignments:

**Entrances:**
- fade_in: gradient, scale_up: zoom_in, slide_up: arrow_upward
- slide_down: arrow_downward, pop_in: open_in_full, drop_in: downloading
- flip_in_x: flip, zoom_in: zoom_in_map, rotate_in: rotate_right
- ink_bleed: water_drop, typewriter: terminal, stagger_rise: stacked_line_chart

**Attention:**
- pulse: radio_button_checked, bounce: arrow_upward, shake: vibration
- spin: rotate_right, float: cloud, swing: sync_alt
- sparkle: auto_awesome, jitter: electric_bolt, rubber_band: expand
- jelly: water, heartbeat: favorite, wobble: trending_flat

**Exits:**
- fade_out: gradient, scale_down: zoom_out, slide_out_up: arrow_upward
- pop_out: close_fullscreen, float_away: cloud_upload
- dissolve: blur_on, shrink_blur: compress, vortex: cyclone

---

## Verification Plan

### Phase 1: Implement presets (no UI change)
- Add all 60 preset keyframe definitions to PRESETS object
- Verify each animation plays correctly with loop trigger
- Verify each animation plays correctly with hover trigger
- Check performance: no layout thrash, smooth 60fps

### Phase 2: UI restructure
- Replace quadrant layout with scrollable category sections
- Verify scroll doesn't affect canvas area
- Test with 10+ saved My Animations
- Verify responsive behavior at different panel widths

### Phase 3: Visual polish
- Each category header is collapsible (accordion)
- Active preset button highlighted with orange border
- Hover preview: hovering a preset briefly plays it on the icon
