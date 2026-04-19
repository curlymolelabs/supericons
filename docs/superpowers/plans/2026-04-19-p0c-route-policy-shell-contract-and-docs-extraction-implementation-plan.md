# P0-C Route Policy, Shell Contract, and Docs Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize launch-facing routing and shell ownership by centralizing route policy, replacing raw shell DOM coupling with a shared contract, and extracting the docs view as the first safe refactor slice.

**Architecture:** Keep the current SPA and current route model, but stop scattering route rules and shell mutations across `store.js`. First move route persistence and view classification into one small policy module. Then introduce a shell contract owned by `main.js` so store routes stop reaching directly into shared shell DOM. Only after those boundaries exist should docs rendering/config move out of `store.js` into focused modules.

**Tech Stack:** Vite SPA, vanilla JavaScript modules, Node verification scripts, browser QA via local preview, existing docs content modules.

---

## Roadmap Recap

This plan is the next step in the main implementation roadmap we have already been following.

### Phase A: P0 launch drift cleanup

Status: done

- Shared product facts layer is in place.
- The `/?view=packs` title overwrite bug is fixed.
- High-surface MCP and docs copy now read from shared product facts.

### Phase B: P0-B browser QA and dependency audit

Status: done

- Launch-facing routes were checked in a real browser.
- The biggest remaining risk was confirmed:
  - route policy is scattered
  - `store.js` reaches into shell-owned DOM
  - docs route logic is a good first extraction target

### Phase C: P0-C route policy + shell contract + docs extraction

Status: this plan

- make URL behavior intentional
- reduce cross-file shell coupling
- pull docs-specific code out of `store.js` without changing the product UX

### Phase D: P1 registry scaffolding

Status: next after this plan

- start the SI Registry source structure
- keep product facts and route cleanup stable while registry work begins

### Phase E: P2 semantic rollout

Status: after registry scaffolding

- premium normalization
- free corpus rollout in batches
- automation and review tooling

The main rule is simple: do not jump into the registry or semantic rollout while the launch shell is still unstable.

---

## Decisions Locked By This Plan

### 1. Direct store routes should keep their `?view=` URL

The app already accepts direct route URLs for:

- `packs`
- `downloads`
- `dashboard`
- `api-keys`
- docs routes
- `pricing`
- `privacy`
- `terms`
- `motion-lab`
- `converter`
- `converter-lab`

This plan makes those routes stay shareable after hydration too. The URL should keep `?view=` for any direct route that the app already supports.

### 2. `collection-detail` stays non-persistent for now

There is no stable slug-based route model yet for collection details. Until that exists, `collection-detail` keeps internal state and should not claim a public deep-link contract.

### 3. `main.js` owns the shell

`main.js` remains the owner of:

- shell DOM lookup
- panel suppression
- header search mode
- grid heading/meta shell chrome
- shell layout classes

`store.js` should request shell changes through a contract, not by grabbing shell elements directly during view switching.

### 4. Docs is the first safe extraction slice

The first refactor slice after the contract lands is docs-specific code because:

- docs content/config is already conceptually separate
- docs has a clear route family
- much of the docs rendering is string generation and route-specific state, not core icon-grid logic

---

## File Structure

### New files

- `lib/view-route-policy.js`
  Single source of truth for route metadata and history behavior.
- `lib/store-shell-contract.js`
  Shell adapter created by `main.js` and consumed by `store.js`.
- `lib/docs-guide-config.js`
  Extracted docs guide data now living outside `store.js`.
- `lib/docs-site-render.js`
  Pure docs shell/sidebar/pagination/page markup builders.
- `scripts/verify-view-route-policy.mjs`
  Route policy verification.
- `scripts/verify-store-shell-contract.mjs`
  Shell contract verification with stub DOM objects.
- `scripts/verify-docs-site-render.mjs`
  Docs render verification.
- `docs/superpowers/plans/2026-04-19-p0c-route-policy-shell-contract-and-docs-extraction-implementation-plan.html`
  Plain-language HTML version of this plan.

### Files to modify

- `package.json`
  Add the new verification scripts.
- `main.js`
  Create and expose the shell contract from real shell elements and existing shell callbacks.
- `store.js`
  Replace scattered route sets and direct shell DOM mutations in route switching with the new route policy and shell contract. Remove extracted docs content/render helpers.
- `docs-pages.js`
  Keep as the source for page order and page config used by docs render helpers.
- `scripts/verify-icon-grid-behavior.mjs`
  Keep existing heading protection coverage and extend only if needed for changed shell behavior.

---

## Task 1: Centralize Route Policy First

**Files:**

- Create: `lib/view-route-policy.js`
- Create: `scripts/verify-view-route-policy.mjs`
- Modify: `package.json`
- Modify: `store.js`

- [ ] **Step 1: Write the failing verification script**

```js
import assert from 'node:assert/strict';

import {
  buildRouteUrl,
  getRouteMeta,
  normalizeRouteView,
  shouldPersistRouteView,
} from '../lib/view-route-policy.js';

assert.equal(normalizeRouteView('mcp'), 'docs');
assert.equal(normalizeRouteView('packs'), 'packs');
assert.equal(normalizeRouteView('unknown-view'), 'icons');

assert.equal(shouldPersistRouteView('packs'), true);
assert.equal(shouldPersistRouteView('pricing'), true);
assert.equal(shouldPersistRouteView('docs-mcp-tools'), true);
assert.equal(shouldPersistRouteView('collection-detail'), false);

assert.equal(getRouteMeta('converter').panelSuppressed, true);
assert.equal(getRouteMeta('packs').storeShell, true);
assert.equal(getRouteMeta('icons').storeShell, false);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'pricing', hash: '' }),
  '/?view=pricing'
);

assert.equal(
  buildRouteUrl({ pathname: '/', view: 'docs-mcp-tools', hash: '#icon-tools-search' }),
  '/?view=docs-mcp-tools#icon-tools-search'
);

console.log('verify-view-route-policy: ok');
```

- [ ] **Step 2: Run the script to confirm the expected initial failure**

Run: `node scripts/verify-view-route-policy.mjs`

Expected:

- fail with `Cannot find module '../lib/view-route-policy.js'`

- [ ] **Step 3: Implement the route policy module**

```js
import { DOCS_PAGE_VIEWS } from '../docs-pages.js';

const BASE_ROUTE_META = Object.freeze({
  icons: { persistUrl: false, storeShell: false, panelSuppressed: false, searchMode: 'icons' },
  packs: { persistUrl: true, storeShell: true, panelSuppressed: false, searchMode: 'icons' },
  downloads: { persistUrl: true, storeShell: true, panelSuppressed: false, searchMode: 'icons' },
  dashboard: { persistUrl: true, storeShell: true, panelSuppressed: false, searchMode: 'icons' },
  'api-keys': { persistUrl: true, storeShell: true, panelSuppressed: false, searchMode: 'icons' },
  pricing: { persistUrl: true, storeShell: true, panelSuppressed: true, searchMode: 'icons' },
  privacy: { persistUrl: true, storeShell: true, panelSuppressed: true, searchMode: 'icons' },
  terms: { persistUrl: true, storeShell: true, panelSuppressed: true, searchMode: 'icons' },
  'motion-lab': { persistUrl: true, storeShell: true, panelSuppressed: true, searchMode: 'icons' },
  converter: { persistUrl: true, storeShell: true, panelSuppressed: true, searchMode: 'icons' },
  'converter-lab': { persistUrl: true, storeShell: true, panelSuppressed: true, searchMode: 'icons' },
  'collection-detail': { persistUrl: false, storeShell: true, panelSuppressed: false, searchMode: 'icons' },
});

const DOCS_ROUTE_META = Object.freeze(
  Object.fromEntries(
    [...DOCS_PAGE_VIEWS].map((view) => [
      view,
      { persistUrl: true, storeShell: true, panelSuppressed: true, searchMode: 'docs' },
    ])
  )
);

export const ROUTE_VIEW_META = Object.freeze({
  ...BASE_ROUTE_META,
  ...DOCS_ROUTE_META,
});

export function normalizeRouteView(view) {
  if (view === 'mcp') return 'docs';
  return ROUTE_VIEW_META[view] ? view : 'icons';
}

export function getRouteMeta(view) {
  return ROUTE_VIEW_META[normalizeRouteView(view)] || ROUTE_VIEW_META.icons;
}

export function shouldPersistRouteView(view) {
  return Boolean(getRouteMeta(view).persistUrl);
}

export function buildRouteUrl({ pathname, view, hash = '' }) {
  const normalized = normalizeRouteView(view);
  const safeHash = hash || '';
  if (!shouldPersistRouteView(normalized)) {
    return pathname;
  }
  return `${pathname}?view=${normalized}${safeHash}`;
}
```

- [ ] **Step 4: Replace the scattered route sets inside `store.js`**

Replace direct set ownership like:

```js
const PERSISTENT_ROUTE_VIEWS = new Set([...DOCS_PAGE_VIEWS]);
const PANEL_SUPPRESSED_VIEWS = new Set([...DOCS_PAGE_VIEWS, 'pricing', 'privacy', 'terms', 'motion-lab', 'converter', 'converter-lab']);
const STORE_SHELL_VIEWS = new Set(['packs', 'downloads', 'dashboard', 'api-keys', ...DOCS_PAGE_VIEWS, 'collection-detail', 'pricing', 'privacy', 'terms', 'motion-lab', 'converter', 'converter-lab']);
```

with imports like:

```js
import {
  buildRouteUrl,
  getRouteMeta,
  normalizeRouteView,
  shouldPersistRouteView,
} from './lib/view-route-policy.js';
```

and route usage like:

```js
view = normalizeRouteView(view);
const routeMeta = getRouteMeta(view);
const activeRouteMeta = getRouteMeta(activeRouteView || 'icons');

if (shouldMutateHistory && routeMeta.persistUrl) {
  const routeHash = activeRouteView === view ? window.location.hash : '';
  const nextUrl = buildRouteUrl({ pathname: window.location.pathname, view, hash: routeHash });
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentUrl !== nextUrl) {
    window.history[historyMethod]({}, '', nextUrl);
  }
} else if (shouldMutateHistory && activeRouteMeta.persistUrl) {
  window.history[historyMethod]({}, '', window.location.pathname);
}
```

- [ ] **Step 5: Run verification**

Run:

- `node scripts/verify-view-route-policy.mjs`

Expected:

- `verify-view-route-policy: ok`

- [ ] **Step 6: Commit the route policy slice**

```bash
git add package.json lib/view-route-policy.js scripts/verify-view-route-policy.mjs store.js
git commit -m "refactor: centralize store route policy"
```

---

## Task 2: Introduce a Shared Store Shell Contract

**Files:**

- Create: `lib/store-shell-contract.js`
- Create: `scripts/verify-store-shell-contract.mjs`
- Modify: `main.js`
- Modify: `store.js`

- [ ] **Step 1: Write the failing contract verification**

```js
import assert from 'node:assert/strict';

import { createStoreShellContract } from '../lib/store-shell-contract.js';

function makeClassList() {
  const names = new Set();
  return {
    add(name) { names.add(name); },
    remove(name) { names.delete(name); },
    toggle(name, force) {
      if (force === undefined ? !names.has(name) : force) names.add(name);
      else names.delete(name);
    },
    contains(name) { return names.has(name); },
  };
}

const elements = {
  gridArea: { classList: makeClassList(), scrollTop: 90, scrollLeft: 20 },
  gridTitle: { textContent: '' },
  gridMeta: { textContent: '' },
  gridActions: { style: { display: '' } },
};

const calls = [];
const shell = createStoreShellContract({
  elements,
  callbacks: {
    resetPremiumPanel: () => calls.push('resetPremiumPanel'),
    setHeaderSearchMode: (mode, options) => calls.push(['setHeaderSearchMode', mode, options.value]),
    setPanelSuppressed: (value) => calls.push(['setPanelSuppressed', value]),
  },
});

shell.enterStoreView({
  title: 'Pricing',
  meta: '',
  searchMode: 'icons',
  searchValue: 'agent',
  panelSuppressed: true,
});

assert.equal(elements.gridArea.classList.contains('store-active'), true);
assert.equal(elements.gridTitle.textContent, 'Pricing');
assert.equal(elements.gridMeta.textContent, '');
assert.equal(elements.gridActions.style.display, 'none');
assert.deepEqual(calls, [
  'resetPremiumPanel',
  ['setPanelSuppressed', true],
  ['setHeaderSearchMode', 'icons', 'agent'],
]);

shell.scrollShellToTop();
assert.equal(elements.gridArea.scrollTop, 0);
assert.equal(elements.gridArea.scrollLeft, 0);

console.log('verify-store-shell-contract: ok');
```

- [ ] **Step 2: Run the script to confirm the expected initial failure**

Run: `node scripts/verify-store-shell-contract.mjs`

Expected:

- fail with `Cannot find module '../lib/store-shell-contract.js'`

- [ ] **Step 3: Implement the shared shell contract**

```js
export function createStoreShellContract({ elements, callbacks }) {
  const setText = (node, value = '') => {
    if (node) node.textContent = value;
  };

  return {
    enterStoreView({
      title,
      meta = '',
      searchMode = 'icons',
      searchValue = '',
      panelSuppressed = false,
    }) {
      elements.gridArea?.classList.add('store-active');
      if (elements.gridActions) elements.gridActions.style.display = 'none';
      setText(elements.gridTitle, title);
      setText(elements.gridMeta, meta);
      callbacks.resetPremiumPanel?.();
      callbacks.setPanelSuppressed?.(Boolean(panelSuppressed));
      callbacks.setHeaderSearchMode?.(searchMode, { value: searchValue });
    },

    leaveStoreView() {
      elements.gridArea?.classList.remove('store-active');
      if (elements.gridActions) elements.gridActions.style.display = '';
      callbacks.setPanelSuppressed?.(false);
    },

    setHeading(title, meta = '') {
      setText(elements.gridTitle, title);
      setText(elements.gridMeta, meta);
    },

    scrollShellToTop() {
      if (elements.gridArea) {
        elements.gridArea.scrollTop = 0;
        elements.gridArea.scrollLeft = 0;
      }
      window.scrollTo?.(0, 0);
    },
  };
}
```

- [ ] **Step 4: Create the contract in `main.js` and expose it through `window.__supericons`**

Add imports and setup like:

```js
import { createStoreShellContract } from './lib/store-shell-contract.js';

const storeShell = createStoreShellContract({
  elements: {
    gridArea: els.gridArea,
    gridTitle: els.gridTitle,
    gridMeta: els.gridMeta,
    gridActions: document.querySelector('.grid-header__actions'),
  },
  callbacks: {
    resetPremiumPanel: () => {
      clearPremiumPreviewTimer();
      resetPanelToPlaceholder();
    },
    setHeaderSearchMode,
    setPanelSuppressed,
  },
});

window.__supericons = {
  ...window.__supericons,
  shell: storeShell,
};
```

- [ ] **Step 5: Replace `switchView()` shell DOM setup in `store.js` with the contract**

Use the contract instead of direct shell DOM mutations:

```js
const shell = si?.shell;
const routeMeta = getRouteMeta(view);

if (routeMeta.storeShell) {
  shell?.enterStoreView({
    title: view === 'packs' ? 'Premium Collections' : 'Pricing',
    meta: '',
    searchMode: routeMeta.searchMode,
    searchValue: routeMeta.searchMode === 'docs' ? docsSearchQuery : (si?.state?.searchQuery || ''),
    panelSuppressed: routeMeta.panelSuppressed,
  });
  shell?.scrollShellToTop();
}
```

- [ ] **Step 6: Run verification**

Run:

- `node scripts/verify-store-shell-contract.mjs`
- `npm run verify:icon-grid-behavior`

Expected:

- `verify-store-shell-contract: ok`
- `verify-icon-grid-behavior: ok`

- [ ] **Step 7: Commit the shell contract slice**

```bash
git add lib/store-shell-contract.js scripts/verify-store-shell-contract.mjs main.js store.js
git commit -m "refactor: add shared store shell contract"
```

---

## Task 3: Make the Route and Shell Integration Real

**Files:**

- Modify: `store.js`
- Modify: `main.js`
- Modify: `scripts/verify-icon-grid-behavior.mjs`

- [ ] **Step 1: Extend verification to guard the new behavior**

Add assertions like:

```js
assert.equal(
  resolveGridHeadingText({
    currentView: 'store-shell',
    activeLibrary: 'all',
    activeJobCategoryLabel: 'AI Agent Workflows',
    currentTitle: 'Pricing',
    libraryTitle: 'All Icons',
  }),
  'Pricing'
);
```

- [ ] **Step 2: Run the verification and make sure it fails if the new route/shell integration is incomplete**

Run: `npm run verify:icon-grid-behavior`

Expected:

- fail only if the heading or store-shell ownership regresses during the move

- [ ] **Step 3: Finish the route integration in `store.js`**

Make `syncViewFromLocation()` and `switchView()` read from the route policy helper instead of local sets, and make them call the shell contract for:

- heading/meta
- panel suppression
- header search mode
- store shell class setup
- shell scroll reset

- [ ] **Step 4: Finish the shell integration in `main.js`**

Keep `main.js` as the owner of:

- `setHeaderSearchMode`
- `setPanelSuppressed`
- panel placeholder reset
- `syncSidebarToggleButton`

and ensure `window.__supericons.shell` is created only once during app initialization.

- [ ] **Step 5: Re-run the route and heading verification**

Run:

- `node scripts/verify-view-route-policy.mjs`
- `node scripts/verify-store-shell-contract.mjs`
- `npm run verify:icon-grid-behavior`

Expected:

- all three pass

- [ ] **Step 6: Commit the integration slice**

```bash
git add main.js store.js scripts/verify-icon-grid-behavior.mjs
git commit -m "refactor: route store views through shell contract"
```

---

## Task 4: Extract Docs Guide Config Out of `store.js`

**Files:**

- Create: `lib/docs-guide-config.js`
- Modify: `store.js`
- Create: `scripts/verify-docs-site-render.mjs`

- [ ] **Step 1: Write the failing docs config verification**

```js
import assert from 'node:assert/strict';

import { getDocsGuideConfig } from '../lib/docs-guide-config.js';

assert.equal(getDocsGuideConfig('docs-codex').title, 'Set up Supericons MCP in Codex');
assert.equal(getDocsGuideConfig('docs-claude-code').eyebrow, 'Claude Code');
assert.equal(getDocsGuideConfig('docs-unknown'), null);

console.log('verify-docs-site-render: config ok');
```

- [ ] **Step 2: Run the script to confirm the expected initial failure**

Run: `node scripts/verify-docs-site-render.mjs`

Expected:

- fail with `Cannot find module '../lib/docs-guide-config.js'`

- [ ] **Step 3: Move the guide config data into a focused module**

Create:

```js
const GUIDE_CONFIGS = {
  'docs-claude-code': { /* moved unchanged from store.js */ },
  'docs-codex': { /* moved unchanged from store.js */ },
  'docs-cursor': { /* moved unchanged from store.js */ },
  'docs-mcp-universal': { /* moved unchanged from store.js */ },
  'docs-mcp-others': { /* moved unchanged from store.js */ },
};

export function getDocsGuideConfig(view) {
  return GUIDE_CONFIGS[view] || null;
}
```

- [ ] **Step 4: Make `store.js` import the extracted guide config**

```js
import { getDocsGuideConfig } from './lib/docs-guide-config.js';
```

- [ ] **Step 5: Re-run verification**

Run: `node scripts/verify-docs-site-render.mjs`

Expected:

- `verify-docs-site-render: config ok`

- [ ] **Step 6: Commit the guide-config slice**

```bash
git add lib/docs-guide-config.js scripts/verify-docs-site-render.mjs store.js
git commit -m "refactor: extract docs guide config"
```

---

## Task 5: Extract Pure Docs Rendering Helpers

**Files:**

- Create: `lib/docs-site-render.js`
- Modify: `store.js`
- Modify: `scripts/verify-docs-site-render.mjs`

- [ ] **Step 1: Extend docs verification to cover rendered markup**

```js
import assert from 'node:assert/strict';

import { renderDocsSiteMarkup } from '../lib/docs-site-render.js';

const markup = renderDocsSiteMarkup({
  view: 'docs-mcp-tools',
  pageTitle: 'MCP Tools',
  bodyHtml: '<section><h2>search_icons</h2></section>',
});

assert.match(markup, /docsSidebarNav/);
assert.match(markup, /data-docs-view="docs-mcp-tools"/);
assert.match(markup, /search_icons/);
assert.match(markup, /docs-shell__pagination/);

console.log('verify-docs-site-render: markup ok');
```

- [ ] **Step 2: Run the script and confirm the expected initial failure**

Run: `node scripts/verify-docs-site-render.mjs`

Expected:

- fail with `Cannot find module '../lib/docs-site-render.js'`

- [ ] **Step 3: Implement the pure docs render module**

```js
import {
  DOCS_PAGE_GROUPS,
  DOCS_PAGE_ORDER,
  getDocsPageConfig,
} from '../docs-pages.js';

export function renderDocsSidebar(view) {
  return DOCS_PAGE_GROUPS.map((group) => {
    const items = group.pages
      .map((pageView) => {
        const config = getDocsPageConfig(pageView);
        if (!config) return '';
        const current = pageView === view ? ' aria-current="page"' : '';
        return `<a class="docs-shell__nav-link" href="/?view=${pageView}" data-docs-view="${pageView}"${current}>${config.navLabel}</a>`;
      })
      .join('');
    return `<section class="docs-shell__nav-group" data-docs-group="${group.label}">${items}</section>`;
  }).join('');
}

export function renderDocsPagination(view) {
  const index = DOCS_PAGE_ORDER.indexOf(view);
  const prevView = DOCS_PAGE_ORDER[index - 1] || null;
  const nextView = DOCS_PAGE_ORDER[index + 1] || null;
  const prevConfig = prevView ? getDocsPageConfig(prevView) : null;
  const nextConfig = nextView ? getDocsPageConfig(nextView) : null;
  return `<nav class="docs-shell__pagination">${
    prevConfig ? `<a href="/?view=${prevView}" data-docs-view="${prevView}">${prevConfig.navLabel}</a>` : ''
  }${
    nextConfig ? `<a href="/?view=${nextView}" data-docs-view="${nextView}">${nextConfig.navLabel}</a>` : ''
  }</nav>`;
}

export function renderDocsSiteMarkup({ view, pageTitle, bodyHtml }) {
  return `
    <div id="docsView" class="docs-view docs-view--site">
      <aside id="docsSidebarNav" class="docs-sidebar">${renderDocsSidebar(view)}</aside>
      <article class="docs-shell__page">
        <h1>${pageTitle}</h1>
        ${bodyHtml}
        ${renderDocsPagination(view)}
      </article>
    </div>
  `;
}
```

- [ ] **Step 4: Replace the inline docs markup builders in `store.js`**

Import and use:

```js
import { renderDocsSiteMarkup } from './lib/docs-site-render.js';
import { getDocsGuideConfig } from './lib/docs-guide-config.js';

function renderDocsSitePage(view = 'docs') {
  const pageConfig = getDocsPageConfig(view);
  const guideConfig = getDocsGuideConfig(view);
  const pageTitle = guideConfig?.title || pageConfig?.pageTitle || 'Docs';
  const bodyHtml = pageConfig?.bodyHtml || '';
  let page = document.getElementById('docsView');
  const markup = renderDocsSiteMarkup({ view, pageTitle, bodyHtml });
  if (!page) {
    gridArea.insertAdjacentHTML('beforeend', markup);
    page = document.getElementById('docsView');
  } else {
    page.outerHTML = markup;
    page = document.getElementById('docsView');
  }
  wireDocsPage(page);
}
```

- [ ] **Step 5: Re-run docs render verification**

Run: `node scripts/verify-docs-site-render.mjs`

Expected:

- `verify-docs-site-render: markup ok`

- [ ] **Step 6: Commit the docs render slice**

```bash
git add lib/docs-site-render.js scripts/verify-docs-site-render.mjs store.js
git commit -m "refactor: extract docs site rendering"
```

---

## Task 6: Final Verification and User QA Checkpoint

**Files:**

- No new files required
- Re-check: `main.js`
- Re-check: `store.js`
- Re-check: `lib/view-route-policy.js`
- Re-check: `lib/store-shell-contract.js`
- Re-check: `lib/docs-guide-config.js`
- Re-check: `lib/docs-site-render.js`

- [ ] **Step 1: Run the full verification suite for this slice**

Run:

- `node scripts/verify-view-route-policy.mjs`
- `node scripts/verify-store-shell-contract.mjs`
- `node scripts/verify-docs-site-render.mjs`
- `npm run verify:icon-grid-behavior`
- `npm run verify:search-query-fixtures`
- `npm run build`

Expected:

- all scripts pass
- Vite build succeeds
- no new route or docs regressions are reported

- [ ] **Step 2: Start a local preview build**

Run: `npm run preview`

Expected:

- local preview server starts

- [ ] **Step 3: User QA checkpoint**

Ask the user to test these in order and wait after each:

1. Open `/?view=packs`
   - expected: heading is `Premium Collections`
   - expected: URL still shows `?view=packs` after load
2. Open `/?view=pricing`
   - expected: heading is `Pricing`
   - expected: URL still shows `?view=pricing`
3. Open `/?view=docs-mcp-tools#icon-tools-search`
   - expected: docs route stays in the address bar
   - expected: hash scroll still works
4. Use the header docs search
   - expected: search opens docs results
   - expected: clicking a result moves to the matching docs page
5. Return to `All Icons`
   - expected: placeholder switches back to icon search

- [ ] **Step 4: Fix any issue found during user QA before moving to P1**

Do not start SI Registry scaffolding until this checkpoint is green.

- [ ] **Step 5: Commit the verified slice**

```bash
git add main.js store.js lib/view-route-policy.js lib/store-shell-contract.js lib/docs-guide-config.js lib/docs-site-render.js scripts/verify-view-route-policy.mjs scripts/verify-store-shell-contract.mjs scripts/verify-docs-site-render.mjs
git commit -m "refactor: stabilize route policy and extract docs shell"
```

---

## Expected Outcome After P0-C

When this plan is complete:

- direct store routes keep their shareable URL after load
- route rules are defined in one place
- `store.js` stops owning shell DOM during view switching
- the shell remains owned by `main.js`
- docs config and pure docs rendering move out of `store.js`
- the next refactor step becomes much safer

## What Comes Next

If P0-C is green, the next implementation step is:

1. small cleanup on any remaining launch-facing drift found during user QA
2. start SI Registry scaffolding without touching the route shell again
3. begin the first registry projections behind stable product facts and route behavior
