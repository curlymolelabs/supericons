Date: April 13, 2026
Status: Audit
Scope: Audit of access-and-api-keys-docs-copy-refinement-implementation-plan.md

Audits:
- [access-and-api-keys-docs-copy-refinement-implementation-plan.md](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/plans/access-and-api-keys-docs-copy-refinement-implementation-plan.md)

Cross-referenced against:
- [docs-entitlement-access-copy-audit.md](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/docs-entitlement-access-copy-audit.md)
- [docs-entitlement-copy-refinement-implementation-plan.md](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/plans/docs-entitlement-copy-refinement-implementation-plan.md)
- [docs-entitlement-copy-refinement-scan.md](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/docs-entitlement-copy-refinement-scan.md)

## Overall Assessment

The plan is solid in intent and well-scoped. The UX writing principles, IA split, and success criteria are coherent and consistent with the broader entitlement copy system. The improvements below are targeted at gaps rather than flaws. No structural rework is needed.

## Findings and Proposals

### F1. The two new pages are not positioned as the canonical reference for the rest of the docs (Medium)

The `docs-entitlement-access-copy-audit.md` (finding F10) explicitly recommends that the `docs-access-premium` placeholder become the canonical source for the whole entitlement model, with other pages linking to it rather than re-explaining the model inline. The implementation plan does not state this role. It treats the two pages as standalone deliverables only, which leaves the linking strategy undefined.

Proposed addition to the "Why This Section Matters" section or the IA section:

> Once complete, these two pages become the canonical reference for the whole docs entitlement model. Overview and setup pages should link here rather than re-explaining the model inline.

---

### F2. `store.js` is missing from "Files Likely To Change" (Medium)

The entitlement audit flags stale copy in `store.js` at lines 4792, 4862, 4931, 5246, and 5300. The entitlement refinement plan lists `store.js` as optional. This plan drops it entirely. If the new pages go live while `store.js` still serves stale access copy to users, the entitlement fix is incomplete.

Proposed addition to "Files Likely To Change":

```
- [store.js](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/store.js) — optional, if legacy docs copy in this file remains user-visible
```

---

### F3. Verification criteria do not check the `Supericons Pro plan` wording rule (Medium)

The eight verification items check that the content exists, is readable, uses simple language, and is actionable. None of them explicitly verify that every reference to `Pro` on these two pages uses `Supericons Pro plan` or the `appLink` pattern. That rule is the central rule of the whole entitlement pass and should be a named exit criterion for this plan.

Proposed addition to Verification as item 9:

```
9. every reference to `Pro` on these two pages uses the phrase `Supericons Pro plan`
   or the `appLink('pricing', 'Supericons Pro plan')` pattern
```

---

### F4. `docs-access-premium` ID conflicts with the wording the plan is trying to fix (Low)

The user-facing page name in the IA section is `Pro and Collections`, which is clear. The implementation ID `docs-access-premium` uses the word "premium," which the scan doc and refinement plan both flag as problematic because it blurs icon ownership and tool access. The ID is internal, so the risk is low, but if page titles or headings are ever derived from IDs, this could resurface the same blur.

Proposed UX note in the `docs-access-premium` section:

> The user-facing title should be `Pro and Collections`, not `Premium Access` or any variant using "premium," to avoid the same icon/tool blur the copy is trying to fix.

---

### F5. The "Why this can feel confusing" content block is under-specified (Low)

The `docs-access-premium` content plan includes a block called `Why this can feel confusing` with two bullets. Both are correct but abstract. The scan doc and refinement plan both identify the specific user scenario that causes the most friction: a user who bought packs, sees premium icons working, then hits a wall on Motion Lab or Converter. That scenario is named in the plan's "Bottom Line" section but is absent from the content block spec. An implementer working from the spec alone may write a generic explanation rather than one tuned to that friction point.

Proposed replacement for the `Why this can feel confusing` block:

```
- because icon access and tool access use the same account
- because a paid icon purchase can make all paid features look like they are unlocked
- because a user who bought packs will see premium icons working and naturally expect
  Motion Lab or Converter to work too
```

---

### F6. The scan doc is not listed as a dependency (Low)

The plan's `Depends on` list includes the audit doc and the refinement plan, but not `docs-entitlement-copy-refinement-scan.md`. The scan doc is the most specific wording reference for this pass. It contains exact proposed replacements and a priority order. An implementer who misses it may produce wording that is directionally correct but inconsistent with the rest of the docs.

Proposed addition to `Depends on`:

```
- [docs-entitlement-copy-refinement-scan.md](d:/Personal/Business/Curly Mole Labs/Experiments/Apps/DailySprint/supericons/docs/docs-entitlement-copy-refinement-scan.md)
```

---

### F7. The "Canonical lines" section does not distinguish linked from plain-text form (Low, Style)

The "Copy Patterns To Reuse" section lists five canonical lines as plain text. The scan doc and refinement plan both establish that when `Supericons Pro plan` appears as a requirement, the `appLink` form is preferred so users can navigate directly to Pricing. The canonical lines section does not indicate which lines need the linked form and which may stay as plain text.

Proposed annotation added to the "Canonical lines" section:

```
Lines that name the Supericons Pro plan as a requirement should use:
  ${appLink('pricing', 'Supericons Pro plan')}
in implementation. Lines that mention the plan in passing (e.g., reassurance
sentences that do not gate access) may use plain text.
```

---

## Summary

| # | Finding | Severity |
|---|---|---|
| F1 | New pages not positioned as canonical reference for other docs | Medium |
| F2 | `store.js` missing from Files Likely To Change | Medium |
| F3 | Verification list missing `Supericons Pro plan` wording check | Medium |
| F4 | `docs-access-premium` ID uses "premium" against the plan's own wording rules | Low |
| F5 | "Why this can feel confusing" block too abstract for the key user scenario | Low |
| F6 | Scan doc not listed in `Depends on` | Low |
| F7 | Canonical lines section does not distinguish linked vs. plain-text form | Low |

## Recommended Next Step

Apply F1, F2, and F3 to the plan before implementation begins. F4 through F7 are low-risk and can be folded in during a single editing pass on the plan. None of these findings require structural changes.
