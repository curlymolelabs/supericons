Date: April 13, 2026
Status: Proposed
Scope: Refine and fill the Access and API Keys docs section with clearer, user-friendly copy

Depends on:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)
- [docs-entitlement-access-copy-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/docs-entitlement-access-copy-audit.md)
- [docs-entitlement-copy-refinement-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/docs-entitlement-copy-refinement-implementation-plan.md)
- [docs-entitlement-copy-refinement-scan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/docs-entitlement-copy-refinement-scan.md)

## Objective

Turn the `Access and API Keys` section into a clear, trustworthy part of the docs that answers the questions users actually have:

- What does an API key do?
- What does it not do?
- What do I get if I bought packs or collections?
- What do I get with the Supericons Pro plan?
- Why do premium icons work for me, but Motion Lab or Converter do not?

The section should reduce confusion, lower support friction, and help users quickly understand what to do next.

## Why This Section Matters

This section is not just reference material. It is a decision page.

Users come here when they are unsure about:

- whether they need an API key
- whether they need the Supericons Pro plan
- whether buying packs is enough
- why a feature is locked
- where to go to fix account or access issues

If this section is vague, the user leaves with the same confusion they arrived with.

If it is done well, the user should leave with:

1. a correct mental model
2. a clear next action
3. less anxiety about whether something is broken

## Problem Statement

Right now the section is still placeholder-driven:

- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1699
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1713

That means the docs group exists, but the content does not yet do the real job.

The biggest UX risks are:

- users confuse API keys with access tiers
- users think pack ownership unlocks Motion Lab or Converter
- users do not know whether the source of truth is the key or the account
- users do not know whether to go to Pricing, API Keys, or a setup guide next

## User Tasks This Section Must Support

### Primary tasks

1. Understand what an API key is for
2. Understand what access comes from the account
3. Understand the difference between bought packs and the Supericons Pro plan
4. Know which page to open next

### Secondary tasks

1. Confirm whether Motion Lab and Converter require the Supericons Pro plan
2. Confirm whether bought packs still work through MCP
3. Find the API Keys page quickly
4. Find Pricing quickly

## Success Criteria

After reading this section, a user should be able to say:

- `My API key uses the access already on my account.`
- `Buying packs gives me the premium icons in those packs.`
- `Motion Lab and Converter are part of the Supericons Pro plan.`
- `If I need to fix access, I know whether to open Pricing, API Keys, or the setup guide I am using.`

## UX Writing Principles

### 1. Start with the user question, not product structure

Do not write from the system point of view.

Prefer:

- `Your API key does not create new access by itself.`
- `Buying packs gives you the premium icons in those packs.`

Avoid:

- `Account entitlement is resolved at request time.`
- `The key transports account-scoped privileges.`

### 2. Use one idea per sentence

These pages should not stack multiple access rules into one long sentence.

Prefer short, separated statements:

- `Use an API key from your Supericons account.`
- `Your key uses the access already on that account.`
- `There is not a separate Pro key or pack key.`

### 3. Define the source of truth clearly

The account is the source of truth. The key is how the app or MCP client identifies that account.

This idea should be repeated clearly and consistently.

### 4. Be explicit about `Pro`

Do not use bare `Pro` when the page is teaching access.

Use:

- `the ${appLink('pricing', 'Supericons Pro plan')}`
- `the Supericons Pro plan`

### 5. Focus on reassurance and next steps

This section should help the user feel:

- `I understand why this is happening`
- `I know what to do next`

Not:

- `I need to decode product jargon`

## Information Architecture For This Section

This section should become two real pages:

1. `API Keys`
2. `Pro and Collections`

These two pages should work together, but each should have a different job.

### Page 1: API Keys

Job:

- explain what the key is
- explain what the key does
- explain what the key does not do
- explain when the user needs one

### Page 2: Pro and Collections

Job:

- explain the difference between bought packs and the Supericons Pro plan
- explain how that affects icons, Motion Lab, and Converter
- explain why a user can have one without the other

## Page Purpose And Content Plan

### `docs-access-api-keys`

#### Purpose

This page should answer:

- `What is an API key for?`
- `Do I need one?`
- `Does the key itself unlock anything?`

#### Core message

Use an API key from your Supericons account. The key uses the access already on your account. It does not create new access by itself.

#### Proposed structure

1. Short plain-language intro
2. `What an API key does`
3. `What an API key does not do`
4. `When you need one`
5. `What determines access`
6. `Next steps`

#### Suggested content blocks

`What an API key does`

- signs your app or MCP client into your Supericons account
- lets tools check what your account can access
- is needed for MCP and other programmatic use

`What an API key does not do`

- it does not upgrade your account
- it does not turn bought packs into Motion Lab or Converter access
- it is not a special Pro key or pack key

`When you need one`

- when you use MCP
- when you connect Supericons outside the browser UI

`What determines access`

- bought packs unlock the premium icons in those packs
- the Supericons Pro plan unlocks Motion Lab and Converter

#### UX note

This page should include one visible reassurance line near the top:

`There is not a separate Pro key or pack key. Your API key uses the access already on your account.`

### `docs-access-premium`

#### Purpose

This page should answer:

- `What is the difference between bought packs and the Supericons Pro plan?`
- `Why do some things work for me while other things stay locked?`

#### Core message

Buying packs gives you the premium icons in those packs. Motion Lab and Converter are separate features in the Supericons Pro plan.

#### Proposed structure

1. Short plain-language intro
2. `What bought packs give you`
3. `What the Supericons Pro plan gives you`
4. `Why this can feel confusing`
5. `Quick examples`
6. `Next steps`

#### Suggested content blocks

`What bought packs give you`

- the premium icons in the packs or collections you bought
- access to those icons through your account
- the same icon access when you use an API key from that account

`What the Supericons Pro plan gives you`

- Motion Lab
- Converter
- their browser export paths
- their MCP tools

`Why this can feel confusing`

- because icon access and tool access are different
- because users may already have premium icons without having the Supericons Pro plan

`Quick examples`

- `I bought a pack, so I can use those premium icons.`
- `I did not buy the Supericons Pro plan, so Motion Lab and Converter stay locked.`
- `I have the Supericons Pro plan, so I can use Motion Lab and Converter too.`

#### UX note

This page should include a small comparison table or list, but the copy should stay sentence-first and explanation-first.

## Proposed Page Flow

### API Keys page flow

1. Reassure
2. Explain the key
3. Explain the limit of the key
4. Point to account-based access
5. Link to API Keys and Pricing

### Pro and Collections page flow

1. State the split clearly
2. Show what each path unlocks
3. Address the common confusion directly
4. Point to Pricing and API Keys

## Copy Patterns To Reuse

### Canonical lines

Use these exact patterns across the section:

- `Use an API key from your Supericons account.`
- `Your API key uses the access already on your account.`
- `There is not a separate Pro key or pack key.`
- `Buying packs gives you the premium icons in those packs.`
- `Motion Lab and Converter are part of the ${appLink('pricing', 'Supericons Pro plan')}.`

### Avoid these patterns

- `entitlement`
- `linked to Pro`
- `linked to a purchase`
- `premium tools`
- `account-linked unlock path`
- `requires Pro` without saying `plan`

## Calls To Action

Each page should end with clear next steps.

### API Keys page CTAs

- `Open API Keys`
- `Read Quickstart`
- `View Pricing`

### Pro and Collections page CTAs

- `View Pricing`
- `Open API Keys`
- `Go to Motion Lab`
- `Go to Converter`

## Content Tone

The tone should be:

- calm
- helpful
- plain
- confident

The tone should not feel:

- legal
- technical
- defensive
- internal

## Implementation Steps

### Step 1: Replace placeholder pages with real content

Fill:

- `docs-access-api-keys`
- `docs-access-premium`

Success condition:

- both pages are real, readable, and actionable

### Step 2: Make the page purpose obvious in the first screenful

The first paragraph of each page should answer the main user question directly.

Success condition:

- the user does not need to scroll to understand the page's purpose

### Step 3: Add one strong clarification block per page

Use one callout or plain-language block that addresses the most common confusion:

- API Keys page: `The key does not create new access`
- Pro and Collections page: `Bought packs and the Supericons Pro plan do different things`

Success condition:

- the biggest misunderstanding is answered before the user gets lost

### Step 4: Add clear next-step links

Every page should end by helping the user move forward.

Success condition:

- the user knows where to go next without guessing

### Step 5: Verify wording consistency

Check that these pages match the rest of the docs:

- `Pro` always means `Supericons Pro plan`
- account is the source of truth
- API key is not described as a tier

## Files Likely To Change

- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)

## Verification

This pass is complete only if:

1. `docs-access-api-keys` is a real page, not a placeholder
2. `docs-access-premium` is a real page, not a placeholder
3. each page has a clear first-paragraph purpose
4. the copy uses simple, user-facing language
5. the copy makes the account, not the key, the source of truth
6. the copy clearly separates pack ownership from the Supericons Pro plan
7. each page includes the right next-step links
8. `npm run build` passes

## Bottom Line

This section should do one job well:

help users understand what they have, what they need, and what to do next.

The best final test is simple:

if a user who bought packs but does not have the Supericons Pro plan reads these pages, they should immediately understand why premium icons work for them, but Motion Lab and Converter do not.
