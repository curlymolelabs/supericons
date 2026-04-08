# Closed Shadow DOM: Premium Icon Protection

Protect premium SVG icons from DOM scraping by rendering them inside closed shadow roots. Non-purchasers see the icons with full CSS animation fidelity, but `document.querySelector('svg')`, browser extensions, and AI tools cannot access the SVG source code.

## User Review Required

> [!IMPORTANT]
> **Scope decision:** Shadow DOM only applies to the **collection grid preview** (non-purchased view, lines 669-693). The **customize panel** (purchased view, lines 949-965) must still access SVG elements for color/stroke/speed modifications and export. Since purchased users already own the icon, there is no need to protect the panel preview.

> [!WARNING]
> **Known limitation:** Chrome DevTools Elements panel can expand closed shadow roots via manual inspection. This protects against automated scraping (JS, extensions, AI tools) but not a developer manually copying from DevTools. This is acceptable because DevTools access requires deliberate effort.

## Architecture

```
Current flow (non-purchased):
  fetch('/packs/slug/icon.svg') → svgText → cell.innerHTML = svgText
  CSS loaded via <link> in <head>
  
  Result: SVG fully visible in DOM. Any querySelector('svg') copies it.

Shadow DOM flow (non-purchased):
  fetch('/packs/slug/icon.svg') → svgText → shadow = cell.attachShadow({mode:'closed'})
  CSS fetched as text → injected inside shadow root
  
  Result: document.querySelector('svg') returns null.
          element.shadowRoot returns null.
          SVG exists only inside inaccessible closed shadow root.
```

## Proposed Changes

### Store Icon Rendering

#### [MODIFY] [store.js](file:///d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

**Change 1: Shadow DOM rendering for non-purchased icons** (lines 669-695)

Currently:
```javascript
preview.innerHTML = svgText;
const svgEl = preview.querySelector('svg');
if (svgEl) {
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
}
```

Proposed:
```javascript
if (!isPurchased) {
  // Closed shadow: DOM scrapers cannot access SVG
  const shadow = preview.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      :host { display: flex; align-items: center; justify-content: center; }
      svg { width: 100%; height: 100%; }
      ${collectionCSSText}
    </style>
    <div class="si-icon-cell">
      <div class="si-anim si-anim--${iconName}">
        ${svgText}
      </div>
    </div>
  `;
} else {
  // Purchased: normal DOM (customize panel needs access)
  preview.innerHTML = svgText;
  const svgEl = preview.querySelector('svg');
  if (svgEl) {
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
  }
}
```

**Change 2: Pre-fetch CSS text for shadow injection** (lines 590-597)

Currently loads CSS via `<link>` tag. Need to also fetch CSS text for shadow root injection:

```javascript
let collectionCSSText = '';
if (collectionData && collectionData.css) {
  loadCollectionCSS(product.slug, collectionData.css); // still needed for purchased view
  collectionCSSText = await getCollectionCSS(product.slug); // text for shadow injection
}
```

`getCollectionCSS()` already exists at line 767 with caching. No new function needed.

**Change 3: Hover animation inside shadow DOM**

The existing CSS selectors:
```css
.si-icon-cell:hover .si-anim--ai-help .si-help-q {
  animation: si-wobble 0.5s ease;
}
```

Inside the shadow root, the class hierarchy is preserved:
```
shadow root
  └── div.si-icon-cell          ← receives :hover
       └── div.si-anim.si-anim--ai-help
            └── svg
                 └── path.si-help-q
```

The CSS selector matches because the entire chain is inside the shadow. Mouse events propagate into shadow DOM naturally.

> [!NOTE]
> The `.icon-card:hover` variant in the CSS won't match inside shadow DOM (there's no `.icon-card`). This is fine because `.si-icon-cell:hover` is the primary selector. Both selectors are comma-separated alternatives; only one needs to match.

---

### Integration Surface Audit

Full audit of every place in store.js that touches SVG elements:

| Line | Code | Impact | Fix needed? |
|------|------|--------|-------------|
| 675-684 | `fetch()` + `preview.innerHTML = svgText` + `querySelector('svg')` | **Primary change.** Switch to shadow DOM for non-purchased. | **Yes** |
| 710-716 | Lock badge + `userSelect: none` | Added to `cell`, not `preview`. Outside shadow. | No |
| 719-726 | Click handlers on `cell` | Click events bubble out of shadow DOM. `cell` receives them. | No |
| 732-738 | PREVIEW watermark div | Appended to `grid`, not inside shadow. | No |
| 920-946 | `selectPremiumIcon()` | Purchased-only flow. Re-fetches SVG. No shadow DOM. | No |
| 949-965 | `renderPremiumPanel()` | Sets `panelPreview.innerHTML`. This is the customize panel, not the grid. No shadow. | No |
| 1063-1185 | `wirePremiumPanelEvents()` | All operations on `panelBody` (customize panel). Not in shadow. | No |
| 1188-1204 | `updatePremiumPreview()` | Sets `panelPreview.innerHTML` directly. Purchased users only. | No |
| 1206-1224 | `applyAnimSpeedToPreview()` | `preview.querySelectorAll('*')`. On panelPreview, not grid cells. | No |
| 1226-1234 | `loadCollectionCSS()` | `<link>` injection. Keep for purchased view. | No |
| 1237-1310 | `showLockedPanel()` | Shows lock panel in customize area. Not grid cells. | No |

**Key finding:** Only lines 669-695 need to change. All other SVG access points are either:
- In the purchased-user customize panel (no protection needed)
- Operating on elements outside the shadow root (lock badge, watermark, click handlers)

---

## Risk Assessment

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| Hover animation doesn't trigger inside shadow | Low | High | CSS class hierarchy preserved inside shadow. Testable in isolation first. |
| SVG gradient `url(#id)` breaks in shadow DOM | Low | Medium | Shadow DOM scopes IDs per root. Each icon has its own shadow root with unique gradient IDs. |
| CSS specificity conflict inside shadow | Very Low | Low | Only the pack CSS is injected. No competing styles. |
| Performance (50 shadow roots + duplicate CSS) | Low | Low | `adoptedStyleSheets` shares a single parsed CSSStyleSheet across all 50 roots. Zero duplication. |
| `event.target` retargeting breaks click handler | None | N/A | Click handler is on `cell` (shadow host), not on SVG elements inside. |

## Verification Plan

### Automated Tests

1. **DOM scraping test** (browser console):
   ```javascript
   // Should return 0 for non-purchased
   document.querySelectorAll('svg').length
   // Should return null
   document.querySelector('.collection-detail__icon-preview').shadowRoot
   ```

2. **Hover animation test** (browser subagent):
   - Navigate to Agentic AI collection
   - Hover ai-help icon, capture screenshot showing wobble animation
   - Compare to current behavior

3. **Click handler test**:
   - Click icon cell, verify locked panel shows for non-purchased
   - Verify purchased users still get full customize panel

### Manual Verification

- Test all 8 collections
- Verify CSS animations trigger on hover for each icon style
- Confirm gradient rendering (gradient-heavy icons like ai-help)
- Check 28px grid size rendering inside shadow DOM

## Open Questions

> [!IMPORTANT]
> **`adoptedStyleSheets` vs `<style>` injection:** `adoptedStyleSheets` is more efficient (one parsed sheet shared across 50 shadow roots) but requires constructing a `CSSStyleSheet` object. Safari support: 16.4+ (March 2023). Should we use `adoptedStyleSheets` with a fallback, or just use `<style>` injection for simplicity? My recommendation: use `adoptedStyleSheets` (the browser support is broad enough).

> [!NOTE]
> **Existing PREVIEW watermark:** The grid already has a PREVIEW watermark overlay (lines 732-738) that sits on top of the grid. This is independent of shadow DOM and continues to work. We could optionally enhance it with Style E (dimmed tint + lock badge per icon) from the watermark demo.
