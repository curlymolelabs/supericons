# P0-B Launch QA and Refactor Dependency Audit

Date: 2026-04-19
Status: Completed
Scope: launch-facing QA for the P0 product-facts slice, plus a dependency audit of the large frontend files before any refactor work.

## Why this exists

P0-A fixed the product-facts drift at the shared-data level and fixed the packs title overwrite bug.

P0-B answers two follow-up questions:

1. Did the launch-facing flows still behave correctly in a real browser after those changes?
2. Where is the actual coupling risk in `main.js`, `store.js`, and `style.css`, so we can refactor without breaking the app?

## QA scope

The browser QA pass covered:

- `/?view=packs`
- premium collection preview / detail
- `/?view=pricing`
- `/?view=docs`
- `/?view=docs-mcp-tools`
- search placeholder behavior
- no-results empty state

Verification environment:

- local preview build via `npm run preview`
- browser automation via Playwright CLI
- follow-up verification already green from P0-A:
  - `node scripts/build-product-facts.mjs`
  - `node scripts/verify-product-facts.mjs`
  - `npm run verify:icon-grid-behavior`
  - `npm run verify:search-query-fixtures`
  - `npm run build`

## QA results

### What passed

1. Packs heading ownership is fixed.
   - Opening `/?view=packs` now renders the page heading as `Premium Collections`.
   - The icon-grid heading logic no longer overwrites the store-owned title.
   - Relevant implementation: [main.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:1589>), [lib/icon-grid-behavior.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/icon-grid-behavior.js:149>), [scripts/verify-icon-grid-behavior.mjs](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/scripts/verify-icon-grid-behavior.mjs:157>)

2. Premium collection detail titles are correct.
   - Previewing a collection correctly switched the heading from `Premium Collections` to the selected collection title, for example `Agentic AI`.
   - Relevant implementation: [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:1222>)

3. Pricing is reading the shared facts layer in the high-surface copy we targeted.
   - Free tier card and key MCP-related labels show the expected rounded counts.
   - Relevant implementation: [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:4249>)

4. MCP docs now match the real tool count.
   - `docs-mcp-tools` rendered `12 tools` and `3 tools are free`.
   - The `search_icons` row now reflects the shared free-icon label.
   - Relevant implementation: [docs-pages.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js:633>)

5. Search mode placeholder switching still works.
   - icon browsing shows `Search 20,000+ icons...`
   - docs pages switch to `Search docs`
   - Relevant implementation: [main.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:665>)

6. No-results empty state still behaves correctly.
   - Searching a nonsense string produced the expected empty-state heading and message without UI breakage.
   - Relevant implementation: [main.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:1034>)

7. No browser console errors were observed during the checked flows.

### Improvement areas found during QA

1. Non-doc store routes do not keep their `?view=` URL after hydration.
   - `/?view=docs` stays in the address bar.
   - `/?view=packs` and `/?view=pricing` render correctly, but the URL is cleaned back to `/`.
   - This is not the same as a broken deep link. The route still opens correctly from the incoming URL.
   - The tradeoff is shareability and user expectation after load: if someone copies the URL after the page renders, they may copy `/` instead of the store route they are on.
   - Relevant code:
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:192>)
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:520>)
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:640>)

2. `index.html` still contains intentionally static launch copy.
   - The runtime shell and docs now read from the shared facts layer in the areas we changed.
   - The landing page title, meta tags, hero copy, and other static HTML strings still use hand-authored values.
   - This is acceptable for launch if we treat them as intentionally rounded marketing copy.
   - Relevant file: [index.html](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html:8>)

3. Bundle-size warning still exists.
   - Build passes, but Vite still warns about a large JavaScript chunk.
   - This is not a blocker for the current P0 slice, but it reinforces the need for safe boundary extraction.

## Dependency audit

## Main conclusion

The biggest refactor risk is not file size alone. The real risk is that:

- `main.js` owns the shared shell state and free-icon surface
- `store.js` directly reaches into that shell and mutates many of the same DOM anchors
- `style.css` contains multiple overlapping product surfaces and repeated selector blocks

That means the app works today, but a careless extraction could break route transitions, panel rendering, or shell state in ways that are hard to detect from a single happy-path test.

## File 1: `main.js`

Approximate role:

- main application shell
- free-icon browsing and search
- customize panel
- compare drawer
- shell-level event listeners
- shell-to-store bridge through imports and `window.__supericons`

Why it is risky:

1. It owns the shared DOM anchors that store views reuse.
   - `gridArea`, `gridTitle`, `gridMeta`, `panel`, `panelPreview`, `searchInput`, `mainLayout`
   - Relevant lines: [main.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:622>)

2. It exports behavior to the store layer through a global bridge.
   - `window.__supericons` exposes shell methods that `store.js` calls later.
   - Relevant lines: [main.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/main.js:3653>)

3. It mixes layout state, data state, render logic, and listeners in one file.
   - state definition, rendering, exports, search, compare, contact modal, landing behavior, and init all live together.

Coupling indicators:

- roughly `130+` shell helper lookups through `$()`
- roughly `25+` `$$()` helper calls
- roughly `88` event listeners
- imports store-specific routing helpers directly from [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:1>)

Best extraction target first:

- shell-only helpers that do not own premium/store logic:
  - header search chrome
  - grid heading and meta helpers
  - shell DOM lookup map
  - compare drawer

## File 2: `store.js`

Approximate role:

- store routing
- packs catalog
- collection detail
- pricing
- downloads
- dashboard
- API keys
- docs site
- motion lab
- converter
- purchase flow
- premium panel rendering

Why it is risky:

1. It is the app’s route controller and a giant feature host at the same time.
   - One file decides view switching and also contains most store-facing features.
   - Relevant lines: [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:626>)

2. It repeatedly reaches into shell-owned DOM.
   - `document.getElementById('gridArea')`
   - `document.getElementById('gridTitle')`
   - `document.getElementById('gridMeta')`
   - `document.getElementById('panel')`
   - `document.getElementById('panelPreview')`
   - `document.getElementById('searchInput')`
   - Example lines:
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:706>)
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:1232>)
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:3476>)

3. It depends on `window.__supericons` as a hidden integration contract.
   - This avoids an import cycle, but it also makes the main/store boundary implicit instead of explicit.
   - Relevant lines:
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:627>)
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:4676>)

4. Route persistence rules are split between parsing and mutation logic.
   - Docs routes persist in the URL.
   - Other store routes deep-link in, but clean back to `/`.
   - Relevant lines:
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:192>)
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:520>)
     - [store.js](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js:640>)

Coupling indicators:

- roughly `29` `render*` functions
- roughly `305` `document.getElementById(...)` calls
- roughly `210` event listeners
- `6` `window.__supericons` references

Best extraction target first:

1. route metadata and history policy
2. docs site rendering
3. pricing rendering
4. premium collection surface

Best extraction target later:

- motion lab
- converter

Those are larger tools with more internal state, so they should move only after the store-shell contract is cleaner.

## File 3: `style.css`

Approximate role:

- core shell
- landing page
- sidebar animations
- grid
- panel
- auth
- packs
- pricing
- docs
- collection detail
- locked panel
- dashboard
- API keys
- motion lab
- converter
- responsive and theme overrides

Why it is risky:

1. It mixes many product surfaces in one file.
   - This makes targeted edits slower and increases the chance of accidental override collisions.

2. Several selector families are repeated multiple times.
   - Pricing selectors are repeated in multiple blocks.
   - Docs-site selectors are repeated in multiple blocks.
   - Example duplicates:
     - `.pricing-grid {` at lines `5934`, `6311`, `6320`, `6404`, `8165`, `8247`
     - `.pricing-card {` at lines `5943`, `6413`, `8169`, `8253`
     - `.docs-view--site {` at lines `7360`, `8063`, `8122`

3. Repeated overrides make future debugging expensive.
   - A visual issue may not be defined where it first appears.
   - It may be overridden again later for theme, responsive mode, or a second pass on the same feature family.

Best extraction target first:

- split by surface, not by one giant “cleanup”
- suggested order:
  1. `styles/shell.css`
  2. `styles/grid-and-panel.css`
  3. `styles/packs-and-pricing.css`
  4. `styles/docs.css`
  5. `styles/auth-and-account.css`
  6. `styles/tools-motion-lab.css`
  7. `styles/tools-converter.css`

Keep one top-level [style.css](</D:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css:1>) as the import entry during transition, and use `@import` or a build-time concat path so the app does not need a risky one-shot CSS migration.

## Safe refactor plan

## What to do next

### Step 1

Lock the shell contract before moving features.

Create a small boundary layer that owns:

- `gridArea`
- `gridTitle`
- `gridMeta`
- `panel`
- `panelPreview`
- `searchInput`
- shell title updates
- shell search mode updates

That lets `store.js` stop reaching directly into raw shell nodes.

### Step 2

Move route metadata into one place.

The sets around docs, persistent routes, and direct routes should be defined from one route registry object instead of multiple partially overlapping `Set`s.

### Step 3

Extract the least risky route family first.

Recommended first extraction:

- docs site rendering and docs history helpers

Why:

- already route-bounded
- mostly read-oriented
- lower purchase / entitlement risk than packs or billing

### Step 4

Extract pricing next.

Why:

- visually self-contained
- repeated CSS is already obvious
- high launch value
- lower runtime complexity than motion lab or converter

### Step 5

Extract premium collections after the shell contract exists.

Why:

- it touches both route rendering and the shared panel
- it is more coupled than pricing or docs

## Guardrails for every extraction

1. Do not change route behavior and refactor boundaries in the same pass unless the route behavior is the point of the change.
2. Preserve current DOM ids and data attributes until the extraction is verified.
3. Keep `window.__supericons` stable until the new shell contract fully replaces it.
4. Run:
   - `npm run verify:icon-grid-behavior`
   - `npm run verify:search-query-fixtures`
   - `node scripts/verify-product-facts.mjs`
   - `npm run build`
5. Re-run browser QA on:
   - packs
   - collection detail
   - pricing
   - docs
   - one no-results search

## Recommended next implementation slice

P0-C should be:

1. add a route registry / history policy module
2. decide whether packs/pricing/downloads/dashboard should persist `?view=` in the address bar
3. add a shell contract module so `store.js` can stop reaching directly into shared shell nodes
4. extract docs rendering as the first refactor slice

## User testing need

No user-only test is required to continue from this point.

If we choose to change route persistence next, that is the first place where a quick manual confirmation in your app browser would be useful, because it affects copy/share behavior and perceived navigation polish.
