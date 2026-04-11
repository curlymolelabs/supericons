# Docs Navigation Pass Plan

## Goal

Stabilize the docs information architecture before we rewrite more page content.

This pass focuses on the navigation layer only:
- sidebar subtitle
- sidebar group labels
- sidebar page labels
- one misleading docs-home link target

The purpose is to make the docs easier to scan and easier to build section by section without rewriting unfinished pages twice.

## What This Pass Will Change

### 1. Refine the sidebar header

Update the sidebar subtitle to:

`Setup guides and product reference.`

This keeps the scope clear without repeating the brand name.

### 2. Tighten the MCP reference group name

Change:

`MCP Tools Reference` -> `MCP Reference`

This keeps the section meaning while reducing visual weight in the sidebar.

### 3. Clean up the clearest page labels

Adopt the low-risk label improvements that make the sidebar read more like a mature docs system:

- `Docs Home` -> `Introduction`
- `MCP Tools Overview` -> `Overview`
- `Motion Lab Tools` -> `Motion Lab`
- `Converter Tools` -> `Converter`
- `Guide` under `Motion Lab` -> `Introduction`
- `Guide` under `Converter` -> `Introduction`
- `Settings Reference` -> `Settings`

These changes improve scan speed without changing the underlying page structure.

### 4. Fix the docs-home MCP card target

Keep the card title and button label as they are for now, but change the destination so the user lands on the right starting point.

Change:

`Set up MCP` card target -> `Quickstart`

This makes the flow more natural:
- first open the quickstart
- then choose a client

## What This Pass Will Not Change Yet

To keep this pass focused, the following items stay as they are for now:

- full page body copy
- unfinished placeholder page content
- Access and API Keys group naming
- What Is Supericons page naming
- public verification notes
- page-title rewrites beyond what is already clearly settled

## Execution Order

1. Update the plan record.
2. Patch the sidebar subtitle.
3. Patch the approved group and nav labels.
4. Patch the docs-home MCP card destination.
5. Verify docs navigation, sidebar state, and build output.

## Success Standard

This pass is complete when:

- the sidebar reads more cleanly from top to bottom
- the docs home link reads as an introduction instead of a homepage
- Motion Lab and Converter no longer use the vague label `Guide`
- converter settings reads more naturally in the sidebar
- the MCP card on the docs home sends users to the right first step
- the docs shell, collapsible groups, and route handling still work correctly
