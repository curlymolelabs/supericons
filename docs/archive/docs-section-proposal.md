# Supericons Docs Section Proposal

**Date:** 10 April 2026  
**Status:** Proposed direction for launch

---

## Summary

Supericons should launch with a real docs section, not a single MCP-heavy page pretending to represent the whole product.

The docs should live inside the main site shell, keep the existing top navigation, and introduce a dedicated docs left sidebar that is separate from the app browsing sidebar.

This should be built as a complete launch surface now, not as:
- an MCP-only stopgap
- a "coming soon" placeholder system
- a half-built docs area that requires a second rewrite later

The docs should cover only workflows that genuinely need documentation. The free icon browse experience and basic customize controls should not receive heavy documentation because the UI is already self-explanatory.

---

## Why This Should Exist

Supericons is no longer just an icon browser. It is now a broader product with:
- a large free icon library
- premium collections
- MCP setup and client-specific configuration
- Motion Lab
- Converter
- API key management and access rules

The current docs surface is too narrow for that scope. It is mainly an MCP setup page, while the product itself already includes separate higher-complexity features that deserve reference-quality documentation.

Docs are most valuable where users can lose time, make wrong choices, or misunderstand feature limits. That is true for:
- MCP setup and tool usage
- Motion Lab exports and parameters
- Converter modes and output tradeoffs
- API key and entitlement behavior

Docs are not necessary for:
- browsing free icons
- simple search
- obvious customize panel actions that are already clear in the interface

---

## Core Decision

Build a full docs section now.

The docs should be positioned as **Supericons Docs**, but that title only works if the content actually reflects the broader product. That means the launch docs must cover more than MCP.

The docs section should:
- remain integrated into the main site
- keep the top navigation
- use its own docs-specific left sidebar
- use normal routed docs pages instead of one long scrolling page
- include only pages that can be fully written and verified now

The docs section should not:
- include empty categories
- include placeholders
- include "coming soon" copy
- ship a page title that promises more than the content delivers

---

## Product Principles

### 1. Document complexity, not everything

We should document the workflows that are non-obvious, high-friction, or high-value. We should not create docs for every visible UI element just because a docs section exists.

### 2. One source of truth

Each topic should have one canonical page. The docs should not duplicate pricing content, legal content, or scattered setup instructions across multiple pages without a clear owner.

### 3. Honest scope

If a topic appears in the sidebar, it must be complete enough to justify its presence. The docs navigation should represent real content, not future intent.

### 4. Integrated, not detached

The docs should feel like part of Supericons, not a separate product. The top navigation, branding, and account-level routes should stay consistent with the rest of the site.

### 5. Launch once, launch cleanly

Since Supericons has not launched yet, it is better to ship the full first public docs experience once than to publish an MCP-only version and redesign it later.

---

## Recommended Information Architecture

### Docs sidebar

- Overview
- Getting Started
- MCP Setup
- MCP Tools Reference
- Motion Lab
- Converter
- Account and Access
- Troubleshooting

### Launch page set

1. Docs Home
2. What Is Supericons
3. Quickstart
4. Claude Code Guide
5. Codex Guide
6. Cursor Guide
7. MCP Tools Overview
8. Motion Tools Reference
9. Converter Tools Reference
10. Motion Lab Guide
11. Converter Guide
12. API Keys and Access
13. Troubleshooting

This is enough to justify a real docs experience without inflating the scope.

---

## Proposed Page Definitions

### 1. Docs Home

Purpose:
- orient first-time visitors
- explain what Supericons includes
- route users to the right docs path quickly

Should include:
- short product framing
- value-oriented hero chips or proof points
- primary paths: Quickstart, MCP Setup, Motion Lab, Converter
- a short "What needs docs and what does not" mindset

### 2. What Is Supericons

Purpose:
- explain the product clearly for new users
- define the difference between free icons, premium collections, MCP, Motion Lab, and Converter

Should include:
- what Supericons is
- free vs Pro capabilities
- where MCP fits into the product
- internal links to pricing, app, and relevant docs

### 3. Quickstart

Purpose:
- get a new user to their fastest useful outcome

Should include:
- install MCP base config
- when to add an API key
- where to get an API key
- first useful actions
- links to Claude Code, Codex, and Cursor guides

### 4. Claude Code Guide

Purpose:
- give a complete, verified setup path for Claude Code users

Should include:
- where config lives
- how to add the MCP server
- free setup
- premium setup
- examples
- troubleshooting

### 5. Codex Guide

Purpose:
- give a complete, verified setup path for Codex users

Should include:
- Codex CLI and config location
- free setup
- premium setup
- examples
- troubleshooting

### 6. Cursor Guide

Purpose:
- give a complete, verified setup path for Cursor users

Should include:
- global and project config locations
- free setup
- premium setup
- examples
- troubleshooting

### 7. MCP Tools Overview

Purpose:
- explain the MCP surface as a system, not just a tool list

Should include:
- what MCP gives you inside coding agents
- free tools vs Pro-only tools
- common patterns
- link out to detailed motion and converter tool references

### 8. Motion Tools Reference

Purpose:
- document the motion-related MCP tools that are harder to infer from UI alone

Should include:
- `list_motion_presets`
- `get_motion_recipe`
- `animate_icon`
- `export_motion_css`
- `export_animated_svg`

For each tool:
- what it does
- who can use it
- key inputs
- key outputs
- when to use it
- common mistakes

### 9. Converter Tools Reference

Purpose:
- document the converter-related MCP tools and their option logic

Should include:
- `inspect_converter_options`
- `convert_svg_to_png`
- `convert_png_to_svg`

For each tool:
- what it does
- key parameters
- output behavior
- recommended use cases

This page should also explain the meaning of:
- `traceClass`
- `qualityMode`
- `uiMode`

### 10. Motion Lab Guide

Purpose:
- explain how Motion Lab works at the product level, not only through MCP

Should include:
- what Motion Lab is for
- preset categories
- trigger types
- duration and intensity controls
- CSS export vs animated SVG export
- when to use each output mode

### 11. Converter Guide

Purpose:
- explain how to use Converter as a product workflow

Should include:
- PNG to SVG workflow
- SVG to PNG workflow
- guidance on quality tradeoffs
- when to use icon mode vs logo mode
- examples of good and bad input expectations

### 12. API Keys and Access

Purpose:
- explain how access actually works

Should include:
- what the API key unlocks
- what it does not unlock by itself
- relationship between API key and account entitlements
- Pro subscription vs purchased collections
- where to create and manage keys

### 13. Troubleshooting

Purpose:
- gather the recurring setup and access failures in one place

Should include:
- MCP server installed but tools do not appear
- invalid or revoked key
- premium assets not appearing
- wrong client config file
- motion or converter output confusion

---

## What We Should Not Document Heavily

The following should stay lightweight or be omitted from docs:
- basic free icon browsing
- obvious customize panel interactions
- standard page navigation
- pricing details already covered by the pricing page
- legal text already covered by terms and privacy

The rule is simple: if a user can succeed from the interface alone in under a minute, it probably does not need a dedicated docs page.

---

## Content Sources Already Available

The docs can be written from material that already exists in the repo and product:

- current integrated docs hub copy
- current Claude Code, Codex, and Cursor guide content
- refined guide copy and verification work in `docs/plans/`
- MCP tool definitions in `mcp/index.js`
- Motion Lab product surface
- Converter product surface
- pricing and API key pages
- `docs/factsheet.md`

This is enough source material to write the launch docs set without inventing speculative content.

---

## Writing Standards

Every page should be:
- concrete
- direct
- accurate to the shipped product
- written in product language, not internal implementation language
- cross-linked to the right in-site destinations

Every setup or reference page should answer:
- what this is
- when to use it
- what access level it requires
- how to use it
- what can go wrong
- where to go next

---

## Launch Quality Gates

The docs section should not ship until all of the following are true:

- every sidebar item points to a finished page
- no page contains placeholder text
- no page contains "coming soon"
- all client setup guides are verified against official sources
- tool names and capabilities match the actual shipped MCP surface
- Motion Lab and Converter pages describe the real product behavior
- internal links work and point to the correct in-site destinations
- pricing and entitlement language is consistent across docs, pricing, and API keys pages

---

## Recommended Execution Order

### Phase 1: Lock the architecture

- finalize sidebar structure
- finalize page titles
- finalize what is in scope for launch
- finalize which pages remain intentionally undocumented

### Phase 2: Write the core docs

- Docs Home
- What Is Supericons
- Quickstart
- API Keys and Access
- Troubleshooting

### Phase 3: Write the client guides

- Claude Code
- Codex
- Cursor

### Phase 4: Write the product reference docs

- MCP Tools Overview
- Motion Tools Reference
- Converter Tools Reference
- Motion Lab Guide
- Converter Guide

### Phase 5: Consistency and verification pass

- align terminology across all pages
- verify setup steps against official sources
- verify feature descriptions against the product
- verify internal links and page relationships

---

## Final Recommendation

Supericons should launch with a true docs section, not a single long MCP page.

The docs should:
- keep the top navigation
- use a dedicated docs left sidebar
- cover the full product areas that actually need explanation
- exclude placeholder or speculative pages
- ship as one coherent first public docs experience

This is the cleanest launch path because it avoids a misleading intermediate state and avoids a second rewrite later.
