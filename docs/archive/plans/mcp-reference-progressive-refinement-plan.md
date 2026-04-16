# MCP Reference Progressive Refinement Plan

## Goal

Replace the four MCP Reference placeholders with real tool documentation grounded in the live MCP server.

This pass covers:

- MCP overview
- Icon tools
- Motion Lab MCP tools
- Converter MCP tools

## Source Of Truth

Use the page copy from `docs/docs-copy-bible.md`, then keep it aligned with the live server in `mcp/index.js`.

The local code confirms:

- 11 total MCP tools
- 3 free icon tools
- 5 Motion Lab tools
- 3 Converter tools
- current parameter names, ranges, and defaults

## Execution Order

### Phase 1. MCP overview

Replace the placeholder with:

- short intro explaining 11 tools
- free vs. Pro split
- full tool access table
- premium collections callout
- links into the three detailed reference pages

This becomes the section entry point.

### Phase 2. Icon tools

Document:

- `search_icons`
- `get_icon`
- `list_libraries`

Include:

- intro paragraph
- description for each tool
- parameter tables where needed
- returns section
- access rules

### Phase 3. Motion Lab MCP tools

Document:

- `list_motion_presets`
- `get_motion_recipe`
- `animate_icon`
- `export_motion_css`
- `export_animated_svg`

Include:

- Pro-only intro
- decision callout
- parameter tables
- output descriptions
- “when to use which tool” comparison

### Phase 4. Converter MCP tools

Document:

- `inspect_converter_options`
- `convert_svg_to_png`
- `convert_png_to_svg`

Include:

- Pro-only intro
- parameter tables
- `traceClass`, `qualityMode`, and `uiMode` reference tables
- recommended combinations table

## Implementation Notes

- Keep the current page titles and nav labels.
- Use the existing docs table styling for reference tables.
- Use sections and callouts instead of cards for the main technical content.
- Keep internal links pointing to the related Motion Lab and Converter docs where helpful.

## Success Standard

This pass is complete when:

- all four MCP Reference pages are no longer placeholders
- tool names and parameter ranges match `mcp/index.js`
- free vs. Pro access is clear on every page
- readers can move from MCP setup into tool reference without guessing
