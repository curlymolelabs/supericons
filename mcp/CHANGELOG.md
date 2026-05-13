# Changelog

## 0.4.1 - 2026-05-05

### Added

- added official MCP Registry metadata through `mcpName` and `server.json`
- documented both the hosted Streamable HTTP endpoint and the npm stdio package for registry discovery

## 0.4.0 - 2026-05-03

### Changed

- switched the free icon search tools to hosted semantic search by default
- removed bulk registry and icon-index JSON files from the npm package
- kept a local fallback path for internal development when `SUPERICONS_ALLOW_LOCAL_SEARCH_FALLBACK=1`
- packaged only the small runtime helpers needed for MCP startup and slot recommendations

## 0.3.1 - 2026-04-14

### Fixed

- packaged the MCP runtime dependencies needed for clean npm installs:
  - `material-export.js`
  - `public/icon-index.json`
  - `public/synonyms.json`
- fixed the MCP server's package-local paths so installed copies no longer depend on repo-level `../public` or `../material-export.js`

## 0.3.0 - 2026-04-11

### Breaking changes

- Motion Lab MCP input parameters now use `snake_case`:
  - `duration_ms`
  - `intensity_percent`
- Motion Lab animated SVG responses now use `animated_svg` instead of `animatedSvg`

### Added

- `list_motion_presets` now returns the enriched Motion Lab preset metadata used by the agent library
- `get_motion_recipe` now returns enriched preset guidance fields such as:
  - `technical_output_notes`
  - `visual_character`
  - `emotional_tone`
  - `recommended_contexts`
  - `avoid_for`

### Upgrade note

If you have an existing MCP client config or wrapper using the old Motion Lab parameter names, update those callers before using `0.3.0`.
