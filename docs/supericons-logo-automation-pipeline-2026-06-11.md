# Supericons Logo Automation Pipeline

Date: 2026-06-11

## Goal

Automate the repeatable parts of creating high-demand `supericons` logo assets:

1. Start from a candidate list of AI, developer, tech, and product logos.
2. Check Simple Icons first and exclude anything already covered there.
3. Find likely official logo assets from official homepages or approved source URLs.
4. Convert approved PNG assets to SVG with the existing Supericons converter.
5. Normalize SVG assets into a 24x24 Supericons staging format.
6. Export draft records for review before promotion into the live registry.

## Important Guardrail

Do not treat random image-search results as production assets. Logos should come from official brand pages, official press kits, app stores, product repositories, or other source URLs that can be reviewed. The automation can collect candidates, but source approval and visual QA should happen before publishing.

## Script

Main script:

```bash
node scripts/supericons-logo-pipeline.mjs
```

NPM shortcuts:

```bash
npm run supericons:logo-audit -- --input data/logo-candidates.json
npm run supericons:logo-discover -- --input data/si-registry/staging/supericons-logo-pipeline/audit-report.json
npm run supericons:logo-ingest -- --input data/approved-logo-sources.json
```

## Commands

### `audit`

Checks candidates against both:

- `data/si-registry/source/libraries/simpleicons.json`
- `node_modules/simple-icons/data/simple-icons.json`

It uses exact normalized matches for labels, slugs, source names, aliases, and synonyms. This avoids false positives such as matching `grok` to `ngrok`.

Output:

```text
data/si-registry/staging/supericons-logo-pipeline/audit-report.json
```

The report separates:

- `excluded`: already covered by Simple Icons.
- `queue`: needs a Supericons custom asset.

### `discover`

Looks at each candidate's official homepage, if provided, and collects likely source assets from:

- favicon links
- apple touch icons
- mask icons
- Open Graph images
- Twitter card images
- image tags that mention logo, brand, mark, or icon
- common official paths such as `/logo.svg` and `/logo.png`

Output:

```text
data/si-registry/staging/supericons-logo-pipeline/source-candidates.json
```

This is a source-review queue, not a final asset list.

### `ingest`

Reads approved source items with either `source_url` or `local_path`.

For PNG:

- Downloads or reads the PNG.
- Runs the existing converter.
- Uses `traceClass: flat-logo-color` by default.
- Normalizes the SVG to a 24x24 icon frame.

For SVG:

- Downloads or reads the SVG.
- Sanitizes it.
- Normalizes it to a 24x24 icon frame.

Outputs:

```text
data/si-registry/staging/supericons-logo-pipeline/assets/
data/si-registry/staging/supericons-logo-pipeline/svg/
data/si-registry/staging/supericons-logo-pipeline/records/draft-records.json
data/si-registry/staging/supericons-logo-pipeline/ingest-report.json
```

Draft records use:

```json
{
  "source_library": "supericons",
  "category": "brand_identity",
  "status": "draft"
}
```

## Candidate Input Shape

Minimal:

```json
[
  "Kimi",
  "Google AI Studio",
  "Higgsfield"
]
```

Richer:

```json
[
  {
    "label": "Kimi",
    "aliases": ["Moonshot AI", "Kimi AI"],
    "homepage": "https://www.kimi.com/",
    "priority": "high"
  }
]
```

Approved source input:

```json
{
  "approved_sources": [
    {
      "label": "Example",
      "aliases": ["Example AI"],
      "source_url": "https://example.com/brand/logo.png",
      "source_page_url": "https://example.com/brand",
      "usage_note": "Brand mark remains a trademark of its owner."
    }
  ]
}
```

## Recommended Workflow

1. Build a top-demand candidate list from admin search misses, trend research, and product usage.
2. Run `supericons:logo-audit`.
3. Remove the Simple Icons-covered items from the custom library backlog.
4. Add official homepages for the remaining items.
5. Run `supericons:logo-discover`.
6. Review source candidates and approve only official sources.
7. Run `supericons:logo-ingest`.
8. Inspect staged SVGs at 16px, 20px, 24px, and 32px.
9. Promote only clean assets into the live `supericons` registry source.

## Future Additions

- Add an optional search-provider adapter for Google Custom Search, Bing Web Search, SerpAPI, or another provider.
- Add a visual contact sheet for staged SVGs.
- Add automated SVG QA for viewBox, path count, fill behavior, and small-size legibility.
- Add a promotion script that moves approved draft records into the live registry source after source and visual review.
