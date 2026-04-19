# Purpose Filter Scope Fix Implementation Plan

## Decision Update

After auditing the taxonomy seed and strategy docs, the product decision changed: the purpose pill chip filter should show on `All Icons` only. The earlier draft below scoped it to `All Icons` plus the 10 free libraries, but that is now superseded because current taxonomy coverage is an intentionally partial experiment and reads as incomplete on library-specific views.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the purpose pill chip filter on `All Icons` only. Remove both the UI and filtering effect from specific library views, `Favorites`, `Recent`, and every non-icon page or shell state.

**Architecture:** Put the scope rule in shared icon-grid behavior helpers, then have `main.js` use that rule for both filter visibility and effective filtering. Define the allowed scope as the `icons` view with `activeLibrary === 'all'` only. Keep `store.js` responsible for route transitions, but have it trigger a shell resync after each view change. Add a CSS safety net so store-shell pages cannot accidentally show the chip row during future refactors.

**Tech Stack:** Vanilla JavaScript modules, Vite, CSS, `node:assert/strict`, existing `npm run verify:icon-grid-behavior`

---

## Audit Summary

### Confirmed Correct

- `icons` with `activeLibrary === 'all'`

### Confirmed Incorrect

- Icon-grid sub-states:
  - `favorites`
  - `recent`
  - the current implementation is ambiguous for the 10 free library views because the row is global-shell scoped rather than explicitly browse-scope scoped
- Store/account/shell routes:
  - `packs`
  - `downloads`
  - `dashboard`
  - `api-keys`
  - `collection-detail`
- Docs and marketing/legal/tool routes:
  - all `docs*` pages
  - `pricing`
  - `privacy`
  - `terms`
  - `motion-lab`
  - `converter`
  - `converter-lab`

### Root Cause

- [index.html](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html:352) places `.grid-filter-bar` inside the shared grid shell, not inside an `All Icons`-only container.
- [main.js](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:851) renders the chips unconditionally whenever the shell exists.
- [main.js](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:1286) applies the purpose filter regardless of route or library scope.
- [store.js](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:188) routes many non-icon pages through the same shell.
- [style.css](/D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css:8529) hides `.icon-grid` and `.grid-empty` for store views, but not `.grid-filter-bar`.

### Implementation Assumption

- Preserve the selected purpose chip in state only for `All Icons`.
- Do not apply that filter in specific library views, `Favorites`, `Recent`, or non-icon routes.
- When the user returns to `All Icons`, the previous chip selection can reappear and apply again.
- Do not change chip labels, counts, or taxonomy in this fix.

---

### Task 1: Codify the Purpose Filter Scope Rule

**Files:**
- Modify: `lib/icon-grid-behavior.js`
- Test: `scripts/verify-icon-grid-behavior.mjs`

- [ ] **Step 1: Write the failing regression assertions**

Add these assertions and imports to `scripts/verify-icon-grid-behavior.mjs`:

```js
import {
  addRecentSearchEntry,
  compareBrowseIconsByPopularity,
  compareSearchMatches,
  createEmptyPopularityRecord,
  getPopularityRecord,
  getScopedJobCategoryFilter,
  shouldShowPurposeFilterBar,
  shouldSyncSearchOnBlur,
} from '../lib/icon-grid-behavior.js';

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'all' }),
  true,
  'purpose chips should be visible in the All Icons browse scope'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'favorites' }),
  false,
  'purpose chips should be hidden in Favorites'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'material' }),
  true,
  'purpose chips should remain visible for a specific free library browse state'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'icons', activeLibrary: 'recent' }),
  false,
  'purpose chips should be hidden in Recent'
);

assert.equal(
  shouldShowPurposeFilterBar({ currentView: 'dashboard', activeLibrary: 'all' }),
  false,
  'purpose chips should be hidden on non-icon shell views'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'all',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  'ai-agent-workflows',
  'All Icons should keep the selected purpose filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'icons',
    activeLibrary: 'favorites',
    activeJobCategoryFilter: 'ai-agent-workflows',
  }),
  null,
  'Favorites should not keep an effective hidden purpose filter'
);

assert.equal(
  getScopedJobCategoryFilter({
    currentView: 'api-keys',
    activeLibrary: 'all',
    activeJobCategoryFilter: 'status-feedback',
  }),
  null,
  'store and account routes should not inherit an effective purpose filter'
);
```

- [ ] **Step 2: Run the verification script and confirm it fails**

Run: `npm run verify:icon-grid-behavior`

Expected: `FAIL` with an import or undefined-function error for `shouldShowPurposeFilterBar` and `getScopedJobCategoryFilter`

- [ ] **Step 3: Implement the shared scope helpers**

Add these exports to `lib/icon-grid-behavior.js`:

```js
export function isAllIconsBrowseScope({ currentView, activeLibrary }) {
  const resolvedView = String(currentView || 'icons');
  const inIconGridView = resolvedView === 'icons' || resolvedView === '';
  return inIconGridView && activeLibrary === 'all';
}

export function shouldShowPurposeFilterBar({ currentView, activeLibrary }) {
  const resolvedView = String(currentView || 'icons');
  const inIconGridView = resolvedView === 'icons' || resolvedView === '';
  const isDiscoveryLibrary = activeLibrary !== 'favorites' && activeLibrary !== 'recent';
  return inIconGridView && isDiscoveryLibrary;
}

export function getScopedJobCategoryFilter({
  currentView,
  activeLibrary,
  activeJobCategoryFilter,
}) {
  if (!shouldShowPurposeFilterBar({ currentView, activeLibrary })) {
    return null;
  }

  return activeJobCategoryFilter === 'all' ? null : activeJobCategoryFilter;
}
```

- [ ] **Step 4: Run the verification script and confirm it passes**

Run: `npm run verify:icon-grid-behavior`

Expected: `verify-icon-grid-behavior: ok`

- [ ] **Step 5: Commit**

```bash
git add lib/icon-grid-behavior.js scripts/verify-icon-grid-behavior.mjs
git commit -m "test: codify purpose filter scope rules"
```

### Task 2: Scope the Purpose Filter in the Main Icon Grid

**Files:**
- Modify: `main.js:37-43`
- Modify: `main.js:639-649`
- Modify: `main.js:832-885`
- Modify: `main.js:1286-1410`
- Modify: `main.js:1542-1588`
- Verify: `scripts/verify-icon-grid-behavior.mjs`

- [ ] **Step 1: Import the new helpers and cache the filter bar element**

Update the `main.js` imports and `els` map:

```js
import {
  addRecentSearchEntry,
  applyPopularityDelta,
  compareBrowseIconsByPopularity,
  compareSearchMatches,
  getPopularityRecord,
  getScopedJobCategoryFilter,
  shouldShowPurposeFilterBar,
  shouldSyncSearchOnBlur,
} from './lib/icon-grid-behavior.js';
```

```js
const els = {
  // ...
  gridTitle: $('#gridTitle'),
  gridMeta: $('#gridMeta'),
  gridFilterBar: $('.grid-filter-bar'),
  useCaseFilters: $('#useCaseFilters'),
  // ...
};
```

- [ ] **Step 2: Add shell-scope helpers in `main.js`**

Insert these helpers near `getActiveJobCategoryId()`:

```js
function getCurrentShellView() {
  const explicitView = document.body.getAttribute('data-view');
  if (explicitView) return explicitView;

  const gridArea = document.getElementById('gridArea');
  if (gridArea?.classList.contains('store-active')) {
    return 'store-shell';
  }

  return 'icons';
}

function syncPurposeFilterBar() {
  if (!els.gridFilterBar) return;

  const isVisible = shouldShowPurposeFilterBar({
    currentView: getCurrentShellView(),
    activeLibrary: state.activeLibrary,
  });

  els.gridFilterBar.hidden = !isVisible;
  els.gridFilterBar.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

function getActiveJobCategoryId() {
  return getScopedJobCategoryFilter({
    currentView: getCurrentShellView(),
    activeLibrary: state.activeLibrary,
    activeJobCategoryFilter: state.activeJobCategoryFilter,
  });
}
```

- [ ] **Step 3: Stop rendering visible chips outside the allowed icon discovery scope**

Update `renderUseCaseFilters()` so it syncs visibility first and no longer behaves like a global shell control:

```js
function renderUseCaseFilters() {
  if (!els.useCaseFilters) return;

  syncPurposeFilterBar();
  if (els.gridFilterBar?.hidden) {
    els.useCaseFilters.innerHTML = '';
    return;
  }

  const activeFilter = getActiveJobCategoryId() || 'all';
  const chips = [
    `
      <button
        type="button"
        class="grid-filter-chip${activeFilter === 'all' ? ' active' : ''}"
        data-job-category="all"
        aria-pressed="${activeFilter === 'all'}"
      >
        All
      </button>
    `,
    // existing category mapping stays the same
  ];

  els.useCaseFilters.innerHTML = chips.join('');
}
```

- [ ] **Step 4: Make the hidden filter non-effective outside the allowed icon discovery scope**

Keep `applyFilters()` and `updateGridHeading()` driven by the scoped helper result instead of raw state:

```js
function applyFilters() {
  const isSolid = state.iconStyle === 'solid';
  const activeJobCategoryId = getActiveJobCategoryId();
  let icons;

  // existing style + library selection logic stays the same

  if (activeJobCategoryId) {
    icons = icons
      .filter((icon) => getIconJobCategory(icon) === activeJobCategoryId)
      .sort((a, b) => {
        const rankDiff = getIconJobRank(a) - getIconJobRank(b);
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name);
      });
  }

  // existing search and popularity logic stays the same
}
```

```js
function updateGridHeading() {
  const titleMap = { all: 'All Icons', favorites: 'Favorites', recent: 'Recent' };
  const activeJobCategoryMeta = getJobCategoryMeta(getActiveJobCategoryId());
  const libraryTitle = titleMap[state.activeLibrary] || (libraryMeta[state.activeLibrary]?.name || state.activeLibrary);

  if (state.activeLibrary === 'all' && activeJobCategoryMeta) {
    els.gridTitle.textContent = activeJobCategoryMeta.label;
    return;
  }

  if (activeJobCategoryMeta) {
    els.gridTitle.textContent = `${libraryTitle} + ${activeJobCategoryMeta.label}`;
    return;
  }

  els.gridTitle.textContent = libraryTitle;
}
```

- [ ] **Step 5: Re-sync the filter bar whenever counts or shell state refresh**

Update the existing shell sync points:

```js
function updateCounts() {
  const total = state.icons.length;
  const showing = state.filteredIcons.length;

  $('#countAll').textContent = total.toLocaleString();
  syncHeaderSearchChrome();
  syncCollectionClearButton();
  syncPurposeFilterBar();
  updateGridHeading();

  if (isStoreView()) return;

  // existing meta-copy logic stays the same
}
```

Expose the new sync hook for `store.js`:

```js
window.__supericons = {
  state,
  showToast,
  renderPanelForIcon,
  togglePanel,
  setPanelOpen,
  setPanelSuppressed,
  setSidebarOpen,
  dismissLanding: dismissHero,
  isMobilePanelMode,
  libraryMeta,
  getStyledSvg,
  ANIM_CSS,
  setHeaderSearchMode,
  syncHeaderSearchChrome,
  syncPurposeFilterBar,
  syncSidebarToggleButton,
};
```

- [ ] **Step 6: Run the verification script and confirm scope logic still passes**

Run: `npm run verify:icon-grid-behavior`

Expected: `verify-icon-grid-behavior: ok`

- [ ] **Step 7: Commit**

```bash
git add main.js
git commit -m "fix: scope purpose filter to all icons"
```

### Task 3: Add a Store-Shell Safety Net

**Files:**
- Modify: `store.js:700-857`
- Modify: `style.css:8529-8532`

- [ ] **Step 1: Hide the filter row for all store-shell routes at the shell level**

Add this CSS near the existing `.grid-area.store-active` rules:

```css
.grid-area.store-active > .grid-filter-bar {
  display: none !important;
}
```

- [ ] **Step 2: Trigger a purpose-filter resync after every route transition**

Add the sync call at the end of `switchView()` after the shell classes have been updated:

```js
  // Update sidebar active state
  si?.syncPurposeFilterBar?.();
  updateSidebarActive(view);
  resetShellScroll();
  window.requestAnimationFrame(resetShellScroll);
}
```

- [ ] **Step 3: Run the verification script and confirm nothing regressed**

Run: `npm run verify:icon-grid-behavior`

Expected: `verify-icon-grid-behavior: ok`

- [ ] **Step 4: Commit**

```bash
git add store.js style.css
git commit -m "fix: hide purpose filter on store shell routes"
```

### Task 4: Validate the UI Contract End-to-End

**Files:**
- Verify: `main.js`
- Verify: `store.js`
- Verify: `style.css`

- [ ] **Step 1: Run the existing automated verification**

Run: `npm run verify:icon-grid-behavior`

Expected: `verify-icon-grid-behavior: ok`

- [ ] **Step 2: Run a full production build**

Run: `npm run build`

Expected: successful Vite production build with no new errors

- [ ] **Step 3: Execute the manual UI route matrix**

Run the app locally and verify these exact outcomes:

```text
1. /?view=icons
   Expected: purpose chips visible

2. /?view=icons then click Favorites
   Expected: purpose chips hidden

3. /?view=icons then click a specific free library (for example Material Symbols)
   Expected: purpose chips visible

4. /?view=icons then click Recent
   Expected: purpose chips hidden

5. /?view=packs
   Expected: purpose chips hidden

6. /?view=dashboard
   Expected: purpose chips hidden

7. /?view=api-keys
   Expected: purpose chips hidden

8. /?view=docs and one child docs page such as /?view=docs-access-api-keys
   Expected: purpose chips hidden

9. /?view=pricing, /?view=privacy, /?view=terms
   Expected: purpose chips hidden on each page

10. /?view=motion-lab, /?view=converter, /?view=converter-lab
   Expected: purpose chips hidden on each page

11. In All Icons, select AI & Agents, then navigate to a specific free library
    Expected: chips stay visible and the same purpose filter remains effective within that library

12. In All Icons, select AI & Agents, then navigate to Favorites and a store page
    Expected: chips hidden outside allowed discovery surfaces and no invisible category scoping leaks into those states

13. Return to All Icons
    Expected: chips visible again; preserving the prior selection is acceptable
```

- [ ] **Step 4: Commit**

```bash
git add main.js store.js style.css lib/icon-grid-behavior.js scripts/verify-icon-grid-behavior.mjs
git commit -m "chore: verify purpose filter scope regression fix"
```

## Risks to Watch

- `getActiveJobCategoryId()` is used by heading, filtering, and search copy. Changing its scope must not accidentally blank the heading in legitimate `All Icons + category` or `Library + category` states.
- `store.js` does not set `body[data-view]` for every shell route, so the fix must not rely on `data-view` alone.
- `Favorites` and `Recent` currently can inherit a hidden active purpose filter. The implementation must remove the effect, not just hide the row.
- The chip counts in free-library views should still reflect the scoped icon set, not a misleading global count. If they remain global after the visibility fix, that is a follow-up bug.

## Definition of Done

- The purpose pill chip filter is visible on `All Icons` and the 10 free icon library views only.
- `Favorites` and `Recent` do not show the chip row and are not silently filtered by it.
- Store/account/docs/pricing/legal/tool routes do not show the chip row.
- `npm run verify:icon-grid-behavior` passes.
- `npm run build` passes.
