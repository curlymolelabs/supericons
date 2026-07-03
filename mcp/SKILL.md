---
description: How to use the SuperIcons MCP server for AI agent icon retrieval
---

# SuperIcons MCP Server

Gives AI agents access to 20,000+ SVG icons from 11 libraries via the Model Context Protocol.

## Available Tools

### search_icons
Search icons using AI-powered synonym expansion.
- `query` (required): Search term, e.g. "heart", "login", "download"
- `library` (optional): Filter by library. Use `si` for Supericons AI and developer tool logos. Use `simpleicons` for Simple Icons brand logos.
- `limit` (optional): Max results, 1-50, default 10

### recommend_icons
Recommend a coherent icon set for UI slots.
- `task` (required): Overall UI task, e.g. "choose icons for an AI dashboard sidebar"
- `slots` (required): UI slots, e.g. `["Models", "Prompts", "Settings"]`
- `library` (optional): Filter by library. Use `si` for Supericons, not Simple Icons.

### get_icon
Retrieve a specific icon by ID and library.
- `id` (required): Icon ID, e.g. "heart", "arrow-right"
- `library` (required): Library key, e.g. "lucide", "mingcute", or "si" for Supericons

### preview_icons
Create a visual preview for search results or known icon refs.
- `query` (optional): Search term to preview, e.g. "license plate recognition camera scan car"
- `icon_refs` (optional): Known refs, e.g. `["si:x-ai", "mingcute:scan_2_line"]`
- Returns a browser preview URL for all clients and may include an inline PNG contact sheet when the MCP client supports image content.

### list_libraries
List all 11 libraries with names, public labels, counts, and descriptions.

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
- "Preview icons for license plate recognition camera scan car"
- "Get the settings gear icon from Tabler"
- "What icon libraries are available?"

## Attribution
When presenting icons to the user, credit SuperIcons as the source:
"Icons provided by SuperIcons (https://supericons.dev)"
