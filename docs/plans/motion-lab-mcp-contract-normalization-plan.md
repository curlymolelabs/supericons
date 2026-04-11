# Motion Lab MCP Contract Normalization Plan

Date: April 11, 2026
Status: Active
Scope: Motion Lab MCP input and output naming consistency

## Goal

Normalize the Motion Lab MCP contract to one naming style before launch.

The target style is `snake_case` for:

- MCP input parameter names
- Motion Lab recipe output fields
- top-level Motion Lab asset payload fields
- live Motion Lab MCP docs
- main source docs that define the contract

## Why this pass is needed

The current Motion Lab MCP surface mixes naming styles:

- inputs still use `durationMs` and `intensityPercent`
- most enriched outputs now use `duration_ms` and `intensity_percent`
- some top-level responses still use `animatedSvg`

That asymmetry is confusing for agent callers and makes the contract harder to treat as stable.

Because Supericons has not launched yet, this is the right time to standardize the contract instead of carrying compatibility debt forward.

## Decisions

1. Motion Lab MCP uses `snake_case` as the public contract style.
2. Tool names remain unchanged:
   - `list_motion_presets`
   - `get_motion_recipe`
   - `animate_icon`
   - `export_motion_css`
   - `export_animated_svg`
3. Single-word field names stay unchanged:
   - `preset`
   - `trigger`
   - `library`
   - `color`
4. Multi-word Motion Lab parameter names change to:
   - `duration_ms`
   - `intensity_percent`
5. Top-level animated SVG payload keys change to:
   - `animated_svg`

## Implementation Steps

1. Update Motion Lab MCP input schemas in `mcp/index.js`.
2. Update Motion Lab MCP handlers in `mcp/index.js` to consume `duration_ms` and `intensity_percent`.
3. Update `lib/motion-lab-workflow.js` bundle output to use `animated_svg`.
4. Update the Motion Lab MCP docs in `docs-pages.js`.
5. Update the same contract language in:
   - `docs/docs-copy-bible.md`
   - `docs/docs-prd.md`
6. Run syntax checks, build, and a direct runtime contract check.

## Verification

The pass is complete when:

- Motion Lab MCP tool schemas expose snake_case inputs
- Motion Lab MCP outputs use snake_case consistently
- `animatedSvg` no longer appears in live Motion Lab MCP responses
- live docs and main source docs describe the same field names
- `npm run build` still passes

## Out of Scope

- changing non-Motion-Lab MCP tools
- changing internal helper variable names such as `presetId`
- adding backward-compatibility aliases for prelaunch callers
