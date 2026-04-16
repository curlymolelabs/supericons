# Supericons Docs - Complete Copy Bible

**Document type:** Word-for-word content for all 21 docs pages
**Date:** 10 April 2026
**Source verified:** All tool parameters and descriptions sourced from `mcp/index.js` and `lib/motion-lab-workflow.js`

---

## How to use this document

Each section below contains the complete, production-ready copy for one page. Use these words verbatim. Do not paraphrase, summarize, or rewrite. If copy needs updating due to a product change, update it here first, then carry through to implementation.

Every heading, paragraph, label, code snippet, table cell, and button label is specified.

---

## Page 1: Docs Home (`/docs`)

**Title (browser tab):** Supericons Docs

**Page heading:** Supericons Docs

**Page subheading:** Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter.

**Hero pills (3, in order):**

1. 20,000+ free icons
2. Animated icons and CSS exports
3. Works in Claude Code, Codex, Cursor

**Section heading:** Start here

**Routing card 1:**
- Card heading: Get started fast
- Card body: Set up the MCP server and run your first icon query in under 5 minutes.
- Link label: Read the quickstart

**Routing card 2:**
- Card heading: Set up MCP
- Card body: Step-by-step setup for Claude Code, Codex CLI, and Cursor.
- Link label: Choose your client

**Routing card 3:**
- Card heading: Learn Motion Lab
- Card body: Presets, trigger types, and how to export animations as CSS or standalone SVG.
- Link label: Open the guide

**Routing card 4:**
- Card heading: Use the Converter
- Card body: PNG to SVG, SVG to PNG, and how to choose the right settings for your source image.
- Link label: Open the guide

**Footnote framing paragraph:**
Free icon browsing and the customize panel are self-explanatory in the app. This docs section covers MCP integration, Motion Lab, and Converter, where setup or parameter choices are non-obvious.

---

## Page 2: What Is Supericons (`/docs/what-is-supericons`)

**Title (browser tab):** What Is Supericons - Supericons Docs

**Page heading:** What Is Supericons

**Body (paragraph 1):**
Supericons gives you 20,000+ open-source SVG icons from 10 libraries in one searchable interface. Search by name, concept, or style. Customize color, size, stroke, and fill in real time. Export as SVG, PNG, or React, Vue, or Svelte components with one click.

**Body (paragraph 2):**
For AI-assisted development, Supericons ships a dedicated MCP server. Your coding agent can search and retrieve icons without switching to a browser. Pro subscribers also get access to Motion Lab (animation presets with CSS and SVG export) and Converter (PNG-to-SVG and SVG-to-PNG conversion), both available in the browser and through MCP tools.

**Section heading:** Free vs. Pro

**Feature table:**

| Feature | Free | Pro |
|---|---|---|
| 20,000+ SVG icons from 10 libraries | Yes | Yes |
| AI semantic search | Yes | Yes |
| Real-time customization (color, size, stroke, fill) | Yes | Yes |
| Export as SVG, PNG, React, Vue, Svelte | Yes | Yes |
| MCP: search and retrieve icons | Yes | Yes |
| Premium animated icon collections | No | Yes |
| Motion Lab: animation presets, browser | No | Yes |
| Motion Lab: CSS and SVG export via MCP | No | Yes |
| Converter: PNG to SVG, browser | No | Yes |
| Converter: SVG to PNG, browser | No | Yes |
| Converter: PNG to SVG and SVG to PNG via MCP | No | Yes |
| 30-day rolling collection claim (1 per billing cycle) | No | Yes |

**Section heading:** The 10 free icon libraries

| Library | Style |
|---|---|
| Lucide | Clean, consistent, open-source |
| Tabler | 5,000+ bold one-line icons |
| Phosphor | Flexible, multi-weight |
| Heroicons | Tailwind CSS companion, outline and solid |
| Bootstrap Icons | Official Bootstrap companion |
| Iconoir | High-quality clean outlines |
| Ionicons | Web and mobile interface icons |
| Material Symbols | Google variable font icons (weight, fill, grade, optical size) |
| MingCute | Broad interface coverage, modern |
| Simple Icons | 3,400+ brand and company logos |

**Section heading:** Where to go next

**Links:**
- Set up MCP - Get the MCP server running in your coding agent
- Get Pro - See what a Pro subscription includes
- API Keys - Understand how authentication works

---

## Page 3: Quickstart (`/docs/quickstart`)

**Title (browser tab):** Quickstart - Supericons Docs

**Page heading:** Quickstart

**Page subheading:** Get Supericons running in your coding agent in under 5 minutes.

**Section heading:** Free setup

**Intro paragraph:**
Free icons work without an account or API key. Add the MCP server to your client and start searching.

**Step 1 label:** Add the server

**Step 1 body:**
Choose your client and follow the setup for the exact command or config block.

**Links inline:** Claude Code | Codex | Cursor

**Step 2 label:** Reload your session

**Step 2 body:**
Restart or reload your coding agent session so the server registers. In Claude Code and Codex, type `/mcp` to confirm Supericons is listed.

**Step 3 label:** Run your first query

**Step 3 body:**
Ask your agent to find an icon. Try:

> "Find me a settings gear icon from Lucide."
> "Search for a loading spinner in Tabler."
> "Get the icon with ID heart from Phosphor."

**Section heading:** Premium setup

**Intro paragraph:**
To access premium animated collections, Motion Lab, and Converter through MCP, you need three things in place before your agent can use them.

**Numbered list:**

1. A Supericons account with an active Pro subscription, or a purchased collection.
2. An API key generated from your Supericons dashboard under API Keys.
3. Your `SUPERICONS_API_KEY` environment variable added to your MCP client config.

**Next section label:** Then follow your client's setup guide to add the key:

**Links:** Claude Code with API key | Codex with API key | Cursor with API key

**Callout (note):**
Your API key carries your account entitlement. The key itself does not grant access. If your account does not have Pro or a purchased collection, adding a key will not unlock premium tools.

---

## Page 4: Claude Code Guide (`/docs/mcp/claude-code`)

**Title (browser tab):** Claude Code Setup - Supericons Docs

**Page heading:** Claude Code

**Verified note:** Verified against official documentation as of 10 April 2026.

**Intro paragraph:**
Claude Code is an agentic coding tool from Anthropic. It supports MCP servers through the CLI and config files. Use either method below to add Supericons.

**Section heading:** Free setup

**Sub-heading:** Option 1: CLI command

**Body:**
The fastest way to add Supericons. Run this command once:

```bash
# macOS / Linux
claude mcp add supericons -- npx -y supericons-mcp

# Windows
claude mcp add supericons -- cmd /c npx -y supericons-mcp
```

**Sub-heading:** Option 2: Config file

**Body:**
Claude Code stores MCP servers in a JSON config file. Choose the scope that fits your workflow:

- **User scope** (available in all your projects): `~/.claude.json`
- **Project scope** (checked into this project only): `.mcp.json` in your project root

Add this block to the `mcpServers` object in your chosen file:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}
```

**Sub-heading:** Verify it is working

**Body:**
After adding the server, type this command inside a Claude Code session:

```
/mcp
```

Supericons should appear in the list of active servers. If it does not, restart your Claude Code session.

**Section heading:** Premium setup

**Body:**
To unlock premium collections, Motion Lab tools, and Converter tools, add your API key to the server config. Use the config file method with the `env` field:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}
```

**Note label:** Where to get your key

**Note body:**
Generate your API key at supericons.dev under API Keys. Your key must be linked to an account with an active Pro subscription or a purchased collection. Access is determined by your account, not the key itself.

**Section heading:** Troubleshooting

**Problem 1:**
Server does not appear after adding

Solution: Run `/mcp` to check. If Supericons is not listed, restart your Claude Code session. Confirm your config file is in the correct location for the scope you chose.

**Problem 2:**
Premium tools are not available

Solution: Confirm three things. (1) Your account has active Pro or a purchased collection. (2) You have generated an API key from the dashboard. (3) `SUPERICONS_API_KEY` is present in the config Claude Code reads at startup.

**Problem 3:**
Config file location confusion

Solution:
- User scope: `~/.claude.json`
- Project scope: `.mcp.json` in your project root

The user scope file applies to all your Claude Code sessions. The project scope file applies only when you open that project.

---

## Page 5: Codex Guide (`/docs/mcp/codex`)

**Title (browser tab):** Codex Setup - Supericons Docs

**Page heading:** Codex

**Verified note:** Verified against official OpenAI Codex documentation as of 10 April 2026.

**Scope callout:**
Codex MCP support is available in the Codex CLI and IDE extension. The CLI and IDE extension share the same configuration file. The Codex web app and cloud task runner do not support local MCP server configuration.

**Intro paragraph:**
Codex CLI and IDE extension support MCP servers through a TOML config file. Use the CLI command for a quick start, or edit the config file directly.

**Section heading:** Free setup

**Sub-heading:** Option 1: CLI command

```bash
codex mcp add supericons -- npx -y supericons-mcp
```

**Sub-heading:** Option 2: Config file

**Body:**
Codex reads MCP server config from a TOML file. Choose the scope that fits your workflow:

- **User scope** (available in all your projects): `~/.codex/config.toml`
- **Project scope** (trusted projects only): `.codex/config.toml` in your project root

Add this block to your chosen config file:

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
```

**Sub-heading:** Verify it is working

**Body:**
In the Codex TUI, type:

```
/mcp
```

Supericons should appear in the list of active MCP servers.

**Section heading:** Premium setup

**Body:**
To use premium collections, Motion Lab, and Converter tools, add your API key to the server config:

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
env = { SUPERICONS_API_KEY = "your-key-here" }
```

**Note label:** Where to get your key

**Note body:**
Generate your API key at supericons.dev under API Keys. Your key must be linked to an account with an active Pro subscription or a purchased collection.

**Section heading:** Troubleshooting

**Problem 1:**
Server does not appear after adding

Solution: Type `/mcp` in the Codex TUI. The Codex CLI and IDE extension share the same config, so a change in one applies to both. Restart the session after editing the config file.

**Problem 2:**
Premium tools are not available

Solution: Confirm `SUPERICONS_API_KEY` is in the `env` block of `[mcp_servers.supericons]`. Check that your account has Pro or a purchased collection. Restart after updating the config.

**Problem 3:**
Project scope not working

Solution: Codex only reads project-scoped config from trusted projects. If the project has not been trusted, the user-scoped config (`~/.codex/config.toml`) applies instead.

---

## Page 6: Cursor Guide (`/docs/mcp/cursor`)

**Title (browser tab):** Cursor Setup - Supericons Docs

**Page heading:** Cursor

**Verified note:** Verified against official Cursor documentation as of 10 April 2026.

**Intro paragraph:**
Cursor supports MCP servers through a JSON config file. You can scope it globally or per-project.

**Section heading:** Free setup

**Body:**
Add Supericons to `~/.cursor/mcp.json` for use across all your projects:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"]
    }
  }
}
```

For project-only access, add the same block to `.cursor/mcp.json` in your project root instead.

**Sub-heading:** Verify it is working

**Body:**
Open Cursor settings and check the MCP servers list, or ask your agent to run a tool. A working server responds to: "Search for a settings icon."

**Section heading:** Premium setup

**Body:**
Add your API key to the server config using the `env` field:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "your-key-here"
      }
    }
  }
}
```

**Note label:** Where to get your key

**Note body:**
Generate your API key at supericons.dev under API Keys. Your key must be linked to an account with an active Pro subscription or a purchased collection.

**Section heading:** Troubleshooting

**Problem 1:**
Server is not responding

Solution: Cursor requires a valid JSON config file. Check for syntax errors in the JSON. Restart Cursor after editing the file.

**Problem 2:**
Premium tools are not available

Solution: Confirm `SUPERICONS_API_KEY` is present in the `env` block. Confirm your account has Pro or a purchased collection.

---

## Page 7: MCP Tools Overview (`/docs/mcp/tools`)

**Title (browser tab):** MCP Tools Overview - Supericons Docs

**Page heading:** MCP Tools Overview

**Body (paragraph 1):**
The Supericons MCP server exposes 11 tools your coding agent can call directly. Three tools are free and work without an account. Eight tools are Pro-only and require a valid `SUPERICONS_API_KEY` linked to an account with Pro or a purchased collection.

**Body (paragraph 2):**
Your agent can discover what tools are available when it first connects to the server. You can also call tools explicitly by name.

**Section heading:** All tools

**Tool access table:**

| Tool | What it does | Access |
|---|---|---|
| `search_icons` | Search 20,000+ free icons across 10 libraries | Free |
| `get_icon` | Retrieve a specific icon by ID and library | Free |
| `list_libraries` | List all available icon libraries | Free |
| `list_motion_presets` | List all Motion Lab animation presets | Pro |
| `get_motion_recipe` | Get a plain-language description of any preset | Pro |
| `animate_icon` | Get Motion Lab CSS and animated SVG in one call | Pro |
| `export_motion_css` | Get only the Motion Lab CSS for an icon | Pro |
| `export_animated_svg` | Get only the standalone animated SVG | Pro |
| `inspect_converter_options` | List Converter settings and valid values | Pro |
| `convert_svg_to_png` | Render an SVG as a PNG at any resolution | Pro |
| `convert_png_to_svg` | Trace a PNG image into an SVG | Pro |

**Callout (note):**
Premium animated icon collections from `get_icon` and `search_icons` also require Pro or collection access and a valid API key.

**Section heading:** Detailed references

**Links:**
- Icon tools (search_icons, get_icon, list_libraries)
- Motion Lab tools (list_motion_presets, get_motion_recipe, animate_icon, export_motion_css, export_animated_svg)
- Converter tools (inspect_converter_options, convert_svg_to_png, convert_png_to_svg)

---

## Page 8: Icon Tools Reference (`/docs/mcp/tools/icons`)

**Title (browser tab):** Icon Tools Reference - Supericons Docs

**Page heading:** Icon Tools Reference

**Intro paragraph:**
These three tools are free and do not require an API key for the standard 20,000+ icon library. Premium animated icon collections from these tools require Pro or collection access.

---

**Tool heading:** search_icons

**Description:**
Search 20,000+ free icons across 10 libraries using AI-powered synonym expansion. Returns matching icons with SVG code. Premium collections are available when your API key is linked to a Pro subscription or purchased packs.

**Parameters table:**

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `query` | string | Yes | - | Natural language search term. Example: "heart", "login", "download arrow" |
| `library` | string | No | - | Filter by library. Valid values: `lucide`, `tabler`, `phosphor`, `heroicons`, `bootstrap`, `iconoir`, `ionicons`, `material`, `simpleicons`, `mingcute`, or a premium pack name |
| `limit` | integer | No | 10 | Max results returned. Range: 1 to 50 |

**Returns:**
Matching icons with SVG code, icon ID, library name, and metadata. When no results are found, returns a message indicating no match.

**Access:** Free.

---

**Tool heading:** get_icon

**Description:**
Retrieve a specific icon by its ID and library. Returns the full SVG code and metadata. Premium icons require an API key linked to a Pro subscription or purchased packs.

**Parameters table:**

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Icon ID. Example: "heart", "arrow-right", "settings" |
| `library` | string | Yes | Library name. Example: "lucide", "tabler", "phosphor", or a premium pack name |

**Returns:**
Full SVG code plus icon metadata (ID, name, library, premium status). For premium animated icons, also returns the CSS animation block and a usage HTML snippet.

**Access:** Free for standard icons. Pro or collection access required for premium animated icons.

---

**Tool heading:** list_libraries

**Description:**
List all available icon libraries with their names, icon counts, and descriptions. Premium libraries are marked.

**Parameters:** None.

**Returns:**
An array of library objects, each with: `id`, `name`, `count`, `description`, `premium` (boolean), and `accessible` (whether your current API key can access it).

**Access:** Free.

---

## Page 9: Motion Lab MCP Tools Reference (`/docs/mcp/tools/motion`)

**Title (browser tab):** Motion Lab Tools Reference - Supericons Docs

**Page heading:** Motion Lab MCP Tools

**Intro paragraph:**
These five tools expose Motion Lab capabilities to your coding agent. All five are Pro-only and require a valid `SUPERICONS_API_KEY` linked to a Pro account or a purchased animated collection.

**Callout (note):**
Not sure which preset to use? Call `list_motion_presets` first to see the preset IDs, labels, groups, short descriptions, and supported triggers, then `get_motion_recipe` to understand what a specific preset does before committing.

---

**Tool heading:** list_motion_presets

**Description:**
List the Motion Lab presets currently available through Supericons MCP.

**Parameters:** None.

**Returns:**
An array of preset objects. Each preset includes: `preset`, `label`, `group`, `description`, and `supported_triggers`.

**Access:** Pro.

---

**Tool heading:** get_motion_recipe

**Description:**
Return a human-readable description of how a preset behaves, including trigger type, timing, easing, and intended use. Use this before calling `animate_icon` or the export tools to understand what output to expect.

**Parameters table:**

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `preset` | string | Yes | - | Preset ID. Example: "pulse", "bounce", "spin", "trace", "typing" |
| `trigger` | string | No | `loop` | How the animation starts. Valid values: `loop`, `hover`, `click` |
| `duration_ms` | integer | No | 500 | Animation duration in milliseconds. Range: 100 to 4000 |
| `intensity_percent` | integer | No | 100 | Scales the intensity of the animation effect. Range: 25 to 200 |

**Returns:**
Plain-language description of the preset, including label, group, description, trigger behavior, duration, intensity, and usage notes.

**Access:** Pro.

---

**Tool heading:** animate_icon

**Description:**
Generate both the Motion Lab CSS and a self-contained animated SVG for one icon in a single call. Use this when you want both outputs without making two separate calls.

**Parameters table:**

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | string | Yes | - | Icon ID. Example: "heart", "scan-virus", "fingerprint-scan" |
| `library` | string | Yes | - | Library or premium pack name |
| `preset` | string | Yes | - | Motion preset ID |
| `trigger` | string | No | `loop` | `loop`, `hover`, or `click` |
| `duration_ms` | integer | No | 500 | 100 to 4000 |
| `intensity_percent` | integer | No | 100 | 25 to 200 |
| `color` | string | No | - | Optional CSS color override for icons that inherit `currentColor` |

**Returns:**
An object with: `id`, `library`, `recipe` (the motion recipe object), `css` (Motion Lab CSS), `animated_svg` (standalone SVG with embedded animation), and `selector_mode`. Placeholder CSS responses also include `selector_token`.

**Access:** Pro.

---

**Tool heading:** export_motion_css

**Description:**
Generate only the Motion Lab CSS for an icon. Use this when you have the SVG inline in your markup and want to manage the animation as a separate stylesheet.

**Parameters:** Same as `animate_icon`.

**Returns:**
An object with: `id`, `library`, `preset` (the motion recipe), `css` (the Motion Lab CSS with `@keyframes` and animation rules), and `selector_mode`. Placeholder CSS responses also include `selector_token`.

**The CSS selector targets:** By default the hosted Motion Lab CSS path returns portable output using the token `{{ICON_SELECTOR}}`. Replace that token with the selector for your inline SVG before applying the stylesheet.

**Access:** Pro.

---

**Tool heading:** export_animated_svg

**Description:**
Generate a self-contained animated SVG with the animation embedded directly in the file. Drop it into any HTML page without external CSS.

**Parameters:** Same as `animate_icon`.

**Returns:**
An object with: `id`, `library`, `preset` (the motion recipe), and `animated_svg` (a complete SVG string with a `<style>` block embedded inside).

**When to use this vs. export_motion_css:**

| You want to... | Use |
|---|---|
| Use the SVG inline with your own CSS pipeline | `export_motion_css` |
| Drop a portable self-contained animated file anywhere | `export_animated_svg` |
| Get both outputs in one call | `animate_icon` |
| Understand the preset before using it | `get_motion_recipe` |

**Access:** Pro.

---

## Page 10: Converter MCP Tools Reference (`/docs/mcp/tools/converter`)

**Title (browser tab):** Converter Tools Reference - Supericons Docs

**Page heading:** Converter MCP Tools

**Intro paragraph:**
These three tools expose Converter capabilities to your coding agent. All three are Pro-only. The `traceClass` parameter in `convert_png_to_svg` has six values with meaningfully different output results - read the reference below before choosing.

---

**Tool heading:** inspect_converter_options

**Description:**
List the current Converter MCP options and their valid values. Call this first if you are unsure which settings to use for your source image.

**Parameters:** None.

**Returns:**
An object describing all available converter settings, valid values, default values, and limits.

**Access:** Pro.

---

**Tool heading:** convert_svg_to_png

**Description:**
Render an SVG string as a PNG at any output width.

**Parameters table:**

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `svg` | string | Yes | - | Raw SVG string to render |
| `targetWidth` | integer | No | 512 | Output width in pixels. Range: 16 to 2048 |
| `background` | string | No | `transparent` | Background color. Use `transparent` or a hex value like `#ffffff` |

**Returns:**
PNG as a base64 string.

**Access:** Pro.

---

**Tool heading:** convert_png_to_svg

**Description:**
Trace a raster PNG image into an SVG. Output quality depends heavily on the source image and the settings you choose. Simple, flat-color images trace well. Complex photographs and gradient-heavy images do not.

**Parameters table:**

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `imageBase64` | string | Yes | - | PNG as base64 text or a data URL |
| `colorMode` | string | No | `color` | `color` or `mono` |
| `qualityMode` | string | No | `exact` | `exact` or `compact` |
| `traceClass` | string | No | `general-color` | See traceClass reference below |
| `uiMode` | string | No | `logo` | `logo` or `icon` |

**Returns:**
SVG string.

**Access:** Pro.

---

**Section heading:** traceClass reference

The `traceClass` parameter selects the tracing profile tuned for your source image type. Choosing the wrong class will produce imprecise or overweight output.

| traceClass value | Best for |
|---|---|
| `general-color` | Most full-color images. A safe default when unsure. |
| `flat-logo-color` | Logos with solid, flat color fills and no gradients |
| `tile-icon-color` | Small repeating tile icons |
| `tiny-line-icon` | Very small icons with fine line detail |
| `single-color-mark` | Single-color logos, wordmarks, or simple marks |
| `mono-mask` | High-contrast black and white images |

---

**Section heading:** qualityMode reference

| qualityMode value | Behavior |
|---|---|
| `exact` | Preserves maximum path detail. Output file is larger. Recommended for most use cases. |
| `compact` | Simplifies paths to reduce file size. Some fine detail will be lost. |

---

**Section heading:** uiMode reference

| uiMode value | Behavior |
|---|---|
| `logo` | Optimizes output for logo-style artwork with free-form shapes and curves |
| `icon` | Optimizes output for icon-style artwork, favoring geometric precision and clean edges |

---

**Section heading:** Recommended combinations

| Source image | Recommended settings |
|---|---|
| Full-color logo with gradients | `general-color`, `exact`, `logo` |
| Simple flat logo | `flat-logo-color`, `exact`, `logo` |
| Single-color wordmark | `single-color-mark`, `compact`, `logo` |
| Small UI icon | `tiny-line-icon`, `exact`, `icon` |
| Black and white illustration | `mono-mask`, `exact`, `logo` |

---

## Page 11: Motion Lab Guide (`/docs/motion-lab`)

**Title (browser tab):** Motion Lab Guide - Supericons Docs

**Page heading:** Motion Lab

**Page subheading:** CSS animation presets for Supericons icons.

**Intro paragraph:**
Motion Lab is a preset-driven animation workspace for Supericons icons. Choose a preset, adjust the trigger, timing, and intensity, then export the result as a Motion Lab CSS file or a standalone animated SVG. Both outputs are production-ready and require no JavaScript.

**Section heading:** How to access Motion Lab

**Body:**
Motion Lab is available in two ways:

- **In the browser**: Open the Supericons app with a Pro account. Select any icon and use the Motion Lab panel to preview and export animations.
- **Through MCP**: Your coding agent can call Motion Lab tools directly. See the Motion Lab MCP tools reference.

**Both paths require a Pro subscription or a purchased animated icon collection.**

**Section heading:** What Motion Lab produces

**Body:**
Motion Lab generates two types of output from any preset:

**Motion Lab CSS** - A stylesheet with `@keyframes` and animation rules. Replace `{{ICON_SELECTOR}}` with the selector for your inline SVG, then keep the SVG and animation in separate files.

**Animated SVG** - A self-contained SVG file with the animation embedded in a `<style>` block inside the SVG. Drop it anywhere without external CSS.

**Section heading:** Where to go next

**Links (3 cards):**

1. Card: Presets - "Full list of available presets with descriptions and categories."
2. Card: Trigger Types - "Understand loop, hover, and click behavior before exporting."
3. Card: Exports - "How to use CSS and animated SVG output in your project."

---

## Page 12: Motion Lab Presets (`/docs/motion-lab/presets`)

**Title (browser tab):** Motion Lab Presets - Supericons Docs

**Page heading:** Motion Lab Presets

**Intro paragraph:**
Supericons Motion Lab ships 12 presets across 5 categories. All presets support three trigger types (loop, hover, click) and accept duration (100ms to 4000ms) and intensity (25% to 200%) adjustments.

**Full preset reference table:**

| ID | Label | Category | Description |
|---|---|---|---|
| `pulse` | Pulse | Attention | Scales gently in and out for soft emphasis. |
| `bounce` | Bounce | Attention | Lifts the icon with a quick rebound. |
| `shake` | Shake | Attention | Adds a quick side-to-side alert motion. |
| `pop` | Pop | Attention | Snaps up with a springy overshoot. |
| `spin` | Spin | Rotation | Rotates the full icon around its center. |
| `float` | Float | Ambient | Gives the icon a subtle hovering drift. |
| `sparkle` | Sparkle | Effects | Adds a glow burst that peaks mid-cycle. |
| `trace` | Trace | Reveal | Reveals the icon with a directional trace. |
| `sweep` | Sweep | Reveal | Sweeps across the icon with a lit edge. |
| `typing` | Typing | Reveal | Stages the icon in with stepped reveal timing. |
| `tap` | Tap | Interaction | Presses forward with a quick action glow. |
| `magneticIn` | Magnetic In | Entrance | Pulls the icon inward with a magnetic snap. |

**Section heading:** Parameter ranges

**Table:**

| Parameter | Minimum | Default | Maximum |
|---|---|---|---|
| Duration | 100ms | 500ms | 4000ms |
| Intensity | 25% | 100% | 200% |

**Section heading:** Preset categories explained

**Attention** - Designed to draw the eye. Use on icons that mark errors, warnings, notifications, or calls to action.

**Rotation** - Full icon rotation. Use on loading indicators, refresh controls, and spinners.

**Ambient** - Subtle, continuous motion. Use on hero sections, decorative backgrounds, and always-on branding icons.

**Effects** - Glow and filter-based effects. Use on feature icons, premium badges, and highlight states.

**Reveal** - Entrance and disclosure animations. Use on icons that appear when a panel opens, a page loads, or content becomes available.

**Interaction** - Feedback animations for user input. Use on confirm, submit, tap-return, and toggle icons.

**Entrance** - Cinematic entrance motion. Use on first-visible hero icons and splashscreen elements.

---

## Page 13: Motion Lab Trigger Types (`/docs/motion-lab/triggers`)

**Title (browser tab):** Trigger Types - Supericons Docs

**Page heading:** Trigger Types

**Intro paragraph:**
Every Motion Lab preset supports three trigger types. The trigger controls when the animation starts and how many times it plays. Choose based on the context where the icon appears.

**Section heading:** loop

**Body:**
The animation plays continuously as soon as the icon is rendered. It repeats indefinitely with no user interaction required.

**When to use:** Loading states, ambient decorations, hero section branding icons, always-on visual interest.

**When not to use:** Interactive elements where continuous motion would compete with user focus.

---

**Section heading:** hover

**Body:**
The animation plays while the user hovers the icon element. It starts on `mouseenter` and stops naturally when the animation completes after `mouseleave`.

**When to use:** Interactive buttons, links, menu items, and call-to-action icons that reward pointer interaction.

**When not to use:** Touch-only interfaces where hover has no reliable equivalent.

---

**Section heading:** click

**Body:**
The animation plays when the icon is pressed (`:active`) or when an `.active` class is applied. It plays 3 times on activation, then stops.

**When to use:** Toggle states, like/unlike actions, confirmation icons, submit button feedback, and state changes the user triggers explicitly.

**When not to use:** Icons that have a persistent hover state (use `hover` trigger instead).

---

**Section heading:** Trigger behavior summary

| Trigger | Starts when | Repeats | Count |
|---|---|---|---|
| `loop` | Icon renders | Continuously | Infinite |
| `hover` | User hovers | Until unhovered | Infinite while hovered |
| `click` | User presses (`:active` or `.active` class) | On click | 3 times per click |

---

## Page 14: Motion Lab Exports (`/docs/motion-lab/exports`)

**Title (browser tab):** Motion Lab Exports - Supericons Docs

**Page heading:** Motion Lab Exports

**Intro paragraph:**
Motion Lab produces two output formats: Motion Lab CSS and animated SVG. Both are production-ready. Choose based on how you want to manage the SVG and animation in your project.

**Section heading:** Motion Lab CSS

**Sub-heading:** What it is

**Body:**
A stylesheet with `@keyframes` definitions and animation rules. Apply it alongside an SVG element in your HTML or JSX. The SVG and the animation are separate files.

**Sub-heading:** How to use it

**Body:**
1. Get the SVG from Supericons using `search_icons` or `get_icon`.
2. Get the CSS from `export_motion_css` using your chosen preset and trigger.
3. Keep the SVG inline in your markup.
4. Replace `{{ICON_SELECTOR}}` in the returned CSS with the selector for your inline SVG.
5. Link the updated CSS file, or paste the rules into your existing stylesheet.

**Sub-heading:** What the CSS contains

**Body:**
The CSS export includes:
- A brand comment: `/* Supericons Motion Lab */`
- A preset label comment with your chosen preset, trigger, duration, and intensity
- A `@keyframes` block for the animation
- An animation rule using the placeholder selector token `{{ICON_SELECTOR}}`
- `overflow: visible`, `transform-box: fill-box`, and `transform-origin: center` on the SVG and its children to ensure transforms behave correctly

---

**Section heading:** Animated SVG

**Sub-heading:** What it is

**Body:**
A self-contained SVG file with the animation embedded inside a `<style>` block within the SVG itself. No external CSS needed.

**Sub-heading:** How to use it

**Body:**
Drop the animated SVG file directly into any HTML page:

```html
<img src="icon-animated.svg" alt="animated icon" width="24" height="24">
```

Or paste the SVG inline:

```html
<!-- paste the entire animated SVG string here -->
```

**Sub-heading:** Compatibility note

**Body:**
Self-contained animated SVGs work in most modern browsers. When used as an `<img>` source, CSS animations play automatically. When pasted inline, hover and click triggers respond to pointer events as normal.

---

**Section heading:** Which format should I use?

| Situation | Recommended format |
|---|---|
| SVG is in your HTML or JSX, styled through your CSS pipeline | Motion Lab CSS |
| You want one portable file with no dependencies | Animated SVG |
| You are embedding in email or a documentation site | Animated SVG |
| You need to update the animation without changing the SVG | Motion Lab CSS |
| You want both formats at once | Call `animate_icon` |

---

## Page 15: Converter Guide (`/docs/converter`)

**Title (browser tab):** Converter Guide - Supericons Docs

**Page heading:** Converter

**Page subheading:** Convert between PNG and SVG format.

**Intro paragraph:**
Converter transforms images between raster and vector formats. Convert a PNG logo or icon into a clean SVG, or render any SVG as a PNG at any resolution. Both workflows are available in the browser and through MCP tools with a Pro subscription or purchased collection.

**Section heading:** What Converter does well

**Body:**
Converter produces clean, accurate output when the source image is:
- A flat-color logo with solid fills
- A single-color mark or wordmark
- A simple UI icon with clear edges
- A high-contrast black and white illustration

**Section heading:** What Converter does not do well

**Body:**
Converter produces imprecise or overweight SVG output when the source image is:
- A photograph or realistic illustration
- An image with gradients, shadows, or complex texture
- A very small raster image (under 64px in any dimension with fine detail)

**Callout (note):**
If your source image has gradients or photographic detail, PNG-to-SVG tracing is unlikely to produce a usable result. The tool is designed for graphics that were originally vector and exist in raster form.

**Section heading:** How to access Converter

**Body:**
Converter is available in two ways:

- **In the browser**: Open the Supericons app with a Pro account. Use the Converter tool from the navigation.
- **Through MCP**: Use `convert_png_to_svg` or `convert_svg_to_png` from your coding agent. Call `inspect_converter_options` first if you are unsure which settings to use.

**Both paths require a Pro subscription or a purchased collection.**

**Section heading:** Where to go next

**Links (3 cards):**

1. Card: PNG to SVG - "How to trace a raster image into a vector. Settings explained."
2. Card: SVG to PNG - "Render any SVG at any resolution with transparent or solid background."
3. Card: Settings Reference - "Full reference for traceClass, qualityMode, and uiMode."

---

## Page 16: PNG to SVG (`/docs/converter/png-to-svg`)

**Title (browser tab):** PNG to SVG - Supericons Docs

**Page heading:** PNG to SVG

**Intro paragraph:**
The PNG-to-SVG workflow traces a raster image into a vector SVG. Output quality depends on the source image and the settings you choose. Reading this page before tracing will save you time.

**Section heading:** When to use this

**Body:**
PNG-to-SVG tracing is useful when you have a logo, icon, or mark in raster format and need a scalable vector. It works best on images that were originally vector and only exist in raster form because of how they were exported or shared.

**Section heading:** Before you trace

**Checklist (yes/no questions to ask about your source image):**

- Does the image have solid, flat colors? If yes, tracing will produce clean output.
- Does the image have gradients or shadows? If yes, expect imprecise or complex paths.
- Is the image larger than 100px in both dimensions? If yes, tracing has enough detail to work with.
- Is the image a photograph or complex illustration? If yes, PNG-to-SVG is likely the wrong tool.

**Section heading:** Choosing your settings

**Body:**
The `traceClass` parameter is the most important choice. It selects the tracing algorithm tuned for your image type.

**traceClass quick guide:**

| Your image is... | Use |
|---|---|
| A typical full-color logo | `flat-logo-color` |
| A wordmark or emblem with one color | `single-color-mark` |
| A small icon grid or tile | `tile-icon-color` |
| A tiny line icon | `tiny-line-icon` |
| Black and white with high contrast | `mono-mask` |
| Something else, or unsure | `general-color` |

**Body:**
For `qualityMode`, use `exact` unless file size is a critical constraint. For `uiMode`, use `icon` for geometric icon shapes and `logo` for everything else.

**Callout (note):**
When unsure, call `inspect_converter_options` to see all valid settings with descriptions.

**Section heading:** Steps via MCP

**Body:**

1. Prepare your PNG as a base64 string or data URL.
2. Call `convert_png_to_svg` with your image and your chosen settings:

```
convert_png_to_svg
  imageBase64: "data:image/png;base64,..."
  traceClass: "flat-logo-color"
  qualityMode: "exact"
  uiMode: "logo"
```

3. Review the SVG output. If paths are imprecise, try a different `traceClass`.

**Section heading:** Common problems

**Problem 1:**
Output SVG has too many paths and looks messy

Solution: Use `compact` for `qualityMode` to simplify paths. Or use a more specific `traceClass` (for example, `single-color-mark` instead of `general-color`).

**Problem 2:**
Output is correct shape but wrong colors

Solution: Switch `colorMode` to `mono` to force grayscale tracing, then color the SVG manually in your code.

**Problem 3:**
Output does not match the source image at all

Solution: The source image may not be suitable for tracing. Gradients, textures, and photographic content do not trace to clean SVG.

---

## Page 17: SVG to PNG (`/docs/converter/svg-to-png`)

**Title (browser tab):** SVG to PNG - Supericons Docs

**Page heading:** SVG to PNG

**Intro paragraph:**
The SVG-to-PNG workflow renders any SVG at any output width. Use it to generate PNG assets for contexts where SVG is not supported, or to produce fixed-size icon exports.

**Section heading:** Choosing your output size

**Body:**
Use `targetWidth` to set the output pixel width. The height scales proportionally based on the SVG's `viewBox`. Common values:

| Use case | Suggested targetWidth |
|---|---|
| Small icon (nav, button) | 24 to 48 |
| Medium icon (card, feature) | 64 to 128 |
| Large feature icon | 256 to 512 |
| Full-resolution export | 1024 to 2048 |

The default is 512px. The maximum is 2048px.

**Section heading:** Choosing your background

**Body:**
Use `background` to set the canvas background:

- `transparent` (default) - PNG with a transparent background. Best for icons placed over colored backgrounds.
- A hex value like `#ffffff` - PNG with a solid white (or any color) background. Best for contexts where transparency is not supported.

**Section heading:** Steps via MCP

```
convert_svg_to_png
  svg: "<svg>...</svg>"
  targetWidth: 512
  background: "transparent"
```

Returns: PNG as a base64 string.

**Section heading:** Common problems

**Problem 1:**
Output looks blurry

Solution: Increase `targetWidth`. A PNG rendered at 24px and displayed at 48px will appear soft.

**Problem 2:**
SVG with `currentColor` renders as black

Solution: Set the `color` attribute directly on the SVG before passing it to the tool, or replace `currentColor` with a concrete hex value.

---

## Page 18: Converter Settings Reference (`/docs/converter/settings`)

**Title (browser tab):** Converter Settings Reference - Supericons Docs

**Page heading:** Converter Settings Reference

**Intro paragraph:**
Complete reference for all parameters accepted by `convert_png_to_svg` and `convert_svg_to_png`.

*(This page contains the same tables as Page 10 - Converter MCP Tools Reference. Reproduce the traceClass, qualityMode, uiMode, and colorMode tables in full here.)*

**Add this section heading at the top:** colorMode reference

| colorMode value | Behavior |
|---|---|
| `color` | Traces the full color information from the image. Default. |
| `mono` | Converts the image to grayscale before tracing. Produces simpler, single-color SVG paths. |

---

## Page 19: API Keys (`/docs/access/api-keys`)

**Title (browser tab):** API Keys - Supericons Docs

**Page heading:** API Keys

**Core truth callout:**
An API key does not grant access. It identifies your account and carries whatever entitlement your account already has.

**Body (paragraph 1):**
Your Supericons API key is used to authenticate your account when calling MCP tools that require access beyond the free tier. If your account has an active Pro subscription or a purchased collection, your API key carries that entitlement to the MCP server.

**Body (paragraph 2):**
A key linked to an account with no premium access behaves the same as having no key. Premium tool responses will indicate that the feature requires Pro access.

**Section heading:** How to generate a key

**Steps:**

1. Sign in to supericons.dev.
2. Open the dashboard and go to API Keys.
3. Click Generate new key.
4. Copy the key immediately. It is only shown once.

**Section heading:** How to add your key to MCP

**Body:**
Add `SUPERICONS_API_KEY` to the `env` block of your MCP server config. The exact syntax depends on your client.

**Claude Code and Cursor (JSON):**

```json
"env": {
  "SUPERICONS_API_KEY": "your-key-here"
}
```

**Codex (TOML):**

```toml
env = { SUPERICONS_API_KEY = "your-key-here" }
```

**Section heading:** Rotating and revoking keys

**Body:**
You can generate a new key at any time from the dashboard. When you generate a new key, update your MCP config with the new value and restart your client session. Revoked keys return an authentication error from all Pro MCP tools.

**Section heading:** One key per account

**Body:**
Each Supericons account supports one active API key at a time. Generating a new key does not automatically revoke the old one, but it is good practice to revoke keys you no longer use.

---

## Page 20: Pro and Collections (`/docs/access/premium`)

**Title (browser tab):** Pro and Collections - Supericons Docs

**Page heading:** Pro and Collections

**Intro paragraph:**
There are two ways to access premium features: a Pro subscription or an individual collection purchase. Both unlock MCP Pro tools and the purchased content. They differ in what content is included and how billing works.

**Section heading:** Pro subscription

**Body:**
A Pro subscription gives you access to all premium animated icon collections, Motion Lab, Converter, and a rolling claim of one collection per billing cycle to keep permanently.

**What Pro unlocks via MCP:**
- All Motion Lab tools (`list_motion_presets`, `get_motion_recipe`, `animate_icon`, `export_motion_css`, `export_animated_svg`)
- All Converter tools (`inspect_converter_options`, `convert_svg_to_png`, `convert_png_to_svg`)
- All premium animated icon collections via `search_icons` and `get_icon`

**How to get Pro:**
Subscribe from the Pricing page at supericons.dev.

---

**Section heading:** Individual collection purchase

**Body:**
Purchasing a specific animated icon collection gives you permanent access to that collection and enables the Motion Lab and Converter MCP tools for that collection's content.

**What a collection purchase unlocks via MCP:**
- Motion Lab and Converter tools for that collection's icons
- The purchased collection in `search_icons` and `get_icon`
- Only the purchased collection - not all premium collections

**How to purchase:**
Individual collections are available from the Pricing page or the collection detail page at supericons.dev.

---

**Comparison table:**

| | Pro subscription | Individual collection |
|---|---|---|
| All premium collections | Yes | No (purchased only) |
| Motion Lab MCP tools | Yes | Yes |
| Converter MCP tools | Yes | Yes |
| Collection claim per billing cycle | Yes | No |
| Billing | Monthly subscription | One-time |

**Callout (note):**
Either path requires an API key added to your MCP client config to unlock premium tools in your coding agent. See API Keys for setup instructions.

---

## Page 21: Troubleshooting (`/docs/troubleshooting`)

**Title (browser tab):** Troubleshooting - Supericons Docs

**Page heading:** Troubleshooting

**Intro paragraph:**
Common problems with MCP setup, premium access, Motion Lab, and Converter. If your problem is not listed here, visit supericons.dev or email hello@supericons.dev.

---

**Section heading:** MCP setup

**Problem:** Server does not appear after adding

**Solution:**
Type `/mcp` in Claude Code or the Codex TUI to list active servers. If Supericons is not listed, restart your coding agent session. Confirm your config file is in the correct location for your client and scope.

---

**Problem:** Wrong config file location

**Solution - config file locations:**

| Client | Scope | Path |
|---|---|---|
| Claude Code | User | `~/.claude.json` |
| Claude Code | Project | `.mcp.json` (project root) |
| Codex | User | `~/.codex/config.toml` |
| Codex | Project | `.codex/config.toml` (project root) |
| Cursor | Global | `~/.cursor/mcp.json` |
| Cursor | Project | `.cursor/mcp.json` (project root) |

---

**Problem:** npx takes a long time on first run

**Solution:**
The first time you run `npx -y supericons-mcp`, npm downloads the package. Subsequent starts are faster. This is normal behavior.

---

**Section heading:** Premium access

**Problem:** Premium tools are not available

**Solution:**
Confirm three things:

1. Your Supericons account has an active Pro subscription or a purchased collection.
2. You have generated an API key from the dashboard under API Keys.
3. `SUPERICONS_API_KEY` is present in the `env` block of your MCP server config, and your client was restarted after adding it.

---

**Problem:** API key is invalid or revoked

**Solution:**
An invalid or revoked key returns an authentication error from all Pro MCP tools. Generate a new key from the dashboard, update your config, and restart your client session.

---

**Problem:** Premium icons appear but show an error

**Solution:**
The icon may be in a collection your account does not have access to. Pro accounts can access all collections. Individual collection purchases only unlock the purchased collections.

---

**Section heading:** Motion Lab

**Problem:** Motion Lab tools return an access error

**Solution:**
Motion Lab tools are Pro-only. Confirm your API key is present in your config and your account has Pro or an animated collection.

---

**Problem:** Animated SVG does not animate in an `<img>` tag

**Solution:**
CSS animations inside SVGs used as `<img>` sources work in most browsers, but some older browsers and webviews block scripting and animation in externally loaded SVGs. For guaranteed animation, paste the SVG inline instead.

---

**Problem:** The wrong preset is animating

**Solution:**
Confirm the `preset` parameter matches a valid preset ID exactly. Preset IDs are case-sensitive and use camelCase for multi-word presets (for example: `magneticIn`, not `magnetic-in` or `MagneticIn`). Call `list_motion_presets` to see all valid IDs.

---

**Section heading:** Converter

**Problem:** PNG-to-SVG output is imprecise or has too many paths

**Solution:**
The source image likely has gradients, shadows, or photographic detail that does not trace cleanly. Try a more specific `traceClass`, or switch `qualityMode` to `compact` to simplify the paths.

---

**Problem:** Which traceClass should I use?

**Solution:**
Call `inspect_converter_options` for guided recommendations, or refer to the traceClass reference at `/docs/converter/settings`.

---

**Problem:** SVG-to-PNG output is wrong size

**Solution:**
The `targetWidth` sets the output pixel width. Height scales proportionally from the SVG `viewBox`. If the output is smaller than expected, increase `targetWidth`.

---

## Appendix: Verified commands summary

All commands below were verified against official documentation as of 10 April 2026.

| Client | Free CLI command | Config file path (user scope) |
|---|---|---|
| Claude Code (macOS/Linux) | `claude mcp add supericons -- npx -y supericons-mcp` | `~/.claude.json` |
| Claude Code (Windows) | `claude mcp add supericons -- cmd /c npx -y supericons-mcp` | `~/.claude.json` |
| Codex | `codex mcp add supericons -- npx -y supericons-mcp` | `~/.codex/config.toml` |
| Cursor | Config file only | `~/.cursor/mcp.json` |
