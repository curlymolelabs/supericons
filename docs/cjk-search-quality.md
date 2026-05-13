# CJK Search Quality

Supericons now supports automated, evidence-scored CJK search terms for:

- Simplified Chinese: `zh-Hans`
- Traditional Chinese: `zh-Hant`
- Japanese: `ja`
- Korean: `ko`

This is search support, not full app translation. Public CJK terms are allowed into search only when they pass deterministic quality gates: Unicode safety, script checks, duplicate checks, spacing and width variants, quality scores, and search-result fixtures.

The MCP `search_icons` tool accepts an optional `locale` value for CJK search:

```json
{ "query": "搜索", "locale": "zh-Hans" }
{ "query": "搜尋", "locale": "zh-Hant" }
{ "query": "検索", "locale": "ja" }
{ "query": "설정", "locale": "ko" }
```

If `locale` is omitted, exact approved CJK terms can still expand to their mapped English concepts. Existing English search behavior remains the baseline.

Run these checks before release:

```bash
npm run verify:cjk-search-quality
npm run verify:cjk-search-fixtures
npm run verify:search-query-fixtures
npm run verify:motion-lab-mcp-package
```

The quality label for this feature is automated high-confidence CJK search support. It should not be described as native-speaker reviewed.
