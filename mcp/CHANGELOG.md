# Changelog

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
