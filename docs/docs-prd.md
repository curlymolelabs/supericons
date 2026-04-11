# Supericons Docs Section: Product Requirements Document

**Document type:** PRD and Architecture Blueprint
**Date:** 10 April 2026
**Status:** Ready for implementation
**Audience:** Engineering, content, and design

---

## 1. Problem Statement

Supericons launched with a documentation surface that covers MCP setup for three clients. The page is titled "Supericons Docs" but does not represent the full product. Pro users who pay for Motion Lab and Converter have no reference material. The current page creates a trust gap between payment and outcome.

The product is now broader than an icon browser:
- 20,000+ free SVG icons across 10 libraries
- Premium animated collections
- MCP integration for coding agents
- Motion Lab (Pro): animation presets, CSS and SVG exports
- Converter (Pro): PNG-to-SVG and SVG-to-PNG conversion

A docs section that only covers MCP setup does not serve this product.

---

## 2. Goals

1. Build a docs section that accurately represents every part of Supericons that genuinely needs documentation.
2. Keep the top navigation intact. Introduce a dedicated docs left sidebar.
3. Ship once, cleanly. No placeholder pages. No "coming soon" in the sidebar.
4. Make every page verifiable against the shipped product before it goes live.
5. Position Supericons as a professional-grade developer tool with documentation quality to match.

---

## 3. Non-Goals

- Do not document the free icon browse UI. It is self-explanatory.
- Do not document the basic customize panel controls. They are labeled and intuitive.
- Do not document pricing. The pricing page owns that.
- Do not document legal content. Terms and Privacy pages own that.
- Do not add speculative tools or features not yet shipped.

---

## 4. Intended Audience

### Primary audience
Developers integrating Supericons into their workflow through MCP. They are comfortable with CLI tools, config files, and coding agents. They do not want to read long prose. They want correct commands and working examples.

### Secondary audience
Pro subscribers using Motion Lab and Converter who need to understand parameters, output formats, and how to integrate exported assets into their projects.

### Tertiary audience
Developers and designers evaluating Supericons for the first time. They need enough orientation to understand what the product does and whether it fits their stack.

---

## 5. Design Principles

### 5.1 Document complexity, not everything
Write docs for workflows where a user can waste 10 minutes making wrong choices without guidance. Skip docs for things the UI already explains clearly.

### 5.2 One source of truth
Each topic has one canonical page. No duplication of pricing, legal, or setup instructions across multiple unrelated pages.

### 5.3 Honest scope
Every sidebar item points to a finished page. No sidebar items that are promises rather than pages.

### 5.4 Integrated, not detached
Docs live inside the Supericons site shell. Top navigation, account routes, and branding remain consistent with the rest of the product.

### 5.5 Launch once, launch cleanly
Because Supericons has not yet launched publicly, ship the complete first docs experience at once. Avoid a mid-state that requires a second redesign.

---

## 6. Open Questions - Resolved

### 6.1 Hero pill chips
**Question:** Are the hero pills in the docs page redundant given the left sidebar?
**Resolution:** Keep them. Pills serve ambient awareness (what exists here). The sidebar serves active navigation (where to go). They are sequential, not competing. Refine the pill copy from feature labels to value statements.

**Approved pills for the docs home page:**
- `20,000+ free icons`
- `Animated icons and CSS exports` (replaces "Motion Lab MCP for Pro")
- `Works in Claude Code, Codex, Cursor` (replaces the client-specific labels)

### 6.2 Interim title before full docs ship
**Question:** What should the current page title be?
**Resolution:** Keep "Supericons Docs." Add a subtitle: "MCP integration guides for Claude Code, Codex, and Cursor." This is accurate today. Once the full docs ship, remove the subtitle. No rewrite needed.

---

## 7. Information Architecture

### 7.1 URL structure

```
/docs                          Docs home
/docs/what-is-supericons       Product overview
/docs/quickstart               Fastest path to working MCP
/docs/mcp/claude-code          Claude Code setup guide
/docs/mcp/codex                Codex (CLI + IDE) setup guide
/docs/mcp/cursor               Cursor setup guide
/docs/mcp/tools                MCP tools overview
/docs/mcp/tools/icons          Icon tools reference
/docs/mcp/tools/motion         Motion Lab MCP tools reference
/docs/mcp/tools/converter      Converter MCP tools reference
/docs/motion-lab               Motion Lab product guide
/docs/motion-lab/presets       Preset reference
/docs/motion-lab/triggers      Trigger types and behavior
/docs/motion-lab/exports       CSS and animated SVG export guide
/docs/converter                Converter product guide
/docs/converter/png-to-svg     PNG to SVG workflow
/docs/converter/svg-to-png     SVG to PNG workflow
/docs/converter/settings       Settings reference (traceClass, qualityMode, uiMode)
/docs/access/api-keys          API keys and how they work
/docs/access/premium           Pro subscription and collection access
/docs/troubleshooting          Consolidated error and failure guide
```

### 7.2 Sidebar structure

```
Docs

  Overview
    Docs Home
    What Is Supericons
    Quickstart

  MCP Setup
    Claude Code
    Codex
    Cursor

  MCP Tools Reference
    Icon Tools
    Motion Lab Tools (Pro)
    Converter Tools (Pro)

  Motion Lab (Pro)
    Guide
    Presets
    Trigger Types
    Exports

  Converter (Pro)
    Guide
    PNG to SVG
    SVG to PNG
    Settings Reference

  Access & API Keys
    API Keys
    Pro & Collections

  Troubleshooting
```

Total pages at launch: **21**

---

## 8. Page Specifications

### 8.1 Docs Home (`/docs`)

**Purpose:** Orient first-time visitors. Communicate what Supericons is and what the docs cover. Route users to the right starting point quickly.

**Page structure:**
1. Hero area with title, subtitle, and 3 value pills
2. "Start here" routing cards (Quickstart, MCP Setup, Motion Lab, Converter)
3. Short "What needs docs and what does not" framing paragraph

**Hero copy:**
- Title: `Supericons Docs`
- Subtitle: `Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter.`
- Pills: `20,000+ free icons` | `Animated icons and CSS exports` | `Works in Claude Code, Codex, Cursor`

**Routing cards:**
- `Get started fast` - Quickstart guide, free and Pro
- `Set up MCP` - Choose your client: Claude Code, Codex, Cursor
- `Learn Motion Lab` - Presets, triggers, and how to export animations
- `Use the Converter` - PNG to SVG, SVG to PNG, and output settings

**Writing standard:** Scannable. No paragraph longer than 2 sentences on this page. Every element routes somewhere, it does not explain.

---

### 8.2 What Is Supericons (`/docs/what-is-supericons`)

**Purpose:** Give new users a concise, accurate model of the product before they dig into setup. Define free vs. Pro. Explain where MCP fits.

**Page structure:**
1. Product definition (2 paragraphs)
2. Feature surface table: Free | Pro | MCP category
3. Short "Where to go next" routing block

**Copy standard - product definition:**

> Supericons gives you 20,000+ open-source SVG icons from 10 libraries in one searchable interface. Search by name, concept, or style. Customize color, size, stroke, and fill. Export as SVG, PNG, or React, Vue, or Svelte components.
>
> For AI-assisted development, Supericons ships an MCP server. Your coding agent can search and retrieve icons directly without switching to a browser. Pro subscribers also get access to Motion Lab (animation presets with CSS and SVG export) and Converter (PNG-to-SVG and SVG-to-PNG conversion), both accessible from the browser and through MCP tools.

**Feature surface table:**

| Feature | Free | Pro |
|---|---|---|
| 20,000+ SVG icons from 10 libraries | Yes | Yes |
| AI semantic search | Yes | Yes |
| Color, size, stroke customization | Yes | Yes |
| Export: SVG, PNG, React, Vue, Svelte | Yes | Yes |
| MCP: search and retrieve icons | Yes | Yes |
| Premium animated icon collections | No | Yes |
| Motion Lab: animation presets | No | Yes |
| Motion Lab: CSS and SVG export via MCP | No | Yes |
| Converter: PNG to SVG | No | Yes |
| Converter: SVG to PNG | No | Yes |

---

### 8.3 Quickstart (`/docs/quickstart`)

**Purpose:** Get a new user to their first working outcome in under 5 minutes. This page does not go deep. It links out.

**Page structure:**
1. Two-path intro: free setup vs. premium setup
2. Free path: 3 steps to working MCP
3. Premium path: what you need before you start
4. Links to client guides

**Free path copy:**

> **Step 1.** Add the Supericons MCP server to your client. Choose your client below to get the exact command.
>
> **Step 2.** Restart or reload your coding agent session so the server registers.
>
> **Step 3.** Ask your agent to find an icon. Try: "Find me a settings icon from Lucide."

**Premium path copy:**

> To use premium icon collections, Motion Lab, or Converter through MCP, you need three things:
> - A Supericons account with Pro or a purchased collection
> - An API key from your Supericons dashboard
> - Your `SUPERICONS_API_KEY` added to your MCP client config

**Client quick-links:** Claude Code | Codex | Cursor

---

### 8.4 Claude Code Guide (`/docs/mcp/claude-code`)

**Purpose:** Give Claude Code users a verified, complete setup path. Free setup and premium setup in one page.

**Verified as of:** 10 April 2026
**Source:** [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp)

**Page structure:**
1. Short context (1 sentence: what Claude Code is, why MCP matters here)
2. Free setup: CLI command + config file alternative
3. Verification step
4. Premium setup: add API key
5. Example prompt
6. Troubleshooting callouts

**Verified copy - free setup:**

> The fastest way to add Supericons to Claude Code is with one command:

```bash
# macOS / Linux
claude mcp add supericons -- npx -y supericons-mcp

# Windows
claude mcp add supericons -- cmd /c npx -y supericons-mcp
```

> Prefer a config file? Claude Code stores MCP servers in `~/.claude.json` for user-level scope or `.mcp.json` in your project root for project-level scope. Add this block:

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

> After adding the server, check it registered correctly:

```
/mcp
```

**Verified copy - premium setup:**

> To unlock premium collections, Motion Lab, and Converter tools, add your API key to the server config:

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

> Your API key must be linked to a Supericons account with an active Pro subscription or purchased collection. Generate your key at: Supericons > API Keys.

**Troubleshooting callouts:**

> Server does not appear after adding: Run `/mcp` to check. If it is not listed, restart the Claude Code session.
>
> Premium tools not available: Confirm your account has active Pro or collection access. Confirm `SUPERICONS_API_KEY` is present in the config Claude Code uses at startup.

---

### 8.5 Codex Guide (`/docs/mcp/codex`)

**Purpose:** Verified setup path for Codex CLI and IDE extension users. Scope is explicit: CLI and IDE extension only.

**Verified as of:** 10 April 2026
**Source:** [developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp)

**Page structure:**
1. Scope note: CLI and IDE extension only
2. Free setup: CLI command + TOML config alternative
3. Project-scoped config note
4. Verification step
5. Premium setup
6. Example prompt
7. Troubleshooting callouts

**Scope note copy:**

> Codex supports MCP in the CLI and IDE extension. The CLI and IDE extension share the same configuration. The Codex web app and cloud task runner do not support MCP server configuration.

**Verified copy - free setup:**

```bash
codex mcp add supericons -- npx -y supericons-mcp
```

> Prefer a config file? Add the server to `~/.codex/config.toml`:

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
```

> To scope the server to a specific project, add the same block to `.codex/config.toml` in your project root (trusted projects only).

> To verify the server is active, use the Codex TUI:

```
/mcp
```

**Verified copy - premium setup:**

```toml
[mcp_servers.supericons]
command = "npx"
args = ["-y", "supericons-mcp"]
env = { SUPERICONS_API_KEY = "your-key-here" }
```

---

### 8.6 Cursor Guide (`/docs/mcp/cursor`)

**Purpose:** Verified setup path for Cursor users.

**Verified as of:** 10 April 2026 (rate-limited; verified in prior session)
**Source:** [cursor.com/docs/mcp](https://cursor.com/docs/mcp)

**Page structure:**
1. Free setup: global config
2. Project-scoped config alternative
3. Verification step
4. Premium setup
5. Example prompt
6. Troubleshooting callouts

**Verified copy - global config:**

> Add Supericons to `~/.cursor/mcp.json` for access across all projects:

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

> For project-only access, add the same block to `.cursor/mcp.json` in your project root.

---

### 8.7 MCP Tools Overview (`/docs/mcp/tools`)

**Purpose:** Explain the MCP surface as a system. Establish free vs. Pro tool split. Link to detailed references.

**Page structure:**
1. What MCP gives you (2 sentences)
2. Tool categories: Icon tools | Motion Lab tools | Converter tools
3. Free vs. Pro access table
4. Links to detailed reference pages

**Intro copy:**

> The Supericons MCP server exposes tools your coding agent can call directly. Icon search and retrieval are free. Motion Lab and Converter tools require a Pro subscription or purchased collection and a valid `SUPERICONS_API_KEY`.

**Tool access table:**

| Tool | Category | Access |
|---|---|---|
| `search_icons` | Icons | Free |
| `get_icon` | Icons | Free |
| `list_libraries` | Icons | Free |
| `list_motion_presets` | Motion Lab | Pro |
| `get_motion_recipe` | Motion Lab | Pro |
| `animate_icon` | Motion Lab | Pro |
| `export_motion_css` | Motion Lab | Pro |
| `export_animated_svg` | Motion Lab | Pro |
| `inspect_converter_options` | Converter | Pro |
| `convert_svg_to_png` | Converter | Pro |
| `convert_png_to_svg` | Converter | Pro |

---

### 8.8 Icon Tools Reference (`/docs/mcp/tools/icons`)

**Purpose:** Reference for the three free icon tools. What each does, what it needs, what it returns.

**`search_icons`**

> Search 20,000+ icons across 10 libraries using AI-powered semantic matching.

| Input | Type | Notes |
|---|---|---|
| `query` | string | Required. Natural language search term. |
| `library` | string | Optional. Filter by library name (e.g. `lucide`, `tabler`). |
| `limit` | integer | Optional. Max results, 1 to 50. Default 10. |

> Returns: matching icons with SVG code and metadata.
> Access: Free.

**`get_icon`**

> Retrieve a specific icon by ID and library.

| Input | Type | Notes |
|---|---|---|
| `id` | string | Required. Icon ID (e.g. `settings`, `heart`). |
| `library` | string | Required. Library name. |

> Returns: full SVG code and metadata.
> Access: Free.

**`list_libraries`**

> Return the list of icon libraries available in Supericons.

> Returns: library names, icon counts, descriptions.
> Access: Free.

---

### 8.9 Motion Lab MCP Tools Reference (`/docs/mcp/tools/motion`)

**Purpose:** Reference for the five Motion Lab MCP tools. These are Pro-only. Parameters are non-trivial.

**`list_motion_presets`**

> Return all available animation presets by name and category.

> Returns: preset IDs, categories, brief descriptions.
> Access: Pro.
> Use when: you need to know what presets exist before calling `animate_icon`.

---

**`get_motion_recipe`**

> Return a human-readable description of how a preset works: trigger type, timing, easing, and intended use.

| Input | Type | Notes |
|---|---|---|
| `preset` | string | Required. Preset ID (e.g. `pulse`, `bounce`). |
| `trigger` | string | Optional. `loop`, `hover`, or `click`. Default `loop`. |
| `durationMs` | integer | Optional. Duration in milliseconds. |
| `intensityPercent` | integer | Optional. Intensity scaling, 25 to 200. Default 100. |

> Returns: plain-language description of the animation.
> Access: Pro.

---

**`animate_icon`**

> Apply a Motion Lab preset to an icon. Returns both the Motion Lab CSS and a self-contained animated SVG.

| Input | Type | Notes |
|---|---|---|
| `id` | string | Required. Icon ID. |
| `library` | string | Required. Library name. |
| `preset` | string | Required. Preset ID. |
| `trigger` | string | Optional. `loop`, `hover`, or `click`. Default `loop`. |
| `durationMs` | integer | Optional. 100 to 4000. Default 500. |
| `intensityPercent` | integer | Optional. 25 to 200. Default 100. |
| `color` | string | Optional. CSS color override. |

> Returns: Motion Lab CSS + animated SVG.
> Access: Pro.

---

**`export_motion_css`**

> Return the Motion Lab CSS only (no SVG). Use when you have the SVG inline in your markup and want to manage the animation separately.

> Inputs: same as `animate_icon`.
> Returns: CSS keyframes and class rules.
> Access: Pro.

---

**`export_animated_svg`**

> Return a self-contained animated SVG with animation embedded. Drop it directly into any HTML without additional CSS files.

> Inputs: same as `animate_icon`.
> Returns: standalone animated SVG file.
> Access: Pro.

---

**When to use which output:**

| You want to... | Use |
|---|---|
| Animate an icon inline with existing CSS | `export_motion_css` |
| Drop a standalone animated file anywhere | `export_animated_svg` |
| Get both in one call | `animate_icon` |
| Understand what a preset does before using it | `get_motion_recipe` |

---

### 8.10 Converter MCP Tools Reference (`/docs/mcp/tools/converter`)

**Purpose:** Reference for the three Converter MCP tools. The `traceClass` and `uiMode` parameters are genuinely non-obvious and require explanation.

**`inspect_converter_options`**

> Return all available converter settings and their valid values. Call this first if you are unsure which settings to use.

> Returns: available options with descriptions and valid values.
> Access: Pro.

---

**`convert_svg_to_png`**

> Render an SVG as a PNG file.

| Input | Type | Notes |
|---|---|---|
| `svg` | string | Required. Raw SVG string. |
| `targetWidth` | integer | Optional. Output width in pixels, 16 to 2048. Default 512. |
| `background` | string | Optional. `transparent` or hex color (e.g. `#ffffff`). Default `transparent`. |

> Returns: PNG as base64.
> Access: Pro.

---

**`convert_png_to_svg`**

> Trace a raster PNG image into an SVG. Output quality depends heavily on input complexity and the settings you choose.

| Input | Type | Notes |
|---|---|---|
| `imageBase64` | string | Required. PNG as base64 or data URL. |
| `colorMode` | string | Optional. `color` or `mono`. Default `color`. |
| `qualityMode` | string | Optional. `exact` or `compact`. Default `exact`. |
| `traceClass` | string | Optional. See traceClass reference below. Default `general-color`. |
| `uiMode` | string | Optional. `logo` or `icon`. Default `logo`. |

> Returns: SVG string.
> Access: Pro.

---

**traceClass reference:**

| Value | Best for |
|---|---|
| `general-color` | Most full-color images and photographs |
| `flat-logo-color` | Logos with solid flat color fills |
| `tile-icon-color` | Small repeating tile icons |
| `tiny-line-icon` | Very small icons with fine line detail |
| `single-color-mark` | Single-color logos or marks |
| `mono-mask` | High-contrast black and white images |

**qualityMode reference:**

| Value | Behavior |
|---|---|
| `exact` | Preserves maximum path detail. Larger output file. |
| `compact` | Simplifies paths for smaller file size. Some detail loss. |

**uiMode reference:**

| Value | Behavior |
|---|---|
| `logo` | Optimizes output for logo-style artwork with free-form shapes. |
| `icon` | Optimizes output for icon-style artwork with geometric precision. |

---

### 8.11 Motion Lab Guide (`/docs/motion-lab`)

**Purpose:** Explain Motion Lab as a product workflow. Who it is for, what it does, how to use it. This is the conceptual guide; the MCP tool reference is the technical reference.

**Page structure:**
1. What Motion Lab is (2 sentences)
2. How to access it (browser vs. MCP)
3. Preset categories overview
4. Trigger types
5. Duration and intensity controls
6. Output formats: when to use CSS vs. animated SVG
7. Links to sub-pages

**What Motion Lab is:**

> Motion Lab is a preset-driven animation workspace for Supericons icons. Choose a preset, adjust the trigger, timing, and intensity, and export either a Motion Lab CSS file for use with inline SVGs or a standalone animated SVG you can drop anywhere.

**Access:**

> Motion Lab is available in the browser for all Pro subscribers. Motion Lab tools are also available through MCP for coding agents with a valid `SUPERICONS_API_KEY` on a Pro account.

---

### 8.12 Motion Lab Presets Reference (`/docs/motion-lab/presets`)

**Purpose:** Full reference of all Motion Lab presets with descriptions and recommended use cases.

**Format:** Table with preset ID, category, description, best-fit use case.

*(Exact preset table to be written from the live `list_motion_presets` output at time of launch verification)*

---

### 8.13 Motion Lab Trigger Types (`/docs/motion-lab/triggers`)

**Purpose:** Explain the three trigger types and when to use each.

**Trigger reference:**

| Trigger | Behavior | Best for |
|---|---|---|
| `loop` | Animation runs continuously, no user interaction needed | Loading states, ambient decorations, always-on branding |
| `hover` | Animation plays when the user hovers over the element | Interactive buttons, links, call-to-action icons |
| `click` | Animation plays when the user clicks the element | Toggle states, confirmation icons, submit actions |

---

### 8.14 Motion Lab Exports Guide (`/docs/motion-lab/exports`)

**Purpose:** Explain the two export formats, how they work technically, and how to use them in a project.

**CSS export:**

> The CSS export returns a stylesheet with keyframe definitions and a class rule. Apply the class to an inline SVG element in your markup. The SVG and the animation live separately.

> When to use: you are using the SVG inline in your HTML or JSX and want to manage styles in your own CSS pipeline.

**Animated SVG export:**

> The animated SVG export returns a single file with the animation embedded directly. No external CSS needed. Drop the file into any HTML page or `<img>` tag.

> When to use: you need a portable, dependency-free animated file. Good for email clients that support inline SVG, documentation sites, or anywhere an external CSS file is inconvenient.

---

### 8.15 Converter Guide (`/docs/converter`)

**Purpose:** Explain Converter as a product workflow. Who it is for, what it does, how to get good results.

**Page structure:**
1. What Converter is (2 sentences)
2. How to access it (browser vs. MCP)
3. PNG to SVG workflow overview
4. SVG to PNG workflow overview
5. Link to settings reference
6. Expectations: what Converter does well and where it has limits

**What Converter is:**

> Converter transforms images between vector and raster formats. Convert a PNG logo or illustration into a clean SVG, or render any SVG as a PNG at any resolution. Both workflows are available in the browser and through MCP tools.

**PNG to SVG expectations:**

> PNG-to-SVG output quality depends on the source image. Simple, flat-color logos and icons trace cleanly. Complex photographs and gradients produce large, imprecise SVGs and are not a good fit for this tool. Choose the right `traceClass` for your source image. If you are unsure, start with `inspect_converter_options`.

---

### 8.16 Converter Settings Reference (`/docs/converter/settings`)

**Purpose:** Full reference for all Converter parameters. This is the definitive guide to traceClass, qualityMode, and uiMode.

*(Content defined in section 8.10 of this PRD - reproduce in full at this URL)*

---

### 8.17 API Keys (`/docs/access/api-keys`)

**Purpose:** Explain what API keys are, what they unlock, and how to create and manage them.

**Key principle:** An API key does not grant access by itself. It carries whatever entitlement your account already has. A key on a free account does nothing for premium features.

**Page structure:**
1. What an API key does
2. What an API key does not do
3. How to generate a key
4. How to add a key to your MCP config
5. Key rotation and revocation

**Copy - what an API key does:**

> Your Supericons API key identifies your account when you call MCP tools that require authentication. If your account has an active Pro subscription or a purchased collection, your API key carries that entitlement to the MCP server.

**Copy - what an API key does not do:**

> An API key alone does not unlock premium features. If your account does not have Pro or a purchased collection, adding an API key to your MCP config will not change what tools are available to you. Access is determined by your account, not the key itself.

---

### 8.18 Pro and Collections (`/docs/access/premium`)

**Purpose:** Explain the two paths to premium access and what each unlocks.

**Two paths:**

| Path | What you get | How to access |
|---|---|---|
| Pro subscription | All premium collections + Motion Lab + Converter + 1 collection claim per billing cycle | Subscribe on the Pricing page |
| Individual collection | One specific animated icon pack | Purchase on the Pricing page or collection detail |

> Both paths give you API key access to Pro MCP tools for the features you have purchased.

---

### 8.19 Troubleshooting (`/docs/troubleshooting`)

**Purpose:** One page that covers the recurring failures across all workflows.

**Page structure:**
1. MCP setup failures
2. Premium access failures
3. Motion Lab failures
4. Converter failures

**MCP setup failures:**

> **Server does not appear after adding**
> Run `/mcp` in Claude Code or Codex TUI to check active servers. If Supericons is not listed, restart the session. Confirm your config file is in the correct location for your client and scope.

> **Wrong config file**
> - Claude Code user scope: `~/.claude.json`
> - Claude Code project scope: `.mcp.json` (project root)
> - Codex user scope: `~/.codex/config.toml`
> - Codex project scope: `.codex/config.toml` (project root)
> - Cursor global: `~/.cursor/mcp.json`
> - Cursor project: `.cursor/mcp.json` (project root)

**Premium access failures:**

> **Premium tools not available**
> Confirm three things: (1) your Supericons account has active Pro or a purchased collection, (2) you have generated an API key from the Supericons dashboard, (3) `SUPERICONS_API_KEY` is present in the config your MCP client reads at startup.

> **API key invalid or revoked**
> Revoked keys return an authentication error from MCP tools. Generate a new key from the Supericons dashboard and update your config. Restart your client session after updating.

**Motion Lab failures:**

> **Motion Lab tools not available**
> These tools are Pro-only. Confirm your API key is present and your account has Pro or an animated collection.

> **Unexpected output from `animate_icon`**
> Confirm the icon ID and library name are correct. Use `search_icons` first to find the exact ID and library if you are unsure.

**Converter failures:**

> **PNG-to-SVG output is imprecise**
> Complex images, photographs, and gradients produce imprecise output. Use a source with flat, solid colors. Try `mono` for `colorMode` and `single-color-mark` for `traceClass` on simple logos.

> **Which traceClass should I use?**
> Call `inspect_converter_options` for guidance, or refer to the traceClass reference at `/docs/converter/settings`.

---

## 9. Launch Quality Gates

The docs section does not ship until all of the following are confirmed:

- [ ] Every sidebar item points to a completed page
- [ ] No placeholder text exists on any page
- [ ] No "coming soon" appears anywhere in the sidebar or page content
- [ ] All client setup commands are verified against official documentation sources
- [ ] All tool names and parameters match the live MCP server (`mcp/index.js`)
- [ ] Motion Lab and Converter pages describe real, shipped product behavior
- [ ] All internal links resolve to the correct pages
- [ ] Pricing and entitlement language is consistent across all docs, the pricing page, and the API keys page
- [ ] The `verifiedDate` timestamp appears on all three client setup guides

---

## 10. Execution Order

### Phase 1: Architecture lock (prerequisite for all writing)
- Finalize sidebar structure and URL map
- Finalize the 21-page set
- Confirm what is in scope and what is intentionally excluded
- Lock the docs shell layout (sidebar + top nav integration)

### Phase 2: Core docs (orientation layer)
Pages: Docs Home, What Is Supericons, Quickstart, API Keys, Pro and Collections, Troubleshooting

These pages orient every type of user. They must exist before any reference docs ship because they answer "what is this and do I need it?" before the user reads anything technical.

### Phase 3: Client setup guides (highest user-demand pages)
Pages: Claude Code, Codex, Cursor

These are the highest-traffic pages. They exist in a near-complete state already. The work here is refining copy, adding the verification timestamp, and integrating into the routed URL structure.

### Phase 4: MCP tools reference (technical reference layer)
Pages: MCP Tools Overview, Icon Tools, Motion Lab Tools, Converter Tools

These pages are the reference layer for developers who want to understand tool inputs, outputs, and access levels without running the tools first.

### Phase 5: Product guides (Pro-specific depth)
Pages: Motion Lab Guide, Motion Lab Presets, Motion Lab Triggers, Motion Lab Exports, Converter Guide, Converter PNG-to-SVG, Converter SVG-to-PNG, Converter Settings Reference

These are the pages that justify "Supericons Docs" as a title. They cover the Pro surfaces that have no documentation today.

### Phase 6: Consistency and verification pass
- Align terminology across all 21 pages
- Verify all setup steps against official sources at time of launch
- Verify all feature descriptions against the live product
- Confirm all internal links
- Add the `verifiedDate` field to client guides

---

## 11. Writing Standards

Every page must answer, in order:
1. What is this?
2. Who is it for?
3. What do they need first?
4. How do they use it?
5. What can go wrong?
6. Where do they go next?

Every command, file path, and tool parameter must be verified against the live product before the page ships.

No jargon that a mid-level developer would not know without looking it up. No internal implementation language in user-facing copy.

Every page should be completable in one read sitting. If it takes longer than 4 minutes to read, it is too long.

---

## 12. Hero Pill Copy: Final Approved Set

For the Docs Home page, and for the current page while the full docs are being built:

| Pill | What it communicates |
|---|---|
| `20,000+ free icons` | Scale and value |
| `Animated icons and CSS exports` | Pro capability, plain language |
| `Works in Claude Code, Codex, Cursor` | Compatibility, the developer's first question |

---

## Appendix A: Content Sources

All content for the 21 pages can be written from material that already exists:

| Source | Pages it feeds |
|---|---|
| `docs/factsheet.md` | What Is Supericons, Docs Home hero |
| `docs/plans/client-guides-copy-refined.md` | Claude Code, Codex, Cursor guides |
| `docs/plans/client-guides-verification-report.md` | Verified commands and paths |
| `mcp/index.js` (live MCP server) | All tool reference pages |
| Motion Lab product surface | Motion Lab guide and sub-pages |
| Converter product surface | Converter guide and sub-pages |
| `docs/plans/docs-strategy-discussion.md` | Strategic framing for Docs Home |
| `docs/docs-section-proposal.md` | Page definitions and principles |

No page in the 21-page set requires inventing content that does not already exist in the product or its documentation.
