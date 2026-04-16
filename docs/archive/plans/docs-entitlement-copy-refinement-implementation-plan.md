Date: April 13, 2026
Status: Expanded
Scope: Scan and refine entitlement and access wording across the docs pages

Depends on:
- [docs-entitlement-access-copy-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/docs-entitlement-access-copy-audit.md)
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)

## Objective

Fix the docs so they explain access clearly and correctly:

- buying a pack or collection gives access to those premium icon assets
- Motion Lab and Converter are separate workflow tools
- Motion Lab and Converter require the Supericons Pro plan

The copy should be:

- simple
- direct
- easy for normal users to understand
- free of internal product or developer wording
- explicit about what "Pro" means
- explicit that API keys do not come in different access tiers

## Problem To Fix

Right now, some docs pages blur together two different things:

1. owning premium icon assets
2. using workflow tools like Motion Lab and Converter

That creates the wrong expectation for users who bought packs or bundle collections but do not have Pro.

Those users should understand:

- yes, they can use the premium icons they bought
- no, that does not give them Motion Lab or Converter

There is also a second wording problem:

- some pages say `requires Pro` without saying `Pro plan` or `Pro subscription`
- some pages say an API key is `linked to Pro` or `linked to a purchase`

That language is confusing because it suggests there may be different kinds of API keys. If both pack buyers and Pro subscribers can generate API keys, the docs should make the account the source of truth and the key the transport mechanism.

## Writing Rules

Use these as the copy rules for the whole pass.

### Rule 1: Name the paid product clearly

Prefer:

- `premium icons you own`
- `packs and collections you bought`
- `the ${appLink('pricing', 'Supericons Pro plan')}`
- `the Supericons Pro plan`
- `the Supericons Pro subscription`

Avoid:

- `entitlement`
- `workflow tool access`
- `premium tool surface`
- `account-linked unlock path`
- bare `Pro` when a user might reasonably ask "Pro what?"

### Rule 2: Split icon access from tool access every time

Do not combine them in one fuzzy sentence.

Use two separate ideas:

- `Bought packs and collections unlock the premium icons included in those purchases.`
- `Motion Lab and Converter require the Supericons Pro plan.`

### Rule 3: Keep API key wording simple

Prefer:

- `Your API key uses the access already on your account.`
- `There is not a separate Pro key or pack key.`
- `What you can access depends on your account.`

Avoid:

- `Your API key carries your account entitlement.`
- `API key linked to Pro`
- `API key linked to a purchase`
- `Pro key`

### Rule 4: Use short, stable wording across pages

The same access rule should not be rewritten five different ways.

The copy should be consistent enough that users see the same answer everywhere.

### Rule 5: Add the pricing link when Pro is a requirement

When a sentence tells the user they need Pro, prefer:

- `requires the ${appLink('pricing', 'Supericons Pro plan')}`

Use plain `Pro plan` only when the sentence is already inside a clearly Pro-focused area and another link would feel repetitive.

### Rule 6: Keep "account" as the source of truth

If a sentence explains access, it should usually point to the account, not the key.

Prefer:

- `Use an API key from your Supericons account.`
- `Bought packs unlock those packs on your account.`
- `The Supericons Pro plan unlocks Motion Lab and Converter on your account.`

## Canonical User-Facing Access Model

This is the model every docs page should follow.

### Free users

- can browse and use free icons
- can preview Motion Lab and Converter in the browser
- cannot export Motion Lab or Converter results
- cannot use Motion Lab or Converter through MCP

### Pack or collection buyers without Pro

- can access the premium icons included in the packs or collections they bought
- cannot use Motion Lab or Converter just because they bought packs or collections
- can still use an API key, but that key only uses the pack access already on the account

### Pro users

- can access Pro workflow tools
- can use Motion Lab
- can use Converter
- can use Motion Lab and Converter through MCP
- can also use premium icons available through Pro

## Scan Strategy

The next refinement pass should not rely only on obvious access pages. It should scan for any wording that can confuse users about:

- what "Pro" means
- what an API key does
- whether pack buyers and Pro subscribers get different keys
- whether pack ownership unlocks Motion Lab or Converter

### Scan targets

Search for these phrase families in [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):

- `requires Pro`
- `require Pro`
- `Pro only`
- `linked to Pro`
- `linked to`
- `API key`
- `premium collection purchase`
- `premium packs`
- `Motion Lab and Converter`
- `requires a Pro`
- `Access: Pro`

Also scan placeholder pages and support pages for future drift:

- `docs-access-api-keys`
- `docs-access-premium`
- `docs-troubleshooting`

### What to flag during the scan

Flag any sentence that has one or more of these problems:

1. uses bare `Pro` without saying `plan` or `subscription`
2. says or implies the key itself has a tier
3. mixes pack ownership and Pro tool access in one sentence
4. mentions a Pro requirement without linking to pricing where that link would help
5. uses internal language like `entitlement`

## Proposed Wording Model

Use these as the default replacements.

### A. When the requirement is truly Pro-only

Prefer:

- `requires the ${appLink('pricing', 'Supericons Pro plan')}`
- `requires the Supericons Pro plan`
- `Access: ${appLink('pricing', 'Supericons Pro plan')}`

Avoid:

- `requires Pro`
- `Access: Pro`

### B. When the sentence explains API keys

Prefer:

- `Use an API key from your Supericons account.`
- `Your API key uses the access already on your account.`
- `There is not a separate Pro key or pack key.`

Avoid:

- `API key linked to Pro`
- `API key linked to a premium collection purchase`
- `your key carries entitlement`

### C. When the sentence explains premium icon access

Prefer:

- `Premium packs are available when the account behind your API key already owns those packs, or has the ${appLink('pricing', 'Supericons Pro plan')}.`
- `Premium icons require an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.`

Avoid:

- `Premium packs are available when your API key is linked to Pro or to the pack your account already owns.`

### D. When the sentence explains pack vs tool access

Prefer:

- `Buying packs gives you the premium icons in those packs.`
- `Motion Lab and Converter are separate features in the ${appLink('pricing', 'Supericons Pro plan')}.`

## Proposed Refinements By Copy Pattern

### Pattern 1: bare Pro requirement

Current style:

- `Exporting, downloading, or copying the final output requires Pro.`

Proposed style:

- `Exporting, downloading, or copying the final output requires the ${appLink('pricing', 'Supericons Pro plan')}.`

### Pattern 2: vague MCP tool requirement

Current style:

- `Motion Lab and Converter tools require Pro, plus a valid SUPERICONS_API_KEY.`

Proposed style:

- `Motion Lab and Converter tools require the ${appLink('pricing', 'Supericons Pro plan')} and a valid Supericons API key.`

### Pattern 3: confusing API-key-tier wording

Current style:

- `Premium packs are available when your API key is linked to Pro or to the pack your account already owns.`

Proposed style:

- `Premium packs are available when you use an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.`

### Pattern 4: setup-page ambiguity

Current style:

- `Your key must be linked to an account with a Pro account or a premium collection purchase.`

Proposed style:

- `Use an API key from your Supericons account. Bought packs unlock those packs on your account. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.`

## Proposed Refinements By Page Group

### Group A: overview and first-impression pages

Focus:

- expand bare `Pro` into `Supericons Pro plan`
- add pricing links where the page is teaching access
- make the pack-vs-tool split explicit in one short sentence

Pages:

1. `docs-quickstart`
2. `docs-what-is-supericons`
3. `docs-mcp-tools`

### Group B: tool reference pages

Focus:

- keep access labels short but explicit
- prefer `Access: Supericons Pro plan` or `Access: Pro plan`
- remove any lingering suggestion that pack ownership unlocks tools

Pages:

1. `docs-mcp-motion`
2. `docs-mcp-converter`

### Group C: product guide pages

Focus:

- make browser preview vs paid export language obvious
- spell out that `Pro` means the Supericons Pro plan

Pages:

1. `docs-motion-lab`
2. `docs-motion-lab-exports`
3. `docs-motion-lab-client-setup`
4. `docs-converter-guide`

### Group D: client setup pages

Focus:

- remove any wording that sounds like different API key tiers
- explain that the account determines access
- mention bought packs and Pro plan separately

Pages:

1. `docs-mcp-universal`
2. `docs-claude-code`
3. `docs-codex`
4. `docs-cursor`
5. `docs-mcp-others`

### Group E: future placeholder pages

Focus:

- build future pages from the same wording model so drift does not come back

Pages:

1. `docs-access-api-keys`
2. `docs-access-premium`
3. `docs-troubleshooting`

## Page Groups To Fix

### Group A: Highest priority

These pages shape the user’s first understanding of access.

1. MCP quickstart and setup overview
2. What Is Supericons
3. MCP tools overview
4. Motion Lab MCP tools
5. Converter MCP tools

### Group B: Product guides

These pages should repeat the same rules in simpler product language.

1. Motion Lab introduction
2. Motion Lab exports
3. Motion Lab client setup
4. Converter guide

### Group C: Client setup pages

These need careful wording because users often land here when something is not working.

1. Claude Code setup
2. Codex setup
3. Cursor setup
4. universal MCP setup pages in `docs-pages.js`

### Group D: Lower-priority cleanup

These are useful but not the first pages users rely on.

1. placeholder access page
2. troubleshooting placeholder
3. older fallback docs text in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) if still reachable

## Copy Strategy

### 1. Run the scan first

Search the full docs surface for:

- bare `Pro`
- `linked to`
- `premium collection purchase`
- `entitlement`

Then classify each hit into:

- keep
- rewrite
- split into two sentences
- add pricing link

### 2. Replace confusing mixed-access sentences

Any sentence that currently blends pack ownership and tool access should be split into:

- icon ownership language
- Pro plan language

### 3. Clarify every API key sentence

Any sentence that mentions an API key should be reviewed for:

- does it imply key types?
- does it point to the account as the source of truth?
- does it explain pack access and Pro plan access cleanly?

Do not use long labels in every table row unless the distinction really needs explanation.

### 4. Simplify access labels in tables

Use labels like:

- `Free`
- `Owned packs or Supericons Pro plan`
- `Supericons Pro plan`

Avoid vague labels like:

- `Pro`
- `premium access`

### 5. Add one plain-language clarification where it matters most

Recommended reusable sentence:

`Buying packs gives you the premium icons in those packs. Motion Lab and Converter are separate features in the ${appLink('pricing', 'Supericons Pro plan')}.`

This should appear in at least:

- one prominent overview page
- one setup page

### 6. Keep browser preview wording clear

Use simple language like:

- `You can preview Motion Lab and Converter in the browser without Pro.`
- `To export the final result, you need the Supericons Pro plan.`

## Suggested Wording Patterns

### For overview pages

Use:

- `Bought packs and collections unlock the premium icons included in those purchases.`
- `Motion Lab and Converter are separate Pro features.`

### For MCP setup pages

Use:

- `Your API key uses the access your account already has.`
- `If you bought packs or collections, your account can use those premium icons.`
- `If you want Motion Lab or Converter through MCP, you need Pro.`

### For tool reference pages

Use:

- `Access: Pro only.`

### For product pages

Use:

- `Preview is available in the browser. Export requires Pro.`

## Execution Plan

### Step 1: Run the wording scan and classify every hit

Capture each hit in one of these buckets:

- vague Pro naming
- missing pricing link
- confusing API key wording
- mixed pack/tool access wording
- internal language

Success condition:

- every affected sentence has a proposed replacement before the next live edit pass

### Step 2: Fix the main overview pages

Update the wording in:

- docs quickstart
- What Is Supericons
- MCP Tools Overview

Success condition:

- a new user can understand the difference between pack ownership and Pro without reading multiple pages

### Step 3: Fix the Motion Lab and Converter reference pages

Update:

- Motion Lab MCP tools
- Converter MCP tools
- Motion Lab guide and exports pages
- Converter guide

Success condition:

- no Motion Lab or Converter page claims that pack ownership alone unlocks those tools

### Step 4: Fix the client setup pages

Update:

- Claude Code
- Codex
- Cursor
- shared setup guidance

Success condition:

- setup pages explain why a user may have premium icons but still not have Motion Lab or Converter
- setup pages never imply there are different API key types

### Step 5: Add one clear access page later

Use the future `Pro and Collections` page to explain the model in one place, then point overview pages to it.

This is not required for the first correction pass, but it should become the long-term home for this explanation.

## Files Likely To Change

- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- optionally [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) if stale legacy docs copy is still user-visible

## Verification

This pass is complete only if:

1. the main overview pages no longer say that pack ownership unlocks Motion Lab or Converter
2. every user-facing Pro requirement says `Pro plan`, `Pro subscription`, or `Supericons Pro plan`
3. the pages that teach access include pricing links where helpful
4. setup pages explain access in plain language
5. API key wording points to the account as the source of truth
6. the wording is consistent across the docs
7. `npm run build` passes

## Bottom Line

This pass should make one thing obvious to users:

`Buying packs gives you the premium icons you bought. Motion Lab and Converter are separate features in the Supericons Pro plan.`

That is the clearest and most user-friendly version of the truth, and the docs should say it everywhere.
