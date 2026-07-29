# Search Language and Query Repair Plan

Date: 2026-07-29

## Purpose

Repair confirmed gaps in language aliases, English inflections, compound queries, and exact brand matching without replacing the current search architecture.

This work is based on two separate baselines:

1. Published npm package `@supericons/mcp@0.4.24`.
2. The current local catalog snapshot at `f8b95bf81cd2f2db300764dcc35a2e307149d173`.

The local catalog includes icons that are not public yet. A query fixed by a new local icon is classified as a catalog-state change, not as proof that the published package is fixed.

## Confirmed defect classes

### Reviewed language aliases

Some common Spanish and Chinese terms did not reach existing relevant icons. The repair uses a reviewed override source that is merged into every generated alias copy.

Initial reviewed terms:

- `almacén` and `almacen`: warehouse, storage, inventory
- `tuerca`: nut, bolt, hardware
- `toalla`: towel, bath
- `llave fija`: wrench, tool
- `资源收藏`: bookmark, archive, favorite
- `微信`: WeChat
- `airflow`: air flow, wind, air vent, fan

The aliases apply to exact terms and bounded phrase segments. They are not used as broad fuzzy substitutions.

### Approved inflection equivalence

The engine already reduces `categories` to `category`, but the relevance check previously rejected the resulting icons because it compared them only with the original plural text.

The repair allows a result supported by an approved inflection variant to pass the existing relevance check. It does not weaken relevance rules for unrelated words.

### Compound and mixed-script queries

Mixed-script queries can contain an exact reviewed phrase next to English or brand text. The repair recognizes a reviewed phrase as a bounded part of the query.

Examples:

- `wechat 微信 logo`
- `Supericons 搜尋圖示`
- `logo de Pinecone y árbol`

### Exact compact brand identity

Some brand IDs remove spaces. An exact brand query such as `alibaba cloud` can now match the primary icon ID `alibabacloud`.

This rule is limited to an exact compact form of the icon's primary name or ID. It does not use broad substring matching.

## Boundaries

- Do not add a universal query planner.
- Do not reorder existing search lanes.
- Do not introduce a global query-variant cap.
- Do not replace the hosted search engine.
- Do not hide hosted errors with local results.
- Do not require identical rankings across surfaces.
- Do require the same product decisions for the pinned shared corpus.

## Delivery sequence

1. Freeze a public-safe 22-case repair corpus.
2. Capture the exact published npm baseline.
3. Capture the pinned local catalog baseline.
4. Apply each defect repair through its existing search seam.
5. Run focused tests, the 11-locale suite, CJK checks, vocabulary checks, hosted routing checks, the 225-case fingerprint, browser equivalence, and an exact packed-package verification.
6. Review every changed fingerprint case.
7. Commit the isolated branch for independent audit.
8. Merge and release only after the intended catalog snapshot is confirmed.

## Release rule

The implementation may be audited before the new icons are public. Public release notes must distinguish:

- engine repairs that work with already published icons;
- queries that depend on icons present only in the local catalog.

No package was published by this work.
