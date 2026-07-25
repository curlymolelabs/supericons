# Supericons v2.0

Semantic SVG icon search, previews, and recommendations for AI coding agents.

Supericons helps agents find icons by meaning, not only by file name. It searches 20,000+ free icons across 11 libraries and can return SVG code or a visual comparison.

## Release versions

Supericons uses separate versions for the product plugin and its MCP runtime:

| Component | Current release |
| --- | --- |
| Supericons plugin | `2.0.0` |
| npm MCP runtime | `@supericons/mcp@0.4.22` |
| Hosted MCP runtime | `0.4.22` |

The v2.0 plugin uses the current MCP runtime. There is no npm package named `@supericons/mcp@2.0.0`.

## Quick start

For clients that support remote MCP servers, use the hosted endpoint:

```text
https://mcp.supericons.dev/mcp
```

For clients that use local MCP commands, use:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "@supericons/mcp@latest"]
    }
  }
}
```

The free tools do not need a Supericons API key.

## Plugin files

This repository includes public plugin manifests for Codex, Claude Code, and compatible agent directories:

```text
.plugin/plugin.json
.codex-plugin/plugin.json
.claude-plugin/plugin.json
.agents/plugins/marketplace.json
```

The Codex plugin also uses:

```text
.codex-mcp.json
skills/supericons-icon-search/SKILL.md
```

## Manual setup fields

If your client shows a form instead of a config file, enter:

```text
Name: supericons
Transport: stdio
Command: npx
Arguments:
-y
@supericons/mcp@latest
```

If it has one argument field, enter:

```text
-y @supericons/mcp@latest
```

## Hosted tools

`search_icons`
: Search by meaning, label, visual description, tags, synonyms, and supported multilingual terms.

`recommend_icons`
: Recommend a consistent icon set for up to 20 named UI slots.

`get_icon`
: Retrieve one exact SVG icon when its icon ID and library are known.

`preview_icons`
: Compare search results or known icon references on a hosted preview page or image.

`list_libraries`
: List the 11 free icon libraries available through the hosted server.

## Example prompts

```text
Use Supericons to find a Lucide database icon. Show the icon id, library, and SVG.
```

```text
Use Supericons to recommend icons for an AI dashboard sidebar: model, prompt, dataset, evaluation, deployment, and monitoring. Prefer Lucide outline icons.
```

```text
Use Supericons to preview the strongest camera scan icons so I can compare them visually.
```

## Pro setup

For Pro access, add the API key as an environment variable:

```text
SUPERICONS_API_KEY=<YOUR_SUPERICONS_API_KEY>
```

Never paste an API key into a public issue, screenshot, committed config file, or shared chat.

## Links

- Website: https://supericons.dev
- MCP setup: https://supericons.dev/mcp/
- npm package: https://www.npmjs.com/package/@supericons/mcp
- Hosted MCP: https://mcp.supericons.dev/mcp
- Server card: https://mcp.supericons.dev/.well-known/mcp/server-card.json

## Public repository scope

This repository is the public setup and directory wrapper for Supericons. It contains public manifests, install examples, support information, and brand assets. Private product code, credentials, customer data, and internal operating data are not part of this repository.
