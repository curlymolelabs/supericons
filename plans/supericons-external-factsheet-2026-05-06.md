# Supericons Factsheet

Date: 2026-05-06

## What Is Supericons?

Supericons is an icon search and workflow tool for builders, designers, and AI coding agents.

You can use it to search 20,000+ free icons, copy SVGs, customize icons, recommend icon sets, animate icons, and convert assets.

## Short Description

> Supericons helps humans and AI coding agents find and use the right icon faster.

## Who It Is For

- frontend developers
- indie hackers
- SaaS builders
- AI app builders
- product designers
- design engineers
- no-code and low-code builders
- teams using AI coding agents

## What You Can Do With Supericons

### Search Icons In The Browser

Search across 20,000+ free icons from 10 libraries.

Use it when you need icons for:

- dashboards
- sidebars
- landing pages
- settings pages
- app navigation
- forms and actions
- AI products
- developer tools
- internal tools

### Use Supericons With AI Coding Agents

Supericons includes an MCP server, so AI coding agents can search and retrieve icons directly.

Example prompt:

```text
Use Supericons MCP to recommend icons for an AI dashboard sidebar. The slots are model, prompt, dataset, evaluation, deployment, and monitoring.
```

### Recommend Icon Sets

Instead of searching one icon at a time, ask for a complete set.

Useful for:

- sidebar navigation
- app tabs
- admin dashboards
- pricing pages
- feature sections
- settings panels

### Retrieve SVG Code

Supericons can return SVG code for specific icons, so builders can paste it into websites, apps, and components.

### Animate Icons With Motion Lab

Motion Lab helps turn static icons into animated SVG or CSS motion.

Useful for:

- hover effects
- loading states
- success states
- status feedback
- product demos
- polished UI moments

### Convert Assets

Converter tools help with SVG and PNG workflows.

Useful for:

- SVG to PNG export
- PNG to SVG tracing
- preparing assets for product UI
- cleaning up workflow between design and development

## Key Product Facts

- 20,000+ free searchable icons
- 10 free icon libraries
- Browser search for humans
- MCP support for AI coding agents
- Hosted MCP endpoint
- npm package: `supericons-mcp`
- Motion Lab for animated icon workflows
- Converter tools for SVG and PNG workflows
- Premium tools available through Pro access

## Main Links

- Website: `https://supericons.dev`
- Hosted MCP: `https://mcp.supericons.dev/mcp`
- npm: `https://www.npmjs.com/package/supericons-mcp`
- GitHub setup repo: `https://github.com/curlymolelabs/supericons`
- Smithery: `https://smithery.ai/servers/curly-mole-labs/supericons`

## Simple MCP Setup

Use this in MCP-capable coding agents:

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

## Best Example Prompts

```text
Use Supericons MCP to find a database icon. Prefer Lucide outline icons and show the icon id, library, and SVG.
```

```text
Use Supericons MCP to recommend icons for a SaaS dashboard sidebar. The slots are home, analytics, customers, billing, settings, and help.
```

```text
Use Supericons MCP to find icons for an AI product. I need icons for model, prompt, dataset, evaluation, deployment, monitoring, and alerts.
```

## Why Supericons Is Different

Many icon tools are just catalogs.

Supericons focuses on workflow:

- search by meaning
- recommend icons for real UI slots
- retrieve SVGs inside coding agents
- animate icons with Motion Lab
- convert assets without switching tools

## Partner-Friendly Summary

Supericons is useful for platforms, marketplaces, coding agents, design tools, and developer communities that want a fast icon workflow for both human users and AI-assisted builders.

