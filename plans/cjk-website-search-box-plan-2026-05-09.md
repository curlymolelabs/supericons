# CJK Website Search Box Plan

## Goal

Wire the existing automated CJK search quality data into the website search box so users can type approved Simplified Chinese, Traditional Chinese, Japanese, and Korean search terms on the local Vite site.

## Approach

- Reuse the same CJK normalization and expansion behavior already verified for MCP.
- Load the public-safe CJK term dataset from `/cjk-search-terms.json`.
- Keep English search behavior unchanged.
- For CJK queries, expand approved CJK terms to English concept variants before local ranking.
- Pass inferred CJK locale into hosted search when an approved query match exists.

## Implementation Steps

1. Add CJK term data to the public web folder.
2. Import the browser-safe `lib/cjk-search-core.js` into `main.js`.
3. Add `state.cjkSearchTerms` and load `/cjk-search-terms.json` alongside icons and synonyms.
4. Replace the browser search normalizer with the Unicode-safe CJK normalizer.
5. Build search variants with `expandCjkQuery()` plus existing intent variants.
6. Use expanded variants for direct/alias scoring and synonym matching.
7. Send inferred `locale` to `searchIconsHosted()`.
8. Add a website verifier script that imports browser search helpers or mirrors the app data path closely enough to prove CJK terms return expected icons.

## Test Plan

- `npm run verify:cjk-search-quality`
- `npm run verify:cjk-search-fixtures`
- `npm run verify:search-query-fixtures`
- Browser/local smoke test through Vite or a DOM-free script for:
  - `搜索`
  - `搜尋`
  - `検索`
  - `せってい`
  - `セッテイ`
  - `설정`
  - `로그 아웃`

## Assumptions

- This phase does not add a visible language selector.
- Exact approved CJK terms can work without the user selecting a locale.
- The website can use the same public-safe dataset as the MCP package.
