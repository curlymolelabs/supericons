# Overview and MCP Setup: Master Copy Reference

**Date:** 11 April 2026
**Supersedes:** `overview-mcp-setup-copy-audit.md` and the Overview/MCP Setup portions of `docs-copy-bible.md`
**Status of this file:** Authoritative. When `docs-pages.js` is edited, use the "Final copy" cells in this document verbatim.

---

## How to read this document

Each section covers one page in sidebar order. Within each section:

- **Live** = what is currently in `docs-pages.js`
- **Bible** = what `docs-copy-bible.md` specifies
- **Audit finding** = the verdict from the copy audit (Change needed / Gap / Minor refinement / No change)
- **Final copy** = the single authoritative text to implement

Where Live = Bible = Final, no edit is needed.
Where they diverge, the Final copy column is the implementation target.

A **Divergence note** appears whenever the Bible and the Audit disagree, explaining the resolution.

---

## Severity reference

| Label | Meaning |
|---|---|
| **Change needed** | Live copy fails a best-practice test visible to readers |
| **Gap** | Content is missing that belongs on this page |
| **Minor refinement** | Live copy works but a cleaner version exists |
| **No change** | Live copy passes as-is; no edit required |

---

---

# GROUP 1: OVERVIEW

---

## Page: Docs Home (`docs`)

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter.` |
| **Bible** | `Everything you need to set up MCP, use Motion Lab exports, and get the most from Converter.` |
| **Audit finding** | **Change needed.** "Everything you need" is a marketing filler opener. |
| **Final copy** | `Set up MCP, learn Motion Lab, and use Converter.` |

> **Divergence note:** Bible retains the filler opener. The audit supersedes it here. Final copy removes the opener and cuts word count from 18 to 9.

---

### Routing Card 2: "Set up MCP" - card body

| | Text |
|---|---|
| **Live** | `Step-by-step setup for Claude Code, Codex CLI, Cursor, and other coding agents.` |
| **Bible** | `Step-by-step setup for Claude Code, Codex CLI, and Cursor.` |
| **Audit finding** | **No change.** Live copy is more inclusive (adds "and other coding agents"). |
| **Final copy** | `Step-by-step setup for Claude Code, Codex CLI, Cursor, and other coding agents.` |

> **Divergence note:** Bible omits "other coding agents." Live is better. Keep live.

---

### Footnote framing paragraph

| | Text |
|---|---|
| **Live** | `Free icon browsing and the customize panel are self-explanatory in the app. This docs section covers MCP integration, Motion Lab, and Converter, where setup or parameter choices are non-obvious.` |
| **Bible** | `Free icon browsing and the customize panel are self-explanatory in the app. This docs section covers MCP integration, Motion Lab, and Converter, where setup or parameter choices are non-obvious.` |
| **Audit finding** | **No change.** Correct, honest, well-scoped. |
| **Final copy** | Same as live. No edit needed. |

---

### All other cards and routing links

| Element | Audit finding | Final copy |
|---|---|---|
| Card 1 body | No change | `Set up the MCP server and run your first icon query in under 5 minutes.` |
| Card 3 body | No change | `Presets, trigger types, and how to export animations as CSS or standalone SVG.` |
| Card 4 body | No change | `PNG to SVG, SVG to PNG, and how to choose the right settings for your source image.` |

---

---

## Page: What Is Supericons (`docs-what-is-supericons`)

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `A product overview page is planned for this section so the docs can explain the full product, not only setup.` |
| **Bible** | *(Not specified as a subtitle field; Bible provides full body copy for this page)* |
| **Audit finding** | **Change needed.** The `summary` field renders as the visible page subtitle in the docs hero. This reads as an internal note, not a subtitle. |
| **Final copy** | `20,000+ open-source icons, MCP integration, and Pro tools for animated icons and image conversion.` |

---

### `navLabel`

| | Text |
|---|---|
| **Live** | `What Is Supericons` |
| **Bible** | *(Not specified)* |
| **Audit finding** | **No change.** Clear and matches the page heading. |

---

### Body content (currently placeholder)

The Bible specifies the full body for this page. Implement verbatim once the placeholder is replaced.

**Section 1 heading:** What Is Supericons

**Paragraph 1:**
Supericons gives you 20,000+ open-source SVG icons from 10 libraries in one searchable interface. Search by name, concept, or style. Customize color, size, stroke, and fill in real time. Export as SVG, PNG, or React, Vue, or Svelte components with one click.

**Paragraph 2:**
For AI-assisted development, Supericons ships a dedicated MCP server. Your coding agent can search and retrieve icons without switching to a browser. Pro subscribers also get access to Motion Lab (animation presets with CSS and SVG export) and Converter (PNG-to-SVG and SVG-to-PNG conversion), both available in the browser and through MCP tools.

**Section 2 heading:** Free vs. Pro

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

**Section 3 heading:** The 10 free icon libraries

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

**Section 4 heading:** Where to go next

**Routing links:**
- Set up MCP - Get the MCP server running in your coding agent
- Get Pro - See what a Pro subscription includes
- API Keys - Understand how authentication works

---

---

## Page: Quickstart (`docs-quickstart`)

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `Get Supericons running in your coding agent in under 5 minutes.` |
| **Bible** | `Get Supericons running in your coding agent in under 5 minutes.` |
| **Audit finding** | **No change.** |
| **Final copy** | Same as live. No edit needed. |

---

### Free setup - "Add the server" card body

| | Text |
|---|---|
| **Live** | `Start with the universal setup guide, or choose your client for the exact command or config block.` |
| **Bible** | `Choose your client and follow the setup for the exact command or config block.` |
| **Audit finding** | **Minor refinement.** Universal guide is the reference; client guides are the primary action. |
| **Final copy** | `Choose your client below, or open the universal setup guide for the base config values.` |

> **Divergence note:** Bible places client guides as the primary action (correct). The audit refines phrasing further. Final copy combines both direction. Inline links remain: Claude Code, Codex, Cursor (and Universal as secondary).

---

### Free setup - "Reload your session" card body

| | Text |
|---|---|
| **Live** | `Restart or reload your coding agent session so the server registers. In Claude Code and Codex, type /mcp to confirm Supericons is listed.` |
| **Bible** | `Restart or reload your coding agent session so the server registers. In Claude Code and Codex, type /mcp to confirm Supericons is listed.` |
| **Audit finding** | **Minor refinement.** "Restart or reload" is redundant; "so the server registers" is passive. |
| **Final copy** | `Restart your coding agent session. In Claude Code and Codex, type /mcp to confirm Supericons appears in the list.` |

---

### Premium setup - API keys callout heading

| | Text |
|---|---|
| **Live** | `How API keys work` |
| **Bible** | *(The callout body is specified but no explicit heading change is proposed)* |
| **Audit finding** | **Minor refinement.** Heading should state the fact, not label the topic. |
| **Final copy heading** | `Your key carries your account entitlement, not access` |
| **Final copy body** | `Your API key carries your account entitlement. The key itself does not grant access. If your account does not have Pro or a purchased collection, adding a key will not unlock premium tools.` |

---

### Premium setup - intro, numbered list, and client links

| Element | Audit finding | Final copy |
|---|---|---|
| Intro paragraph | No change | `To access premium animated collections, Motion Lab, and Converter through MCP, you need three things in place before your agent can use them.` |
| List item 1 | No change | `A Supericons account with an active Pro subscription, or a purchased collection.` |
| List item 2 | No change | `An API key generated from your Supericons dashboard under API Keys.` |
| List item 3 | No change | `Your SUPERICONS_API_KEY environment variable added to your MCP client config.` |
| Link labels | No change | `Claude Code with API key`, `Codex with API key`, `Cursor with API key` |

---

---

# GROUP 2: MCP SETUP

---

## Page: Universal Setup (`docs-mcp-universal`)

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `Use this guide when your coding agent supports local stdio MCP servers and you want the baseline Supericons setup before adapting it to a client-specific settings format.` |
| **Bible** | *(This page is not in the copy bible. Bible coverage starts at client-specific guides.)* |
| **Audit finding** | **Change needed.** 33 words. Conditional framing creates hesitation. This is the entry point for most developers. |
| **Final copy** | `The base server config for any MCP-capable coding agent. Adapt to your client's settings format.` |

---

### Free setup - intro paragraph

| | Text |
|---|---|
| **Live** | `Free icons work without an account or API key. Any coding agent that can launch a local stdio MCP server can use Supericons with the same server command and args.` |
| **Bible** | *(Not specified)* |
| **Audit finding** | **Minor refinement.** "With the same server command and args" is a forward reference that has no prior context on first read. |
| **Final copy** | `Free icons work without an account or API key. Any coding agent that can launch a local stdio MCP server can use Supericons.` |

---

### Free setup - JSON intro sentence

| | Text |
|---|---|
| **Live** | `Use this JSON-style example when your client accepts an MCP config file or settings form with command, args, and optional env fields:` |
| **Bible** | *(Not specified)* |
| **Audit finding** | **Minor refinement.** "JSON-style" hedges unnecessarily. The block is valid JSON. |
| **Final copy** | `Use this JSON config block when your client accepts command, args, and optional env fields:` |

---

### Free setup - TOML adaptation note

| | Text |
|---|---|
| **Live** | `If your client uses TOML or another wrapper format, keep the same command and args values and adapt only the surrounding syntax to your client's settings format.` |
| **Audit finding** | **No change.** Accurate, clear, states what to copy and what to adapt. |
| **Final copy** | Same as live. |

---

### "Choose the right guide" cards

**Audit finding: Change needed on all 4 cards.** The "if you want" conditional pattern signals conditional value rather than describing page contents.

| Card | Live | Final copy |
|---|---|---|
| Claude Code | `Use the detailed Supericons guide if you want the exact CLI command, config scopes, and troubleshooting steps for Claude Code.` | `CLI command, config file scopes, and troubleshooting steps specific to Claude Code.` |
| Codex | `Use the Codex guide if you want the exact CLI command, TOML config shape, and trusted-project notes for Codex CLI and the IDE extension.` | `CLI command, TOML config shape, and trusted-project notes for Codex CLI and the IDE extension.` |
| Cursor | `Use the Cursor guide if you want the exact global and project config locations plus the in-app MCP verification steps.` | `Global and project config file locations, plus in-app verification steps for Cursor.` |
| Others | `Use this page if your client is OpenCode, Cline, Copilot agent, Windsurf, or another MCP-capable tool that does not yet have a dedicated Supericons guide.` | `Setup references for OpenCode, Cline, Copilot agent, and Windsurf, plus a fallback if your client is not listed.` |

---

### Footer fallback note

| | Text |
|---|---|
| **Live** | `If your client is not listed here, start from the same server values above and adapt them to the location and config format your client expects.` |
| **Audit finding** | **Minor refinement.** "Values above" is a spatial reference that breaks when scrolled. |
| **Final copy** | `If your client is not listed, use the command and args from the Free setup section and adapt them to whatever format your client expects.` |

---

---

## Page: Claude Code (`docs-claude-code`)

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `Claude Code is an agentic coding tool from Anthropic. It supports MCP servers through the CLI and config files. Use either method below to add Supericons.` |
| **Bible** | `Claude Code is an agentic coding tool from Anthropic. It supports MCP servers through the CLI and config files. Use either method below to add Supericons.` |
| **Audit finding** | **Change needed.** Sentence 1 describes Claude Code to a reader who already chose this page. Wastes the subtitle. |
| **Final copy** | `Two ways to add Supericons: a one-line CLI command, or a JSON config entry. Both support free and premium setup.` |

> **Divergence note:** Bible retains the product description intro. The audit supersedes it. The Bible intro paragraph body copy is preserved inside the page body (not as the subtitle).

---

### `verifiedNote` field

| | Status |
|---|---|
| **Live** | Field not present in `docs-pages.js` |
| **Bible** | `Verified against official documentation as of 10 April 2026.` |
| **Audit finding** | **Gap.** The `store.js` renderer supports this field. |
| **Final copy** | `Verified against official documentation as of 10 April 2026.` |

---

### Free setup - CLI option intro

| | Text |
|---|---|
| **Live** | `The fastest way to add Supericons. Run this command once:` |
| **Bible** | `The fastest way to add Supericons. Run this command once:` |
| **Audit finding** | **No change.** |
| **Final copy** | Same as live. |

---

### Free setup - Verify instruction

| | Text |
|---|---|
| **Live** | `After adding the server, type this command inside a Claude Code session:` |
| **Bible** | `After adding the server, type this command inside a Claude Code session:` |
| **Audit finding** | **Minor refinement.** "A Claude Code session" could mean any terminal session. |
| **Final copy** | `After adding the server, type this command inside an active Claude Code session:` |

---

### Troubleshooting card 3 - title

| | Text |
|---|---|
| **Live** | `Config file location confusion` |
| **Bible** | `Config file location confusion` |
| **Audit finding** | **Minor refinement.** Reads as a developer label, not the user's question. |
| **Final copy title** | `Which config file should I edit?` |
| **Final copy body** | `User scope: ~/.claude.json. Project scope: .mcp.json in your project root. The user scope file applies to all your Claude Code sessions. The project scope file applies only when you open that project.` |

---

### All other Claude Code elements: no change needed

| Element | Final copy (same as live and Bible) |
|---|---|
| Option 2 intro | `Claude Code stores MCP servers in a JSON config file. Choose the scope that fits your workflow:` |
| Scope list | User scope `~/.claude.json`, Project scope `.mcp.json` |
| Premium intro | `To unlock premium collections, Motion Lab tools, and Converter tools, add your API key to the server config. Use the config file method with the env field:` |
| Callout label | `Where to get your key` |
| Callout body | `Generate your API key at supericons.dev under API Keys. Your key must be linked to an account with an active Pro subscription or a purchased collection. Access is determined by your account, not the key itself.` |
| Problem 1 title | `Server does not appear after adding` |
| Problem 2 title | `Premium tools are not available` |

---

---

## Page: Codex (`docs-codex`)

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `Codex CLI and IDE extension support MCP servers through a TOML config file. Use the CLI command for a quick start, or edit the config file directly.` |
| **Bible** | `Codex CLI and IDE extension support MCP servers through a TOML config file. Use the CLI command for a quick start, or edit the config file directly.` |
| **Audit finding** | **Minor refinement.** Second sentence is redundant. "For a quick start" is a filler qualifier. |
| **Final copy** | `Add Supericons via CLI command or TOML config. Works in Codex CLI and the IDE extension.` |

---

### `verifiedNote` field

| | Status |
|---|---|
| **Live** | Field not present in `docs-pages.js` |
| **Bible** | `Verified against official OpenAI Codex documentation as of 10 April 2026.` |
| **Audit finding** | **Gap.** |
| **Final copy** | `Verified against official OpenAI Codex documentation as of 10 April 2026.` |

---

### Free setup - CLI option: missing intro line

| | Status |
|---|---|
| **Live** | Code block appears with no intro sentence |
| **Bible** | No intro sentence specified |
| **Audit finding** | **Gap.** Claude Code's CLI section starts with "The fastest way to add Supericons. Run this command once:" - Codex skips straight to code. |
| **Final copy** | Add before the CLI code block: `The quickest way to add Supericons. Run this once:` |

---

### Scope callout body

| | Text |
|---|---|
| **Live** | `Codex MCP support is available in the Codex CLI and IDE extension. The CLI and IDE extension share the same configuration file. The Codex web app and cloud task runner do not support local MCP server configuration.` |
| **Bible** | Same |
| **Audit finding** | **No change.** |

---

### Troubleshooting card 3 - "Project scope not working"

| | Text |
|---|---|
| **Live** | `Codex only reads project-scoped config from trusted projects. If the project has not been trusted, the user-scoped config (~/.codex/config.toml) applies instead.` |
| **Bible** | `Codex only reads project-scoped config from trusted projects. If the project has not been trusted, the user-scoped config (~/.codex/config.toml) applies instead.` |
| **Audit finding** | **Change needed.** Explains cause but omits the action the user needs to take. |
| **Final copy** | `Codex only reads project-scoped config from trusted projects. Run codex trust in the project directory to trust it, then restart Codex.` |

---

### All other Codex elements: no change needed

| Element | Final copy (same as live and Bible) |
|---|---|
| Scope bullet 1 | User scope `~/.codex/config.toml` |
| Scope bullet 2 | Project scope `.codex/config.toml` (trusted projects only) |
| Premium TOML block | `env = { SUPERICONS_API_KEY = "your-key-here" }` |
| Verify instruction | `In the Codex TUI, type: /mcp` |
| Callout body | `Generate your API key at supericons.dev under API Keys. Your key must be linked to an account with an active Pro subscription or a purchased collection.` |
| Problem 1 title | `Server does not appear after adding` |
| Problem 2 title | `Premium tools are not available` |

---

---

## Page: Cursor (`docs-cursor`)

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `Cursor supports MCP servers through a JSON config file. You can scope it globally or per-project.` |
| **Bible** | `Cursor supports MCP servers through a JSON config file. You can scope it globally or per-project.` |
| **Audit finding** | **Minor refinement.** Describes mechanism, not what this page accomplishes. |
| **Final copy** | `Add Supericons to Cursor via JSON config. Set it globally for all projects, or scoped to one project root.` |

---

### `verifiedNote` field

| | Status |
|---|---|
| **Live** | Field not present in `docs-pages.js` |
| **Bible** | `Verified against official Cursor documentation as of 10 April 2026.` |
| **Audit finding** | **Gap.** |
| **Final copy** | `Verified against official Cursor documentation as of 10 April 2026.` |

---

### Free setup - Missing "no CLI" context note

| | Status |
|---|---|
| **Live** | Free setup opens directly with the config block. No explanation that there is no CLI command. |
| **Bible** | No such note specified |
| **Audit finding** | **Gap.** Developers arriving from the Claude Code or Codex page will look for the CLI option. Without explanation, the absence reads as an omission. |
| **Final copy** | Add before the config block: `Cursor uses a JSON config file. There is no CLI add command.` |

---

### Free setup - Verify instruction

| | Text |
|---|---|
| **Live** | `Open Cursor settings and check the MCP servers list, or ask your agent to run a tool. A working server responds to: "Search for a settings icon."` |
| **Bible** | `Open Cursor settings and check the MCP servers list, or ask your agent to run a tool. A working server responds to: "Search for a settings icon."` |
| **Audit finding** | **Change needed.** (1) Missing restart instruction - without a restart the server does not appear. (2) "A working server responds to..." is an informal conversational test, not a verification step. |
| **Final copy** | `Save the config and restart Cursor. Open Settings, navigate to MCP, and confirm the supericons server appears in the list.` |

---

### Troubleshooting card 1 - title

| | Text |
|---|---|
| **Live** | `Server is not responding` |
| **Bible** | `Server is not responding` |
| **Audit finding** | **Minor refinement.** "Not responding" is ambiguous. Claude Code and Codex both use "Server does not appear after adding" which is specific to the symptom. |
| **Final copy title** | `Server does not appear after adding` |
| **Final copy body** | `Cursor requires a valid JSON config file. Check for syntax errors in the JSON. Save the file and restart Cursor.` |

---

### Troubleshooting card 3 - Missing (npx first-run)

| | Status |
|---|---|
| **Live** | 2 troubleshooting cards only |
| **Bible** | 2 troubleshooting cards only |
| **Audit finding** | **Gap.** Claude Code and Codex both have a 3rd card for the npx first-run delay. Cursor should match. |
| **Final copy** | Title: `npx takes a long time on first run` / Body: `The first run of npx -y supericons-mcp downloads the package from npm. This is a one-time delay. Subsequent starts are faster.` |

---

### All other Cursor elements: no change needed

| Element | Final copy (same as live and Bible) |
|---|---|
| Global config path | `~/.cursor/mcp.json` |
| Project config note | `For project-only access, add the same block to .cursor/mcp.json in your project root instead.` |
| Premium env field | `"SUPERICONS_API_KEY": "your-key-here"` |
| Callout body | `Generate your API key at supericons.dev under API Keys. Your key must be linked to an account with an active Pro subscription or a purchased collection.` |
| Problem 2 title | `Premium tools are not available` |
| Problem 2 body | `Confirm SUPERICONS_API_KEY is present in the env block. Confirm your account has Pro or a purchased collection.` |

---

---

## Page: Other MCP Clients (`docs-mcp-others`)

> Note: This page is not in the copy bible. All content is from live `docs-pages.js` and the audit.

### `summary` (page subtitle)

| | Text |
|---|---|
| **Live** | `Use Supericons with other MCP-capable coding agents by starting from the universal setup guide and following each client's official MCP instructions.` |
| **Bible** | *(Not in Bible)* |
| **Audit finding** | **Minor refinement.** Describes what to do rather than what the page contains. |
| **Final copy** | `Setup references and links for OpenCode, Cline, Copilot agent, Windsurf, and any other MCP-capable client.` |

---

### "If your client is not listed" callout

| | Text |
|---|---|
| **Live** | `If your coding agent supports local stdio MCP servers, use the same Supericons server values from the universal setup guide. The only thing you need to adapt is the config location and format your client expects.` |
| **Bible** | *(Not in Bible)* |
| **Audit finding** | **Minor refinement.** "The only thing" is inaccurate (two things: location and syntax) and condescending. |
| **Final copy** | `If your client supports local stdio MCP servers, use the server values from the universal setup guide and adapt the config location and syntax to your client's format.` |

---

### Known clients cards: no change needed

| Client | Card body (final) |
|---|---|
| OpenCode | `Official OpenCode MCP docs for server config and CLI flow.` |
| Cline | `Official Cline docs for the Servers UI and cline_mcp_settings.json config.` |
| Copilot agent | `Official GitHub docs for repository MCP config and Copilot environment secrets.` |
| Windsurf | `Official Windsurf docs for settings UI and mcp_config.json setup.` |

---

---

# Master implementation checklist

Use this checklist when editing `docs-pages.js`. Items are in execution order: Priority 1 (Change needed) first, Priority 2 (Gaps) second, Priority 3 (Minor refinements) last.

## Priority 1: Change needed (8 items)

- [ ] `docs` - `summary`: `Set up MCP, learn Motion Lab, and use Converter.`
- [ ] `docs-what-is-supericons` - `summary`: `20,000+ open-source icons, MCP integration, and Pro tools for animated icons and image conversion.`
- [ ] `docs-mcp-universal` - `summary`: `The base server config for any MCP-capable coding agent. Adapt to your client's settings format.`
- [ ] `docs-mcp-universal` - 4 routing cards: apply Final copy from section 2.5 table above
- [ ] `docs-claude-code` - `summary`: `Two ways to add Supericons: a one-line CLI command, or a JSON config entry. Both support free and premium setup.`
- [ ] `docs-codex` - troubleshooting card 3 body: add `Run codex trust` action step
- [ ] `docs-cursor` - verify instruction: `Save the config and restart Cursor. Open Settings, navigate to MCP, and confirm the supericons server appears in the list.`
- [ ] `docs-cursor` - troubleshooting card 1 title: `Server does not appear after adding`

## Priority 2: Gaps (5 items)

- [ ] `docs-claude-code` - add `verifiedNote`: `Verified against official documentation as of 10 April 2026.`
- [ ] `docs-codex` - add `verifiedNote`: `Verified against official OpenAI Codex documentation as of 10 April 2026.`
- [ ] `docs-cursor` - add `verifiedNote`: `Verified against official Cursor documentation as of 10 April 2026.`
- [ ] `docs-codex` - add CLI intro line before code block: `The quickest way to add Supericons. Run this once:`
- [ ] `docs-cursor` - add "no CLI" note before config block: `Cursor uses a JSON config file. There is no CLI add command.`
- [ ] `docs-cursor` - add 3rd troubleshooting card: Title `npx takes a long time on first run`, Body as specified above

## Priority 3: Minor refinements (12 items)

- [ ] `docs-quickstart` - "Add the server" card body: `Choose your client below, or open the universal setup guide for the base config values.`
- [ ] `docs-quickstart` - "Reload your session" card body: `Restart your coding agent session. In Claude Code and Codex, type /mcp to confirm Supericons appears in the list.`
- [ ] `docs-quickstart` - API keys callout heading: `Your key carries your account entitlement, not access`
- [ ] `docs-mcp-universal` - free setup intro: drop trailing "with the same server command and args" clause
- [ ] `docs-mcp-universal` - JSON intro: `Use this JSON config block when your client accepts command, args, and optional env fields:`
- [ ] `docs-mcp-universal` - footer fallback: `If your client is not listed, use the command and args from the Free setup section and adapt them to whatever format your client expects.`
- [ ] `docs-claude-code` - verify instruction: add "active" before "Claude Code session"
- [ ] `docs-claude-code` - troubleshooting card 3 title: `Which config file should I edit?`
- [ ] `docs-codex` - `summary`: `Add Supericons via CLI command or TOML config. Works in Codex CLI and the IDE extension.`
- [ ] `docs-cursor` - `summary`: `Add Supericons to Cursor via JSON config. Set it globally for all projects, or scoped to one project root.`
- [ ] `docs-mcp-others` - `summary`: `Setup references and links for OpenCode, Cline, Copilot agent, Windsurf, and any other MCP-capable client.`
- [ ] `docs-mcp-others` - callout: apply final copy from section above

## Priority 4: Body content (deferred, separate task)

- [ ] `docs-what-is-supericons` - replace `renderPlaceholderBody` with full content from the "Body content" section above

---

## Superseded files

Once this file is used as the implementation target, the following files are superseded and should not be updated independently:

- `docs/plans/overview-mcp-setup-copy-audit.md` - superseded by this document
- The Overview and MCP Setup sections of `docs/docs-copy-bible.md` - superseded by this document for these pages

The copy bible remains authoritative for all pages not covered by this document (Motion Lab, Converter, MCP Reference, Access, Troubleshooting).
