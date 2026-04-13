Date: April 14, 2026
Status: Proposed
Scope: Replace the `/docs/troubleshooting` placeholder with a real troubleshooting page that helps users recover from setup, access, Motion Lab, and Converter problems

Depends on:
- `docs-pages.js`
- `docs/docs-copy-bible.md`
- `docs/plans/docs-copy-consolidated-proposal.md`
- `docs/plans/access-and-api-keys-docs-copy-refinement-implementation-plan.md`
- `docs/access-and-api-keys-copy-audit.md`

## Objective

Turn `docs-troubleshooting` into a fast, scannable fallback page for users whose setup or workflow is not working.

The page should help users:

- identify the kind of problem they have
- find one concrete next action quickly
- understand whether the issue is setup, account access, Motion Lab, or Converter
- know where to go next if the fix is not on the page

## Why This Page Matters

This page is not an introduction. It is a recovery page.

Users arrive here when something already feels broken:

- the server does not appear
- the API key does not work
- Motion Lab returns an access error
- Converter output looks wrong

That means the page has a different job from the setup guides and access explainers:

1. reduce frustration quickly
2. make the likely fix obvious
3. avoid vague advice
4. prevent the user from bouncing between pages without a clear next step

If the page is done well, a frustrated user should be able to scan headings, find their symptom, and act without reading the whole docs section.

## Problem Statement

Right now `docs-troubleshooting` is still placeholder-driven in `docs-pages.js`.

The route exists, but the live page does not yet do the real job. The current placeholder only promises that the page will eventually gather common issues. It does not:

- diagnose specific problems
- provide concrete recovery steps
- link the user back to the right setup or access page
- carry the newer wording model now used by the access docs

The main risks if we leave it as-is are:

- users hit a dead end exactly when they need help most
- support burden stays high because the docs do not resolve common failures
- access wording drifts back into older, less clear terms
- the page overlaps client guides or access pages instead of complementing them

## Page Role And Boundaries

The troubleshooting page should own symptom-based recovery.

It should not try to become:

- a second quickstart page
- a second client setup guide
- a second full explanation of packs versus the Supericons Pro plan

Instead, it should:

- solve the common issue in one short block when possible
- use the dedicated setup guides for client-specific detail
- use `API Keys` and `Pro and Collections` for the deeper access model
- keep the user moving toward resolution

## User Tasks This Page Must Support

### Primary tasks

1. Find the matching symptom quickly
2. Understand whether the issue is setup, account access, Motion Lab, or Converter
3. Take the next corrective action without guessing
4. Know where to escalate if the problem is still not fixed

### Secondary tasks

1. Check the correct config file location for Claude Code, Codex, or Cursor
2. Confirm that a slow first `npx` run is normal
3. Confirm whether an API key or account access issue is the real blocker
4. Find the correct deeper page for client setup, API keys, pricing, or converter settings

## Success Criteria

After this pass:

- `docs-troubleshooting` is a real page, not a placeholder
- the intro explains page scope in one screenful
- the content is grouped by workflow stage, not by internal product terminology
- each problem block uses the pattern `symptom -> likely cause -> concrete action`
- the config file table is present and matches the client setup guides
- access language matches the newer access docs wording model
- the page links to the right deeper docs instead of duplicating them
- the page ends with a clear fallback path if the problem is not listed
- `npm run build` passes

## UX Writing Principles

### 1. Lead with the symptom the user sees

Prefer headings like:

- `Server does not appear after adding`
- `API key is invalid or revoked`
- `SVG-to-PNG output is wrong size`

Avoid headings that make the user decode internal terminology first.

### 2. Keep every block action-first

The user should be able to scan a problem heading and resolve it with one short paragraph or checklist.

Avoid long explanations before the action.

### 3. Separate explanation pages from recovery pages

If a fix requires more background:

- give the shortest useful explanation here
- then link to the deeper page

The troubleshooting page should diagnose and route, not reteach the entire system.

### 4. Reuse the current access wording model

When the page mentions access:

- the account is the source of truth
- the API key identifies the account
- bought packs unlock the premium icons in those packs
- Motion Lab and Converter are part of the `Supericons Pro plan`

Avoid:

- `entitlement`
- `premium tools`
- bare `Pro`
- `paid plan`
- `linked to`

### 5. Distinguish broken behavior from normal behavior

Some entries should reassure rather than troubleshoot, for example:

- first-run `npx` delay
- animation limitations of externally loaded SVGs

The page should say clearly when something is expected behavior and what to do next.

## Source Hierarchy

Use these sources in this order:

1. `docs/docs-copy-bible.md`
2. `docs/plans/docs-copy-consolidated-proposal.md`
3. current wording rules from the access docs plan and audit

The new troubleshooting page should stay consistent with the canonical structure already described in the docs planning work, while adapting the access section to the now-live `API Keys` and `Pro and Collections` pages.

## Information Architecture

The page should keep a single-page troubleshooting format with four main sections:

1. `MCP setup`
2. `Access and API keys`
3. `Motion Lab`
4. `Converter`

Then end with a short fallback callout or support note.

### Why this structure works

- it matches how users think about where the failure is happening
- it keeps setup and product issues separate
- it allows a fast scan without reading a long table of contents
- it aligns with the canonical page spec already drafted in the docs bible

## Proposed Content Plan

### Intro

The intro should do three things immediately:

- define the scope of the page
- set the expectation that it covers the most common issues
- provide a fallback contact path if the issue is not listed

Keep it to one short paragraph.

### Section 1: MCP setup

This section should cover the failures that happen before tool use succeeds at all.

Planned problems:

1. `Server does not appear after adding`
2. `Wrong config file location`
3. `npx takes a long time on first run`

Required content:

- one direct fix for the missing server symptom
- one config file location table for Claude Code, Codex, and Cursor
- one short reassurance block explaining first-run `npx` delay

Routing links:

- `docs-claude-code`
- `docs-codex`
- `docs-cursor`

### Section 2: Access and API keys

This section should help users distinguish account access problems from setup problems.

Planned problems:

1. `Access features are not available`
2. `API key is invalid or revoked`
3. `Premium icons appear but a tool is still locked`

Required behavior:

- keep the troubleshooting steps short and practical
- avoid re-explaining the full access model inline
- link to `API Keys` and `Pro and Collections` for the deeper explanation

Recommended checks in this section:

1. confirm the correct Supericons account
2. confirm `SUPERICONS_API_KEY` is present in the config
3. confirm the client was restarted after editing config
4. confirm whether the user needs bought icon access or the `Supericons Pro plan`

Routing links:

- `docs-access-api-keys`
- `docs-access-premium`
- `pricing`
- `api-keys`

### Section 3: Motion Lab

This section should focus on Motion Lab-specific failure modes after setup is already working.

Planned problems:

1. `Motion Lab tools return an access error`
2. `Animated SVG does not animate in an <img> tag`
3. `The wrong preset is animating`

Required behavior:

- clearly distinguish access errors from rendering limitations
- name `list_motion_presets` when preset IDs are the likely problem
- explain inline SVG as the reliable fallback for animation when relevant

Routing links:

- `docs-motion-lab`
- `docs-motion-lab-exports`

### Section 4: Converter

This section should address quality and output-shape issues, not setup.

Planned problems:

1. `PNG-to-SVG output is imprecise or has too many paths`
2. `Which traceClass should I use?`
3. `SVG-to-PNG output is wrong size`

Required behavior:

- tell the user what likely caused the quality issue
- explain the next parameter to try
- link out to settings and guide pages where the user needs more detail

Routing links:

- `docs-converter-guide`
- `docs-converter-settings`

### Final fallback

End the page with one short support note:

- if the problem is not listed, visit `supericons.dev`
- or email `hello@supericons.dev`

This should feel like a calm fallback, not an afterthought.

## Content Boundaries To Keep

### Keep

- universal troubleshooting steps that apply across clients
- one shared config-path table
- short access checks
- product-specific troubleshooting for Motion Lab and Converter

### Move out or link out

- client-specific deep setup instructions
- full explanation of what API keys do
- full explanation of packs versus the `Supericons Pro plan`
- long parameter references

## Layout And Component Approach

Implement the page with existing docs primitives already used elsewhere in `docs-pages.js`:

- `docs-section`
- `docs-callout`
- `docs-grid docs-grid--cards` when short cards improve scanability
- `docs-table-wrap` and `docs-table` for config paths

Do not introduce new UI components just for this page unless implementation reveals a real layout gap.

## Recommended Implementation Steps

### Step 1: Replace the placeholder shell with the real page scaffold

Build the `docs-troubleshooting` `bodyHtml` with:

- intro
- four main sections
- bottom fallback note

Success condition:

- the route is immediately useful even before copy polish

### Step 2: Port the canonical troubleshooting blocks from the existing source docs

Use the docs bible and consolidated proposal as the base for:

- problem headings
- config-path table
- Motion Lab and Converter troubleshooting items

Success condition:

- the live page matches the already-approved troubleshooting structure

### Step 3: Adapt the access section to the newer access docs architecture

Refine the planned `Premium access` content so it works with the now-live access pages:

- use the current account and API key wording
- rename the section to `Access and API keys` if that improves scan clarity
- add direct links to `API Keys` and `Pro and Collections`

Success condition:

- the page helps diagnose access failures without duplicating the access explainer pages

### Step 4: Add routing links for deeper help

Make sure every section can hand the user to the right next page:

- client guides from setup
- access pages from account issues
- Motion Lab and Converter docs from product-specific issues

Success condition:

- the user never reaches a dead end

### Step 5: Run a wording consistency pass

Check the full page for:

- bare `Pro`
- `entitlement`
- `premium tools`
- unnecessary jargon
- inconsistent account-versus-key phrasing

Success condition:

- the troubleshooting page matches the newer docs voice and access model

### Step 6: Verify build and scanability

Run the build and manually inspect the page for:

- readable section order
- short, scannable blocks
- working links
- table readability

Success condition:

- the page is both technically valid and easy to scan under frustration

## Files Likely To Change

- `docs-pages.js`

Possible follow-up only if needed:

- `store.js` if an older mirrored docs shell is still user-reachable
- `lib/docs-search-index.js` if search terms or summary text need a refresh after the page is filled in

## Verification Checklist

This pass is complete only if:

1. `docs-troubleshooting` is no longer a placeholder
2. the intro explains what the page covers and how to get more help
3. the page is organized into `MCP setup`, `Access and API keys`, `Motion Lab`, and `Converter`
4. each issue is phrased as a user-visible symptom
5. each issue gives a concrete recovery step
6. the config path table matches the client setup pages
7. access wording matches the `API Keys` and `Pro and Collections` pages
8. the page links to the correct deeper docs and product pages
9. `npm run build` passes

## Bottom Line

The finished troubleshooting page should feel like a reliable recovery guide:

- fast to scan
- specific about what to try next
- consistent with the newer access docs
- supportive when the page does not solve the problem directly

The best final test is simple:

if a user lands on `/docs/troubleshooting` while frustrated, they should be able to find their symptom, try the next step, and understand where to go next in less than a minute.
