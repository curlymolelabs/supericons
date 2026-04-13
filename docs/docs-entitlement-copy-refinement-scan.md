Date: April 13, 2026
Status: Proposed
Scope: Scan results and proposed wording refinements for entitlement and access copy

Depends on:
- [docs-entitlement-access-copy-audit.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/docs-entitlement-access-copy-audit.md)
- [docs-entitlement-copy-refinement-implementation-plan.md](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs/plans/docs-entitlement-copy-refinement-implementation-plan.md)
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js)

## Purpose

This scan identifies the places where the docs are still unclear about:

- what the Supericons Pro plan is
- what an API key does
- what bought packs unlock
- what Motion Lab and Converter require

This is not another broad audit. It is a practical replacement map for the next wording pass.

## Summary

The first entitlement pass fixed the main factual error, but the docs still have three wording problems:

1. bare `Pro` is still used in places where users may ask "Pro what?"
2. some API key wording still sounds like there may be different key types
3. some premium icon wording still points to the key instead of the account

The docs should consistently say:

- `Supericons Pro plan` when Pro is the requirement
- `Your API key uses the access already on your account`
- `Buying packs gives you the premium icons in those packs`
- `Motion Lab and Converter are separate features in the Supericons Pro plan`

## Canonical Wording To Reuse

### Pro requirement

Use:

- `requires the ${appLink('pricing', 'Supericons Pro plan')}`
- `requires the Supericons Pro plan`

Avoid:

- `requires Pro`
- `need Pro`
- `Access: Pro`

### API key explanation

Use:

- `Use an API key from your Supericons account.`
- `Your API key uses the access already on your account.`
- `There is not a separate Pro key or pack key.`

Avoid:

- `API key linked to Pro`
- `API key linked to a pack`
- `API key linked to a purchase`

### Premium icon access

Use:

- `Premium packs are available when you use an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.`

Avoid:

- `Premium packs are available when your API key is linked to Pro or to the pack your account already owns.`

## Findings And Proposed Replacements

### Group A: Overview pages

#### 1. Quickstart note

File:
- [docs-pages.js:201](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L201)

Current:
- `Your API key does not create new access by itself. Buying packs gives you those packs. Motion Lab and Converter need Pro.`

Problem:
- `need Pro` is too vague
- missing pricing link

Proposed:
- `Your API key does not create new access by itself. Buying packs gives you the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.`

#### 2. What Is Supericons intro

File:
- [docs-pages.js:212](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L212)

Current:
- `Exporting, downloading, or copying the final output requires Pro. Through MCP, Motion Lab and Converter tools are also Pro-only.`

Problem:
- bare `Pro`
- no pricing link

Proposed:
- `Exporting, downloading, or copying the final output requires the ${appLink('pricing', 'Supericons Pro plan')}. Through MCP, Motion Lab and Converter tools are also part of the ${appLink('pricing', 'Supericons Pro plan')}.`

#### 3. MCP tools overview intro

File:
- [docs-pages.js:631](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L631)

Current:
- `Premium icon access depends on the packs or Pro access already on your account. Motion Lab and Converter tools require Pro, plus a valid SUPERICONS_API_KEY.`

Problem:
- `Pro access` is vague
- `require Pro` is vague

Proposed:
- `Premium icon access depends on what your account already has: the packs you bought, the ${appLink('pricing', 'Supericons Pro plan')}, or both. Motion Lab and Converter tools require the ${appLink('pricing', 'Supericons Pro plan')} and a valid <code>SUPERICONS_API_KEY</code>.`

#### 4. MCP overview note

File:
- [docs-pages.js:664](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L664)

Current:
- `Premium animated icon collections from get_icon and search_icons require either Pro or access to the pack your account already owns, plus a valid API key.`

Problem:
- bare `Pro`
- slightly awkward pack wording

Proposed:
- `Premium animated icon collections from <code>get_icon</code> and <code>search_icons</code> require an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.`

### Group B: Icon tool pages

#### 5. Icon tools intro

File:
- [docs-pages.js:682](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L682)

Current:
- `Premium animated icon collections from these tools require either Pro or access to the pack your account already owns.`

Problem:
- bare `Pro`

Proposed:
- `Premium animated icon collections from these tools require either the ${appLink('pricing', 'Supericons Pro plan')} or an account that already owns those packs.`

#### 6. search_icons premium-pack sentence

File:
- [docs-pages.js:686](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L686)

Current:
- `Premium packs are available when your API key is linked to Pro or to the pack your account already owns.`

Problem:
- sounds like the key itself has tiers

Proposed:
- `Premium packs are available when you use an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.`

#### 7. get_icon premium-icon sentence

File:
- [docs-pages.js:711](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L711)

Current:
- `Premium icons require an API key linked to Pro or to the pack your account already owns.`

Problem:
- same key-tier confusion

Proposed:
- `Premium icons require an API key from an account that already owns those packs, or from an account with the ${appLink('pricing', 'Supericons Pro plan')}.`

#### 8. get_icon access line

File:
- [docs-pages.js:730](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L730)

Current:
- `Access: Free for standard icons. Premium animated icons require Pro or access to the pack your account already owns.`

Problem:
- bare `Pro`

Proposed:
- `Access: Free for standard icons. Premium animated icons require the ${appLink('pricing', 'Supericons Pro plan')} or an account that already owns those packs.`

### Group C: Motion Lab pages

#### 9. Motion Lab MCP intro

File:
- [docs-pages.js:749](d:/Personal/Business/Curly%20Mole%20Labs/Experiments\Apps\DailySprint\supericons/docs-pages.js#L749)

Current:
- `These five tools expose Motion Lab capabilities to your coding agent. All five require Pro, plus a valid SUPERICONS_API_KEY.`

Problem:
- bare `Pro`

Proposed:
- `These five tools expose Motion Lab capabilities to your coding agent. All five require the ${appLink('pricing', 'Supericons Pro plan')} plus a valid <code>SUPERICONS_API_KEY</code>.`

#### 10. Motion Lab introduction access bullets

File:
- [docs-pages.js:1042](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L1042)
- [docs-pages.js:1043](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L1043)

Current:
- `Exporting CSS or SVG requires Pro.`
- `All Motion Lab tools require Pro plus a valid API key.`

Problem:
- bare `Pro`
- missing pricing link

Proposed:
- `Exporting CSS or SVG requires the ${appLink('pricing', 'Supericons Pro plan')}.`
- `All Motion Lab tools require the ${appLink('pricing', 'Supericons Pro plan')} plus a valid API key from your Supericons account.`

#### 11. Motion Lab exports summary and step text

File:
- [docs-pages.js:1220](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L1220)
- line inside exports list where the step says `Requires Pro`

Current:
- `Both require Pro.`
- `(Requires Pro)`

Problem:
- bare `Pro`

Proposed:
- `Both require the ${appLink('pricing', 'Supericons Pro plan')}.`
- `(Requires the ${appLink('pricing', 'Supericons Pro plan')})`

#### 12. Motion Lab client setup prerequisites

File:
- [docs-pages.js:1362](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L1362)

Current:
- `A Supericons API key linked to a Pro account`

Problem:
- still suggests a special Pro key

Proposed:
- `An API key from a Supericons account with the ${appLink('pricing', 'Supericons Pro plan')}`

### Group D: Converter pages

#### 13. Converter MCP intro

File:
- [docs-pages.js:864](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L864)

Current:
- `All four require Pro.`

Problem:
- bare `Pro`

Proposed:
- `All four require the ${appLink('pricing', 'Supericons Pro plan')}.`

#### 14. Converter guide summary and intro

File:
- [docs-pages.js:1477](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L1477)
- [docs-pages.js:1480](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L1480)

Current:
- `Preview in the browser, then download with Pro.`
- `Downloading the converted result requires Pro.`

Problem:
- both use bare `Pro`

Proposed:
- `Preview in the browser, then download with the ${appLink('pricing', 'Supericons Pro plan')}.`
- `Downloading the converted result requires the ${appLink('pricing', 'Supericons Pro plan')}.`

### Group E: Setup pages

#### 15. Universal setup callout

File:
- [docs-pages.js:323](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L323)

Current:
- `Your key uses the access already on your account. Bought packs unlock those packs. Motion Lab and Converter require Pro.`

Problem:
- final sentence still uses bare `Pro`

Proposed:
- `Your key uses the access already on your account. Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.`

#### 16. Claude, Codex, and Cursor troubleshooting cards

Files:
- [docs-pages.js:425](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L425)
- [docs-pages.js:498](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L498)
- [docs-pages.js:565](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js#L565)

Current pattern:
- `Bought packs unlock those packs. Motion Lab and Converter require Pro.`

Problem:
- bare `Pro`

Proposed pattern:
- `Bought packs unlock the premium icons in those packs. Motion Lab and Converter require the ${appLink('pricing', 'Supericons Pro plan')}.`

## Recommended Priority

### Highest-value replacements first

1. bare `requires Pro` sentences on overview pages
2. API-key-tier confusion on icon tool pages
3. Motion Lab and Converter MCP intros
4. Motion Lab client setup prerequisite sentence

### Nice-to-have cleanup after that

1. replace remaining `Access: Pro` with `Access: Supericons Pro plan`
2. add one small clarification sentence to the future `Pro and Collections` page:
   - `There is not a separate Pro key or pack key. Your API key uses the access already on your account.`

## What This Scan Does Not Propose

- changing the actual access model
- rewriting the whole docs structure
- rewriting pages that are already clear and factual just for tone

This pass is about removing user confusion, not rewriting everything.

## Bottom Line

The next live edit pass should make three things obvious:

1. `Pro` means the Supericons Pro plan
2. API keys do not come in different access tiers
3. Buying packs gives you those packs, but Motion Lab and Converter are separate features in the Supericons Pro plan
