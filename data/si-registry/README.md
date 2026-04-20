# SI Registry Source Tree

This directory is the main source for SI Registry pilot records and registry build rules.

## What belongs here

- source registry records
- registry metadata such as schema version
- controlled vocabularies
- visibility and projection rules

## What does not belong here

- one-off scratch files
- ad hoc exports edited by hand
- live product cutover files

## Build flow

1. Source records live under `records/`.
2. Build scripts validate them.
3. Build scripts generate preview outputs under `generated/`.
4. Public-safe preview outputs may also be written to `public/registry/` and `mcp/public/`.

Generated files are not edited by hand.

## Hybrid model

The SI Registry is hybrid.

- free/open records can flow into public-safe outputs
- premium records can live in the same registry shape without becoming public by default
- internal operational enrichment stays private by default

The build is responsible for filtering outputs based on the visibility model.

## No-cutover rule for P1-A

P1-A does not replace the current live product projections.

These remain the active product files during this phase:

- `public/icon-index.json`
- `public/icon-index-solid.json`
- `public/icon-taxonomy.json`
- `mcp/public/icon-index.json`
- `public/packs/manifest.json`

`scripts/build-icons.js` remains the active builder for current free-icon product projections during P1-A.

Registry preview outputs created in this phase are inspection outputs only. They are not the final product access-control story and they do not replace the live product until a later cutover.
