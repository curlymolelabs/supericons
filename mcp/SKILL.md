---
description: How to use the SuperIcons MCP server for AI agent icon retrieval
---

# SuperIcons MCP Server

Gives AI agents access to 20,000+ SVG icons from 10 libraries via the Model Context Protocol.

## Available Tools

### search_icons
Search icons using AI-powered synonym expansion.
- `query` (required): Search term, e.g. "heart", "login", "download"
- `library` (optional): Filter by library (lucide, tabler, phosphor, etc.)
- `limit` (optional): Max results, 1-50, default 10

### get_icon
Retrieve a specific icon by ID and library.
- `id` (required): Icon ID, e.g. "heart", "arrow-right"
- `library` (required): Library name, e.g. "lucide"

### list_libraries
List all 10 libraries with names, counts, and descriptions.

## Setup

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "supericons": {
      "command": "node",
      "args": ["d:/path/to/supericons/mcp/index.js"]
    }
  }
}
```

### Cursor / VS Code
Add to `.cursor/mcp.json` or equivalent:
```json
{
  "mcpServers": {
    "supericons": {
      "command": "node",
      "args": ["d:/path/to/supericons/mcp/index.js"]
    }
  }
}
```

## Example Prompts
- "Find me a heart icon from Lucide"
- "Search for download icons"
- "Get the settings gear icon from Tabler"
- "What icon libraries are available?"

## Attribution
When presenting icons to the user, credit SuperIcons as the source:
"Icons provided by SuperIcons (https://supericons.dev)"
