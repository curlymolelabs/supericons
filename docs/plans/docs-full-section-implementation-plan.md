# Supericons Docs Section Implementation Plan

**Date:** 10 April 2026  
**Status:** Proposed implementation plan  
**Primary source documents:** `docs/docs-prd.md`, `docs/docs-copy-bible.md`, `docs/docs-section-proposal.md`

---

## Summary

Supericons should launch with a full docs section that reflects the product as it exists today.

This docs section should:
- stay inside the main Supericons site shell
- keep the top navigation
- introduce a dedicated docs left sidebar
- use clean docs page URLs
- ship as one complete launch surface

This plan does not support:
- an MCP-only interim version
- "coming soon" pages
- placeholder navigation
- duplicate docs systems competing with one another

The copywriting source of truth should be `docs/docs-copy-bible.md`. The PRD should remain the product and scope source of truth. This plan turns those decisions into a practical build sequence.

---

## What We Are Building

We are building a full docs section for the parts of Supericons that genuinely need explanation:
- product orientation
- MCP setup
- MCP tools reference
- Motion Lab guides
- Converter guides
- API keys and access
- troubleshooting

We are not building docs for parts of the product that are already self-explanatory in the interface, such as basic free icon browsing or obvious customize panel controls.

---

## Core Decisions

### 1. The docs are product docs, not just MCP docs

The docs should carry the title **Supericons Docs** because the content will cover more than MCP.

### 2. The docs need their own left sidebar

The current app sidebar is for browsing the product. The docs sidebar should be for navigating documentation. These are different jobs and should not be blended together.

### 3. The top navigation stays

Docs should feel like part of Supericons, not a detached microsite. The top navigation, brand, and account context should remain consistent with the rest of the product.

### 4. Clean docs URLs become canonical

The docs should launch with a clear URL structure such as:
- `/docs`
- `/docs/quickstart`
- `/docs/mcp/claude-code`
- `/docs/motion-lab`

Existing docs entry points and old guide links should continue to work by redirecting people to the new canonical pages.

### 5. No placeholders

If a page appears in the docs sidebar, it must be complete enough to stand on its own at launch.

### 6. The copy bible leads the writing

`docs/docs-copy-bible.md` should be treated as the approved copy style and primary wording source. Where the build requires small structural adjustments, the tone and language should still follow that document.

---

## Canonical Content Sources

Each source should have a clear role.

### 1. `docs/docs-copy-bible.md`

Use this as the primary content and tone source for page copy, headings, labels, and explanatory language.

### 2. `docs/docs-prd.md`

Use this as the scope, IA, and page-definition source.

### 3. `mcp/index.js`

Use this as the live truth for MCP tool names, inputs, limits, and access rules.

### 4. Current product surfaces

Use the live Motion Lab, Converter, Pricing, and API Keys experiences as the source of truth for product behavior and user flows.

### 5. Official client documentation

Use official documentation from Claude Code, Codex, and Cursor to verify setup steps before launch.

---

## Information Architecture

The docs section should launch with this final structure.

### Sidebar groups

- Overview
- MCP Setup
- MCP Tools Reference
- Motion Lab
- Converter
- Access and API Keys
- Troubleshooting

### Launch pages

1. Docs Home  
2. What Is Supericons  
3. Quickstart  
4. Claude Code  
5. Codex  
6. Cursor  
7. MCP Tools Overview  
8. Icon Tools  
9. Motion Lab Tools  
10. Converter Tools  
11. Motion Lab Guide  
12. Motion Lab Presets  
13. Motion Lab Trigger Types  
14. Motion Lab Exports  
15. Converter Guide  
16. Converter PNG to SVG  
17. Converter SVG to PNG  
18. Converter Settings Reference  
19. API Keys  
20. Pro and Collections  
21. Troubleshooting

### Final URL structure

- `/docs`
- `/docs/what-is-supericons`
- `/docs/quickstart`
- `/docs/mcp/claude-code`
- `/docs/mcp/codex`
- `/docs/mcp/cursor`
- `/docs/mcp/tools`
- `/docs/mcp/tools/icons`
- `/docs/mcp/tools/motion`
- `/docs/mcp/tools/converter`
- `/docs/motion-lab`
- `/docs/motion-lab/presets`
- `/docs/motion-lab/triggers`
- `/docs/motion-lab/exports`
- `/docs/converter`
- `/docs/converter/png-to-svg`
- `/docs/converter/svg-to-png`
- `/docs/converter/settings`
- `/docs/access/api-keys`
- `/docs/access/premium`
- `/docs/troubleshooting`

---

## Corrections To Lock Before Build Starts

The current PRD is strong, but these details should be locked before implementation begins.

### 1. Make the markdown PRD the canonical planning file

`docs/docs-prd.md` should be the source of truth.  
`docs/docs-prd.html` should remain a review and presentation artifact only.

### 2. Keep the sidebar and page list in sync

The sidebar should explicitly include **MCP Tools Overview** so the navigation matches the full 21-page set.

### 3. Remove interim-state language from the build plan

The docs launch plan should describe the final shipped state only. It should not include temporary framing intended for an MCP-only phase.

### 4. Tighten the verification standard

Do not show a public verification note on client setup pages until all three guides have been rechecked against official sources on the same verification pass.

### 5. Lock the route migration plan

The build needs a clear decision on how current docs and guide URLs map into the new docs structure.

---

## Route and Migration Plan

The new docs URLs should become the canonical destination.

### Canonical routes

All docs content should live at `/docs/...` paths.

### Compatibility routes

These should continue to work:
- `/?view=docs`
- `/?view=docs-claude-code`
- `/?view=docs-codex`
- `/?view=docs-cursor`
- `/mcp/claude-code/`
- `/mcp/codex/`
- `/mcp/cursor/`
- old `/docs` entry points that currently redirect into the app shell

### Redirect behavior

Each old route should send people to the equivalent new docs page.

Examples:
- `/?view=docs` -> `/docs`
- `/?view=docs-codex` -> `/docs/mcp/codex`
- `/mcp/cursor/` -> `/docs/mcp/cursor`

This preserves old links while making the new docs structure the public source of truth.

---

## Docs Shell Requirements

The docs shell should be defined before page implementation begins.

### Desktop behavior

- top navigation remains visible
- docs sidebar appears on the left
- page content appears in the main column
- a right rail is optional and should only appear where it improves page-level navigation

### Mobile behavior

- top navigation remains visible
- docs sidebar becomes a drawer or menu
- page content remains the primary focus
- page-level navigation should stay easy to reach without crowding the screen

### Shared docs page elements

Each docs page should support, where relevant:
- page title
- short summary
- verification note when justified
- section headings
- code blocks
- callouts
- tables
- related links
- previous and next page navigation

### Visual tone

The docs should feel like part of Supericons, not a generic documentation template. They should remain clear, calm, and product-led.

---

## Content Model

To keep 21 pages maintainable, content should not live as one large inline block.

The docs system should support:
- page metadata
- sidebar grouping
- page title and summary
- section content
- optional code blocks
- optional tables
- optional callouts
- related links
- verification metadata where appropriate

This makes the docs section easier to maintain and easier to grow without rewriting the shell later.

---

## Writing Plan

The docs should be written in an order that reduces rework and keeps the navigation meaningful at every step.

### Phase 1: Lock architecture and standards

Deliverables:
- final page list
- final sidebar labels
- final URL map
- docs shell rules
- verification policy
- redirect plan

Output:
- one updated, final PRD
- one final route map
- one final page inventory

### Phase 2: Write the orientation layer

Pages:
- Docs Home
- What Is Supericons
- Quickstart
- API Keys
- Pro and Collections
- Troubleshooting

Why first:
- these pages explain the product and access model
- they support all other pages
- they reduce confusion before users enter deeper setup or reference flows

### Phase 3: Finalize the client setup guides

Pages:
- Claude Code
- Codex
- Cursor

Work included:
- verify every setup step against the official source
- ensure all wording matches the copy bible style
- confirm config file scope and placement
- confirm premium setup guidance is consistent across all three guides

### Phase 4: Build the MCP reference layer

Pages:
- MCP Tools Overview
- Icon Tools
- Motion Lab Tools
- Converter Tools

Why now:
- these pages give developers a complete reference surface
- they reduce repeated explanation across guides
- they create the technical backbone of the docs section

### Phase 5: Build the product guides

Pages:
- Motion Lab Guide
- Motion Lab Presets
- Motion Lab Trigger Types
- Motion Lab Exports
- Converter Guide
- Converter PNG to SVG
- Converter SVG to PNG
- Converter Settings Reference

Why now:
- these pages are what make the docs truly product-wide rather than MCP-only
- they serve paid users and higher-complexity workflows

### Phase 6: Cross-page consistency pass

Review for:
- naming consistency
- access language consistency
- duplicated explanations
- unclear routing language
- missing links
- table format consistency
- callout tone consistency

### Phase 7: Final launch verification

Confirm:
- every page is complete
- every link resolves correctly
- every setup step is verified
- every parameter matches the shipped product
- every redirect works as intended

---

## Implementation Approach

This is how I would build it.

### 1. Build the docs shell first

Create the full docs shell with:
- dedicated docs sidebar
- clean docs routing
- page template
- mobile behavior
- support for shared page blocks

This should happen before converting all copy, so the content lands in the final structure once.

### 2. Move from one long docs page to a page-based system

The current docs setup is built around a single docs page plus a few guide views. The new implementation should shift to a page-based docs system so each page has:
- its own route
- its own title
- its own navigation context
- its own internal links

### 3. Bring existing guide content into the new system

The current Claude Code, Codex, and Cursor pages already contain useful material. Their content should be migrated into the new docs structure rather than rewritten from scratch.

### 4. Use the copy bible as the writing baseline

Where the copy bible already provides final wording, use it.  
Where a page needs structural adjustments during build, keep the same tone and framing instead of improvising a different voice.

### 5. Preserve compatibility

Old docs and guide links should continue to resolve cleanly during and after launch.

---

## Verification Plan

This docs section should only launch after a full verification pass.

### Content verification

- check all page titles, labels, and links
- confirm access language is consistent across docs, pricing, and API keys
- confirm Motion Lab and Converter descriptions match the shipped product

### Setup verification

- Claude Code guide checked against official docs
- Codex guide checked against official docs
- Cursor guide checked against official docs

### Product verification

- all tool names and parameters checked against the live MCP server
- Motion Lab preset and export descriptions checked against the live product
- Converter settings and tradeoffs checked against the live product

### Route verification

- canonical docs URLs load correctly
- compatibility redirects land on the right destination
- internal docs links stay inside the docs section

### Experience verification

- desktop docs layout is complete
- mobile docs navigation is usable
- code blocks, tables, and callouts remain readable across screen sizes

---

## Launch Gates

The docs section should not ship until all of the following are true:

- every sidebar item points to a finished page
- no page contains placeholder copy
- no page contains "coming soon"
- all client setup guides have been verified against official sources
- all MCP tool names and parameters match the live server
- Motion Lab and Converter pages match the actual product behavior
- compatibility redirects are working
- docs pages are readable on desktop and mobile
- internal links are complete and correct
- pricing and entitlement language is consistent across the product

---

## Recommended Output Files

The implementation should ultimately produce:

- one docs shell
- one structured page registry for the full docs set
- 21 completed docs pages
- compatibility redirects from current docs and guide routes
- one verified launch-ready docs section inside the Supericons site

---

## Final Recommendation

Build the full docs section now.

Use the copy bible as the voice and content guide. Use the PRD as the product scope and page-definition guide. Lock the route strategy and docs shell before writing pages into the final structure.

This creates one complete first public docs experience instead of a temporary MCP-only layer that would need to be replaced later.
