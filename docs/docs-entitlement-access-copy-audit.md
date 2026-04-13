Date: April 13, 2026
Status: Audit
Scope: Live docs entitlement copy for premium icons vs Pro workflow tools

## Canonical Rule

The docs need one consistent entitlement model:

1. Free users can browse and use free icons.
2. Pack or premium collection owners can access only the premium icon assets they own.
3. Motion Lab and Converter are workflow tools and require Pro.
4. The same rule applies in MCP:
   - premium icon assets can follow ownership
   - Motion Lab and Converter tools are Pro-only
5. An API key carries account entitlement but does not create entitlement.

The current docs blur together:

- premium icon ownership
- Pro workflow access

That is the root copy problem.

## Audit Verdict

The docs currently contain a real entitlement inconsistency.

Some pages correctly say Motion Lab and Converter are Pro-only.
Other pages incorrectly say a premium collection purchase also unlocks Motion Lab and Converter.

This is misleading for:

- pack owners without Pro
- bundle owners without Pro
- anyone trying to understand why premium icons work but workflow tools do not

## Severity

### High

Live docs pages that directly describe Motion Lab or Converter access incorrectly.

### Medium

Quickstart, client setup, and MCP reference pages that combine icon ownership and workflow access into one entitlement sentence.

### Low

Placeholder or legacy docs copy that is not the primary live surface today, but should still be cleaned up before it causes future drift.

## Findings

### F1. Quickstart premium setup collapses two entitlement models into one

File:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):184

Current issue:

- says premium animated collections, Motion Lab, and Converter all share the same access rule
- says a `Pro account or a premium collection purchase` is enough

Why this is wrong:

- premium icon ownership and workflow tool access are not the same
- pack ownership should not be described as unlocking Motion Lab or Converter

Suggested fix:

- split this into two bullets:
  - premium icon assets: Pro or owned collection/pack
  - Motion Lab / Converter / workflow tools: Pro only

Suggested replacement direction:

- `To access premium icon assets through MCP, your account needs either Pro or ownership of the relevant collection or pack.`
- `To use Motion Lab and Converter through MCP, your account needs Pro.`

### F2. Key entitlement note repeats the wrong combined rule

File:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):201

Current issue:

- says lack of `Pro account or a premium collection purchase` means no premium tools

Why this is wrong:

- pack ownership can unlock premium icon assets
- it should not be described as unlocking Motion Lab or Converter tools

Suggested fix:

- change `premium tools` into two explicit categories:
  - premium icon assets
  - Pro workflow tools

### F3. “What Is Supericons” page overstates browser and MCP workflow access

File:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):212

Current issue:

- says browser export requires `Pro account or a premium collection purchase`
- says MCP Motion Lab and Converter require `Pro account or a premium collection purchase`

Why this is wrong:

- browser exports for Motion Lab and Converter should be Pro-only
- MCP workflow tools should be Pro-only

Suggested fix:

- keep the browser preview statement
- change export/tool access language to Pro-only

Suggested replacement direction:

- `In the browser, you can open Motion Lab and Converter, use the controls, and preview the result without a paid plan. Exporting, downloading, or copying the final workflow output requires Pro. Through MCP, Motion Lab and Converter tools are also Pro-only.`

### F4. MCP setup guides repeatedly say pack ownership unlocks Motion Lab and Converter tools

Files:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):306
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):323
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):396
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):413
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):425
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):486
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):498
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):553
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):565

Current issue:

- setup pages repeatedly describe Motion Lab and Converter tool access as unlocked by either Pro or a premium collection purchase

Why this is wrong:

- these are workflow tools
- workflow tooling should be described as Pro-only

Suggested fix:

- use one standard sentence everywhere:
  - `Your API key must be linked to a Pro account to use Motion Lab and Converter tools.`
- where premium icon assets are also mentioned, separate them:
  - `Owned premium packs and collections still control which premium icon assets your account can access.`

### F5. MCP tools overview misclassifies 9 tools as “Pro or premium collection purchase”

Files:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):631
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):649
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):650
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):651
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):652
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):653
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):654
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):655
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):656
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):657

Current issue:

- all Motion Lab and Converter tools are listed as accessible via `Pro account or premium collection purchase`

Why this is wrong:

- those nine tools are workflow tools and should be Pro-only

Suggested fix:

- change the access column for all Motion Lab and Converter tools to `Pro only`
- keep icon-tool premium asset notes separate

### F6. Motion Lab MCP reference page is consistently wrong about access

Files:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):749
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):762
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):788
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):817
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):828
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):854

Current issue:

- every Motion Lab tool page says `Pro account or premium collection purchase`

Suggested fix:

- replace all of these with `Pro only`

### F7. Converter MCP reference page is consistently wrong about access

Files:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):864
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):873
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):897
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):922
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):949

Current issue:

- every Converter tool page says `Pro account or premium collection purchase`

Suggested fix:

- replace all of these with `Pro only`

### F8. Motion Lab product docs overstate access in browser and MCP

Files:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1042
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1043
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1220
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1229
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1362

Current issue:

- browser export access described as `Pro account or premium collection purchase`
- MCP Motion Lab setup prereqs described the same way

Suggested fix:

- make Motion Lab export and MCP access Pro-only
- if the page also mentions premium icon assets, separate that concern

### F9. Converter product docs overstate browser download access

Files:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1477
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1480

Current issue:

- says browser download is available with `Pro account or a premium collection purchase`

Suggested fix:

- change to `Pro`

### F10. Access placeholder page already describes the correct distinction and should be used to clean the rest

Files:
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1717
- [docs-pages.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/docs-pages.js):1720

Observation:

- the placeholder intent is actually correct
- it explicitly distinguishes:
  - what Pro unlocks
  - what premium collection purchase unlocks

Recommendation:

- use this distinction as the basis for a future real `Pro and Collections` page

## Lower-Priority Legacy Copy

The following stale or legacy docs copy in [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js) should also be cleaned up eventually, but it is lower priority if the live docs route is now driven primarily by `docs-pages.js`:

- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):4792
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):4862
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):4931
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):5246
- [store.js](d:/Personal/Business/Curly%20Mole%20Labs/Experiments/Apps/DailySprint/supericons/store.js):5300

These use language like:

- `premium collections or Pro workflow tools`
- `collections and tools you can access depend on what your account owns`

That wording is too loose for workflow tooling.

## Fix Strategy

### 1. Introduce one canonical vocabulary

Use these terms consistently:

- `premium icon assets`
- `owned packs and collections`
- `Pro workflow tools`
- `Motion Lab and Converter are Pro-only`

Avoid:

- `premium tools`
- `premium access` when the sentence actually mixes icons and workflow tools
- `Pro account or premium collection purchase` for Motion Lab or Converter

### 2. Split icon access from workflow access everywhere

Recommended pattern:

- `Premium icon assets require either Pro or ownership of the relevant pack or collection.`
- `Motion Lab and Converter require Pro.`

### 3. Fix the MCP overview tables first

This is the highest-leverage correction because users skim tables more than prose.

### 4. Fix Motion Lab and Converter product pages second

These pages are where the wrong expectation is most likely to frustrate paying collection owners.

### 5. Fix setup guides third

Setup pages should explicitly explain:

- why a pack owner can still use premium icon assets
- why that same owner still cannot use Motion Lab or Converter without Pro

## Suggested Replacement Patterns

### For mixed-access pages

Use:

- `Owned packs and collections unlock the premium icon assets attached to those purchases.`
- `Motion Lab and Converter are Pro workflow tools and require Pro in both the browser export path and MCP.`

### For Motion Lab and Converter pages

Use:

- `Access: Pro only.`

### For API key notes

Use:

- `Your API key carries your account entitlement. It can unlock owned premium icon assets if your account owns them, but Motion Lab and Converter still require Pro.`

## Bottom Line

The docs do not currently have a small wording issue.

They have a repeated entitlement-model issue:

- premium icon ownership is being described as if it also unlocks Motion Lab and Converter

That should be corrected before more docs expansion happens, because this is exactly the kind of mismatch that creates support friction for paying pack owners.
