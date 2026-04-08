# Canvas VM: Implementation Plan

Single source of truth for converting 400 premium icons from
DOM-visible SVG+CSS to protected Canvas2D rendering.

**References:**
- [PRD](file:///C:/Users/guanh/.gemini/antigravity/brain/08da55a0-8f08-487b-bf39-3e169d9254db/canvas_vm_production_prd.md) (detailed architecture, Socratic analyses, full JSON schema examples)
- [Protection Strategy Research](file:///C:/Users/guanh/.gemini/antigravity/brain/08da55a0-8f08-487b-bf39-3e169d9254db/premium_protection_strategy.md) (industry approaches, ranked strategies)
- [Canvas VM Trial Plan](file:///C:/Users/guanh/.gemini/antigravity/brain/08da55a0-8f08-487b-bf39-3e169d9254db/wasm_vm_trial_plan.md) (Phase 1 proof-of-concept, passed)
- [Dr. Zero-Copy Research](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/research/dr_zerocopy_ideas.md) (5-view analysis of protection approaches)

---

## Priority Order

| # | Phase | What | Blocked By |
|---|---|---|---|
| 0 | **Foundation** | Workflow + shared renderer + JSON schema | Nothing |
| 1 | **Vetting batch** | First 10 icons per pack (80 total) | Phase 0 |
| 2 | **Full rollout** | Remaining 40 per pack (320 total) | Phase 1 approval |
| 3 | **Automation** | CSS parser for future packs | Phase 2 |

---

## Phase 0: Foundation (Build First)

### 0a. Workflow file

#### [NEW] `.agents/workflows/canvas-vm-convert.md`

```yaml
---
description: Convert a premium icon pack from SVG+CSS to Canvas VM
---
```

Steps:
1. Input: pack slug (e.g. `ai-agentic`)
2. Read `public/packs/manifest.json`, extract icon list + CSS ref
3. Per icon:
   - Read SVG from `public/packs/{slug}/icons/{name}.svg`
   - Read CSS from `public/packs/{slug}/{slug}.css`
   - Extract elements (type, coords, fill, stroke, opacity)
   - Extract animation (keyframe name, delay, duration, easing)
   - Map to JSON schema (see below)
   - Write to `public/packs/{slug}/canvas-data/{name}.json`
   - Validate against schema
4. Verify: `node scripts/verify-canvas-parity.js --pack {slug}`
5. Fix any icons with >5% visual diff, re-verify
6. Confirm store.js wiring (canvas for non-Pro, SVG for Pro)

### 0b. Shared Canvas Renderer

#### [NEW] `public/scripts/canvas-vm.js` (~5KB)

Generalized from trial `canvas-renderer.js`:
- Input: JSON icon-data blob + canvas element
- HiDPI rendering at `devicePixelRatio`
- Canvas size derived from CSS (not hardcoded)
- Renders: circles, paths, rects, lines
- Animates: keyframe interpolation via `requestAnimationFrame`
- API: `create(canvas, data, opts)`, `hover()`, `reset()`
- Pack-agnostic (one renderer for all 400 icons)

### 0c. JSON Icon-Data Schema

```json
{
  "viewBox": [0, 0, 24, 24],
  "elements": [
    {
      "type": "circle|path|rect|line",
      "cx": 4, "cy": 12, "r": 2.5,
      "fill": "#00D4FF",
      "stroke": "#7B61FF",
      "strokeWidth": 1,
      "opacity": 1.0,
      "animation": {
        "delay": 0,
        "duration": 400,
        "keyframes": [
          { "t": 0,   "opacity": 0.3, "scale": 0.8 },
          { "t": 0.5, "opacity": 1.0, "scale": 1.2 },
          { "t": 1.0, "opacity": 0.8, "scale": 1.0 }
        ]
      }
    }
  ]
}
```

### 0d. Verification script

#### [NEW] `scripts/verify-canvas-parity.js`

Playwright script: opens pack collection, screenshots each icon
(CSS vs Canvas), computes pixel-diff, flags >5% mismatches.

---

## Phase 1: Vetting Batch (First 10 Per Pack)

**80 icons total** (10 from each of 8 packs).

Pick the 10 most visually diverse icons per pack (different animation
types: pulse, rotate, draw, fade, bounce, shake, spin).

### Per pack:
1. Follow `/canvas-vm-convert` workflow
2. Author 10 icon-data JSON files
3. Run verification script
4. Deploy for user vetting

### Store integration

#### [MODIFY] `store.js`
- `renderCollectionDetail`: for non-Pro users, render `<canvas>` +
  load JSON when canvas-data exists, fall back to SVG when it doesn't
- Pro users: unchanged (live SVG+CSS)
- Add `aria-label={iconName}` to canvas elements

#### [MODIFY] `style.css`
- Remove hover text expansion (see rationale below)

**User gate:** Phase 2 only proceeds after user approves all 80.

---

## Phase 2: Full Rollout (Remaining 40 Per Pack)

**320 icons.** Same workflow, same verification.
Each pack is independent, can be parallelized.

---

## Phase 3: CSS Parser Automation (Future)

Build AST-based CSS keyframe extractor to auto-generate icon-data
JSON from SVG + CSS source. Reduces manual effort for new packs.

---

## Hardgated Requirements

| # | Requirement |
|---|---|
| H1 | Zero `<svg>`, `<path>`, or CSS animation classes in DOM for non-Pro |
| H2 | Canvas size derived from CSS variables, not hardcoded px |
| H3 | Icon data loaded from JSON, not hardcoded in renderer |
| H4 | Shared renderer is pack-agnostic |
| H5 | HiDPI rendering at `devicePixelRatio` |
| H6 | `requestAnimationFrame` for animation loop |
| H7 | Hover triggers animation, mouseleave resets |
| H8 | Pro users always get live SVG+CSS (they paid for source) |

## Adaptive Parameters

| Parameter | Source | Fallback |
|---|---|---|
| Canvas size | CSS `.icon-preview` computed dims | 28px |
| Background | `.icon-cell` computed background | `#1a1919` |
| Easing | Per-icon JSON keyframes | `ease` |
| DPR | `window.devicePixelRatio` | `1` |

---

## Hover Text Removal

**Decision:** Remove `.collection-detail__icon-purpose` hover expansion.

- Layout jank (card grows, neighbors shift) with no UX value
- Icon name is always visible; animation is self-describing
- No `data-purpose`/`data-tags` in public DOM (premium metadata
  is gatekept behind authenticated MCP access)
- `aria-label={iconName}` for basic a11y only

---

## Deliverables Summary

| File | Phase | Type |
|---|---|---|
| `.agents/workflows/canvas-vm-convert.md` | 0 | [NEW] |
| `public/scripts/canvas-vm.js` | 0 | [NEW] |
| `scripts/verify-canvas-parity.js` | 0 | [NEW] |
| `public/packs/{id}/canvas-data/*.json` | 1-2 | [NEW] |
| `store.js` | 1 | [MODIFY] |
| `style.css` | 1 | [MODIFY] |

---

## File Size Budget

| Asset | Per Icon | Total (400) |
|---|---|---|
| `canvas-vm.js` (shared) | - | ~5 KB |
| Icon data JSON | ~0.5-2 KB | ~400 KB |
| **Total** | | **~405 KB** |

vs current SVG+CSS: ~670 KB. Net savings + source protection.
