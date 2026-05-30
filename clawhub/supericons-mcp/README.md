# Supericons MCP for OpenClaw

Supericons helps coding agents find SVG icons by meaning, use case, UI slot, or icon library.

This plugin registers OpenClaw tools and forwards each call to the public Supericons MCP package, `@supericons/mcp@0.4.9`.

## What It Adds

- Semantic icon search
- Exact SVG icon lookup
- Icon library discovery
- UI slot icon recommendations

## Install From ClawHub

After the package is published and approved on ClawHub:

```bash
openclaw plugins install clawhub:@curlymolelabs/supericons-mcp
openclaw plugins enable supericons-mcp
openclaw gateway restart
```

## Local Test

From this folder:

```bash
openclaw plugins install .
openclaw plugins enable supericons-mcp
openclaw gateway restart
```

Then ask OpenClaw:

```text
Use Supericons to search for a database icon.
```

## Tools

- `supericons_search_icons`
- `supericons_get_icon`
- `supericons_list_libraries`
- `supericons_recommend_icons`
- `supericons_list_motion_presets`
- `supericons_get_motion_recipe`
- `supericons_export_motion_css`
- `supericons_export_animated_svg`
- `supericons_animate_icon`
- `supericons_inspect_converter_options`
- `supericons_inspect_converter_input`
- `supericons_convert_png_to_svg`
- `supericons_convert_svg_to_png`

## Pro Access

Free public icon search does not need an API key.

For Pro features, set `SUPERICONS_API_KEY` in your private OpenClaw or MCP environment. Do not put real keys in shared project files.

## License

This wrapper bundle is MIT licensed. Supericons, third-party icon libraries, and Pro services remain covered by their own terms.
