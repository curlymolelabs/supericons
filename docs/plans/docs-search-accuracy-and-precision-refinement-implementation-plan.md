Date: April 13, 2026
Status: Proposed
Scope: Improve docs search result quality and add exact term or phrase pinpointing after navigation

Depends on:

- [lib/docs-search-index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- [docs-search-accuracy-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/docs-search-accuracy-audit.md)

## Objective

Make docs search feel trustworthy for both:

- broad questions like `who can use converter`
- precise technical lookups like `targetWidth`, `selector_instructions`, and `SUPERICONS_API_KEY`

The search should do two things well:

1. rank the right page or section near the top
2. after the user clicks a result, take them to the exact matching word or phrase when that exact text exists on the page

## Problem Summary

The current docs search is useful for topic discovery, but it still behaves more like a page finder than a technical docs finder.

From the audit, the biggest gaps are:

- some alias boosts are never applied
- broad page entries often beat the more precise section
- technical terms in camelCase and snake_case are not normalized well
- exact field names and environment variables are not strongly prioritized
- after navigation, the user lands on a page or section, but not on the exact term they searched for

That last point matters because users are now treating the docs search like a fast `find in page`.

## Product Decision

Refine the docs search in two layers:

### Layer 1: better result accuracy

Improve how search builds and ranks results so exact technical matches and the most relevant section rise to the top.

### Layer 2: precise landing after click

When the search query appears literally in the destination page:

- highlight the exact word or phrase
- scroll to the first exact match
- make it feel closer to a docs-native `find` experience

If the exact phrase does not exist, keep the current section landing behavior as the fallback.

## Success Criteria

The refined search should behave like this:

- `targetWidth` and `target width` both lead to the Converter SVG to PNG parameter area
- `selector_instructions` lands in the Motion Lab CSS export area and highlights the field name
- `SUPERICONS_API_KEY` leads to API-key-related setup pages and highlights the exact variable when present
- `single-color-mark` leads to the most relevant Converter settings content, not a broad overview page
- broad searches like `browser vs mcp` and `motion css` still work well

## Workstreams

## Workstream A: Fix the Search Index Foundation

### Goal

Make the index reflect what users actually read, not raw HTML or partially wired alias rules.

### Changes

1. Fix alias collection so both of these can work:
   - page-wide semantic aliases
   - section-specific semantic aliases

2. Stop indexing raw HTML for page entries.
   - parse page content into visible text first
   - use readable text content for ranking

3. Normalize technical tokens more intelligently.
   - keep original code-style terms
   - also generate humanized variants

Examples:

- `targetWidth` -> `targetwidth`, `target width`
- `selector_instructions` -> `selector instructions`
- `SUPERICONS_API_KEY` -> `supericons api key`

### Expected outcome

The search index becomes cleaner, more human-readable, and much better at technical lookup.

## Workstream B: Improve Ranking and Result Selection

### Goal

Make the best section survive instead of letting broad page matches dominate.

### Changes

1. Add stronger exact-match scoring for:
   - parameter names
   - field names
   - code terms
   - environment variables

2. Separate broad semantic ranking from exact technical ranking.

Suggested approach:

- if the query looks code-like, boost exact technical matches much more aggressively
- if the query is natural language, keep semantic alias ranking strong

3. Change dedupe behavior.

Instead of one result per page too early, prefer:

- exact matching section
- then exact matching page
- then broader fallback page

4. Reduce the influence of very broad aliases on technical queries.

Examples of broad aliases that should not overpower exact field matches:

- `overview`
- `workflow`
- `converter`
- `pricing`

### Expected outcome

Search results feel sharper, less noisy, and more trustworthy for precise questions.

## Workstream C: Add Exact Phrase Pinpointing After Navigation

### Goal

Make clicked results land where the user expects, not just on the right page.

### Behavior

When a user clicks a result:

1. carry the original query into docs navigation state
2. after the target page renders, scan the page for the exact query
3. if an exact match exists:
   - highlight it
   - scroll to the first match
4. if no exact match exists:
   - fall back to the current section-anchor behavior

### Important rules

- exact literal phrase match should be preferred first
- if the query is code-like, exact code match should count
- highlighting should be scoped to the docs content area only
- highlights should not permanently mutate docs content

### Visual behavior

Use a subtle docs-native highlight style:

- warm accent background
- readable text contrast
- not as loud as browser find

Optional later enhancement:

- next match / previous match controls

Not required for the first pass.

### Expected outcome

Searching `targetWidth` or `selector_instructions` feels much closer to a built-in docs find experience.

## Workstream D: Tune Search Results for Real Queries

### Goal

Use real query examples to make ranking decisions instead of guessing.

### Required test queries

Technical exact-match queries:

- `targetWidth`
- `target width`
- `selector_instructions`
- `selector token`
- `SUPERICONS_API_KEY`
- `single-color-mark`

Task and concept queries:

- `api key`
- `pro plan`
- `browser vs mcp`
- `motion css`
- `who can use converter`
- `pack ownership`

### Expected outcome

We tune the ranker against the kinds of searches users are already making.

## Implementation Order

### Phase 1: Index and ranking fixes

Implement first:

1. fix dead alias handling
2. switch page indexing to visible text
3. add technical token normalization
4. update dedupe logic
5. add exact technical boosts

Reason:

There is no point adding pinpoint highlighting if the wrong page still wins.

### Phase 2: Exact-match landing and highlighting

Implement second:

1. preserve the query through search result navigation
2. scan the destination docs page for exact matches
3. highlight the first match
4. scroll to it automatically
5. keep section-anchor fallback when no exact literal match exists

### Phase 3: Ranking polish

Implement third:

1. tune broad alias weights
2. trim noisy fallback pages
3. refine previews if needed

## File-Level Change Plan

### [lib/docs-search-index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js)

Planned changes:

- fix alias collection rules
- parse page text from rendered content
- add code-aware normalization helpers
- add query classification helpers
- revise scoring
- revise dedupe

### [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)

Planned changes:

- carry the query through result navigation
- apply exact-match highlighting after docs page render
- scroll to first exact match
- clear and reapply highlights safely on subsequent searches or page switches

### [style.css](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/style.css)

Planned changes:

- add docs highlight styles for exact matches
- ensure highlight style is visible but not visually noisy

### [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)

Possible changes:

- add or refine semantic aliases only if ranking still needs help after index and scoring fixes

## Verification Plan

### Required checks

- `npm run build`

### Browser validation

Check at minimum:

1. docs search still opens and closes correctly in the shared header
2. main-site icon search still works outside docs views
3. `targetWidth` and `target width` both land in the expected Converter area
4. `selector_instructions` highlights the exact field name
5. `SUPERICONS_API_KEY` highlights the exact env var where present
6. a broad semantic query like `browser vs mcp` still returns the right section near the top

## Risks

### Risk: over-tuning for technical queries

If exact-term boosts become too strong, broad semantic discovery can get worse.

Mitigation:

- classify technical queries separately from natural-language queries

### Risk: noisy or broken highlighting

Highlighting can become visually messy if it affects too much content or mutates large HTML blocks.

Mitigation:

- highlight only inside the docs article
- clear highlights before applying new ones
- use conservative exact-match targeting first

### Risk: code examples dominate ranking too much

If code blocks are scored too heavily, setup pages may outrank clearer explanatory pages for broad queries.

Mitigation:

- use exact boosts for code-like queries, not for every query

## Recommended next step

Implement Phase 1 first:

- index fixes
- technical normalization
- dedupe improvement
- exact technical boosts

Then validate the ranking again before adding the phrase-highlighting layer.

That gives us the right order:

- first make search accurate
- then make the landing precise
