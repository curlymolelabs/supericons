# Docs Search Accuracy Audit

Date: 2026-04-13

## Scope

Audit of the local docs search implementation and live result quality for the shared-header docs search.

Files reviewed:

- [lib/docs-search-index.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js)
- [store.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js)
- [docs-pages.js](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)

Live queries checked in browser:

- `targetWidth`
- `target width`
- `selector_instructions`
- `selector token`
- `SUPERICONS_API_KEY`
- `api key`
- `single-color-mark`
- `browser vs mcp`
- `motion css`

## Findings

### High: section aliases are partially dead and never applied

File:

- [lib/docs-search-index.js:39](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L39)
- [lib/docs-search-index.js:94](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L94)

Problem:

- `SECTION_ALIASES` contains entries keyed only by page view:
  - `docs-converter-svg-to-png`
  - `docs-converter-png-to-svg`
  - `docs-access-premium`
- `collectAliases()` only reads section aliases using the `view#sectionId` form when `sectionId` is present.
- Those page-scoped section aliases are never applied anywhere.

Impact:

- intended boosts for phrases like `target width`, `png tracing`, and `pro plan` are silently lost
- ranking falls back to weaker body-text matches instead of explicit semantic hints

Evidence:

- `target width` finds the right page, but this appears to come from body text rather than the intended alias path
- `pro plan` ranks unevenly and misses a cleaner access page lead result

Suggested fix:

- support both alias scopes in `collectAliases()`:
  - page-wide aliases from `SECTION_ALIASES[view]`
  - section-specific aliases from `SECTION_ALIASES[view#sectionId]`
- or merge those page-scoped entries into `PAGE_ALIASES`

### High: per-view dedupe hides the most precise match

File:

- [lib/docs-search-index.js:199](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L199)
- [lib/docs-search-index.js:211](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L211)

Problem:

- search results are deduped to one result per `view`
- page and section entries compete against each other
- once one entry wins for a page, every other more precise section in that same page is discarded

Impact:

- users do not get the pinpoint result they expect for technical terms
- searches tend to land on broad page entries instead of the exact section that contains the phrase

Evidence:

- `selector_instructions` returns `docs-motion-lab-exports` as a page result before the exact CSS export section
- `selector token` also returns the page before the more specific section
- `single-color-mark` returns broad converter pages instead of a precise setting row or section

Suggested fix:

- rank page and section entries separately, then prefer:
  - exact matching section
  - then exact matching page
  - then semantic fallback
- or dedupe only after choosing the best section-level result for a page

### High: page entries index raw HTML instead of visible text

File:

- [lib/docs-search-index.js:100](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L100)
- [lib/docs-search-index.js:118](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L118)

Problem:

- page entries use `normalizeText(config.bodyHtml || '')`
- that indexes HTML markup directly instead of rendered readable text

Impact:

- markup structure, repeated code snippets, and non-visible HTML noise can influence ranking
- broad page matches get inflated and can beat a narrower section result

Suggested fix:

- parse the page HTML the same way section entries already do
- build page text from rendered text content, not raw HTML markup

### Medium: technical token normalization is weak for camelCase and snake_case

File:

- [lib/docs-search-index.js:65](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L65)
- [lib/docs-search-index.js:75](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L75)

Problem:

- `normalizeText()` lowercases and strips punctuation, but does not split:
  - camelCase
  - snake_case
  - mixed code-style identifiers

Impact:

- `targetWidth` is treated differently from `target width`
- `selector_instructions` is treated differently from `selector instructions`
- technical queries depend too heavily on exact body-text coincidence

Evidence:

- `targetWidth` gives a much worse result set than `target width`
- `selector_instructions` finds the right area, but not with the same precision users expect from a docs search for a literal field name

Suggested fix:

- add search variants for identifiers:
  - raw form
  - camelCase split
  - snake_case split
- store both original-code tokens and humanized tokens in the index

### Medium: broad page aliases are too generic for technical queries

File:

- [lib/docs-search-index.js:11](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L11)

Problem:

- many aliases are broad words like:
  - `overview`
  - `workflow`
  - `converter`
  - `pricing`
- the scoring model treats alias includes as strong signals

Impact:

- general overview pages can still appear in the top results for narrow technical searches
- this makes the results feel less trustworthy even when the correct page is also present

Evidence:

- `targetWidth` still shows `docs`, `docs-quickstart`, and `docs-what-is-supericons` in the top five
- `single-color-mark` includes unrelated `docs-mcp-motion` in the visible result set

Suggested fix:

- reduce alias weight for broad page-level aliases on technical queries
- introduce an exact-code-term boost for literal matches in docs content
- consider query classification:
  - code-like query
  - natural-language query

### Medium: no exact-match-first behavior for technical docs search

File:

- [lib/docs-search-index.js:172](/d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/lib/docs-search-index.js#L172)

Problem:

- the ranker is a weighted include model only
- there is no special override for:
  - exact field names
  - exact parameter names
  - exact environment variable names

Impact:

- users searching for a literal parameter or env var do not always get the most precise result first

Evidence:

- `targetWidth` does not reliably lead with the exact parameter-bearing page/section
- `SUPERICONS_API_KEY` still ranks several setup pages but does not yet behave like a true exact-term finder

Suggested fix:

- add a stronger exact-term boost for:
  - code spans
  - table cells
  - inline parameter names
  - env var names

## What is working well

- `browser vs mcp` correctly surfaces the converter comparison section first
- `motion css` correctly surfaces the MCP CSS tool and the Motion Lab exports CSS section near the top
- `api key` is directionally useful even though the dedicated API Keys page is not always first

## Recommended fix order

1. Fix dead alias collection
2. Stop indexing raw HTML for page entries
3. Change dedupe so the best section can survive
4. Add camelCase and snake_case variants
5. Add exact technical-term boosting
6. Tune broad alias weights

## Bottom line

The current docs search is usable for broad topic discovery, but it is not yet accurate enough for technical lookup. The biggest gap is that the ranker still behaves like a page finder, while users are already treating it like a parameter and field finder.

The next quality jump should come from better indexing and ranking, not more UI changes.
