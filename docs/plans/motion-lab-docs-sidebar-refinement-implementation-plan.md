# Motion Lab Docs Sidebar Refinement Implementation Plan

Date: April 13, 2026
Status: Ready for implementation
Scope: Docs page only

## Decision Summary

The Motion Lab agent library through MCP is now complete enough to shift primary product work back to docs refinement.

That does **not** mean every operational follow-up is closed. It means the core end-to-end library is real, deployed, and verified enough that the next highest-leverage work is the docs experience.

### E2E verdict

Treat Motion Lab MCP as **functionally complete end to end for controlled release** because all of the following are now true:

- local MCP surface exists and is usable
- hosted premium recipe and render path exists and is deployed
- session exchange works
- hosted recipe, CSS render, and animated SVG render paths were previously verified
- negative-path verification exists
- Postgres-backed rate limiting is deployed
- live `429` proof was captured through the MCP path

### Still open, but not blocking this docs pass

- exposed Pro key rotation should still happen out of band
- session, CSS render, and animated SVG endpoints do not yet each have their own dedicated live `429` proof
- fail-open limiter degradation has not been intentionally proven live

These remain valid operational follow-ups, but they should not block docs refinement.

## Current Docs Reality

The current docs experience is split across two layers:

1. The app docs page already contains a real Motion Lab section in the left sidebar, implemented directly in [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js).
2. The richer Motion Lab MCP guide exists separately as [motion-lab-mcp-user-guide.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-user-guide.md).

### Important conclusion

The standalone Markdown guide is **not** built into the docs page today.

The docs page does not render Markdown files as pages. Instead, it uses hard-coded page definitions in [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js).

So the current state is:

- Motion Lab docs **are** present in the left sidebar
- Motion Lab MCP reference **is** present in the docs page under `MCP Reference`
- but the fuller MCP user guide content is **not** yet integrated into the docs UI as a first-class page set

## Current Motion Lab Docs Coverage

### Already present in the docs page

Motion Lab left-sidebar pages already exist for:

- `docs-motion-lab`
- `docs-motion-lab-presets`
- `docs-motion-lab-triggers`
- `docs-motion-lab-exports`

Motion Lab MCP reference already exists separately as:

- `docs-mcp-motion`

### Already present in the standalone guide, but not fully surfaced in the docs page

- explicit local-vs-hosted mental model
- client-specific setup examples for Cursor and Claude Desktop
- recommended human and AI agent workflow order
- human-vs-agent usage framing
- stronger explanation of `selector_mode`
- explicit explanation that tool responses include `selector_instructions`
- more realistic use-case guidance
- stronger “when to say no motion” guidance

### Important docs gap

The docs page explains `{{ICON_SELECTOR}}`, but it does **not** currently document the newer `selector_instructions` response field, even though the MCP implementation now returns it from both:

- `export_motion_css`
- `animate_icon`

Relevant implementation path:

- [index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)

## Problem To Solve

Right now a user learning Motion Lab through the docs page gets:

- a decent browser-oriented Motion Lab introduction
- a solid MCP tool reference page

But they do **not** get one coherent Motion Lab learning path inside the left sidebar that answers:

- how Motion Lab works through MCP
- how to set it up in real clients
- how to choose the right tool order
- how to handle CSS selector placeholders confidently
- how humans and AI agents should use the library differently

This creates avoidable fragmentation.

## Goal

Refine the Motion Lab section in the left sidebar so it becomes the canonical in-app docs path for Motion Lab, while preserving the current browser-oriented guidance and folding in the MCP-specific material that currently lives only in the standalone guide.

## Non-Goals

- redesigning the entire docs information architecture
- replacing the standalone Markdown guide generation model across the whole site
- moving all MCP Reference pages into Motion Lab
- changing Motion Lab product behavior
- changing the actual MCP tool contracts during this docs pass

## Recommended Information Architecture

Keep the existing Motion Lab left-sidebar section, but make it more complete.

### Proposed Motion Lab section

- `Introduction`
- `Presets`
- `Trigger Types`
- `Exports`
- `MCP Workflow`
- `Client Setup`
- `Use Cases`

### MCP Reference should remain separate

Keep `docs-mcp-motion` in the `MCP Reference` group as the formal API-style reference page.

This avoids duplicating parameter tables in the Motion Lab section while still letting the Motion Lab sidebar carry the practical learning flow.

## Page-Level Content Plan

### 1. Keep and tighten `docs-motion-lab`

Purpose:

- keep it as the Motion Lab landing page
- add clearer browser-vs-MCP framing
- point explicitly to the practical MCP workflow pages

Add:

- one short “How Motion Lab works through MCP” block
- one short “What is already complete in the hosted path” note only if it helps confidence

Do not add:

- long setup JSON blocks
- full parameter tables

### 2. Keep `docs-motion-lab-presets`

Purpose:

- browser and MCP shared preset reference

Change:

- minimal or none

### 3. Keep `docs-motion-lab-triggers`

Purpose:

- shared behavioral reference

Change:

- minimal or none

### 4. Expand `docs-motion-lab-exports`

Purpose:

- remain the export-format decision page

Add:

- explicit `selector_mode` explanation
- explicit `selector_instructions` explanation
- small example showing placeholder replacement

### 5. Add `docs-motion-lab-mcp-workflow`

Purpose:

- become the practical “how to use Motion Lab through MCP” page

Content:

- what Motion Lab MCP is
- local baseline vs hosted premium path
- recommended tool order
- when to use `list_motion_presets`
- when to use `get_motion_recipe`
- when to use `export_motion_css`
- when to use `export_animated_svg`
- when to use `animate_icon`
- human workflow vs AI agent workflow

This page should absorb the strongest content from [motion-lab-mcp-user-guide.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-user-guide.md) without copying the whole file verbatim.

### 6. Add `docs-motion-lab-client-setup`

Purpose:

- make setup actually discoverable from the Motion Lab section instead of assuming users will navigate through general MCP docs first

Content:

- prerequisites
- local MCP server command
- Cursor example
- Claude Desktop example
- where `SUPERICONS_API_KEY` belongs
- how to confirm tools are visible
- first successful Motion Lab call

This should reuse the guide’s setup content, but rewritten into the docs-page style.

### 7. Add `docs-motion-lab-use-cases`

Purpose:

- make Motion Lab feel usable, not just documented

Content:

- professional dashboard hover
- security/auth flows
- success/celebration
- ambient empty states
- accessibility-sensitive contexts
- when to say no motion

This page should combine:

- practical preset guidance
- restraint guidance
- output-choice guidance

## Source-Of-Truth Rule

The docs page should become the primary user-facing Motion Lab docs surface.

The standalone Markdown guide should remain as:

- an internal drafting/reference artifact
- a source for future copy extraction

But it should no longer be treated as the main end-user documentation surface once the left-sidebar refinement is complete.

## Implementation Workstreams

### Workstream A: Audit and content mapping

- inventory which parts of [motion-lab-mcp-user-guide.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-user-guide.md) are not yet represented in [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- identify duplication with `docs-mcp-motion`
- decide which content belongs in practical Motion Lab pages vs strict MCP reference

Acceptance signal:

- every major section of the standalone guide is either mapped into a docs page or intentionally excluded

### Workstream B: Expand Motion Lab docs page definitions

- update the Motion Lab group in [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- add the new Motion Lab practical pages:
  - `docs-motion-lab-mcp-workflow`
  - `docs-motion-lab-client-setup`
  - `docs-motion-lab-use-cases`
- update cross-links between Motion Lab and MCP Reference pages

Acceptance signal:

- the left sidebar exposes a complete Motion Lab learning path without leaving the Motion Lab section for practical setup/use guidance

### Workstream C: Close the selector-instructions docs gap

- update Motion Lab export docs to mention:
  - `selector_mode`
  - `selector_token`
  - `selector_instructions`
- make sure both `export_motion_css` and `animate_icon` are represented accurately

Acceptance signal:

- a user reading the docs page can understand how to replace `{{ICON_SELECTOR}}` without opening source code or guessing

### Workstream D: UX polish and copy consolidation

- remove duplicated explanations where the same concept appears in three places
- keep API-style parameter details in `docs-mcp-motion`
- keep practical decision guidance in the Motion Lab section
- make the Motion Lab sidebar sequence feel intentional instead of split-brain

Acceptance signal:

- the Motion Lab section reads like one coherent guide path, not a collection of unrelated pages

### Workstream E: Verification

- verify all new Motion Lab docs views render correctly
- verify sidebar navigation and deep links work
- verify cross-links between Motion Lab and MCP Reference pages work
- confirm no existing docs views break
- run the app build

Acceptance signal:

- Motion Lab docs are navigable, accurate to the current MCP implementation, and build cleanly

## File Targets

Primary implementation target:

- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)

Reference/source material:

- [motion-lab-mcp-user-guide.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-user-guide.md)
- [motion-lab-mcp-audit-handoff-summary.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-audit-handoff-summary.md)
- [motion-lab-mcp-postgres-rollout-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/motion-lab-mcp-postgres-rollout-audit.md)
- [index.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/mcp/index.js)

Verification target:

- [package.json](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/package.json)

## Execution Order

1. content map the standalone guide against the live docs pages
2. add the new Motion Lab practical pages to the sidebar
3. update the exports page with `selector_instructions`
4. tighten cross-linking between Motion Lab pages and `docs-mcp-motion`
5. verify docs navigation and run the app build

## Recommendation

Proceed with the docs-sidebar refinement now.

The product is past the point where the biggest Motion Lab risk is backend incompleteness. The bigger risk now is that the docs experience undersells or fragments a capability that is already materially built.
