# Motion Lab MCP User Guide And UX Hardening Implementation Plan

Date: April 12, 2026
Status: Draft
Owner: Supericons
Scope: Motion Lab only
Depends on:
- `docs/motion-lab-mcp-audit-report.md`
- `docs/motion-lab-mcp-post-implementation-report.md`
- `docs/plans/motion-lab-mcp-user-guide-outline.md`
- `docs/motion-lab-agent-guidance.md`
- `docs/plans/motion-lab-mcp-hosted-endpoints-spec.md`
- `docs/plans/motion-lab-mcp-migration-verification-checklist.md`
- `docs/plans/motion-lab-mcp-release-gates.md`
- `mcp/index.js`
- `mcp/motion-lab.js`
- `mcp/motion-lab-client.js`
- `mcp/workflow-access.js`
- `supabase/functions/_shared/motion-lab/auth.ts`

## Purpose

Turn the post-implementation audit findings into a focused next batch that improves:

- human setup and onboarding
- AI agent usability
- Motion Lab error clarity
- remaining verification coverage
- practical cloning resistance

This plan intentionally avoids reopening the protected Motion Lab boundary we just implemented.

## Problem Statement

The protected Motion Lab MCP path is now implemented, deployed, and live-verified. That means the biggest remaining gaps have shifted.

The current weaknesses are no longer foundational architecture gaps. They are product and operational gaps:

- setup is still harder than it should be
- some Motion Lab errors are too generic
- CSS placeholder output is correct but not self-explanatory enough
- premium icon access failures can still look like icon lookup failures
- negative-path verification is incomplete
- hosted rate limiting is not yet in place

At the same time, one suggested improvement from the audit should **not** be adopted as-is:

- do **not** re-expand `list_motion_presets` with richer semantic fields such as `visual_character` or `recommended_contexts` in the local baseline response

Reason:

- that would weaken the protection boundary we just tightened by moving premium guidance behind hosted flows

## Target User

Primary users:

- human developers setting up and using Motion Lab MCP
- AI coding agents using Motion Lab tools through MCP
- the Supericons owner/operator hardening Motion Lab for real release use

User jobs:

- get Motion Lab working quickly
- understand how to use the right tool
- recover from common failures without guessing
- keep the premium Motion Lab path useful without over-exposing premium logic

## Goals

- publish a clear first-pass user guide for humans and AI agents
- improve Motion Lab tool error clarity and response usability
- finish the most important negative-path verification gaps
- strengthen the hosted premium path with basic abuse resistance

## Non-Goals

- converter improvements
- browser adoption of hosted Motion Lab endpoints
- recommendation tooling
- re-expanding the local Motion Lab baseline with richer premium guidance
- full `supericons-mcp` package release readiness outside Motion Lab

## Guiding Decisions

### Decision 1: User guide now, not later

The hosted Motion Lab path is real enough that the main drop-off is now setup and comprehension, not backend uncertainty.

### Decision 2: Small UX-hardening code pass before broad docs polish

Docs alone should not carry fixes that the tool responses themselves can provide more reliably.

### Decision 3: Keep the local baseline minimal

Do not add richer semantic guidance back into `list_motion_presets` unless a future hosted-safe alternative is designed.

### Decision 4: Treat rate limiting as the next real moat-strengthening task

The premium path is materially safer now, but output scraping by a valid Pro user is still not slowed by server-side controls.

## Workstreams

### Workstream A: Immediate operational cleanup

Purpose:

- remove the one known operational risk from the live verification session

Tasks:

1. Rotate the exposed test API key.
2. Confirm a replacement key works for hosted verification.
3. Record that the exposed key is no longer active.

Deliverable:

- short note in the implementation log or release notes that the exposed key was rotated

Acceptance signal:

- old key revoked
- new key verifies successfully

### Workstream B: Unified user guide

Purpose:

- give humans and AI agents one easy starting point

Primary file:

- `docs/motion-lab-mcp-user-guide.md`

Base structure:

- use `docs/plans/motion-lab-mcp-user-guide-outline.md`

Minimum sections for first draft:

1. What Motion Lab MCP is
2. Quick start
3. IDE-specific setup examples (minimum: Cursor, Claude Desktop)
4. Motion Lab tool map
5. Human developer guide
6. AI agent guide
7. CSS vs animated SVG
8. Hosted premium path explained
9. Protection model explained
10. Troubleshooting
11. Key handling and rotation
12. FAQ

Supporting docs that can either live inside the guide or be split later:

- setup guide
- troubleshooting FAQ
- access tiers explainer
- operator/system prompt template

Acceptance signals:

- a new user can understand setup and first use without reading planning docs
- an AI agent operator can understand the recommended tool order
- the guide explicitly explains `{{ICON_SELECTOR}}`
- the guide includes concrete MCP config examples for supported clients

### Workstream C: Motion Lab UX-hardening code pass

Purpose:

- improve what users and agents see directly from the MCP tools

Target files:

- `mcp/index.js`
- `mcp/workflow-access.js`
- possibly `mcp/auth.js`

Tasks:

1. Differentiate `no API key` from `valid key but not Pro` in workflow-facing Motion Lab errors.
2. Preserve structured Motion Lab error fields in tool responses where possible:
   - `error`
   - `code`
   - `hint`
   - `retryable`
3. Add `selector_instructions` to both CSS-returning Motion Lab tools:
   - `export_motion_css`
   - `animate_icon`
4. Distinguish premium icon access denial from true icon absence in Motion Lab export tools.
5. Add a light prompt in tool descriptions encouraging `get_motion_recipe` before export where that improves behavior.

Explicit non-task:

- do **not** add `visual_character` or `recommended_contexts` to `list_motion_presets`

Acceptance signals:

- a missing key and a non-Pro key produce clearly different guidance
- both CSS-returning tool paths tell the caller what to do with `{{ICON_SELECTOR}}`
- an agent gets access-denied guidance instead of a misleading `not found` path

### Workstream D: Negative-path verification batch

Purpose:

- complete the high-value missing verification set

Target checks:

1. invalid or missing auth
2. valid non-Pro auth
3. invalid preset
4. explicit-selector CSS path
5. malformed animated SVG input
6. hosted outage hard-fail with local fallback disabled

Target files:

- `scripts/verify-motion-lab-hosted-live.mjs`
- new focused verification scripts if needed
- `docs/plans/motion-lab-mcp-migration-verification-checklist.md`
- `docs/plans/motion-lab-mcp-release-gates.md`

Acceptance signals:

- every high-priority negative path has evidence
- the valid non-Pro path confirms the improved error response from Workstream C, not just a generic `403`
- outage behavior is documented and verified

### Workstream E: Rate limiting and abuse resistance

Purpose:

- close the largest remaining moat gap

Target surface:

- hosted Motion Lab endpoints under `supabase/functions/`

First-pass scope:

1. define the rate-limit policy
   - per API key hash
   - per user
   - per time window
2. use a default storage and implementation recommendation
   - default: Supabase/Postgres-backed rate limiting for the first pass
   - fallback: Redis only if measured production load proves Postgres insufficient
   - do not assume a Supabase-native managed limiter or Deno KV path without explicit verification in this project
3. return structured limit errors
4. document the policy in operator docs

Acceptance signals:

- repeated output harvesting is slowed materially
- rate-limit failures are understandable to valid users

## Recommended Execution Order

1. Workstream A: rotate the exposed key
2. Workstream C: small UX-hardening code pass
3. Workstream B: write the unified user guide using the improved error/response behavior
4. Workstream D: finish negative-path verification
5. Workstream E: implement rate limiting

Why this order:

- key rotation is immediate hygiene
- code-level UX fixes should land before final guide wording
- docs are more stable after the response shape and errors are improved
- verification should test the improved behavior, not the older one
- rate limiting is important, but it is a separate server-hardening slice

## File-Level Plan

### New files

- `docs/motion-lab-mcp-user-guide.md`
- optional:
  - `docs/motion-lab-mcp-setup-guide.md`
  - `docs/motion-lab-mcp-troubleshooting.md`
  - `docs/motion-lab-mcp-access-tiers.md`
  - `docs/motion-lab-mcp-operator-prompt-template.md`
- new verification scripts only if the current hosted-live script becomes too broad

### Updated files

- `mcp/index.js`
- `mcp/workflow-access.js`
- `docs/plans/motion-lab-mcp-migration-verification-checklist.md`
- `docs/plans/motion-lab-mcp-release-gates.md`
- `docs/motion-lab-mcp-post-implementation-report.md` if status changes need to be reflected

### Files intentionally not expanded in this batch

- `mcp/motion-lab.js`
  - keep the local baseline minimal
- `mcp/generated/motion-lab-baseline.json`
  - do not add richer premium guidance fields back into the shipped baseline

## Functional Requirements

### Requirement 1: Guide-first usability

The final guide must be understandable to a first-time developer who has not read the architecture docs.

Acceptance signal:

- the guide explains setup, first success, output choice, troubleshooting, and client-specific config examples in plain language

### Requirement 2: Better tool-level guidance

The Motion Lab tools must give users enough context to recover from common mistakes without reading source code.

Acceptance signal:

- error messages and CSS response payloads become more self-explanatory

### Requirement 3: No weakening of the premium boundary

The UX improvements must not re-expose richer premium guidance through the local listing baseline.

Acceptance signal:

- `list_motion_presets` remains limited to the approved baseline fields

### Requirement 4: Verification closes the main remaining confidence gaps

The next verification pass must cover the most meaningful negative paths called out by the audit.

Acceptance signal:

- the verification checklist status improves from `blocked now` or `required later` to `passed` for the targeted cases

### Requirement 5: Moat strengthening continues after docs

The plan must not stop at docs and wording. It must explicitly queue rate limiting as the next protection step.

Acceptance signal:

- rate limiting remains a named implementation workstream, not just a future note

## Risks

- writing the guide before the UX-hardening pass could force needless rewrites
- improving error payloads may require small contract adjustments in MCP responses
- rate limiting implemented too aggressively could make legitimate agent workflows feel brittle
- adding too much detail to setup docs could overwhelm the quick-start reader

## Success Metrics

### Primary metrics

- first-time setup and use become easier to understand from docs and tool responses
- Motion Lab premium-path errors become more actionable
- the remaining high-priority negative paths are verified

### Supporting metrics

- fewer ambiguous `not found` or generic Pro errors
- clearer handling of `{{ICON_SELECTOR}}`
- clearer operator understanding of hosted-only vs fallback behavior

### Guardrail metrics

- `npm run build` still passes
- `npm --prefix mcp run verify:package` still passes
- `npm run verify:motion-lab-hosted-live` still passes after the UX-hardening changes

## Open Questions

1. Should a future `get_mcp_status` tool be added after the guide ships, or only if setup confusion remains high?
2. Should rate limiting happen per API key, per user, per IP, or as a combined policy?

## Recommended Next Step

Start with Workstream A and Workstream C together:

1. rotate the exposed test API key
2. implement the small Motion Lab UX-hardening code pass

Once that lands, write the unified guide from `docs/plans/motion-lab-mcp-user-guide-outline.md`, then run the negative-path verification batch before moving to rate limiting.
