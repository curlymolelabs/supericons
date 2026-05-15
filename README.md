# Supericons

Semantic SVG icon search for AI coding agents.

Supericons helps agents find icons by meaning, not only by file name. Use it to search 20,000+ free icons, retrieve SVG code, and recommend icon sets for app navigation, dashboards, tools, and product UI.

## Current Package

Use the scoped npm package:

```text
@supericons/mcp
```

New installs should use the scoped package above.

## Quick Install

Use this config in any MCP-capable coding agent:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "@supericons/mcp"]
    }
  }
}
```

## Codex Plugin Setup

Supericons also includes a Codex plugin manifest.

If you are testing from this public GitHub repo, add this marketplace file to Codex:

```text
.agents/plugins/marketplace.json
```

Then restart Codex and install `Supericons` from the plugin list.

The Codex plugin uses:

```text
.codex-plugin/plugin.json
.codex-mcp.json
skills/supericons-icon-search/SKILL.md
```

## Codex Manual MCP Setup

If you only want MCP without the plugin wrapper, use these fields in Codex:

```text
Name: supericons
Transport: stdio
Command to launch: npx
Arguments:
-y
@supericons/mcp
```

## IDE Setup Fields

If your IDE shows a form instead of a JSON file, enter:

```text
Name: supericons
Transport: stdio
Command: npx
Arguments:
-y
@supericons/mcp
```

If your IDE has one argument field, enter:

```text
-y @supericons/mcp
```

Leave environment variables empty for free icon search.

## Pro Setup

For premium icons or Pro tools, add this environment variable:

```text
SUPERICONS_API_KEY=your_api_key_here
```

Do not paste API keys into public issues, screenshots, or shared config files.

## Hosted MCP Endpoint

MCP setup page:

```text
https://supericons.dev/mcp/
```

Hosted endpoint:

```text
https://mcp.supericons.dev/mcp
```

Server card:

```text
https://mcp.supericons.dev/.well-known/mcp/server-card.json
```

## Available Tools

`search_icons`
: Search free icon libraries by meaning, label, visual description, tags, and synonyms.

`recommend_icons`
: Recommend icons for UI slots such as dashboard navigation, app tabs, settings panels, or product features.

`get_icon`
: Retrieve one SVG icon by icon ID and library.

`list_libraries`
: List the free icon libraries available through Supericons MCP.

## Example Prompts

```text
Use Supericons MCP to find a database icon. Prefer Lucide outline icons and show the icon id, library, and SVG.
```

```text
Use Supericons MCP to recommend icons for an AI dashboard sidebar. The slots are model, prompt, dataset, evaluation, deployment, and monitoring. Prefer Lucide outline icons.
```

## Links

- Website: https://supericons.dev
- MCP setup page: https://supericons.dev/mcp/
- npm package: https://www.npmjs.com/package/@supericons/mcp
- Hosted MCP: https://mcp.supericons.dev/mcp

## Public Repo Scope

This repository is only a lightweight setup wrapper for agent directories and IDE users. It does not include the private Supericons website source, the full semantic registry, internal build workflows, private data, service keys, or premium icon assets.
