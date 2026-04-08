# MCP Follow-Up Cleanup And Accuracy Plan

## Goal

Fix the secondary-page rendering bug that causes MCP content to leak into Terms, then tighten the MCP hub and guide content so it is accurate, non-duplicative, and aligned with the latest verified agent support.

This plan covers two user-visible issues:

1. The MCP page currently feels duplicated.
2. The Terms page can show MCP copy/content after switching views.

It also covers the approved content cleanup:

- remove `Antigravity`
- stop claiming `any AI coding agent`
- keep full guides only where we actually have them
- bring the MCP messaging in line with current official docs

## Current Audit Findings

### 1. Terms contamination is a real rendering bug

The view teardown helper in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L1833) removes:

- `packCatalog`
- `dashboardView`
- `collectionDetail`
- `pricingView`
- `termsView`
- `motionLabView`
- `converterView`

but it does **not** remove `mcpView`.

That means:

- `switchView('mcp')` mounts `#mcpView`
- `switchView('terms')` removes the old Terms page first, but not the old MCP page
- `renderTermsPage()` then appends `#termsView`

Result:

- both views can remain mounted under `#gridArea`
- the Terms route can appear to contain MCP copy or duplicated content

### 2. The MCP hub currently duplicates its own guide surface

The main MCP content section in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2561) already presents guide entry points for:

- Claude Code
- Codex
- Cursor

Then the aside repeats the same links again in a separate `Start here` block in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2642).

This is not a rendering bug, but it does create unnecessary duplication and visual noise.

### 3. The current MCP positioning is too broad

Current broad claims:

- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html#L123): `Works with any AI coding agent`
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2562): `Supported AI coding agents`

These overstate support. The accurate claim is narrower:

- `MCP-capable coding agents`
- or `MCP-capable AI coding agents`

### 4. `Antigravity` is currently unverified and should be removed

`Antigravity` is listed in:

- [index.html](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/index.html#L138)
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js#L2572)

But we do not currently have:

- a first-party setup guide in the repo
- a verified official MCP setup source we are comfortable citing publicly

So it should be removed from the verified public list for now.

### 5. We only have full guides for 3 tools

The repo has dedicated guide pages for:

- [Claude Code](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/mcp/claude-code/index.html)
- [Codex](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/mcp/codex/index.html)
- [Cursor](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/public/mcp/cursor/index.html)

There are no equivalent full guide pages for:

- OpenCode
- Cline
- GitHub Copilot
- Windsurf

So copy like `Claude Code, Codex, Cursor, and more` should be revised unless we explicitly frame the others as compatibility notes instead of full guides.

## Desired Outcome

After this follow-up:

- switching between MCP and Terms leaves only one page mounted
- Terms never shows MCP content
- the MCP hub presents one clear guide entry surface instead of repeating itself
- the public MCP copy is precise and defensible
- `Antigravity` is removed
- full guides are clearly separated from generic compatibility notes

## Scope

### In Scope

- fix cross-view cleanup between MCP and Terms
- reduce MCP hub duplication
- remove `Antigravity`
- tighten MCP titles, labels, and CTA copy
- align hub content to currently verified support claims
- plan the next pass for agent-specific guide corrections

### Out Of Scope For This Pass

- rewriting every standalone guide immediately
- migrating all guide pages into the main shell
- adding brand-new guides for every agent listed
- changing MCP backend behavior

## Phase 1. Fix View Isolation Bug

### Problem

`removePackCatalog()` is being used as the shared teardown helper, but it is missing `mcpView`.

### Plan

- update the teardown helper so `mcpView` is removed alongside the other mutually exclusive full-page views
- verify that switching between:
  - MCP -> Terms
  - Terms -> MCP
  - MCP -> Pricing
  - MCP -> Icons
  leaves only the intended active view mounted

### Recommended implementation detail

Use the same cleanup path for all store-shell full-page views instead of one-off removals in multiple branches.

This is the lowest-risk fix and directly addresses the Terms contamination bug.

## Phase 2. Remove Redundant MCP Guide Surface

### Problem

The MCP hub currently presents the same 3 guide destinations twice:

- once in the main guide grid
- once again in the right-side `Start here` card

### Plan

Keep only one primary guide-entry surface.

Recommended direction:

- keep the main guide grid as the primary entry surface
- repurpose the right-side card into something non-duplicative, such as:
  - `Compatibility notes`
  - `What is verified`
  - `Need a different client?`

### Why this is better

- reduces repetition
- makes the page easier to scan
- leaves the aside available for supporting info instead of echoing the main content

## Phase 3. Tighten MCP Positioning Copy

### Problem

The current public copy implies broader support than we can cleanly defend.

### Plan

Replace broad claims with precise language.

Recommended changes:

- landing:
  - from `Works with any AI coding agent`
  - to `Works with MCP-capable coding agents`

- MCP hub section title:
  - from `Supported AI coding agents`
  - to `Supported MCP-capable coding agents`

- docs CTA:
  - from `See setup guides for Claude Code, Codex, Cursor, and more`
  - to `See setup guides and compatibility notes`
  - or `See setup guides for Claude Code, Codex, and Cursor`

## Phase 4. Remove `Antigravity`

### Problem

`Antigravity` is currently presented like a verified supported client, but we do not have the documentation quality to justify that claim.

### Plan

- remove `Antigravity` from:
  - landing badges
  - MCP hub pill list
- do not mention it in public compatibility lists unless we later verify and document it properly

### Replacement strategy

Do not backfill the slot unless we have another clearly verified client we are ready to document.

The page will be stronger with one fewer badge than with one questionable badge.

## Phase 5. Clarify Guide Tiers

### Problem

The current hub mixes:

- real guides
- generic compatibility notes

without clearly distinguishing them.

### Plan

Split the MCP client section into two tiers:

#### Tier A. Full setup guides

- Claude Code
- Codex
- Cursor

#### Tier B. Compatibility notes

- OpenCode
- Cline
- GitHub Copilot coding agent
- Windsurf

### Why this matters

This makes the page truthful without underselling the broader MCP ecosystem.

## Phase 6. Agent-Specific Guide Accuracy Refresh

This is the content follow-up after the hub cleanup.

### Claude Code

- update the guide to match current Claude Code MCP flow
- add the Windows `cmd /c npx` note
- prefer current Claude Code command/config guidance over the generic JSON example

### Codex

- replace the generic JSON block
- update to current Codex MCP flow using current Codex guidance
- make the guide explicitly Codex-specific instead of a thin rewrite of the generic MCP config

### Cursor

- keep the JSON-style config direction
- tighten the language to match actual Cursor MCP setup expectations

## Recommended Execution Order

1. Fix the `mcpView` teardown bug
2. Verify Terms and MCP route isolation
3. Remove duplicated guide surface from the hub
4. Tighten titles and CTA copy
5. Remove `Antigravity`
6. Split full guides vs compatibility notes
7. Refresh Claude Code and Codex guide accuracy
8. Revisit whether OpenCode, Cline, Copilot, and Windsurf deserve full guides later

## Verification Checklist

### Rendering

- MCP -> Terms leaves only `#termsView`
- Terms -> MCP leaves only `#mcpView`
- no MCP copy appears on Terms
- no Terms copy appears on MCP

### MCP Hub

- only one primary guide-entry surface remains
- `Antigravity` is gone
- titles use `MCP-capable` wording
- CTA no longer promises more full guides than exist

### Accuracy

- full guides are only shown for Claude Code, Codex, and Cursor
- compatibility notes are clearly labeled as notes, not full guides
- no public copy claims support for `any AI coding agent`

## Risks

### Low Risk

- removing `Antigravity`
- tightening headings and CTA copy
- removing duplicate guide links from the aside

### Medium Risk

- changing the shared teardown helper if another view depends on stale DOM being present

### Mitigation

- keep the Phase 1 fix small and isolated
- verify all full-page store-shell views after the cleanup
- do content cleanup only after rendering isolation is stable
