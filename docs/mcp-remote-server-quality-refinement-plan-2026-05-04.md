# Supericons Hosted MCP Quality Refinement Plan

Date: 2026-05-04

## Goal

Improve the hosted Supericons MCP tool quality scores on Glama and similar MCP directories without changing the search engine behavior, exposing private code, or adding fake capabilities.

The hosted MCP endpoint should remain simple:

- `https://mcp.supericons.dev/mcp`
- Four public read-only tools
- No user key required for free search
- No private registry data exposed

## Current Audit Findings

The hosted MCP server is defined in:

```text
mcp/remote-server.js
```

Current tools:

- `search_icons`
- `recommend_icons`
- `get_icon`
- `list_libraries`

Current implementation pattern:

- Uses `server.tool(...)`
- Returns JSON as text content
- Defines input schemas with Zod
- Does not define output schemas
- Does not define tool annotations

Local SDK audit:

- The installed `@modelcontextprotocol/sdk` version supports `registerTool(...)`.
- The older `server.tool(...)` helper is marked deprecated in the installed SDK type definitions.
- `registerTool(...)` supports `description`, `inputSchema`, `outputSchema`, and `annotations`.

Glama score pattern:

- Overall connector score is good.
- `search_icons` and `list_libraries` score well.
- `get_icon` is the weakest tool because the description is too thin for exact retrieval.
- `recommend_icons` can improve with clearer parameter guidance and output shape.

## Best-Practice Basis

The official MCP tool definition includes:

- `name`
- optional `title`
- `description`
- `inputSchema`
- optional `outputSchema`
- optional `annotations`

The official MCP spec also says that when a tool returns structured content and has an output schema, the server must return structured results that match that schema. For backward compatibility, structured tool results should also include serialized JSON in a text content block.

The official schema reference says tool errors should usually be returned inside the tool result with `isError: true`, so the agent can see the error and recover.

Tool annotations are hints, not hard security guarantees. They are still useful for clients and directories. For Supericons hosted search, all four tools are read-only and non-destructive.

Sources:

- https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- https://modelcontextprotocol.io/specification/2025-06-18/schema
- https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/
- https://modelcontextprotocol.io/docs/getting-started/intro
- https://modelcontextprotocol.io/docs/develop/build-server
- https://open-plugins.com/
- https://open-plugins.com/agent-builders/components/mcp-servers
- https://open-plugins.com/plugin-builders/specification

## Additional Ecosystem Findings

### Cursor Directory

The Cursor Directory plugin submission page is login-gated:

```text
https://cursor.directory/plugins/new
```

The public shell shows separate areas for Plugins, MCP Servers, and Rules. This means Supericons should not rely on only one listing format. We should prepare:

- a direct MCP server listing for the hosted endpoint
- a plugin-style package for users who want one-click or directory-based installation
- a plain IDE field guide for users who manually fill in MCP settings

### Open Plugins

Open Plugins defines a cross-agent plugin package format. A plugin can bundle:

- skills
- agents
- hooks
- rules
- MCP servers
- LSP servers

For Supericons, the important part is MCP server bundling through `.mcp.json`.

Open Plugins MCP server config supports:

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

It also supports:

- `command`
- `args`
- `env`
- `cwd`
- `${PLUGIN_ROOT}` expansion

The Open Plugins spec says plugins are directories with a manifest at `.plugin/plugin.json` and optional component files such as `.mcp.json`. It also says plugin support spans Cursor, Claude Code, Codex, and GitHub Copilot for MCP server components.

### What This Changes

This does not change the immediate `remote-server.js` quality patch. The hosted MCP should still be refined first.

It does add a second, parallel distribution opportunity:

```text
Supericons Open Plugin
```

That plugin can be public without exposing the private Supericons website or full registry source. It can contain only:

- `.plugin/plugin.json`
- `.mcp.json`
- `README.md`
- small logo asset
- optional setup guide
- links to npm, hosted MCP, and docs

This would make Supericons easier to install in plugin-aware coding agents while keeping the main product code private.

## Distribution Recommendation Update

After the hosted MCP metadata patch, create a small public distribution repo:

```text
supericons-agent-plugin
```

Recommended contents:

```text
supericons-agent-plugin/
├── .plugin/
│   └── plugin.json
├── .mcp.json
├── assets/
│   └── supericons-mark.svg
├── README.md
└── LICENSE
```

Recommended `.plugin/plugin.json`:

```json
{
  "name": "supericons",
  "version": "0.4.0",
  "description": "Search and retrieve SVG icons through Supericons MCP.",
  "author": {
    "name": "Curly Mole Labs",
    "url": "https://supericons.dev"
  },
  "homepage": "https://supericons.dev",
  "repository": "https://github.com/curlymolelabs/supericons-agent-plugin",
  "license": "MIT",
  "logo": "assets/supericons-mark.svg",
  "keywords": [
    "icons",
    "svg",
    "mcp",
    "semantic-search",
    "ai-coding-agents",
    "cursor",
    "claude-code",
    "codex"
  ]
}
```

Recommended `.mcp.json`:

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

Optional Pro `.mcp.json` example for README only:

```json
{
  "mcpServers": {
    "supericons": {
      "command": "npx",
      "args": ["-y", "supericons-mcp"],
      "env": {
        "SUPERICONS_API_KEY": "<YOUR_SUPERICONS_API_KEY>"
      }
    }
  }
}
```

Public-safe rule:

Do not include the website source, internal workflow files, Supabase keys, registry source files, full SVG payload database, private audit notes, or generated internal data.

## Updated Priority

1. Refine `mcp/remote-server.js` metadata and output schemas.
2. Redeploy the hosted MCP.
3. Rescan Glama and Smithery.
4. Submit the hosted endpoint to official MCP Registry, MCP.Directory, and mcpservers.org.
5. Create the small public Open Plugins-compatible repo.
6. Submit the plugin repo to Cursor Directory / Open Plugins-style channels if they require a public repo.

## Recommended Design

### 1. Replace `server.tool(...)` With `server.registerTool(...)`

Use `registerTool(...)` for all four hosted tools.

Reason:

- It is the current SDK path.
- It makes tool contracts explicit.
- It supports output schemas and annotations cleanly.

### 2. Keep Tool Count at Four

Do not add fake tools, fake prompts, or fake resources just to improve a directory score.

The four current tools are enough for the hosted public MCP:

- Search by meaning
- Recommend icons for UI slots
- Retrieve exact icon
- List supported libraries

### 3. Add Tool Annotations

Apply accurate annotations to each tool:

```js
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
}
```

Reasoning:

- `readOnlyHint: true`: tools do not modify data.
- `destructiveHint: false`: no destructive action.
- `idempotentHint: true`: same input should not change server state.
- `openWorldHint: true`: hosted tools call a hosted search backend and return external SVG/content data, so it is safer to mark as open-world.

Do not use annotations as a security claim. They are client-facing hints only.

### 4. Add Output Schemas

Add output schemas for every tool.

Recommended result shapes:

#### `search_icons`

```json
{
  "results": [
    {
      "id": "database",
      "name": "database",
      "library": "lucide",
      "type": "svg",
      "style": "outline",
      "svg": "<svg ...>",
      "semantic": {}
    }
  ]
}
```

#### `recommend_icons`

```json
{
  "task": "choose icons for an AI dashboard sidebar",
  "library": "lucide",
  "style": "outline",
  "slot_count": 6,
  "results": []
}
```

#### `get_icon`

Success:

```json
{
  "icon": {
    "id": "database",
    "name": "database",
    "library": "lucide",
    "type": "svg",
    "style": "outline",
    "svg": "<svg ...>",
    "semantic": {}
  }
}
```

Error:

```json
{
  "error": "No matching icon found for lucide:database."
}
```

#### `list_libraries`

```json
{
  "libraries": [
    {
      "id": "lucide",
      "name": "Lucide",
      "description": "Consistent open-source outline icons"
    }
  ],
  "publicRecordCount": 15103
}
```

### 5. Return Both `structuredContent` and Text

Create a helper like:

```js
function asStructured(payload, isError = false) {
  return {
    structuredContent: payload,
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
    ...(isError ? { isError: true } : {}),
  };
}
```

Reason:

- MCP clients can parse structured JSON.
- Older or simpler clients still receive readable text.

### 6. Improve Tool Descriptions

Descriptions should answer:

- What the tool does
- When to use it
- What it returns
- When not to use it

Recommended copy:

#### `search_icons`

Search public Supericons SVG icons by meaning, label, visual description, tags, and synonyms. Use this when the user describes an icon concept such as "database", "user profile", "chill", "security", or "AI model". Returns matching icons with SVG code and public semantic guidance.

#### `recommend_icons`

Recommend a coherent icon set for named UI slots in a product, app, dashboard, or navigation flow. Use this when the user needs several icons that should work together. Returns one recommendation and optional alternatives for each slot.

#### `get_icon`

Retrieve one exact SVG icon when the icon ID and library are already known. Use `search_icons` first if the user only described a concept. Returns SVG code and public semantic guidance for the exact icon.

#### `list_libraries`

List the free icon libraries available through the hosted Supericons MCP server. Use this before filtering by library or when a user asks which libraries are supported.

### 7. Improve Parameter Descriptions

Make parameter descriptions more direct.

Examples:

- `query`: "Icon concept or search phrase, for example database, user profile, chill, trash, upload cloud, AI model, or beautiful."
- `library`: "Optional library key. Supported values include lucide, tabler, phosphor, heroicons, bootstrap, iconoir, ionicons, material, simpleicons, and mingcute."
- `limit`: "Maximum number of icons to return. Use 5-10 for browsing and 1-3 for quick agent choices."
- `id`: "Exact icon ID without the library prefix, for example database, user-circle, brain-circuit, or arrow-down."

### 8. Tighten Error Handling

For expected failures, return tool-level errors:

- no icon found
- unavailable hosted search
- invalid unsupported library if validation is added later

Do not throw protocol-level errors for normal "not found" cases.

### 9. Keep Hosted and Local MCP Separate

Only patch `mcp/remote-server.js` for this refinement.

Do not change:

- `mcp/index.js`
- Pro tools
- Motion Lab tools
- converter tools
- npm package public surface unless needed for deployment packaging

This keeps the hosted free MCP stable and avoids breaking local premium workflows.

## Implementation Steps

1. Add shared Zod output schemas near the top of `mcp/remote-server.js`.
2. Add a shared `readOnlySearchAnnotations` object.
3. Replace `asText(...)` with `asStructured(...)`, or keep `asText(...)` and add a new helper.
4. Convert each `server.tool(...)` registration to `server.registerTool(...)`.
5. Add `title`, richer `description`, `inputSchema`, `outputSchema`, and `annotations`.
6. Update handlers to return `structuredContent` plus JSON text.
7. For `get_icon`, wrap success as `{ icon: ... }` and expected not-found as `{ error: ... }` with `isError: true`.
8. Run local checks:

```powershell
node --check mcp\remote-server.js
npm --prefix mcp run verify:package
```

9. Run a local hosted MCP smoke test:

```powershell
npm --prefix mcp run start:remote
```

Then call:

- `GET /health`
- `GET /.well-known/mcp/server-card.json`
- MCP initialize
- `tools/list`
- `search_icons`
- `recommend_icons`
- `get_icon`
- `list_libraries`

10. Deploy the hosted MCP to Railway using the same controlled deploy bundle process.
11. Verify production:

```text
https://mcp.supericons.dev/health
https://mcp.supericons.dev/.well-known/mcp/server-card.json
https://mcp.supericons.dev/mcp
```

12. Ask Glama and Smithery to rescan.

## Expected Impact

Likely improvements:

- `get_icon`: B to A range
- `recommend_icons`: stronger A
- overall Glama tool definition quality: likely higher than current 4/5
- Smithery score may improve from output schemas and annotations

Not guaranteed:

- Directory scoring algorithms are not public contracts.
- Scores may change independently of our implementation quality.

## Recommendation

Proceed with this patch.

It is low-risk because it changes metadata and response wrapping for the hosted MCP only. It does not rewrite the registry, search ranking, public website, npm local MCP, Pro tools, or converter.
