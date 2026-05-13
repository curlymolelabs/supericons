# Supericons Hosted MCP Deploy Notes

Status: first hosted remote MCP endpoint implemented locally.

## What This Adds

The local MCP package still works through `npx supericons-mcp`.

The hosted MCP server adds an HTTP endpoint for directories and agents that need a public URL, such as Smithery-style listings.

## Current Hosted Tools

- `search_icons`
- `recommend_icons`
- `get_icon`
- `list_libraries`

This first hosted version is for free public icon search and recommendation. Pro-only tools and per-user API key setup should be added in a later hosted-auth phase.

## Local Run Command

From the `mcp` folder:

```powershell
npm run start:remote
```

Default local URL:

```text
http://127.0.0.1:3333/mcp
```

Health check:

```text
http://127.0.0.1:3333/health
```

Server card:

```text
http://127.0.0.1:3333/.well-known/mcp/server-card.json
```

## Hosted Deploy Shape

Use a Node host that supports a long-running HTTP service, such as Railway.

Recommended settings:

- Root directory: `mcp`
- Start command: `npm run start:remote`
- Port: use the platform-provided `PORT` environment variable

Optional environment variable:

```text
SUPERICONS_REMOTE_MCP_BASE_URL=https://your-hosted-domain.example
```

Use this when the hosting platform needs the server card to advertise a fixed public URL.

## Smithery Form

For a hosted remote listing, use the hosted `/mcp` endpoint, not the npm package page.

Example:

```text
https://your-hosted-domain.example/mcp
```

If the directory supports server-card discovery, also provide:

```text
https://your-hosted-domain.example/.well-known/mcp/server-card.json
```

## Verification Run

Verified locally on 2026-05-04:

- `/health` returned `ok: true`
- `/.well-known/mcp/server-card.json` returned Streamable HTTP metadata
- MCP `initialize` returned server `supericons` version `0.4.0`
- MCP `tools/list` returned 4 tools
- MCP `search_icons` returned Lucide database results
- MCP `recommend_icons` returned the AI dashboard sidebar set:
  - model: `brain-circuit`
  - prompt: `text-cursor-input`
  - dataset: `table-columns-split`
  - evaluation: `chart-bar`
  - deployment: `upload-cloud`
  - monitoring: `line-chart`
