# Docs Semantic API MCP Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the public docs so humans and AI-agent users understand Supericons semantic search, API-style hosted search, MCP setup, and the new intent mind-map behavior.

**Architecture:** Keep the docs inside the existing docs system. `docs-pages.js` owns page definitions and sidebar groups. `lib/docs-site-render.js` renders the docs shell. `lib/docs-search-index.js` indexes page copy for the docs search box. The update should add one focused developer/API page, improve existing overview/MCP pages, and add examples that prove semantic search is stronger than exact-name search.

**Tech Stack:** Vanilla JS docs config in `docs-pages.js`, existing docs renderer, Vite build, Playwright/browser smoke checks, existing `verify:docs-site-render` and `npm run build`.

---

## Audit Findings

Verified in current files:

- `index.html` already markets “AI semantic search” in meta/hero copy, but the docs do not explain what that means.
- `docs-pages.js` currently has groups for Overview, MCP Setup, MCP Reference, Motion Lab, Converter, Access/API Keys, and Troubleshooting.
- The public docs have MCP setup pages and MCP tool reference pages.
- The docs currently focus on local `npx -y supericons-mcp` setup, premium key setup, Motion Lab, and Converter.
- The docs do not have a dedicated “API + MCP Search” page similar to IconStack’s developer-facing API page.
- The docs do not explain the semantic registry, intent dictionary, or mind-map layer.
- The docs do not show examples like `beautiful`, `smelly`, `stupid`, `AI dashboard model dataset evaluation`, even though live hosted search now supports them.
- The docs do not clearly separate these concepts:
  - registry describes icons
  - mind map translates human intent
  - hosted search and MCP consume generated search rules
- The docs do not show live hosted endpoint examples or response shape for `mcp-search` / `search-icons`.
- The docs do not mention that vague-word coverage grows through weak-query review and approved mind-map aliases.

## Recommended Scope

Do this before launch marketing. IconStack’s docs look clearer because they lead with developer onboarding. Supericons can beat that by pairing clear API/MCP setup with better semantic examples.

Do not expose internal workflow metadata, model names, review process details, or private registry operations. Keep the docs public-safe and product-focused.

---

### Task 1: Add A Dedicated API + MCP Search Docs Page

**Files:**
- Modify: `docs-pages.js`

- [ ] **Step 1: Add the page to the docs navigation**

Add a new page id named `docs-api-mcp-search` under the `MCP Reference` group, ideally before `docs-mcp-tools`.

Expected group shape:

```js
{
  label: 'MCP Reference',
  pages: ['docs-api-mcp-search', 'docs-mcp-tools', 'docs-mcp-icons', 'docs-mcp-motion', 'docs-mcp-converter'],
}
```

- [ ] **Step 2: Add the page config**

Add a `docs-api-mcp-search` entry in `docsPages` with:

```js
'docs-api-mcp-search': {
  navLabel: 'API + MCP Search',
  kicker: 'Search API and MCP',
  pageTitle: 'Search Icons by Meaning',
  summary: 'Use Supericons search from the browser, MCP, or hosted endpoints. Search exact icon names or natural words like beautiful, smelly, broken, and dataset.',
  bodyHtml: `...`
}
```

- [ ] **Step 3: Include these sections**

Use the existing docs markup classes:

```html
<section class="docs-section" id="api-mcp-overview">
  <h2 class="docs-section__title">What search understands</h2>
  <p class="docs-section__copy">Supericons search combines exact names, semantic icon records, and a meaning map for natural words.</p>
</section>
```

Include a simple table:

```html
<table class="docs-table">
  <thead>
    <tr><th>User searches</th><th>Search expands toward</th><th>Useful for</th></tr>
  </thead>
  <tbody>
    <tr><td><code>beautiful</code></td><td>palette, swatch, sparkle, star</td><td>design polish and visual style</td></tr>
    <tr><td><code>smelly</code></td><td>trash, alert, nose, cloud</td><td>bad odor, dirty state, warning</td></tr>
    <tr><td><code>stupid</code></td><td>mistake, error, confused, warning, bug</td><td>failure or confused state</td></tr>
    <tr><td><code>dataset</code></td><td>table, database, grid rows</td><td>AI and data products</td></tr>
  </tbody>
</table>
```

- [ ] **Step 4: Include MCP prompt examples**

Add examples written as user prompts, not just JSON:

```text
Find me a clean database icon.
Search Lucide for user profile icons.
Recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring.
Find icons that feel beautiful or polished.
Find an icon for something smelly or dirty.
```

- [ ] **Step 5: Include hosted endpoint examples**

Document the public hosted endpoint that is already deployed:

```text
POST https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search
```

Use a copyable code block:

```bash
curl -X POST "https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search" \
  -H "Content-Type: application/json" \
  -d '{"query":"beautiful","limit":5,"source":"docs"}'
```

Do not include secret keys in docs.

- [ ] **Step 6: Include response shape**

Show a short response shape:

```json
{
  "query": "beautiful",
  "results": [
    {
      "icon_id": "tabler:palette",
      "name": "palette",
      "library": "tabler",
      "score": 1344
    }
  ],
  "query_expansion": {
    "expanded": true,
    "variants": ["beautiful", "design theme", "palette", "swatch", "sparkles", "star"]
  }
}
```

Use representative data only if current live verification confirms the same shape.

---

### Task 2: Refresh Existing Overview And Quickstart Copy

**Files:**
- Modify: `docs-pages.js`

- [ ] **Step 1: Update docs home cards**

Add a card on the docs home for API + MCP Search:

```html
<article class="docs-card">
  <div class="docs-card__head">
    <h3>Search by meaning</h3>
    <a class="docs-btn docs-btn--ghost" href="${docsHref('docs-api-mcp-search')}" data-docs-view="docs-api-mcp-search">Open search guide</a>
  </div>
  <p>Learn how Supericons maps natural words to useful icon concepts for browser search and MCP.</p>
</article>
```

- [ ] **Step 2: Update What Is Supericons**

Replace the single generic “AI semantic search” row with simple language:

```html
<tr><td>Meaning-aware search for exact names and natural words</td><td>Yes</td><td>Yes</td></tr>
```

Add one paragraph:

```html
<p class="docs-section__copy">The registry describes each icon. The search mind map translates human words like beautiful, smelly, broken, or dataset into icon concepts.</p>
```

- [ ] **Step 3: Update quickstart examples**

Add one semantic search prompt to the free setup examples:

```html
<li>"Find icons that feel beautiful or polished."</li>
<li>"Find an icon for a smelly or dirty state."</li>
```

---

### Task 3: Update MCP Tool Reference Copy

**Files:**
- Modify: `docs-pages.js`

- [ ] **Step 1: Update `docs-mcp-tools` intro**

Mention that `search_icons` uses semantic records plus the meaning map for natural words.

Suggested copy:

```html
<p class="docs-section__copy"><code>search_icons</code> supports exact icon names, common synonyms, semantic registry records, and natural-word meaning expansion. That means agents can search for database, user profile, beautiful, smelly, broken, dataset, and similar human-language requests.</p>
```

- [ ] **Step 2: Add a “Good MCP prompts” section**

Add a section under the MCP tools page:

```html
<section class="docs-section" id="mcp-search-prompts">
  <h2 class="docs-section__title">Good search prompts</h2>
  <ul>
    <li>Find me a database icon.</li>
    <li>Search Lucide for user profile icons.</li>
    <li>Recommend icons for an AI dashboard: model, prompt, dataset, evaluation, deployment, and monitoring.</li>
    <li>Find icons that feel premium, beautiful, or polished.</li>
    <li>Find an icon for something broken, wrong, or risky.</li>
  </ul>
</section>
```

---

### Task 4: Add A Public-Safe Search Model Note

**Files:**
- Modify: `docs-pages.js`

- [ ] **Step 1: Add simple explanation**

Add a section to `docs-api-mcp-search`:

```html
<section class="docs-section" id="search-model">
  <h2 class="docs-section__title">How the search model stays clean</h2>
  <p class="docs-section__copy">Icon records stay factual. They describe the icon itself. The search mind map handles broader human words and connects them to icon concepts.</p>
  <p class="docs-section__copy">When a search term is weak, Supericons can add that word to a meaning node instead of adding vague tags to every icon.</p>
</section>
```

Do not mention internal agent workflows, private review queues, model names, or unpublished process details.

---

### Task 5: Verification

**Files:**
- No new source files unless tests need updating.

- [ ] **Step 1: Run docs render check**

Run:

```powershell
npm run verify:docs-site-render
```

Expected:

```text
verify-docs-site-render: ok
```

- [ ] **Step 2: Run broader search gates**

Run:

```powershell
npm run verify:search-intent-dictionary
npm run verify:search-intent-expansion
npm run verify:hosted-search-intent-live
```

Expected: all pass.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: Vite production build passes.

- [ ] **Step 4: Browser smoke test docs**

Open:

```text
http://127.0.0.1:4173/?view=docs-api-mcp-search
```

Check:

- Page renders.
- Sidebar shows “API + MCP Search.”
- Copy blocks are visible.
- No console errors.
- Header docs search finds the new page when searching `semantic`, `beautiful`, `MCP`, or `API`.

---

## Launch Recommendation

Update docs before broad public launch. The search engine is now strong enough, but the public docs undersell it. The highest-impact docs page is a developer-first “API + MCP Search” page that makes Supericons look ready for humans and AI agents.

## Self-Review

- Spec coverage: Covers docs audit, new API/MCP page, overview refresh, MCP reference refresh, public-safe search model explanation, and verification.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: Uses existing `docsPages`, `docsPageGroups`, `docsHref`, `docsLink`, and docs CSS classes.
