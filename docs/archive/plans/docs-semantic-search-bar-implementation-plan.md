Date: April 13, 2026
Status: Proposed
Scope: Add a robust semantic search bar to the docs experience

Depends on:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

## Objective

Add a docs search bar that helps users find the right page or section even when they do not know the exact page title.

The search should work well for:

- exact lookups like `cursor setup`
- concept searches like `who gets converter`
- intent searches like `how do i add my api key`
- fuzzy wording like `pro vs pack`, `pricing for motion lab`, or `copy motion css`

Success means a user can type what they mean, not just what the docs page is called, and still land on the right answer quickly.

## Problem Statement

The docs are now much deeper:

- overview pages
- MCP setup guides
- MCP reference pages
- Motion Lab guides
- Converter guides
- access and troubleshooting placeholders

The left sidebar is useful when the user already knows roughly where to look. It is not the fastest path when the user has a question like:

- `How do I connect Codex?`
- `Can pack buyers use Motion Lab?`
- `Where does selector_instructions come from?`
- `How do I convert PNG to SVG?`

The docs need a direct search layer that understands user intent, not only page labels.

## Product Decision

Build a hybrid semantic search bar for docs.

That means:

1. a visible search input in the docs shell
2. a local search index generated from the docs content
3. weighted matching across:
   - page titles
   - summaries
   - section headings
   - body text
   - curated aliases and intent phrases
4. ranked results that can jump to:
   - a docs page
   - a specific section anchor inside that page

## Why Hybrid Instead of Pure Vector Search

For this docs surface, a pure embedding-based system would be heavier than necessary.

The docs are:

- finite
- local
- structured
- shipped inside the app

So the best first version is:

- local
- fast
- deterministic
- offline-friendly
- good enough semantically because it includes curated aliases and intent mapping

This gives us semantic behavior without introducing:

- a hosted search dependency
- query latency
- API cost
- privacy concerns
- operational drift

If the docs grow much larger later, we can still add a vector layer on top of this foundation.

## User Experience Goals

### Primary behavior

The docs search should:

- always be visible near the top of the docs shell
- search across all docs pages and sections
- show ranked results as the user types
- support keyboard selection
- open the matching page and scroll to the right section

### What users should be able to type

Examples:

- `codex`
- `cursor api key`
- `motion lab export css`
- `animated svg`
- `who can use converter`
- `pro plan`
- `pack ownership`
- `png tracing`
- `svg to png background`
- `selector token`

### Result presentation

Each result should show:

- page title
- section title if applicable
- short preview line
- page group label such as `MCP Setup`, `Motion Lab`, or `Converter`

Example:

- `Motion Lab Exports`
  - `Motion Lab CSS`
  - `How to use CSS export with inline SVG`

### Empty state

If no results match:

- show a friendly empty state
- offer the closest page groups as fallback:
  - `MCP Setup`
  - `Motion Lab`
  - `Converter`
  - `Access and API Keys`

## Search Scope

Search should index:

### Page-level fields

- `pageTitle`
- `navLabel`
- `summary`
- `kicker`
- page group label from `DOCS_PAGE_GROUPS`

### Section-level fields

Extract from `bodyHtml`:

- section IDs
- section titles
- subsection titles
- paragraph text
- list item text
- table headings
- table cell text

### Curated semantic aliases

Each page or section should also support extra hidden search phrases like:

- `pricing`
- `subscription`
- `pro plan`
- `pack ownership`
- `api key`
- `authentication`
- `motion css`
- `animated svg`
- `png tracing`
- `svg raster export`
- `cursor setup`
- `claude desktop`
- `codex config`

This alias layer is where the semantic lift comes from.

## Information Architecture Strategy

Treat search results as two content types:

### 1. Pages

Use when the query is broad:

- `motion lab`
- `converter`
- `quickstart`
- `api keys`

### 2. Sections

Use when the query is task-specific:

- `selector token`
- `png to svg settings`
- `who can use motion lab`
- `cursor premium tools`

Users should not have to open a whole page and then scan manually if we already know the target section.

## Technical Design

### Current architecture

The docs shell is rendered in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):

- `renderDocsSitePage()`
- `renderDocsSidebar()`

The docs content lives in [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):

- `DOCS_PAGES`
- `DOCS_PAGE_GROUPS`

That split is good for search:

- `docs-pages.js` is the content source
- `store.js` is the UI shell and interaction layer

### Proposed architecture

Add three pieces:

#### A. Search index builder

Add a small docs indexing utility that:

- reads `DOCS_PAGES`
- maps page views to group labels
- parses `bodyHtml` into searchable sections
- generates a normalized search dataset

Possible file:

- `lib/docs-search-index.js`

#### B. Search ranking layer

Use a lightweight local search library or a custom weighted matcher.

Recommended options:

1. `MiniSearch`
   - strong lightweight default
   - good field weighting
   - fuzzy search support
   - simple enough for this repo

2. custom scorer
   - more control
   - no dependency
   - slightly more work

Recommendation:

- use `MiniSearch` unless bundle growth becomes a concern

#### C. UI layer in docs shell

Add search UI to `renderDocsSitePage()`:

- search input in the sidebar head or top of content column
- results popover or dedicated results panel
- selection handling
- keyboard shortcuts

## Ranking Model

Use weighted ranking rather than flat text matching.

### Highest weight

- exact title match
- exact section title match
- exact alias match

### Medium weight

- summary text
- subsection headings
- page group label

### Lower weight

- paragraph body text
- table text
- list items

### Boost rules

Boost results when:

- query terms appear in both title and summary
- query includes a known synonym such as `pro`, `subscription`, `pricing`
- query maps to an access concept or product concept alias

### Deduping

Avoid clutter by:

- limiting one top result per page in the first result set
- allowing section-level expansion when the user keeps typing

## Semantic Layer

The semantic layer should come from curated aliases, not only fuzzy matching.

Examples:

### Access concepts

- `pro`
- `pro plan`
- `subscription`
- `pricing`
- `pack`
- `collection ownership`
- `what do i get`
- `who can use motion lab`
- `who can use converter`

### Motion Lab concepts

- `animation`
- `motion css`
- `animated svg`
- `selector token`
- `selector instructions`
- `hover animation`

### Converter concepts

- `png tracing`
- `trace png`
- `svg raster`
- `export png`
- `background color`
- `quality mode`

### Setup concepts

- `codex config`
- `cursor setup`
- `claude desktop`
- `api key env`
- `mcp install`

This should be stored as per-page or per-section aliases, not embedded ad hoc in the UI code.

## Interaction Design

### Placement

Recommended placement:

- top of the docs sidebar, under the `Supericons Docs` label

Why:

- search stays visible while navigating
- it complements the sidebar instead of competing with the hero
- it keeps the interaction local to the docs shell

### Keyboard support

Support:

- `/` to focus docs search when the docs shell is active
- `ArrowDown` / `ArrowUp` to move through results
- `Enter` to open selected result
- `Escape` to close result list

### Mobile behavior

On small screens:

- search input should stay visible at the top of the content area
- result list should open as a full-width panel under the input

### Highlighting

Optional but useful:

- bold matched terms in result previews

## Navigation Behavior

When the user selects a result:

1. switch to the result page view
2. update the URL
3. apply the hash if the result targets a section
4. scroll to the section
5. briefly highlight the target section if feasible

This should reuse the current docs route behavior, not invent a separate navigation model.

## State Model

Add docs-search-specific state in `store.js`:

- current query
- current results
- active result index
- open/closed state

Keep this state separate from:

- page navigation state
- docs sidebar group expansion state

This avoids accidental coupling.

## Phased Rollout

### Phase 1: Search foundation

- build docs search dataset from `DOCS_PAGES`
- parse section headings and body text
- add simple local ranked search
- render results list
- support page and section navigation

Success condition:

- users can type obvious queries and reach the right page or section quickly

### Phase 2: Semantic alias layer

- add curated aliases for each page and section
- tune ranking for intent-style queries
- improve access-language queries and setup-language queries

Success condition:

- fuzzy human questions return better results than plain keyword matching alone

### Phase 3: UX polish

- keyboard shortcuts
- result previews
- highlight active match
- mobile polish
- empty-state suggestions

Success condition:

- search feels native and fast, not bolted on

### Phase 4: Analytics and tuning

- optionally log anonymous query counts locally or through existing analytics
- identify zero-result queries
- refine aliases and ranking based on real usage

Success condition:

- search quality improves over time using real query evidence

## Verification Plan

The feature is complete only if:

1. users can search by page title and find the right docs page
2. users can search by natural task phrasing and still find the right page
3. section-level results jump to the correct anchor
4. keyboard navigation works
5. result ranking feels sensible across Motion Lab, Converter, setup, and access queries
6. the docs sidebar and page navigation still behave correctly
7. `npm run build` passes

## Test Query Set

Use this as the initial smoke set:

- `codex`
- `cursor api key`
- `motion lab`
- `animated svg`
- `motion css`
- `converter`
- `png to svg`
- `svg to png background`
- `who can use converter`
- `pack ownership`
- `pro plan`
- `selector token`
- `api key`

## Risks

### 1. Weak semantic quality if we rely only on fuzzy matching

Mitigation:

- add curated aliases and concept phrases

### 2. Search results feel noisy if every section is indexed equally

Mitigation:

- weight titles and headings more heavily
- dedupe by page in the top results

### 3. Bundle growth

Mitigation:

- prefer a lightweight library like MiniSearch
- keep the search dataset compact

### 4. Fragile section extraction

Mitigation:

- build extraction around the existing structured `bodyHtml`
- prefer sections and headings over deep HTML heuristics

## Files Likely To Change

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- a new indexing helper such as:
  - `lib/docs-search-index.js`

Possible dependency:

- `minisearch`

## Recommendation

Build this as a local hybrid semantic search system, not a hosted search service.

That gives us:

- good semantic behavior
- low complexity
- no external dependency
- no regression risk to the current docs content model

## Bottom Line

The best version of docs search here is:

- visible
- local
- section-aware
- alias-driven
- strong on user intent, not just exact words

That will make the docs much faster to use without turning the static docs system into something fragile.
