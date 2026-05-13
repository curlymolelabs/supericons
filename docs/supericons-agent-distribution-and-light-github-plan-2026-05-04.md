# Supericons Agent Distribution and Light GitHub Plan

Date: 2026-05-04

## Goal

Get Supericons MCP closer to users inside popular coding agents and MCP directories without open-sourcing the private Supericons website, registry source, Supabase setup, internal workflows, or protected product code.

The practical goal is:

- easy install in coding agents
- trusted public listing pages
- directory compatibility
- no secret leakage
- no full-code cloning path

## Recommendation

Do not ignore GitHub entirely.

Also do not publish the full Supericons repo.

The best strategy is a middle path:

```text
Private product repo + public lightweight distribution repo
```

The public repo should be a small install wrapper and documentation repo only. It should contain enough for MCP directories and agent plugin systems to trust and install Supericons, but not enough to recreate the full product.

## Why This Is Optimal

Many MCP directories and coding-agent ecosystems use GitHub because it gives them:

- a public page to review
- a place to inspect install instructions
- a version history
- issues/support
- license metadata
- a stable source link

But Supericons has assets and systems that should stay private:

- website source
- full registry source and workflows
- Supabase schema/admin workflows beyond public docs
- private scripts
- internal audit notes
- protected pack logic
- business strategy files
- secrets or deployment configs

The public repo solves directory trust without exposing the product.

## Public Repo Name

Recommended:

```text
supericons-agent-plugin
```

Alternative:

```text
supericons-mcp-install
```

I recommend `supericons-agent-plugin` because it can cover MCP plus future plugin packaging.

## What The Public Repo Should Contain

```text
supericons-agent-plugin/
├── .plugin/
│   └── plugin.json
├── .mcp.json
├── assets/
│   └── supericons-mark.svg
├── examples/
│   ├── codex-config.toml
│   ├── claude-code.mcp.json
│   ├── cursor-mcp.json
│   └── generic-mcp.json
├── README.md
├── SECURITY.md
├── SUPPORT.md
├── CHANGELOG.md
└── LICENSE
```

Optional later:

```text
skills/
└── icon-search-guide/
    └── SKILL.md
```

Only add a skill if it is genuinely useful. Do not add extra files just for appearance.

## What The Public Repo Must Not Contain

Do not include:

- private website source
- `public/registry/records.json`
- `mcp/public/registry-records.json`
- Supabase service role keys
- `.env.local`
- internal docs or audits
- private registry workflows
- generated full icon payload databases
- premium pack internals
- protected converter internals if not already public
- old worktree or archive files
- agent-generated scratch files

## Public Repo Purpose

The repo should make these install paths clear:

### 1. Local stdio MCP

For IDEs and coding agents that run local MCP servers:

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

### 2. Hosted remote MCP

For directories and hosted clients:

```text
https://mcp.supericons.dev/mcp
```

### 3. Premium / Pro local MCP

For users with an API key:

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

### 4. Open Plugins wrapper

For plugin-aware agents:

`.plugin/plugin.json`

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

`.mcp.json`

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

## Platform Strategy

### Smithery

Status:

```text
Live
```

Use:

```text
https://mcp.supericons.dev/mcp
```

Next:

- improve hosted MCP tool definitions
- rescan after redeploy

### Glama

Status:

```text
Live / submitted through Connector
```

Next:

- improve `get_icon` and `recommend_icons` metadata
- rescan after redeploy
- later add public repo link if Glama supports adding it after approval

### MCP.so

Status:

```text
Submitted
```

Next:

- monitor approval
- update listing if it allows hosted endpoint plus npm package

### Official MCP Registry

Recommendation:

Submit next.

Use:

- hosted endpoint
- homepage
- npm package
- domain ownership

Do not wait for a public GitHub repo unless the official publisher flow requires it.

### MCP.Directory

Recommendation:

Submit after or alongside official MCP Registry.

Use:

- hosted endpoint
- homepage
- npm package
- short description
- tags

### mcpservers.org / Awesome MCP Servers Route

Recommendation:

Submit after official MCP Registry.

If a GitHub repo is required, use the lightweight public repo, not the private product repo.

### Cursor

There are two paths:

1. Cursor Directory / Cursor plugins
2. Cursor user install docs

Use the public lightweight repo for directory submission if GitHub is required.

Also publish clear docs for manual IDE setup:

- Name: `supericons`
- Transport: `stdio`
- Command: `npx`
- Arguments:
  - `-y`
  - `supericons-mcp`

### Claude Code

Claude Code supports MCP through CLI and config files.

Focus on:

- README instructions
- docs page
- `.mcp.json`
- examples for local and project-level setup

Do not pursue official Anthropic connector listing until we know the hosted connector requirements are fully met.

### Codex

Codex supports MCP configuration, but no public third-party Codex MCP marketplace was confirmed in the current audit.

Focus on:

- clear Codex setup instructions
- official MCP Registry
- Open Plugins-compatible repo
- docs examples

### OpenCode / OpenClaw / Similar Agent Builders

Use the generic install surfaces:

- `.mcp.json`
- Open Plugins-compatible manifest
- hosted endpoint
- npm package

If they have a listing marketplace, submit the lightweight public repo.

### Vercel

Treat Vercel as possible hosting or developer audience, not a confirmed third-party MCP listing channel.

Do not prioritize unless a clear submission route appears.

## Messaging

Directory tagline:

```text
Semantic SVG icon search for AI coding agents.
```

Short description:

```text
Supericons lets AI coding agents search, recommend, and retrieve SVG icons from a semantic registry of 20,000+ free icons.
```

Long description:

```text
Supericons MCP gives coding agents a practical icon search workflow. Agents can search by meaning, retrieve exact SVGs, list supported libraries, and recommend coherent icon sets for app navigation, dashboards, tools, and product UI.
```

Tags:

```text
icons, svg, mcp, semantic-search, ai-coding-agents, cursor, claude-code, codex, opencode, design-tools, frontend, ui
```

## Security Positioning

Say this clearly:

```text
Free Supericons MCP search is read-only. It searches public icon metadata and returns SVG code. It does not read local files, write files, run shell commands, access private repositories, or require secrets.
```

For Pro:

```text
Pro features use the user's own Supericons API key through the SUPERICONS_API_KEY environment variable.
```

## Implementation Plan

### Phase 1: Improve Hosted MCP Quality

- [ ] Patch `mcp/remote-server.js` to use `registerTool(...)`.
- [ ] Add output schemas.
- [ ] Add read-only annotations.
- [ ] Improve tool descriptions.
- [ ] Improve parameter descriptions.
- [ ] Return `structuredContent` plus text content.
- [ ] Verify locally.
- [ ] Redeploy Railway hosted MCP.
- [ ] Rescan Glama and Smithery.

### Phase 2: Prepare Public Lightweight Repo

- [ ] Create repo skeleton locally outside the private product repo.
- [ ] Add `.plugin/plugin.json`.
- [ ] Add `.mcp.json`.
- [ ] Add README with local, hosted, and Pro setup.
- [ ] Add examples for Codex, Claude Code, Cursor, and generic MCP.
- [ ] Add SECURITY.md.
- [ ] Add SUPPORT.md.
- [ ] Add LICENSE.
- [ ] Add small logo asset.
- [ ] Run a secret scan before publishing.
- [ ] Publish to GitHub under Curly Mole Labs.

### Phase 3: Directory Submissions

- [ ] Official MCP Registry
- [ ] MCP.Directory
- [ ] mcpservers.org
- [ ] PulseMCP
- [ ] Cursor Directory
- [ ] cursor.store
- [ ] Open Plugins / plugin-aware directories
- [ ] Community awesome MCP lists

### Phase 4: Agent-Specific Content

- [ ] Codex setup guide
- [ ] Claude Code setup guide
- [ ] Cursor IDE field guide
- [ ] OpenCode / OpenClaw generic MCP guide
- [ ] 60-second video showing IDE setup
- [ ] 60-second video showing agent icon recommendation

## Decision

Use GitHub, but only as a distribution wrapper.

Do not publish the full Supericons product repository.

This gives Supericons access to GitHub-dependent MCP directories and agent plugin ecosystems while keeping the core product protected.

## Sources Checked

- https://cursor.directory/plugins/new
- https://open-plugins.com/
- https://open-plugins.com/agent-builders/components/mcp-servers
- https://open-plugins.com/plugin-builders/specification
- https://modelcontextprotocol.io/docs/getting-started/intro
- https://modelcontextprotocol.io/docs/develop/build-server
