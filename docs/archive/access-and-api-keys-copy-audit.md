# Access and API Keys - Copywriting Quality Audit

Date: 2026-04-14
Status: Audit
Scope: Copywriting quality review of the implemented Access and API Keys documentation pages

Source files reviewed:
- docs-pages.js lines 1699-1865
- docs/plans/access-and-api-keys-docs-copy-refinement-implementation-plan.md

---

## Overall Assessment

The implementation is a solid first pass. Both pages are real, readable, and structurally well-organized. The canonical lines from the plan appear correctly, the CTAs are present, and the `Supericons Pro plan` wording rule is consistently applied. The pages have moved well beyond placeholder status.

There are 5 substantive copy issues and 2 structural issues that reduce the quality bar. None require structural rework. All fixes are sentence-level or block-level edits.

---

## Findings

### F1. `docs-access-api-keys` - Intro and callout say the same thing (Redundancy - High)

Lines: 1707, 1711

The intro paragraph and the callout block immediately after it both say:

> Intro (L1707): `Your API key tells Supericons which account is making the request, so the app or MCP client can use the access already on that account.`

> Callout (L1711): `There is not a separate Pro key or pack key. Your API key uses the access already on your account.`

The phrase "access already on that account" / "access already on your account" appears twice within 4 lines. The callout is supposed to be the reassurance punchline, but because the intro already lands the same phrase, the callout reads as a repetition rather than a reinforcement.

**Fix:** The intro should explain the function of the key (identification), and the callout should deliver the reassurance (it is not a special key). Remove the "access already on" phrase from the intro and save it exclusively for the callout.

Proposed intro:
> `Use an API key from your Supericons account when you connect Supericons outside the browser UI. The key identifies which account is making the request, so the app or MCP client can load whatever that account can access.`

The callout stays as-is.

---

### F2. `docs-access-api-keys` - "What determines access" section belongs on the other page (Structural overlap - High)

Lines: 1746-1757

The `docs-access-api-keys` page includes a full `What determines access` section with two cards explaining bought packs and the Supericons Pro plan. This is the exact topic `docs-access-premium` was created to cover. Repeating it here makes the premium page feel redundant before the user even gets there.

The plan explicitly separates the two pages by job:
- Page 1 (API Keys): what the key is, does, does not do, when you need one.
- Page 2 (Pro and Collections): the difference between packs and the Pro plan.

**Fix:** Replace the `What determines access` section with a one-sentence bridge that points to the Pro and Collections page.

Proposed replacement (single paragraph, no subheads):
> `What your account can access depends on what you have bought or subscribed to. See ${docsLink('docs-access-premium', 'Pro and Collections')} for a clear breakdown.`

This keeps the API Keys page clean and directs users to the dedicated coverage without duplicating it.

---

### F3. `docs-access-api-keys` - "Bought packs" card duplicates the "What an API key does not do" section (Redundancy - Medium)

Lines: 1724-1727 and 1750-1752

"What an API key does not do" already says:
> `It does not turn bought packs into Motion Lab or Converter access.`

Then "What determines access" repeats:
> `Buying packs gives you the premium icons in those packs. The same icon access works when you use an API key from that account.`

These two sections partially contradict each other in framing. One says "buying packs does not give you tools," the other says "buying packs gives you icons." Both are true, but placing them on the same page makes the "does not do" list feel incomplete. The positive side belongs on the Pro and Collections page.

**Fix:** Resolves automatically if F2 is applied.

---

### F4. `docs-access-premium` - "Why this can feel confusing" callout undersells the key scenario (Specificity - Medium)

Lines: 1798-1799

The callout reads:
> `Icon access and tool access are different. You might already be able to use premium icons from a pack you bought, while Motion Lab and Converter still stay locked because they belong to the Supericons Pro plan.`

The phrase "You might already be able to" hedges. The user who is frustrated is someone who already sees icons working and naturally expects tools to follow. The "might" makes the explanation feel hypothetical rather than validating a real experience.

**Fix:** Replace "You might already be able to" with the more validating form.

Proposed:
> `Icon access and tool access are different. If you bought a pack and can already use those premium icons, that is expected. Motion Lab and Converter are a separate purchase and stay locked until the account has the Supericons Pro plan.`

---

### F5. `docs-access-premium` - "What bought packs give you" third bullet is a negative placed in a positive list (Tone - Medium)

Line: 1806

The section is headed `What bought packs give you` and the first two bullets are positive. The third bullet then inserts:
> `No automatic access to Motion Lab or Converter.`

Embedding a negative ("no") into a "what you get" list is a UX writing anti-pattern. The negative belongs in the callout (which already covers it) or in a separate clarification block, not as a bullet under "what you get."

**Fix:** Remove the third bullet from this list. The callout at the top of the page already covers this distinction. If the separation needs reinforcement, add a single note after the list:

Option A (note after list):
> `Pack purchases do not include Motion Lab or Converter. Those tools are part of the Supericons Pro plan.`

Option B: Remove the third bullet entirely since the callout is directly above.

---

### F6. `docs-access-premium` - "Quick examples" table Row 2 is imprecise (Accuracy - Low)

Line: 1826

Row 2 reads:
> Situation: `I have the Supericons Pro plan.`
> What works: `I can use Motion Lab and Converter, plus the account can also use any icon access that comes with the plan.`

The phrase "any icon access that comes with the plan" is vague and implies the Pro plan bundles icons, which may not be accurate. The plan spec says the Pro plan unlocks Motion Lab and Converter. Icon access comes from bought packs, not from the plan itself.

**Fix:** Keep it clean and factual:
> `I can use Motion Lab and Converter. If I have also bought packs, those icon collections work too.`

---

### F7. `docs-access-api-keys` - Section heading "What an API key is for" duplicates the page title context (Minor - Low)

Line: 1706

The page is titled `API Keys`. The first section is headed `What an API key is for`. On a page specifically about API keys, the heading adds little. The intro paragraph still does the real work.

**Fix:** Either remove the `<h2>` and let the first paragraph stand as the lead text directly under the page title, or retitle the section to something that adds information: `How the key connects your account`.

This is low severity because the section heading does not cause confusion, it just adds a layer of mild redundancy.

---

## Success Criteria Check

| Criterion from plan | Status |
|---|---|
| 1. `docs-access-api-keys` is a real page, not a placeholder | PASS |
| 2. `docs-access-premium` is a real page, not a placeholder | PASS |
| 3. Each page has a clear first-paragraph purpose | PASS |
| 4. Copy uses simple, user-facing language | PASS |
| 5. Account, not the key, is the source of truth | PASS (with caveat: see F1 - intro and callout blur which sentence owns this) |
| 6. Copy clearly separates pack ownership from Supericons Pro plan | PARTIAL FAIL - F2 places this separation on both pages |
| 7. Each page includes the right next-step links | PASS |
| 8. `npm run build` passes | PASS (per agent report) |
| F3 audit addition: every `Pro` reference uses `Supericons Pro plan` | PASS |

---

## Wording Rule Compliance Check

| Rule | Status |
|---|---|
| No `entitlement` | PASS |
| No `linked to Pro` | PASS |
| No `premium tools` | PASS |
| No `requires Pro` without `plan` | PASS |
| `Supericons Pro plan` uses `appLink` on requirement mentions | PASS |
| `Your API key uses the access already on your account` present | PASS |
| `There is not a separate Pro key or pack key` present | PASS |
| `Buying packs gives you the premium icons in those packs` present | PASS |
| `Motion Lab and Converter are part of the Supericons Pro plan` present | PASS |

---

## Summary

| # | Finding | Severity | Lines |
|---|---|---|---|
| F1 | Intro and callout repeat "access already on account" within 4 lines | High | 1707, 1711 |
| F2 | "What determines access" section belongs on Pro and Collections page, not API Keys | High | 1746-1757 |
| F3 | Resolves with F2 - "Bought packs" card overlaps "does not do" list | Medium | 1724-1752 |
| F4 | "Why this can feel confusing" callout uses "might" instead of validating the real scenario | Medium | 1798-1799 |
| F5 | "No automatic access..." negative bullet embedded inside a "what you get" positive list | Medium | 1806 |
| F6 | Row 2 of examples table implies Pro plan bundles icon access (unverified claim) | Low | 1826 |
| F7 | Section heading "What an API key is for" is mildly redundant given the page title | Low | 1706 |

---

## Recommended Fix Priority

1. F2 first (removes cross-page overlap, sharpens page jobs, resolves F3 automatically)
2. F1 (removes phrase duplication that weakens the callout)
3. F4 and F5 (tone and specificity fixes, sentence-level)
4. F6 (factual precision, one sentence)
5. F7 (optional, improve if polishing heading hierarchy)
