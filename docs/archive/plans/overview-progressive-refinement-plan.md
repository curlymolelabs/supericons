# Overview Progressive Refinement Plan

## Goal

Complete the Overview group first so the docs have a strong top-of-funnel before we continue into MCP Setup.

This pass covers:

- Introduction
- What Is Supericons
- Quickstart

The purpose is to make the docs clearer at the top, establish the product framing, and create a clean handoff into MCP Setup.

## What The Master Reference Gets Right

The master reference in `overview-mcp-setup-master.md` is strong enough to guide implementation for the Overview group now.

It does three useful things:

- replaces filler summaries with tighter page subtitles
- separates quick refinements from real content gaps
- identifies that `What Is Supericons` is the only Overview page that still needs a full body replacement, not just line edits

That means the Overview work can be done progressively instead of as one large rewrite.

## Progressive Execution Order

### Phase 1. Introduction page

Start with the docs introduction page because it is the first page users see and the lightest edit.

Apply:

- page subtitle:
  `Set up MCP, learn Motion Lab, and use Converter.`
- keep the current inclusive MCP card body
- keep the current framing paragraph

This is a quick quality upgrade with almost no structural risk.

### Phase 2. Quickstart page

Then refine Quickstart because it is already functional and only needs copy cleanup.

Apply:

- Add the server card body:
  `Choose your client below, or open the universal setup guide for the base config values.`
- Reload your session card body:
  `Restart your coding agent session. In Claude Code and Codex, type /mcp to confirm Supericons appears in the list.`
- API key callout heading:
  `Your key carries your account entitlement, not access`

Keep the rest of Quickstart as it is.

This gives users a cleaner setup path before the deeper setup guides are refined.

### Phase 3. What Is Supericons

Do this last in the Overview group because it is the only page that needs a full body build, not just copy polish.

Apply:

- page subtitle:
  `20,000+ open-source icons, MCP integration, and Pro tools for animated icons and image conversion.`
- replace the current placeholder with the full body specified in the master reference:
  - product overview intro
  - free vs. Pro table
  - 10 free icon libraries table
  - where to go next links

This page becomes the anchor page that explains the whole product clearly before readers branch into setup, access, and workflow docs.

## Why This Order Works

This sequence follows the sidebar from top to bottom while keeping the work incremental:

1. improve the first impression
2. tighten the most-used setup page
3. replace the one remaining Overview placeholder with real content

That gives the docs a much stronger front section before we move into MCP Setup.

## What To Leave For The Next Pass

Do not mix MCP Setup refinements into this pass.

Once Overview is complete, the next pass should cover:

- Universal setup
- Claude Code
- Codex
- Cursor
- Others

That keeps the work systematic and prevents Overview and MCP Setup changes from getting tangled.

## Success Standard

The Overview pass is complete when:

- the docs introduction reads cleanly and directly
- Quickstart is clearer without changing its structure
- What Is Supericons is no longer a placeholder
- Overview now feels complete enough to hand readers into MCP Setup confidently
