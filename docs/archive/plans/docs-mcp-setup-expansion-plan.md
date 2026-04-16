# MCP Setup Expansion Plan

## Goal

Make the MCP Setup section reflect the real Supericons support model.

Supericons does not only work with Claude Code, Codex, and Cursor. The docs should make that clear immediately. This pass adds a universal setup guide, restores support for other MCP-capable clients, and keeps the three detailed first-party guides as the strongest documented paths.

## What This Pass Will Add

### 1. A new `Universal setup` page under `MCP Setup`

This page will explain the shared Supericons MCP setup pattern:

- free setup with no account or API key
- the base `command` and `args`
- a standard JSON-style example
- premium setup with `SUPERICONS_API_KEY`
- guidance on adapting the same server values to different MCP clients

This becomes the baseline guide for any MCP-capable coding agent.

### 2. A new `Others` page under `MCP Setup`

This page will cover the supported external clients that do not yet have full Supericons-authored setup pages:

- OpenCode
- Cline
- Copilot agent
- Windsurf

It will link to each client’s official setup docs and explain how to use the universal setup guide alongside them.

## What This Pass Will Update

### 3. Expand the `MCP Setup` sidebar group

The group will become:

- Universal setup
- Claude Code
- Codex
- Cursor
- Others

This makes the support story visible in the sidebar instead of implying the section ends at three clients.

### 4. Update the docs-home MCP entry point

The `Set up MCP` card on the docs introduction page will:

- route to `Universal setup`
- mention Claude Code, Codex, Cursor, and other coding agents

This gives users a true starting point before they branch into a specific client.

### 5. Update Quickstart to point beyond the top three

Quickstart will link to:

- Universal setup
- Claude Code
- Codex
- Cursor
- Others

This ensures the first setup flow works whether the user is on one of the main clients or something else that supports local stdio MCP servers.

## Content Direction

### Universal setup

Keep it practical and broad:

- explain that free icons work without an account or API key
- explain that any MCP client that can launch a local stdio server can use Supericons
- show one clean base config example
- show one premium config example
- tell readers when to choose a client-specific guide instead

### Others

Keep it curated and useful:

- start with the universal setup guide
- explain that the server values stay the same while the settings surface changes by client
- list the known external clients with short descriptions and official links
- include a fallback note for any MCP-capable client not yet listed

## What This Pass Will Not Change

To keep the work narrow and safe, this pass will not:

- rewrite the three detailed first-party guides
- rewrite the unfinished MCP reference pages
- change the docs shell layout
- introduce new dependencies

## Success Standard

This pass is complete when:

- the sidebar clearly shows that MCP setup is broader than three clients
- there is a Supericons-owned universal setup page
- there is an `Others` page with curated external client links
- the docs-home MCP card starts at the right entry point
- Quickstart supports both the main three and other coding agents
- the docs shell, routing, pager, and build still work correctly
